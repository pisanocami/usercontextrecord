import type { Configuration } from "@shared/schema";
import type { ModuleRunResult, KeywordItemResult, ItemTrace, Disposition } from "@shared/module.contract";
import type { IntelligenceModuleResult, DecisionObject } from "./types";
import { BaseIntelligencePipeline } from "./base-pipeline";
import { storage } from "../../storage";

type ROIClassification = "high_roi" | "moderate_roi" | "low_roi" | "negative_roi";

interface ExtractedKeyword {
  keyword: string;
  searchVolume: number;
  competitorCount?: number;
  theme?: string;
  serpFeatures?: string[];
}

interface TransformedKeyword extends ExtractedKeyword {
  estimatedConversions: number;
  estimatedRevenue: number;
  estimatedCost: number;
  costPerAcquisition: number;
  roi: number;
}

interface CorrelatedKeyword extends TransformedKeyword {
  alignmentScore: number;
  matchedDemandThemes: string[];
}

interface ScoredKeyword extends CorrelatedKeyword {
  roiScore: number;
  roiClassification: ROIClassification;
  confidence: "low" | "medium" | "high";
}

const DEFAULT_AOV = 50;
const DEFAULT_CPA = 15;
const CONVERSION_RATE_RANGE = { min: 0.005, max: 0.03 };

function generatePlaceholderConversions(searchVolume: number): number {
  const rate = CONVERSION_RATE_RANGE.min + Math.random() * (CONVERSION_RATE_RANGE.max - CONVERSION_RATE_RANGE.min);
  return Math.round(searchVolume * rate * 12);
}

function classifyROI(roi: number): ROIClassification {
  if (roi >= 2) return "high_roi";
  if (roi >= 0.5) return "moderate_roi";
  if (roi >= 0) return "low_roi";
  return "negative_roi";
}

class SerpAttributionPipeline extends BaseIntelligencePipeline {
  private extractedKeywords: ExtractedKeyword[] = [];
  private transformedKeywords: TransformedKeyword[] = [];
  private correlatedKeywords: CorrelatedKeyword[] = [];
  private scoredKeywords: ScoredKeyword[] = [];
  private decisions: DecisionObject[] = [];

  constructor(config: Configuration) {
    super("intel.serp_attribution.v1", config);
  }

