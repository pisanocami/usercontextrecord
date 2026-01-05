import pLimit from "p-limit";
import type { Configuration } from "@shared/schema";

export type GuardrailStatus = "pass" | "warn" | "block";

export interface KeywordResult {
  keyword: string;
  normalizedKeyword: string;
  status: GuardrailStatus;
  statusIcon: string;
  reason: string;
  competitorsSeen: string[];
  searchVolume?: number;
  theme: string;
}

export interface KeywordGapResult {
  brandDomain: string;
  competitors: string[];
  totalGapKeywords: number;
  results: KeywordResult[];
  grouped: Record<string, KeywordResult[]>;
  borderline: KeywordResult[];
  stats: {
    passed: number;
    warned: number;
    blocked: number;
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
  data: string[];
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

function getCacheKey(domain: string, locationCode: number, languageCode: string, limit: number): string {
  return `${normalizeDomain(domain)}|${locationCode}|${languageCode}|${limit}`;
}

function getFromCache(key: string): string[] | null {
  const entry = keywordCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    keywordCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache(key: string, data: string[]): void {
  keywordCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function applyExclusions(
  keyword: string,
  exclusions: {
    excludedCategories?: string[];
    excludedKeywords?: string[];
    excludedUseCases?: string[];
    excludedCompetitors?: string[];
  }
): { blocked: boolean; reason: string } {
  const normalizedKw = normalizeKeyword(keyword);
  
  const allExclusions = [
    ...(exclusions.excludedCategories || []),
    ...(exclusions.excludedKeywords || []),
    ...(exclusions.excludedUseCases || []),
    ...(exclusions.excludedCompetitors || []),
  ].map(e => normalizeKeyword(e));
  
  for (const exclusion of allExclusions) {
    if (normalizedKw.includes(exclusion) || exclusion.includes(normalizedKw)) {
      return { blocked: true, reason: `Matches exclusion: "${exclusion}"` };
    }
  }
  
  return { blocked: false, reason: "" };
}

export function fenceCheck(
  keyword: string,
  inScopeConcepts: string[],
  demandThemes: string[]
): { status: GuardrailStatus; reason: string } {
  const normalizedKw = normalizeKeyword(keyword);
  
  const allConcepts = [
    ...inScopeConcepts.map(c => normalizeKeyword(c)),
    ...demandThemes.map(t => normalizeKeyword(t)),
  ];
  
  for (const concept of allConcepts) {
    const conceptTokens = concept.split(" ");
    const keywordTokens = normalizedKw.split(" ");
    
    const hasMatch = conceptTokens.some(token => 
      token.length > 2 && keywordTokens.some(kwToken => 
        kwToken.includes(token) || token.includes(kwToken)
      )
    );
    
    if (hasMatch) {
      return { status: "pass", reason: `Matches in-scope concept: "${concept}"` };
    }
  }
  
  return { status: "block", reason: "Outside category fence - no match to in-scope concepts" };
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
  
  const exclusionResult = applyExclusions(keyword, exclusions);
  if (exclusionResult.blocked) {
    return { status: "block", statusIcon: "⛔", reason: exclusionResult.reason };
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
  
  if (fenceResult.status === "pass") {
    return { status: "pass", statusIcon: "✅", reason: fenceResult.reason };
  }
  
  return { status: "block", statusIcon: "⛔", reason: fenceResult.reason };
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

interface DataForSEOClient {
  getRankedKeywords(domain: string, locationCode?: number, languageCode?: string, limit?: number): Promise<Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    url: string;
    trafficShare: number;
  }>>;
}

export async function computeKeywordGap(
  config: Configuration,
  dataforseoClient: DataForSEOClient,
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
    languageCode = "en",
    maxCompetitors = 5,
  } = options;
  
  const brandDomain = normalizeDomain(config.brand?.domain || "");
  const directCompetitors = (config.competitors?.direct || [])
    .slice(0, maxCompetitors)
    .map(c => typeof c === "string" ? c : c);
  
  const limit = pLimit(5);
  
  const brandCacheKey = getCacheKey(brandDomain, locationCode, languageCode, limitPerDomain);
  let brandKeywords = getFromCache(brandCacheKey);
  
  if (!brandKeywords) {
    try {
      const brandResults = await dataforseoClient.getRankedKeywords(
        brandDomain,
        locationCode,
        languageCode,
        limitPerDomain
      );
      brandKeywords = brandResults.map(r => normalizeKeyword(r.keyword));
      setCache(brandCacheKey, brandKeywords);
    } catch (error) {
      console.error(`Error fetching brand keywords for ${brandDomain}:`, error);
      brandKeywords = [];
    }
  }
  
  const brandKeywordsSet = new Set(brandKeywords);
  
  const competitorKeywordsMap = new Map<string, Set<string>>();
  
  await Promise.all(
    directCompetitors.map(competitor =>
      limit(async () => {
        const competitorDomain = normalizeDomain(competitor);
        const cacheKey = getCacheKey(competitorDomain, locationCode, languageCode, limitPerDomain);
        let cachedKeywords = getFromCache(cacheKey);
        
        if (!cachedKeywords) {
          try {
            const results = await dataforseoClient.getRankedKeywords(
              competitorDomain,
              locationCode,
              languageCode,
              limitPerDomain
            );
            cachedKeywords = results.map(r => normalizeKeyword(r.keyword));
            setCache(cacheKey, cachedKeywords);
          } catch (error) {
            console.error(`Error fetching keywords for ${competitorDomain}:`, error);
            cachedKeywords = [];
          }
        }
        
        competitorKeywordsMap.set(competitorDomain, new Set(cachedKeywords));
      })
    )
  );
  
  const allCompetitorKeywords = new Map<string, string[]>();
  
  competitorKeywordsMap.forEach((keywords, competitor) => {
    keywords.forEach(kw => {
      if (!brandKeywordsSet.has(kw)) {
        const existing = allCompetitorKeywords.get(kw) || [];
        existing.push(competitor);
        allCompetitorKeywords.set(kw, existing);
      }
    });
  });
  
  const results: KeywordResult[] = [];
  const stats = { passed: 0, warned: 0, blocked: 0 };
  
  allCompetitorKeywords.forEach((competitors, keyword) => {
    const evaluation = evaluateKeyword(keyword, config);
    const theme = assignTheme(keyword, config);
    
    results.push({
      keyword,
      normalizedKeyword: normalizeKeyword(keyword),
      status: evaluation.status,
      statusIcon: evaluation.statusIcon,
      reason: evaluation.reason,
      competitorsSeen: competitors,
      theme,
    });
    
    if (evaluation.status === "pass") stats.passed++;
    else if (evaluation.status === "warn") stats.warned++;
    else stats.blocked++;
  });
  
  results.sort((a, b) => {
    const statusOrder = { pass: 0, warn: 1, block: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return b.competitorsSeen.length - a.competitorsSeen.length;
  });
  
  const passedResults = results.filter(r => r.status === "pass");
  const blockedResults = results.filter(r => r.status === "block");
  
  const top30 = passedResults.slice(0, 30);
  const borderline = blockedResults.slice(0, 10);
  
  const grouped: Record<string, KeywordResult[]> = {};
  top30.forEach(result => {
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
    results: top30,
    grouped,
    borderline,
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
