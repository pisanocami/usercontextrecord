import type {
  ModuleRunResult,
  ModuleRunEnvelope,
  KeywordItemResult,
  ClusterItemResult,
  ItemTrace,
  UCRSectionID,
  TimingClassification,
  YoYConsistency,
} from "@shared/module.contract";
import type { CategoryDemandSlice, Configuration } from "@shared/schema";
import crypto from "crypto";

function generateRunId(): string {
  return `run_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

function mapConsistencyToYoY(label: "low" | "medium" | "high"): YoYConsistency {
  switch (label) {
    case "low": return "erratic";
    case "medium": return "shifting";
    case "high": return "stable";
  }
}

function classifyTiming(
  stabilityScore: number,
  peakMonth: string | null,
  variance: number
): TimingClassification {
  if (stabilityScore < 0.3 || variance > 0.7) {
    return "erratic_unreliable";
  }
  if (!peakMonth || stabilityScore < 0.5) {
    return "flat_timing_neutral";
  }
  if (stabilityScore > 0.7) {
    return "peak_driven";
  }
  return "early_ramp_dominant";
}

export function categorySliceToClusterItem(
  slice: CategoryDemandSlice,
  geo: string = "US",
  timeRange: string = "today 5-y"
): ClusterItemResult {
  const traces: ItemTrace[] = [];
  
  if (slice.trace?.ucrSectionsUsed) {
    for (const section of slice.trace.ucrSectionsUsed) {
      traces.push({
        ruleId: `section_${section}_used`,
        ucrSection: section as UCRSectionID,
        reason: `Section ${section} data used for analysis`,
        severity: "low",
      });
    }
  }
  
  if (slice.trace?.filtersApplied) {
    for (const filter of slice.trace.filtersApplied) {
      traces.push({
        ruleId: filter,
        ucrSection: "G",
        reason: `Filter applied: ${filter}`,
        severity: "medium",
      });
    }
  }

  return {
    itemType: "cluster",
    itemId: slice.categoryName.toLowerCase().replace(/\s+/g, "_"),
    title: slice.categoryName,
    themeName: slice.categoryName,
    geo,
    timeRange,
    interval: "weekly",
    peakMonth: slice.peakMonth || undefined,
    lowMonth: slice.lowMonth || undefined,
    stabilityScore: Math.round(slice.stabilityScore * 100),
    yoyConsistency: mapConsistencyToYoY(slice.consistencyLabel),
    timingClassification: classifyTiming(
      slice.stabilityScore,
      slice.peakMonth,
      slice.variance
    ),
    monthlyPattern: Object.values(slice.heatmap),
    confidence: slice.stabilityScore > 0.7 ? "high" : slice.stabilityScore > 0.4 ? "medium" : "low",
    trace: traces,
    
    queries: slice.queries,
    inflectionMonth: slice.inflectionMonth || undefined,
    peakWindow: slice.peakWindow,
    recommendedLaunchByISO: slice.recommendedLaunchByISO,
    recommendationRationale: slice.recommendationRationale,
    variance: slice.variance,
    heatmap: slice.heatmap,
    
    providerMetadata: slice.trace?.cache ? {
      provider: slice.trace.provider || "unknown",
      cached: slice.trace.cache.hit,
      cacheKey: slice.trace.cache.key,
      ttlSeconds: slice.trace.cache.ttlSeconds,
    } : {
      provider: slice.trace?.provider || "unknown",
      cached: false,
    },
  };
}

export function createModuleRunEnvelope(
  moduleId: string,
  config: Configuration,
  sectionsUsed: UCRSectionID[],
  filtersApplied: Array<{ ruleId: string; ucrSection: UCRSectionID; details?: string }> = [],
  warnings: Array<{ code: string; message: string }> = []
): ModuleRunEnvelope {
  return {
    moduleId,
    runId: generateRunId(),
    generatedAt: new Date().toISOString(),
    contextVersion: config.governance?.context_version || 1,
    contextStatus: config.governance?.context_status || "DRAFT_AI",
    ucrSectionsUsed: sectionsUsed,
    filtersApplied,
    warnings,
  };
}

export function wrapCategoryResultAsModuleRunResult(
  moduleId: string,
  config: Configuration,
  categories: CategoryDemandSlice[],
  aggregate: Record<string, unknown> | null,
  settings: Record<string, unknown>,
  geo: string = "US",
  timeRange: string = "today 5-y"
): ModuleRunResult {
  const sectionsUsed: UCRSectionID[] = ["A", "B"];
  const filtersApplied: Array<{ ruleId: string; ucrSection: UCRSectionID; details?: string }> = [];
  const warnings: Array<{ code: string; message: string }> = [];

  if (config.negative_scope?.excluded_categories?.length) {
    filtersApplied.push({
      ruleId: "G_category_exclusion",
      ucrSection: "G",
      details: `Excluded ${config.negative_scope.excluded_categories.length} categories`,
    });
    sectionsUsed.push("G");
  }

  if (config.demand_definition?.brand_keywords?.seed_terms?.length) {
    sectionsUsed.push("D");
  }

  if (config.governance?.context_confidence) {
    sectionsUsed.push("H");
  }

  const items = categories.map(cat => 
    categorySliceToClusterItem(cat, geo, timeRange)
  );

  if (items.length === 0) {
    warnings.push({
      code: "NO_CATEGORIES",
      message: "No categories available for analysis after applying filters",
    });
  }

  return {
    envelope: createModuleRunEnvelope(
      moduleId,
      config,
      sectionsUsed,
      filtersApplied,
      warnings
    ),
    items,
    summary: {
      settings,
      aggregate,
    },
  };
}

export function wrapKeywordResultAsModuleRunResult(
  moduleId: string,
  config: Configuration,
  keywords: Array<{
    keyword: string;
    status: "PASS" | "REVIEW" | "OUT_OF_PLAY";
    capabilityScore: number;
    theme?: string;
    reason?: string;
    searchVolume?: number;
    competitorCount?: number;
    trace?: ItemTrace[];
  }>,
  summary: Record<string, unknown> = {}
): ModuleRunResult {
  const sectionsUsed: UCRSectionID[] = ["A", "B", "C"];
  const filtersApplied: Array<{ ruleId: string; ucrSection: UCRSectionID; details?: string }> = [];
  const warnings: Array<{ code: string; message: string }> = [];

  if (config.negative_scope?.excluded_keywords?.length) {
    filtersApplied.push({
      ruleId: "G_keyword_exclusion",
      ucrSection: "G",
      details: `Excluded ${config.negative_scope.excluded_keywords.length} keywords`,
    });
    sectionsUsed.push("G");
  }

  if (config.governance?.context_confidence) {
    sectionsUsed.push("H");
  }

  const items: KeywordItemResult[] = keywords.map((kw, idx) => ({
    itemType: "keyword" as const,
    itemId: `kw_${idx}_${kw.keyword.toLowerCase().replace(/\s+/g, "_").slice(0, 20)}`,
    keyword: kw.keyword,
    status: kw.status,
    capabilityScore: kw.capabilityScore,
    theme: kw.theme,
    reason: kw.reason,
    searchVolume: kw.searchVolume,
    competitorCount: kw.competitorCount,
    trace: kw.trace || [],
    confidence: kw.capabilityScore > 70 ? "high" : kw.capabilityScore > 40 ? "medium" : "low",
  }));

  return {
    envelope: createModuleRunEnvelope(
      moduleId,
      config,
      sectionsUsed,
      filtersApplied,
      warnings
    ),
    items,
    summary,
  };
}
