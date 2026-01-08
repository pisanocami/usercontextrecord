
import { type Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

/**
 * OS Drop Logic
 * Detects significant negative movement in rankings
 */
export async function analyzeOSDrop(
    config: Configuration,
    params: {
        locationCode?: number;
        dropThreshold?: number;
    }
) {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }

    const limit = 200;
    const location = params.locationCode || 2840;
    const threshold = params.dropThreshold || 5;

    // 1. Fetch Current State
    const keywordData = await getRankedKeywords(brandDomain, location, "English", limit);

    // 2. Simulate "Previous State" for demo purposes
    // In real system, this fetches from historical DB
    const dropEvents: any[] = [];

    keywordData.items.forEach(k => {
        // 20% chance of a "drop" for simulation
        if (Math.random() > 0.8) {
            const currentPos = k.position || 10;
            const previousPos = Math.max(1, currentPos - (threshold + Math.floor(Math.random() * 10)));
            const dropSize = currentPos - previousPos;

            dropEvents.push({
                keyword: k.keyword,
                current_position: currentPos,
                previous_position: previousPos,
                drop_size: dropSize,
                url: k.url,
                search_volume: k.search_volume
            });
        }
    });

    // Sort by biggest drop impact (Volume * Drop Size)
    dropEvents.sort((a, b) => (b.drop_size * b.search_volume) - (a.drop_size * a.search_volume));

    // 3. Generate Recovery Plan
    const highPriorityDrops = dropEvents.filter(d => d.drop_size > 10 && d.search_volume > 1000);

    return {
        drop_events: dropEvents.slice(0, 50),
        total_drops: dropEvents.length,
        recovery_plan: {
            immediate_action_count: highPriorityDrops.length,
            primary_diagnosis: highPriorityDrops.length > 5 ? "Technical SEO Issue" : "Content Decay / Competition",
            affected_urls: [...new Set(dropEvents.map(d => d.url))].slice(0, 5)
        },
        message: "OS Drop Analysis Complete"
    };
}
