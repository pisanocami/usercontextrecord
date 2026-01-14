---
description: Phase 6 - Code Quality Improvements (Mock Data, Type Safety, Constants)
---

# Phase 6: Code Quality Improvements

This workflow addresses code quality issues including mock data, unsafe type casts, magic numbers, and console.log statements.

## Prerequisites
- Phases 1-5 completed
- All modules using registry pattern

## Steps

### Step 1: Create constants file
Create new file `server/constants.ts`:

```typescript
/**
 * System-wide constants for the module system
 * Replaces magic numbers throughout the codebase
 */

// DataForSEO Location Codes
export const LOCATION_CODES = {
    US: 2840,
    UK: 2826,
    CA: 2124,
    AU: 2036,
    DE: 2276,
    FR: 2250,
    ES: 2724,
    IT: 2380,
    JP: 2392,
    BR: 2076
} as const;

export const DEFAULT_LOCATION_CODE = LOCATION_CODES.US;

// Keyword limits
export const KEYWORD_LIMITS = {
    MIN: 1,
    DEFAULT: 100,
    MAX: 1000,
    CATEGORY_ANALYSIS: 500
} as const;

// Competitor limits
export const COMPETITOR_LIMITS = {
    MIN: 1,
    DEFAULT: 3,
    MAX: 10
} as const;

// Search volume thresholds
export const SEARCH_VOLUME = {
    HIGH: 10000,
    MEDIUM: 1000,
    LOW: 100
} as const;

// Position thresholds
export const POSITION_THRESHOLDS = {
    PAGE_1_MAX: 10,
    PAGE_2_MAX: 20,
    STRIKING_DISTANCE_MIN: 11,
    STRIKING_DISTANCE_MAX: 20
} as const;

// Scoring weights
export const SCORING_WEIGHTS = {
    VOLUME_HIGH: 30,
    VOLUME_MEDIUM: 20,
    VOLUME_LOW: 5,
    POSITION_STRIKING: 30,
    POSITION_PAGE_3_5: 15,
    CAPABILITY_MATCH: 20,
    STRATEGIC_MATCH: 20
} as const;

// Time ranges for trends
export const TIME_RANGES = {
    ONE_MONTH: "today 1-m",
    THREE_MONTHS: "today 3-m",
    TWELVE_MONTHS: "today 12-m",
    FIVE_YEARS: "today 5-y"
} as const;

// Default capability score
export const DEFAULT_CAPABILITY_SCORE = 50;
```

### Step 2: Remove mock data from priority-scoring.ts
Replace random difficulty with placeholder or real API call:

```typescript
// BEFORE (Mock):
const difficulty = Math.round(Math.random() * 100);

// AFTER (Placeholder with TODO):
// TODO: Integrate real keyword difficulty API
const difficulty = DEFAULT_CAPABILITY_SCORE; // Use config capability as baseline
```

### Step 3: Fix unsafe type casts
Replace `as any` with proper types.

#### Create extended types file
Create `server/types/extended-config.ts`:

```typescript
import type { Configuration, StrategicIntent, Governance } from "@shared/schema";

/**
 * Extended types for configuration fields that may have additional properties
 * not yet in the main schema
 */

export interface StrategicIntentExtended extends StrategicIntent {
    themes?: string[];
}

export interface GovernanceExtended extends Governance {
    capability_score?: number;
}

export interface DemandDefinitionExtended {
    themes?: Array<string | { name: string; keywords?: string[] }>;
    target_audiences?: string[];
    brand_keywords?: {
        seed_terms?: string[];
    };
    non_brand_keywords?: {
        category_terms?: string[];
    };
}

/**
 * Helper to safely access extended config properties
 */
export function getStrategicThemes(config: Configuration): string[] {
    const intent = config.strategic_intent as StrategicIntentExtended | undefined;
    return intent?.themes || [];
}

export function getCapabilityScore(config: Configuration): number {
    const governance = config.governance as GovernanceExtended | undefined;
    return governance?.capability_score || DEFAULT_CAPABILITY_SCORE;
}

export function getDemandThemes(config: Configuration): Array<string | { name: string; keywords?: string[] }> {
    const demand = config.demand_definition as DemandDefinitionExtended | undefined;
    return demand?.themes || [];
}
```

#### Update modules to use helpers
```typescript
// BEFORE:
const strategicThemes = (config.strategic_intent as any)?.themes || [];
const capabilityScore = (config.governance as any)?.capability_score || 50;

// AFTER:
import { getStrategicThemes, getCapabilityScore } from "../types/extended-config";

const strategicThemes = getStrategicThemes(config);
const capabilityScore = getCapabilityScore(config);
```

### Step 4: Replace magic numbers with constants
Update all modules to use constants:

```typescript
// BEFORE:
const location = params.locationCode || 2840;
const limit = params.limitPerDomain || 200;
if (volume > 10000) { score += 30; }

// AFTER:
import { DEFAULT_LOCATION_CODE, KEYWORD_LIMITS, SEARCH_VOLUME, SCORING_WEIGHTS } from "../constants";

const location = params.locationCode || DEFAULT_LOCATION_CODE;
const limit = params.limitPerDomain || KEYWORD_LIMITS.DEFAULT;
if (volume > SEARCH_VOLUME.HIGH) { score += SCORING_WEIGHTS.VOLUME_HIGH; }
```

### Step 5: Replace console.log with proper logging
Create logging utility and replace console.log:

```typescript
// In server/index.ts, the log function already exists:
export function log(message: string, source = "express") { ... }

// Update modules to use it:
import { log } from "../index";

// BEFORE:
console.log("Fetching keywords...");

// AFTER:
log("Fetching keywords...", "dataforseo");
```

### Step 6: Run linter to find remaining issues
// turbo
```bash
npx tsc --noEmit
```

Fix any remaining type errors.

## Files to Update

| File | Changes |
|------|---------|
| `server/constants.ts` | CREATE - All constants |
| `server/types/extended-config.ts` | CREATE - Type helpers |
| `server/modules/priority-scoring.ts` | Remove mock, use constants |
| `server/modules/category-visibility.ts` | Use constants, type helpers |
| `server/modules/*.ts` | All modules - constants, types |
| `server/dataforseo.ts` | Replace console.log |
| `server/providers/*.ts` | Replace console.log |
| `server/market-demand-analyzer.ts` | Replace console.log |

## Validation Checklist
- [ ] Constants file created
- [ ] Extended types file created
- [ ] No `Math.random()` in production code
- [ ] No `as any` type casts (or documented exceptions)
- [ ] No magic numbers (all use constants)
- [ ] No console.log (all use log function)
- [ ] TypeScript compiles without errors

## Rollback
```bash
git checkout server/
rm server/constants.ts server/types/extended-config.ts
```
