# Module Center Test Report

**Test Date:** 2026-01-19  
**Configuration Used:** Oofos Context (ID: 72)  
**Configuration Status:** Complete UCR (Sections A-H)

## Executive Summary

| Status | Count | Percentage |
|--------|-------|------------|
| Working | 4 | 12.5% |
| Failing | 28 | 87.5% |
| **Total** | **32** | **100%** |

## Working Modules (4)

| Module ID | Module Name | Layer | Execution Time |
|-----------|-------------|-------|----------------|
| seo.keyword_gap_visibility.v1 | Keyword Gap & Visibility | Signal | 779ms |
| market.category_demand_trend.v1 | Category Demand Trend | Signal | 70,476ms |
| market.demand_seasonality.v1 | Market Demand & Seasonality | Signal | 14ms |
| synthesis.strategic_summary.v1 | Strategic Summary | Synthesis | 4ms |

## Failing Modules (28)

### Category 1: Module ID Mismatch (Registry vs Runner)

These modules have implementations in `module-runner.ts` but use different IDs than CONTRACT_REGISTRY.

| Registry ID (Contract) | Runner ID (Implementation) | Status |
|------------------------|---------------------------|--------|
| signal.branded_demand.v1 | market.branded_demand.v1 | ID Mismatch |
| signal.breakout_terms.v1 | market.breakout_terms.v1 | ID Mismatch |
| signal.category_visibility.v1 | seo.category_visibility.v1 | ID Mismatch |
| signal.competitor_strategy.v1 | market.competitor_strategy.v1 | ID Mismatch |
| signal.emerging_competitor.v1 | market.emerging_competitor.v1 | ID Mismatch |
| signal.link_authority.v1 | seo.link_authority.v1 | ID Mismatch |
| signal.market_momentum.v1 | market.market_momentum.v1 | ID Mismatch |
| signal.paid_organic.v1 | sem.paid_organic_overlap.v1 | ID Mismatch |
| signal.share_of_voice.v1 | market.share_of_voice.v1 | ID Mismatch |
| action.card_generator.v1 | sem.action_card.v1 | ID Mismatch |
| action.priority_scoring.v1 | seo.priority_scoring.v1 | ID Mismatch |
| action.deprioritization.v1 | seo.deprioritization.v1 | ID Mismatch |
| synthesis.os_drop.v1 | seo.os_drop.v1 | ID Mismatch |

### Category 2: Not Registered in CONTRACT_REGISTRY

These modules exist in `module-runner.ts` but aren't registered in CONTRACT_REGISTRY.

| Module ID | Error |
|-----------|-------|
| seo.priority_scoring.v1 | Module not found in registry |
| seo.category_visibility.v1 | Module not found in registry |
| seo.link_authority.v1 | Module not found in registry |
| seo.os_drop.v1 | Module not found in registry |
| seo.deprioritization.v1 | Module not found in registry |
| market.share_of_voice.v1 | Module not found in registry |
| market.branded_demand.v1 | Module not found in registry |
| market.breakout_terms.v1 | Module not found in registry |
| market.competitor_strategy.v1 | Module not found in registry |
| market.emerging_competitor.v1 | Module not found in registry |
| market.market_momentum.v1 | Module not found in registry |
| sem.action_card.v1 | Module not found in registry |
| sem.paid_organic_overlap.v1 | Module not found in registry |
| brand.attention.v1 | Module not found in registry |

### Category 3: Missing Configuration Data

| Module ID | Error |
|-----------|-------|
| brand.attention_share.v1 | No approved competitors in configuration |

## Root Cause Analysis

### Issue 1: ID Namespace Mismatch

**Problem:** CONTRACT_REGISTRY uses `signal.*`, `action.*`, `synthesis.*` prefixes while module-runner.ts uses `seo.*`, `market.*`, `sem.*` prefixes.

**Example:**
- Contract: `signal.market_momentum.v1`
- Runner: `market.market_momentum.v1`

**Solution:** Align the IDs. Either:
1. Update CONTRACT_REGISTRY to use runner IDs, OR
2. Update module-runner.ts switch cases to use contract IDs

### Issue 2: Modules Not in Registry

**Problem:** The execution-gateway validates modules against CONTRACT_REGISTRY before running. Modules not registered fail validation.

**Solution:** Add missing module contracts to CONTRACT_REGISTRY or update existing contracts with correct IDs.

### Issue 3: Configuration Requirements

**Problem:** `brand.attention_share.v1` requires approved competitors but config 72 has competitors in "pending_review" status.

**Solution:** Approve competitors in the configuration or update module to accept pending_review competitors.

## Recommended Fix Priority

1. **HIGH:** Fix ID alignment between CONTRACT_REGISTRY and module-runner.ts (affects 13 modules)
2. **HIGH:** Register missing modules in CONTRACT_REGISTRY (affects 14 modules)
3. **MEDIUM:** Update configuration or module logic for competitor requirements (affects 1 module)

## Technical Details

### Working Module Paths

| Module | Implementation File |
|--------|-------------------|
| seo.keyword_gap_visibility.v1 | server/keyword-gap-lite.ts |
| market.demand_seasonality.v1 | server/market-demand-analyzer.ts |
| market.category_demand_trend.v1 | server/modules/category-demand-trend.ts |
| synthesis.strategic_summary.v1 | server/modules/strategic-summary.ts |

### Pages with Dedicated UI

| Page Route | Connected Module |
|------------|------------------|
| /keyword-gap | seo.keyword_gap_visibility.v1 |
| /market-demand | market.demand_seasonality.v1, market.category_demand_trend.v1 |

## Appendix: Full Test Results JSON

See `module-test-results.json` for complete test output.
