import type { NegativeScope, Configuration, Governance } from "@shared/schema";

export interface ExclusionResult {
  isExcluded: boolean;
  matchedRule: string | null;
  exclusionType: "category" | "keyword" | "use_case" | "competitor" | null;
  matchType: "exact" | "semantic" | null;
}

export interface PreFilterResult {
  passed: boolean;
  blocked: string[];
  warnings: string[];
  appliedExclusions: ExclusionResult[];
}

export interface UCRValidationResult {
  isValid: boolean;
  isCMOSafe: boolean;
  isExpired: boolean;
  missingFields: string[];
  warnings: string[];
  contextAge: number;
  expiresInDays: number;
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function checkExactMatch(value: string, exclusions: string[]): string | null {
  const normalized = normalizeForMatch(value);
  for (const exclusion of exclusions) {
    const normalizedExclusion = normalizeForMatch(exclusion);
    if (normalized === normalizedExclusion || normalized.includes(normalizedExclusion)) {
      return exclusion;
    }
  }
  return null;
}

function checkSemanticMatch(value: string, exclusions: string[], sensitivity: "low" | "medium" | "high"): string | null {
  const normalized = normalizeForMatch(value);
  const words = normalized.split(" ");
  
  for (const exclusion of exclusions) {
    const normalizedExclusion = normalizeForMatch(exclusion);
    const exclusionWords = normalizedExclusion.split(" ");
    
    const matchThreshold = sensitivity === "high" ? 0.3 : sensitivity === "medium" ? 0.5 : 0.7;
    
    const matchingWords = exclusionWords.filter(ew => 
      words.some(w => w.includes(ew) || ew.includes(w))
    );
    
    const matchRatio = matchingWords.length / exclusionWords.length;
    
    if (matchRatio >= matchThreshold) {
      return exclusion;
    }
  }
  return null;
}

export function checkExclusion(
  value: string,
  negativeScope: NegativeScope,
  type: "category" | "keyword" | "use_case" | "competitor"
): ExclusionResult {
  const legacyArrayMap = {
    category: negativeScope.excluded_categories || [],
    keyword: negativeScope.excluded_keywords || [],
    use_case: negativeScope.excluded_use_cases || [],
    competitor: negativeScope.excluded_competitors || [],
  };
  
  const enhancedArrayMap = {
    category: negativeScope.category_exclusions || [],
    keyword: negativeScope.keyword_exclusions || [],
    use_case: negativeScope.use_case_exclusions || [],
    competitor: negativeScope.competitor_exclusions || [],
  };
  
  const legacyExclusions = legacyArrayMap[type];
  const exactMatch = checkExactMatch(value, legacyExclusions);
  if (exactMatch) {
    return {
      isExcluded: true,
      matchedRule: exactMatch,
      exclusionType: type,
      matchType: "exact",
    };
  }
  
  const enhancedExclusions = enhancedArrayMap[type];
  for (const entry of enhancedExclusions) {
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      continue;
    }
    
    if (entry.match_type === "exact") {
      const match = checkExactMatch(value, [entry.value]);
      if (match) {
        return {
          isExcluded: true,
          matchedRule: entry.value,
          exclusionType: type,
          matchType: "exact",
        };
      }
    } else if (entry.match_type === "semantic") {
      const match = checkSemanticMatch(value, [entry.value], entry.semantic_sensitivity || "medium");
      if (match) {
        return {
          isExcluded: true,
          matchedRule: entry.value,
          exclusionType: type,
          matchType: "semantic",
        };
      }
    }
  }
  
  return {
    isExcluded: false,
    matchedRule: null,
    exclusionType: null,
    matchType: null,
  };
}

export function applyNegativeScope(
  items: string[],
  negativeScope: NegativeScope,
  type: "category" | "keyword" | "use_case" | "competitor"
): PreFilterResult {
  const blocked: string[] = [];
  const warnings: string[] = [];
  const appliedExclusions: ExclusionResult[] = [];
  
  const hardExclusion = negativeScope.enforcement_rules?.hard_exclusion ?? true;
  
  for (const item of items) {
    const result = checkExclusion(item, negativeScope, type);
    
    if (result.isExcluded) {
      if (hardExclusion) {
        blocked.push(item);
      } else {
        warnings.push(`"${item}" matches exclusion rule "${result.matchedRule}" but soft exclusion is enabled`);
      }
      appliedExclusions.push(result);
    }
  }
  
  return {
    passed: blocked.length === 0,
    blocked,
    warnings,
    appliedExclusions,
  };
}

