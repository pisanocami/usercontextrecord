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

export class AuthenticationError extends ModuleError {
    constructor(moduleId: string, message: string = "Authentication required") {
        super(message, moduleId, "AUTHENTICATION_ERROR");
        this.name = "AuthenticationError";
    }
}

export class AuthorizationError extends ModuleError {
    constructor(moduleId: string, message: string = "Access denied") {
        super(message, moduleId, "AUTHORIZATION_ERROR");
        this.name = "AuthorizationError";
    }
}

/**
 * Get HTTP status code for a ModuleError
 */
export function getHttpStatusForError(error: Error): number {
    if (!(error instanceof ModuleError)) {
        return 500;
    }
    
    switch (error.code) {
        case "CONFIGURATION_ERROR":
        case "VALIDATION_ERROR":
            return 400;
        case "AUTHENTICATION_ERROR":
            return 401;
        case "AUTHORIZATION_ERROR":
            return 403;
        case "DATA_NOT_FOUND":
            return 404;
        case "RATE_LIMIT_ERROR":
            return 429;
        case "EXTERNAL_API_ERROR":
        default:
            return 500;
    }
}
