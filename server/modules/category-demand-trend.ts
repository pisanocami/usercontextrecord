import { type Configuration, type TrendsDataPoint } from "@shared/schema";
import { marketDemandAnalyzer } from "../market-demand-analyzer";

interface CategoryDemandTrendResult {
  category: string;
  composite_trend: { date: string; value: number }[];
  cagr_5y: number | null;
  trend_direction: "growing" | "stagnating" | "declining";
  slope: number;
  supporting_queries: Record<string, number>;
  peak_months: string[];
  timing_recommendation: string;
  executive_summary: string;
  data_coverage: {
    months_available: number;
    years_covered: number;
    is_full_5y: boolean;
  };
}

function calculateCAGR(startValue: number, endValue: number, years: number): number | null {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return null;
  if (years < 1) return null;
  return Math.pow(endValue / startValue, 1 / years) - 1;
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

function classifyTrendDirection(slope: number, cagr: number | null): "growing" | "stagnating" | "declining" {
  const cagrSignal = cagr !== null ? cagr * 100 : 0;
  const avgSignal = (cagrSignal + slope) / 2;
  
  if (avgSignal > 3) return "growing";
  if (avgSignal < -3) return "declining";
  return "stagnating";
}

function classifySlope(slope: number): string {
  if (slope > 0.5) return "strongly growing";
  if (slope > 0.1) return "growing";
  if (slope > -0.1) return "stable";
  if (slope > -0.5) return "declining";
  return "strongly declining";
}

function aggregateDataPoints(series: TrendsDataPoint[]): { date: string; value: number }[] {
  const monthlyMap = new Map<string, number[]>();
  
  for (const point of series) {
    const dateKey = point.date.substring(0, 7);
    const values = monthlyMap.get(dateKey) || [];
    values.push(point.value);
    monthlyMap.set(dateKey, values);
  }
  
  const result: { date: string; value: number }[] = [];
  const sortedKeys = Array.from(monthlyMap.keys()).sort();
  
  for (const key of sortedKeys) {
    const values = monthlyMap.get(key)!;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    result.push({ date: `${key}-01`, value: Math.round(avg) });
  }
  
  return result;
}

function findPeakMonths(compositeTrend: { date: string; value: number }[]): string[] {
  const monthlyAvg = new Map<number, number[]>();
  
  for (const point of compositeTrend) {
    const month = new Date(point.date).getMonth();
    const values = monthlyAvg.get(month) || [];
    values.push(point.value);
    monthlyAvg.set(month, values);
  }
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const avgByMonth: { month: string; avg: number }[] = [];
  
  monthlyAvg.forEach((values, monthIdx) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    avgByMonth.push({ month: monthNames[monthIdx], avg });
  });
  
  avgByMonth.sort((a, b) => b.avg - a.avg);
  return avgByMonth.slice(0, 3).map(m => m.month);
}

function calculateYearsFromData(compositeTrend: { date: string; value: number }[]): number {
  if (compositeTrend.length < 2) return 0;
  
  const firstDate = new Date(compositeTrend[0].date);
  const lastDate = new Date(compositeTrend[compositeTrend.length - 1].date);
  const diffMs = lastDate.getTime() - firstDate.getTime();
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  
  return Math.round(diffYears * 10) / 10;
}

function generateExecutiveSummary(
  category: string,
  trendDirection: "growing" | "stagnating" | "declining",
  cagr: number | null,
  peakMonths: string[],
  yearsOfData: number
): string {
  const cagrText = cagr !== null 
    ? `${(cagr * 100).toFixed(1)}% CAGR over ${yearsOfData.toFixed(1)} years` 
    : `insufficient data for CAGR calculation`;
  
  const directionText = {
    growing: `shows strong growth signals with ${cagrText}`,
    stagnating: `shows stable but flat demand with ${cagrText}`,
    declining: `shows declining interest with ${cagrText}`
  };
  
  const implication = {
    growing: "This indicates a healthy category worth continued investment.",
    stagnating: "Market share may need to be captured from competitors.",
    declining: "Consider adjacent category expansion or repositioning."
  };
  
  const peakText = peakMonths.length > 0 
    ? `Peak interest typically occurs in ${peakMonths.join(", ")}.` 
    : "";
  
  return `The ${category} category ${directionText[trendDirection]}. ${peakText} ${implication[trendDirection]}`;
}

