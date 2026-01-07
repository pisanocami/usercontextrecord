import { getDefaultTrendsProvider } from "./providers/trends-index";
import type { TrendsDataProvider } from "./trends-data-provider";
import type {
  TrendsResponse,
  TrendsDataPoint,
  SeasonalityPattern,
  TimingRecommendation,
  YoYAnalysis,
  DemandCurve,
  MarketDemandResult,
  MarketDemandAnalysisParams,
  Configuration,
} from "@shared/schema";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export class MarketDemandAnalyzer {
  private provider: TrendsDataProvider;

  constructor(provider?: TrendsDataProvider) {
    this.provider = provider || getDefaultTrendsProvider();
  }

  async analyze(
    config: Configuration,
    params: Partial<MarketDemandAnalysisParams> = {}
  ): Promise<MarketDemandResult> {
    const queryGroups = params.queryGroups || this.extractQueryGroups(config);
    const countryCode = params.countryCode || this.extractCountryCode(config);
    const timeRange = params.timeRange || "today 5-y";
    const interval = params.interval || "weekly";
    const forecastEnabled = params.forecastEnabled || false;

    if (queryGroups.length === 0) {
      throw new Error("No query groups available for analysis. Please define category terms in the configuration.");
    }

    const filteredQueries = this.applyNegativeScope(queryGroups, config);

    console.log(`[MarketDemandAnalyzer] Analyzing ${filteredQueries.length} queries for ${countryCode}`);

    const trendsData = await this.fetchTrendsData(filteredQueries, countryCode, timeRange, interval);

    const aggregatedData = this.aggregateTrendsData(trendsData);

    const seasonality = this.detectSeasonality(aggregatedData);

    const yoyAnalysis = this.analyzeYoYConsistency(aggregatedData);

    const timingRecommendation = this.generateTimingRecommendation(seasonality, yoyAnalysis, config);

    const demandCurves: DemandCurve[] = trendsData.map((trend) => ({
      query: trend.query,
      data: trend.data,
      forecast: forecastEnabled ? this.generateForecast(trend.data, 12) : undefined,
    }));

    const executiveSummary = this.generateExecutiveSummary(seasonality, timingRecommendation, yoyAnalysis);

    const trace = this.buildTrace(config, filteredQueries);

    return {
      configurationId: parseInt(config.id, 10) || 0,
      contextVersion: config.governance?.context_version || 1,
      demandCurves,
      seasonality,
      timingRecommendation,
      yoyAnalysis,
      executiveSummary,
      trace,
      metadata: {
        fetchedAt: new Date().toISOString(),
        cached: false,
        dataSource: this.provider.displayName,
      },
    };
  }

  private extractQueryGroups(config: Configuration): string[] {
    const queries: string[] = [];

    if (config.category_definition?.primary_category) {
      queries.push(config.category_definition.primary_category);
    }

    if (config.category_definition?.included?.length) {
      queries.push(...config.category_definition.included.slice(0, 4));
    }

    if (config.demand_definition?.non_brand_keywords?.category_terms?.length) {
      queries.push(...config.demand_definition.non_brand_keywords.category_terms.slice(0, 3));
    }

    return Array.from(new Set(queries)).slice(0, 5);
  }

  private extractCountryCode(config: Configuration): string {
    const geo = config.brand?.primary_geography;
    if (Array.isArray(geo) && geo.length > 0) {
      const firstGeo = geo[0];
      if (typeof firstGeo === "string" && firstGeo.length === 2) {
        return firstGeo.toUpperCase();
      }
    }
    return "US";
  }

  private applyNegativeScope(queries: string[], config: Configuration): string[] {
    const excludedKeywords = config.negative_scope?.excluded_keywords || [];
    const excludedCategories = config.negative_scope?.excluded_categories || [];
    const allExcluded = [...excludedKeywords, ...excludedCategories].map((e) => e.toLowerCase());

    return queries.filter((q) => {
      const qLower = q.toLowerCase();
      return !allExcluded.some((ex) => qLower.includes(ex) || ex.includes(qLower));
    });
  }

  private async fetchTrendsData(
    queries: string[],
    country: string,
    timeRange: string,
    interval: "daily" | "weekly" | "monthly"
  ): Promise<TrendsResponse[]> {
    return this.provider.compareQueries(queries, { country, timeRange, interval });
  }

  private aggregateTrendsData(trends: TrendsResponse[]): TrendsDataPoint[] {
    if (trends.length === 0) return [];

    const validTrends = trends.filter((t) => t.data && t.data.length > 0);
    if (validTrends.length === 0) return [];

    const dateMap = new Map<string, number[]>();

    for (const trend of validTrends) {
      for (const point of trend.data) {
        if (!dateMap.has(point.date)) {
          dateMap.set(point.date, []);
        }
        dateMap.get(point.date)!.push(point.value);
      }
    }

    const aggregated: TrendsDataPoint[] = [];
    Array.from(dateMap.entries()).forEach(([date, values]) => {
      const avg = values.reduce((sum: number, v: number) => sum + v, 0) / values.length;
      aggregated.push({ date, value: Math.round(avg) });
    });

    return aggregated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private detectSeasonality(data: TrendsDataPoint[]): SeasonalityPattern {
    if (data.length < 52) {
      return this.createDefaultSeasonality();
    }

    const monthlyAverages = this.calculateMonthlyAverages(data);

    const inflectionPoint = this.findInflectionPoint(monthlyAverages);

    const peakWindow = this.findPeakWindow(monthlyAverages);

    const declinePhase = this.findDeclinePhase(monthlyAverages, peakWindow);

    const consistencyScore = this.calculateYoYConsistencyScore(data);
    const yoyConsistency = consistencyScore > 0.7 ? "high" : consistencyScore > 0.4 ? "medium" : "low";

    return {
      inflectionPoint,
      peakWindow,
      declinePhase,
      yoyConsistency,
      consistencyScore,
    };
  }

  private calculateMonthlyAverages(data: TrendsDataPoint[]): Map<number, number> {
    const monthSums = new Map<number, number[]>();

    for (const point of data) {
      const month = new Date(point.date).getMonth();
      if (!monthSums.has(month)) {
        monthSums.set(month, []);
      }
      monthSums.get(month)!.push(point.value);
    }

    const monthlyAvg = new Map<number, number>();
    Array.from(monthSums.entries()).forEach(([month, values]) => {
      monthlyAvg.set(month, values.reduce((s: number, v: number) => s + v, 0) / values.length);
    });

    return monthlyAvg;
  }

  private findInflectionPoint(monthlyAvg: Map<number, number>): SeasonalityPattern["inflectionPoint"] {
    const months = Array.from(monthlyAvg.entries()).sort((a, b) => a[0] - b[0]);
    
    let maxIncrease = 0;
    let inflectionMonth = 0;

    for (let i = 1; i < months.length; i++) {
      const prevValue = months[i - 1][1];
      const currValue = months[i][1];
      const increase = currValue - prevValue;
      
      if (increase > maxIncrease) {
        maxIncrease = increase;
        inflectionMonth = months[i][0];
      }
    }

    const today = new Date();
    const inflectionDate = new Date(today.getFullYear(), inflectionMonth, 1);
    if (inflectionDate < today) {
      inflectionDate.setFullYear(today.getFullYear() + 1);
    }

    return {
      month: inflectionMonth,
      week: 1,
      date: inflectionDate.toISOString().split("T")[0],
    };
  }

  private findPeakWindow(monthlyAvg: Map<number, number>): SeasonalityPattern["peakWindow"] {
    const months = Array.from(monthlyAvg.entries()).sort((a, b) => b[1] - a[1]);
    const topMonths = months.slice(0, 3).map((m) => m[0]).sort((a, b) => a - b);

    if (topMonths.length === 0) {
      return { start: "", end: "", months: [] };
    }

    const today = new Date();
    const startDate = new Date(today.getFullYear(), topMonths[0], 1);
    const endDate = new Date(today.getFullYear(), topMonths[topMonths.length - 1] + 1, 0);

    if (startDate < today) {
      startDate.setFullYear(today.getFullYear() + 1);
      endDate.setFullYear(today.getFullYear() + 1);
    }

    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
      months: topMonths.map((m) => MONTH_NAMES[m]),
    };
  }

  private findDeclinePhase(
    monthlyAvg: Map<number, number>,
    peakWindow: SeasonalityPattern["peakWindow"]
  ): SeasonalityPattern["declinePhase"] {
    if (peakWindow.months.length === 0) {
      return { start: "" };
    }

    const lastPeakMonthIndex = MONTH_NAMES.indexOf(peakWindow.months[peakWindow.months.length - 1]);
    const declineMonth = (lastPeakMonthIndex + 1) % 12;

    const today = new Date();
    const declineDate = new Date(today.getFullYear(), declineMonth, 1);
    if (declineDate < today) {
      declineDate.setFullYear(today.getFullYear() + 1);
    }

    return {
      start: declineDate.toISOString().split("T")[0],
    };
  }

  private calculateYoYConsistencyScore(data: TrendsDataPoint[]): number {
    const yearlyPatterns = this.extractYearlyPatterns(data);
    if (yearlyPatterns.length < 2) return 0.5;

    const correlations: number[] = [];

    for (let i = 1; i < yearlyPatterns.length; i++) {
      const corr = this.calculateCorrelation(yearlyPatterns[0], yearlyPatterns[i]);
      correlations.push(corr);
    }

    if (correlations.length === 0) return 0.5;
    return correlations.reduce((s, c) => s + c, 0) / correlations.length;
  }

  private extractYearlyPatterns(data: TrendsDataPoint[]): number[][] {
    const yearlyData = new Map<number, TrendsDataPoint[]>();

    for (const point of data) {
      const year = new Date(point.date).getFullYear();
      if (!yearlyData.has(year)) {
        yearlyData.set(year, []);
      }
      yearlyData.get(year)!.push(point);
    }

    const patterns: number[][] = [];
    Array.from(yearlyData.values()).forEach((points) => {
      if (points.length >= 12) {
        const monthlyValues = new Array(12).fill(0);
        const monthCounts = new Array(12).fill(0);

        for (const point of points) {
          const month = new Date(point.date).getMonth();
          monthlyValues[month] += point.value;
          monthCounts[month]++;
        }

        const pattern = monthlyValues.map((v: number, i: number) => (monthCounts[i] > 0 ? v / monthCounts[i] : 0));
        patterns.push(pattern);
      }
    });

    return patterns;
  }

  private calculateCorrelation(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    const n = a.length;
    const meanA = a.reduce((s, v) => s + v, 0) / n;
    const meanB = b.reduce((s, v) => s + v, 0) / n;

    let numerator = 0;
    let denomA = 0;
    let denomB = 0;

    for (let i = 0; i < n; i++) {
      const diffA = a[i] - meanA;
      const diffB = b[i] - meanB;
      numerator += diffA * diffB;
      denomA += diffA * diffA;
      denomB += diffB * diffB;
    }

    const denominator = Math.sqrt(denomA * denomB);
    if (denominator === 0) return 0;

    return Math.max(0, numerator / denominator);
  }

  private analyzeYoYConsistency(data: TrendsDataPoint[]): YoYAnalysis {
    const yearlyPatterns = this.extractYearlyPatterns(data);

    if (yearlyPatterns.length < 2) {
      return {
        consistency: "low",
        variance: 1,
        anomalies: ["Insufficient historical data for YoY analysis"],
      };
    }

    const correlations: number[] = [];
    for (let i = 1; i < yearlyPatterns.length; i++) {
      correlations.push(this.calculateCorrelation(yearlyPatterns[0], yearlyPatterns[i]));
    }

    const avgCorrelation = correlations.reduce((s, c) => s + c, 0) / correlations.length;
    const variance = 1 - avgCorrelation;

    const anomalies = this.detectAnomalies(data, yearlyPatterns);

    return {
      consistency: variance < 0.2 ? "high" : variance < 0.4 ? "medium" : "low",
      variance: Math.round(variance * 100) / 100,
      anomalies,
    };
  }

  private detectAnomalies(data: TrendsDataPoint[], yearlyPatterns: number[][]): string[] {
    const anomalies: string[] = [];

    if (yearlyPatterns.length < 2) return anomalies;

    for (let year = 0; year < yearlyPatterns.length; year++) {
      const pattern = yearlyPatterns[year];
      const avgValue = pattern.reduce((s, v) => s + v, 0) / pattern.length;
      const stdDev = Math.sqrt(pattern.reduce((s, v) => s + Math.pow(v - avgValue, 2), 0) / pattern.length);

      for (let month = 0; month < pattern.length; month++) {
        if (Math.abs(pattern[month] - avgValue) > 2 * stdDev && pattern[month] > avgValue) {
          const yearNumber = new Date().getFullYear() - (yearlyPatterns.length - 1 - year);
          anomalies.push(`Unusual spike in ${MONTH_NAMES[month]} ${yearNumber}`);
        }
      }
    }

    return anomalies.slice(0, 3);
  }

  private generateTimingRecommendation(
    seasonality: SeasonalityPattern,
    yoyAnalysis: YoYAnalysis,
    config: Configuration
  ): TimingRecommendation {
    if (seasonality.yoyConsistency === "low") {
      return {
        inflectionMonth: "N/A",
        peakMonths: [],
        recommendedActionDate: "N/A",
        reasoning: "Timing neutral - demand pattern shows low year-over-year consistency. Focus on other growth levers rather than seasonal timing.",
        confidence: "low",
      };
    }

    const inflectionMonth = MONTH_NAMES[seasonality.inflectionPoint.month];
    const actionMonth = (seasonality.inflectionPoint.month - 1 + 12) % 12;
    
    const today = new Date();
    const actionDate = new Date(today.getFullYear(), actionMonth, 15);
    if (actionDate < today) {
      actionDate.setFullYear(today.getFullYear() + 1);
    }

    const riskTolerance = config.strategic_intent?.risk_tolerance || "medium";
    const adjustedDate = new Date(actionDate);
    if (riskTolerance === "low") {
      adjustedDate.setDate(adjustedDate.getDate() - 14);
    } else if (riskTolerance === "high") {
      adjustedDate.setDate(adjustedDate.getDate() + 7);
    }

    const reasoning = this.buildReasoning(seasonality, yoyAnalysis, riskTolerance);

    return {
      inflectionMonth,
      peakMonths: seasonality.peakWindow.months,
      recommendedActionDate: adjustedDate.toISOString().split("T")[0],
      reasoning,
      confidence: seasonality.yoyConsistency,
    };
  }

  private buildReasoning(
    seasonality: SeasonalityPattern,
    yoyAnalysis: YoYAnalysis,
    riskTolerance: string
  ): string {
    const parts: string[] = [];

    parts.push(`Demand historically begins rising in ${MONTH_NAMES[seasonality.inflectionPoint.month]}`);
    
    if (seasonality.peakWindow.months.length > 0) {
      parts.push(`peaking in ${seasonality.peakWindow.months.join(" and ")}`);
    }

    parts.push(`with ${seasonality.yoyConsistency} year-over-year consistency (${Math.round(seasonality.consistencyScore * 100)}% stability)`);

    if (riskTolerance === "low") {
      parts.push("Given conservative risk tolerance, recommend launching 2 weeks before inflection point.");
    } else if (riskTolerance === "high") {
      parts.push("Given aggressive risk tolerance, can launch closer to inflection point to maximize efficiency.");
    } else {
      parts.push("Recommend launching content and TOF media 2-4 weeks before inflection point.");
    }

    if (yoyAnalysis.anomalies.length > 0) {
      parts.push(`Note: ${yoyAnalysis.anomalies[0]}.`);
    }

    return parts.join(". ") + ".";
  }

  private generateForecast(data: TrendsDataPoint[], weeks: number): TrendsDataPoint[] {
    if (data.length < 12) return [];

    const lastPoints = data.slice(-12);
    const movingAvg = this.calculateMovingAverage(lastPoints, 4);

    const trend = this.calculateTrend(lastPoints);

    const forecast: TrendsDataPoint[] = [];
    const lastDate = new Date(lastPoints[lastPoints.length - 1].date);

    for (let i = 1; i <= weeks; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + 7 * i);

      const forecastValue = Math.max(0, Math.min(100, movingAvg + trend * i));

      forecast.push({
        date: forecastDate.toISOString().split("T")[0],
        value: Math.round(forecastValue),
      });
    }

    return forecast;
  }

  private calculateMovingAverage(data: TrendsDataPoint[], window: number): number {
    const recentData = data.slice(-window);
    if (recentData.length === 0) return 50;
    return recentData.reduce((sum, p) => sum + p.value, 0) / recentData.length;
  }

  private calculateTrend(data: TrendsDataPoint[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((s, p) => s + p.value, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (data[i].value - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  private generateExecutiveSummary(
    seasonality: SeasonalityPattern,
    timing: TimingRecommendation,
    yoy: YoYAnalysis
  ): string {
    if (timing.confidence === "low") {
      return `Market demand shows ${yoy.consistency} year-over-year consistency (${Math.round(yoy.variance * 100)}% variance). Recommend a timing-neutral approach - focus on always-on strategies rather than seasonal optimization.`;
    }

    const peakMonthsText = timing.peakMonths.length > 0 ? timing.peakMonths.join(" and ") : "throughout the year";

    return `Demand consistently begins rising in ${timing.inflectionMonth} and peaks in ${peakMonthsText}. Over five years, the pattern shows ${seasonality.yoyConsistency} consistency with ${Math.round(seasonality.consistencyScore * 100)}% stability. This suggests TOF media and content should launch no later than ${timing.recommendedActionDate}, with creative finalized 2-3 weeks prior. Delaying until peak months historically results in higher CAC and weaker share capture.`;
  }

  private buildTrace(
    config: Configuration,
    filteredQueries: string[]
  ): MarketDemandResult["trace"] {
    const sectionsUsed: string[] = ["A", "B"];
    const sectionsMissing: string[] = [];
    const filtersApplied: string[] = [];

    if (config.negative_scope?.excluded_keywords?.length || config.negative_scope?.excluded_categories?.length) {
      filtersApplied.push("negative_scope");
    }

    if (!config.strategic_intent?.risk_tolerance) {
      sectionsMissing.push("E");
    } else {
      sectionsUsed.push("E");
    }

    if (!config.governance?.context_confidence) {
      sectionsMissing.push("H");
    } else {
      sectionsUsed.push("H");
    }

    return {
      sectionsUsed,
      sectionsMissing,
      filtersApplied,
      rulesTriggered: ["timing_consistency_check", "yoy_pattern_analysis"],
    };
  }

  private createDefaultSeasonality(): SeasonalityPattern {
    return {
      inflectionPoint: { month: 0, week: 1, date: "" },
      peakWindow: { start: "", end: "", months: [] },
      declinePhase: { start: "" },
      yoyConsistency: "low",
      consistencyScore: 0,
    };
  }
}

export const marketDemandAnalyzer = new MarketDemandAnalyzer();
