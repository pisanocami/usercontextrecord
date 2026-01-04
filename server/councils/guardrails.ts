import type { NegativeScope, StrategicIntent } from "@shared/schema";

export interface GuardrailViolation {
  type: "excluded_keyword" | "excluded_category" | "excluded_competitor" | "excluded_use_case" | "strategic_misalignment";
  severity: "block" | "warn" | "info";
  matchedTerm: string;
  context: string;
  source: string;
}

export interface GuardrailCheckResult {
  passed: boolean;
  violations: GuardrailViolation[];
  blockedCount: number;
  warnCount: number;
  enforcementLevel: "strict" | "moderate" | "permissive";
}

export interface CouncilGuardrails {
  negativeScope: NegativeScope;
  strategicIntent?: StrategicIntent;
  enforcementRules: {
    hardExclusion: boolean;
    allowModelSuggestion: boolean;
    requireHumanOverride: boolean;
  };
}

export function checkRecommendationGuardrails(
  recommendation: string,
  guardrails: CouncilGuardrails
): GuardrailCheckResult {
  const violations: GuardrailViolation[] = [];
  const normalizedRec = recommendation.toLowerCase();

  const { negativeScope, strategicIntent, enforcementRules } = guardrails;
  const severity = enforcementRules.hardExclusion ? "block" : "warn";

  if (negativeScope.excluded_keywords?.length) {
    for (const keyword of negativeScope.excluded_keywords) {
      if (normalizedRec.includes(keyword.toLowerCase())) {
        violations.push({
          type: "excluded_keyword",
          severity,
          matchedTerm: keyword,
          context: extractContext(recommendation, keyword),
          source: "negative_scope.excluded_keywords",
        });
      }
    }
  }

  if (negativeScope.excluded_categories?.length) {
    for (const category of negativeScope.excluded_categories) {
      if (normalizedRec.includes(category.toLowerCase())) {
        violations.push({
          type: "excluded_category",
          severity,
          matchedTerm: category,
          context: extractContext(recommendation, category),
          source: "negative_scope.excluded_categories",
        });
      }
    }
  }

  if (negativeScope.excluded_competitors?.length) {
    for (const competitor of negativeScope.excluded_competitors) {
      if (normalizedRec.includes(competitor.toLowerCase())) {
        violations.push({
          type: "excluded_competitor",
          severity,
          matchedTerm: competitor,
          context: extractContext(recommendation, competitor),
          source: "negative_scope.excluded_competitors",
        });
      }
    }
  }

  if (negativeScope.excluded_use_cases?.length) {
    for (const useCase of negativeScope.excluded_use_cases) {
      const useCaseWords = useCase.toLowerCase().split(/\s+/);
      const matchCount = useCaseWords.filter(word => 
        normalizedRec.includes(word) && word.length > 3
      ).length;
      
      if (matchCount >= 2 || (useCaseWords.length === 1 && normalizedRec.includes(useCaseWords[0]))) {
        violations.push({
          type: "excluded_use_case",
          severity,
          matchedTerm: useCase,
          context: extractContext(recommendation, useCase),
          source: "negative_scope.excluded_use_cases",
        });
      }
    }
  }

  if (strategicIntent?.avoid?.length) {
    for (const avoidItem of strategicIntent.avoid) {
      const avoidWords = avoidItem.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const matchCount = avoidWords.filter(word => normalizedRec.includes(word)).length;
      
      if (matchCount >= 2) {
        violations.push({
          type: "strategic_misalignment",
          severity: "warn",
          matchedTerm: avoidItem,
          context: extractContext(recommendation, avoidItem.split(/\s+/)[0]),
          source: "strategic_intent.avoid",
        });
      }
    }
  }

  const blockedCount = violations.filter(v => v.severity === "block").length;
  const warnCount = violations.filter(v => v.severity === "warn").length;

  return {
    passed: blockedCount === 0,
    violations,
    blockedCount,
    warnCount,
    enforcementLevel: enforcementRules.hardExclusion 
      ? "strict" 
      : enforcementRules.requireHumanOverride 
        ? "moderate" 
        : "permissive",
  };
}

export function checkInsightGuardrails(
  insight: { data_point: string; why_it_matters: string },
  guardrails: CouncilGuardrails
): GuardrailCheckResult {
  const combinedText = `${insight.data_point} ${insight.why_it_matters}`;
  return checkRecommendationGuardrails(combinedText, guardrails);
}

export function filterRecommendationsWithGuardrails(
  recommendations: string[],
  guardrails: CouncilGuardrails
): { allowed: string[]; blocked: string[]; violations: Map<string, GuardrailViolation[]> } {
  const allowed: string[] = [];
  const blocked: string[] = [];
  const violations = new Map<string, GuardrailViolation[]>();

  for (const rec of recommendations) {
    const result = checkRecommendationGuardrails(rec, guardrails);
    
    if (result.passed) {
      allowed.push(rec);
    } else {
      blocked.push(rec);
    }
    
    if (result.violations.length > 0) {
      violations.set(rec, result.violations);
    }
  }

  return { allowed, blocked, violations };
}

export function createCouncilGuardrails(
  negativeScope: NegativeScope,
  strategicIntent?: StrategicIntent
): CouncilGuardrails {
  return {
    negativeScope,
    strategicIntent,
    enforcementRules: {
      hardExclusion: negativeScope.enforcement_rules?.hard_exclusion ?? true,
      allowModelSuggestion: negativeScope.enforcement_rules?.allow_model_suggestion ?? false,
      requireHumanOverride: negativeScope.enforcement_rules?.require_human_override_for_expansion ?? true,
    },
  };
}

function extractContext(text: string, term: string): string {
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerText.indexOf(lowerTerm);
  
  if (index === -1) return "";
  
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + term.length + 30);
  
  let context = text.substring(start, end);
  if (start > 0) context = "..." + context;
  if (end < text.length) context = context + "...";
  
  return context;
}

export function summarizeGuardrailViolations(
  violations: GuardrailViolation[]
): string {
  if (violations.length === 0) {
    return "No guardrail violations detected.";
  }

  const blocked = violations.filter(v => v.severity === "block");
  const warned = violations.filter(v => v.severity === "warn");

  const parts: string[] = [];

  if (blocked.length > 0) {
    const terms = blocked.map(v => v.matchedTerm).join(", ");
    parts.push(`BLOCKED: ${blocked.length} violation(s) - ${terms}`);
  }

  if (warned.length > 0) {
    const terms = warned.map(v => v.matchedTerm).join(", ");
    parts.push(`WARNING: ${warned.length} issue(s) - ${terms}`);
  }

  return parts.join(" | ");
}
