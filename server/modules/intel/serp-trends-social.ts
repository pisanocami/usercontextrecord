import type { Configuration } from "@shared/schema";
import type { ModuleRunResult, EntityItemResult, ItemTrace } from "@shared/module.contract";
import type { IntelligenceModuleResult, DecisionObject } from "./types";
import { BaseIntelligencePipeline } from "./base-pipeline";
import { MarketDemandAnalyzer } from "../../market-demand-analyzer";

type TrendClassification = "accelerating" | "stable" | "decelerating" | "emerging";

interface ExtractedTrendData {
  categoryName: string;
  queries: string[];
  series: Array<{ date: string; value: number }>;
  peakMonth?: string;
  lowMonth?: string;
  heatmap?: Record<string, number>;
}

interface TransformedTrend {
  categoryName: string;
  queries: string[];
  recentAvg: number;
  historicalAvg: number;
  momentum: number;
  classification: TrendClassification;
  peakMonth?: string;
  lowMonth?: string;
  socialSentiment: "positive" | "neutral" | "negative";
  socialMentions: number;
}

interface CorrelatedTrend extends TransformedTrend {
  alignmentScore: number;
  matchedPriorities: string[];
}

interface ScoredTrend extends CorrelatedTrend {
  signalStrength: number;
  confidence: "low" | "medium" | "high";
}

class SerpTrendsSocialPipeline extends BaseIntelligencePipeline {
  private extractedTrends: ExtractedTrendData[] = [];
  private transformedTrends: TransformedTrend[] = [];
  private correlatedTrends: CorrelatedTrend[] = [];
  private scoredTrends: ScoredTrend[] = [];
  private decisions: DecisionObject[] = [];
  private marketDemandAnalyzer: MarketDemandAnalyzer;

  constructor(config: Configuration) {
    super("intel.serp_trends_social.v1", config);
    this.marketDemandAnalyzer = new MarketDemandAnalyzer();
  }

  protected async extract(inputs: Record<string, unknown>): Promise<void> {
    this.markSectionUsed("B");

    const categoryDef = this.context.config.category_definition;
    const categoryTerms: string[] = [];

    if (categoryDef?.primary_category) {
      categoryTerms.push(categoryDef.primary_category);
    }
    if (categoryDef?.approved_categories?.length) {
      categoryTerms.push(...categoryDef.approved_categories);
    }
    if (categoryDef?.included?.length) {
      categoryTerms.push(...categoryDef.included);
    }

    if (categoryTerms.length === 0) {
      this.addWarning("NO_CATEGORY_TERMS", "No category terms found in configuration");
      this.markDataSource("DataForSEO", { 
        available: false, 
        error: "No category terms to analyze", 
        lastChecked: new Date() 
      });
      return;
    }

    this.addTrace({
      ruleId: "extract_category_terms",
      ucrSection: "B",
      reason: `Found ${categoryTerms.length} category terms to analyze`,
      severity: "low"
    });

    try {
      const trendsResult = await this.marketDemandAnalyzer.analyzeByCategory(
        this.context.config,
        {
          timeRange: "today 5-y",
          interval: "weekly"
        }
      );

      this.markDataSource("DataForSEO", { available: true, lastChecked: new Date() });

      for (const slice of trendsResult.byCategory) {
        this.extractedTrends.push({
          categoryName: slice.categoryName,
          queries: slice.queries,
          series: slice.series,
          peakMonth: slice.peakMonth ?? undefined,
          lowMonth: slice.lowMonth ?? undefined,
          heatmap: slice.heatmap
        });
      }

      this.addTrace({
        ruleId: "extract_trends_data",
        ucrSection: "B",
        reason: `Extracted trends data for ${this.extractedTrends.length} categories`,
        severity: "low"
      });
    } catch (error) {
      this.markDataSource("DataForSEO", { 
        available: false, 
        error: String(error), 
        lastChecked: new Date() 
      });
      this.addWarning("TRENDS_FETCH_ERROR", `Failed to fetch trends data: ${error}`);

      for (const term of categoryTerms) {
        this.extractedTrends.push({
          categoryName: term,
          queries: [term],
          series: []
        });
      }
    }

    this.markDataSource("Brandwatch", { 
      available: false, 
      error: "Brandwatch API integration not yet available", 
      lastChecked: new Date() 
    });
    this.addWarning("SOCIAL_DATA_UNAVAILABLE", "Brandwatch social signals are currently stubbed. Social sentiment and mentions are placeholders.");
  }

