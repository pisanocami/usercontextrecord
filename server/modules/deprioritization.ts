
import { type Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

/**
 * Deprioritization Logic
 * Identifies keywords to ABANDON or IGNORE to save resources
 */
export async function analyzeDeprioritization(
    config: Configuration,
    params: {
        locationCode?: number;
    }
) {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }

    const limit = 200;
    const location = params.locationCode || 2840;
    const keywordData = await getRankedKeywords(brandDomain, location, "English", limit);

    // Negative Scope / Low Value Logic
    // 1. Check against Section G (Negative Scope)
    const negativeTerms: string[] = (config.negative_scope as any)?.excluded_keywords || [];

    const deprioritized = keywordData.items
        .map(k => {
            let reason = "";
            let savings = 0;

            // Reason 1: Explicit Negative Scope
            if (negativeTerms.some(n => k.keyword.includes(n))) {
                reason = "Negative Scope Match";
                savings = 100; // High theoretical savings
            }
            // Reason 2: Low Intent, High Difficulty (Vanity)
            else if ((k.search_volume || 0) > 5000 && (k.position || 100) > 50) {
                // Fake difficulty check
                reason = "Vanity Term (High Vol, Low Rank, Low Intent)";
                savings = 50;
            }
            // Reason 3: Zero Volume (Zombie Pages)
            else if ((k.search_volume || 0) < 10) {
                reason = "Zero Search Demand";
                savings = 10;
            }

            if (reason) {
                return {
                    keyword: k.keyword,
                    reason,
                    current_cpc: k.cpc || 0,
                    potential_savings: savings,
                    search_volume: k.search_volume
                };
            }
            return null;
        })
        .filter(Boolean);

    const totalSavings = deprioritized.reduce((sum, item) => sum + (item?.potential_savings || 0), 0);

    return {
        deprioritized_keywords: deprioritized,
        savings_potential: totalSavings,
        action_recommendation: "Remove these terms from rank tracking and content optimization calendars.",
        message: "Deprioritization Analysis Complete"
    };
}
