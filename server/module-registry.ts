/**
 * Module Registry
 * Central registry for all module handlers using the registry pattern
 * Replaces the massive switch statement in module-runner.ts
 */

import type { ModuleHandler, ModuleExecutionResult, ModuleInfo } from "./module-handler";
import type { Configuration } from "@shared/schema";

class ModuleRegistry {
    private modules = new Map<string, ModuleHandler>();

    /**
     * Register a module handler
     */
    register(module: ModuleHandler): void {
        if (this.modules.has(module.id)) {
            console.warn(`[ModuleRegistry] Module ${module.id} already registered, overwriting`);
        }
        this.modules.set(module.id, module);
    }

    /**
     * Get a module handler by ID
     */
    get(moduleId: string): ModuleHandler | undefined {
        return this.modules.get(moduleId);
    }

    /**
     * List all registered module handlers
     */
    list(): ModuleHandler[] {
        return Array.from(this.modules.values());
    }

    /**
     * Check if a module is registered
     */
    has(moduleId: string): boolean {
        return this.modules.has(moduleId);
    }

    /**
     * Get all registered module IDs
     */
    getIds(): string[] {
        return Array.from(this.modules.keys());
    }

    /**
     * Get module info for discovery endpoints
     */
    getModuleInfo(): ModuleInfo[] {
        return this.list().map(m => ({
            id: m.id,
            name: m.name,
            category: m.category,
            inputFields: [] // Could be derived from schema if needed
        }));
    }

    /**
     * Execute a module with validation
     */
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
                const errorMessages = parseResult.error.errors
                    .map(e => `${e.path.join(".")}: ${e.message}`)
                    .join("; ");
                return {
                    success: false,
                    data: null,
                    error: `Input validation failed: ${errorMessages}`,
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

// Singleton instance
export const moduleRegistry = new ModuleRegistry();