  protected async extract(inputs: Record<string, unknown>): Promise<void> {
    const userId = inputs.userId as string;
    const configId = this.context.config.id;

    if (!userId || configId === undefined || configId === null) {
      this.addWarning("MISSING_CONTEXT", "userId or configId not provided");
      return;
    }

    this.markSectionUsed("B");
    this.markSectionUsed("D");

    this.markDataSource("GA4", {
      available: false,
      error: "GA4 integration not configured - using simulated attribution data",
      lastChecked: new Date()
    });
    this.addWarning("GA4_UNAVAILABLE", "GA4 Analytics not connected. Attribution data is simulated for demonstration purposes.");

    this.markDataSource("Northbeam", {
      available: false,
      error: "Northbeam attribution API not configured",
      lastChecked: new Date()
    });

    this.markDataSource("TripleWhale", {
      available: false,
      error: "TripleWhale attribution API not configured",
      lastChecked: new Date()
    });
    this.addWarning("ATTRIBUTION_APIS_UNAVAILABLE", "Attribution APIs (Northbeam, TripleWhale) not connected. ROI calculations use placeholder data.");

    const runs = await storage.getModuleRunsByConfig(Number(configId), userId);
    const keywordGapRuns = runs.filter(
      run => run.moduleId.includes("keyword_gap") && run.status === "completed" && run.results
    );

    if (keywordGapRuns.length > 0) {
      const latestRun = keywordGapRuns[0];
      this.markDataSource("KeywordGap", { available: true, lastChecked: new Date() });

      const results = latestRun.results as Record<string, unknown> | null;
      if (results) {
        const items = (results.items || results.topOpportunities || []) as Array<Record<string, unknown>>;

        for (const item of items) {
          this.extractedKeywords.push({
            keyword: String(item.keyword || item.title || ""),
            searchVolume: Number(item.searchVolume || item.mentions || 100),
            competitorCount: Number(item.competitorCount || 0),
            theme: String(item.theme || ""),
            serpFeatures: item.serpFeatures as string[] | undefined
          });
        }
      }

      this.addTrace({
        ruleId: "extract_keyword_gap",
        ucrSection: "B",
        reason: `Extracted ${this.extractedKeywords.length} keywords from Keyword Gap module run`,
        severity: "low"
      });
    } else {
      this.markDataSource("KeywordGap", {
        available: false,
        error: "No Keyword Gap analysis runs found",
        lastChecked: new Date()
      });

      const categoryDef = this.context.config.category_definition;
      const categoryTerms: string[] = [];

      if (categoryDef) {
        if (categoryDef.included && categoryDef.included.length > 0) {
          categoryTerms.push(...categoryDef.included);
        }
        if (categoryDef.semantic_extensions && categoryDef.semantic_extensions.length > 0) {
          categoryTerms.push(...categoryDef.semantic_extensions);
        }
        if (categoryDef.primary_category) {
          categoryTerms.push(categoryDef.primary_category);
        }
        if (categoryDef.approved_categories && categoryDef.approved_categories.length > 0) {
          categoryTerms.push(...categoryDef.approved_categories);
        }
      }

      for (const term of categoryTerms) {
        if (term) {
          this.extractedKeywords.push({
            keyword: term,
            searchVolume: 500 + Math.floor(Math.random() * 2000),
            competitorCount: 3,
            theme: "category_term"
          });
        }
      }

      this.addTrace({
        ruleId: "extract_category_fallback",
        ucrSection: "B",
        reason: `No Keyword Gap data found. Using ${this.extractedKeywords.length} category terms as fallback with simulated volumes`,
        severity: "medium"
      });
    }

    this.addTrace({
      ruleId: "simulated_attribution_notice",
      ucrSection: "D",
      reason: "⚠️ SIMULATED DATA: Attribution metrics are placeholder values. Connect GA4 or attribution APIs for real ROI data.",
      severity: "high",
      evidence: "All conversion, revenue, and ROI values in this run are generated for demonstration purposes only."
    });
  }

  protected async transform(): Promise<void> {
    for (const kw of this.extractedKeywords) {
      const estimatedConversions = generatePlaceholderConversions(kw.searchVolume);
      const estimatedRevenue = estimatedConversions * DEFAULT_AOV;
      const estimatedCost = estimatedConversions * DEFAULT_CPA;
      const costPerAcquisition = estimatedConversions > 0 ? estimatedCost / estimatedConversions : 0;
      const roi = estimatedCost > 0 ? (estimatedRevenue - estimatedCost) / estimatedCost : 0;

      this.transformedKeywords.push({
        ...kw,
        estimatedConversions,
        estimatedRevenue,
        estimatedCost,
        costPerAcquisition,
        roi
      });
    }

    this.addTrace({
      ruleId: "transform_placeholder_attribution",
      ucrSection: "D",
      reason: `Generated placeholder attribution metrics for ${this.transformedKeywords.length} keywords (AOV: $${DEFAULT_AOV}, CPA: $${DEFAULT_CPA})`,
      severity: "medium",
      evidence: "Conversion rates randomly assigned between 0.5%-3% of monthly search volume"
    });
  }

