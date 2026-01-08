
import { type Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

/**
 * Category Visibility Logic
 * Aggregates visibility metrics by "Demand Theme" or "Category" (Section B/D)
 */
export async function analyzeCategoryVisibility(
    config: Configuration,
    params: {
        locationCode?: number;
    }
) {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }

    // 1. Fetch Keywords
    const limit = 500; // Larger sample for category analysis
    const location = params.locationCode || 2840;
    const keywordData = await getRankedKeywords(brandDomain, location, "English", limit);

    // 2. Group by Category (Section B / D)
    // We use simple heuristic matching against configured "Demand Themes"
    const themes = (config.demand_definition as any)?.themes || [];
    const categoryStats: Record<string, { count: number, totalVol: number, sumPos: number }> = {};

    // Initialize generic bucket
    categoryStats["Other"] = { count: 0, totalVol: 0, sumPos: 0 };
    themes.forEach((t: any) => {
        // Handle both string and object structure for themes
        const name = typeof t === 'string' ? t : t.name;
        categoryStats[name] = { count: 0, totalVol: 0, sumPos: 0 };
    });

    keywordData.items.forEach(k => {
        let matched = "Other";
        for (const t of themes) {
            const name = typeof t === 'string' ? t : t.name;
            const terms = typeof t === 'string' ? [t] : (t.keywords || [t.name]);

            if (terms.some((term: string) => k.keyword.toLowerCase().includes(term.toLowerCase()))) {
                matched = name;
                break;
            }
        }

        const stats = categoryStats[matched];
        stats.count++;
        stats.totalVol += (k.search_volume || 0);
        stats.sumPos += (k.position || 100);
    });

    // 3. calculate Scores per Category
    const ranking_distribution: Record<string, any> = {};
    let total_visibility = 0;

    Object.entries(categoryStats).forEach(([cat, stats]) => {
        if (stats.count === 0) return;

        const avgPos = stats.sumPos / stats.count;
        // Simple Visibility Score: Volume weighted by inverse position
        // Real formula would be more complex (CTR curve)
        const visiblePct = Math.max(0, 100 - avgPos);

        ranking_distribution[cat] = {
            keyword_count: stats.count,
            average_position: Math.round(avgPos * 10) / 10,
            search_volume_share: stats.totalVol,
            visibility_index: Math.round(visiblePct)
        };

        total_visibility += visiblePct;
    });

    const activeCategories = Object.keys(ranking_distribution).length;
    const overallScore = activeCategories > 0 ? Math.round(total_visibility / activeCategories) : 0;

    return {
        visibility_score: overallScore,
        ranking_distribution,
        active_categories: activeCategories,
        message: "Category Visibility Analysis Complete"
    };
}
