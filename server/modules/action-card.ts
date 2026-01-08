
import { type Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

/**
 * Action Card Logic
 * Converts high-value opportunities into executable tickets
 */
export async function analyzeActionCard(
    config: Configuration,
    params: {
        locationCode?: number;
        maxActions?: number;
    }
) {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }

    const limit = 200;
    const location = params.locationCode || 2840;

    // Fetch keywords
    const keywordData = await getRankedKeywords(brandDomain, location, "English", limit);

    // Identify "Quick Wins" (Page 2 rankings with high volume)
    const quickWins = keywordData.items.filter(k =>
        (k.position || 100) > 10 && (k.position || 100) <= 20 && (k.search_volume || 0) > 1000
    );

    const actions = quickWins.map((k, i) => ({
        id: `ACT-${1000 + i}`,
        title: `Optimize for "${k.keyword}"`,
        type: "Optimization",
        priority: (k.search_volume || 0) > 5000 ? "High" : "Medium",
        context: `Ranking #${k.position} with ${k.search_volume} monthly searches.`,
        effort: "Low",
        assignee: "Content Team"
    })).slice(0, params.maxActions || 10);

    return {
        actions,
        prioritization: actions.length > 0 ? "High Impact" : "Maintenance",
        total_opportunities: quickWins.length,
        message: "Action Card Generation Complete"
    };
}
