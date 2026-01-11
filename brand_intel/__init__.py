"""
Brand Intelligence Shared Library
=================================

A Fortune 500 grade library for competitive intelligence and brand analysis.
Shared between the React app and Streamlit microservice.

Usage:
    from brand_intel.core.models import Brand, Competitor, QualityScore
    from brand_intel.services import SignalDetector, QualityScorer
    from brand_intel.ai import ClaudeClient, OpenAIClient
"""

__version__ = "1.0.0"
__author__ = "Brand Intelligence Platform Team"

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
)

__all__ = [
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
]
