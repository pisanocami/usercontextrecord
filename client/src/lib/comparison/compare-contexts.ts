/**
 * Context Comparison Tool - Core Comparison Algorithm
 * 
 * Functions for comparing multiple User Context Records.
 */

import type { Configuration } from "../../../../shared/schema";
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
import { calculateStrategicMetrics } from "./calculate-strategic-metrics";

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
    // For arrays, sort and join as a simple string for basic comparison
    // But the real array comparison logic should be in determineMatchType
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
 * Calculate similarity between two strings (0-1)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Simple containment check
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Word-based similarity
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return totalWords > 0 ? commonWords.length / totalWords : 0;
}

/**
 * Calculate similarity between two arrays (0-1)
 */
function calculateArraySimilarity(arr1: unknown[], arr2: unknown[]): number {
  if (!arr1.length && !arr2.length) return 1;
  if (!arr1.length || !arr2.length) return 0;
  
  const normalized1 = arr1.map(item => String(item).toLowerCase().trim());
  const normalized2 = arr2.map(item => String(item).toLowerCase().trim());
  
  let totalSimilarity = 0;
  let comparisons = 0;
  
  // Compare each element with each other element
  for (const item1 of normalized1) {
    for (const item2 of normalized2) {
      totalSimilarity += calculateStringSimilarity(item1, item2);
      comparisons++;
    }
  }
  
  // Also check for exact matches
  const exactMatches = normalized1.filter(item1 => 
    normalized2.some(item2 => item1 === item2)
  ).length;
  
  const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
  const exactMatchRatio = Math.max(normalized1.length, normalized2.length) > 0 
    ? exactMatches / Math.max(normalized1.length, normalized2.length) 
    : 0;
  
  // Weight exact matches more heavily
  return (avgSimilarity * 0.3) + (exactMatchRatio * 0.7);
}

/**
 * Determine the match type for a set of values with improved array comparison
 */
export function determineMatchType(values: ContextValue[]): MatchType {
  const nonEmptyValues = values.filter(v => {
    const normalized = normalizeValue(v.value);
    return normalized !== "" && normalized !== "[]";
  });
  
  if (nonEmptyValues.length === 0) return "full"; // All empty = match
  if (nonEmptyValues.length === 1) return "full"; // Only one non-empty value = match
  
  // Check if all values are arrays
  const allArrays = nonEmptyValues.every(v => Array.isArray(v.value));
  
  if (allArrays) {
    // Calculate pairwise similarities for arrays
    const similarities: number[] = [];
    
    for (let i = 0; i < nonEmptyValues.length; i++) {
      for (let j = i + 1; j < nonEmptyValues.length; j++) {
        const arr1 = nonEmptyValues[i].value as unknown[];
        const arr2 = nonEmptyValues[j].value as unknown[];
        const similarity = calculateArraySimilarity(arr1, arr2);
        similarities.push(similarity);
      }
    }
    
    const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    
    if (avgSimilarity >= 0.8) return "full";
    if (avgSimilarity >= 0.3) return "partial";
    return "none";
  }
  
  // For non-arrays, use the original logic
  const normalized = nonEmptyValues.map((v) => normalizeValue(v.value));
  const unique = new Set(normalized);
  
  if (unique.size === 1) return "full";
  if (unique.size === nonEmptyValues.length) return "none";
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

  const matchType = determineMatchType(values);
  
  // Calculate similarity percentage for arrays
  let similarityPercentage = 0;
  if (field.isArray && values.length >= 2) {
    const nonEmptyValues = values.filter(v => {
      const normalized = normalizeValue(v.value);
      return normalized !== "" && normalized !== "[]";
    });
    
    if (nonEmptyValues.length >= 2 && nonEmptyValues.every(v => Array.isArray(v.value))) {
      const similarities: number[] = [];
      
      for (let i = 0; i < nonEmptyValues.length; i++) {
        for (let j = i + 1; j < nonEmptyValues.length; j++) {
          const arr1 = nonEmptyValues[i].value as unknown[];
          const arr2 = nonEmptyValues[j].value as unknown[];
          const similarity = calculateArraySimilarity(arr1, arr2);
          similarities.push(similarity);
        }
      }
      
      similarityPercentage = similarities.length > 0 
        ? Math.round((similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length) * 100)
        : 0;
    }
  }

  return {
    fieldName: field.label,
    fieldKey: field.key,
    values,
    matchType,
    isArray: field.isArray || false,
    isNested: field.isNested || false,
    similarityPercentage,
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

  // Calculate overall match using similarity percentages for arrays
  let totalMatchScore = 0;
  let fieldsWithScores = 0;
  
  const matchingFields = fields.filter((f) => {
    if (f.isArray && f.similarityPercentage !== undefined) {
      // For arrays, use the similarity percentage
      totalMatchScore += f.similarityPercentage;
      fieldsWithScores++;
      return f.similarityPercentage >= 80; // Consider 80%+ as a match
    } else {
      // For non-arrays, use the original logic
      const isMatch = f.matchType === "full";
      if (isMatch) {
        totalMatchScore += 100;
      }
      fieldsWithScores++;
      return isMatch;
    }
  }).length;

  const overallMatch =
    fieldsWithScores > 0 ? Math.round(totalMatchScore / fieldsWithScores) : 0;

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

  // Calculate CMO-grade strategic metrics
  const strategicMetrics = calculateStrategicMetrics(contexts, overlapMetrics, sections);

  return {
    contexts,
    sections,
    insights,
    overlapMetrics,
    competitorMatrix,
    strategicMetrics,
    comparedAt: new Date().toISOString(),
  };
}
