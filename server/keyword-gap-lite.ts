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
  scope_status: "in_scope" | "borderline" | "out_of_scope";
  scope_reason: string;
  matched_fence_concept?: string;
  opportunity_score: number;
}

export interface KeywordGapResult {
  brandDomain: string;
  competitors: string[];
  totalGapKeywords: number;
  results: KeywordResult[];
  grouped: Record<string, KeywordResult[]>;
  stats: {
    passed: number;
    warned: number;
    blocked: number;
  };
  context_metadata: {
    ucr_id?: number;
    ucr_hash: string;
    brand_domain_snapshot: string;
    competitors_snapshot: string[];
    generated_at: string;
  };
}

interface CacheEntry {
  data: string[];
  timestamp: number;
}

const keywordCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const DEFAULT_BLOCKED_PATTERNS = [
  'login', 'sign in', 'signin',
  'careers', 'jobs', 'hiring', 'employment',
  'tracking number', 'track package', 'track order',
  'customer service', 'support', 'help center',
  'phone number', 'contact us', 'call us',
  'address', 'locations', 'store finder',
  'return policy', 'returns', 'refund',
  'shipping status', 'delivery status'
];

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

export function getIntentWeight(keyword: string): number {
  const normalizedKw = normalizeKeyword(keyword);
  
  // Transactional intent
  if (/\b(buy|price|cost|shop|store|order|purchase|near me|for sale)\b/.test(normalizedKw)) {
    return 1.0;
  }
  
  // Commercial intent
  if (/\b(best|top|vs|review|comparison|alternative|choice)\b/.test(normalizedKw)) {
    return 0.8;
  }
  
  // Informational intent (default)
  return 0.5;
}

export function calculateOpportunityScore(params: {
  intentWeight: number;
  gapSeverity: number;
  brandFit: number;
}): number {
  // Score = Intent Weight × Gap Severity × Brand Fit
  // Scale it to 0-100
  return Math.round(params.intentWeight * params.gapSeverity * params.brandFit * 100);
}

export function classifyKeywordScope(
  keyword: string,
  inScopeConcepts: string[],
  demandThemes: string[]
): { scope_status: "in_scope" | "borderline" | "out_of_scope"; scope_reason: string; matched_fence_concept?: string } {
  const normalizedKw = normalizeKeyword(keyword);
  const allConcepts = [...inScopeConcepts, ...demandThemes].map(c => normalizeKeyword(c));
  
  for (const concept of allConcepts) {
    if (normalizedKw.includes(concept) || concept.includes(normalizedKw)) {
      return { 
        scope_status: "in_scope", 
        scope_reason: `Matches in-scope concept: "${concept}"`,
        matched_fence_concept: concept
      };
    }
  }

  // Token based partial match for borderline
  const keywordTokens = normalizedKw.split(" ");
  for (const concept of allConcepts) {
    const conceptTokens = concept.split(" ");
    const hasPartialMatch = conceptTokens.some((token: string) => 
      token.length > 3 && keywordTokens.some((kwToken: string) => kwToken.includes(token))
    );
    
    if (hasPartialMatch) {
      return { 
        scope_status: "borderline", 
        scope_reason: `Partial match with concept: "${concept}"`,
        matched_fence_concept: concept
      };
    }
  }

  return { 
    scope_status: "out_of_scope", 
    scope_reason: "No direct or partial match to in-scope concepts" 
  };
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
): { blocked: boolean; reason: string; type?: "custom" | "default" } {
  const normalizedKw = normalizeKeyword(keyword);
  
  // 1. Check Default Blocked Patterns first (Hard Block)
  for (const pattern of DEFAULT_BLOCKED_PATTERNS) {
    const normalizedPattern = normalizeKeyword(pattern);
    if (normalizedKw.includes(normalizedPattern)) {
      return { 
        blocked: true, 
        reason: `Default exclusion: "${pattern}"`,
        type: "default" 
      };
    }
  }

  // 2. Check Custom Exclusions
  const allExclusions = [
    ...(exclusions.excludedCategories || []),
    ...(exclusions.excludedKeywords || []),
    ...(exclusions.excludedUseCases || []),
    ...(exclusions.excludedCompetitors || []),
  ].map(e => normalizeKeyword(e));
  
  for (const exclusion of allExclusions) {
    if (normalizedKw.includes(exclusion) || exclusion.includes(normalizedKw)) {
      return { 
        blocked: true, 
        reason: `Matches custom exclusion: "${exclusion}"`,
        type: "custom"
      };
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
  
  return { status: "warn", reason: "No direct match to in-scope concepts" };
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
    ucrId?: number;
    ucrHash?: string;
  } = {}
): Promise<KeywordGapResult> {
  const {
    limitPerDomain = 200,
    locationCode = 2840,
    languageCode = "en",
    maxCompetitors = 5,
    ucrId,
    ucrHash = "",
  } = options;
  
  const brandDomain = normalizeDomain(config.brand?.domain || "");
  
  // Fix 3: Use only approved competitors
  const directCompetitors = (config.competitors?.competitors || [])
    .filter(c => c.status === "approved")
    .map(c => c.domain)
    .concat(config.competitors?.direct || []) // Backward compatibility
    .slice(0, maxCompetitors)
    .filter(Boolean);
  
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

  allCompetitorKeywords.forEach((competitors, keyword) => {
    const evaluation = evaluateKeyword(keyword, config);
    const theme = assignTheme(keyword, config);
    const scope = classifyKeywordScope(keyword, inScopeConcepts, demandThemes);
    
    // Calculate Score (Fix 4)
    const intentWeight = getIntentWeight(keyword);
    // Severity: more competitors rank for it, higher the gap
    const gapSeverity = competitors.length / directCompetitors.length;
    // Fit: in_scope = 1.0, borderline = 0.5, out_of_scope = 0.1
    const brandFit = scope.scope_status === "in_scope" ? 1.0 : (scope.scope_status === "borderline" ? 0.5 : 0.1);
    
    const opportunity_score = calculateOpportunityScore({ intentWeight, gapSeverity, brandFit });

    results.push({
      keyword,
      normalizedKeyword: normalizeKeyword(keyword),
      status: evaluation.status,
      statusIcon: evaluation.statusIcon,
      reason: evaluation.reason,
      competitorsSeen: competitors,
      theme,
      scope_status: scope.scope_status,
      scope_reason: scope.scope_reason,
      matched_fence_concept: scope.matched_fence_concept,
      opportunity_score
    });
    
    if (evaluation.status === "pass") stats.passed++;
    else if (evaluation.status === "warn") stats.warned++;
    else stats.blocked++;
  });
  
  // Fix 4: Sort by opportunity score DESC
  results.sort((a, b) => b.opportunity_score - a.opportunity_score);
  
  const top30 = results.slice(0, 30);
  
  const grouped: Record<string, KeywordResult[]> = {};
  top30.forEach(result => {
    if (!grouped[result.theme]) {
      grouped[result.theme] = [];
    }
    grouped[result.theme].push(result);
  });
  
  return {
    brandDomain,
    competitors: directCompetitors,
    totalGapKeywords: results.length,
    results: top30,
    grouped,
    stats,
    context_metadata: {
      ucr_id: ucrId,
      ucr_hash: ucrHash,
      brand_domain_snapshot: brandDomain,
      competitors_snapshot: directCompetitors,
      generated_at: new Date().toISOString()
    }
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
