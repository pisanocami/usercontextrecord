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
  Month,
  CategoryDemandSlice,
  CategoryQueryGroup,
  MarketDemandByCategoryResult,
  CategoryCacheTrace,
  CategoryDemandTrace,
  OverallDemandAggregate,
} from "@shared/schema";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTHS: Month[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface CategoryCacheEntry {
  slice: CategoryDemandSlice;
  expiresAt: number;
}

const categoryCache = new Map<string, CategoryCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function buildCacheKey(configId: number, categoryName: string, queries: string[], country: string, timeRange: string): string {
  const sortedQueries = [...queries].sort().join("|");
  return `${configId}:${categoryName}:${sortedQueries}:${country}:${timeRange}`;
}

function buildCategoryGroups(config: Configuration): CategoryQueryGroup[] {
  const groups: CategoryQueryGroup[] = [];
  const catDef = config.category_definition;

  if (catDef?.primary_category) {
    groups.push({
      categoryName: catDef.primary_category,
      queries: [catDef.primary_category],
    });
  }

  if (catDef?.included?.length) {
    for (const included of catDef.included) {
      groups.push({
        categoryName: included,
        queries: [included],
      });
    }
  }

  if (catDef?.approved_categories?.length) {
    for (const approved of catDef.approved_categories) {
      if (!groups.some(g => g.categoryName === approved)) {
        groups.push({
          categoryName: approved,
          queries: [approved],
        });
      }
    }
  }

  if (catDef?.semantic_extensions?.length) {
    groups.push({
      categoryName: "Semantic Extensions",
      queries: catDef.semantic_extensions.slice(0, 5),
    });
  }

  return groups;
}

export class MarketDemandAnalyzer {
  private provider: TrendsDataProvider;

  constructor(provider?: TrendsDataProvider) {
    this.provider = provider || getDefaultTrendsProvider();
  }

  /**
   * @deprecated Legacy method - use analyzeByCategory() for per-category analysis with caching
   */
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

  async analyzeByCategory(
    config: Configuration,
    params: Partial<MarketDemandAnalysisParams> = {}
  ): Promise<MarketDemandByCategoryResult> {
    const countryCode = params.countryCode || this.extractCountryCode(config);
    const timeRange = params.timeRange || "today 5-y";
    const interval = params.interval || "weekly";
    const configId = parseInt(config.id, 10) || 0;

    const categoryGroups = buildCategoryGroups(config);

    if (categoryGroups.length === 0) {
      throw new Error("No category groups available for analysis. Please define category terms in the configuration.");
    }

    console.log(`[MarketDemandAnalyzer] Analyzing ${categoryGroups.length} category groups for ${countryCode}`);

    const byCategory: CategoryDemandSlice[] = [];
    const sectionsUsed: string[] = ["B"];
    const filtersApplied: string[] = [];

    if (config.negative_scope?.excluded_keywords?.length || config.negative_scope?.excluded_categories?.length) {
      filtersApplied.push("negative_scope");
    }

    for (const group of categoryGroups) {
      const filteredQueries = this.applyNegativeScope(group.queries, config);
      if (filteredQueries.length === 0) continue;

      const cacheKey = buildCacheKey(configId, group.categoryName, filteredQueries, countryCode, timeRange);
      const now = Date.now();

      const cached = categoryCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        console.log(`[MarketDemandAnalyzer] Cache hit for ${group.categoryName}`);
        byCategory.push(cached.slice);
        continue;
      }

      console.log(`[MarketDemandAnalyzer] Cache miss for ${group.categoryName}, fetching data...`);

      const trendsData = await this.fetchTrendsData(filteredQueries, countryCode, timeRange, interval);
      const aggregatedData = this.aggregateTrendsData(trendsData);

      const heatmap = this.buildHeatmap(aggregatedData);
      const { peak, low } = this.findPeakAndLowMonths(heatmap);

      const stabilityScore = this.calculateYoYConsistencyScore(aggregatedData);
      const consistencyLabel: "low" | "medium" | "high" = 
        stabilityScore > 0.7 ? "high" : stabilityScore > 0.4 ? "medium" : "low";
      const variance = Math.round((1 - stabilityScore) * 100) / 100;

      const monthlyAvg = this.calculateMonthlyAverages(aggregatedData);
      const inflectionPoint = this.findInflectionPoint(monthlyAvg);
      const peakWindow = this.findPeakWindow(monthlyAvg);

      const inflectionMonth = this.getShortMonth(inflectionPoint.month);
      const peakWindowMonths = peakWindow.months.map(m => {
        const idx = MONTH_NAMES.indexOf(m);
        return idx >= 0 ? SHORT_MONTHS[idx] : null;
      }).filter((m): m is Month => m !== null);

      let recommendedLaunchByISO: string | null = null;
      let recommendationRationale = "";

      if (consistencyLabel !== "low" && peak) {
        const actionMonth = (inflectionPoint.month - 1 + 12) % 12;
        const today = new Date();
        const actionDate = new Date(today.getFullYear(), actionMonth, 15);
        if (actionDate < today) {
          actionDate.setFullYear(today.getFullYear() + 1);
        }
        recommendedLaunchByISO = actionDate.toISOString().split("T")[0];
        recommendationRationale = `Launch content 2-4 weeks before ${inflectionMonth} when demand begins rising. Peak demand in ${peak}.`;
      } else {
        recommendationRationale = "Timing neutral - demand pattern shows low year-over-year consistency.";
      }

      const cacheTrace: CategoryCacheTrace = {
        hit: false,
        key: cacheKey,
        ttlSeconds: CACHE_TTL_MS / 1000,
      };

      const trace: CategoryDemandTrace = {
        ucrSectionsUsed: ["B"],
        provider: "dataforseo",
        cache: cacheTrace,
      };

      const slice: CategoryDemandSlice = {
        categoryName: group.categoryName,
        queries: filteredQueries,
        peakMonth: peak,
        lowMonth: low,
        stabilityScore: Math.round(stabilityScore * 100) / 100,
        consistencyLabel,
        variance,
        inflectionMonth,
        peakWindow: peakWindowMonths,
        recommendedLaunchByISO,
        recommendationRationale,
        series: aggregatedData,
        heatmap,
        trace,
      };

      categoryCache.set(cacheKey, {
        slice,
        expiresAt: now + CACHE_TTL_MS,
      });

      byCategory.push(slice);
    }

    const overall = this.buildOverallAggregate(byCategory);

    const executiveSummary = this.generateCategorySummary(byCategory);

    const sectionsMissing: string[] = [];
    if (!config.strategic_intent?.risk_tolerance) {
      sectionsMissing.push("E");
    } else {
      sectionsUsed.push("E");
    }

    return {
      configurationId: configId,
      ucrVersion: `v${config.governance?.context_version || 1}`,
      provider: "dataforseo",
      timeRange,
      country: countryCode,
      granularity: interval === "monthly" ? "monthly" : "weekly",
      byCategory,
      overall,
      executiveSummary,
      trace: {
        sectionsUsed,
        sectionsMissing,
        filtersApplied,
        rulesTriggered: ["per_category_analysis", "timing_consistency_check"],
      },
      metadata: {
        fetchedAt: new Date().toISOString(),
        cached: byCategory.some(c => c.trace.cache.hit),
        dataSource: this.provider.displayName,
      },
    };
  }

  private buildHeatmap(data: TrendsDataPoint[]): Record<Month, number> {
    const heatmap: Record<Month, number> = {
      Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
      Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
    };
    const counts: Record<Month, number> = {
      Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
      Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
    };

    for (const point of data) {
      const monthIdx = new Date(point.date).getMonth();
      const shortMonth = SHORT_MONTHS[monthIdx];
      heatmap[shortMonth] += point.value;
      counts[shortMonth]++;
    }

    for (const month of SHORT_MONTHS) {
      if (counts[month] > 0) {
        heatmap[month] = Math.round(heatmap[month] / counts[month]);
      }
    }

    return heatmap;
  }

  private getShortMonth(monthIndex: number): Month {
    return SHORT_MONTHS[monthIndex % 12];
  }

  private findPeakAndLowMonths(heatmap: Record<Month, number>): { peak: Month | null; low: Month | null } {
    let peakMonth: Month | null = null;
    let lowMonth: Month | null = null;
    let maxVal = -Infinity;
    let minVal = Infinity;

    for (const month of SHORT_MONTHS) {
      const val = heatmap[month];
      if (val > maxVal) {
        maxVal = val;
        peakMonth = month;
      }
      if (val < minVal && val > 0) {
        minVal = val;
        lowMonth = month;
      }
    }

    return { peak: peakMonth, low: lowMonth };
  }

  private buildOverallAggregate(slices: CategoryDemandSlice[]): OverallDemandAggregate | undefined {
    if (slices.length === 0) return undefined;

    const weights: Record<string, number> = {};
    const totalWeight = slices.length;
    for (const slice of slices) {
      weights[slice.categoryName] = 1 / totalWeight;
    }

    const aggregatedHeatmap: Record<Month, number> = {
      Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
      Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
    };

    for (const slice of slices) {
      const weight = weights[slice.categoryName];
      for (const month of SHORT_MONTHS) {
        aggregatedHeatmap[month] += slice.heatmap[month] * weight;
      }
    }

    for (const month of SHORT_MONTHS) {
      aggregatedHeatmap[month] = Math.round(aggregatedHeatmap[month]);
    }

    const { peak, low } = this.findPeakAndLowMonths(aggregatedHeatmap);

    const avgStability = slices.reduce((sum, s) => sum + s.stabilityScore, 0) / slices.length;

    const seriesMap = new Map<string, number[]>();
    for (const slice of slices) {
      for (const point of slice.series) {
        if (!seriesMap.has(point.date)) {
          seriesMap.set(point.date, []);
        }
        seriesMap.get(point.date)!.push(point.value);
      }
    }

    const aggregatedSeries: TrendsDataPoint[] = [];
    for (const [date, values] of seriesMap) {
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      aggregatedSeries.push({ date, value: Math.round(avg) });
    }
    aggregatedSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let recommendedLaunchByISO: string | null = null;
    if (avgStability > 0.4 && peak) {
      const peakIdx = SHORT_MONTHS.indexOf(peak);
      const actionMonth = (peakIdx - 1 + 12) % 12;
      const today = new Date();
      const actionDate = new Date(today.getFullYear(), actionMonth, 15);
      if (actionDate < today) {
        actionDate.setFullYear(today.getFullYear() + 1);
      }
      recommendedLaunchByISO = actionDate.toISOString().split("T")[0];
    }

    return {
      method: "weighted_average",
      weights,
      peakMonth: peak,
      lowMonth: low,
      stabilityScore: Math.round(avgStability * 100) / 100,
      recommendedLaunchByISO,
      series: aggregatedSeries,
      heatmap: aggregatedHeatmap,
    };
  }

  private generateCategorySummary(slices: CategoryDemandSlice[]): string {
    if (slices.length === 0) {
      return "No category data available for analysis.";
    }

    const parts: string[] = [];
    parts.push(`Analyzed ${slices.length} category groups:`);

    for (const slice of slices) {
      if (slice.peakMonth) {
        parts.push(`- ${slice.categoryName}: peaks in ${slice.peakMonth} (${slice.consistencyLabel} consistency)`);
      } else {
        parts.push(`- ${slice.categoryName}: timing neutral (${slice.consistencyLabel} consistency)`);
      }
    }

    const highConsistency = slices.filter(s => s.consistencyLabel === "high");
    if (highConsistency.length > 0) {
      const firstHigh = highConsistency[0];
      if (firstHigh.recommendedLaunchByISO) {
        parts.push(`Recommended launch: ${firstHigh.recommendedLaunchByISO} based on ${firstHigh.categoryName} timing.`);
      }
    }

    return parts.join(" ");
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

  // ==========================================
  // Context-First Methods (Playbook v1)
  // ==========================================

  /**
   * Build demand theme clusters from UCR.D.demand_themes
   * Context-First: Clusters must be derived from UCR, not freeform
   */
  buildDemandThemeClusters(config: Configuration): { name: string; keywords: string[] }[] {
    const demandThemes = config.demand_definition?.demand_themes || [];
    const clusters: { name: string; keywords: string[] }[] = [];

    for (const theme of demandThemes) {
      if (theme.keywords && theme.keywords.length > 0) {
        // Apply negative scope filtering
        const filteredKeywords = this.applyNegativeScope(theme.keywords, config);
        if (filteredKeywords.length > 0) {
          clusters.push({
            name: theme.name,
            keywords: filteredKeywords,
          });
        }
      }
    }

    // Fallback to category-based clusters if no demand themes defined
    if (clusters.length === 0) {
      console.log("[MarketDemandAnalyzer] No demand themes found, falling back to category-based clusters");
      const categoryGroups = buildCategoryGroups(config);
      for (const group of categoryGroups) {
        const filteredQueries = this.applyNegativeScope(group.queries, config);
        if (filteredQueries.length > 0) {
          clusters.push({
            name: group.categoryName,
            keywords: filteredQueries,
          });
        }
      }
    }

    return clusters;
  }

  /**
   * Determine timing classification based on seasonality pattern
   * Context-First: Per-cluster classification for exec-safe framing
   */
  determineTimingClassification(
    stabilityScore: number,
    variance: number,
    inflectionTopeakWeeks: number
  ): "early_ramp_dominant" | "peak_driven" | "flat_timing_neutral" | "erratic_unreliable" {
    // Erratic: low consistency
    if (stabilityScore < 0.4 || variance > 0.6) {
      return "erratic_unreliable";
    }

    // Flat: minimal variance in monthly patterns
    if (variance < 0.15) {
      return "flat_timing_neutral";
    }

    // Peak driven: short ramp to peak (less than 6 weeks)
    if (inflectionTopeakWeeks < 6) {
      return "peak_driven";
    }

    // Early ramp: gradual build over time
    return "early_ramp_dominant";
  }

  /**
   * Determine YoY consistency label per playbook spec
   */
  determineYoYConsistencyLabel(
    consistencyScore: number,
    yearlyPatterns: number[][]
  ): "stable" | "shifting" | "erratic" {
    if (consistencyScore > 0.7) {
      return "stable";
    }

    // Check if peak is shifting earlier/later
    if (yearlyPatterns.length >= 2) {
      const peakShift = this.detectPeakShift(yearlyPatterns);
      if (peakShift !== 0) {
        return "shifting";
      }
    }

    if (consistencyScore < 0.4) {
      return "erratic";
    }

    return "stable";
  }

  /**
   * Detect if peak timing is shifting earlier or later over years
   */
  private detectPeakShift(yearlyPatterns: number[][]): number {
    const peaks: number[] = [];
    for (const pattern of yearlyPatterns) {
      const maxVal = Math.max(...pattern);
      const peakMonth = pattern.indexOf(maxVal);
      peaks.push(peakMonth);
    }

    if (peaks.length < 2) return 0;

    // Simple trend: is peak moving?
    const firstHalf = peaks.slice(0, Math.floor(peaks.length / 2));
    const secondHalf = peaks.slice(Math.floor(peaks.length / 2));

    const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

    const shift = avgSecond - avgFirst;
    if (Math.abs(shift) > 1) {
      return shift > 0 ? 1 : -1; // 1 = later, -1 = earlier
    }

    return 0;
  }

  /**
   * Check if forecast should be enabled based on H.forecast_policy
   * Context-First: Forecast is policy-driven, not a user toggle
   */
  shouldEnableForecast(
    config: Configuration,
    yoyConsistency: "stable" | "shifting" | "erratic",
    yearlyPatterns: number[][]
  ): { enabled: boolean; reason: string } {
    const policy = config.governance?.module_defaults?.forecast_policy || "DISABLED";

    if (policy === "DISABLED") {
      return { enabled: false, reason: "Forecast disabled by governance policy" };
    }

    if (policy === "DIRECTIONAL_ONLY") {
      return { enabled: true, reason: "Directional forecast enabled by policy (8-12 week max)" };
    }

    // ENABLED_WITH_GUARDRAILS: Check conditions
    if (policy === "ENABLED_WITH_GUARDRAILS") {
      if (yoyConsistency === "erratic") {
        return { enabled: false, reason: "Forecast blocked: YoY consistency is erratic" };
      }

      // Check if at least 3 of last 5 years show similar timing
      if (yearlyPatterns.length < 3) {
        return { enabled: false, reason: "Forecast blocked: Insufficient historical data (<3 years)" };
      }

      const consistentYears = this.countConsistentYears(yearlyPatterns);
      if (consistentYears < 3) {
        return { enabled: false, reason: `Forecast blocked: Only ${consistentYears} of ${yearlyPatterns.length} years show consistent timing` };
      }

      return { enabled: true, reason: "Forecast enabled with guardrails (12 week max)" };
    }

    return { enabled: false, reason: "Unknown forecast policy" };
  }

  /**
   * Count how many years show consistent peak timing
   */
  private countConsistentYears(yearlyPatterns: number[][]): number {
    if (yearlyPatterns.length < 2) return 0;

    const peaks: number[] = yearlyPatterns.map(pattern => {
      const maxVal = Math.max(...pattern);
      return pattern.indexOf(maxVal);
    });

    // Find modal peak month
    const peakCounts = new Map<number, number>();
    for (const peak of peaks) {
      peakCounts.set(peak, (peakCounts.get(peak) || 0) + 1);
    }

    let modalPeak = 0;
    let maxCount = 0;
    for (const [peak, count] of peakCounts) {
      if (count > maxCount) {
        maxCount = count;
        modalPeak = peak;
      }
    }

    // Count years within 1 month of modal peak
    return peaks.filter(p => Math.abs(p - modalPeak) <= 1).length;
  }

  /**
   * Generate policy-driven forecast with appropriate horizon
   */
  generatePolicyForecast(
    data: TrendsDataPoint[],
    policy: string,
    yoyConsistency: "stable" | "shifting" | "erratic"
  ): TrendsDataPoint[] {
    if (policy === "DISABLED") {
      return [];
    }

    const maxWeeks = policy === "DIRECTIONAL_ONLY" ? 8 : 12;
    return this.generateForecast(data, maxWeeks);
  }

  /**
   * Calculate weeks from inflection to peak
   */
  private calculateInflectionToPeakWeeks(monthlyAvg: Map<number, number>): number {
    const inflection = this.findInflectionPoint(monthlyAvg);
    const peak = this.findPeakWindow(monthlyAvg);

    if (peak.months.length === 0) return 12; // Default to 12 weeks if no clear peak

    const peakMonthIndex = MONTH_NAMES.indexOf(peak.months[0]);
    const weeksDiff = (peakMonthIndex - inflection.month + 12) % 12 * 4;

    return Math.max(1, weeksDiff);
  }
}

export const marketDemandAnalyzer = new MarketDemandAnalyzer();
