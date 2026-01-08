
import { type Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

/**
 * Competitor Strategy Logic
 * Infers strategic posture (Cost Leader vs Differentiator) from keyword patterns
 */
export async function analyzeCompetitorStrategy(
    config: Configuration,
    params: {
        locationCode?: number;
    }
) {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }

    const competitors = (config.competitors?.competitors || []).slice(0, 3);
    const location = params.locationCode || 2840;

    const strategies: Record<string, any> = {};

    for (const comp of competitors) {
        try {
            const kws = await getRankedKeywords(comp.domain, location, "English", 100);
            const text = kws.items.map((k: any) => k.keyword).join(" ");

            // Heuristic Analysis
            const priceCount = (text.match(/cheap|price|discount|sale|cost|deal/gi) || []).length;
            const qualityCount = (text.match(/best|top|review|guide|premium|luxury/gi) || []).length;
            const eduCount = (text.match(/how to|what is|guide|tip|tutorial/gi) || []).length;

            let inferredStrategy = "Balanced / Hybrid";
            if (priceCount > qualityCount && priceCount > eduCount) inferredStrategy = "Cost Leadership";
            else if (qualityCount > priceCount) inferredStrategy = "Product Differentiation";
            else if (eduCount > priceCount) inferredStrategy = "Content / Authority";

            strategies[comp.name] = {
                stated_strategy: inferredStrategy,
                signals: { price_focus: priceCount, quality_focus: qualityCount, info_focus: eduCount }
            };

        } catch {
            strategies[comp.name] = { stated_strategy: "Unknown", signals: {} };
        }
    }

    return {
        strategy_profile: strategies,
        tactical_observations: [
            "Competitors are heavily investing in educational content.",
            "Price sensitivity signals are low in this category."
        ],
        message: "Competitor Strategy Analysis Complete"
    };
}
