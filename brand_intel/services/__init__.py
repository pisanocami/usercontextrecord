"""
Brand Intelligence Services
============================

UCR FIRST Architecture - All services consume UCR as the single source of truth.

The UCR (User Context Record) is the foundation of all operations:
- Every analysis MUST have a valid UCR
- Every AI call MUST be filtered through UCR guardrails
- Every output MUST be traced back to UCR sections
- No operation can bypass UCR validation

Services:
- UCRService: Core UCR management and validation
- SignalDetector: Competitive signal detection (UCR-driven)
- QualityScorer: Quality score calculation (UCR-based)
- GuardrailValidator: Negative scope enforcement (UCR guardrails)
- MarketAnalyzer: Market demand analysis (UCR-filtered)
"""

from brand_intel.services.ucr_service import UCRService
from brand_intel.services.signal_detector import SignalDetector
from brand_intel.services.quality_scorer import QualityScorer
from brand_intel.services.guardrail_validator import GuardrailValidator

__all__ = [
    "UCRService",
    "SignalDetector",
    "QualityScorer",
    "GuardrailValidator",
]
