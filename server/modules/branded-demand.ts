
import { type Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

/**
 * Branded Demand Logic
 * Isolates and analyzes brand-specific search volume
 */
export async function analyzeBrandedDemand(
    config: Configuration,
    params: {
        locationCode?: number;
    }
) {
    const brandDomain = config.brand?.domain;
    const brandName = config.brand?.name || brandDomain?.split('.')[0];

    if (!brandDomain || !brandName) {
        throw new Error("Configuration has no brand domain/name defined");
    }

    const limit = 500;
    const location = params.locationCode || 2840;
    const brandData = await getRankedKeywords(brandDomain, location, "English", limit);

    // Filter for Brand Name Matches
    const brandedKeywords = brandData.items.filter(k =>
        k.keyword.toLowerCase().includes(brandName.toLowerCase())
    );

    const totalBrandedVol = brandedKeywords.reduce((sum, k) => sum + (k.search_volume || 0), 0);

    // Simulate Sentiment (Mock)
    const sentiment = {
        positive: Math.round(totalBrandedVol * 0.6),
        neutral: Math.round(totalBrandedVol * 0.3),
        negative: Math.round(totalBrandedVol * 0.1)
    };

    return {
        branded_trends: [
            { label: "Total Branded Volume", value: totalBrandedVol },
            { label: "Unique Branded Terms", value: brandedKeywords.length }
        ],
        top_branded_terms: brandedKeywords.slice(0, 10).map(k => ({ term: k.keyword, vol: k.search_volume })),
        sentiment_analysis: sentiment,
        message: "Branded Demand Analysis Complete"
    };
}
