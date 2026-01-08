import pLimit from "p-limit";
import type { Configuration, CapabilityModel, ScoringConfig } from "@shared/schema";
import type { KeywordDataProvider, GapKeyword } from "./keyword-data-provider";
import { getProvider } from "./providers";
import { getCapabilityPreset, getScoringPreset } from "./capability-presets";
import {
  validateModuleExecution,
  createExecutionContext,
  addTriggeredRule,
  processItemThroughGates,
  RULES,
  VARIANT_TERMS_REGEX,
  SIZE_NUMBERS_REGEX,
  type UCRSection
} from "./execution-gateway";
import { SEO_VISIBILITY_GAP, UCR_SECTION_NAMES } from "@shared/module.contract";
import type {
  Disposition,
  Severity,
  ItemTrace,
  UCRSectionID
} from "@shared/module.contract";

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
  disposition: Disposition;
  statusIcon: string;
  intentType: IntentType;
  capabilityScore: number;
  opportunityScore: number;
  difficultyFactor: number;
  positionFactor: number;
  reason: string;
  reasons: string[];
  flags: string[];
  confidence: ConfidenceLevel;
  competitorsSeen: string[];
  searchVolume: number;
  cpc?: number;
  keywordDifficulty?: number;
  competitorPosition: number;
  theme: string;
  trace: ItemTrace[];
}

export interface ProviderError {
  competitor: string;
  error: string;
  timestamp: string;
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
    irrelevantEntities: number;
    lowCapability: number;
    totalFilters: number;
  };
  contextVersion: number;
  configurationName: string;
  fromCache: boolean;
  provider: string;
  providerErrors?: ProviderError[];
  ucrContext: {
    ucr_version: string;
    sections_used: UCRSection[];
    rules_triggered: string[];
    executed_at: string;
    module_id: string;
  };
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

function getCacheKey(brandDomain: string, competitorDomain: string, locationCode: number, languageCode: string, provider: string): string {
  return `${normalizeDomain(brandDomain)}|${normalizeDomain(competitorDomain)}|${locationCode}|${languageCode}|${provider}`;
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

// Redundant local helpers removed. 
// checkExclusions, fenceCheck, and detectIrrelevantEntity are now imported from ./execution-gateway.

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
  disposition: Disposition;
  statusIcon: string;
  intentType: IntentType;
  capabilityScore: number;
  opportunityScore: number;
  difficultyFactor: number;
  positionFactor: number;
  reason: string;
  reasons: string[];
  flags: string[];
  confidence: ConfidenceLevel;
  trace: ItemTrace[];
}


function createTrace(
  ruleId: string,
  ucrSection: UCRSectionID,
  reason: string,
  severity: Severity,
  evidence?: string
): ItemTrace {
  return { ruleId, ucrSection, reason, severity, evidence };
}

