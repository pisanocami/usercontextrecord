/**
 * Module Registry Initialization
 * Registers all module handlers with the central registry
 */

import { moduleRegistry } from "../module-registry";
import type { ModuleHandler } from "../module-handler";
import { z } from "zod";

// Import schemas
import {
    PriorityScoringInputSchema,
    CategoryVisibilityInputSchema,
    LinkAuthorityInputSchema,
    OSDropInputSchema,
    DeprioritizationInputSchema,
    ShareOfVoiceInputSchema,
    BrandedDemandInputSchema,
    BreakoutTermsInputSchema,
    CompetitorStrategyInputSchema,
    EmergingCompetitorInputSchema,
    MarketMomentumInputSchema,
    ActionCardInputSchema,
    PaidOrganicOverlapInputSchema,
    StrategicSummaryInputSchema,
    KeywordGapInputSchema,
    MarketDemandInputSchema,
    BrandAttentionInputSchema
} from "./common-schemas";

// Import module implementations
import { analyzePriorityScoring } from "./priority-scoring";
import { analyzeCategoryVisibility } from "./category-visibility";
import { analyzeLinkAuthority } from "./link-authority";
import { analyzeOSDrop } from "./os-drop";
import { analyzeDeprioritization } from "./deprioritization";
import { analyzeShareOfVoice } from "./share-of-voice";
import { analyzeBrandedDemand } from "./branded-demand";
import { analyzeBreakoutTerms } from "./breakout-terms";
import { analyzeCompetitorStrategy } from "./competitor-strategy";
import { analyzeEmergingCompetitor } from "./emerging-competitor";
import { analyzeMarketMomentum } from "./market-momentum";
import { analyzeActionCard } from "./action-card";
import { analyzePaidOrganicOverlap } from "./paid-organic-overlap";
import { analyzeStrategicSummary } from "./strategic-summary";
import { analyzeBrandAttention } from "./brand-attention";
import { computeKeywordGap } from "../keyword-gap-lite";
import { marketDemandAnalyzer } from "../market-demand-analyzer";

