import { type Configuration } from "@shared/schema";
import { marketDemandAnalyzer } from "../market-demand-analyzer";

interface TrendClassification {
    direction: "growth" | "stable" | "decline";
    strength: "strong" | "moderate" | "weak";
    confidence: "high" | "medium" | "low";
}

interface CategoryTrendData {
    categoryName: string;
    cagr5y: number;
    trendDirection: TrendClassification;
    peakMonths: string[];
    lowMonths: string[];
    seasonalityScore: number;
    currentMomentum: number;
    dataPoints: number;
}

interface CategoryDemandTrendResult {
    brandDomain: string;
    categories: CategoryTrendData[];
    cagr_5y: number;
    trend_direction: string;
    peak_months: string[];
    timing_recommendation: string;
    investment_signal: "invest" | "maintain" | "divest" | "monitor";
    investment_rationale: string;
    timing_details: {
        best_months: string[];
        avoid_months: string[];
        next_optimal_window: string | null;
    };
    trace: {
        sectionsUsed: string[];
        sectionsMissing: string[];
        filtersApplied: string[];
        rulesTriggered: string[];
    };
    metadata: {
        fetched_at: string;
        data_source: string;
        time_range: string;
    };
}

function calculateCAGR(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || years <= 0) return 0;
    const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
    return Math.round(cagr * 100) / 100;
}

function classifyTrend(cagr: number, volatility: number): TrendClassification {
    let direction: "growth" | "stable" | "decline";
    let strength: "strong" | "moderate" | "weak";
    let confidence: "high" | "medium" | "low";

    if (cagr > 5) {
        direction = "growth";
        strength = cagr > 15 ? "strong" : cagr > 8 ? "moderate" : "weak";
    } else if (cagr < -5) {
        direction = "decline";
        strength = cagr < -15 ? "strong" : cagr < -8 ? "moderate" : "weak";
    } else {
        direction = "stable";
        strength = "moderate";
    }

    confidence = volatility < 0.3 ? "high" : volatility < 0.5 ? "medium" : "low";

    return { direction, strength, confidence };
}

function determineInvestmentSignal(
    cagr: number,
    direction: string,
    confidence: string
): "invest" | "maintain" | "divest" | "monitor" {
    if (direction === "growth" && confidence !== "low") {
        return cagr > 10 ? "invest" : "maintain";
    } else if (direction === "decline") {
        return cagr < -10 ? "divest" : "monitor";
    } else if (direction === "stable") {
        return "maintain";
    }
    return "monitor";
}

function generateInvestmentRationale(
    cagr: number,
    direction: string,
    signal: string,
    categoryCount: number
): string {
    const directionText = direction === "growth" 
        ? `growing at ${cagr}% CAGR` 
        : direction === "decline" 
            ? `declining at ${Math.abs(cagr)}% CAGR`
            : "showing stable demand";

    const signalText = {
        invest: "Strong opportunity for increased investment and market expansion.",
        maintain: "Maintain current position and optimize existing efforts.",
        divest: "Consider reducing investment or pivoting to adjacent categories.",
        monitor: "Monitor closely for trend changes before major decisions."
    }[signal];

    return `Across ${categoryCount} analyzed categories, demand is ${directionText}. ${signalText}`;
}