/**
 * Evaluates a keyword following CMO-safe gate order:
 * 1. G (Negative Scope) - Hard gate, runs first
 * 2. B (Fence/Category) - Soft gate  
 * 3. H (Scoring/Governance) - Thresholds
 * 4. E/F (Strategic/Channel) - Prioritization
 */
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

  const trace: ItemTrace[] = [];
  const reasons: string[] = [];
  const resultFlags = [...flags];

  const baseResult = {
    intentType,
    capabilityScore,
    opportunityScore,
    difficultyFactor,
    positionFactor,
  };

  // ============================================
  // GATES G, B, H (Centralized Core Check)
  // ============================================
  const gatedResult = processItemThroughGates(baseResult, keyword, config);

  // Transfer traces and reasons from centralization
  trace.push(...gatedResult.trace);
  reasons.push(...gatedResult.reasons);

  if (gatedResult.disposition === "OUT_OF_PLAY") {
    return {
      ...baseResult,
      status: "out_of_play",
      disposition: "OUT_OF_PLAY",
      statusIcon: "X",
      reason: reasons[0] || "Hard-gate exclusion",
      reasons,
      flags: resultFlags,
      confidence: "high",
      trace,
    };
  }

  // Handle REVIEW state from gates (mostly Gate B)
  const outsideFence = gatedResult.disposition === "REVIEW";
  if (outsideFence) {
    resultFlags.push("outside_fence");
  }

  // Additional scoring/local flags
  if (flags.includes("competitor_brand")) {
    const reason = "Competitor brand term";
    trace.push({ ruleId: "negative_scope.competitor_brand", ucrSection: "G", reason, severity: "high", evidence: keyword });
    reasons.push(reason);
    return {
      ...baseResult,
      status: "out_of_play",
      disposition: "OUT_OF_PLAY",
      statusIcon: "X",
      reason,
      reasons,
      flags: resultFlags,
      confidence: "high",
      trace,
    };
  }

  // ============================================
  // GATE 3: H (Scoring/Governance) - THRESHOLDS
  // ============================================

  // Size/variant check (scoring decision)
  if (intentType === "variant_or_size") {
    const reason = "Size/variant query - low commercial value";
    trace.push(createTrace("scoring.variant_filter", "H", reason, "medium", keyword));
    reasons.push(reason);
    return {
      ...baseResult,
      status: "out_of_play",
      disposition: "OUT_OF_PLAY",
      statusIcon: "X",
      reason,
      reasons,
      flags: resultFlags,
      confidence: "high",
      trace,
    };
  }

  // Capability score check
  if (capabilityScore < reviewThreshold) {
    const reason = "Low capability fit";
    trace.push(createTrace("scoring.capability_threshold", "H", reason, "medium", `score: ${capabilityScore.toFixed(2)}`));
    reasons.push(reason);
    return {
      ...baseResult,
      status: "out_of_play",
      disposition: "OUT_OF_PLAY",
      statusIcon: "X",
      reason,
      reasons,
      flags: resultFlags,
      confidence: "high",
      trace,
    };
  }

  // Record scoring trace
  trace.push(createTrace(
    "scoring.capability_evaluated",
    "H",
    `Capability score: ${capabilityScore.toFixed(2)}`,
    "low",
    `pass: ${passThreshold}, review: ${reviewThreshold}`
  ));

  // ============================================
  // PRIORITY THEME OVERRIDE (CMO-safe)
  // ============================================
  const priorityThemes = scoringConfig.priority_themes || [];
  if (priorityThemes.length > 0) {
    const normalizedKw = normalizeKeyword(keyword);
    for (const theme of priorityThemes) {
      const normalizedTheme = normalizeKeyword(theme);
      if (normalizedKw.includes(normalizedTheme) || normalizedTheme.split(" ").some(t => t.length > 2 && normalizedKw.includes(t))) {
        const reason = `Strategic priority theme: "${theme}"`;
        trace.push(createTrace("scoring.priority_theme_override", "H", reason, "medium", keyword));
        reasons.push(reason);
        resultFlags.push("priority_theme");
        return {
          ...baseResult,
          status: "pass",
          disposition: "PASS",
          statusIcon: "Y",
          reason,
          reasons,
          flags: resultFlags,
          confidence: "high",
          trace,
        };
      }
    }
  }

  // Gate 4 (Strategic/Channel) logic has been moved to processItemThroughGates in execution-gateway.ts

  // ============================================
  // FINAL DISPOSITION
  // ============================================
  if (capabilityScore >= passThreshold) {
    const reason = outsideFence
      ? "Strong capability fit - verify category alignment"
      : (gatedResult.reasons[0] || "High capability match");
    trace.push(createTrace("disposition.pass", "H", reason, "low", `score: ${capabilityScore.toFixed(2)}`));
    reasons.push(reason);
    return {
      ...baseResult,
      status: "pass",
      disposition: "PASS",
      statusIcon: "Y",
      reason,
      reasons,
      flags: resultFlags,
      confidence: outsideFence ? "medium" : "high",
      trace,
    };
  }

  if (capabilityScore >= reviewThreshold) {
    const confidence: ConfidenceLevel = capabilityScore >= (passThreshold - 0.1) ? "medium" : "low";
    const reason = outsideFence
      ? "Medium capability - outside fence"
      : "Medium capability - needs review";
    trace.push(createTrace("disposition.review", "H", reason, "medium", `score: ${capabilityScore.toFixed(2)}`));
    reasons.push(reason);
    return {
      ...baseResult,
      status: "review",
      disposition: "REVIEW",
      statusIcon: "?",
      reason,
      reasons,
      flags: resultFlags,
      confidence,
      trace,
    };
  }

  const reason = "Low relevance";
  trace.push(createTrace("disposition.out_of_play", "H", reason, "low"));
  reasons.push(reason);
  return {
    ...baseResult,
    status: "out_of_play",
    disposition: "OUT_OF_PLAY",
    statusIcon: "X",
    reason,
    reasons,
    flags: resultFlags,
    confidence: "high",
    trace,
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
    forceRefresh?: boolean;
  } = {}
): Promise<KeywordGapResult> {
  const {
    limitPerDomain = 200,
    locationCode = 2840,
    languageCode = "English",
    maxCompetitors = 5,
    provider = "dataforseo",
    forceRefresh = false,
  } = options;

  const validation = validateModuleExecution(SEO_VISIBILITY_GAP.id, config);
  const execContext = createExecutionContext(
    SEO_VISIBILITY_GAP.id,
    config,
    validation.availableSections
  );

  let usedCache = false;

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
        irrelevantEntities: 0,
        lowCapability: 0,
        totalFilters: 0,
      },
      contextVersion: 1,
      configurationName: config.name || "Unknown",
      fromCache: false,
      provider,
      ucrContext: {
        ucr_version: execContext.ucrVersion,
        sections_used: execContext.sectionsUsed,
        rules_triggered: execContext.rulesTriggered,
        executed_at: new Date().toISOString(),
        module_id: execContext.moduleId,
      },
    };
  }

  const limit = pLimit(3);

  const allKeywordsMap = new Map<string, {
    keyword: GapKeyword;
    competitors: string[];
  }>();

  // Track provider errors for reporting
  const providerErrors: ProviderError[] = [];

  await Promise.all(
    directCompetitors.map(competitor =>
      limit(async () => {
        const competitorDomain = normalizeDomain(competitor);
        const cacheKey = getCacheKey(brandDomain, competitorDomain, locationCode, languageCode, provider);
        let cachedKeywords = forceRefresh ? null : getFromCache(cacheKey);

        if (cachedKeywords) {
          usedCache = true;
          console.log(`[${keywordProvider.displayName}] Using cached data for ${competitorDomain}`);
        }

        if (!cachedKeywords) {
          try {
            console.log(`[${keywordProvider.displayName}] Fetching gap: ${brandDomain} vs ${competitorDomain}${forceRefresh ? ' (force refresh)' : ''}`);
            const result = await keywordProvider.getGapKeywords(
              brandDomain,
              competitorDomain,
              {
                locationCode,
                languageName: languageCode,
                limit: limitPerDomain,
              }
            );

            // Check if provider returned an error (from Promise.allSettled handling)
            if (result.error) {
              console.warn(`[${keywordProvider.displayName}] Provider returned error for ${competitorDomain}: ${result.error}`);
              providerErrors.push({
                competitor: competitorDomain,
                error: result.error,
                timestamp: new Date().toISOString(),
              });
            }

            cachedKeywords = result.gapKeywords;
            if (cachedKeywords.length > 0) {
              setCache(cacheKey, cachedKeywords);
            }
            console.log(`[${keywordProvider.displayName}] Got ${cachedKeywords.length} gap keywords from ${competitorDomain}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Check if this is a fatal brand-domain error (critical - should propagate)
            const isBrandDomainError = errorMessage.includes("Brand Domain Failed") ||
              errorMessage.includes("brand fetch") ||
              errorMessage.includes("client domain");

            if (isBrandDomainError) {
              console.error(`[${keywordProvider.displayName}] FATAL brand-domain error - re-throwing:`, error);
              throw error; // Don't swallow brand-domain errors - they're critical
            }

            // Non-fatal competitor error - track but continue
            console.warn(`[${keywordProvider.displayName}] Competitor fetch error for ${competitorDomain}:`, errorMessage);

            providerErrors.push({
              competitor: competitorDomain,
              error: errorMessage,
              timestamp: new Date().toISOString(),
            });

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
  let irrelevantEntityCount = 0;
  let lowCapabilityCount = 0;

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
      disposition: evaluation.disposition,
      statusIcon: evaluation.statusIcon,
      intentType: evaluation.intentType,
      capabilityScore: evaluation.capabilityScore,
      opportunityScore: evaluation.opportunityScore,
      difficultyFactor: evaluation.difficultyFactor,
      positionFactor: evaluation.positionFactor,
      reason: evaluation.reason,
      reasons: evaluation.reasons,
      flags: evaluation.flags,
      confidence: evaluation.confidence,
      competitorsSeen: competitors,
      searchVolume: kw.searchVolume,
      cpc: kw.cpc,
      keywordDifficulty: kw.keywordDifficulty,
      competitorPosition: kw.competitorPosition,
      theme,
      trace: evaluation.trace,
    });

    if (evaluation.status === "pass") stats.passed++;
    else if (evaluation.status === "review") stats.review++;
    else stats.outOfPlay++;

    if (evaluation.flags.includes("competitor_brand")) competitorBrandCount++;
    if (evaluation.flags.includes("size_variant")) variantCount++;
    if (evaluation.flags.includes("irrelevant_entity")) irrelevantEntityCount++;
    if (evaluation.reason === "Low capability fit") lowCapabilityCount++;
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

  if (competitorBrandCount > 0) addTriggeredRule(execContext, RULES.COMPETITOR_BRAND_DETECTED);
  if (variantCount > 0) addTriggeredRule(execContext, RULES.SIZE_VARIANT_DETECTED);
  if (irrelevantEntityCount > 0) addTriggeredRule(execContext, RULES.IRRELEVANT_ENTITY);
  if (excludedCategories > 0 || excludedKeywords > 0 || excludedUseCases > 0) {
    addTriggeredRule(execContext, RULES.NEGATIVE_SCOPE_MATCH);
  }
  if (lowCapabilityCount > 0) addTriggeredRule(execContext, RULES.LOW_CAPABILITY_SCORE);
  if (config.scoring_config || config.capability_model) {
    addTriggeredRule(execContext, RULES.GOVERNANCE_THRESHOLD);
  }

  // If all competitors failed and we have no results, log a strong warning
  if (results.length === 0 && providerErrors.length > 0) {
    console.error(`[KeywordGapLite] ALL competitors failed! Provider errors:`, providerErrors);
  }

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
      irrelevantEntities: irrelevantEntityCount,
      lowCapability: lowCapabilityCount,
      totalFilters: excludedCategories + excludedKeywords + excludedUseCases + competitorBrandCount + variantCount + irrelevantEntityCount + lowCapabilityCount,
    },
    contextVersion: 1,
    configurationName: config.name || "Unknown",
    fromCache: usedCache,
    provider,
    providerErrors: providerErrors.length > 0 ? providerErrors : undefined,
    ucrContext: {
      ucr_version: execContext.ucrVersion,
      sections_used: execContext.sectionsUsed,
      rules_triggered: execContext.rulesTriggered,
      executed_at: new Date().toISOString(),
      module_id: execContext.moduleId,
    },
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
