import pLimit from "p-limit";
import type { Configuration } from "@shared/schema";
import { getDomainIntersection, type DomainIntersectionKeyword } from "./dataforseo";

export type GuardrailStatus = "pass" | "warn";

export interface KeywordResult {
  keyword: string;
  normalizedKeyword: string;
  status: GuardrailStatus;
  statusIcon: string;
  reason: string;
  competitorsSeen: string[];
  searchVolume: number;
  competitorPosition: number;
  theme: string;
}

export interface KeywordGapResult {
  brandDomain: string;
  competitors: string[];
  totalGapKeywords: number;
  results: KeywordResult[];
  grouped: Record<string, KeywordResult[]>;
  needsReview: KeywordResult[];
  stats: {
    passed: number;
    needsReview: number;
  };
  filtersApplied: {
    excludedCategories: number;
    excludedKeywords: number;
    excludedUseCases: number;
    totalFilters: number;
  };
  contextVersion: number;
  configurationName: string;
}

interface CacheEntry {
  data: DomainIntersectionKeyword[];
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

function getFromCache(key: string): DomainIntersectionKeyword[] | null {
  const entry = keywordCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    keywordCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache(key: string, data: DomainIntersectionKeyword[]): void {
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

export function evaluateKeyword(
  keyword: string,
  config: Configuration
): { status: GuardrailStatus; statusIcon: string; reason: string } {
  const exclusions = {
    excludedCategories: config.negative_scope?.excluded_categories || [],
    excludedKeywords: config.negative_scope?.excluded_keywords || [],
    excludedUseCases: config.negative_scope?.excluded_use_cases || [],
    excludedCompetitors: config.negative_scope?.excluded_competitors || [],
  };
  
  const exclusionResult = checkExclusions(keyword, exclusions);
  if (exclusionResult.hasMatch) {
    return { status: "warn", statusIcon: "⚠️", reason: exclusionResult.reason };
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
  
  if (fenceResult.inFence) {
    return { status: "pass", statusIcon: "✅", reason: fenceResult.reason };
  }
  
  return { status: "warn", statusIcon: "⚠️", reason: fenceResult.reason };
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
  } = {}
): Promise<KeywordGapResult> {
  const {
    limitPerDomain = 200,
    locationCode = 2840,
    languageCode = "English",
    maxCompetitors = 5,
  } = options;
  
  const brandDomain = normalizeDomain(config.brand?.domain || "");
  
  const directCompetitors = (config.competitors?.direct || [])
    .slice(0, maxCompetitors)
    .map(c => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object" && "domain" in c) return (c as { domain: string }).domain;
      return "";
    })
    .filter(Boolean);
  
  if (!brandDomain || directCompetitors.length === 0) {
    return {
      brandDomain,
      competitors: directCompetitors,
      totalGapKeywords: 0,
      results: [],
      grouped: {},
      needsReview: [],
      stats: { passed: 0, needsReview: 0 },
      filtersApplied: {
        excludedCategories: 0,
        excludedKeywords: 0,
        excludedUseCases: 0,
        totalFilters: 0,
      },
      contextVersion: 1,
      configurationName: config.name || "Unknown",
    };
  }
  
  const limit = pLimit(3);
  
  const allKeywordsMap = new Map<string, {
    keyword: DomainIntersectionKeyword;
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
            console.log(`Fetching domain intersection: ${brandDomain} vs ${competitorDomain}`);
            const result = await getDomainIntersection(
              brandDomain,
              competitorDomain,
              locationCode,
              languageCode,
              limitPerDomain
            );
            cachedKeywords = result.gapKeywords;
            setCache(cacheKey, cachedKeywords);
            console.log(`Got ${cachedKeywords.length} gap keywords from ${competitorDomain}`);
          } catch (error) {
            console.error(`Error fetching intersection for ${competitorDomain}:`, error);
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
  const stats = { passed: 0, needsReview: 0 };
  
  allKeywordsMap.forEach(({ keyword: kw, competitors }) => {
    const evaluation = evaluateKeyword(kw.keyword, config);
    const theme = assignTheme(kw.keyword, config);
    
    results.push({
      keyword: kw.keyword,
      normalizedKeyword: normalizeKeyword(kw.keyword),
      status: evaluation.status,
      statusIcon: evaluation.statusIcon,
      reason: evaluation.reason,
      competitorsSeen: competitors,
      searchVolume: kw.searchVolume,
      competitorPosition: kw.competitorPosition,
      theme,
    });
    
    if (evaluation.status === "pass") stats.passed++;
    else stats.needsReview++;
  });
  
  results.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "pass" ? -1 : 1;
    }
    return (b.searchVolume || 0) - (a.searchVolume || 0);
  });
  
  const passedResults = results.filter(r => r.status === "pass");
  const warnResults = results.filter(r => r.status === "warn");
  
  const top50 = passedResults.slice(0, 50);
  const needsReview = warnResults.slice(0, 20);
  
  const grouped: Record<string, KeywordResult[]> = {};
  top50.forEach(result => {
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
    results: top50,
    grouped,
    needsReview,
    stats,
    filtersApplied: {
      excludedCategories,
      excludedKeywords,
      excludedUseCases,
      totalFilters: excludedCategories + excludedKeywords + excludedUseCases,
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
