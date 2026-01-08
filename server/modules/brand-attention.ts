
import { type Configuration } from "@shared/schema";
import { getRankedKeywords, checkCredentialsConfigured } from "../dataforseo";

/**
 * Brand Attention / Share of Voice Logic
 * Extracted from legacy /api/visibility-report
 */
export async function analyzeBrandAttention(
    config: Configuration,
    params: {
        limitPerDomain?: number;
        locationCode?: number;
    }
) {
    if (!checkCredentialsConfigured()) {
        throw new Error("DataForSEO credentials not configured.");
    }

    const limitPerDomain = params.limitPerDomain || 100;
    const locationCode = params.locationCode || 2840;

    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }

    const approvedCompetitors = (config.competitors?.competitors || [])
        .filter((c: any) => c.status === "approved")
        .slice(0, 5);

    if (approvedCompetitors.length === 0) {
        throw new Error("No approved competitors in configuration");
    }

    // Fetch data for brand
    const brandKeywords = await getRankedKeywords(brandDomain, locationCode, "English", limitPerDomain);

    // Helper metrics calculator
    const calculateVisibilityMetrics = (keywords: typeof brandKeywords.items) => {
        const top3 = keywords.filter(k => k.position && k.position <= 3).length;
        const top10 = keywords.filter(k => k.position && k.position <= 10).length;
        const top20 = keywords.filter(k => k.position && k.position <= 20).length;
        const top100 = keywords.filter(k => k.position && k.position <= 100).length;
        const notRanking = keywords.filter(k => !k.position || k.position > 100).length;

        const rankedKeywords = keywords.filter(k => k.position && k.position <= 100);
        const avgPosition = rankedKeywords.length > 0
            ? rankedKeywords.reduce((sum, k) => sum + (k.position || 0), 0) / rankedKeywords.length
            : 0;

        const visibilityScore = Math.round(
            ((top3 * 100) + (top10 * 50) + (top20 * 20) + (top100 * 5)) / Math.max(keywords.length, 1)
        );

        return { top3, top10, top20, top100, notRanking, avgPosition: Math.round(avgPosition * 10) / 10, visibilityScore };
    };

    const brandMetrics = calculateVisibilityMetrics(brandKeywords.items);

    // Fetch data for competitors
    const competitorResults = await Promise.all(
        approvedCompetitors.map(async (comp: any) => {
            try {
                const compKeywords = await getRankedKeywords(comp.domain, locationCode, "English", limitPerDomain);
                const metrics = calculateVisibilityMetrics(compKeywords.items);
                return {
                    domain: comp.domain,
                    name: comp.name,
                    totalKeywords: compKeywords.items.length,
                    ...metrics,
                    success: true,
                };
            } catch (error: any) {
                return {
                    domain: comp.domain,
                    name: comp.name,
                    totalKeywords: 0,
                    top3: 0, top10: 0, top20: 0, top100: 0, notRanking: 0,
                    avgPosition: 0,
                    visibilityScore: 0,
                    success: false,
                    error: error.message,
                };
            }
        })
    );

    // Cross-reference keywords
    const allKeywords = new Map<string, {
        keyword: string;
        searchVolume: number;
        brandPosition: number | null;
        competitorPositions: { domain: string; position: number | null }[];
    }>();

    brandKeywords.items.forEach(k => {
        allKeywords.set(k.keyword.toLowerCase(), {
            keyword: k.keyword,
            searchVolume: k.search_volume || 0,
            brandPosition: k.position || null,
            competitorPositions: [],
        });
    });

    for (const comp of approvedCompetitors) {
        try {
            const compKeywords = await getRankedKeywords(comp.domain, locationCode, "English", limitPerDomain);
            compKeywords.items.forEach(k => {
                const existing = allKeywords.get(k.keyword.toLowerCase());
                if (existing) {
                    existing.competitorPositions.push({ domain: comp.domain, position: k.position || null });
                } else {
                    allKeywords.set(k.keyword.toLowerCase(), {
                        keyword: k.keyword,
                        searchVolume: k.search_volume || 0,
                        brandPosition: null,
                        competitorPositions: [{ domain: comp.domain, position: k.position || null }],
                    });
                }
            });
        } catch (error) {
            console.error(`Error fetching keywords for competitor ${comp.domain}:`, error);
        }
    }

    const keywordAnalysis = Array.from(allKeywords.values())
        .map(k => {
            let opportunity: "high" | "medium" | "low" = "low";
            let opportunityReason = "";

            const bestCompPos = Math.min(
                ...k.competitorPositions.filter(p => p.position !== null).map(p => p.position!)
            );

            if (k.brandPosition === null || k.brandPosition > 50) {
                if (bestCompPos <= 10) {
                    opportunity = "high";
                    opportunityReason = "Competitor ranks top 10, brand missing or weak";
                } else if (bestCompPos <= 30) {
                    opportunity = "medium";
                    opportunityReason = "Competitor ranks top 30, room to compete";
                }
            } else if (k.brandPosition > 10 && bestCompPos <= 5) {
                opportunity = "medium";
                opportunityReason = "Competitor outranks brand significantly";
            }

            return {
                ...k,
                difficulty: Math.min(100, Math.round((k.searchVolume / 1000) * 10 + Math.random() * 30)),
                opportunity,
                opportunityReason,
            };
        })
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 200);

    const brandAdvantage = keywordAnalysis.filter(k => {
        if (!k.brandPosition) return false;
        const bestComp = Math.min(...k.competitorPositions.filter(p => p.position !== null).map(p => p.position!));
        return k.brandPosition < bestComp;
    }).length;

    const competitorAdvantage = keywordAnalysis.filter(k => {
        if (!k.brandPosition) return true;
        const bestComp = Math.min(...k.competitorPositions.filter(p => p.position !== null).map(p => p.position!));
        return bestComp < k.brandPosition;
    }).length;

    return {
        brand: {
            domain: brandDomain,
            name: config.brand?.name || brandDomain,
            totalKeywords: brandKeywords.items.length,
            ...brandMetrics,
        },
        competitors: competitorResults.filter(c => c.success),
        keywordAnalysis,
        summary: {
            totalKeywordsAnalyzed: keywordAnalysis.length,
            brandAdvantage,
            competitorAdvantage,
            sharedKeywords: keywordAnalysis.filter(k =>
                k.brandPosition !== null && k.competitorPositions.some(p => p.position !== null)
            ).length,
            uniqueOpportunities: keywordAnalysis.filter(k => k.opportunity === "high").length,
        },
        // Adding message to indicate successful module execution
        message: "Brand Attention Analysis Completed",
        contextStatus: config.governance?.context_status || "DRAFT_AI",
        configurationName: config.name,
    };
}
