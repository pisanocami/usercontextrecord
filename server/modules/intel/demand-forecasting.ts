import type { Configuration, TrendsDataPoint } from "@shared/schema";
import type { ModuleRunResult, ClusterItemResult, ItemTrace, TimingClassification, YoYConsistency } from "@shared/module.contract";
import type { IntelligenceModuleResult, DecisionObject } from "./types";
import { BaseIntelligencePipeline } from "./base-pipeline";
import { MarketDemandAnalyzer } from "../../market-demand-analyzer";

type TrendClassification = "strong_growth" | "moderate_growth" | "stable" | "declining";

interface ExtractedCategoryData {
  categoryName: string;
  queries: string[];
  series: Array<{ date: string; value: number }>;
  peakMonth?: string;
  lowMonth?: string;
  heatmap?: Record<string, number>;
}

interface TransformedForecast {
  categoryName: string;
  queries: string[];
  series: Array<{ date: string; value: number }>;
  slope: number;
  cagr: number | null;
  peakMonths: string[];
  lowMonths: string[];
  seasonalityFit: number;
  variance: number;
  dataCoverage: number;
  monthlyPattern: number[];
}

interface CorrelatedForecast extends TransformedForecast {
  ucrCategories: string[];
  horizonMonths: number;
  alignedWithTimeline: boolean;
  recommendedLaunchISO: string | null;
  peakWindow: string[];
}

interface ScoredForecast extends CorrelatedForecast {
  confidence: "low" | "medium" | "high";
  growthPotential: number;
  trendClassification: TrendClassification;
  timingClassification: TimingClassification;
  yoyConsistency: YoYConsistency;
  stabilityScore: number;
}

