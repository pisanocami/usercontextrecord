import { storage } from "./storage";
import { CONTRACT_REGISTRY } from "@shared/module.contract";
import type { Configuration } from "@shared/schema";
import {
    validateModuleExecution,
    createExecutionContext,
    wrapModuleOutput,
    ModuleOutputWrapper
} from "./execution-gateway";

// Import Real Implementations
import { computeKeywordGap } from "./keyword-gap-lite";
import { marketDemandAnalyzer } from "./market-demand-analyzer";
import { analyzeBrandAttention } from "./modules/brand-attention";

// Batch 1 Imports (SEO Signals)
import { analyzePriorityScoring } from "./modules/priority-scoring";
import { analyzeCategoryVisibility } from "./modules/category-visibility";
import { analyzeLinkAuthority } from "./modules/link-authority";
import { analyzeOSDrop } from "./modules/os-drop";
import { analyzeDeprioritization } from "./modules/deprioritization";

// Batch 2 Imports (Market Signals)
import { analyzeShareOfVoice } from "./modules/share-of-voice";
import { analyzeBreakoutTerms } from "./modules/breakout-terms";
import { analyzeBrandedDemand } from "./modules/branded-demand";
import { analyzeCompetitorStrategy } from "./modules/competitor-strategy";
import { analyzeEmergingCompetitor } from "./modules/emerging-competitor";
import { analyzeMarketMomentum } from "./modules/market-momentum";
import { analyzeCategoryDemandTrend } from "./modules/category-demand-trend";

// Batch 3 Imports (Synthesis & Action)
import { analyzeActionCard } from "./modules/action-card";
import { analyzePaidOrganicOverlap } from "./modules/paid-organic-overlap";
import { analyzeStrategicSummary } from "./modules/strategic-summary";

// Intelligence Modules (Multi-API)
import { analyzeIntentPositioning } from "./modules/intel/intent-positioning";
import { analyzeSerpTrendsSocial } from "./modules/intel/serp-trends-social";
import { analyzeDemandForecasting } from "./modules/intel/demand-forecasting";
import { analyzeCrossChannelMessaging } from "./modules/intel/cross-channel-messaging";
import { analyzeSerpAttribution } from "./modules/intel/serp-attribution";


/**
 * Orchestrates the execution of a module.
 * 1. Fetches Context (UCR).
 * 2. Validates Module Contract (Gates).
 * 3. Dispatches to specific implementation.
 * 4. Refines Output with UCR Traceability.
 */
