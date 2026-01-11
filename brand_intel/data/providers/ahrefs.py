"""
Ahrefs Provider
===============

Proveedor de datos para Ahrefs API.
Proporciona acceso a datos de backlinks, keywords orgánicos, y análisis de dominio.
"""

import os
import httpx
from typing import List, Dict, Any, Optional
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class AhrefsProvider:
    """
    Proveedor de datos para Ahrefs API.

    Maneja todas las interacciones con la API de Ahrefs para:
    - Backlink analysis
    - Organic keyword tracking
    - Domain authority metrics
    - Competitor research
    """

    BASE_URL = "https://api.ahrefs.com/v2"

    def __init__(self):
        # Get API key from environment
        self.api_key = os.getenv("AHREFS_API_KEY")

        if not self.api_key:
            raise ValueError("Ahrefs API key not configured. Set AHREFS_API_KEY environment variable.")

        # Initialize HTTP client
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=60.0
        )

        self._rate_limits = {
            "requests_per_minute": 100,  # Ahrefs allows ~100 requests per minute
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
            await asyncio.sleep(60)
            self._rate_limits["current_minute"] = datetime.now().minute
            self._rate_limits["requests_this_minute"] = 0

        self._rate_limits["requests_this_minute"] += 1

    async def _make_request(self, endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make authenticated request to Ahrefs API."""
        await self._respect_rate_limits()

        # Add API token to params
        params["token"] = self.api_key

        url = f"{self.BASE_URL}/{endpoint}"

        try:
            logger.info(f"Making Ahrefs request to {endpoint}")
            response = await self.client.get(url, params=params)

            if response.status_code == 401:
                raise ValueError("Invalid Ahrefs API key")
            elif response.status_code == 429:
                logger.warning("Ahrefs rate limit hit, retrying after delay")
                await asyncio.sleep(60)
                response = await self.client.get(url, params=params)
            elif response.status_code != 200:
                raise ValueError(f"Ahrefs API error: {response.status_code} - {response.text}")

            data = response.json()

            # Check for API-level errors
            if data.get("error"):
                error_message = data["error"]
                raise ValueError(f"Ahrefs API error: {error_message}")

            return data

        except httpx.RequestError as e:
            logger.error(f"Ahrefs request failed: {e}")
            raise ValueError(f"Ahrefs request failed: {str(e)}")

    async def get_domain_rating(self, domain: str) -> Dict[str, Any]:
        """
        Get Domain Rating (DR) and other domain metrics.

        Args:
            domain: Target domain

        Returns:
            Domain rating and metrics
        """
        params = {
            "target": domain,
            "mode": "domain",
            "select": "domain_rating,ahrefs_rank,url_rating,backlinks,referring_domains"
        }

        data = await self._make_request("site-explorer/metrics", params)

        if data.get("metrics"):
            return data["metrics"]

        return {}

    async def get_backlinks_stats(self, domain: str) -> Dict[str, Any]:
        """
        Get backlink statistics for a domain.

        Args:
            domain: Target domain

        Returns:
            Backlink statistics
        """
        params = {
            "target": domain,
            "mode": "domain",
            "select": "backlinks,referring_domains,referring_pages,broken_backlinks,lost_backlinks,new_lost_backlinks"
        }

        data = await self._make_request("site-explorer/backlinks-stats", params)

        stats = {
            "domain": domain,
            "total_backlinks": 0,
            "referring_domains": 0,
            "referring_pages": 0,
            "broken_backlinks": 0,
            "lost_backlinks": 0,
            "new_backlinks": 0
        }

        if data.get("stats"):
            stats.update(data["stats"])

        return stats

    async def get_organic_keywords(self, domain: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get organic keywords that a domain ranks for.

        Args:
            domain: Target domain
            limit: Maximum number of keywords to return

        Returns:
            List of organic keywords with ranking data
        """
        params = {
            "target": domain,
            "mode": "domain",
            "select": "keyword,rank,volume,traffic,position_history",
            "limit": limit,
            "order_by": "traffic:desc"
        }

        data = await self._make_request("site-explorer/organic-keywords", params)

        keywords = []
        if data.get("keywords"):
            for item in data["keywords"]:
                keyword_data = {
                    "keyword": item.get("keyword"),
                    "position": item.get("rank"),
                    "search_volume": item.get("volume", 0),
                    "estimated_traffic": item.get("traffic", 0),
                    "url": item.get("url"),
                    "position_history": item.get("position_history", [])
                }
                keywords.append(keyword_data)

        return keywords

    async def get_backlinks(self, domain: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get backlinks pointing to a domain.

        Args:
            domain: Target domain
            limit: Maximum number of backlinks to return

        Returns:
            List of backlinks with details
        """
        params = {
            "target": domain,
            "mode": "domain",
            "select": "url_from,ahrefs_rank_source,domain_rating_source,url_to,link_type,text_pre,text_post,first_seen,last_seen",
            "limit": limit,
            "order_by": "ahrefs_rank_source:desc"
        }

        data = await self._make_request("site-explorer/backlinks", params)

        backlinks = []
        if data.get("backlinks"):
            for item in data["backlinks"]:
                backlink_data = {
                    "source_url": item.get("url_from"),
                    "source_domain": item.get("domain_from"),
                    "target_url": item.get("url_to"),
                    "link_type": item.get("link_type"),
                    "anchor_text": item.get("text"),
                    "source_dr": item.get("domain_rating_source"),
                    "source_ar": item.get("ahrefs_rank_source"),
                    "first_seen": item.get("first_seen"),
                    "last_seen": item.get("last_seen"),
                    "nofollow": item.get("nofollow", False),
                    "sponsored": item.get("sponsored", False),
                    "ugc": item.get("ugc", False)
                }
                backlinks.append(backlink_data)

        return backlinks

    async def get_competitor_domains(self, domain: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get domains that compete with the target domain.

        Args:
            domain: Target domain
            limit: Maximum number of competitors to return

        Returns:
            List of competing domains with metrics
        """
        params = {
            "target": domain,
            "mode": "domain",
            "select": "domain,domain_rating,ahrefs_rank,backlinks,referring_domains,organic_keywords,organic_traffic",
            "limit": limit,
            "order_by": "organic_traffic:desc"
        }

        data = await self._make_request("site-explorer/competitors", params)

        competitors = []
        if data.get("competitors"):
            for item in data["competitors"]:
                competitor_data = {
                    "domain": item.get("domain"),
                    "domain_rating": item.get("domain_rating"),
                    "ahrefs_rank": item.get("ahrefs_rank"),
                    "backlinks": item.get("backlinks"),
                    "referring_domains": item.get("referring_domains"),
                    "organic_keywords": item.get("organic_keywords"),
                    "organic_traffic": item.get("organic_traffic")
                }
                competitors.append(competitor_data)

        return competitors

    async def get_keyword_difficulty(self, keyword: str) -> Dict[str, Any]:
        """
        Get keyword difficulty score.

        Args:
            keyword: Target keyword

        Returns:
            Keyword difficulty data
        """
        params = {
            "keyword": keyword,
            "select": "keyword,keyword_difficulty,search_volume,cpc,competition"
        }

        data = await self._make_request("keywords-explorer/metrics", params)

        if data.get("metrics"):
            return data["metrics"]

        return {}

    async def get_content_explorer(self, keyword: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get top content for a keyword from Content Explorer.

        Args:
            keyword: Search keyword
            limit: Maximum number of results

        Returns:
            List of top content pages
        """
        params = {
            "keyword": keyword,
            "select": "url,title,traffic,backlinks,domain_rating,ahrefs_rank,first_seen",
            "limit": limit,
            "order_by": "traffic:desc"
        }

        data = await self._make_request("content-explorer/content", params)

        content = []
        if data.get("content"):
            for item in data["content"]:
                content_data = {
                    "url": item.get("url"),
                    "title": item.get("title"),
                    "estimated_traffic": item.get("traffic"),
                    "backlinks": item.get("backlinks"),
                    "domain_rating": item.get("domain_rating"),
                    "ahrefs_rank": item.get("ahrefs_rank"),
                    "first_seen": item.get("first_seen")
                }
                content.append(content_data)

        return content

    async def get_domain_vs_domain(self, target: str, competitor: str) -> Dict[str, Any]:
        """
        Compare two domains directly.

        Args:
            target: Target domain
            competitor: Competitor domain

        Returns:
            Domain comparison data
        """
        params = {
            "target": target,
            "competitor": competitor,
            "mode": "domain",
            "select": "common_keywords,unique_keywords_target,unique_keywords_competitor,traffic_intersection"
        }

        data = await self._make_request("site-explorer/domain-intersection", params)

        comparison = {
            "target": target,
            "competitor": competitor,
            "common_keywords": [],
            "unique_to_target": [],
            "unique_to_competitor": [],
            "traffic_overlap": 0
        }

        if data.get("intersection"):
            intersection = data["intersection"]
            comparison.update({
                "common_keywords": intersection.get("common_keywords", []),
                "unique_to_target": intersection.get("unique_keywords_target", []),
                "unique_to_competitor": intersection.get("unique_keywords_competitor", []),
                "traffic_overlap": intersection.get("traffic_intersection", 0)
            })

        return comparison

    async def health_check(self) -> bool:
        """
        Check if Ahrefs API is accessible and API key is valid.

        Returns:
            True if API is healthy, False otherwise
        """
        try:
            # Make a simple request to test connectivity
            params = {
                "target": "ahrefs.com",
                "mode": "domain",
                "select": "domain_rating"
            }

            data = await self._make_request("site-explorer/metrics", params)
            return bool(data.get("metrics"))

        except Exception as e:
            logger.error(f"Ahrefs health check failed: {e}")
            return False

    async def get_account_info(self) -> Dict[str, Any]:
        """
        Get account information and usage statistics.

        Returns:
            Account information including limits, usage, etc.
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
async def get_ahrefs_provider() -> AhrefsProvider:
    """Get configured Ahrefs provider instance."""
    return AhrefsProvider()
