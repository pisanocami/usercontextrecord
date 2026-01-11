"""
Custom Exceptions for Brand Intelligence Platform
==================================================

Centralized exception definitions for consistent error handling.
"""


class BrandIntelError(Exception):
    """Base exception for all Brand Intelligence errors."""
    
    def __init__(self, message: str, code: str = "BRAND_INTEL_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class ValidationError(BrandIntelError):
    """Raised when validation fails."""
    
    def __init__(self, message: str, field: str = None):
        self.field = field
        super().__init__(message, code="VALIDATION_ERROR")


class ConfigurationError(BrandIntelError):
    """Raised when configuration is invalid or missing."""
    
    def __init__(self, message: str, config_id: int = None):
        self.config_id = config_id
        super().__init__(message, code="CONFIGURATION_ERROR")


class AIClientError(BrandIntelError):
    """Raised when AI client operations fail."""
    
    def __init__(self, message: str, provider: str = None, original_error: Exception = None):
        self.provider = provider
        self.original_error = original_error
        super().__init__(message, code="AI_CLIENT_ERROR")


class DatabaseError(BrandIntelError):
    """Raised when database operations fail."""
    
    def __init__(self, message: str, operation: str = None):
        self.operation = operation
        super().__init__(message, code="DATABASE_ERROR")


class GuardrailViolationError(BrandIntelError):
    """Raised when a guardrail/negative scope rule is violated."""
    
    def __init__(self, message: str, rule: str = None, severity: str = "high"):
        self.rule = rule
        self.severity = severity
        super().__init__(message, code="GUARDRAIL_VIOLATION")


class RateLimitError(BrandIntelError):
    """Raised when rate limits are exceeded."""
    
    def __init__(self, message: str, retry_after: int = None):
        self.retry_after = retry_after
        super().__init__(message, code="RATE_LIMIT_ERROR")


class AuthenticationError(BrandIntelError):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, code="AUTHENTICATION_ERROR")


class AuthorizationError(BrandIntelError):
    """Raised when authorization fails."""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, code="AUTHORIZATION_ERROR")


class DataServiceError(BrandIntelError):
    """Raised when data service operations fail."""
    
    def __init__(self, message: str, operation: str = None, service: str = None):
        self.operation = operation
        self.service = service
        super().__init__(message, code="DATA_SERVICE_ERROR")
