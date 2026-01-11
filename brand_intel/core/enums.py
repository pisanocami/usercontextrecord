"""
Enumerations for Brand Intelligence Platform
=============================================

Centralized enum definitions for consistent typing across the platform.
"""

from enum import Enum


class BusinessModel(str, Enum):
    """Business model classification."""
    B2B = "B2B"
    B2C = "B2C"
    DTC = "DTC"
    MARKETPLACE = "Marketplace"
    HYBRID = "Hybrid"
    SAAS = "SaaS"
    ENTERPRISE = "Enterprise"


class RiskTolerance(str, Enum):
    """Strategic risk tolerance level."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class GoalType(str, Enum):
    """Strategic goal type classification."""
    ROI = "roi"
    VOLUME = "volume"
    AUTHORITY = "authority"
    AWARENESS = "awareness"
    RETENTION = "retention"
    MARKET_SHARE = "market_share"


class TimeHorizon(str, Enum):
    """Strategic time horizon."""
    SHORT = "short"      # 0-6 months
    MEDIUM = "medium"    # 6-18 months
    LONG = "long"        # 18+ months


class InvestmentLevel(str, Enum):
    """Investment level classification."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ContextStatus(str, Enum):
    """Configuration context status."""
    DRAFT_AI = "DRAFT_AI"
    DRAFT_HUMAN = "DRAFT_HUMAN"
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    LOCKED = "LOCKED"
    EXPIRED = "EXPIRED"


class ValidationStatus(str, Enum):
    """Validation status for configurations."""
    BLOCKED = "blocked"
    INCOMPLETE = "incomplete"
    NEEDS_REVIEW = "needs_review"
    COMPLETE = "complete"


class QualityGrade(str, Enum):
    """Quality score grade."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
