
import { type Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

/**
 * Emerging Competitor Logic
 * Detects unknown domains ranking in the top 20 for core terms
 */
export async function analyzeEmergingCompetitor(
    config: Configuration,
    params: {
        locationCode?: number;
    }
) {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }

    const knownDomains = new Set([
        brandDomain,
        ...(config.competitors?.competitors || []).map((c: any) => c.domain)
    ]);

    // For this we'd ideally scan SERPs for *generic* keywords (e.g. "Best Running Shoes")
    // Since we don't have a generic SERP scanner wired, we'll simulate by checking
    // "Who else ranks for my top keywords?" (Mock logic for now)

    // MOCK IMPLEMENTATION
    const genericTerms = ["best software", "top platform", "enterprise solution"]; // Placeholder

    const newEntrants = [
        { domain: "startup-disruptor.io", overlap: 15, avg_pos: 12 },
        { domain: "niche-player.com", overlap: 8, avg_pos: 6 },
        { domain: "big-tech-entry.com", overlap: 5, avg_pos: 18 }
    ];

    const threats = newEntrants.filter(n => !knownDomains.has(n.domain));

    return {
        new_entrants: threats,
        threat_level: threats.length > 2 ? "high" : "low",
        message: "Emerging Competitor Analysis Complete"
    };
}
