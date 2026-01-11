"""
DataForSEO Provider
==================

Proveedor de datos para DataForSEO API.
Proporciona acceso a datos de keywords, rankings, y análisis competitivo.
"""

import os
import httpx
import base64
from typing import List, Dict, Any, Optional
import asyncio
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class DataForSEOProvider:
    """
    Proveedor de datos para DataForSEO API.

    Maneja todas las interacciones con la API de DataForSEO para:
    - Keywords rankings
    - Keyword gap analysis
    - SERP data
    - Competitor intelligence
    """

    BASE_URL = "https://api.dataforseo.com/v3"

    def __init__(self):
        # Get credentials from environment
        login = os.getenv("DATAFORSEO_LOGIN")
        password = os.getenv("DATAFORSEO_PASSWORD")

        if not login or not password:
            raise ValueError("DataForSEO credentials not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables.")

        # Create basic auth credentials
        credentials = f"{login}:{password}"
        self.auth_header = f"Basic {base64.b64encode(credentials.encode()).decode()}"

        # Initialize HTTP client
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": self.auth_header,
                "Content-Type": "application/json"
            },
            timeout=60.0
        )

        self._rate_limits = {
            "requests_per_minute": 60,
            "current_minute": datetime.now().minute,
            "requests_this_minute": 0
        }

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.client.aclose()

    async def _respect_rate_limits(self):
        """Respect API rate limits."""
        current_minute = datetime.now().minute

        if current_minute != self._rate_limits["current_minute"]:
            # Reset counter for new minute
            self._rate_limits["current_minute"] = current_minute
            self._rate_limits["requests_this_minute"] = 0

        if self._rate_limits["requests_this_minute"] >= self._rate_limits["requests_per_minute"]:
            # Wait until next minute
            next_minute = datetime.now().replace(second=0, microsecond=0) + timedelta(minutes=1)
            wait_seconds = (next_minute - datetime.now()).total_seconds()
            logger.info(f"Rate limit reached, waiting {wait_seconds:.1f} seconds")
            await asyncio.sleep(wait_seconds)
            self._rate_limits["current_minute"] = datetime.now().minute
            self._rate_limits["requests_this_minute"] = 0

        self._rate_limits["requests_this_minute"] += 1

    async def _make_request(self, endpoint: str, payload: List[Dict]) -> Dict[str, Any]:
        """Make authenticated request to DataForSEO API."""
        await self._respect_rate_limits()

        url = f"{self.BASE_URL}/{endpoint}"

        try:
            logger.info(f"Making DataForSEO request to {endpoint}")
            response = await self.client.post(url, json=payload)

            if response.status_code == 401:
                raise ValueError("Invalid DataForSEO credentials")
            elif response.status_code == 429:
                logger.warning("DataForSEO rate limit hit, retrying after delay")
                await asyncio.sleep(60)  # Wait a minute
                response = await self.client.post(url, json=payload)
            elif response.status_code != 200:
                raise ValueError(f"DataForSEO API error: {response.status_code} - {response.text}")

            data = response.json()

            # Check for API-level errors
            if data.get("status_code") != 20000:
                error_message = data.get("status_message", "Unknown API error")
                raise ValueError(f"DataForSEO API error: {error_message}")

            return data

        except httpx.RequestError as e:
            logger.error(f"DataForSEO request failed: {e}")
            raise ValueError(f"DataForSEO request failed: {str(e)}")

    async def get_ranked_keywords(
        self,
        domain: str,
        location_code: int = 2840,  # United States
        limit: int = 100,
        language_code: str = "en"
    ) -> List[Dict[str, Any]]:
        """
        Get keywords that a domain ranks for.

        Args:
            domain: Target domain (e.g., "example.com")
            location_code: Geographic location code (2840 = US)
            limit: Maximum number of keywords to return
            language_code: Language code

        Returns:
            List of keyword ranking data
        """
        payload = [{
            "target": domain,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit,
            "filters": [
                ["keyword_data.keyword_info.search_volume", ">", 10],  # Only keywords with meaningful volume
                ["ranked_serp_element.serp_item.rank_absolute", "<=", 50]  # Top 50 positions
            ]
        }]

        data = await self._make_request("dataforseo_labs/google/ranked_keywords/live", payload)

        if data.get("tasks") and len(data["tasks"]) > 0:
            result = data["tasks"][0].get("result", [])
            if result and len(result) > 0:
                return result[0].get("items", [])

        return []

    async def get_keyword_gap(
        self,
        target: str,
        competitors: List[str],
        location_code: int = 2840,
        language_code: str = "en",
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get keyword gap analysis between target and competitors.

        Args:
            target: Target domain
            competitors: List of competitor domains
            location_code: Geographic location code
            language_code: Language code
            limit: Maximum keywords to analyze

        Returns:
            Keyword gap analysis data
        """
        # Limit competitors to avoid API limits
        competitors = competitors[:10]

        payload = [{
            "target": target,
            "competitors": competitors,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit,
            "filters": [
                ["keyword_data.keyword_info.search_volume", ">", 100],  # Meaningful search volume
                ["keyword_data.keyword_info.competition_level", "<=", 0.8]  # Not too competitive
            ]
        }]

        data = await self._make_request("dataforseo_labs/google/competitors_domain/live", payload)

        if data.get("tasks") and len(data["tasks"]) > 0:
            result = data["tasks"][0].get("result", [])
            if result and len(result) > 0:
                return result[0]

        return {}

    async def get_domain_overview(
        self,
        domain: str,
        location_code: int = 2840,
        language_code: str = "en"
    ) -> Dict[str, Any]:
        """
        Get comprehensive domain overview including rankings, backlinks, etc.

        Args:
            domain: Target domain
            location_code: Geographic location code
            language_code: Language code

        Returns:
            Domain overview data
        """
        payload = [{
            "target": domain,
            "location_code": location_code,
            "language_code": language_code,
            "include_subdomains": True,
            "ignore_synonyms": False
        }]

        data = await self._make_request("dataforseo_labs/google/domain_rank_overview/live", payload)

        if data.get("tasks") and len(data["tasks"]) > 0:
            result = data["tasks"][0].get("result", [])
            if result and len(result) > 0:
                return result[0]

        return {}

    async def get_serp_data(
        self,
        keyword: str,
        location_code: int = 2840,
        language_code: str = "en"
    ) -> Dict[str, Any]:
        """
        Get SERP (Search Engine Results Page) data for a keyword.

        Args:
            keyword: Search keyword
            location_code: Geographic location code
            language_code: Language code

        Returns:
            SERP data including organic results, paid ads, etc.
        """
        payload = [{
            "keyword": keyword,
            "location_code": location_code,
            "language_code": language_code,
            "device": "desktop",
            "os": "windows"
        }]

        data = await self._make_request("serp/google/organic/live/advanced", payload)

        if data.get("tasks") and len(data["tasks"]) > 0:
            result = data["tasks"][0].get("result", [])
            if result and len(result) > 0:
                return result[0]

        return {}

    async def get_keyword_suggestions(
        self,
        keyword: str,
        location_code: int = 2840,
        language_code: str = "en",
        limit: int = 50
    ) -> List[str]:
        """
        Get keyword suggestions and related terms.

        Args:
            keyword: Base keyword
            location_code: Geographic location code
            language_code: Language code
            limit: Maximum suggestions to return

        Returns:
            List of suggested keywords
        """
        payload = [{
            "keyword": keyword,
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit
        }]

        data = await self._make_request("dataforseo_labs/google/keyword_suggestions/live", payload)

        suggestions = []
        if data.get("tasks") and len(data["tasks"]) > 0:
            result = data["tasks"][0].get("result", [])
            if result and len(result) > 0:
                items = result[0].get("items", [])
                suggestions = [item.get("keyword") for item in items if item.get("keyword")]

        return suggestions[:limit]

    async def get_competitor_analysis(
        self,
        target: str,
        competitors: List[str],
        location_code: int = 2840,
        language_code: str = "en"
    ) -> Dict[str, Any]:
        """
        Get detailed competitor analysis including shared keywords, etc.

        Args:
            target: Target domain
            competitors: List of competitor domains
            location_code: Geographic location code
            language_code: Language code

        Returns:
            Competitor analysis data
        """
        # Get shared keywords
        shared_keywords_payload = [{
            "targets": [target] + competitors[:4],  # Include target + up to 4 competitors
            "location_code": location_code,
            "language_code": language_code,
            "limit": 100
        }]

        data = await self._make_request("dataforseo_labs/google/shared_keywords/live", shared_keywords_payload)

        analysis = {
            "target": target,
            "competitors": competitors,
            "shared_keywords": [],
            "unique_keywords": {},
            "overlap_analysis": {}
        }

        if data.get("tasks") and len(data["tasks"]) > 0:
            result = data["tasks"][0].get("result", [])
            if result and len(result) > 0:
                items = result[0].get("items", [])

                # Process shared keywords
                for item in items:
                    keyword_data = {
                        "keyword": item.get("keyword"),
                        "search_volume": item.get("keyword_data", {}).get("keyword_info", {}).get("search_volume", 0),
                        "competition": item.get("keyword_data", {}).get("keyword_info", {}).get("competition", 0),
                        "ranking_domains": item.get("ranking_domains", [])
                    }
                    analysis["shared_keywords"].append(keyword_data)

        # Calculate overlap metrics
        total_shared = len(analysis["shared_keywords"])
        analysis["overlap_analysis"] = {
            "total_shared_keywords": total_shared,
            "overlap_percentage": (total_shared / max(1, len(competitors))) * 100 if competitors else 0,
            "competitive_intensity": "high" if total_shared > 50 else "medium" if total_shared > 20 else "low"
        }

        return analysis

    async def health_check(self) -> bool:
        """
        Check if DataForSEO API is accessible and credentials are valid.

        Returns:
            True if API is healthy, False otherwise
        """
        try:
            # Make a simple request to test connectivity
            payload = [{
                "keyword": "test",
                "location_code": 2840,
                "language_code": "en"
            }]

            data = await self._make_request("keywords_data/google/search_volume/live", payload)
            return data.get("status_code") == 20000

        except Exception as e:
            logger.error(f"DataForSEO health check failed: {e}")
            return False

    async def get_account_info(self) -> Dict[str, Any]:
        """
        Get account information and usage statistics.

        Returns:
            Account information including credits remaining, etc.
        """
        try:
            response = await self.client.get(f"{self.BASE_URL}/account")

            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Failed to get account info: {response.status_code}")
                return {}

        except Exception as e:
            logger.error(f"Account info request failed: {e}")
            return {}


# Convenience function for easy access
async def get_dataforseo_provider() -> DataForSEOProvider:
    """Get configured DataForSEO provider instance."""
    return DataForSEOProvider()
