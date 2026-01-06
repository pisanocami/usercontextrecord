import pLimit from "p-limit";
import type { Configuration, CapabilityModel, ScoringConfig } from "@shared/schema";
import type { KeywordDataProvider, GapKeyword } from "./keyword-data-provider";
import { getProvider } from "./providers";
import { getCapabilityPreset, getScoringPreset } from "./capability-presets";

export type KeywordStatus = "pass" | "review" | "out_of_play";
export type ConfidenceLevel = "high" | "medium" | "low";

export type IntentType = 
  | "category_capture"
  | "problem_solution"
  | "product_generic"
  | "brand_capture"
  | "variant_or_size"
  | "other";

export interface KeywordResult {
  keyword: string;
  normalizedKeyword: string;
  status: KeywordStatus;
  statusIcon: string;
  intentType: IntentType;
  capabilityScore: number;
  opportunityScore: number;
  difficultyFactor: number;
  positionFactor: number;
  reason: string;
  flags: string[];
  confidence: ConfidenceLevel;
  competitorsSeen: string[];
  searchVolume: number;
  cpc?: number;
  keywordDifficulty?: number;
  competitorPosition: number;
  theme: string;
}

export interface KeywordGapResult {
  brandDomain: string;
  competitors: string[];
  totalGapKeywords: number;
  topOpportunities: KeywordResult[];
  needsReview: KeywordResult[];
  outOfPlay: KeywordResult[];
  grouped: Record<string, KeywordResult[]>;
  stats: {
    passed: number;
    review: number;
    outOfPlay: number;
    percentPassed: number;
    percentReview: number;
    percentOutOfPlay: number;
  };
  filtersApplied: {
    excludedCategories: number;
    excludedKeywords: number;
    excludedUseCases: number;
    competitorBrandTerms: number;
    variantTerms: number;
    totalFilters: number;
  };
  contextVersion: number;
  configurationName: string;
}

interface CacheEntry {
  data: GapKeyword[];
  timestamp: number;
}

const keywordCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function normalizeDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//, "");
  normalized = normalized.replace(/^www\./, "");
  normalized = normalized.replace(/\/+$/, "");
  return normalized;
}

export function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCacheKey(brandDomain: string, competitorDomain: string, locationCode: number, languageCode: string): string {
  return `${normalizeDomain(brandDomain)}|${normalizeDomain(competitorDomain)}|${locationCode}|${languageCode}`;
}