function calculateLinearRegressionSlope(data: { date: string; value: number }[]): number {
  if (data.length < 2) return 0;
  
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  
  data.forEach((point, i) => {
    const x = i;
    const y = point.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  
  return (n * sumXY - sumX * sumY) / denominator;
}

function calculateCAGR(startValue: number, endValue: number, years: number): number | null {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return null;
  if (years < 1) return null;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

function aggregateToMonthly(series: Array<{ date: string; value: number }>): Array<{ date: string; value: number }> {
  const monthlyMap = new Map<string, number[]>();
  
  for (const point of series) {
    const dateKey = point.date.substring(0, 7);
    const values = monthlyMap.get(dateKey) || [];
    values.push(point.value);
    monthlyMap.set(dateKey, values);
  }
  
  const result: Array<{ date: string; value: number }> = [];
  const sortedKeys = Array.from(monthlyMap.keys()).sort();
  
  for (const key of sortedKeys) {
    const values = monthlyMap.get(key)!;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    result.push({ date: `${key}-01`, value: Math.round(avg) });
  }
  
  return result;
}

function calculateVariance(data: Array<{ date: string; value: number }>): number {
  if (data.length < 2) return 0;
  
  const mean = data.reduce((sum, p) => sum + p.value, 0) / data.length;
  const squaredDiffs = data.map(p => Math.pow(p.value - mean, 2));
  return squaredDiffs.reduce((sum, d) => sum + d, 0) / data.length;
}

function findPeakAndLowMonths(series: Array<{ date: string; value: number }>): { peakMonths: string[]; lowMonths: string[]; monthlyPattern: number[] } {
  const monthlyAvg = new Map<number, number[]>();
  
  for (const point of series) {
    const month = new Date(point.date).getMonth();
    const values = monthlyAvg.get(month) || [];
    values.push(point.value);
    monthlyAvg.set(month, values);
  }
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const avgByMonth: { month: string; avg: number; idx: number }[] = [];
  const monthlyPattern: number[] = new Array(12).fill(0);
  
  monthlyAvg.forEach((values, monthIdx) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    avgByMonth.push({ month: monthNames[monthIdx], avg, idx: monthIdx });
    monthlyPattern[monthIdx] = Math.round(avg);
  });
  
  avgByMonth.sort((a, b) => b.avg - a.avg);
  
  const peakMonths = avgByMonth.slice(0, 3).map(m => m.month);
  const lowMonths = avgByMonth.slice(-3).map(m => m.month);
  
  return { peakMonths, lowMonths, monthlyPattern };
}

function calculateSeasonalityFit(monthlyPattern: number[]): number {
  if (monthlyPattern.length < 12) return 0;
  
  const validValues = monthlyPattern.filter(v => v > 0);
  if (validValues.length < 6) return 0;
  
  const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length;
  const maxDev = Math.max(...validValues.map(v => Math.abs(v - mean)));
  
  const seasonalityStrength = mean > 0 ? maxDev / mean : 0;
  return Math.min(1, seasonalityStrength);
}

function calculateYoYGrowth(series: Array<{ date: string; value: number }>): { cagr: number | null; consistency: YoYConsistency } {
  if (series.length < 24) {
    return { cagr: null, consistency: "erratic" };
  }
  
  const yearlyAverages: number[] = [];
  const yearsMap = new Map<number, number[]>();
  
  for (const point of series) {
    const year = new Date(point.date).getFullYear();
    const values = yearsMap.get(year) || [];
    values.push(point.value);
    yearsMap.set(year, values);
  }
  
  const sortedYears = Array.from(yearsMap.keys()).sort();
  for (const year of sortedYears) {
    const values = yearsMap.get(year)!;
    if (values.length >= 6) {
      yearlyAverages.push(values.reduce((a, b) => a + b, 0) / values.length);
    }
  }
  
  if (yearlyAverages.length < 2) {
    return { cagr: null, consistency: "erratic" };
  }
  
  const cagr = calculateCAGR(yearlyAverages[0], yearlyAverages[yearlyAverages.length - 1], yearlyAverages.length - 1);
  
  const yoyChanges: number[] = [];
  for (let i = 1; i < yearlyAverages.length; i++) {
    const change = yearlyAverages[i - 1] > 0 
      ? (yearlyAverages[i] - yearlyAverages[i - 1]) / yearlyAverages[i - 1]
      : 0;
    yoyChanges.push(change);
  }
  
  const changeVariance = yoyChanges.length > 1
    ? yoyChanges.reduce((sum, c) => sum + Math.pow(c - (yoyChanges.reduce((a, b) => a + b, 0) / yoyChanges.length), 2), 0) / yoyChanges.length
    : 0;
  
  let consistency: YoYConsistency;
  if (changeVariance < 0.01) {
    consistency = "stable";
  } else if (changeVariance < 0.05) {
    consistency = "shifting";
  } else {
    consistency = "erratic";
  }
  
  return { cagr, consistency };
}

function classifyTrend(slope: number, cagr: number | null): TrendClassification {
  const cagrSignal = cagr !== null ? cagr * 100 : 0;
  const avgSignal = (cagrSignal + slope) / 2;
  
  if (avgSignal > 5) return "strong_growth";
  if (avgSignal > 2) return "moderate_growth";
  if (avgSignal >= -2) return "stable";
  return "declining";
}

function classifyTiming(peakMonths: string[], seasonalityFit: number): TimingClassification {
  if (seasonalityFit < 0.1) return "flat_timing_neutral";
  if (seasonalityFit > 0.5) return "peak_driven";
  if (peakMonths.includes("Jan") || peakMonths.includes("Feb") || peakMonths.includes("Mar")) {
    return "early_ramp_dominant";
  }
  return "peak_driven";
}

function calculateRecommendedLaunchISO(peakMonths: string[], horizonMonths: number): string | null {
  if (peakMonths.length === 0) return null;
  
  const monthMap: Record<string, number> = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
  };
  
  const peakMonth = monthMap[peakMonths[0]] || 1;
  let launchMonth = peakMonth - 2;
  if (launchMonth <= 0) launchMonth += 12;
  
  const now = new Date();
  let launchYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (launchMonth <= currentMonth) {
    launchYear += 1;
  }
  
  const clampedYear = Math.min(launchYear, now.getFullYear() + Math.floor(horizonMonths / 12));
  
  return `${clampedYear}-${String(launchMonth).padStart(2, "0")}-01`;
}

class DemandForecastingPipeline extends BaseIntelligencePipeline {
  private extractedData: ExtractedCategoryData[] = [];
  private transformedForecasts: TransformedForecast[] = [];
  private correlatedForecasts: CorrelatedForecast[] = [];
  private scoredForecasts: ScoredForecast[] = [];
  private decisions: DecisionObject[] = [];
  private marketDemandAnalyzer: MarketDemandAnalyzer;

  constructor(config: Configuration) {
    super("intel.demand_forecasting.v1", config);
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
      reason: `Found ${categoryTerms.length} category terms for demand forecasting`,
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
        this.extractedData.push({
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
        reason: `Extracted 5-year trends data for ${this.extractedData.length} categories`,
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
        this.extractedData.push({
          categoryName: term,
          queries: [term],
          series: []
        });
      }
    }
  }

  protected async transform(): Promise<void> {
    for (const data of this.extractedData) {
      if (data.series.length === 0) {
        this.transformedForecasts.push({
          categoryName: data.categoryName,
          queries: data.queries,
          series: [],
          slope: 0,
          cagr: null,
          peakMonths: [],
          lowMonths: [],
          seasonalityFit: 0,
          variance: 0,
          dataCoverage: 0,
          monthlyPattern: []
        });
        continue;
      }

      const monthlySeries = aggregateToMonthly(data.series);
      const slope = calculateLinearRegressionSlope(monthlySeries);
      const normalizedSlope = Math.round(slope * 100) / 100;
      
      const { peakMonths, lowMonths, monthlyPattern } = findPeakAndLowMonths(monthlySeries);
      const seasonalityFit = calculateSeasonalityFit(monthlyPattern);
      const variance = calculateVariance(monthlySeries);
      
      const yearsOfData = monthlySeries.length / 12;
      const dataCoverage = Math.min(1, yearsOfData / 5);
      
      const { cagr } = calculateYoYGrowth(monthlySeries);

      this.transformedForecasts.push({
        categoryName: data.categoryName,
        queries: data.queries,
        series: monthlySeries,
        slope: normalizedSlope,
        cagr,
        peakMonths,
        lowMonths,
        seasonalityFit,
        variance,
        dataCoverage,
        monthlyPattern
      });
    }

    this.addTrace({
      ruleId: "transform_linear_regression",
      ucrSection: "B",
      reason: `Calculated linear regression slopes and seasonality for ${this.transformedForecasts.length} categories`,
      severity: "low"
    });
  }

  protected async correlate(): Promise<void> {
    this.markSectionUsed("E");

    const strategicIntent = this.context.config.strategic_intent;
    const timeHorizon = strategicIntent?.time_horizon || "medium";
    const horizonMonths = timeHorizon === "short" ? 3 : timeHorizon === "long" ? 24 : 12;

    const ucrCategories: string[] = [];
    const categoryDef = this.context.config.category_definition;
    
    if (categoryDef?.primary_category) {
      ucrCategories.push(categoryDef.primary_category);
    }
    if (categoryDef?.approved_categories?.length) {
      ucrCategories.push(...categoryDef.approved_categories);
    }

    for (const forecast of this.transformedForecasts) {
      const matchedCategories = ucrCategories.filter(cat => 
        cat.toLowerCase().includes(forecast.categoryName.toLowerCase()) ||
        forecast.categoryName.toLowerCase().includes(cat.toLowerCase())
      );

      const recommendedLaunchISO = calculateRecommendedLaunchISO(forecast.peakMonths, horizonMonths);
      
      const alignedWithTimeline = forecast.peakMonths.length > 0 && recommendedLaunchISO !== null;

      this.correlatedForecasts.push({
        ...forecast,
        ucrCategories: matchedCategories.length > 0 ? matchedCategories : [forecast.categoryName],
        horizonMonths,
        alignedWithTimeline,
        recommendedLaunchISO,
        peakWindow: forecast.peakMonths.slice(0, 2)
      });
    }

    this.addTrace({
      ruleId: "correlate_ucr_categories",
      ucrSection: "E",
      reason: `Mapped ${this.correlatedForecasts.length} forecasts to UCR categories with ${horizonMonths}-month horizon`,
      severity: "low"
    });
  }

  protected async score(): Promise<void> {
    const dataForSEOAvailable = this.context.dataSources["DataForSEO"]?.available ?? false;

    for (const forecast of this.correlatedForecasts) {
      const stabilityScore = forecast.variance > 0 
        ? Math.max(0, 1 - Math.min(1, Math.sqrt(forecast.variance) / 50))
        : 1;

      let confidence: "low" | "medium" | "high";
      if (!dataForSEOAvailable || forecast.dataCoverage < 0.3) {
        confidence = "low";
      } else if (forecast.dataCoverage >= 0.8 && stabilityScore >= 0.6) {
        confidence = "high";
      } else if (forecast.dataCoverage >= 0.5 || stabilityScore >= 0.4) {
        confidence = "medium";
      } else {
        confidence = "low";
      }

      const cagrFactor = forecast.cagr !== null ? Math.max(0, 1 + forecast.cagr) : 0.5;
      const growthPotential = cagrFactor * forecast.seasonalityFit * forecast.dataCoverage;

      const trendClassification = classifyTrend(forecast.slope, forecast.cagr);
      const timingClassification = classifyTiming(forecast.peakMonths, forecast.seasonalityFit);
      const { consistency: yoyConsistency } = calculateYoYGrowth(forecast.series);

      this.scoredForecasts.push({
        ...forecast,
        confidence,
        growthPotential,
        trendClassification,
        timingClassification,
        yoyConsistency,
        stabilityScore
      });
    }

    this.scoredForecasts.sort((a, b) => b.growthPotential - a.growthPotential);

    this.addTrace({
      ruleId: "score_growth_potential",
      ucrSection: "E",
      reason: `Scored ${this.scoredForecasts.length} forecasts by growth potential (CAGR × seasonality × coverage)`,
      severity: "low"
    });
  }

  protected async disposition(): Promise<IntelligenceModuleResult> {
    const items: ClusterItemResult[] = [];
    const geo = this.context.config.brand?.primary_geography?.[0] || "US";

    for (const forecast of this.scoredForecasts) {
      const itemId = `forecast_${Buffer.from(forecast.categoryName).toString("base64").slice(0, 12)}`;

      const trace: ItemTrace[] = [
        {
          ruleId: "trend_classification",
          ucrSection: "B",
          reason: `Trend: ${forecast.trendClassification} (slope: ${forecast.slope}, CAGR: ${forecast.cagr !== null ? (forecast.cagr * 100).toFixed(1) + "%" : "N/A"})`,
          severity: "low"
        },
        {
          ruleId: "seasonality_analysis",
          ucrSection: "B",
          reason: `Seasonality fit: ${(forecast.seasonalityFit * 100).toFixed(0)}%, Peak months: ${forecast.peakMonths.join(", ") || "None"}`,
          severity: "low"
        }
      ];

      if (forecast.alignedWithTimeline) {
        trace.push({
          ruleId: "strategic_alignment",
          ucrSection: "E",
          reason: `Aligned with ${forecast.horizonMonths}-month strategic horizon`,
          severity: "low"
        });
      }

      items.push({
        itemType: "cluster",
        itemId,
        title: forecast.categoryName,
        themeName: forecast.categoryName,
        geo,
        timeRange: "5y",
        interval: "monthly",
        peakMonth: forecast.peakMonths[0],
        lowMonth: forecast.lowMonths[0],
        stabilityScore: Math.round(forecast.stabilityScore * 100) / 100,
        yoyConsistency: forecast.yoyConsistency,
        timingClassification: forecast.timingClassification,
        monthlyPattern: forecast.monthlyPattern,
        queries: forecast.queries,
        peakWindow: forecast.peakWindow,
        recommendedLaunchByISO: forecast.recommendedLaunchISO,
        recommendationRationale: this.buildRecommendationRationale(forecast),
        variance: Math.round(forecast.variance * 100) / 100,
        confidence: forecast.confidence,
        flags: [forecast.trendClassification],
        trace,
        providerMetadata: {
          provider: "DataForSEO",
          cached: false
        }
      });
    }

    const strongGrowthForecasts = this.scoredForecasts.filter(f => f.trendClassification === "strong_growth");
    const moderateGrowthForecasts = this.scoredForecasts.filter(f => f.trendClassification === "moderate_growth");
    const decliningForecasts = this.scoredForecasts.filter(f => f.trendClassification === "declining");

    if (strongGrowthForecasts.length > 0) {
      this.decisions.push({
        decisionId: `decision_strong_growth_${Date.now()}`,
        signal: `${strongGrowthForecasts.length} category(ies) showing strong growth potential`,
        confidence: "high",
        source: "demand_forecasting",
        evidence: strongGrowthForecasts.slice(0, 3).map(f => 
          `${f.categoryName}: ${f.cagr !== null ? (f.cagr * 100).toFixed(1) : "N/A"}% CAGR`
        ),
        actionType: "act_now",
        ucrAlignment: ["B", "E"]
      });
    }

    if (moderateGrowthForecasts.length > 0) {
      this.decisions.push({
        decisionId: `decision_moderate_growth_${Date.now()}`,
        signal: `${moderateGrowthForecasts.length} category(ies) showing moderate growth`,
        confidence: "medium",
        source: "demand_forecasting",
        evidence: moderateGrowthForecasts.slice(0, 3).map(f => f.categoryName),
        actionType: "investigate",
        ucrAlignment: ["B", "E"]
      });
    }

    if (decliningForecasts.length > 0) {
      this.decisions.push({
        decisionId: `decision_declining_${Date.now()}`,
        signal: `${decliningForecasts.length} category(ies) showing declining demand`,
        confidence: "medium",
        source: "demand_forecasting",
        evidence: decliningForecasts.slice(0, 3).map(f => f.categoryName),
        actionType: "monitor",
        ucrAlignment: ["B"]
      });
    }

    const highSeasonalityForecasts = this.scoredForecasts.filter(f => f.seasonalityFit > 0.3);
    if (highSeasonalityForecasts.length > 0) {
      this.decisions.push({
        decisionId: `decision_seasonality_${Date.now()}`,
        signal: `${highSeasonalityForecasts.length} category(ies) with significant seasonality patterns`,
        confidence: highSeasonalityForecasts.some(f => f.confidence === "high") ? "high" : "medium",
        source: "demand_forecasting",
        evidence: highSeasonalityForecasts.slice(0, 3).map(f => 
          `${f.categoryName}: Peak in ${f.peakMonths[0] || "N/A"}`
        ),
        actionType: "investigate",
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
      actionableCount: this.decisions.filter(d => d.actionType === "act_now" || d.actionType === "investigate").length,
      dataSourcesUsed: available,
      dataSourcesMissing: missing,
      partialData: missing.length > 0
    };

    const extendedSummary = {
      ...baseSummary,
      totalForecasts: this.scoredForecasts.length,
      trendBreakdown: {
        strong_growth: strongGrowthForecasts.length,
        moderate_growth: moderateGrowthForecasts.length,
        stable: this.scoredForecasts.filter(f => f.trendClassification === "stable").length,
        declining: decliningForecasts.length
      },
      avgDataCoverage: this.scoredForecasts.length > 0
        ? this.scoredForecasts.reduce((sum, f) => sum + f.dataCoverage, 0) / this.scoredForecasts.length
        : 0,
      avgSeasonalityFit: this.scoredForecasts.length > 0
        ? this.scoredForecasts.reduce((sum, f) => sum + f.seasonalityFit, 0) / this.scoredForecasts.length
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

  private buildRecommendationRationale(forecast: ScoredForecast): string {
    const parts: string[] = [];

    if (forecast.trendClassification === "strong_growth") {
      parts.push("Strong growth trajectory detected");
    } else if (forecast.trendClassification === "moderate_growth") {
      parts.push("Moderate growth potential");
    } else if (forecast.trendClassification === "declining") {
      parts.push("Declining demand - consider repositioning");
    } else {
      parts.push("Stable demand pattern");
    }

    if (forecast.peakMonths.length > 0) {
      parts.push(`Peak demand in ${forecast.peakMonths.slice(0, 2).join(" and ")}`);
    }

    if (forecast.recommendedLaunchISO) {
      parts.push(`Recommended launch by ${forecast.recommendedLaunchISO}`);
    }

    if (forecast.cagr !== null) {
      parts.push(`${(forecast.cagr * 100).toFixed(1)}% CAGR over available period`);
    }

    return parts.join(". ") + ".";
  }
}

export async function analyzeDemandForecasting(
  config: Configuration,
  inputs: Record<string, unknown>
): Promise<ModuleRunResult> {
  const pipeline = new DemandForecastingPipeline(config);
  return pipeline.execute(inputs);
}