export async function runModule(
    moduleId: string,
    configId: number,
    inputs: any = {}
): Promise<ModuleOutputWrapper<any>> {

    // 1. Fetch Configuration (UCR)
    // FIXED: Use getConfigurationById and ensure configId is a number
    const dbConfig = await storage.getConfigurationById(Number(configId));
    if (!dbConfig) {
        throw new Error(`Configuration ${configId} not found`);
    }

    // Convert DbConfiguration to Schema Configuration (Type Mismatch Fix)
    // Ensure IDs are strings as expected by Zod schema, even if DB uses numbers
    const config: Configuration = {
        ...dbConfig,
        id: String(dbConfig.id),
        created_at: dbConfig.created_at.toISOString(),
        updated_at: dbConfig.updated_at.toISOString()
    };

    // 2. Validate Module Contract
    const validation = validateModuleExecution(moduleId, config);
    if (!validation.isValid) {
        return wrapModuleOutput(
            null,
            createExecutionContext(moduleId, config, validation.availableSections),
            `Execution Gate Failed: ${validation.warnings.concat(validation.missingDetails.map(d => `Missing ${d.section}`)).join(", ")}`
        );
    }

    // 3. Dispatch Execution
    const context = createExecutionContext(moduleId, config, validation.availableSections);
    let resultData = null;

    try {
        switch (moduleId) {
            case "seo.keyword_gap_visibility.v1":
                // Call Real Keyword Gap Logic
                resultData = await computeKeywordGap(config, {
                    limitPerDomain: inputs.limitPerDomain || 100,
                    maxCompetitors: inputs.maxCompetitors || 3,
                    locationCode: inputs.locationCode || 2840,
                    languageCode: inputs.languageCode || "en"
                });
                break;

            case "market.demand_seasonality.v1":
                // Call Real Market Demand Logic (Category Analysis)
                resultData = await marketDemandAnalyzer.analyzeByCategory(config, {
                    timeRange: inputs.timeRange || "today 5-y",
                    countryCode: inputs.countryCode,
                    excludedCategories: inputs.excludedCategories || []
                });
                break;

            case "brand.attention.v1":
            case "brand.attention_share.v1":
                // Call Real Brand Attention Logic
                resultData = await analyzeBrandAttention(config, {
                    limitPerDomain: inputs.limitPerDomain,
                    locationCode: inputs.locationCode
                });
                break;

            // --- Batch 1: SEO Signals ---
            case "seo.priority_scoring.v1":
            case "action.priority_scoring.v1": // Legacy alias
                resultData = await analyzePriorityScoring(config, inputs);
                break;
            case "seo.category_visibility.v1":
            case "signal.category_visibility.v1": // Legacy alias
                resultData = await analyzeCategoryVisibility(config, inputs);
                break;
            case "seo.link_authority.v1":
            case "signal.link_authority.v1": // Legacy alias
                resultData = await analyzeLinkAuthority(config, inputs);
                break;
            case "seo.os_drop.v1":
            case "synthesis.os_drop.v1": // Legacy alias
                resultData = await analyzeOSDrop(config, inputs);
                break;
            case "seo.deprioritization.v1":
            case "action.deprioritization.v1": // Legacy alias
                resultData = await analyzeDeprioritization(config, inputs);
                break;

            // --- Batch 2: Market Signals ---
            case "market.share_of_voice.v1":
            case "signal.share_of_voice.v1": // Legacy alias
                resultData = await analyzeShareOfVoice(config, inputs);
                break;
            case "market.branded_demand.v1":
            case "signal.branded_demand.v1": // Legacy alias
                resultData = await analyzeBrandedDemand(config, inputs);
                break;
            case "market.breakout_terms.v1":
            case "signal.breakout_terms.v1": // Legacy alias
                resultData = await analyzeBreakoutTerms(config, inputs);
                break;
            case "market.competitor_strategy.v1":
            case "signal.competitor_strategy.v1": // Legacy alias
                resultData = await analyzeCompetitorStrategy(config, inputs);
                break;
            case "market.emerging_competitor.v1":
            case "signal.emerging_competitor.v1": // Legacy alias
                resultData = await analyzeEmergingCompetitor(config, inputs);
                break;
            case "market.market_momentum.v1":
            case "signal.market_momentum.v1": // Legacy alias
                resultData = await analyzeMarketMomentum(config, inputs);
                break;

            case "market.category_demand_trend.v1":
                resultData = await analyzeCategoryDemandTrend(config, {
                    timeRange: inputs.timeRange || "today 5-y",
                    countryCode: inputs.countryCode,
                    excludedCategories: inputs.excludedCategories || []
                });
                break;

            // --- Batch 3: Synthesis & Action ---
            case "sem.action_card.v1":
            case "action.card_generator.v1": // Legacy alias
                resultData = await analyzeActionCard(config, inputs);
                break;

            case "sem.paid_organic_overlap.v1":
            case "signal.paid_organic.v1": // Legacy alias
                resultData = await analyzePaidOrganicOverlap(config, inputs);
                break;

            case "synthesis.strategic_summary.v1":
                resultData = await analyzeStrategicSummary(config, inputs);
                break;

            // --- Intelligence Modules (Multi-API) ---
            case "intel.intent_positioning.v1":
                resultData = await analyzeIntentPositioning(config, inputs);
                break;
            case "intel.serp_trends_social.v1":
                resultData = await analyzeSerpTrendsSocial(config, inputs);
                break;
            case "intel.demand_forecasting.v1":
                resultData = await analyzeDemandForecasting(config, inputs);
                break;
            case "intel.cross_channel_messaging.v1":
                resultData = await analyzeCrossChannelMessaging(config, inputs);
                break;
            case "intel.serp_attribution.v1":
                resultData = await analyzeSerpAttribution(config, inputs);
                break;

            default:
                // Fallback for completely unknown modules
                throw new Error(`Module implementation for "${moduleId}" is not yet connected to the runner.`);
        }
    } catch (err: any) {
        console.error(`Module Execution Error [${moduleId}]:`, err);
        return wrapModuleOutput(null, context, err.message || "Unknown Module Execution Error");
    }

    // 4. Return Wrapped Output
    return wrapModuleOutput(resultData, context);
}
