"""
Claude AI Client with BYOK Support
===================================

Anthropic Claude client implementation for Brand Intelligence platform.
Supports BYOK (Bring Your Own Key) configuration via environment variables.
"""

import os
import json
from typing import List, Dict, Any, Optional
from anthropic import Anthropic
from tenacity import retry, stop_after_attempt, wait_exponential

from brand_intel.ai.base import BaseAIClient
from brand_intel.core.exceptions import AIClientError


class ClaudeClient(BaseAIClient):
    """
    Claude client with BYOK (Bring Your Own Key) support.
    
    Reads API key from:
    1. Constructor parameter
    2. ANTHROPIC_API_KEY environment variable
    
    Usage:
        client = ClaudeClient()  # Uses env var
        client = ClaudeClient(api_key="sk-ant-...")  # Uses provided key
    """
    
    DEFAULT_MODEL = "claude-sonnet-4-20250514"
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise AIClientError(
                "ANTHROPIC_API_KEY not found. Set it in environment or pass to constructor.",
                provider="claude"
            )
        
        self.client = Anthropic(api_key=self.api_key)
        self.model = model or self.DEFAULT_MODEL
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def _call_claude(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 4000,
        system: Optional[str] = None
    ) -> str:
        """Make a call to Claude API with retry logic."""
        try:
            kwargs = {
                "model": self.model,
                "max_tokens": max_tokens,
                "messages": messages,
            }
            if system:
                kwargs["system"] = system
            
            response = self.client.messages.create(**kwargs)
            return response.content[0].text
        except Exception as e:
            raise AIClientError(
                f"Claude API call failed: {str(e)}",
                provider="claude",
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
        Use Claude to analyze and suggest competitors.
        
        Returns structured competitor data with reasoning.
        """
        existing = ", ".join(existing_competitors) if existing_competitors else "None"
        
        prompt = f"""Analyze and identify competitors for this brand:

Brand: {brand_name}
Domain: {domain}
Category: {category}
Existing Competitors: {existing}

Provide a comprehensive competitor analysis with:
1. Direct competitors (same product/service, same market)
2. Indirect competitors (similar products, adjacent markets)
3. Aspirational competitors (larger players to benchmark against)

For each competitor, provide:
- name: Company name
- domain: Website domain
- tier: "tier1" (direct), "tier2" (indirect), "tier3" (aspirational)
- why: Brief explanation of why they compete
- similarity_score: 0-100 estimated similarity
- serp_overlap: 0-100 estimated SERP overlap

Return ONLY valid JSON in this format:
{{
  "competitors": [
    {{"name": "...", "domain": "...", "tier": "tier1", "why": "...", "similarity_score": 75, "serp_overlap": 60}}
  ],
  "market_analysis": "Brief market context",
  "recommended_focus": ["competitor1", "competitor2"]
}}"""

        system = """You are an expert competitive intelligence analyst. 
Provide accurate, data-driven competitor analysis. 
Always return valid JSON. Be specific about WHY companies compete."""

        response = await self._call_claude(
            messages=[{"role": "user", "content": prompt}],
            system=system
        )
        
        try:
            # Parse JSON from response
            json_str = response.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.startswith("```"):
                json_str = json_str[3:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError as e:
            raise AIClientError(
                f"Failed to parse Claude response as JSON: {str(e)}",
                provider="claude"
            )
    
    async def generate_insights(
        self,
        signals: List[Dict[str, Any]],
        brand_context: Dict[str, Any]
    ) -> str:
        """
        Generate strategic insights from competitive signals.
        
        Returns markdown-formatted insights.
        """
        prompt = f"""Analyze these competitive signals and generate strategic insights:

Brand Context:
- Name: {brand_context.get('name', 'Unknown')}
- Industry: {brand_context.get('industry', 'Unknown')}
- Primary Goal: {brand_context.get('primary_goal', 'Growth')}

Competitive Signals:
{json.dumps(signals, indent=2)}

Generate:
1. Executive Summary (2-3 sentences)
2. Key Threats (prioritized list)
3. Opportunities Identified
4. Recommended Actions (specific, actionable)
5. Risk Assessment

Format as clean markdown with headers."""

        system = """You are a Fortune 500 competitive intelligence strategist.
Provide executive-level insights that are actionable and data-driven.
Be concise but comprehensive. Focus on business impact."""

        return await self._call_claude(
            messages=[{"role": "user", "content": prompt}],
            system=system,
            max_tokens=2000
        )
    
    async def sequential_reasoning(
        self,
        problem: str,
        context: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Use Claude for multi-step reasoning about competitive strategy.
        
        Returns list of reasoning steps.
        """
        prompt = f"""Analyze this competitive intelligence problem step by step:

Problem: {problem}

Context:
- Brand: {context.get('brand_name', 'Unknown')}
- Industry: {context.get('industry', 'Unknown')}
- Competitors: {context.get('competitors', [])}
- Current Position: {context.get('current_position', 'Unknown')}

Think through this systematically:
1. First, understand the core challenge
2. Analyze the competitive dynamics
3. Consider multiple strategic options
4. Evaluate trade-offs
5. Recommend the best path forward

Return your analysis as a JSON array of steps:
[
  {{"step": 1, "title": "...", "reasoning": "...", "conclusion": "..."}},
  ...
]"""

        system = """You are a strategic consultant using structured reasoning.
Break down complex problems into clear, logical steps.
Each step should build on previous conclusions.
Always return valid JSON array."""

        response = await self._call_claude(
            messages=[{"role": "user", "content": prompt}],
            system=system,
            max_tokens=3000
        )
        
        try:
            json_str = response.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.startswith("```"):
                json_str = json_str[3:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError:
            # Return as single step if parsing fails
            return [{"step": 1, "title": "Analysis", "reasoning": response, "conclusion": "See reasoning"}]
    
    async def validate_against_guardrails(
        self,
        content: str,
        negative_scope: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate content against negative scope guardrails.
        
        Returns validation result with any violations.
        """
        prompt = f"""Validate this content against the brand's guardrails:

Content to Validate:
{content}

Guardrails (Negative Scope):
- Excluded Categories: {negative_scope.get('excluded_categories', [])}
- Excluded Keywords: {negative_scope.get('excluded_keywords', [])}
- Excluded Use Cases: {negative_scope.get('excluded_use_cases', [])}
- Excluded Competitors: {negative_scope.get('excluded_competitors', [])}

Check if the content:
1. Mentions any excluded categories
2. Contains any excluded keywords
3. Relates to any excluded use cases
4. References any excluded competitors

Return JSON:
{{
  "is_valid": true/false,
  "violations": [
    {{"type": "category|keyword|use_case|competitor", "value": "...", "context": "..."}}
  ],
  "risk_level": "none|low|medium|high",
  "recommendation": "..."
}}"""

        system = """You are a brand safety validator.
Be thorough but not overly restrictive.
Flag clear violations, not tangential mentions.
Return valid JSON."""

        response = await self._call_claude(
            messages=[{"role": "user", "content": prompt}],
            system=system,
            max_tokens=1000
        )
        
        try:
            json_str = response.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.startswith("```"):
                json_str = json_str[3:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError:
            return {
                "is_valid": True,
                "violations": [],
                "risk_level": "none",
                "recommendation": "Unable to parse validation response"
            }
    
    async def generate_content_brief(
        self,
        keyword: str,
        brand_context: Dict[str, Any],
        competitor_data: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generate a content brief for a keyword.
        
        Returns structured content brief.
        """
        competitor_info = ""
        if competitor_data:
            competitor_info = f"\nCompetitor Analysis:\n{json.dumps(competitor_data, indent=2)}"
        
        prompt = f"""Generate a content brief for this keyword:

Keyword: {keyword}

Brand Context:
- Name: {brand_context.get('name', 'Unknown')}
- Industry: {brand_context.get('industry', 'Unknown')}
- Target Market: {brand_context.get('target_market', 'Unknown')}
- Primary Goal: {brand_context.get('primary_goal', 'Growth')}
{competitor_info}

Create a comprehensive content brief including:
1. Search Intent Analysis
2. Target Audience
3. Content Format Recommendation
4. Key Topics to Cover
5. Differentiation Strategy
6. SEO Recommendations
7. Call-to-Action Suggestions

Return as JSON:
{{
  "keyword": "...",
  "search_intent": "informational|navigational|transactional|commercial",
  "target_audience": "...",
  "recommended_format": "blog|guide|comparison|landing_page|video",
  "key_topics": ["..."],
  "differentiation": "...",
  "seo_recommendations": {{
    "title_suggestion": "...",
    "meta_description": "...",
    "h1_suggestion": "...",
    "word_count_target": 1500
  }},
  "cta_suggestions": ["..."],
  "priority_score": 0-100
}}"""

        system = """You are an expert content strategist.
Create actionable, SEO-optimized content briefs.
Focus on differentiation and user value.
Return valid JSON."""

        response = await self._call_claude(
            messages=[{"role": "user", "content": prompt}],
            system=system,
            max_tokens=2000
        )
        
        try:
            json_str = response.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.startswith("```"):
                json_str = json_str[3:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            return json.loads(json_str.strip())
        except json.JSONDecodeError as e:
            raise AIClientError(
                f"Failed to parse content brief response: {str(e)}",
                provider="claude"
            )