  protected async correlate(): Promise<void> {
    const demandDef = this.context.config.demand_definition;
    const demandThemes: string[] = [];

    if (demandDef) {
      if (demandDef.brand_keywords?.seed_terms?.length > 0) {
        demandThemes.push(...demandDef.brand_keywords.seed_terms);
      }
      if (demandDef.non_brand_keywords?.category_terms?.length > 0) {
        demandThemes.push(...demandDef.non_brand_keywords.category_terms);
      }
      if (demandDef.non_brand_keywords?.problem_terms?.length > 0) {
        demandThemes.push(...demandDef.non_brand_keywords.problem_terms);
      }
    }

    for (const kw of this.transformedKeywords) {
      const keywordLower = kw.keyword.toLowerCase();
      const matchedDemandThemes: string[] = [];
      let alignmentScore = 0;

      for (const theme of demandThemes) {
        const themeLower = theme.toLowerCase();
        if (keywordLower.includes(themeLower) || themeLower.includes(keywordLower)) {
          matchedDemandThemes.push(theme);
        }
      }

      if (matchedDemandThemes.length > 0) {
        alignmentScore = Math.min(1, matchedDemandThemes.length * 0.4);
      } else {
        const keywordWords = keywordLower.split(/\s+/);
        const themeWords = demandThemes.flatMap(t => t.toLowerCase().split(/\s+/));
        const overlap = keywordWords.filter(w => themeWords.includes(w)).length;
        alignmentScore = Math.min(0.5, overlap * 0.15);
      }

      if (alignmentScore === 0 && demandThemes.length === 0) {
        alignmentScore = 0.3;
      }

      this.correlatedKeywords.push({
        ...kw,
        alignmentScore,
        matchedDemandThemes
      });
    }

    this.addTrace({
      ruleId: "correlate_demand_themes",
      ucrSection: "D",
      reason: `Matched ${this.correlatedKeywords.length} keywords against ${demandThemes.length} UCR demand themes`,
      severity: "low"
    });
  }

  protected async score(): Promise<void> {
    for (const kw of this.correlatedKeywords) {
      const confidence: "low" | "medium" | "high" = "low";
      const roiScore = kw.roi * kw.alignmentScore * 0.3;
      const roiClassification = classifyROI(kw.roi);

      this.scoredKeywords.push({
        ...kw,
        roiScore,
        roiClassification,
        confidence
      });
    }

    this.scoredKeywords.sort((a, b) => b.roiScore - a.roiScore);

    this.addTrace({
      ruleId: "score_roi_opportunities",
      ucrSection: "D",
      reason: `Scored ${this.scoredKeywords.length} keywords by ROI. All scores assigned LOW confidence due to simulated attribution data.`,
      severity: "medium"
    });
  }

