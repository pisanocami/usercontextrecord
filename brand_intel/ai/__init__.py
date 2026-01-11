"""
AI Client Abstractions
======================

Provides unified interfaces for AI providers (Claude, OpenAI, Gemini).
Supports BYOK (Bring Your Own Key) configuration.
"""

from brand_intel.ai.base import BaseAIClient
from brand_intel.ai.claude_client import ClaudeClient
from brand_intel.ai.openai_client import OpenAIClient
from brand_intel.ai.gemini_client import GeminiClient

__all__ = [
    "BaseAIClient",
    "ClaudeClient",
    "OpenAIClient",
    "GeminiClient",
]