// Define module handlers
const modules: ModuleHandler[] = [
    // SEO Modules
    {
        id: "seo.priority_scoring.v1",
        name: "Priority Scoring",
        category: "seo",
        inputSchema: PriorityScoringInputSchema,
        execute: async (config, inputs) => analyzePriorityScoring(config, inputs as z.infer<typeof PriorityScoringInputSchema>)
    },
    {
        id: "seo.category_visibility.v1",
        name: "Category Visibility",
        category: "seo",
        inputSchema: CategoryVisibilityInputSchema,
        execute: async (config, inputs) => analyzeCategoryVisibility(config, inputs as z.infer<typeof CategoryVisibilityInputSchema>)
    },
    {
        id: "seo.link_authority.v1",
        name: "Link Authority",
        category: "seo",
        inputSchema: LinkAuthorityInputSchema,
        execute: async (config, inputs) => {
            const typedInputs = inputs as z.infer<typeof LinkAuthorityInputSchema>;
            return analyzeLinkAuthority(config, { targetUrl: typedInputs.targetUrl });
        }
    },
    {
        id: "seo.os_drop.v1",
        name: "OS Drop Detection",
        category: "seo",
        inputSchema: OSDropInputSchema,
        execute: async (config, inputs) => analyzeOSDrop(config, inputs as z.infer<typeof OSDropInputSchema>)
    },
    {
        id: "seo.deprioritization.v1",
        name: "Deprioritization Analysis",
        category: "seo",
        inputSchema: DeprioritizationInputSchema,
        execute: async (config, inputs) => analyzeDeprioritization(config, inputs as z.infer<typeof DeprioritizationInputSchema>)
    },
    {
        id: "seo.keyword_gap_visibility.v1",
        name: "Keyword Gap & Visibility",
        category: "seo",
        inputSchema: KeywordGapInputSchema,
        execute: async (config, inputs) => {
            const typedInputs = inputs as z.infer<typeof KeywordGapInputSchema>;
            return computeKeywordGap(config, {
                limitPerDomain: typedInputs.limitPerDomain || 100,
                maxCompetitors: typedInputs.maxCompetitors || 3,
                locationCode: typedInputs.locationCode || 2840,
                languageCode: typedInputs.languageCode || "en"
            });
        }
    },

    // Market Modules
    {
        id: "market.share_of_voice.v1",
        name: "Share of Voice",
        category: "market",
        inputSchema: ShareOfVoiceInputSchema,
        execute: async (config, inputs) => analyzeShareOfVoice(config, inputs as z.infer<typeof ShareOfVoiceInputSchema>)
    },
    {
        id: "market.branded_demand.v1",
        name: "Branded Demand",
        category: "market",
        inputSchema: BrandedDemandInputSchema,
        execute: async (config, inputs) => analyzeBrandedDemand(config, inputs as z.infer<typeof BrandedDemandInputSchema>)
    },
    {
        id: "market.breakout_terms.v1",
        name: "Breakout Terms",
        category: "market",
        inputSchema: BreakoutTermsInputSchema,
        execute: async (config, inputs) => analyzeBreakoutTerms(config, inputs as z.infer<typeof BreakoutTermsInputSchema>)
    },
    {
        id: "market.competitor_strategy.v1",
        name: "Competitor Strategy",
        category: "market",
        inputSchema: CompetitorStrategyInputSchema,
        execute: async (config, inputs) => analyzeCompetitorStrategy(config, inputs as z.infer<typeof CompetitorStrategyInputSchema>)
    },
    {
        id: "market.emerging_competitor.v1",
        name: "Emerging Competitor",
        category: "market",
        inputSchema: EmergingCompetitorInputSchema,
        execute: async (config, inputs) => analyzeEmergingCompetitor(config, inputs as z.infer<typeof EmergingCompetitorInputSchema>)
    },
    {
        id: "market.market_momentum.v1",
        name: "Market Momentum",
        category: "market",
        inputSchema: MarketMomentumInputSchema,
        execute: async (config, inputs) => analyzeMarketMomentum(config, inputs as z.infer<typeof MarketMomentumInputSchema>)
    },
    {
        id: "market.demand_seasonality.v1",
        name: "Market Demand & Seasonality",
        category: "market",
        inputSchema: MarketDemandInputSchema,
        execute: async (config, inputs) => {
            const typedInputs = inputs as z.infer<typeof MarketDemandInputSchema>;
            return marketDemandAnalyzer.analyzeByCategory(config, {
                timeRange: typedInputs.timeRange || "today 5-y",
                countryCode: typedInputs.countryCode,
                excludedCategories: typedInputs.excludedCategories || []
            });
        }
    },

    // Brand Modules
    {
        id: "brand.attention.v1",
        name: "Brand Attention & Share of Search",
        category: "brand",
        inputSchema: BrandAttentionInputSchema,
        execute: async (config, inputs) => {
            const typedInputs = inputs as z.infer<typeof BrandAttentionInputSchema>;
            return analyzeBrandAttention(config, {
                limitPerDomain: typedInputs.limitPerDomain,
                locationCode: typedInputs.locationCode
            });
        }
    },

    // Action Modules
    {
        id: "sem.action_card.v1",
        name: "Action Cards",
        category: "action",
        inputSchema: ActionCardInputSchema,
        execute: async (config, inputs) => analyzeActionCard(config, inputs as z.infer<typeof ActionCardInputSchema>)
    },
    {
        id: "sem.paid_organic_overlap.v1",
        name: "Paid/Organic Overlap",
        category: "action",
        inputSchema: PaidOrganicOverlapInputSchema,
        execute: async (config, inputs) => analyzePaidOrganicOverlap(config, inputs as z.infer<typeof PaidOrganicOverlapInputSchema>)
    },

    // Synthesis Modules
    {
        id: "synthesis.strategic_summary.v1",
        name: "Strategic Summary",
        category: "synthesis",
        inputSchema: StrategicSummaryInputSchema,
        execute: async (config, inputs) => analyzeStrategicSummary(config, inputs as z.infer<typeof StrategicSummaryInputSchema>)
    }
];

/**
 * Initialize the module registry with all handlers
 */
export function initializeModuleRegistry(): void {
    console.log("[ModuleRegistry] Initializing module registry...");
    
    for (const module of modules) {
        moduleRegistry.register(module);
    }
    
    console.log(`[ModuleRegistry] Registered ${moduleRegistry.list().length} modules: ${moduleRegistry.getIds().join(", ")}`);
}

export { moduleRegistry };
