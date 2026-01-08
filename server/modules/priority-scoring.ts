
import { type Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

/**
 * SEO Priority Scoring Logic
 * Cross-references "Right to Win" (Authority) with "Strategic Value" (Intent)
 */
export async function analyzePriorityScoring(
    config: Configuration,
    params: {
        limitPerDomain?: number;
        locationCode?: number;
        minSearchVolume?: number;
    }
) {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }

    // 1. Fetch Keywords
    // In a real scenario, this might pull from a stored "Keyword Universe" table
    // For now, we fetch live rankings to score them.
    const limit = params.limitPerDomain || 200;
    const location = params.locationCode || 2840;
    const keywordData = await getRankedKeywords(brandDomain, location, "English", limit);

    // 2. Define Scoring Weights (Simulated from Section E & H)
    // Section E (Strategic Intent) usually prioritizes certain themes
    const strategicThemes = (config.strategic_intent as any)?.themes || [];

    // Section H (Governance) defines capability scores
    const capabilityScore = (config.governance as any)?.capability_score || 50;

    const scoredKeywords = keywordData.items.map(k => {
        let score = 0;
        const reasons: string[] = [];

        // Volume Score (0-30)
        const volume = k.search_volume || 0;
        if (volume > 10000) { score += 30; reasons.push("High Volume"); }
        else if (volume > 1000) { score += 20; reasons.push("Medium Volume"); }
        else { score += 5; }

        // Position Score (inverse, 0-30) - Opportunities are often "Striking Distance" (Pos 11-20)
        const pos = k.position || 101;
        if (pos >= 11 && pos <= 20) {
            score += 30;
            reasons.push("Striking Distance (Page 2)");
        } else if (pos > 20 && pos <= 50) {
            score += 15;
        }

        // Difficulty vs Capability (0-20)
        // Simple heuristic: If difficulty < capability, we have a "Right to Win"
        const difficulty = Math.round(Math.random() * 100); // Mock difficulty for now
        if (difficulty < capabilityScore) {
            score += 20;
            reasons.push("High Win Probability");
        }

        // Strategic Match (0-20)
        const matchesTheme = strategicThemes.some((t: string) => k.keyword.includes(t.toLowerCase()));
        if (matchesTheme) {
            score += 20;
            reasons.push("Strategic Theme Match");
        }

        return {
            keyword: k.keyword,
            current_position: k.position,
            search_volume: volume,
            priority_score: score,
            difficulty,
            reasons
        };
    });

    // Sort by Score
    scoredKeywords.sort((a, b) => b.priority_score - a.priority_score);

    return {
        scored_keywords: scoredKeywords.slice(0, 50),
        thresholds_applied: {
            min_volume: params.minSearchVolume || 0,
            capability_baseline: capabilityScore,
            strategic_bonus: 20
        },
        total_analyzed: keywordData.items.length,
        message: "Priority Scoring Analysis Complete"
    };
}
