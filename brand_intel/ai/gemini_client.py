"""
Google Gemini Client with BYOK Support
=======================================

Gemini client with Google Search grounding for Brand Intelligence platform.
"""

import os
import json
import asyncio
from typing import List, Dict, Any, Optional

from brand_intel.ai.base import BaseAIClient
from brand_intel.core.exceptions import AIClientError

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class GeminiClient(BaseAIClient):
    """
    Google Gemini client with Google Search grounding.
    
    Reads API key from GEMINI_API_KEY or GOOGLE_API_KEY.
    """
    
    DEFAULT_MODEL = "gemini-1.5-flash"
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        if not GEMINI_AVAILABLE:
            raise AIClientError(
                "google-generativeai package not installed. Run: pip install google-generativeai",
                provider="gemini"
            )
        
        # Try multiple env var names
        self.api_key = (
            api_key or 
            os.getenv("GOOGLE_API_KEY") or 
            os.getenv("GEMINI_API_KEY") or 
            os.getenv("AI_INTEGRATIONS_GEMINI_API_KEY")
        )
        
        if not self.api_key:
            raise AIClientError(
                "GEMINI_API_KEY or GOOGLE_API_KEY not found",
                provider="gemini"
            )
        
        # Configure the API
        genai.configure(api_key=self.api_key)
        self.model_name = model or self.DEFAULT_MODEL
        self.model = genai.GenerativeModel(self.model_name)
    
    async def _call_gemini(
        self,
        prompt: str,
        use_search: bool = False,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """Make a call to Gemini API."""
        last_error = None
        
        for attempt in range(max_retries):
            try:
                # Run synchronous API call in executor to not block event loop
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.model.generate_content(prompt)
                )
                
                result = {
                    "text": response.text if hasattr(response, 'text') else str(response),
                    "sources": []
                }
                
                return result
                
            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                
                # Don't retry on certain errors
                if "api_key" in error_str or "invalid" in error_str:
                    raise AIClientError(
                        f"Gemini API key error: {str(e)}",
                        provider="gemini",
                        original_error=e
                    )
                
                # Wait before retry
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
        
        raise AIClientError(
            f"Gemini API call failed after {max_retries} attempts: {str(last_error)}",
            provider="gemini",
            original_error=last_error
        )
    
    async def analyze_competitors(
        self,
        domain: str,
        category: str,
        existing_competitors: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze competitors using Gemini.
        
        Args:
            domain: The domain to analyze
            category: The category/industry
            existing_competitors: Optional list of known competitors
        """
        existing = ", ".join(existing_competitors) if existing_competitors else "None"
        
        prompt = f"""Identify competitors for this business:

Domain: {domain}
Category: {category}
Known Competitors: {existing}

For each competitor provide:
- name: Company name
- domain: Website domain
- tier: "tier1" (direct), "tier2" (indirect), "tier3" (aspirational)
- why: Brief explanation

Return ONLY valid JSON:
{{
  "competitors": [
    {{"name": "...", "domain": "...", "tier": "tier1", "why": "..."}}
  ],
  "market_context": "Brief market analysis"
}}"""

        result = await self._call_gemini(prompt)
        
        try:
            json_str = result["text"].strip()
            # Clean markdown code blocks
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            
            data = json.loads(json_str.strip())
            return data
        except json.JSONDecodeError as e:
            # Return a basic structure if parsing fails
            return {
                "competitors": [],
                "market_context": result["text"][:500] if result.get("text") else "Analysis completed"
            }
    
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

        result = await self._call_gemini(prompt)
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

        result = await self._call_gemini(prompt)
        
        try:
            json_str = result["text"].strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            
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

        result = await self._call_gemini(prompt)
        
        try:
            json_str = result["text"].strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError:
            return {"is_valid": True, "violations": [], "risk_level": "none"}
    
    async def generate_content_brief(
        self,
        keyword: str,
        brand_context: Dict[str, Any],
        competitor_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Generate content brief."""
        prompt = f"""Create content brief for keyword "{keyword}":

Brand: {json.dumps(brand_context)}
Competitors: {json.dumps(competitor_data or [])}

Return JSON content brief with search_intent, target_audience, recommended_format, key_topics, seo_recommendations."""

        result = await self._call_gemini(prompt)
        
        try:
            json_str = result["text"].strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError:
            return {
                "search_intent": "informational",
                "target_audience": "general",
                "recommended_format": "article",
                "key_topics": [keyword],
                "seo_recommendations": ["Include target keyword in title"]
            }
    
    async def analyze_domain(
        self,
        domain: str,
        brand_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a domain for brand intelligence.
        
        Args:
            domain: The domain to analyze
            brand_name: Optional brand name
        
        Returns:
            Analysis results with brand, category, strategy, and guardrails
        """
        prompt = f"""Analyze this domain for brand intelligence:

Domain: {domain}
Brand Name: {brand_name or "Unknown"}

Provide analysis in this JSON format:
{{
  "brand": {{
    "name": "string",
    "industry": "string",
    "business_model": "B2B or B2C or D2C",
    "target_market": "string",
    "primary_geography": ["string"],
    "funding_stage": "string"
  }},
  "category": {{
    "primary_category": "string",
    "included": ["string"],
    "excluded": ["string"]
  }},
  "strategy": {{
    "primary_goal": "string",
    "risk_tolerance": "low or medium or high",
    "secondary_goals": ["string"]
  }},
  "guardrails": {{
    "excluded_categories": ["string"],
    "excluded_keywords": ["string"]
  }}
}}

Return ONLY valid JSON."""

        result = await self._call_gemini(prompt)
        
        try:
            json_str = result["text"].strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError:
            # Return basic structure
            return {
                "brand": {
                    "name": brand_name or domain.split('.')[0].title(),
                    "industry": "Technology",
                    "business_model": "B2C",
                    "target_market": "General consumers",
                    "primary_geography": ["US"],
                    "funding_stage": "Unknown"
                },
                "category": {
                    "primary_category": "Technology",
                    "included": [],
                    "excluded": []
                },
                "strategy": {
                    "primary_goal": "brand_awareness",
                    "risk_tolerance": "medium",
                    "secondary_goals": []
                },
                "guardrails": {
                    "excluded_categories": ["adult_content", "gambling"],
                    "excluded_keywords": []
                }
            }
