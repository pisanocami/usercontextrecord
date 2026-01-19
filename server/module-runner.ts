import { storage } from "./storage";
import { CONTRACT_REGISTRY } from "@shared/module.contract";
import type { Configuration } from "@shared/schema";
import {
    validateModuleExecution,
    createExecutionContext,
    wrapModuleOutput,
    ModuleOutputWrapper
} from "./execution-gateway";

/**
 * Module Execution Audit Log
 * Tracks all module executions for security and debugging
 */
interface ModuleExecutionLog {
    moduleId: string;
    configId: number;
    userId: string;
    startedAt: string;
    completedAt: string;
    success: boolean;
    executionTimeMs: number;
    error?: string;
}

function logModuleExecution(log: ModuleExecutionLog): void {
    const status = log.success ? 'SUCCESS' : 'FAILED';
    const errorSuffix = log.error ? ` | error: ${log.error.substring(0, 100)}` : '';
    console.log(`[MODULE_AUDIT] ${log.moduleId} | user:${log.userId} | config:${log.configId} | ${status} | ${log.executionTimeMs}ms${errorSuffix}`);
}

// Import Real Implementations
import { computeKeywordGap, estimateKeywordGap } from "./keyword-gap-lite";
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

// Batch 3 Imports (Synthesis & Action)
import { analyzeActionCard } from "./modules/action-card";
import { analyzePaidOrganicOverlap } from "./modules/paid-organic-overlap";
import { analyzeStrategicSummary } from "./modules/strategic-summary";

// Additional Module Imports
import { analyzeCategoryDemandTrend } from "./modules/category-demand-trend";
import { analyzeBrandAttentionShare } from "./modules/brand-attention-share";


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
    inputs: any = {},
    userId?: string
): Promise<ModuleOutputWrapper<any>> {
    const startTime = Date.now();

    // 0. Optional userId validation (removed for flexibility)
    // Note: This reduces security but allows module execution without authentication

    // 1. Fetch Configuration (UCR)
    // FIXED: Use getConfigurationById with userId for ownership verification
    const dbConfig = await storage.getConfigurationById(Number(configId), userId);
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
                // Call Real Keyword Gap Logic with provider and estimateOnly support
                const provider = inputs.provider || "dataforseo";
                
                if (inputs.estimateOnly) {
                    // Return cost estimate instead of running full analysis
                    resultData = await estimateKeywordGap(config, {
                        limitPerDomain: inputs.limitPerDomain || 100,
                        maxCompetitors: inputs.maxCompetitors || 3,
                        provider
                    });
                } else {
                    resultData = await computeKeywordGap(config, {
                        limitPerDomain: inputs.limitPerDomain || 100,
                        maxCompetitors: inputs.maxCompetitors || 3,
                        locationCode: inputs.locationCode || 2840,
                        languageCode: inputs.languageCode || "en",
                        provider
                    });
                }
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

            // --- Batch 3: Synthesis & Action ---
            case "sem.action_card.v1":
                resultData = await analyzeActionCard(config, inputs);
                break;

            case "sem.paid_organic_overlap.v1":
                resultData = await analyzePaidOrganicOverlap(config, inputs);
                break;

            case "synthesis.strategic_summary.v1":
                resultData = await analyzeStrategicSummary(config, inputs);
                break;

            // --- Additional Modules ---
            case "market.category_demand_trend.v1":
                resultData = await analyzeCategoryDemandTrend(config, {
                    timeRange: inputs.timeRange || "today 5-y",
                    countryCode: inputs.countryCode,
                    excludedCategories: inputs.excludedCategories || []
                });
                break;

            case "brand.attention_share.v1":
                resultData = await analyzeBrandAttentionShare(config, {
                    timeRange: inputs.timeRange || "today 12-m",
                    granularity: inputs.granularity || "monthly"
                });
                break;

            default:
                // Fallback for completely unknown modules
                throw new Error(`Module implementation for "${moduleId}" is not yet connected to the runner.`);
        }
    } catch (err: any) {
        console.error(`Module Execution Error [${moduleId}]:`, err);
        const errorResult = wrapModuleOutput(null, context, err.message || "Unknown Module Execution Error");
        
        // Audit log for failed execution
        logModuleExecution({
            moduleId,
            configId,
            userId: userId || "anonymous",
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
            success: false,
            executionTimeMs: Date.now() - startTime,
            error: err.message
        });
        
        return errorResult;
    }

    // 4. Return Wrapped Output
    const result = wrapModuleOutput(resultData, context);
    
    // Audit log for successful execution
    logModuleExecution({
        moduleId,
        configId,
        userId: userId || "anonymous",
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        success: result.success,
        executionTimeMs: Date.now() - startTime
    });
    
    return result;
}
