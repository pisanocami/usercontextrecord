# Module System Remediation Guide

**Version:** 1.0  
**Date:** 2026-01-13  
**Author:** System Audit  
**Priority:** Critical

---

## Executive Summary

This document provides a comprehensive technical guide to remediate all critical and important issues identified in the Brand Intelligence Platform's module system. The remediation is organized into 6 phases, each with specific deliverables and validation criteria.

---

## Table of Contents

1. [Issue Inventory](#1-issue-inventory)
2. [Phase 1: Security Fixes](#2-phase-1-security-fixes)
3. [Phase 2: Module Registry Refactor](#3-phase-2-module-registry-refactor)
4. [Phase 3: Input Validation](#4-phase-3-input-validation)
5. [Phase 4: Error Handling Standardization](#5-phase-4-error-handling-standardization)
6. [Phase 5: Contract Registry Sync](#6-phase-5-contract-registry-sync)
7. [Phase 6: Code Quality Improvements](#7-phase-6-code-quality-improvements)
8. [Validation Checklist](#8-validation-checklist)

---

## 1. Issue Inventory

### 1.1 Critical Issues (Must Fix)

| ID | Issue | Location | Impact | Status |
|----|-------|----------|--------|--------|
| C1 | Configuration access without userId | `module-runner.ts:52` | Security breach | ✅ FIXED |
| C2 | Switch statement anti-pattern | `module-runner.ts:82-162` | Maintainability | 🔴 Open |
| C3 | No input validation | All modules | Runtime errors | 🔴 Open |
| C4 | Contract registry mismatch | `module.contract.ts` | Type safety | 🔴 Open |
| C5 | Unsafe type casting (`as any`) | 47 occurrences | Type safety | 🔴 Open |

### 1.2 High Priority Issues

| ID | Issue | Location | Impact | Status |
|----|-------|----------|--------|--------|
| H1 | Mock data in production | `priority-scoring.ts:57` | Data integrity | 🔴 Open |
| H2 | No error handling in modules | 15 modules | Reliability | 🔴 Open |
| H3 | Hardcoded magic numbers | Multiple files | Maintainability | 🔴 Open |
| H4 | No caching strategy | Module runner | Performance | 🔴 Open |
| H5 | Console.log in production | 48 occurrences | Performance/Security | 🔴 Open |

### 1.3 Medium Priority Issues

| ID | Issue | Location | Impact | Status |
|----|-------|----------|--------|--------|
| M1 | No rate limiting | Routes | Stability | 🔴 Open |
| M2 | No audit logging | Module runner | Compliance | 🔴 Open |
| M3 | Duplicate code patterns | Modules | Maintainability | 🔴 Open |
| M4 | Missing tests | All modules | Quality | 🔴 Open |

---

## 2. Phase 1: Security Fixes

### 2.1 Objective
Ensure all module executions are properly authenticated and authorized.

### 2.2 Tasks

#### Task 1.1: Verify userId propagation (COMPLETED)
```typescript
// server/module-runner.ts - ALREADY FIXED
export async function runModule(
    moduleId: string,
    configId: number,
    inputs: any = {},
    userId?: string  // Added
): Promise<ModuleOutputWrapper<any>> {
    const dbConfig = await storage.getConfigurationById(Number(configId), userId);
    // ...
}
```

#### Task 1.2: Add userId validation
**File:** `server/module-runner.ts`

```typescript
// Add at the start of runModule function
if (!userId) {
    throw new Error("userId is required for module execution");
}
```

#### Task 1.3: Add execution audit logging
**File:** `server/module-runner.ts`

```typescript
// Add after successful execution
interface ModuleExecutionLog {
    moduleId: string;
    configId: number;
    userId: string;
    startedAt: Date;
    completedAt: Date;
    success: boolean;
    error?: string;
}

function logModuleExecution(log: ModuleExecutionLog): void {
    console.log(`[MODULE_AUDIT] ${JSON.stringify(log)}`);
    // Future: Write to database audit table
}
```

### 2.3 Validation
- [ ] All module calls require userId
- [ ] Unauthorized access returns 401/403
- [ ] Execution logs are generated

---

## 3. Phase 2: Module Registry Refactor

### 3.1 Objective
Replace the massive switch statement with a registry pattern for maintainability.

### 3.2 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ModuleRegistry                        │
├─────────────────────────────────────────────────────────┤
│  register(module: ModuleHandler): void                   │
│  get(moduleId: string): ModuleHandler | undefined        │
│  list(): ModuleHandler[]                                 │
│  execute(moduleId, config, inputs): Promise<Result>      │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ SEO      │    │ Market   │    │ Action   │
    │ Modules  │    │ Modules  │    │ Modules  │
    └──────────┘    └──────────┘    └──────────┘
```

### 3.3 Implementation

#### Step 1: Create Module Handler Interface
**File:** `server/module-handler.ts` (NEW)

```typescript
import type { Configuration } from "@shared/schema";
import type { ModuleOutputWrapper } from "./execution-gateway";
import { z } from "zod";

export interface ModuleHandler {
    id: string;
    name: string;
    category: "seo" | "market" | "brand" | "action" | "synthesis";
    inputSchema: z.ZodSchema;
    execute(config: Configuration, inputs: unknown): Promise<unknown>;
}

export interface ModuleExecutionResult<T = unknown> {
    success: boolean;
    data: T | null;
    error: string | null;
    executionTime: number;
}
```

#### Step 2: Create Module Registry
**File:** `server/module-registry.ts` (NEW)

```typescript
import type { ModuleHandler, ModuleExecutionResult } from "./module-handler";
import type { Configuration } from "@shared/schema";

class ModuleRegistry {
    private modules = new Map<string, ModuleHandler>();

    register(module: ModuleHandler): void {
        if (this.modules.has(module.id)) {
            console.warn(`Module ${module.id} already registered, overwriting`);
        }
        this.modules.set(module.id, module);
    }

    get(moduleId: string): ModuleHandler | undefined {
        return this.modules.get(moduleId);
    }

    list(): ModuleHandler[] {
        return Array.from(this.modules.values());
    }

    has(moduleId: string): boolean {
        return this.modules.has(moduleId);
    }

    async execute<T>(
        moduleId: string,
        config: Configuration,
        inputs: unknown
    ): Promise<ModuleExecutionResult<T>> {
        const startTime = Date.now();
        const module = this.get(moduleId);

        if (!module) {
            return {
                success: false,
                data: null,
                error: `Module "${moduleId}" not found in registry`,
                executionTime: Date.now() - startTime
            };
        }

        try {
            // Validate inputs
            const validatedInputs = module.inputSchema.parse(inputs);
            
            // Execute module
            const result = await module.execute(config, validatedInputs);
            
            return {
                success: true,
                data: result as T,
                error: null,
                executionTime: Date.now() - startTime
            };
        } catch (error: any) {
            return {
                success: false,
                data: null,
                error: error.message || "Unknown error",
                executionTime: Date.now() - startTime
            };
        }
    }
}

export const moduleRegistry = new ModuleRegistry();
```

#### Step 3: Convert Modules to Handlers
**Example:** `server/modules/priority-scoring.ts`

```typescript
import { z } from "zod";
import type { ModuleHandler } from "../module-handler";
import type { Configuration } from "@shared/schema";
import { getRankedKeywords } from "../dataforseo";

// Input schema with validation
export const PriorityScoringInputSchema = z.object({
    limitPerDomain: z.number().min(1).max(1000).default(200),
    locationCode: z.number().min(1).max(9999).default(2840),
    minSearchVolume: z.number().min(0).default(0)
});

export type PriorityScoringInput = z.infer<typeof PriorityScoringInputSchema>;

async function execute(
    config: Configuration,
    inputs: PriorityScoringInput
): Promise<PriorityScoringResult> {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new Error("Configuration has no brand domain defined");
    }
    // ... implementation
}

export const priorityScoringModule: ModuleHandler = {
    id: "seo.priority_scoring.v1",
    name: "Priority Scoring",
    category: "seo",
    inputSchema: PriorityScoringInputSchema,
    execute
};
```

#### Step 4: Register All Modules
**File:** `server/modules/index.ts` (NEW)

```typescript
import { moduleRegistry } from "../module-registry";

// SEO Modules
import { priorityScoringModule } from "./priority-scoring";
import { categoryVisibilityModule } from "./category-visibility";
import { linkAuthorityModule } from "./link-authority";
import { osDropModule } from "./os-drop";
import { deprioritizationModule } from "./deprioritization";

// Market Modules
import { shareOfVoiceModule } from "./share-of-voice";
import { brandedDemandModule } from "./branded-demand";
import { breakoutTermsModule } from "./breakout-terms";
import { competitorStrategyModule } from "./competitor-strategy";
import { emergingCompetitorModule } from "./emerging-competitor";
import { marketMomentumModule } from "./market-momentum";

// Action Modules
import { actionCardModule } from "./action-card";
import { paidOrganicOverlapModule } from "./paid-organic-overlap";
import { strategicSummaryModule } from "./strategic-summary";

// Register all modules
export function registerAllModules(): void {
    // SEO
    moduleRegistry.register(priorityScoringModule);
    moduleRegistry.register(categoryVisibilityModule);
    moduleRegistry.register(linkAuthorityModule);
    moduleRegistry.register(osDropModule);
    moduleRegistry.register(deprioritizationModule);
    
    // Market
    moduleRegistry.register(shareOfVoiceModule);
    moduleRegistry.register(brandedDemandModule);
    moduleRegistry.register(breakoutTermsModule);
    moduleRegistry.register(competitorStrategyModule);
    moduleRegistry.register(emergingCompetitorModule);
    moduleRegistry.register(marketMomentumModule);
    
    // Action
    moduleRegistry.register(actionCardModule);
    moduleRegistry.register(paidOrganicOverlapModule);
    moduleRegistry.register(strategicSummaryModule);
}

export { moduleRegistry };
```

#### Step 5: Update Module Runner
**File:** `server/module-runner.ts`

```typescript
import { moduleRegistry, registerAllModules } from "./modules";
import { storage } from "./storage";
import type { Configuration } from "@shared/schema";
import {
    validateModuleExecution,
    createExecutionContext,
    wrapModuleOutput,
    ModuleOutputWrapper
} from "./execution-gateway";

// Initialize registry on module load
registerAllModules();

export async function runModule(
    moduleId: string,
    configId: number,
    inputs: any = {},
    userId?: string
): Promise<ModuleOutputWrapper<any>> {
    if (!userId) {
        throw new Error("userId is required for module execution");
    }

    // 1. Fetch Configuration
    const dbConfig = await storage.getConfigurationById(Number(configId), userId);
    if (!dbConfig) {
        throw new Error(`Configuration ${configId} not found`);
    }

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
            `Execution Gate Failed: ${validation.warnings.join(", ")}`
        );
    }

    // 3. Execute via Registry (replaces switch statement)
    const context = createExecutionContext(moduleId, config, validation.availableSections);
    const result = await moduleRegistry.execute(moduleId, config, inputs);

    if (!result.success) {
        return wrapModuleOutput(null, context, result.error);
    }

    return wrapModuleOutput(result.data, context);
}
```

### 3.4 Validation
- [ ] All 17 modules registered in registry
- [ ] Switch statement removed from module-runner.ts
- [ ] Module discovery endpoint works
- [ ] All existing tests pass

---

## 4. Phase 3: Input Validation

### 4.1 Objective
Add Zod schemas for all module inputs to prevent runtime errors.

### 4.2 Implementation

#### Common Input Schemas
**File:** `server/modules/common-schemas.ts` (NEW)

```typescript
import { z } from "zod";

// Location codes (DataForSEO)
export const LocationCodeSchema = z.number()
    .min(1)
    .max(9999)
    .default(2840)
    .describe("DataForSEO location code (2840 = US)");

// Language codes
export const LanguageCodeSchema = z.string()
    .min(2)
    .max(10)
    .default("en")
    .describe("Language code (en, es, fr, etc.)");

// Limit schemas
export const LimitSchema = z.number()
    .min(1)
    .max(1000)
    .default(100)
    .describe("Maximum number of results");

// Domain schema
export const DomainSchema = z.string()
    .min(3)
    .max(255)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/, "Invalid domain format");

// Time range schema
export const TimeRangeSchema = z.enum([
    "today 1-m",
    "today 3-m",
    "today 12-m",
    "today 5-y"
]).default("today 12-m");
```

#### Module-Specific Schemas
Each module gets its own input schema. Example:

```typescript
// priority-scoring.ts
export const PriorityScoringInputSchema = z.object({
    limitPerDomain: LimitSchema,
    locationCode: LocationCodeSchema,
    minSearchVolume: z.number().min(0).default(0)
});

// category-visibility.ts
export const CategoryVisibilityInputSchema = z.object({
    locationCode: LocationCodeSchema
});

// keyword-gap.ts
export const KeywordGapInputSchema = z.object({
    limitPerDomain: LimitSchema,
    maxCompetitors: z.number().min(1).max(10).default(3),
    locationCode: LocationCodeSchema,
    languageCode: LanguageCodeSchema
});
```

### 4.3 Validation
- [ ] All 17 modules have input schemas
- [ ] Invalid inputs return 400 with clear error messages
- [ ] Schema defaults work correctly

---

## 5. Phase 4: Error Handling Standardization

### 5.1 Objective
Standardize error handling across all modules.

### 5.2 Implementation

#### Custom Error Classes
**File:** `server/errors.ts` (NEW)

```typescript
export class ModuleError extends Error {
    constructor(
        message: string,
        public moduleId: string,
        public code: string,
        public cause?: Error
    ) {
        super(message);
        this.name = "ModuleError";
    }
}

export class ConfigurationError extends ModuleError {
    constructor(moduleId: string, message: string) {
        super(message, moduleId, "CONFIGURATION_ERROR");
    }
}

export class ExternalAPIError extends ModuleError {
    constructor(moduleId: string, provider: string, cause: Error) {
        super(`External API error from ${provider}: ${cause.message}`, moduleId, "EXTERNAL_API_ERROR", cause);
    }
}

export class ValidationError extends ModuleError {
    constructor(moduleId: string, details: string) {
        super(`Validation failed: ${details}`, moduleId, "VALIDATION_ERROR");
    }
}
```

#### Error Handling Pattern
```typescript
// In each module
async function execute(config: Configuration, inputs: ValidatedInput): Promise<Result> {
    try {
        const brandDomain = config.brand?.domain;
        if (!brandDomain) {
            throw new ConfigurationError(MODULE_ID, "Brand domain is required");
        }

        const data = await externalAPI.fetch(brandDomain);
        return processData(data);
    } catch (error) {
        if (error instanceof ModuleError) {
            throw error; // Re-throw our errors
        }
        throw new ExternalAPIError(MODULE_ID, "DataForSEO", error as Error);
    }
}
```

### 5.3 Validation
- [ ] All modules use ModuleError classes
- [ ] Error messages are user-friendly
- [ ] Stack traces preserved for debugging

---

## 6. Phase 5: Contract Registry Sync

### 6.1 Objective
Ensure CONTRACT_REGISTRY matches implemented modules.

### 6.2 Module ID Mapping

| Implemented Module | Contract Module ID | Status |
|-------------------|-------------------|--------|
| `computeKeywordGap` | `seo.keyword_gap_visibility.v1` | ✅ Match |
| `marketDemandAnalyzer` | `market.demand_seasonality.v1` | ✅ Match |
| `analyzeBrandAttention` | `brand.attention.v1` | ✅ Match |
| `analyzePriorityScoring` | `seo.priority_scoring.v1` | ⚠️ Need contract |
| `analyzeCategoryVisibility` | `seo.category_visibility.v1` | ⚠️ Need contract |
| `analyzeLinkAuthority` | `seo.link_authority.v1` | ⚠️ Need contract |
| `analyzeOSDrop` | `seo.os_drop.v1` | ⚠️ Need contract |
| `analyzeDeprioritization` | `seo.deprioritization.v1` | ⚠️ Need contract |
| `analyzeShareOfVoice` | `market.share_of_voice.v1` | ⚠️ Need contract |
| `analyzeBrandedDemand` | `market.branded_demand.v1` | ⚠️ Need contract |
| `analyzeBreakoutTerms` | `market.breakout_terms.v1` | ⚠️ Need contract |
| `analyzeCompetitorStrategy` | `market.competitor_strategy.v1` | ⚠️ Need contract |
| `analyzeEmergingCompetitor` | `market.emerging_competitor.v1` | ⚠️ Need contract |
| `analyzeMarketMomentum` | `market.market_momentum.v1` | ⚠️ Need contract |
| `analyzeActionCard` | `sem.action_card.v1` | ⚠️ Need contract |
| `analyzePaidOrganicOverlap` | `sem.paid_organic_overlap.v1` | ⚠️ Need contract |
| `analyzeStrategicSummary` | `synthesis.strategic_summary.v1` | ⚠️ Need contract |

### 6.3 Implementation
Add missing contracts to `shared/module.contract.ts` following the existing pattern.

---

## 7. Phase 6: Code Quality Improvements

### 7.1 Remove Mock Data

**File:** `server/modules/priority-scoring.ts`
```typescript
// BEFORE (Mock)
const difficulty = Math.round(Math.random() * 100);

// AFTER (Real or placeholder)
const difficulty = await getKeywordDifficulty(k.keyword) ?? 50;
```

### 7.2 Remove Unsafe Type Casts

Replace `as any` with proper types:
```typescript
// BEFORE
const strategicThemes = (config.strategic_intent as any)?.themes || [];

// AFTER
interface StrategicIntentExtended extends StrategicIntent {
    themes?: string[];
}
const strategicThemes = (config.strategic_intent as StrategicIntentExtended)?.themes || [];
```

### 7.3 Replace Magic Numbers

**File:** `server/constants.ts` (NEW)
```typescript
export const DATAFORSEO_LOCATION_US = 2840;
export const DATAFORSEO_LOCATION_UK = 2826;
export const DEFAULT_KEYWORD_LIMIT = 100;
export const MAX_KEYWORD_LIMIT = 1000;
export const DEFAULT_COMPETITOR_LIMIT = 5;
```

### 7.4 Remove Console.log

Replace with proper logging:
```typescript
import { log } from "./index";

// BEFORE
console.log("Fetching keywords...");

// AFTER
log("Fetching keywords...", "dataforseo");
```

---

## 8. Validation Checklist

### Phase 1: Security
- [ ] userId required for all module executions
- [ ] Audit logs generated for each execution
- [ ] Unauthorized access returns proper error codes

### Phase 2: Registry
- [ ] ModuleRegistry class created
- [ ] All 17 modules registered
- [ ] Switch statement removed
- [ ] Module discovery endpoint works

### Phase 3: Validation
- [ ] All modules have Zod input schemas
- [ ] Invalid inputs return 400 errors
- [ ] Schema defaults applied correctly

### Phase 4: Errors
- [ ] ModuleError class hierarchy created
- [ ] All modules use standardized errors
- [ ] Error messages are user-friendly

### Phase 5: Contracts
- [ ] All implemented modules have contracts
- [ ] Contract validation works correctly
- [ ] No orphan contracts

### Phase 6: Quality
- [ ] No mock data in production
- [ ] No `as any` type casts
- [ ] No magic numbers
- [ ] No console.log statements

---

## Appendix A: File Changes Summary

| File | Action | Phase |
|------|--------|-------|
| `server/module-handler.ts` | CREATE | 2 |
| `server/module-registry.ts` | CREATE | 2 |
| `server/modules/index.ts` | CREATE | 2 |
| `server/modules/common-schemas.ts` | CREATE | 3 |
| `server/errors.ts` | CREATE | 4 |
| `server/constants.ts` | CREATE | 6 |
| `server/module-runner.ts` | MODIFY | 1, 2 |
| `server/modules/*.ts` | MODIFY | 2, 3, 4, 6 |
| `shared/module.contract.ts` | MODIFY | 5 |

---

## Appendix B: Estimated Effort

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1 | 0.5 days | None |
| Phase 2 | 2 days | Phase 1 |
| Phase 3 | 1 day | Phase 2 |
| Phase 4 | 1 day | Phase 2 |
| Phase 5 | 1 day | Phase 2 |
| Phase 6 | 1 day | All |
| **Total** | **6.5 days** | |

---

*End of Remediation Guide*
