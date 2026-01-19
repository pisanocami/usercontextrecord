# Module Center Fix Guide

## Problem Summary

The Module Center has **32 modules** defined across two systems:
- **CONTRACT_REGISTRY** (shared/module.contract.ts): Defines module contracts with IDs like `signal.*, action.*, synthesis.*`
- **module-runner.ts** (server/module-runner.ts): Contains actual implementations with IDs like `seo.*, market.*, sem.*`

**Result:** Only 4 modules work (12.5%), 28 fail (87.5%)

## Fix Options

### Option A: Update CONTRACT_REGISTRY IDs (Recommended)

Update the `moduleId` property in each contract to match the runner implementation IDs.

**File:** `shared/module.contract.ts`

| Current Contract ID | Change To |
|---------------------|-----------|
| signal.branded_demand.v1 | market.branded_demand.v1 |
| signal.breakout_terms.v1 | market.breakout_terms.v1 |
| signal.category_visibility.v1 | seo.category_visibility.v1 |
| signal.competitor_strategy.v1 | market.competitor_strategy.v1 |
| signal.emerging_competitor.v1 | market.emerging_competitor.v1 |
| signal.link_authority.v1 | seo.link_authority.v1 |
| signal.market_momentum.v1 | market.market_momentum.v1 |
| signal.paid_organic.v1 | sem.paid_organic_overlap.v1 |
| signal.share_of_voice.v1 | market.share_of_voice.v1 |
| action.card_generator.v1 | sem.action_card.v1 |
| action.priority_scoring.v1 | seo.priority_scoring.v1 |
| action.deprioritization.v1 | seo.deprioritization.v1 |
| synthesis.os_drop.v1 | seo.os_drop.v1 |

### Option B: Add Cases to module-runner.ts

Add additional switch cases to handle CONTRACT_REGISTRY IDs.

**Example:**
```typescript
// In module-runner.ts switch statement
case "signal.market_momentum.v1":
case "market.market_momentum.v1":
    resultData = await analyzeMarketMomentum(config, inputs);
    break;
```

### Option C: Alias System

Create a module ID alias map in execution-gateway.ts.

**Example:**
```typescript
const MODULE_ALIASES: Record<string, string> = {
  "signal.market_momentum.v1": "market.market_momentum.v1",
  "signal.branded_demand.v1": "market.branded_demand.v1",
  // ... etc
};

function resolveModuleId(moduleId: string): string {
  return MODULE_ALIASES[moduleId] || moduleId;
}
```

## Specific Fix: brand.attention_share.v1

This module fails with "No approved competitors" because it requires approved competitors but config 72 has competitors in "pending_review" status.

**Fix in:** `server/modules/brand-attention-share.ts`

```typescript
// Change from:
const approvedCompetitors = competitors.filter(c => c.status === 'approved');

// Change to:
const approvedCompetitors = competitors.filter(c => 
  c.status === 'approved' || c.status === 'pending_review'
);
```

Or approve competitors in the configuration via the UI.

## Quick Fix Script

To apply Option A (update CONTRACT_REGISTRY), run these edits:

```typescript
// In shared/module.contract.ts

// Line ~850
export const BrandedDemandContract: ModuleContract = {
  moduleId: "market.branded_demand.v1", // was: signal.branded_demand.v1
  ...
};

// Line ~887
export const BreakoutTermsContract: ModuleContract = {
  moduleId: "market.breakout_terms.v1", // was: signal.breakout_terms.v1
  ...
};

// Continue for all mismatched IDs...
```

## Verification After Fix

Run the test script again:

```bash
npx tsx test-modules.ts
```

Expected result: 31-32 working modules.

## Files Modified

| File | Purpose |
|------|---------|
| shared/module.contract.ts | Module contract definitions |
| server/module-runner.ts | Module execution logic |
| server/execution-gateway.ts | Module validation |
| server/modules/brand-attention-share.ts | Brand attention module |

## Priority Order

1. **Immediate:** Fix ID alignment (affects 27 modules)
2. **Short-term:** Fix brand.attention_share.v1 competitor logic
3. **Long-term:** Consider consolidating to single ID namespace
