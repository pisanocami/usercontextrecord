"""
Google Gemini Client with BYOK Support
=======================================

Gemini client with Google Search grounding for Brand Intelligence platform.
"""

import os
import json
from typing import List, Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential

from brand_intel.ai.base import BaseAIClient
from brand_intel.core.exceptions import AIClientError

try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class GeminiClient(BaseAIClient):
    """
    Google Gemini client with Google Search grounding.
    
    Reads API key from GEMINI_API_KEY or AI_INTEGRATIONS_GEMINI_API_KEY.
    """
    
    DEFAULT_MODEL = "gemini-2.5-flash"
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        if not GEMINI_AVAILABLE:
            raise AIClientError(
                "google-generativeai package not installed",
                provider="gemini"
            )
        
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("AI_INTEGRATIONS_GEMINI_API_KEY")
        if not self.api_key:
            raise AIClientError(
                "GEMINI_API_KEY not found",
                provider="gemini"
            )
        
        self.client = genai.Client(api_key=self.api_key)
        self.model = model or self.DEFAULT_MODEL
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def _call_gemini(
        self,
        prompt: str,
        use_search: bool = False
    ) -> Dict[str, Any]:
        """Make a call to Gemini API with optional Google Search grounding."""
        try:
            config = {}
            if use_search:
                config["tools"] = [types.Tool(google_search=types.GoogleSearch())]
            
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config if config else None
            )
            
            result = {
                "text": response.text,
                "sources": []
            }
            
            # Extract grounding sources if available
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata'):
                    metadata = candidate.grounding_metadata
                    if hasattr(metadata, 'grounding_chunks'):
                        result["sources"] = [
                            chunk.web.uri 
                            for chunk in metadata.grounding_chunks 
                            if hasattr(chunk, 'web') and chunk.web.uri
                        ]
            
            return result
        except Exception as e:
            raise AIClientError(
                f"Gemini API call failed: {str(e)}",
                provider="gemini",
                original_error=e
            )
    
    async def analyze_competitors(
        self,
        brand_name: str,
        domain: str,
        category: str,
        existing_competitors: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze competitors using Gemini with Google Search grounding.
        
        This is the preferred method for finding REAL competitors
        as it uses live web search data.
        """
        existing = ", ".join(existing_competitors) if existing_competitors else "None"
        
        prompt = f"""Research and identify REAL competitors for this brand using web search:

Brand: {brand_name}
Domain: {domain}
Category: {category}
Known Competitors: {existing}

Search the web to find actual competitors. For each competitor provide:
- name: Company name
- domain: Website domain (e.g., competitor.com)
- tier: "tier1" (direct), "tier2" (indirect), "tier3" (aspirational)
- why: Brief explanation based on your search findings

Return ONLY valid JSON:
{{
  "competitors": [
    {{"name": "...", "domain": "...", "tier": "tier1", "why": "..."}}
  ],
  "search_sources": ["url1", "url2"],
  "market_context": "Brief market analysis"
}}

IMPORTANT: Use REAL competitor domains from your search, not made up ones."""

        result = await self._call_gemini(prompt, use_search=True)
        
        try:
            json_str = result["text"].strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.startswith("```"):
                json_str = json_str[3:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            data = json.loads(json_str.strip())
            
            # Add grounding sources
            if result["sources"]:
                data["grounding_sources"] = result["sources"]
            
            return data
        except json.JSONDecodeError as e:
            raise AIClientError(
                f"Failed to parse Gemini response: {str(e)}",
                provider="gemini"
            )
    
    async def generate_insights(
        self,
        signals: List[Dict[str, Any]],
        brand_context: Dict[str, Any]
    ) -> str:
        """Generate insights using Gemini."""
        prompt = f"""Analyze competitive signals for {brand_context.get('name', 'Unknown')}:

Signals: {json.dumps(signals, indent=2)}

Provide strategic insights with:
1. Executive Summary
2. Key Threats
3. Opportunities
4. Recommended Actions"""

        result = await self._call_gemini(prompt, use_search=False)
        return result["text"]
    
    async def sequential_reasoning(
        self,
        problem: str,
        context: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Perform multi-step reasoning with Gemini."""
        prompt = f"""Analyze step by step:

Problem: {problem}
Context: {json.dumps(context)}

Return JSON array: [{{"step": 1, "title": "...", "reasoning": "...", "conclusion": "..."}}]"""

        result = await self._call_gemini(prompt, use_search=False)
        
        try:
            json_str = result["text"].strip()
            if json_str.startswith("```"):
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError:
            return [{"step": 1, "title": "Analysis", "reasoning": result["text"], "conclusion": "See reasoning"}]
    
    async def validate_against_guardrails(
        self,
        content: str,
        negative_scope: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate content against guardrails."""
        prompt = f"""Validate content against guardrails:

Content: {content}
Guardrails: {json.dumps(negative_scope)}

Return JSON: {{"is_valid": bool, "violations": [], "risk_level": "none|low|medium|high"}}"""

        result = await self._call_gemini(prompt, use_search=False)
        
        try:
            json_str = result["text"].strip()
            if "```" in json_str:
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError:
            return {"is_valid": True, "violations": [], "risk_level": "none"}
    
    async def generate_content_brief(
        self,
        keyword: str,
        brand_context: Dict[str, Any],
        competitor_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Generate content brief with optional web research."""
        prompt = f"""Create content brief for keyword "{keyword}":

Brand: {json.dumps(brand_context)}
Competitors: {json.dumps(competitor_data or [])}

Return JSON content brief with search_intent, target_audience, recommended_format, key_topics, seo_recommendations."""

        result = await self._call_gemini(prompt, use_search=True)
        
        try:
            json_str = result["text"].strip()
            if "```" in json_str:
                json_str = json_str.split("```")[1]
                if json_str.startswith("json"):
                    json_str = json_str[4:]
            
            data = json.loads(json_str.strip())
            if result["sources"]:
                data["research_sources"] = result["sources"]
            
            return data
        except json.JSONDecodeError as e:
            raise AIClientError(f"Failed to parse content brief: {str(e)}", provider="gemini")
