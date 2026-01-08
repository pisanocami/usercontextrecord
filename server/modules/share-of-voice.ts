
import { type Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

/**
 * Share of Voice Logic
 * Calculates strict market share based on impression volume (Click Share/Impression Share)
 */
export async function analyzeShareOfVoice(
    config: Configuration,
    params: {
        locationCode?: number;
    }
) {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }

    const limit = 500;
    const location = params.locationCode || 2840;

    // 1. Fetch Brand Data
    const brandData = await getRankedKeywords(brandDomain, location, "English", limit);

    // 2. Fetch Competitor Data (Top 3)
    const competitors = (config.competitors?.competitors || []).slice(0, 3);
    const compData = await Promise.all(competitors.map(async (c: any) => {
        try {
            const res = await getRankedKeywords(c.domain, location, "English", limit);
            return { name: c.name, data: res.items };
        } catch {
            return { name: c.name, data: [] };
        }
    }));

    // 3. Calculate "Total Market" approximation
    // Union of all unique keywords found across brand + competitors
    const uniqueKeywords = new Set<string>();
    brandData.items.forEach(k => uniqueKeywords.add(k.keyword));
    compData.forEach(c => c.data.forEach((k: any) => uniqueKeywords.add(k.keyword)));

    const marketSize = uniqueKeywords.size;

    // 4. Calculate Share
    const kpi = (items: any[]) => items.filter((k: any) => (k.position || 100) <= 20).length;

    const brandShare = kpi(brandData.items);
    const totalShare = brandShare + compData.reduce((sum, c) => sum + kpi(c.data), 0);

    const finalMetrics = {
        [config.brand?.name || "My Brand"]: Math.round((brandShare / totalShare) * 100) || 0
    };

    compData.forEach(c => {
        finalMetrics[c.name] = Math.round((kpi(c.data) / totalShare) * 100) || 0
    });

    return {
        sov_metrics: finalMetrics,
        market_size_keywords: marketSize,
        competitor_comparison: Object.entries(finalMetrics).map(([name, sov]) => ({ name, sov })),
        message: "Share of Voice Analysis Complete"
    };
}
