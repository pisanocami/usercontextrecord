/**
 * Context Comparison Tool - Core Comparison Algorithm
 * 
 * Functions for comparing multiple User Context Records.
 */

import type { Configuration } from "@shared/schema";
import type {
  ComparisonResult,
  SectionComparison,
  FieldComparison,
  ContextValue,
  MatchType,
  SectionKey,
  FieldDefinition,
  CompetitorPresence,
} from "./types";
import { SECTION_DEFINITIONS } from "./types";
import { generateInsights } from "./generate-insights";
import { calculateOverlapMetrics } from "./calculate-overlap";

/**
 * Get a nested value from an object using dot notation
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  return path.split(".").reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

/**
 * Normalize a value for comparison
 */
export function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return JSON.stringify([...value].sort());
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value).toLowerCase().trim();
}

/**
 * Format a value for display
 */
export function formatDisplayValue(value: unknown, isArray?: boolean): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isArray && Array.isArray(value)) {
    if (value.length === 0) return "-";
    return value.join(", ");
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Determine the match type for a set of values
 */
export function determineMatchType(values: ContextValue[]): MatchType {
  const normalized = values.map((v) => normalizeValue(v.value));
  const nonEmpty = normalized.filter((v) => v !== "");
  
  if (nonEmpty.length === 0) return "full"; // All empty = match
  
  const unique = new Set(nonEmpty);
  
  if (unique.size === 1) return "full";
  if (unique.size === nonEmpty.length) return "none";
  return "partial";
}

/**
 * Compare a single field across all contexts
 */
function compareField(
  contexts: Configuration[],
  field: FieldDefinition,
  sectionKey: SectionKey
): FieldComparison {
  const values: ContextValue[] = contexts.map((ctx) => {
    const sectionData = ctx[sectionKey as keyof Configuration];
    const value = field.isNested
      ? getNestedValue(sectionData, field.key)
      : (sectionData as Record<string, unknown>)?.[field.key];

    return {
      contextId: Number(ctx.id),
      contextName: ctx.name || ctx.brand?.domain || "Unknown",
      value,
      displayValue: formatDisplayValue(value, field.isArray),
    };
  });

  return {
    fieldName: field.label,
    fieldKey: field.key,
    values,
    matchType: determineMatchType(values),
    isArray: field.isArray || false,
    isNested: field.isNested || false,
  };
}

/**
 * Compare a single section across all contexts
 */
function compareSection(
  contexts: Configuration[],
  sectionKey: SectionKey
): SectionComparison {
  const definition = SECTION_DEFINITIONS.find((s) => s.key === sectionKey);
  if (!definition) {
    return {
      sectionKey,
      sectionTitle: sectionKey,
      fields: [],
      overallMatch: 0,
      matchingFieldsCount: 0,
      totalFieldsCount: 0,
    };
  }

  const fields = definition.fields.map((field) =>
    compareField(contexts, field, sectionKey)
  );

  const matchingFields = fields.filter((f) => f.matchType === "full").length;
  const overallMatch =
    fields.length > 0 ? Math.round((matchingFields / fields.length) * 100) : 0;

  return {
    sectionKey,
    sectionTitle: definition.title,
    fields,
    overallMatch,
    matchingFieldsCount: matchingFields,
    totalFieldsCount: fields.length,
  };
}

/**
 * Build competitor presence matrix
 */
function buildCompetitorMatrix(contexts: Configuration[]): CompetitorPresence[] {
  const competitorMap = new Map<string, { presentIn: number[]; tier: string }>();

  contexts.forEach((ctx) => {
    const contextId = Number(ctx.id);
    
    // Direct competitors
    ctx.competitors?.direct?.forEach((comp) => {
      const key = comp.toLowerCase().trim();
      if (!competitorMap.has(key)) {
        competitorMap.set(key, { presentIn: [], tier: "direct" });
      }
      competitorMap.get(key)!.presentIn.push(contextId);
    });

    // Indirect competitors
    ctx.competitors?.indirect?.forEach((comp) => {
      const key = comp.toLowerCase().trim();
      if (!competitorMap.has(key)) {
        competitorMap.set(key, { presentIn: [], tier: "indirect" });
      }
      const entry = competitorMap.get(key)!;
      if (!entry.presentIn.includes(contextId)) {
        entry.presentIn.push(contextId);
      }
    });

    // Marketplaces
    ctx.competitors?.marketplaces?.forEach((comp) => {
      const key = comp.toLowerCase().trim();
      if (!competitorMap.has(key)) {
        competitorMap.set(key, { presentIn: [], tier: "marketplace" });
      }
      const entry = competitorMap.get(key)!;
      if (!entry.presentIn.includes(contextId)) {
        entry.presentIn.push(contextId);
      }
    });
  });

  return Array.from(competitorMap.entries())
    .map(([competitor, data]) => ({
      competitor,
      presentIn: data.presentIn,
      tier: data.tier,
    }))
    .sort((a, b) => b.presentIn.length - a.presentIn.length);
}

/**
 * Main comparison function - compares multiple contexts
 */
export function compareContexts(contexts: Configuration[]): ComparisonResult {
  if (contexts.length < 2) {
    throw new Error("At least 2 contexts are required for comparison");
  }

  // Compare all sections
  const sections: Record<SectionKey, SectionComparison> = {} as Record<
    SectionKey,
    SectionComparison
  >;

  for (const definition of SECTION_DEFINITIONS) {
    sections[definition.key] = compareSection(contexts, definition.key);
  }

  // Build competitor matrix
  const competitorMatrix = buildCompetitorMatrix(contexts);

  // Calculate overlap metrics
  const overlapMetrics = calculateOverlapMetrics(contexts);

  // Generate insights
  const insights = generateInsights(contexts, sections, overlapMetrics);

  return {
    contexts,
    sections,
    insights,
    overlapMetrics,
    competitorMatrix,
    comparedAt: new Date().toISOString(),
  };
}