export function filterWithNegativeScope<T>(
  items: T[],
  negativeScope: NegativeScope,
  type: "category" | "keyword" | "use_case" | "competitor",
  getValueFn: (item: T) => string
): { filtered: T[]; blocked: T[]; preFilterResult: PreFilterResult } {
  const values = items.map(getValueFn);
  const preFilterResult = applyNegativeScope(values, negativeScope, type);
  
  const blockedSet = new Set(preFilterResult.blocked.map(normalizeForMatch));
  
  const filtered: T[] = [];
  const blocked: T[] = [];
  
  for (const item of items) {
    const value = normalizeForMatch(getValueFn(item));
    if (blockedSet.has(value)) {
      blocked.push(item);
    } else {
      filtered.push(item);
    }
  }
  
  return { filtered, blocked, preFilterResult };
}

export function validateUCR(config: Configuration): UCRValidationResult {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  
  if (!config.brand?.name) missingFields.push("brand.name");
  if (!config.brand?.domain) missingFields.push("brand.domain");
  if (!config.brand?.industry) missingFields.push("brand.industry");
  
  if (!config.category_definition?.primary_category) {
    missingFields.push("category_definition.primary_category");
  }
  
  const hasDirectCompetitors = config.competitors?.direct && config.competitors.direct.length > 0;
  const hasEnhancedCompetitors = config.competitors?.competitors && config.competitors.competitors.length > 0;
  if (!hasDirectCompetitors && !hasEnhancedCompetitors) {
    missingFields.push("competitors.direct");
  }
  
  const hasBrandKeywords = config.demand_definition?.brand_keywords?.seed_terms?.length > 0;
  if (!hasBrandKeywords) {
    missingFields.push("demand_definition.brand_keywords.seed_terms");
  }
  
  if (!config.strategic_intent?.primary_goal) {
    warnings.push("strategic_intent.primary_goal is recommended");
  }
  
  const governance = config.governance;
  const now = new Date();
  const validUntil = governance?.context_valid_until ? new Date(governance.context_valid_until) : null;
  const lastReviewed = governance?.last_reviewed ? new Date(governance.last_reviewed) : null;
  
  const isExpired = validUntil ? validUntil < now : false;
  const expiresInDays = validUntil ? Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 90;
  const contextAge = lastReviewed ? Math.ceil((now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  if (isExpired) {
    warnings.push("Context has expired and needs review");
  } else if (expiresInDays <= 7) {
    warnings.push(`Context expires in ${expiresInDays} days`);
  }
  
  if (contextAge > 30) {
    warnings.push(`Context was last reviewed ${contextAge} days ago`);
  }
  
  const isValid = missingFields.length === 0;
  
  const isCMOSafe = isValid && 
    !isExpired && 
    governance?.human_verified === true &&
    (governance?.quality_score?.grade === "high" || governance?.quality_score?.grade === "medium");
  
  return {
    isValid,
    isCMOSafe,
    isExpired,
    missingFields,
    warnings,
    contextAge,
    expiresInDays,
  };
}

export function calculateCMOSafe(config: Configuration): boolean {
  const validation = validateUCR(config);
  return validation.isCMOSafe;
}

export interface AuditLogEntry {
  timestamp: string;
  userId: string;
  action: "create" | "update" | "override" | "approve" | "reject" | "expire";
  entityType: "configuration" | "competitor" | "keyword" | "category" | "exclusion";
  entityId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  metadata?: Record<string, any>;
}

export function createAuditEntry(
  userId: string,
  action: AuditLogEntry["action"],
  entityType: AuditLogEntry["entityType"],
  entityId: string,
  options?: {
    previousValue?: any;
    newValue?: any;
    reason?: string;
    metadata?: Record<string, any>;
  }
): AuditLogEntry {
  return {
    timestamp: new Date().toISOString(),
    userId,
    action,
    entityType,
    entityId,
    previousValue: options?.previousValue,
    newValue: options?.newValue,
    reason: options?.reason,
    metadata: options?.metadata,
  };
}
