/**
 * Context Validation Council
 * 
 * Validates User Context Records (UCR) to ensure CMO safety before analysis.
 * Returns context_status, confidence_band, issues[], and validation details.
 */

import type { Configuration } from "@shared/schema";

export type ContextStatus = "approved" | "needs_review" | "blocked";
export type ConfidenceBand = "high" | "medium" | "low";

export interface ValidationIssue {
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

export interface CompetitorValidation {
  domain: string;
  status: "approved" | "needs_review" | "removed";
  reason?: string;
  confidence: number;
}

export interface ContextValidationResult {
  context_status: ContextStatus;
  confidence_band: ConfidenceBand;
  confidence_score: number;
  issues: ValidationIssue[];
  required_fields_missing: string[];
  approved_competitors: CompetitorValidation[];
  suggested_removals: string[];
  section_scores: Record<string, number>;
  validation_timestamp: string;
  context_version: number;
}

const REQUIRED_FIELDS: Record<string, string[]> = {
  brand: ["name", "domain", "industry"],
  category_definition: ["primary_category"],
  competitors: [],
  demand_definition: ["target_audiences"],
  strategic_intent: ["business_objectives"],
  channel_context: ["primary_channels"],
  negative_scope: [],
  governance: [],
};

const SECTION_WEIGHTS: Record<string, number> = {
  brand: 0.20,
  category_definition: 0.15,
  competitors: 0.15,
  demand_definition: 0.15,
  strategic_intent: 0.10,
  channel_context: 0.10,
  negative_scope: 0.10,
  governance: 0.05,
};

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function validateSection(
  sectionName: string,
  sectionData: Record<string, unknown> | undefined,
  issues: ValidationIssue[],
  missingFields: string[]
): number {
  if (!sectionData) {
    const requiredForSection = REQUIRED_FIELDS[sectionName] || [];
    if (requiredForSection.length > 0) {
      issues.push({
        field: sectionName,
        severity: "error",
        message: `Sección "${sectionName}" está vacía`,
        suggestion: `Complete la sección ${sectionName} con información básica`,
      });
      missingFields.push(...requiredForSection.map(f => `${sectionName}.${f}`));
      return 0;
    }
    return 0.5;
  }

  const requiredForSection = REQUIRED_FIELDS[sectionName] || [];
  let filledRequired = 0;
  let totalFields = 0;

  for (const field of requiredForSection) {
    const value = getNestedValue(sectionData, field);
    if (hasValue(value)) {
      filledRequired++;
    } else {
      missingFields.push(`${sectionName}.${field}`);
      issues.push({
        field: `${sectionName}.${field}`,
        severity: "error",
        message: `Campo requerido "${field}" está vacío en ${sectionName}`,
        suggestion: `Complete el campo ${field}`,
      });
    }
  }

  for (const [key, value] of Object.entries(sectionData)) {
    if (hasValue(value)) totalFields++;
  }

  const requiredScore = requiredForSection.length > 0 
    ? filledRequired / requiredForSection.length 
    : 1;

  const completenessBonus = Math.min(totalFields / 5, 1) * 0.2;

  return Math.min(requiredScore + completenessBonus, 1);
}

function validateCompetitors(
  competitors: Record<string, unknown> | undefined,
  brandDomain: string | undefined,
  issues: ValidationIssue[]
): CompetitorValidation[] {
  const results: CompetitorValidation[] = [];

  if (!competitors) return results;

  const directCompetitors = (competitors.direct as Array<Record<string, unknown>>) || [];
  const indirectCompetitors = (competitors.indirect as Array<Record<string, unknown>>) || [];

  const allCompetitors = [...directCompetitors, ...indirectCompetitors];

  for (const comp of allCompetitors) {
    const domain = comp.domain as string;
    if (!domain) continue;

    const validation: CompetitorValidation = {
      domain,
      status: "approved",
      confidence: 1.0,
    };

    if (brandDomain && domain.toLowerCase() === brandDomain.toLowerCase()) {
      validation.status = "removed";
      validation.reason = "El dominio del competidor es igual al dominio de la marca";
      validation.confidence = 0;
      issues.push({
        field: "competitors",
        severity: "error",
        message: `Competidor "${domain}" es el mismo que el dominio de la marca`,
        suggestion: "Elimine este competidor de la lista",
      });
    } else if (!domain.includes(".")) {
      validation.status = "needs_review";
      validation.reason = "El dominio no tiene formato válido";
      validation.confidence = 0.5;
      issues.push({
        field: "competitors",
        severity: "warning",
        message: `Competidor "${domain}" puede no ser un dominio válido`,
        suggestion: "Verifique el formato del dominio (ej: competitor.com)",
      });
    } else if (!comp.description && !comp.name) {
      validation.status = "needs_review";
      validation.reason = "Falta descripción o nombre del competidor";
      validation.confidence = 0.7;
      issues.push({
        field: "competitors",
        severity: "info",
        message: `Competidor "${domain}" no tiene descripción`,
        suggestion: "Agregue una descripción para mejor contexto",
      });
    }

    results.push(validation);
  }

  if (allCompetitors.length === 0) {
    issues.push({
      field: "competitors",
      severity: "warning",
      message: "No hay competidores configurados",
      suggestion: "Agregue al menos 2-3 competidores directos para análisis efectivo",
    });
  } else if (allCompetitors.length < 2) {
    issues.push({
      field: "competitors",
      severity: "info",
      message: "Se recomienda tener al menos 2 competidores",
      suggestion: "Agregue más competidores para análisis comparativo",
    });
  }

  return results;
}

function validateNegativeScope(
  negativeScope: Record<string, unknown> | undefined,
  issues: ValidationIssue[]
): void {
  if (!negativeScope) {
    issues.push({
      field: "negative_scope",
      severity: "info",
      message: "No hay guardrails negativos configurados",
      suggestion: "Configure exclusiones para mayor seguridad CMO",
    });
    return;
  }

  const excludedCategories = negativeScope.excluded_categories as string[] || [];
  const excludedKeywords = negativeScope.excluded_keywords as string[] || [];
  const excludedUseCases = negativeScope.excluded_use_cases as string[] || [];

  const totalExclusions = excludedCategories.length + excludedKeywords.length + excludedUseCases.length;

  if (totalExclusions === 0) {
    issues.push({
      field: "negative_scope",
      severity: "warning",
      message: "No hay exclusiones configuradas",
      suggestion: "Configure al menos algunas categorías o keywords a excluir",
    });
  } else if (totalExclusions > 50) {
    issues.push({
      field: "negative_scope",
      severity: "warning",
      message: "Hay muchas exclusiones configuradas (>50)",
      suggestion: "Revise si todas las exclusiones son necesarias",
    });
  }
}

function calculateConfidenceBand(score: number): ConfidenceBand {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function determineStatus(
  score: number,
  issues: ValidationIssue[],
  missingFields: string[]
): ContextStatus {
  const errorCount = issues.filter(i => i.severity === "error").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;

  if (errorCount > 0 || missingFields.length > 3) {
    return "blocked";
  }

  if (warningCount > 2 || score < 0.5) {
    return "needs_review";
  }

  return "approved";
}

export function validateContext(
  config: Configuration,
  contextVersion: number = 1
): ContextValidationResult {
  const issues: ValidationIssue[] = [];
  const missingFields: string[] = [];
  const sectionScores: Record<string, number> = {};

  const brandData = config.brand as Record<string, unknown> | undefined;
  const brandDomain = brandData?.domain as string | undefined;

  sectionScores.brand = validateSection("brand", brandData, issues, missingFields);
  sectionScores.category_definition = validateSection(
    "category_definition",
    config.category_definition as Record<string, unknown> | undefined,
    issues,
    missingFields
  );
  sectionScores.competitors = validateSection(
    "competitors",
    config.competitors as Record<string, unknown> | undefined,
    issues,
    missingFields
  );
  sectionScores.demand_definition = validateSection(
    "demand_definition",
    config.demand_definition as Record<string, unknown> | undefined,
    issues,
    missingFields
  );
  sectionScores.strategic_intent = validateSection(
    "strategic_intent",
    config.strategic_intent as Record<string, unknown> | undefined,
    issues,
    missingFields
  );
  sectionScores.channel_context = validateSection(
    "channel_context",
    config.channel_context as Record<string, unknown> | undefined,
    issues,
    missingFields
  );
  sectionScores.negative_scope = validateSection(
    "negative_scope",
    config.negative_scope as Record<string, unknown> | undefined,
    issues,
    missingFields
  );
  sectionScores.governance = validateSection(
    "governance",
    config.governance as Record<string, unknown> | undefined,
    issues,
    missingFields
  );

  const approvedCompetitors = validateCompetitors(
    config.competitors as Record<string, unknown> | undefined,
    brandDomain,
    issues
  );

  validateNegativeScope(
    config.negative_scope as Record<string, unknown> | undefined,
    issues
  );

  let confidenceScore = 0;
  for (const [section, weight] of Object.entries(SECTION_WEIGHTS)) {
    confidenceScore += (sectionScores[section] || 0) * weight;
  }

  const suggestedRemovals = approvedCompetitors
    .filter(c => c.status === "removed")
    .map(c => c.domain);

  return {
    context_status: determineStatus(confidenceScore, issues, missingFields),
    confidence_band: calculateConfidenceBand(confidenceScore),
    confidence_score: Math.round(confidenceScore * 100) / 100,
    issues,
    required_fields_missing: missingFields,
    approved_competitors: approvedCompetitors.filter(c => c.status !== "removed"),
    suggested_removals: suggestedRemovals,
    section_scores: sectionScores,
    validation_timestamp: new Date().toISOString(),
    context_version: contextVersion,
  };
}
