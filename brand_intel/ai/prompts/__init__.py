"""
AI Prompt Templates - UCR FIRST
================================

Centralized prompt templates for AI operations.
All prompts are designed to work with UCR context.
"""

from brand_intel.ai.prompts.competitor_search import (
    COMPETITOR_ANALYSIS_PROMPT,
    COMPETITOR_ENRICHMENT_PROMPT,
)
from brand_intel.ai.prompts.insight_generation import (
    INSIGHT_GENERATION_PROMPT,
    SIGNAL_ANALYSIS_PROMPT,
)
from brand_intel.ai.prompts.strategy_analysis import (
    STRATEGY_RECOMMENDATION_PROMPT,
    MARKET_ANALYSIS_PROMPT,
)

__all__ = [
    "COMPETITOR_ANALYSIS_PROMPT",
    "COMPETITOR_ENRICHMENT_PROMPT",
    "INSIGHT_GENERATION_PROMPT",
    "SIGNAL_ANALYSIS_PROMPT",
    "STRATEGY_RECOMMENDATION_PROMPT",
    "MARKET_ANALYSIS_PROMPT",
]
