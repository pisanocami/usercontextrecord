---
description: Phase 3 - Input Validation with Zod Schemas
---

# Phase 3: Input Validation with Zod Schemas

This workflow adds comprehensive input validation to all modules using Zod schemas.

## Prerequisites
- Phase 2 completed (Module Registry in place)
- Common schemas created

## Steps

### Step 1: Verify common schemas exist
Ensure `server/modules/common-schemas.ts` exists with base schemas.

### Step 2: Add input schema to each module
For each module, define a Zod schema that validates all inputs.

#### Example: priority-scoring.ts
```typescript
export const PriorityScoringInputSchema = z.object({
    limitPerDomain: z.number().min(1).max(1000).default(200),
    locationCode: z.number().min(1).max(99999).default(2840),
    minSearchVolume: z.number().min(0).default(0)
});
```

#### Example: category-visibility.ts
```typescript
export const CategoryVisibilityInputSchema = z.object({
    locationCode: z.number().min(1).max(99999).default(2840)
});
```

#### Example: keyword-gap (in keyword-gap-lite.ts)
```typescript
export const KeywordGapInputSchema = z.object({
    limitPerDomain: z.number().min(1).max(500).default(100),
    maxCompetitors: z.number().min(1).max(10).default(3),
    locationCode: z.number().min(1).max(99999).default(2840),
    languageCode: z.string().min(2).max(10).default("en")
});
```

### Step 3: Update module handlers to use schemas
Each module handler should reference its input schema:

```typescript
export const priorityScoringModule: ModuleHandler = {
    id: "seo.priority_scoring.v1",
    name: "Priority Scoring",
    category: "seo",
    inputSchema: PriorityScoringInputSchema,
    execute: async (config, inputs) => {
        // inputs is already validated by registry
        return analyzePriorityScoring(config, inputs as z.infer<typeof PriorityScoringInputSchema>);
    }
};
```

### Step 4: Test validation errors
// turbo
Test that invalid inputs return proper errors:

```bash
curl -X POST http://localhost:5000/api/modules/seo.priority_scoring.v1/run \
  -H "Content-Type: application/json" \
  -d '{"configId": 1, "inputs": {"limitPerDomain": -5}}'
```

Expected: 400 error with validation message.

### Step 5: Test default values
// turbo
Test that defaults are applied:

```bash
curl -X POST http://localhost:5000/api/modules/seo.priority_scoring.v1/run \
  -H "Content-Type: application/json" \
  -d '{"configId": 1, "inputs": {}}'
```

Expected: Success with default values applied.

## Module Input Schemas Reference

| Module | Schema Fields |
|--------|---------------|
| priority_scoring | limitPerDomain, locationCode, minSearchVolume |
| category_visibility | locationCode |
| link_authority | locationCode, minDR |
| os_drop | locationCode, dropThreshold |
| deprioritization | locationCode |
| share_of_voice | locationCode, timeRange |
| branded_demand | locationCode |
| breakout_terms | locationCode, threshold |
| competitor_strategy | locationCode |
| emerging_competitor | locationCode |
| market_momentum | locationCode, timeRange |
| action_card | locationCode, maxActions |
| paid_organic_overlap | locationCode |
| strategic_summary | includeSections |
| keyword_gap | limitPerDomain, maxCompetitors, locationCode, languageCode |
| demand_seasonality | timeRange, countryCode, excludedCategories |
| brand_attention | limitPerDomain, locationCode |

## Validation Checklist
- [ ] All 17 modules have Zod input schemas
- [ ] Invalid inputs return 400 with clear error messages
- [ ] Default values are applied correctly
- [ ] Type inference works (z.infer)

## Rollback
Revert module files to previous state:
```bash
git checkout server/modules/
```
