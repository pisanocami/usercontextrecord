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
    const dbConfig = await storage.getConfiguration(configId);
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
                // Call Real Brand Attention Logic
                resultData = await analyzeBrandAttention(config, {
                    limitPerDomain: inputs.limitPerDomain,
                    locationCode: inputs.locationCode
                });
                break;

            // --- Batch 1: SEO Signals ---
            case "seo.priority_scoring.v1":
                resultData = await analyzePriorityScoring(config, inputs);
                break;
            case "seo.category_visibility.v1":
                resultData = await analyzeCategoryVisibility(config, inputs);
                break;
            case "seo.link_authority.v1":
                resultData = await analyzeLinkAuthority(config, inputs);
                break;
            case "seo.os_drop.v1":
                resultData = await analyzeOSDrop(config, inputs);
                break;
            case "seo.deprioritization.v1":
                resultData = await analyzeDeprioritization(config, inputs);
                break;

            // --- Batch 2: Market Signals ---
            case "market.share_of_voice.v1":
                resultData = await analyzeShareOfVoice(config, inputs);
                break;
            case "market.branded_demand.v1":
                resultData = await analyzeBrandedDemand(config, inputs);
                break;
            case "market.breakout_terms.v1":
                resultData = await analyzeBreakoutTerms(config, inputs);
                break;
            case "market.competitor_strategy.v1":
                resultData = await analyzeCompetitorStrategy(config, inputs);
                break;
            case "market.emerging_competitor.v1":
                resultData = await analyzeEmergingCompetitor(config, inputs);
                break;
            case "market.market_momentum.v1":
                resultData = await analyzeMarketMomentum(config, inputs);
                break;

            // --- Yet to Implement (Batch 3: Synthesis & Action) ---

            case "sem.action_card.v1":
                resultData = {
                    actions: [],
                    prioritization: "none",
                    message: "Action Card logic not yet implemented."
                };
                break;

            case "sem.paid_organic_overlap.v1":
                resultData = {
                    cannibalization_score: 0,
                    savings_opportunities: [],
                    message: "Paid/Organic Overlap logic not yet implemented."
                };
                break;

            case "synthesis.strategic_summary.v1":
                resultData = {
                    strategic_narrative: "",
                    key_findings: [],
                    message: "Strategic Summary logic not yet implemented."
                };
                break;

            default:
                // Fallback
                throw new Error(`Module implementation for "${moduleId}" is not yet connected to the runner.`);
        }
    } catch (err: any) {
        console.error(`Module Execution Error [${moduleId}]:`, err);
        return wrapModuleOutput(null, context, err.message || "Unknown Module Execution Error");
    }

    // 4. Return Wrapped Output
    return wrapModuleOutput(resultData, context);
}