  protected async disposition(): Promise<IntelligenceModuleResult> {
    const items: KeywordItemResult[] = [];

    const topKeywords = this.scoredKeywords.slice(0, 100);

    for (const kw of topKeywords) {
      const itemId = `serp_attr_${Buffer.from(kw.keyword).toString("base64").slice(0, 12)}`;

      let status: Disposition;
      if (kw.roiClassification === "high_roi") {
        status = "PASS";
      } else if (kw.roiClassification === "moderate_roi") {
        status = "REVIEW";
      } else {
        status = "OUT_OF_PLAY";
      }

      const trace: ItemTrace[] = [
        {
          ruleId: "roi_classification",
          ucrSection: "D",
          reason: `ROI: ${(kw.roi * 100).toFixed(0)}% (${kw.roiClassification}) | Est. Revenue: $${kw.estimatedRevenue.toLocaleString()}`,
          severity: "low"
        },
        {
          ruleId: "demand_alignment",
          ucrSection: "D",
          reason: `Business alignment score: ${(kw.alignmentScore * 100).toFixed(0)}%`,
          severity: "low"
        },
        {
          ruleId: "simulated_data_warning",
          ucrSection: "D",
          reason: "⚠️ Attribution data is SIMULATED. Actual ROI may differ significantly.",
          severity: "high"
        }
      ];

      const flags: string[] = [kw.roiClassification, "simulated_data"];
      if (kw.matchedDemandThemes.length > 0) {
        flags.push("demand_aligned");
      }

      items.push({
        itemType: "keyword",
        itemId,
        keyword: kw.keyword,
        status,
        capabilityScore: kw.alignmentScore,
        theme: kw.theme || kw.matchedDemandThemes[0] || "",
        reason: `Simulated ROI: ${(kw.roi * 100).toFixed(0)}% | Est. conversions: ${kw.estimatedConversions}`,
        searchVolume: kw.searchVolume,
        competitorCount: kw.competitorCount,
        serpFeatures: kw.serpFeatures,
        confidence: kw.confidence,
        flags,
        trace
      });
    }

    const highROIKeywords = this.scoredKeywords.filter(k => k.roiClassification === "high_roi");
    const moderateROIKeywords = this.scoredKeywords.filter(k => k.roiClassification === "moderate_roi");
    const negativeROIKeywords = this.scoredKeywords.filter(k => k.roiClassification === "negative_roi");

    if (highROIKeywords.length > 0) {
      this.decisions.push({
        decisionId: `decision_high_roi_${Date.now()}`,
        signal: `${highROIKeywords.length} keyword(s) with high simulated ROI (≥200%) identified`,
        confidence: "low",
        source: "serp_attribution",
        evidence: [
          "⚠️ Based on SIMULATED attribution data",
          ...highROIKeywords.slice(0, 3).map(k => `${k.keyword}: ${(k.roi * 100).toFixed(0)}% ROI`)
        ],
        actionType: "act_now",
        ucrAlignment: ["B", "D"]
      });
    }

    if (moderateROIKeywords.length > 0) {
      this.decisions.push({
        decisionId: `decision_moderate_roi_${Date.now()}`,
        signal: `${moderateROIKeywords.length} keyword(s) with moderate simulated ROI (50-200%) worth investigating`,
        confidence: "low",
        source: "serp_attribution",
        evidence: [
          "⚠️ Based on SIMULATED attribution data",
          ...moderateROIKeywords.slice(0, 3).map(k => k.keyword)
        ],
        actionType: "investigate",
        ucrAlignment: ["B", "D"]
      });
    }

    if (negativeROIKeywords.length > 0) {
      this.decisions.push({
        decisionId: `decision_negative_roi_${Date.now()}`,
        signal: `${negativeROIKeywords.length} keyword(s) with negative simulated ROI may need deprioritization`,
        confidence: "low",
        source: "serp_attribution",
        evidence: [
          "⚠️ Based on SIMULATED attribution data - verify with real attribution before deprioritizing",
          ...negativeROIKeywords.slice(0, 3).map(k => k.keyword)
        ],
        actionType: "monitor",
        ucrAlignment: ["D"]
      });
    }

    const available = Object.entries(this.context.dataSources)
      .filter(([_, s]) => s.available)
      .map(([name]) => name);
    const missing = Object.entries(this.context.dataSources)
      .filter(([_, s]) => !s.available)
      .map(([name]) => name);

    const baseSummary = {
      totalSignals: this.decisions.length,
      actionableCount: this.decisions.filter(d => d.actionType === "act_now").length,
      dataSourcesUsed: available,
      dataSourcesMissing: missing,
      partialData: true
    };

    const extendedSummary = {
      ...baseSummary,
      IMPORTANT_NOTICE: "⚠️ ALL ATTRIBUTION DATA IN THIS RUN IS SIMULATED. Connect GA4 or attribution APIs (Northbeam, TripleWhale) for real ROI calculations.",
      simulatedDataUsed: true,
      totalKeywords: this.scoredKeywords.length,
      roiBreakdown: {
        high_roi: highROIKeywords.length,
        moderate_roi: moderateROIKeywords.length,
        low_roi: this.scoredKeywords.filter(k => k.roiClassification === "low_roi").length,
        negative_roi: negativeROIKeywords.length
      },
      placeholderAssumptions: {
        averageOrderValue: DEFAULT_AOV,
        costPerAcquisition: DEFAULT_CPA,
        conversionRateRange: `${CONVERSION_RATE_RANGE.min * 100}%-${CONVERSION_RATE_RANGE.max * 100}%`
      },
      totalEstimatedRevenue: this.scoredKeywords.reduce((sum, k) => sum + k.estimatedRevenue, 0),
      avgROI: this.scoredKeywords.length > 0
        ? this.scoredKeywords.reduce((sum, k) => sum + k.roi, 0) / this.scoredKeywords.length
        : 0
    };

    return {
      decisions: this.decisions,
      items,
      summary: extendedSummary as IntelligenceModuleResult["summary"],
      meta: {
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - this.startTime,
        cacheHits: []
      }
    };
  }
}

export async function analyzeSerpAttribution(
  config: Configuration,
  inputs: Record<string, unknown>
): Promise<ModuleRunResult> {
  const pipeline = new SerpAttributionPipeline(config);
  return pipeline.execute(inputs);
}
