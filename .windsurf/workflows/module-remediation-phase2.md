---
description: Phase 2 - Module Registry Refactor (Replace Switch Statement)
---

# Phase 2: Module Registry Refactor

This workflow replaces the massive switch statement with a registry pattern for better maintainability.

## Prerequisites
- Phase 1 completed
- Server is not running (will restart after changes)

## Steps

### Step 1: Create Module Handler Interface
Create new file `server/module-handler.ts`:

```typescript
import type { Configuration } from "@shared/schema";
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

### Step 2: Create Module Registry
Create new file `server/module-registry.ts`:

```typescript
import type { ModuleHandler, ModuleExecutionResult } from "./module-handler";
import type { Configuration } from "@shared/schema";

class ModuleRegistry {
    private modules = new Map<string, ModuleHandler>();

    register(module: ModuleHandler): void {
        if (this.modules.has(module.id)) {
            console.warn(`[ModuleRegistry] Module ${module.id} already registered, overwriting`);
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

    getIds(): string[] {
        return Array.from(this.modules.keys());
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
                error: `Module "${moduleId}" not found in registry. Available: ${this.getIds().join(", ")}`,
                executionTime: Date.now() - startTime
            };
        }

        try {
            // Validate inputs against schema
            const parseResult = module.inputSchema.safeParse(inputs);
            if (!parseResult.success) {
                return {
                    success: false,
                    data: null,
                    error: `Input validation failed: ${parseResult.error.message}`,
                    executionTime: Date.now() - startTime
                };
            }
            
            // Execute module with validated inputs
            const result = await module.execute(config, parseResult.data);
            
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
                error: error.message || "Unknown execution error",
                executionTime: Date.now() - startTime
            };
        }
    }
}

export const moduleRegistry = new ModuleRegistry();
```

### Step 3: Create Common Input Schemas
Create new file `server/modules/common-schemas.ts`:

```typescript
import { z } from "zod";

// Location codes (DataForSEO)
export const LocationCodeSchema = z.number()
    .min(1)
    .max(99999)
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

// Base input schema that all modules can extend
export const BaseModuleInputSchema = z.object({
    locationCode: LocationCodeSchema.optional(),
    languageCode: LanguageCodeSchema.optional()
});
```

### Step 4: Update each module to export a handler
For each module in `server/modules/`, add the handler export. Example for `priority-scoring.ts`:

Add at the end of the file:
```typescript
import { z } from "zod";
import type { ModuleHandler } from "../module-handler";
import { LocationCodeSchema, LimitSchema } from "./common-schemas";

export const PriorityScoringInputSchema = z.object({
    limitPerDomain: LimitSchema.default(200),
    locationCode: LocationCodeSchema,
    minSearchVolume: z.number().min(0).default(0)
});

export const priorityScoringModule: ModuleHandler = {
    id: "seo.priority_scoring.v1",
    name: "Priority Scoring",
    category: "seo",
    inputSchema: PriorityScoringInputSchema,
    execute: async (config, inputs) => {
        return analyzePriorityScoring(config, inputs as any);
    }
};
```

### Step 5: Create module index with registration
Create new file `server/modules/registry-init.ts`:

```typescript
import { moduleRegistry } from "../module-registry";

// Import all module handlers
import { priorityScoringModule } from "./priority-scoring";
import { categoryVisibilityModule } from "./category-visibility";
// ... import all other modules

export function initializeModuleRegistry(): void {
    console.log("[ModuleRegistry] Initializing module registry...");
    
    // Register all modules
    moduleRegistry.register(priorityScoringModule);
    // ... register all other modules
    
    console.log(`[ModuleRegistry] Registered ${moduleRegistry.list().length} modules`);
}
```

### Step 6: Update module-runner.ts to use registry
Replace the switch statement with registry call:

```typescript
// Replace the entire switch block with:
const result = await moduleRegistry.execute(moduleId, config, inputs);

if (!result.success) {
    return wrapModuleOutput(null, context, result.error);
}

resultData = result.data;
```

### Step 7: Initialize registry on server start
Add to `server/index.ts` after imports:

```typescript
import { initializeModuleRegistry } from "./modules/registry-init";

// Call before starting server
initializeModuleRegistry();
```

## Validation Checklist
- [ ] ModuleHandler interface created
- [ ] ModuleRegistry class created
- [ ] Common schemas created
- [ ] All 17 modules have handler exports
- [ ] Registry initialization works
- [ ] Switch statement removed
- [ ] All modules execute correctly via registry

## Rollback
```bash
git checkout server/module-runner.ts
git clean -fd server/module-handler.ts server/module-registry.ts server/modules/common-schemas.ts server/modules/registry-init.ts
```