export async function analyzeCategoryDemandTrend(
  config: Configuration,
  params: {
    timeRange?: string;
    countryCode?: string;
    excludedCategories?: string[];
  }
): Promise<CategoryDemandTrendResult> {
  const categoryName = config.category_definition?.primary_category || "Unknown Category";
  
  const demandResult = await marketDemandAnalyzer.analyzeByCategory(config, {
    timeRange: params.timeRange || "today 5-y",
    countryCode: params.countryCode,
    excludedCategories: params.excludedCategories || []
  });
  
  if (demandResult.byCategory.length === 0) {
    throw new Error("No category demand data available. Please ensure category definitions are configured.");
  }
  
  const supportingQueries: Record<string, number> = {};
  
  for (const categorySlice of demandResult.byCategory) {
    const categoryAggregated = aggregateDataPoints(categorySlice.series);
    const categorySlope = calculateLinearRegressionSlope(categoryAggregated);
    const normalizedSlope = Math.round(categorySlope * 100) / 100;
    
    for (const query of categorySlice.queries) {
      supportingQueries[query] = normalizedSlope;
    }
  }
  
  let compositeTrend: { date: string; value: number }[];
  
  if (demandResult.overall?.series && demandResult.overall.series.length > 0) {
    compositeTrend = aggregateDataPoints(demandResult.overall.series);
  } else {
    const allDates = new Map<string, number[]>();
    
    for (const categorySlice of demandResult.byCategory) {
      for (const point of categorySlice.series) {
        const dateKey = point.date.substring(0, 7);
        if (!allDates.has(dateKey)) {
          allDates.set(dateKey, []);
        }
        allDates.get(dateKey)!.push(point.value);
      }
    }
    
    const sortedKeys = Array.from(allDates.keys()).sort();
    compositeTrend = sortedKeys.map(key => {
      const values = allDates.get(key)!;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return { date: `${key}-01`, value: Math.round(avg) };
    });
  }
  
  if (compositeTrend.length < 2) {
    throw new Error("Insufficient data points for trend analysis");
  }
  
  const yearsOfData = calculateYearsFromData(compositeTrend);
  const monthsAvailable = compositeTrend.length;
  const isFullFiveYears = yearsOfData >= 4.5;
  
  let cagr: number | null = null;
  
  if (monthsAvailable >= 54 && yearsOfData >= 4.5) {
    const firstYearAvg = compositeTrend.slice(0, 12)
      .reduce((sum, p) => sum + p.value, 0) / 12;
    const lastYearAvg = compositeTrend.slice(-12)
      .reduce((sum, p) => sum + p.value, 0) / 12;
    
    cagr = calculateCAGR(firstYearAvg, lastYearAvg, 5);
  }
  
  const slope = calculateLinearRegressionSlope(compositeTrend);
  const normalizedSlope = Math.round(slope * 100) / 100;
  
  const trendDirection = classifyTrendDirection(normalizedSlope, cagr);
  
  const peakMonths = findPeakMonths(compositeTrend);
  
  const timingRecommendation = demandResult.overall?.recommendedLaunchByISO 
    ? `Optimal launch timing: ${demandResult.overall.recommendedLaunchByISO}. Plan campaigns 2-4 weeks before ${peakMonths[0] || "peak season"}.`
    : peakMonths.length > 0 
      ? `Optimal timing for campaigns: 2-4 weeks before ${peakMonths[0]}`
      : "Timing neutral - no strong seasonal pattern detected";
  
  const executiveSummary = generateExecutiveSummary(
    categoryName, 
    trendDirection, 
    cagr, 
    peakMonths,
    yearsOfData
  );
  
  return {
    category: categoryName,
    composite_trend: compositeTrend,
    cagr_5y: cagr !== null ? Math.round(cagr * 1000) / 1000 : null,
    trend_direction: trendDirection,
    slope: normalizedSlope,
    supporting_queries: supportingQueries,
    peak_months: peakMonths,
    timing_recommendation: timingRecommendation,
    executive_summary: executiveSummary,
    data_coverage: {
      months_available: monthsAvailable,
      years_covered: yearsOfData,
      is_full_5y: isFullFiveYears
    }
  };
}