function getFromCache(key: string): GapKeyword[] | null {
  const entry = keywordCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    keywordCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache(key: string, data: GapKeyword[]): void {
  keywordCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function checkExclusions(
  keyword: string,
  exclusions: {
    excludedCategories?: string[];
    excludedKeywords?: string[];
    excludedUseCases?: string[];
    excludedCompetitors?: string[];
  }
): { hasMatch: boolean; reason: string } {
  const normalizedKw = normalizeKeyword(keyword);
  
  const allExclusions = [
    ...(exclusions.excludedCategories || []),
    ...(exclusions.excludedKeywords || []),
    ...(exclusions.excludedUseCases || []),
    ...(exclusions.excludedCompetitors || []),
  ].filter(Boolean);
  
  for (const exclusion of allExclusions) {
    const normalizedExclusion = normalizeKeyword(exclusion);
    if (!normalizedExclusion) continue;
    
    try {
      const regex = new RegExp(`\\b${escapeRegex(normalizedExclusion)}\\b`, 'i');
      if (regex.test(normalizedKw)) {
        return { hasMatch: true, reason: `Matches exclusion: "${exclusion}"` };
      }
    } catch {
      if (normalizedKw.includes(normalizedExclusion)) {
        return { hasMatch: true, reason: `Matches exclusion: "${exclusion}"` };
      }
    }
  }
  
  return { hasMatch: false, reason: "" };
}

export function fenceCheck(
  keyword: string,
  inScopeConcepts: string[],
  demandThemes: string[]
): { inFence: boolean; reason: string } {
  const normalizedKw = normalizeKeyword(keyword);
  
  const allConcepts = [
    ...inScopeConcepts.map(c => normalizeKeyword(c)),
    ...demandThemes.map(t => normalizeKeyword(t)),
  ].filter(Boolean);
  
  if (allConcepts.length === 0) {
    return { inFence: true, reason: "No fence defined - auto-pass" };
  }
  
  for (const concept of allConcepts) {
    const conceptTokens = concept.split(" ").filter(t => t.length > 2);
    const keywordTokens = normalizedKw.split(" ");
    
    const hasMatch = conceptTokens.some(token => 
      keywordTokens.some(kwToken => 
        kwToken.includes(token) || token.includes(kwToken)
      )
    );
    
    if (hasMatch) {
      return { inFence: true, reason: `Matches: "${concept}"` };
    }
  }
  
  return { inFence: false, reason: "Outside category fence - needs review" };
}

const VARIANT_TERMS_REGEX = /\b(size\s*\d|wide\s*width|narrow\s*width|4e|2e|w\s*width|mens\s*size|womens\s*size|kids\s*size|black\s+shoe|white\s+shoe|grey\s+shoe|navy\s+shoe)\b/i;

const SIZE_NUMBERS_REGEX = /\bsize\s*(\d{1,2}\.?\d?)\b/i;

function getCompetitorBrandTerms(config: Configuration): string[] {
  const competitors = config.competitors?.competitors || [];
  const terms: string[] = [];
  
  const stopWords = new Set([
    "new", "on", "the", "inc", "llc", "co", "company", "corp", "ltd", "limited",
    "shoes", "sandals", "footwear", "shoe", "sandal", "boot", "boots",
    "best", "top", "good", "great", "for", "and", "with"
  ]);
  
  for (const comp of competitors) {
    if (typeof comp === "object" && comp !== null) {
      const name = (comp as { name?: string }).name || "";
      const domain = (comp as { domain?: string }).domain || "";
      
      if (name) {
        const fullNameLower = name.toLowerCase().trim();
        terms.push(fullNameLower);
        
        const nameParts = fullNameLower.split(/[\s\-\_]+/);
        for (const part of nameParts) {
          if (part.length > 2 && !stopWords.has(part)) {
            terms.push(part);
          }
        }
      }
      if (domain) {
        const domainName = domain.replace(/\.(com|net|org|io|co|uk|au)$/i, "").toLowerCase();
        terms.push(domainName);
        
        const domainParts = domainName.split(/[\-\_]/);
        for (const part of domainParts) {
          if (part.length > 2 && !stopWords.has(part)) {
            terms.push(part);
          }
        }
      }
    }
  }
  
  const commonBrands = [
    "hoka", "birkenstock", "crocs", "brooks", "asics", "new balance",
    "nike", "adidas", "saucony", "vionic", "orthofeet", "propet", "drew",
    "alegria", "dansko", "merrell", "keen", "teva", "chaco", "altra",
    "skechers", "clarks", "ecco", "sperry", "ugg", "reef", "kane"
  ];
  
  return Array.from(new Set([...terms, ...commonBrands]));
}

// Convert intent type to user-friendly theme name for display
export function intentTypeToTheme(intentType: IntentType): string {
  const themeMap: Record<IntentType, string> = {
    category_capture: "Category Terms",
    product_generic: "Product Terms",
    problem_solution: "Problem/Solution",
    brand_capture: "Brand Terms",
    variant_or_size: "Variants",
    other: "Other",
  };
  return themeMap[intentType] || "Other";
}

export function classifyIntent(keyword: string, config: Configuration): { intentType: IntentType; flags: string[] } {
  const normalizedKw = normalizeKeyword(keyword);
  const flags: string[] = [];
  
  const competitorBrands = getCompetitorBrandTerms(config);
  for (const brand of competitorBrands) {
    if (normalizedKw.includes(brand)) {
      flags.push("competitor_brand");
      break;
    }
  }
  
  if (VARIANT_TERMS_REGEX.test(normalizedKw) || SIZE_NUMBERS_REGEX.test(normalizedKw)) {
    flags.push("size_variant");
  }
  
  if (flags.includes("competitor_brand")) {
    return { intentType: "brand_capture", flags };
  }
  
  if (flags.includes("size_variant") && flags.includes("competitor_brand")) {
    return { intentType: "variant_or_size", flags };
  }
  
  const problemTerms = /\b(best|plantar fasciitis|arch support|pain relief|recovery|heel pain|foot pain|back pain|knee pain|standing all day|nurses?|doctors?|healthcare|walking|comfort)\b/i;
  if (problemTerms.test(normalizedKw)) {
    return { intentType: "problem_solution", flags };
  }
  
  const categoryTerms = /\b(sandals?|slides?|flip flops?|clogs?|slippers?|recovery shoes?|comfort shoes?|orthopedic)\b/i;
  if (categoryTerms.test(normalizedKw)) {
    return { intentType: "category_capture", flags };
  }
  
  const productTerms = /\b(shoes?|sneakers?|boots?|footwear|running|walking|hiking|training|marathon)\b/i;
  if (productTerms.test(normalizedKw)) {
    if (flags.includes("size_variant")) {
      return { intentType: "variant_or_size", flags };
    }
    return { intentType: "product_generic", flags };
  }
  
  if (flags.includes("size_variant")) {
    return { intentType: "variant_or_size", flags };
  }
  
  return { intentType: "other", flags };
}

function getEffectiveCapabilityModel(config: Configuration): CapabilityModel {
  if (config.capability_model && (config.capability_model.boosters?.length || config.capability_model.penalties?.length)) {
    return config.capability_model as CapabilityModel;
  }
  const govCapability = (config.governance as any)?.capability_model;
  if (govCapability && (govCapability.boosters?.length || govCapability.penalties?.length)) {
    return govCapability as CapabilityModel;
  }
  const presetName = config.scoring_config?.vertical_preset || 
                     (config.governance as any)?.scoring_config?.vertical_preset;
  return getCapabilityPreset(presetName);
}

function getEffectiveScoringConfig(config: Configuration): ScoringConfig {
  if (config.scoring_config) {
    return config.scoring_config as ScoringConfig;
  }
  const govScoring = (config.governance as any)?.scoring_config;
  if (govScoring) {
    return govScoring as ScoringConfig;
  }
  return getScoringPreset();
}

export function computeCapabilityScore(keyword: string, config: Configuration): number {
  const normalizedKw = normalizeKeyword(keyword);
  const capabilityModel = getEffectiveCapabilityModel(config);
  let score = capabilityModel.base_score ?? 0.5;
  
  for (const booster of capabilityModel.boosters || []) {
    try {
      const regex = new RegExp(`\\b(${booster.pattern})\\b`, 'i');
      if (regex.test(normalizedKw)) {
        score += booster.weight;
      }
    } catch {
      if (normalizedKw.includes(booster.pattern.toLowerCase())) {
        score += booster.weight;
      }
    }
  }
  
  for (const penalty of capabilityModel.penalties || []) {
    try {
      const regex = new RegExp(`\\b(${penalty.pattern})\\b`, 'i');
      if (regex.test(normalizedKw)) {
        score += penalty.weight;
      }
    } catch {
      if (normalizedKw.includes(penalty.pattern.toLowerCase())) {
        score += penalty.weight;
      }
    }
  }
  
  const competitorBrands = getCompetitorBrandTerms(config);
  const commonBrands = capabilityModel.common_brands || [];
  const allBrands = Array.from(new Set([...competitorBrands, ...commonBrands]));
  
  for (const brand of allBrands) {
    if (normalizedKw.includes(brand)) {
      score -= 0.6;
      break;
    }
  }
  
  return Math.max(0, Math.min(1, score));
}

const INTENT_WEIGHTS: Record<IntentType, number> = {
  category_capture: 1.0,
  problem_solution: 1.0,
  product_generic: 0.7,
  brand_capture: 0.2,
  variant_or_size: 0.0,
  other: 0.1,
};

export function computeDifficultyFactor(
  keywordDifficulty: number | undefined,
  difficultyWeight: number = 0.5
): number {
  if (keywordDifficulty === undefined || keywordDifficulty === null) {
    return 1.0;
  }
  const kd = Math.max(0, Math.min(100, keywordDifficulty));
  const rawFactor = 1 - (kd / 100);
  return 1 - (difficultyWeight * (1 - rawFactor));
}

export function computePositionFactor(
  competitorPosition: number | undefined,
  positionWeight: number = 0.5
): number {
  if (competitorPosition === undefined || competitorPosition === null || competitorPosition <= 0) {
    return 1.0;
  }
  let rawFactor: number;
  if (competitorPosition <= 3) {
    rawFactor = 0.6;
  } else if (competitorPosition <= 10) {
    rawFactor = 1.0;
  } else if (competitorPosition <= 20) {
    rawFactor = 0.8;
  } else {
    rawFactor = 0.5;
  }
  return 1 - (positionWeight * (1 - rawFactor));
}

export function computeOpportunityScore(
  searchVolume: number,
  cpc: number | undefined,
  intentType: IntentType,
  capabilityScore: number,
  keywordDifficulty?: number,
  competitorPosition?: number,
  scoringConfig?: ScoringConfig
): number {
  const volume = searchVolume || 0;
  const cpcValue = cpc || 1;
  const intentWeight = INTENT_WEIGHTS[intentType];
  
  const difficultyWeight = scoringConfig?.difficulty_weight ?? 0.5;
  const positionWeight = scoringConfig?.position_weight ?? 0.5;
  
  const difficultyFactor = computeDifficultyFactor(keywordDifficulty, difficultyWeight);
  const positionFactor = computePositionFactor(competitorPosition, positionWeight);
  
  return volume * cpcValue * intentWeight * capabilityScore * difficultyFactor * positionFactor;
}

export interface KeywordEvaluation {
  status: KeywordStatus;
  statusIcon: string;
  intentType: IntentType;
  capabilityScore: number;
  opportunityScore: number;
  difficultyFactor: number;
  positionFactor: number;
  reason: string;
  flags: string[];
  confidence: ConfidenceLevel;
}

export function evaluateKeyword(
  keyword: string,
  config: Configuration,
  searchVolume: number = 0,
  cpc?: number,
  keywordDifficulty?: number,
  competitorPosition?: number
): KeywordEvaluation {
  const scoringConfig = getEffectiveScoringConfig(config);
  const passThreshold = scoringConfig.pass_threshold;
  const reviewThreshold = scoringConfig.review_threshold;
  
  const { intentType, flags } = classifyIntent(keyword, config);
  const capabilityScore = computeCapabilityScore(keyword, config);
  const difficultyFactor = computeDifficultyFactor(keywordDifficulty, scoringConfig.difficulty_weight);
  const positionFactor = computePositionFactor(competitorPosition, scoringConfig.position_weight);
  const opportunityScore = computeOpportunityScore(
    searchVolume, cpc, intentType, capabilityScore,
    keywordDifficulty, competitorPosition, scoringConfig
  );
  
  const baseResult = {
    intentType,
    capabilityScore,
    opportunityScore,
    difficultyFactor,
    positionFactor,
    flags,
  };
  
  if (flags.includes("competitor_brand")) {
    return {
      ...baseResult,
      status: "out_of_play",
      statusIcon: "💤",
      reason: "Competitor brand term",
      confidence: "high",
    };
  }
  
  if (intentType === "variant_or_size") {
    return {
      ...baseResult,
      status: "out_of_play",
      statusIcon: "💤",
      reason: "Size/variant query",
      confidence: "high",
    };
  }
  
  if (capabilityScore < reviewThreshold) {
    return {
      ...baseResult,
      status: "out_of_play",
      statusIcon: "💤",
      reason: "Low capability fit",
      confidence: "high",
    };
  }
  
  const exclusions = {
    excludedCategories: config.negative_scope?.excluded_categories || [],
    excludedKeywords: config.negative_scope?.excluded_keywords || [],
    excludedUseCases: config.negative_scope?.excluded_use_cases || [],
    excludedCompetitors: config.negative_scope?.excluded_competitors || [],
  };
  
  const exclusionResult = checkExclusions(keyword, exclusions);
  if (exclusionResult.hasMatch) {
    return {
      ...baseResult,
      status: "out_of_play",
      statusIcon: "💤",
      reason: exclusionResult.reason,
      flags: [...flags, "excluded"],
      confidence: "high",
    };
  }
  
  const inScopeConcepts = [
    ...(config.category_definition?.included || []),
    config.category_definition?.primary_category || "",
    ...(config.category_definition?.approved_categories || []),
  ].filter(Boolean);
  
  const demandThemes = [
    ...(config.demand_definition?.brand_keywords?.seed_terms || []),
    ...(config.demand_definition?.non_brand_keywords?.category_terms || []),
    ...(config.demand_definition?.non_brand_keywords?.problem_terms || []),
  ];
  
  const fenceResult = fenceCheck(keyword, inScopeConcepts, demandThemes);
  const resultFlags = [...flags];
  
  if (!fenceResult.inFence) {
    resultFlags.push("outside_fence");
  }
  
  if (capabilityScore >= passThreshold) {
    const reason = fenceResult.inFence 
      ? fenceResult.reason 
      : "Strong capability fit — verify category alignment";
    return {
      ...baseResult,
      status: "pass",
      statusIcon: "✅",
      reason,
      flags: resultFlags,
      confidence: "high",
    };
  }
  
  if (capabilityScore >= reviewThreshold) {
    const confidence: ConfidenceLevel = capabilityScore >= (passThreshold - 0.1) ? "medium" : "low";
    const reason = fenceResult.inFence 
      ? "Medium capability" 
      : "Medium capability — outside fence";
    return {
      ...baseResult,
      status: "review",
      statusIcon: "⚠️",
      reason,
      flags: resultFlags,
      confidence,
    };
  }
  
  return {
    ...baseResult,
    status: "out_of_play",
    statusIcon: "💤",
    reason: "Low relevance",
    confidence: "high",
  };
}

export function assignTheme(keyword: string, config: Configuration): string {
  const normalizedKw = normalizeKeyword(keyword);
  
  const themes = [
    { name: "Brand", terms: config.demand_definition?.brand_keywords?.seed_terms || [] },
    { name: "Category", terms: config.demand_definition?.non_brand_keywords?.category_terms || [] },
    { name: "Problem/Solution", terms: config.demand_definition?.non_brand_keywords?.problem_terms || [] },
    { name: "Product", terms: config.category_definition?.included || [] },
  ];
  
  for (const theme of themes) {
    for (const term of theme.terms) {
      const normalizedTerm = normalizeKeyword(term);
      const termTokens = normalizedTerm.split(" ");
      
      if (termTokens.some(token => token.length > 2 && normalizedKw.includes(token))) {
        return theme.name;
      }
    }
  }
  
  return "Other";
}

export async function computeKeywordGap(
  config: Configuration,
  options: {
    limitPerDomain?: number;
    locationCode?: number;
    languageCode?: string;
    maxCompetitors?: number;
    provider?: "dataforseo" | "ahrefs";
  } = {}
): Promise<KeywordGapResult> {
  const {
    limitPerDomain = 200,
    locationCode = 2840,
    languageCode = "English",
    maxCompetitors = 5,
    provider = "dataforseo",
  } = options;
  
  const keywordProvider = getProvider(provider);
  
  const brandDomain = normalizeDomain(config.brand?.domain || "");
  
  const competitorsList = config.competitors?.competitors || [];
  const directCompetitors = competitorsList
    .filter((c) => 
      typeof c === "object" && c !== null && "domain" in c && typeof (c as { domain?: string }).domain === "string" && (c as { domain: string }).domain.length > 0
    )
    .filter((c) => {
      const tier = (c as { tier?: string }).tier;
      return tier === "tier1" || tier === "tier2";
    })
    .slice(0, maxCompetitors)
    .map((c) => (c as { domain: string }).domain)
    .filter(Boolean);
  
  if (!brandDomain || directCompetitors.length === 0) {
    return {
      brandDomain,
      competitors: directCompetitors,
      totalGapKeywords: 0,
      topOpportunities: [],
      needsReview: [],
      outOfPlay: [],
      grouped: {},
      stats: { passed: 0, review: 0, outOfPlay: 0, percentPassed: 0, percentReview: 0, percentOutOfPlay: 0 },
      filtersApplied: {
        excludedCategories: 0,
        excludedKeywords: 0,
        excludedUseCases: 0,
        competitorBrandTerms: 0,
        variantTerms: 0,
        totalFilters: 0,
      },
      contextVersion: 1,
      configurationName: config.name || "Unknown",
    };
  }
  
  const limit = pLimit(3);
  
  const allKeywordsMap = new Map<string, {
    keyword: GapKeyword;
    competitors: string[];
  }>();
  
  await Promise.all(
    directCompetitors.map(competitor =>
      limit(async () => {
        const competitorDomain = normalizeDomain(competitor);
        const cacheKey = getCacheKey(brandDomain, competitorDomain, locationCode, languageCode);
        let cachedKeywords = getFromCache(cacheKey);
        
        if (!cachedKeywords) {
          try {
            console.log(`[${keywordProvider.displayName}] Fetching gap: ${brandDomain} vs ${competitorDomain}`);
            const result = await keywordProvider.getGapKeywords(
              brandDomain,
              competitorDomain,
              {
                locationCode,
                languageName: languageCode,
                limit: limitPerDomain,
              }
            );
            cachedKeywords = result.gapKeywords;
            setCache(cacheKey, cachedKeywords);
            console.log(`[${keywordProvider.displayName}] Got ${cachedKeywords.length} gap keywords from ${competitorDomain}`);
          } catch (error) {
            console.error(`[${keywordProvider.displayName}] Error fetching gap for ${competitorDomain}:`, error);
            cachedKeywords = [];
          }
        }
        
        for (const kw of cachedKeywords) {
          const normalizedKw = normalizeKeyword(kw.keyword);
          const existing = allKeywordsMap.get(normalizedKw);
          
          if (existing) {
            existing.competitors.push(competitorDomain);
            if (kw.searchVolume > existing.keyword.searchVolume) {
              existing.keyword = kw;
            }
          } else {
            allKeywordsMap.set(normalizedKw, {
              keyword: kw,
              competitors: [competitorDomain],
            });
          }
        }
      })
    )
  );
  
  const results: KeywordResult[] = [];
  const stats = { passed: 0, review: 0, outOfPlay: 0, percentPassed: 0, percentReview: 0, percentOutOfPlay: 0 };
  let competitorBrandCount = 0;
  let variantCount = 0;
  
  allKeywordsMap.forEach(({ keyword: kw, competitors }) => {
    const evaluation = evaluateKeyword(
      kw.keyword, config, kw.searchVolume, kw.cpc,
      kw.keywordDifficulty, kw.competitorPosition
    );
    const demandTheme = assignTheme(kw.keyword, config);
    
    // Use intent type as fallback when no demand_definition match
    const theme = demandTheme !== "Other" 
      ? demandTheme 
      : intentTypeToTheme(evaluation.intentType);
    
    results.push({
      keyword: kw.keyword,
      normalizedKeyword: normalizeKeyword(kw.keyword),
      status: evaluation.status,
      statusIcon: evaluation.statusIcon,
      intentType: evaluation.intentType,
      capabilityScore: evaluation.capabilityScore,
      opportunityScore: evaluation.opportunityScore,
      difficultyFactor: evaluation.difficultyFactor,
      positionFactor: evaluation.positionFactor,
      reason: evaluation.reason,
      flags: evaluation.flags,
      confidence: evaluation.confidence,
      competitorsSeen: competitors,
      searchVolume: kw.searchVolume,
      cpc: kw.cpc,
      keywordDifficulty: kw.keywordDifficulty,
      competitorPosition: kw.competitorPosition,
      theme,
    });
    
    if (evaluation.status === "pass") stats.passed++;
    else if (evaluation.status === "review") stats.review++;
    else stats.outOfPlay++;
    
    if (evaluation.flags.includes("competitor_brand")) competitorBrandCount++;
    if (evaluation.flags.includes("size_variant")) variantCount++;
  });
  
  const total = results.length || 1;
  stats.percentPassed = Math.round((stats.passed / total) * 100);
  stats.percentReview = Math.round((stats.review / total) * 100);
  stats.percentOutOfPlay = Math.round((stats.outOfPlay / total) * 100);
  
  results.sort((a, b) => {
    const statusOrder: Record<KeywordStatus, number> = { pass: 0, review: 1, out_of_play: 2 };
    if (a.status !== b.status) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return (b.opportunityScore || 0) - (a.opportunityScore || 0);
  });
  
  const topOpportunities = results.filter(r => r.status === "pass");
  const needsReview = results.filter(r => r.status === "review");
  const outOfPlay = results.filter(r => r.status === "out_of_play");
  
  const grouped: Record<string, KeywordResult[]> = {};
  topOpportunities.forEach(result => {
    if (!grouped[result.theme]) {
      grouped[result.theme] = [];
    }
    grouped[result.theme].push(result);
  });
  
  const negativeScope = config.negative_scope || {};
  const excludedCategories = (negativeScope.excluded_categories as string[] || []).length;
  const excludedKeywords = (negativeScope.excluded_keywords as string[] || []).length;
  const excludedUseCases = (negativeScope.excluded_use_cases as string[] || []).length;
  
  return {
    brandDomain,
    competitors: directCompetitors,
    totalGapKeywords: results.length,
    topOpportunities,
    needsReview,
    outOfPlay,
    grouped,
    stats,
    filtersApplied: {
      excludedCategories,
      excludedKeywords,
      excludedUseCases,
      competitorBrandTerms: competitorBrandCount,
      variantTerms: variantCount,
      totalFilters: excludedCategories + excludedKeywords + excludedUseCases + competitorBrandCount + variantCount,
    },
    contextVersion: 1,
    configurationName: config.name || "Unknown",
  };
}

export function clearCache(): void {
  keywordCache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: keywordCache.size,
    keys: Array.from(keywordCache.keys()),
  };
}