  protected async transform(): Promise<void> {
    for (const trend of this.extractedTrends) {
      const { recentAvg, historicalAvg, momentum } = this.calculateMomentum(trend.series);
      const classification = this.classifyTrend(momentum, trend.series.length);

      this.transformedTrends.push({
        categoryName: trend.categoryName,
        queries: trend.queries,
        recentAvg,
        historicalAvg,
        momentum,
        classification,
        peakMonth: trend.peakMonth,
        lowMonth: trend.lowMonth,
        socialSentiment: "neutral",
        socialMentions: 0
      });
    }

    this.addTrace({
      ruleId: "transform_trend_momentum",
      ucrSection: "B",
      reason: `Calculated momentum for ${this.transformedTrends.length} trends`,
      severity: "low"
    });
  }

  private calculateMomentum(series: Array<{ date: string; value: number }>): {
    recentAvg: number;
    historicalAvg: number;
    momentum: number;
  } {
    if (series.length === 0) {
      return { recentAvg: 0, historicalAvg: 0, momentum: 0 };
    }

    const sortedSeries = [...series].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const recentCount = Math.max(1, Math.floor(sortedSeries.length * 0.2));
    const historicalCount = Math.max(1, Math.floor(sortedSeries.length * 0.5));

    const recentSlice = sortedSeries.slice(-recentCount);
    const historicalSlice = sortedSeries.slice(0, historicalCount);

    const recentAvg = recentSlice.reduce((sum, p) => sum + p.value, 0) / recentSlice.length;
    const historicalAvg = historicalSlice.reduce((sum, p) => sum + p.value, 0) / historicalSlice.length;

    const momentum = historicalAvg > 0 ? (recentAvg - historicalAvg) / historicalAvg : 0;

    return { recentAvg, historicalAvg, momentum };
  }

  private classifyTrend(momentum: number, dataPoints: number): TrendClassification {
    if (dataPoints < 12) {
      return "emerging";
    }
    if (momentum > 0.2) {
      return "accelerating";
    }
    if (momentum < -0.2) {
      return "decelerating";
    }
    return "stable";
  }

  protected async correlate(): Promise<void> {
    this.markSectionUsed("E");

    const strategicIntent = this.context.config.strategic_intent;
    const priorities: string[] = [];

    if (strategicIntent?.primary_goal) {
      priorities.push(strategicIntent.primary_goal.toLowerCase());
    }
    if (strategicIntent?.secondary_goals?.length) {
      priorities.push(...strategicIntent.secondary_goals.map((g: string) => g.toLowerCase()));
    }
    if (strategicIntent?.growth_priority) {
      priorities.push(strategicIntent.growth_priority.toLowerCase());
    }

    for (const trend of this.transformedTrends) {
      const categoryLower = trend.categoryName.toLowerCase();
      const queryWords = trend.queries.flatMap(q => q.toLowerCase().split(/\s+/));
      
      const matchedPriorities: string[] = [];
      let alignmentScore = 0;

      for (const priority of priorities) {
        const priorityWords = priority.split(/\s+/);
        const hasMatch = priorityWords.some(pw => 
          categoryLower.includes(pw) || queryWords.includes(pw)
        );
        if (hasMatch) {
          matchedPriorities.push(priority);
        }
      }

      if (matchedPriorities.length > 0) {
        alignmentScore = Math.min(1, matchedPriorities.length * 0.3);
      }

      if (trend.classification === "accelerating") {
        alignmentScore = Math.min(1, alignmentScore + 0.2);
      }

      this.correlatedTrends.push({
        ...trend,
        alignmentScore,
        matchedPriorities
      });
    }

    this.addTrace({
      ruleId: "correlate_strategic_intent",
      ucrSection: "E",
      reason: `Correlated ${this.correlatedTrends.length} trends with strategic priorities`,
      severity: "low"
    });
  }

  protected async score(): Promise<void> {
    const dataForSEOAvailable = this.context.dataSources["DataForSEO"]?.available ?? false;

    for (const trend of this.correlatedTrends) {
      const volumeWeight = Math.log10(Math.max(1, trend.recentAvg)) / 2;
      const momentumFactor = Math.abs(trend.momentum) + 1;
      
      const signalStrength = momentumFactor * trend.alignmentScore * volumeWeight;

      let confidence: "low" | "medium" | "high";
      if (!dataForSEOAvailable) {
        confidence = "low";
      } else if (signalStrength > 1.5 && trend.alignmentScore > 0.5) {
        confidence = "high";
      } else if (signalStrength > 0.5 || trend.alignmentScore > 0.3) {
        confidence = "medium";
      } else {
        confidence = "low";
      }

      this.scoredTrends.push({
        ...trend,
        signalStrength,
        confidence
      });
    }

    this.scoredTrends.sort((a, b) => b.signalStrength - a.signalStrength);

    this.addTrace({
      ruleId: "score_signal_strength",
      ucrSection: "E",
      reason: `Scored ${this.scoredTrends.length} trend signals`,
      severity: "low"
    });
  }

