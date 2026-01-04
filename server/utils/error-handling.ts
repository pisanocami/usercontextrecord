// Standardized error handling utilities for UserContextRecord System

export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  EXTERNAL_API = 'external_api',
  DATABASE = 'database',
  INTERNAL = 'internal',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface StandardError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  tenantId?: number;
  retryable: boolean;
  suggestedAction?: string;
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly userId?: string;
  public readonly tenantId?: number;
  public readonly retryable: boolean;
  public readonly suggestedAction?: string;

  constructor(options: {
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    code?: string;
    details?: any;
    requestId?: string;
    userId?: string;
    tenantId?: number;
    retryable?: boolean;
    suggestedAction?: string;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.type = options.type;
    this.severity = options.severity;
    this.code = options.code;
    this.details = options.details;
    this.timestamp = new Date();
    this.requestId = options.requestId;
    this.userId = options.userId;
    this.tenantId = options.tenantId;
    this.retryable = options.retryable ?? false;
    this.suggestedAction = options.suggestedAction;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON(): StandardError {
    return {
      type: this.type,
      severity: this.severity,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
      userId: this.userId,
      tenantId: this.tenantId,
      retryable: this.retryable,
      suggestedAction: this.suggestedAction
    };
  }
}

// Error factory functions
export const createValidationError = (message: string, details?: any): AppError => {
  return new AppError({
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    message,
    details,
    retryable: false,
    suggestedAction: 'Please check your input and try again'
  });
};

export const createExternalApiError = (message: string, details?: any, retryable: boolean = true): AppError => {
  return new AppError({
    type: ErrorType.EXTERNAL_API,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    retryable,
    suggestedAction: retryable 
      ? 'Please try again in a few moments' 
      : 'Please check your configuration and contact support if the issue persists'
  });
};

export const createDatabaseError = (message: string, details?: any): AppError => {
  return new AppError({
    type: ErrorType.DATABASE,
    severity: ErrorSeverity.HIGH,
    message,
    details,
    retryable: true,
    suggestedAction: 'Please try again. If the problem persists, contact support'
  });
};

export const createNotFoundError = (resource: string, identifier?: string): AppError => {
  return new AppError({
    type: ErrorType.NOT_FOUND,
    severity: ErrorSeverity.MEDIUM,
    message: `${resource}${identifier ? ` with identifier '${identifier}'` : ''} not found`,
    retryable: false,
    suggestedAction: 'Please check the resource identifier and try again'
  });
};

export const createAuthError = (message: string): AppError => {
  return new AppError({
    type: ErrorType.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    message,
    retryable: false,
    suggestedAction: 'Please check your authentication credentials'
  });
};

export const createRateLimitError = (retryAfter?: number): AppError => {
  return new AppError({
    type: ErrorType.RATE_LIMIT,
    severity: ErrorSeverity.MEDIUM,
    message: 'Rate limit exceeded',
    details: { retryAfter },
    retryable: true,
    suggestedAction: retryAfter 
      ? `Please wait ${retryAfter} seconds before trying again`
      : 'Please wait before trying again'
  });
};

// Error handling middleware for Express
export const errorHandler = (error: Error, req: any, res: any, next: any) => {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.id;
  const tenantId = req.user?.tenantId;

  let standardError: StandardError;

  if (error instanceof AppError) {
    standardError = {
      ...error.toJSON(),
      requestId,
      userId,
      tenantId
    };
  } else {
    // Convert regular Error to StandardError
    standardError = {
      type: ErrorType.INTERNAL,
      severity: ErrorSeverity.HIGH,
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date(),
      requestId,
      userId,
      tenantId,
      retryable: false,
      suggestedAction: 'Please try again or contact support if the problem persists'
    };
  }

  // Log the error
  console.error('Standard Error:', JSON.stringify(standardError, null, 2));

  // Determine HTTP status code
  let statusCode = 500;
  switch (standardError.type) {
    case ErrorType.VALIDATION:
      statusCode = 400;
      break;
    case ErrorType.AUTHENTICATION:
      statusCode = 401;
      break;
    case ErrorType.AUTHORIZATION:
      statusCode = 403;
      break;
    case ErrorType.NOT_FOUND:
      statusCode = 404;
      break;
    case ErrorType.RATE_LIMIT:
      statusCode = 429;
      break;
    case ErrorType.EXTERNAL_API:
      statusCode = 502;
      break;
    case ErrorType.DATABASE:
      statusCode = 503;
      break;
  }

  res.status(statusCode).json({
    error: standardError.message,
    type: standardError.type,
    severity: standardError.severity,
    code: standardError.code,
    retryable: standardError.retryable,
    suggestedAction: standardError.suggestedAction,
    requestId: standardError.requestId,
    timestamp: standardError.timestamp
  });
};

// Async error wrapper for consistent error handling
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: {
    requestId?: string;
    userId?: string;
    tenantId?: number;
    operationName: string;
  }
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    // Log context
    console.error(`Error in operation ${context.operationName}:`, {
      context,
      error: error instanceof Error ? error.message : error
    });

    // Re-throw AppError as-is
    if (error instanceof AppError) {
      throw error;
    }

    // Convert other errors to AppError
    if (error instanceof Error) {
      if (error.message.includes('validation')) {
        throw createValidationError(error.message, { originalError: error.message });
      }
      if (error.message.includes('timeout')) {
        throw new AppError({
          type: ErrorType.TIMEOUT,
          severity: ErrorSeverity.MEDIUM,
          message: error.message,
          retryable: true,
          suggestedAction: 'Please try again'
        });
      }
      if (error.message.includes('database') || error.message.includes('sql')) {
        throw createDatabaseError(error.message, { originalError: error.message });
      }
    }

    // Default to internal error
    throw new AppError({
      type: ErrorType.INTERNAL,
      severity: ErrorSeverity.HIGH,
      message: 'An unexpected error occurred',
      details: { originalError: error },
      retryable: false,
      suggestedAction: 'Please try again or contact support'
    });
  }
};
