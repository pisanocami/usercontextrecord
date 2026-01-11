"""
OpenAI Client with BYOK Support
================================

OpenAI client implementation for Brand Intelligence platform.
"""

import os
import json
from typing import List, Dict, Any, Optional
from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from brand_intel.ai.base import BaseAIClient
from brand_intel.core.exceptions import AIClientError


class OpenAIClient(BaseAIClient):
    """
    OpenAI client with BYOK support.
    
    Reads API key from OPENAI_API_KEY environment variable.
    """
    
    DEFAULT_MODEL = "gpt-4o"
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None
    ):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise AIClientError(
                "OPENAI_API_KEY not found",
                provider="openai"
            )
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=base_url or os.getenv("OPENAI_BASE_URL")
        )
        self.model = model or self.DEFAULT_MODEL
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def _call_openai(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 4000,
        response_format: Optional[Dict] = None
    ) -> str:
        """Make a call to OpenAI API with retry logic."""
        try:
            kwargs = {
                "model": self.model,
                "max_tokens": max_tokens,
                "messages": messages,
            }
            if response_format:
                kwargs["response_format"] = response_format
            
            response = self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            raise AIClientError(
                f"OpenAI API call failed: {str(e)}",
                provider="openai",
                original_error=e
            )
    
    async def analyze_competitors(
        self,
        brand_name: str,
        domain: str,
        category: str,
        existing_competitors: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Analyze and suggest competitors using OpenAI."""
        existing = ", ".join(existing_competitors) if existing_competitors else "None"
        
        messages = [
            {
                "role": "system",
                "content": "You are an expert competitive intelligence analyst. Return valid JSON only."
            },
            {
                "role": "user",
                "content": f"""Analyze competitors for:
Brand: {brand_name}
Domain: {domain}
Category: {category}
Existing: {existing}

Return JSON with competitors array containing name, domain, tier, why, similarity_score, serp_overlap."""
            }
        ]
        
        response = await self._call_openai(
            messages=messages,
            response_format={"type": "json_object"}
        )
        
        return json.loads(response)
    
    async def generate_insights(
        self,
        signals: List[Dict[str, Any]],
        brand_context: Dict[str, Any]
    ) -> str:
        """Generate strategic insights from competitive signals."""
        messages = [
            {
                "role": "system",
                "content": "You are a Fortune 500 competitive intelligence strategist."
            },
            {
                "role": "user",
                "content": f"""Generate insights for:
Brand: {brand_context.get('name')}
Signals: {json.dumps(signals, indent=2)}

Provide: Executive Summary, Key Threats, Opportunities, Recommended Actions."""
            }
        ]
        
        return await self._call_openai(messages=messages, max_tokens=2000)
    
    async def sequential_reasoning(
        self,
        problem: str,
        context: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Perform multi-step reasoning."""
        messages = [
            {
                "role": "system",
                "content": "You are a strategic consultant. Return JSON array of reasoning steps."
            },
            {
                "role": "user",
                "content": f"""Problem: {problem}
Context: {json.dumps(context)}

Return: [{{"step": 1, "title": "...", "reasoning": "...", "conclusion": "..."}}]"""
            }
        ]
        
        response = await self._call_openai(
            messages=messages,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response)
        return result.get("steps", [result])
    
    async def validate_against_guardrails(
        self,
        content: str,
        negative_scope: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate content against guardrails."""
        messages = [
            {
                "role": "system",
                "content": "You are a brand safety validator. Return JSON validation result."
            },
            {
                "role": "user",
                "content": f"""Validate:
Content: {content}
Guardrails: {json.dumps(negative_scope)}

Return: {{"is_valid": bool, "violations": [], "risk_level": "none|low|medium|high"}}"""
            }
        ]
        
        response = await self._call_openai(
            messages=messages,
            response_format={"type": "json_object"}
        )
        
        return json.loads(response)
    
    async def generate_content_brief(
        self,
        keyword: str,
        brand_context: Dict[str, Any],
        competitor_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Generate a content brief for a keyword."""
        messages = [
            {
                "role": "system",
                "content": "You are an expert content strategist. Return JSON content brief."
            },
            {
                "role": "user",
                "content": f"""Create content brief for:
Keyword: {keyword}
Brand: {json.dumps(brand_context)}
Competitors: {json.dumps(competitor_data or [])}"""
            }
        ]
        
        response = await self._call_openai(
            messages=messages,
            response_format={"type": "json_object"}
        )
        
        return json.loads(response)
