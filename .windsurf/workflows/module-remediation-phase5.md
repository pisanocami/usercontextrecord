---
description: Phase 5 - Contract Registry Synchronization
---

# Phase 5: Contract Registry Synchronization

This workflow ensures all implemented modules have corresponding contracts in the registry.

## Prerequisites
- Phase 2 completed (Module Registry)
- Access to `shared/module.contract.ts`

## Steps

### Step 1: Audit current contract coverage
Review which modules have contracts vs which are implemented.

**Implemented modules (in module-runner.ts):**
1. seo.keyword_gap_visibility.v1 ✅ Has contract
2. market.demand_seasonality.v1 ✅ Has contract
3. brand.attention.v1 ✅ Has contract
4. seo.priority_scoring.v1 ⚠️ Needs contract
5. seo.category_visibility.v1 ⚠️ Needs contract
6. seo.link_authority.v1 ⚠️ Needs contract
7. seo.os_drop.v1 ⚠️ Needs contract
8. seo.deprioritization.v1 ⚠️ Needs contract
9. market.share_of_voice.v1 ⚠️ Needs contract
10. market.branded_demand.v1 ⚠️ Needs contract
11. market.breakout_terms.v1 ⚠️ Needs contract
12. market.competitor_strategy.v1 ⚠️ Needs contract
13. market.emerging_competitor.v1 ⚠️ Needs contract
14. market.market_momentum.v1 ⚠️ Needs contract
15. sem.action_card.v1 ⚠️ Needs contract
16. sem.paid_organic_overlap.v1 ⚠️ Needs contract
17. synthesis.strategic_summary.v1 ⚠️ Needs contract

### Step 2: Add missing contracts
Add contracts to `shared/module.contract.ts` following the existing pattern.

#### Template for new contracts:
```typescript
export const [ModuleName]Contract: ModuleContract = {
  moduleId: "[category].[name].v1",
  name: "[Display Name]",
  category: "[Category]",
  layer: "Signal" | "Synthesis" | "Action",
  version: "contract.v1",

  description: "[What this module does]",
  strategicQuestion: "[What question does this answer?]",

  dataSources: ["DataForSEO", "Internal"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "medium",
    inferenceType: "external"
  },

  caching: {
    cadence: "weekly",
    bustOnChanges: ["competitor_set", "category_scope"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B"],
    optionalSections: ["C", "D", "E", "F", "G", "H"],
    sectionUsage: {
      A: "Defines brand domain",
      B: "Defines category fence"
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      {
        name: "locationCode",
        type: "number",
        required: false,
        default: 2840,
        description: "DataForSEO location code"
      }
    ]
  },

  disposition: {
    required: false,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason"],
    runTraceFields: ["sectionsUsed", "rulesTriggered"]
  },

  output: {
    entityType: "[output_type]",
    visuals: [
      { kind: "table", title: "[Visual Title]" }
    ],
    summaryFields: ["field1", "field2"]
  }
};
```

### Step 3: Add contracts to CONTRACT_REGISTRY
Update the registry array in `shared/module.contract.ts`:

```typescript
export const CONTRACT_REGISTRY = createContractRegistry([
  // Existing
  KeywordGapVisibilityContract,
  CategoryDemandTrendContract,
  BrandAttentionContract,
  MarketDemandSeasonalityContract,
  
  // SEO Modules
  PriorityScoringContract,
  CategoryVisibilityContract,
  LinkAuthorityContract,
  OSDropContract,
  DeprioritizationContract,
  
  // Market Modules
  ShareOfVoiceContract,
  BrandedDemandContract,
  BreakoutTermsContract,
  CompetitorStrategyContract,
  EmergingCompetitorContract,
  MarketMomentumContract,
  
  // Action/Synthesis Modules
  ActionCardContract,
  PaidOrganicOverlapContract,
  StrategicSummaryContract
]);
```

### Step 4: Verify module ID consistency
Ensure module IDs match between:
- `module-runner.ts` switch cases
- Contract `moduleId` fields
- Module handler `id` fields

### Step 5: Test contract validation
// turbo
Run the server and verify contracts load:
```bash
npm run dev
```

Check logs for registry initialization messages.

## Validation Checklist
- [ ] All 17 modules have contracts defined
- [ ] All contracts added to CONTRACT_REGISTRY
- [ ] Module IDs are consistent across all files
- [ ] Contract validation passes for all modules
- [ ] No duplicate moduleIds in registry

## Rollback
```bash
git checkout shared/module.contract.ts
```
