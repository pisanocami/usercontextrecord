/**
 * Module Handler Interface
 * Defines the contract for all module implementations in the registry pattern
 */

import type { Configuration } from "@shared/schema";
import { z } from "zod";

/**
 * ModuleHandler defines the interface that all modules must implement
 * to be registered in the ModuleRegistry
 */
export interface ModuleHandler {
    /** Unique module identifier (e.g., "seo.priority_scoring.v1") */
    id: string;
    
    /** Human-readable module name */
    name: string;
    
    /** Module category for grouping */
    category: "seo" | "market" | "brand" | "action" | "synthesis";
    
    /** Zod schema for input validation */
    inputSchema: z.ZodSchema;
    
    /** Execute the module with validated inputs */
    execute(config: Configuration, inputs: unknown): Promise<unknown>;
}

/**
 * Result of a module execution via the registry
 */
export interface ModuleExecutionResult<T = unknown> {
    success: boolean;
    data: T | null;
    error: string | null;
    executionTime: number;
}

/**
 * Module metadata for discovery endpoints
 */
export interface ModuleInfo {
    id: string;
    name: string;
    category: string;
    inputFields: string[];
}