  protected async disposition(): Promise<IntelligenceModuleResult> {
    const items: EntityItemResult[] = [];

    const topTrends = this.scoredTrends.slice(0, 30);

    for (const trend of topTrends) {
      const itemId = `trend_${Buffer.from(trend.categoryName).toString("base64").slice(0, 12)}`;

      const trace: ItemTrace[] = [
        {
          ruleId: "trend_classification",
          ucrSection: "B",
          reason: `Classified as ${trend.classification} (momentum: ${(trend.momentum * 100).toFixed(1)}%)`,
          severity: "low"
        }
      ];

      if (trend.matchedPriorities.length > 0) {
        trace.push({
          ruleId: "strategic_alignment",
          ucrSection: "E",
          reason: `Aligns with: ${trend.matchedPriorities.join(", ")}`,
          severity: "low"
        });
      }

      items.push({
        itemType: "entity",
        itemId,
        title: trend.categoryName,
        entityName: trend.categoryName,
        entityType: "trend_signal",
        mentions: Math.round(trend.recentAvg),
        sentiment: trend.socialSentiment,
        confidence: trend.confidence,
        flags: [trend.classification],
        trace
      });
    }

    const acceleratingTrends = topTrends.filter(t => t.classification === "accelerating");
    const emergingTrends = topTrends.filter(t => t.classification === "emerging");
    const deceleratingTrends = topTrends.filter(t => t.classification === "decelerating");

    if (acceleratingTrends.length > 0) {
      const strongAccelerating = acceleratingTrends.filter(t => t.signalStrength > 1);
      if (strongAccelerating.length > 0) {
        this.decisions.push({
          decisionId: `decision_accelerating_${Date.now()}`,
          signal: `${strongAccelerating.length} accelerating trend(s) with strong signal strength`,
          confidence: "high",
          source: "serp_trends_social",
          evidence: strongAccelerating.slice(0, 3).map(t => t.categoryName),
          actionType: "investigate",
          ucrAlignment: ["B", "E"]
        });
      } else {
        this.decisions.push({
          decisionId: `decision_accelerating_monitor_${Date.now()}`,
          signal: `${acceleratingTrends.length} accelerating trend(s) detected`,
          confidence: "medium",
          source: "serp_trends_social",
          evidence: acceleratingTrends.slice(0, 3).map(t => t.categoryName),
          actionType: "monitor",
          ucrAlignment: ["B", "E"]
        });
      }
    }

    if (emergingTrends.length > 0) {
      this.decisions.push({
        decisionId: `decision_emerging_${Date.now()}`,
        signal: `${emergingTrends.length} emerging trend(s) with limited historical data`,
        confidence: "low",
        source: "serp_trends_social",
        evidence: emergingTrends.slice(0, 3).map(t => t.categoryName),
        actionType: "monitor",
        ucrAlignment: ["B"]
      });
    }

    if (deceleratingTrends.length > 0 && deceleratingTrends.some(t => t.alignmentScore > 0.3)) {
      this.decisions.push({
        decisionId: `decision_decelerating_${Date.now()}`,
        signal: `${deceleratingTrends.length} strategic trend(s) showing deceleration`,
        confidence: "medium",
        source: "serp_trends_social",
        evidence: deceleratingTrends.filter(t => t.alignmentScore > 0.3).slice(0, 3).map(t => t.categoryName),
        actionType: "monitor",
        ucrAlignment: ["B", "E"]
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
      actionableCount: this.decisions.filter(d => d.actionType === "investigate").length,
      dataSourcesUsed: available,
      dataSourcesMissing: missing,
      partialData: missing.length > 0
    };

    const extendedSummary = {
      ...baseSummary,
      totalTrends: this.scoredTrends.length,
      classificationBreakdown: {
        accelerating: acceleratingTrends.length,
        stable: topTrends.filter(t => t.classification === "stable").length,
        decelerating: deceleratingTrends.length,
        emerging: emergingTrends.length
      },
      socialDataNote: "Brandwatch integration pending - social signals are placeholder values"
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

export async function analyzeSerpTrendsSocial(
  config: Configuration,
  inputs: Record<string, unknown>
): Promise<ModuleRunResult> {
  const pipeline = new SerpTrendsSocialPipeline(config);
  return pipeline.execute(inputs);
}
