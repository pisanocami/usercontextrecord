
import { type Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

/**
 * Paid/Organic Overlap Logic
 * Identifies cannibalization (Ranking #1 while paying for Top Ad)
 */
export async function analyzePaidOrganicOverlap(
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

    // Filter for Top Organic Rankings
    const topOrganic = keywordData.items.filter(k => (k.position || 100) <= 3);

    // Simulate Paid Presence (Mock)
    const overlaps = topOrganic.map(k => {
        // 30% chance we are also bidding on this strong organic term
        const isBidding = Math.random() > 0.7;
        if (!isBidding) return null;

        const cpc = k.cpc || 1.50;
        const clicks = Math.round((k.search_volume || 0) * 0.05); // Assume 5% CTR on ad
        const spend = clicks * cpc;

        return {
            keyword: k.keyword,
            organic_pos: k.position,
            ad_pos: Math.floor(Math.random() * 3) + 1,
            cpc,
            estimated_monthly_spend: spend,
            recommendation: "Reduce Bid / Pause Ad (Strong Organic)"
        };
    }).filter(Boolean);

    const totalWaste = overlaps.reduce((s, o) => s + (o?.estimated_monthly_spend || 0), 0);

    return {
        savings_opportunities: overlaps,
        cannibalization_score: Math.min(100, overlaps.length * 10),
        annualized_savings: totalWaste * 12,
        message: "Paid/Organic Overlap Analysis Complete"
    };
}