export async function analyzeCategoryDemandTrend(
    config: Configuration,
    params: {
        timeRange?: string;
        countryCode?: string;
        excludedCategories?: string[];
    }
): Promise<CategoryDemandTrendResult> {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }

    const timeRange = params.timeRange || "today 5-y";
    const countryCode = params.countryCode;
    const excludedCategories = params.excludedCategories || [];

    const demandData = await marketDemandAnalyzer.analyzeByCategory(config, {
        timeRange,
        countryCode,
        excludedCategories,
    });

    const categories: CategoryTrendData[] = [];
    let totalCagr = 0;
    let validCategories = 0;

    for (const slice of demandData.byCategory) {
        if (slice.series.length < 52) {
            continue;
        }

        const yearGroups: number[][] = [];
        const pointsPerYear = Math.floor(slice.series.length / 5);
        
        for (let i = 0; i < 5; i++) {
            const start = i * pointsPerYear;
            const end = Math.min((i + 1) * pointsPerYear, slice.series.length);
            const yearData = slice.series.slice(start, end);
            const avgValue = yearData.reduce((sum, d) => sum + d.value, 0) / yearData.length;
            yearGroups.push([avgValue]);
        }

        const firstYearAvg = yearGroups[0][0] || 1;
        const lastYearAvg = yearGroups[4][0] || 1;
        const cagr = calculateCAGR(firstYearAvg, lastYearAvg, 5);

        const values = slice.series.map(d => d.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const volatility = Math.sqrt(variance) / mean;

        const trendDirection = classifyTrend(cagr, volatility);

        const recentData = slice.series.slice(-52);
        const recentAvg = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
        const priorData = slice.series.slice(-104, -52);
        const priorAvg = priorData.length > 0 
            ? priorData.reduce((sum, d) => sum + d.value, 0) / priorData.length 
            : recentAvg;
        const currentMomentum = priorAvg > 0 
            ? Math.round(((recentAvg - priorAvg) / priorAvg) * 100 * 10) / 10 
            : 0;

        categories.push({
            categoryName: slice.categoryName,
            cagr5y: cagr,
            trendDirection,
            peakMonths: slice.peakMonth ? [slice.peakMonth] : [],
            lowMonths: slice.lowMonth ? [slice.lowMonth] : [],
            seasonalityScore: slice.stabilityScore,
            currentMomentum,
            dataPoints: slice.series.length,
        });

        totalCagr += cagr;
        validCategories++;
    }

    const avgCagr = validCategories > 0 ? Math.round((totalCagr / validCategories) * 100) / 100 : 0;
    const overallDirection = avgCagr > 5 ? "growth" : avgCagr < -5 ? "decline" : "stable";
    const investmentSignal = determineInvestmentSignal(avgCagr, overallDirection, "medium");

    const allPeakMonths = categories.flatMap(c => c.peakMonths);
    const allLowMonths = categories.flatMap(c => c.lowMonths);
    
    const peakCount = allPeakMonths.reduce((acc, m) => {
        acc[m] = (acc[m] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const lowCount = allLowMonths.reduce((acc, m) => {
        acc[m] = (acc[m] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const bestMonths = Object.entries(peakCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([m]) => m);

    const avoidMonths = Object.entries(lowCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([m]) => m);

    let nextOptimalWindow: string | null = null;
    if (bestMonths.length > 0) {
        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const today = new Date();
        const currentMonthIdx = today.getMonth();
        
        for (let i = 1; i <= 12; i++) {
            const checkIdx = (currentMonthIdx + i) % 12;
            const checkMonth = monthOrder[checkIdx];
            if (bestMonths.includes(checkMonth)) {
                const year = checkIdx <= currentMonthIdx ? today.getFullYear() + 1 : today.getFullYear();
                nextOptimalWindow = `${checkMonth} ${year}`;
                break;
            }
        }
    }

    const sectionsUsed: string[] = ["A", "B"];
    const sectionsMissing: string[] = [];
    
    if (config.competitors?.competitors?.length) sectionsUsed.push("C");
    if (config.category_definition) sectionsUsed.push("D");
    if (config.strategic_intent) sectionsUsed.push("E");
    if (config.channel_priorities) sectionsUsed.push("F");
    if (config.negative_scope) sectionsUsed.push("G");
    if (config.score_thresholds) sectionsUsed.push("H");

    const timingRecommendationStr = bestMonths.length > 0
        ? `Optimal timing: ${bestMonths.join(", ")}. Avoid: ${avoidMonths.join(", ") || "N/A"}. Next window: ${nextOptimalWindow || "N/A"}.`
        : "No clear timing pattern detected.";

    return {
        brandDomain,
        categories,
        cagr_5y: avgCagr,
        trend_direction: overallDirection,
        peak_months: bestMonths,
        timing_recommendation: timingRecommendationStr,
        investment_signal: investmentSignal,
        investment_rationale: generateInvestmentRationale(avgCagr, overallDirection, investmentSignal, validCategories),
        timing_details: {
            best_months: bestMonths,
            avoid_months: avoidMonths,
            next_optimal_window: nextOptimalWindow,
        },
        trace: {
            sectionsUsed,
            sectionsMissing,
            filtersApplied: demandData.trace.filtersApplied,
            rulesTriggered: ["cagr_classification", "investment_signal", "timing_optimization"],
        },
        metadata: {
            fetched_at: new Date().toISOString(),
            data_source: demandData.provider,
            time_range: timeRange,
        },
    };
}
