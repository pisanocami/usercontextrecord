---
description: Phase 4 - Error Handling Standardization
---

# Phase 4: Error Handling Standardization

This workflow standardizes error handling across all modules with custom error classes.

## Prerequisites
- Phase 2 completed (Module Registry)
- Phase 3 completed (Input Validation)

## Steps

### Step 1: Create custom error classes
Create new file `server/errors.ts`:

```typescript
/**
 * Custom error classes for module system
 * Provides structured error handling with proper categorization
 */

export class ModuleError extends Error {
    constructor(
        message: string,
        public moduleId: string,
        public code: string,
        public cause?: Error
    ) {
        super(message);
        this.name = "ModuleError";
        
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ModuleError);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            moduleId: this.moduleId,
            code: this.code,
            cause: this.cause?.message
        };
    }
}

export class ConfigurationError extends ModuleError {
    constructor(moduleId: string, message: string) {
        super(message, moduleId, "CONFIGURATION_ERROR");
        this.name = "ConfigurationError";
    }
}

export class ExternalAPIError extends ModuleError {
    constructor(moduleId: string, provider: string, cause: Error) {
        super(
            `External API error from ${provider}: ${cause.message}`,
            moduleId,
            "EXTERNAL_API_ERROR",
            cause
        );
        this.name = "ExternalAPIError";
    }
}

export class ValidationError extends ModuleError {
    constructor(moduleId: string, details: string) {
        super(`Validation failed: ${details}`, moduleId, "VALIDATION_ERROR");
        this.name = "ValidationError";
    }
}

export class DataNotFoundError extends ModuleError {
    constructor(moduleId: string, resource: string) {
        super(`Resource not found: ${resource}`, moduleId, "DATA_NOT_FOUND");
        this.name = "DataNotFoundError";
    }
}

export class RateLimitError extends ModuleError {
    constructor(moduleId: string, provider: string, retryAfter?: number) {
        super(
            `Rate limit exceeded for ${provider}${retryAfter ? `. Retry after ${retryAfter}s` : ""}`,
            moduleId,
            "RATE_LIMIT_ERROR"
        );
        this.name = "RateLimitError";
    }
}
```

### Step 2: Update module registry to handle errors
Update `server/module-registry.ts` execute method:

```typescript
import { ModuleError, ExternalAPIError } from "./errors";

// In the execute method catch block:
} catch (error: any) {
    // Preserve ModuleError types
    if (error instanceof ModuleError) {
        return {
            success: false,
            data: null,
            error: error.message,
            executionTime: Date.now() - startTime
        };
    }
    
    // Wrap unknown errors
    const wrappedError = new ExternalAPIError(moduleId, "unknown", error);
    return {
        success: false,
        data: null,
        error: wrappedError.message,
        executionTime: Date.now() - startTime
    };
}
```

### Step 3: Update modules to use custom errors
For each module, replace generic throws with custom errors.

#### Example: priority-scoring.ts
```typescript
import { ConfigurationError, ExternalAPIError } from "../errors";

const MODULE_ID = "seo.priority_scoring.v1";

export async function analyzePriorityScoring(config: Configuration, params: any) {
    const brandDomain = config.brand?.domain;
    if (!brandDomain) {
        throw new ConfigurationError(MODULE_ID, "Brand domain is required");
    }

    try {
        const keywordData = await getRankedKeywords(brandDomain, location, "English", limit);
        // ... rest of implementation
    } catch (error: any) {
        if (error instanceof ModuleError) {
            throw error;
        }
        throw new ExternalAPIError(MODULE_ID, "DataForSEO", error);
    }
}
```

### Step 4: Update API routes to format errors
Update `server/routes.ts` module endpoint error handling:

```typescript
import { ModuleError } from "./errors";

// In the /api/modules/:moduleId/run endpoint catch block:
} catch (error: any) {
    console.error(`Error executing module ${req.params.moduleId}:`, error);
    
    const statusCode = error instanceof ModuleError 
        ? (error.code === "CONFIGURATION_ERROR" ? 400 : 
           error.code === "VALIDATION_ERROR" ? 400 :
           error.code === "DATA_NOT_FOUND" ? 404 :
           error.code === "RATE_LIMIT_ERROR" ? 429 : 500)
        : 500;
    
    res.status(statusCode).json({
        success: false,
        error: error.message || "Unknown execution error",
        code: error instanceof ModuleError ? error.code : "UNKNOWN_ERROR",
        moduleId: req.params.moduleId
    });
}
```

### Step 5: Test error responses
// turbo
Test configuration error:
```bash
# Create a config without domain, then run module
curl -X POST http://localhost:5000/api/modules/seo.priority_scoring.v1/run \
  -H "Content-Type: application/json" \
  -d '{"configId": 999, "inputs": {}}'
```

Expected: 400 or 404 with structured error response.

## Validation Checklist
- [ ] Error classes created in `server/errors.ts`
- [ ] Module registry handles ModuleError types
- [ ] All modules use custom error classes
- [ ] API returns proper HTTP status codes
- [ ] Error responses include code and moduleId

## Rollback
```bash
git checkout server/routes.ts server/module-registry.ts server/modules/
rm server/errors.ts
```
