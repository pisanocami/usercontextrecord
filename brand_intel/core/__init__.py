"""
Core Domain Models
==================

Contains all Pydantic models for the Brand Intelligence platform.
"""

from brand_intel.core.models import (
    Brand,
    Competitor,
    CompetitorTier,
    CompetitorStatus,
    FundingStage,
    Evidence,
    QualityScore,
    Signal,
    SignalType,
    SignalSeverity,
    CategoryDefinition,
    StrategicIntent,
    NegativeScope,
    Configuration,
)

from brand_intel.core.enums import (
    BusinessModel,
    RiskTolerance,
    GoalType,
    TimeHorizon,
    InvestmentLevel,
)

from brand_intel.core.exceptions import (
    BrandIntelError,
    ValidationError,
    ConfigurationError,
    AIClientError,
    DatabaseError,
)

__all__ = [
    # Models
    "Brand",
    "Competitor",
    "CompetitorTier",
    "CompetitorStatus",
    "FundingStage",
    "Evidence",
    "QualityScore",
    "Signal",
    "SignalType",
    "SignalSeverity",
    "CategoryDefinition",
    "StrategicIntent",
    "NegativeScope",
    "Configuration",
    # Enums
    "BusinessModel",
    "RiskTolerance",
    "GoalType",
    "TimeHorizon",
    "InvestmentLevel",
    # Exceptions
    "BrandIntelError",
    "ValidationError",
    "ConfigurationError",
    "AIClientError",
    "DatabaseError",
]
