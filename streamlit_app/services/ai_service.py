"""
AI Service - Integración con modelos de IA
===========================================

Servicio unificado para interactuar con Claude, OpenAI y Gemini.
Proporciona funciones específicas para el wizard de creación de UCR.
"""

import os
from typing import List, Dict, Any, Optional
from datetime import datetime

# Load .env file before any imports
try:
    from dotenv import load_dotenv
    from pathlib import Path
    
    # Try to find .env file
    current_dir = Path(__file__).parent.parent.parent  # streamlit_app/services -> usercontextrecord
    env_path = current_dir / '.env'
    
    if env_path.exists():
        load_dotenv(env_path)
        print("✅ AI Service loaded .env file")
    else:
        print("⚠️ AI Service: .env file not found")
        
except ImportError:
    print("⚠️ AI Service: python-dotenv not available")

try:
    from brand_intel.ai import ClaudeClient, OpenAIClient, GeminiClient
    from brand_intel.core.models import Competitor, CompetitorTier, Evidence
    from brand_intel.core.exceptions import AIClientError
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False


class AIService:
    """
    Unified AI service for the Streamlit microservice.

    Provides high-level functions for UCR creation and analysis.
    Handles provider selection and fallbacks automatically.
    """

    def __init__(self, settings=None):
        if not AI_AVAILABLE:
            raise AIClientError("AI libraries not available. Install brand_intel package.")

        # Initialize AI clients
        self.claude = self._init_claude()
        self.openai = self._init_openai()
        self.gemini = self._init_gemini()

        # Provider priority (most preferred first)
        self.provider_priority = ["claude", "gemini", "openai"]

    def _init_claude(self) -> Optional[ClaudeClient]:
        """Initialize Claude client if available."""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                return ClaudeClient()
            except Exception:
                pass
        return None

    def _init_openai(self) -> Optional[OpenAIClient]:
        """Initialize OpenAI client if available."""
        if os.getenv("OPENAI_API_KEY"):
            try:
                return OpenAIClient()
            except Exception:
                pass
        return None

    def _init_gemini(self) -> Optional[GeminiClient]:
        """Initialize Gemini client if available."""
        if os.getenv("GEMINI_API_KEY"):
            try:
                return GeminiClient()
            except Exception:
                pass
        return None

    def get_available_providers(self) -> List[str]:
        """Get list of available AI providers."""
        providers = []
        if self.claude:
            providers.append("claude")
        if self.gemini:
            providers.append("gemini")
        if self.openai:
            providers.append("openai")
        return providers

    def _get_best_provider(self, preferred_provider: Optional[str] = None) -> Optional[Any]:
        """Get the best available AI provider."""
        if preferred_provider and hasattr(self, preferred_provider):
            client = getattr(self, preferred_provider)
            if client:
                return client

        # Fall back to priority order
        for provider_name in self.provider_priority:
            if hasattr(self, provider_name):
                client = getattr(self, provider_name)
                if client:
                    return client

        return None

    async def analyze_domain(
        self,
        domain: str,
        brand_name: Optional[str] = None,
        preferred_provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze a domain to generate initial UCR sections.

        Args:
            domain: The domain to analyze
            brand_name: Optional brand name override
            preferred_provider: Preferred AI provider

        Returns:
            Dictionary with brand, category, and other analysis data
        """
        client = self._get_best_provider(preferred_provider)
        if not client:
            raise AIClientError("No AI providers available")

        try:
            # Use Gemini for search capabilities, Claude for analysis
            if preferred_provider == "gemini" and self.gemini:
                return await self._analyze_with_gemini(domain, brand_name)
            elif self.claude:
                return await self._analyze_with_claude(domain, brand_name)
            elif self.gemini:
                return await self._analyze_with_gemini(domain, brand_name)
            else:
                return await self._analyze_with_openai(domain, brand_name)
        except AIClientError as e:
            raise e
        except Exception as e:
            raise AIClientError(f"Domain analysis failed: {str(e)}")

    async def search_competitors(
        self,
        domain: str,
        category: str,
        brand_name: Optional[str] = None,
        preferred_provider: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for competitors using AI and web search.

        Args:
            domain: Target domain
            category: Business category
            brand_name: Optional brand name
            preferred_provider: Preferred AI provider

        Returns:
            List of competitor dictionaries
        """
        # Gemini is best for search due to Google Search integration
        if self.gemini and (preferred_provider == "gemini" or not preferred_provider):
            return await self._search_competitors_gemini(domain, category, brand_name)
        elif self.claude:
            return await self._search_competitors_claude(domain, category, brand_name)
        else:
            raise AIClientError("No suitable AI provider for competitor search")

    async def _analyze_with_claude(
        self,
        domain: str,
        brand_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze domain using Claude."""
        if not self.claude:
            raise AIClientError("Claude not available")

        prompt = f"""
        Analyze the domain {domain} to create a User Context Record (UCR) for brand intelligence.

        {f"The brand is known as '{brand_name}'." if brand_name else ""}

        Please provide a comprehensive analysis including:

        1. BRAND CONTEXT:
        - Brand name (if not provided)
        - Industry sector
        - Business model (B2B, B2C, B2B2C, Marketplace, SaaS)
        - Target market description
        - Primary geography (regions/countries)
        - Funding stage (if public company)

        2. CATEGORY DEFINITION:
        - Primary category
        - Included sub-categories
        - Excluded categories
        - Semantic extensions (related terms)

        3. STRATEGIC INTENT:
        - Primary goal (market_share, profit_maximization, brand_awareness, etc.)
        - Risk tolerance (low, medium, high)
        - Secondary goals
        - Time horizon (short, medium, long)

        4. GUARDRAILS:
        - Excluded categories (gambling, adult_content, weapons, etc.)
        - Excluded keywords
        - Industry-specific restrictions

        Return ONLY valid JSON in this format:
        {{
          "brand": {{
            "name": "string",
            "industry": "string",
            "business_model": "string",
            "target_market": "string",
            "primary_geography": ["string"],
            "funding_stage": "string"
          }},
          "category": {{
            "primary_category": "string",
            "included": ["string"],
            "excluded": ["string"],
            "semantic_extensions": ["string"]
          }},
          "strategy": {{
            "primary_goal": "string",
            "risk_tolerance": "string",
            "secondary_goals": ["string"],
            "time_horizon": "string"
          }},
          "guardrails": {{
            "excluded_categories": ["string"],
            "excluded_keywords": ["string"],
            "industry_specific": ["string"]
          }}
        }}
        """

        response = await self.claude.generate_completion(prompt, max_tokens=2000)

        # Parse JSON response
        import json
        try:
            return json.loads(response.strip())
        except json.JSONDecodeError:
            # Fallback parsing
            return self._parse_json_fallback(response)

    async def _analyze_with_gemini(
        self,
        domain: str,
        brand_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze domain using Gemini with comprehensive error handling."""
        if not self.gemini:
            raise AIClientError("Gemini client not available")

        try:
            print("🤖 Calling Gemini analyze_domain...")
            response = await self.gemini.analyze_domain(domain, brand_name)
            print("✅ Gemini domain analysis completed")
            return response

        except Exception as e:
            print(f"❌ Gemini domain analysis failed: {str(e)}")
            print("💥 NO FALLBACK DATA USED - Only real AI data accepted")
            raise AIClientError(f"Gemini domain analysis failed: {str(e)}")

    async def _analyze_with_openai(
        self,
        domain: str,
        brand_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fallback analysis using OpenAI."""
        if not self.openai:
            raise AIClientError("OpenAI not available")

        prompt = f"Analyze domain {domain} for brand intelligence context and return JSON."

        response = await self.openai.generate_completion(prompt, max_tokens=1500)

        import json
        try:
            return json.loads(response.strip())
        except json.JSONDecodeError:
            return self._parse_json_fallback(response)

    async def _search_competitors_gemini(
        self,
        domain: str,
        category: str,
        brand_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search competitors using Gemini with Google Search."""
        if not self.gemini:
            raise AIClientError("Gemini not available")

        try:
            response = await self.gemini.analyze_competitors(
                domain,  # First positional argument: domain
                category,  # Second positional argument: category
                None  # existing_competitors: Optional[List[str]] = None
            )

            # The analyze_competitors method returns Dict[str, Any]
            # Extract competitors from the response
            if isinstance(response, dict) and "competitors" in response:
                return response["competitors"]
            elif isinstance(response, list):
                return response
            else:
                # No fallback data - only real AI data accepted
                raise AIClientError("Invalid response format from Gemini - Only real AI data accepted")

        except Exception as e:
            print(f"❌ Gemini competitor search failed: {str(e)}")
            print("💥 NO FALLBACK DATA USED - Only real AI data accepted")
            raise AIClientError(f"Gemini competitor search failed: {str(e)}")

    async def _search_competitors_claude(
        self,
        domain: str,
        category: str,
        brand_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search competitors using Claude (without search)."""
        if not self.claude:
            raise AIClientError("Claude not available")

        prompt = f"""
        Based on your knowledge, identify competitors for {brand_name or domain} in the {category} category.

        Return a JSON array of competitor objects with name, domain, tier, and why_selected.
        """

        response = await self.claude.generate_completion(prompt, max_tokens=1000)

        import json
        try:
            competitors = json.loads(response.strip())
            return competitors if isinstance(competitors, list) else []
        except json.JSONDecodeError:
            return []

    def _parse_json_fallback(self, response: str) -> Dict[str, Any]:
        """Parse JSON response - NO FALLBACK DATA USED."""
        # Simple fallback - extract JSON-like content
        import re
        import json

        # Try to find JSON block
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except Exception as e:
                print(f"❌ JSON parsing failed: {str(e)}")
                print("💥 NO FALLBACK DATA USED - Only real AI data accepted")
                raise AIClientError(f"JSON parsing failed: {str(e)}")

        # NO FALLBACK DATA - Only real AI data accepted
        raise AIClientError("No valid JSON found in AI response - Only real AI data accepted")

    async def generate_insights(
        self,
        signals: List[Dict[str, Any]],
        config: Dict[str, Any],
        preferred_provider: Optional[str] = None
    ) -> str:
        """
        Generate executive insights from competitive signals.

        Args:
            signals: List of signal dictionaries
            config: Configuration data dictionary
            preferred_provider: Preferred AI provider

        Returns:
            Formatted insights string
        """
        client = self._get_best_provider(preferred_provider)
        if not client:
            raise AIClientError("No AI providers available")

        try:
            # Format signals for analysis
            signals_summary = self._format_signals_for_insights(signals)
            brand_context = config.get("brand", {})

            prompt = f"""
            Generate executive-level insights from these competitive signals for {brand_context.get('name', 'the brand')}:

            BRAND CONTEXT:
            - Name: {brand_context.get('name', 'Unknown')}
            - Industry: {brand_context.get('industry', 'Unknown')}
            - Target Market: {brand_context.get('target_market', 'Unknown')}

            COMPETITIVE SIGNALS:
            {signals_summary}

            Please provide:
            1. EXECUTIVE SUMMARY (2-3 sentences)
            2. KEY INSIGHTS (3-5 bullet points)
            3. STRATEGIC IMPLICATIONS (2-3 points)
            4. RECOMMENDED ACTIONS (3-5 specific actions)

            Format as clean, professional insights suitable for executive presentation.
            Focus on actionable intelligence that impacts strategy.
            """

            response = await client.generate_completion(prompt, max_tokens=1500)

            return self._format_insights_response(response)

        except Exception as e:
            raise AIClientError(f"Insight generation failed: {str(e)}")

    async def generate_content_brief(
        self,
        keyword: str,
        config: Dict[str, Any],
        brief_type: str = "blog",
        preferred_provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate content brief for a keyword.

        Args:
            keyword: Target keyword
            config: Configuration data dictionary
            brief_type: Type of content (blog, social, etc.)
            preferred_provider: Preferred AI provider

        Returns:
            Content brief dictionary
        """
        client = self._get_best_provider(preferred_provider)
        if not client:
            raise AIClientError("No AI providers available")

        try:
            brand_context = config.get("brand", {})
            category = config.get("category_definition", {})

            prompt = f"""
            Create a comprehensive content brief for the keyword "{keyword}".

            BRAND CONTEXT:
            - Brand: {brand_context.get('name', 'Unknown')}
            - Industry: {brand_context.get('industry', 'Unknown')}
            - Target Audience: {brand_context.get('target_market', 'Unknown')}
            - Category: {category.get('primary_category', 'Unknown')}

            CONTENT TYPE: {brief_type}

            Generate a content brief with:
            1. TITLE: Compelling headline
            2. OBJECTIVE: What the content should achieve
            3. TARGET_KEYWORDS: Primary and secondary keywords
            4. CONTENT_STRUCTURE: Outline with sections
            5. KEY_POINTS: Main points to cover
            6. TONE_AND_VOICE: Writing style guidelines
            7. CALL_TO_ACTION: Desired user action

            Return as JSON object.
            """

            response = await client.generate_completion(prompt, max_tokens=1200)

            import json
            try:
                brief = json.loads(response.strip())
                return brief
            except json.JSONDecodeError:
                return {
                    "title": f"Content Brief for {keyword}",
                    "objective": f"Create engaging {brief_type} content about {keyword}",
                    "target_keywords": [keyword],
                    "content_structure": ["Introduction", "Main Content", "Conclusion"],
                    "key_points": ["Point 1", "Point 2", "Point 3"],
                    "tone_and_voice": "Professional and informative",
                    "call_to_action": "Learn more about our services"
                }

        except Exception as e:
            raise AIClientError(f"Content brief generation failed: {str(e)}")

    async def validate_guardrails(
        self,
        content: str,
        guardrails: Dict[str, Any],
        preferred_provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate content against UCR guardrails.

        Args:
            content: Content to validate
            guardrails: Guardrails configuration
            preferred_provider: Preferred AI provider

        Returns:
            Validation result dictionary
        """
        client = self._get_best_provider(preferred_provider)
        if not client:
            raise AIClientError("No AI providers available")

        try:
            excluded_categories = guardrails.get("excluded_categories", [])
            excluded_keywords = guardrails.get("excluded_keywords", [])

            prompt = f"""
            Check if this content violates any guardrails:

            CONTENT TO CHECK:
            "{content}"

            GUARDRAILS:
            - Excluded Categories: {', '.join(excluded_categories)}
            - Excluded Keywords: {', '.join(excluded_keywords)}

            ANALYSIS:
            1. Does the content mention any excluded categories?
            2. Does the content contain any excluded keywords?
            3. Is the content tone appropriate for the brand?

            Return JSON with:
            {{
              "is_valid": boolean,
              "violations": [{{"type": "category|keyword|tone", "value": "violation", "reason": "explanation"}}],
              "warnings": ["any warnings"],
              "recommendations": ["suggestions for improvement"]
            }}
            """

            response = await client.generate_completion(prompt, max_tokens=800)

            import json
            try:
                result = json.loads(response.strip())
                return result
            except json.JSONDecodeError:
                # Fallback analysis
                violations = []

                content_lower = content.lower()
                for keyword in excluded_keywords:
                    if keyword.lower() in content_lower:
                        violations.append({
                            "type": "keyword",
                            "value": keyword,
                            "reason": f"Contains excluded keyword '{keyword}'"
                        })

                return {
                    "is_valid": len(violations) == 0,
                    "violations": violations,
                    "warnings": [],
                    "recommendations": ["Review content against brand guidelines"] if violations else []
                }

        except Exception as e:
            raise AIClientError(f"Guardrail validation failed: {str(e)}")

    def _format_signals_for_insights(self, signals: List[Dict[str, Any]]) -> str:
        """Format signals list for insights generation."""
        if not signals:
            return "No signals available for analysis."

        formatted = []
        for signal in signals[:10]:  # Limit to first 10 signals
            formatted.append(f"""
            • {signal.get('signal_type', 'Unknown').replace('_', ' ').title()}:
              Competitor: {signal.get('competitor', 'Unknown')}
              Severity: {signal.get('severity', 'medium').title()}
              Description: {signal.get('description', 'No description')[:100]}...
            """)

        return "\n".join(formatted)

    def _format_insights_response(self, response: str) -> str:
        """Format and clean insights response."""
        # Clean up any markdown formatting issues
        response = response.strip()

        # Ensure proper markdown formatting
        if not response.startswith("#"):
            response = "# Executive Insights\n\n" + response

        return response

# Global instance for easy access
_ai_service_instance = None

def get_ai_service() -> AIService:
    """Get global AI service instance."""
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService()
    return _ai_service_instance
