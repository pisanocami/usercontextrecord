"""
UCR API Client - Comunicación con Backend TypeScript
=====================================================

Cliente HTTP para comunicarse con el backend existente sin dependencias directas.
Permite al microservicio Streamlit obtener datos del servidor principal.

UCR FIRST: No dependencias directas, solo comunicación HTTP.
"""

import os
from typing import Optional, List, Dict, Any
from datetime import datetime

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

from brand_intel.core.models import Configuration, Brand, Competitor, Signal
from brand_intel.core.exceptions import BrandIntelError


class APIError(BrandIntelError):
    """Error en comunicación con API."""
    
    def __init__(self, message: str, status_code: Optional[int] = None):
        self.status_code = status_code
        super().__init__(message, code="API_ERROR")


class UCRAPIClient:
    """
    Cliente para comunicarse con el backend TypeScript vía REST API.
    
    NO crea dependencias directas - solo comunicación HTTP.
    
    Usage:
        client = UCRAPIClient()
        
        # Obtener configuración
        config = await client.get_configuration(config_id=1, user_id="user123")
        
        # Listar configuraciones
        configs = await client.list_configurations(user_id="user123")
    """
    
    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: float = 30.0
    ):
        if not HTTPX_AVAILABLE:
            raise APIError("httpx not installed. Run: pip install httpx")
        
        self.base_url = base_url or os.getenv("UCR_API_BASE_URL", "http://localhost:3000")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    @property
    def client(self) -> httpx.AsyncClient:
        """Lazy initialization of HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                headers={"Content-Type": "application/json"}
            )
        return self._client
    
    async def close(self):
        """Close HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    async def health_check(self) -> bool:
        """Check if backend is available."""
        try:
            response = await self.client.get("/api/health")
            return response.status_code == 200
        except Exception:
            return False
    
    async def get_configuration(
        self,
        config_id: int,
        user_id: str
    ) -> Optional[Configuration]:
        """
        Obtener configuración UCR del backend.
        
        Args:
            config_id: ID de la configuración
            user_id: ID del usuario
            
        Returns:
            Configuration si existe, None si no
        """
        try:
            response = await self.client.get(
                f"/api/configurations/{config_id}",
                headers={"X-User-ID": user_id}
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_configuration(data)
            elif response.status_code == 404:
                return None
            else:
                raise APIError(
                    f"Failed to fetch configuration: {response.status_code}",
                    status_code=response.status_code
                )
        except httpx.RequestError as e:
            raise APIError(f"Request failed: {str(e)}")
    
    async def list_configurations(
        self,
        user_id: str,
        limit: int = 100
    ) -> List[Configuration]:
        """
        Listar todas las configuraciones del usuario.
        
        Args:
            user_id: ID del usuario
            limit: Máximo número de resultados
            
        Returns:
            Lista de configuraciones
        """
        try:
            response = await self.client.get(
                "/api/configurations",
                headers={"X-User-ID": user_id},
                params={"limit": limit}
            )
            
            if response.status_code == 200:
                data = response.json()
                return [self._parse_configuration(c) for c in data]
            else:
                raise APIError(
                    f"Failed to list configurations: {response.status_code}",
                    status_code=response.status_code
                )
        except httpx.RequestError as e:
            raise APIError(f"Request failed: {str(e)}")
    
    async def get_brands(self, user_id: str) -> List[Dict[str, Any]]:
        """Obtener marcas del usuario."""
        try:
            response = await self.client.get(
                "/api/brands",
                headers={"X-User-ID": user_id}
            )
            
            if response.status_code == 200:
                return response.json()
            return []
        except httpx.RequestError:
            return []
    
    async def get_keyword_gap_analysis(
        self,
        config_id: int,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Obtener análisis de keyword gap del backend.
        
        Args:
            config_id: ID de la configuración
            user_id: ID del usuario
            
        Returns:
            Datos del análisis si existe
        """
        try:
            response = await self.client.get(
                f"/api/keyword-gap-analyses",
                headers={"X-User-ID": user_id},
                params={"configurationId": config_id, "limit": 1}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    return data[0]
            return None
        except httpx.RequestError as e:
            raise APIError(f"Request failed: {str(e)}")
    
    async def get_market_demand_analysis(
        self,
        config_id: int,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Obtener análisis de market demand del backend.
        
        Args:
            config_id: ID de la configuración
            user_id: ID del usuario
            
        Returns:
            Datos del análisis si existe
        """
        try:
            response = await self.client.get(
                f"/api/market-demand-analyses",
                headers={"X-User-ID": user_id},
                params={"configurationId": config_id, "limit": 1}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    return data[0]
            return None
        except httpx.RequestError as e:
            raise APIError(f"Request failed: {str(e)}")
    
    async def save_configuration(
        self,
        config_data: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Guardar configuración en el backend.
        
        Args:
            config_data: Datos de configuración a guardar
            user_id: ID del usuario
            
        Returns:
            Datos de configuración guardada
        """
        try:
            response = await self.client.post(
                "/api/configurations",
                headers={"X-User-ID": user_id},
                json=config_data
            )
            
            if response.status_code in [200, 201]:
                return response.json()
            else:
                raise APIError(
                    f"Failed to save configuration: {response.status_code}",
                    status_code=response.status_code
                )
        except httpx.RequestError as e:
            raise APIError(f"Request failed: {str(e)}")
    
    async def get_competitive_signals(
        self,
        config_id: int,
        user_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Obtener señales competitivas del backend.
        
        Args:
            config_id: ID de la configuración
            user_id: ID del usuario
            limit: Máximo número de señales
            
        Returns:
            Lista de señales
        """
        try:
            response = await self.client.get(
                f"/api/competitive-signals",
                headers={"X-User-ID": user_id},
                params={"configurationId": config_id, "limit": limit}
            )
            
            if response.status_code == 200:
                return response.json()
            return []
        except httpx.RequestError:
            return []
    
    def _parse_configuration(self, data: Dict[str, Any]) -> Configuration:
        """Parse API response to Configuration model."""
        from brand_intel.core.models import (
            CategoryDefinition, Competitors, StrategicIntent,
            NegativeScope, Governance, Competitor, Evidence,
            CompetitorTier, CompetitorStatus, FundingStage
        )
        
        # Parse brand
        brand_data = data.get("brand", {})
        brand = Brand(
            name=brand_data.get("name", ""),
            domain=brand_data.get("domain", ""),
            industry=brand_data.get("industry", ""),
            business_model=brand_data.get("business_model", "B2B"),
            primary_geography=brand_data.get("primary_geography", []),
            revenue_band=brand_data.get("revenue_band", ""),
            target_market=brand_data.get("target_market", "")
        )
        
        # Parse category definition
        cat_data = data.get("category_definition", {})
        category_definition = CategoryDefinition(
            primary_category=cat_data.get("primary_category", ""),
            included=cat_data.get("included", []),
            excluded=cat_data.get("excluded", []),
            approved_categories=cat_data.get("approved_categories", [])
        )
        
        # Parse competitors
        comp_data = data.get("competitors", {})
        competitors_list = []
        for c in comp_data.get("competitors", []):
            evidence = Evidence(
                why_selected=c.get("evidence", {}).get("why_selected", ""),
                top_overlap_keywords=c.get("evidence", {}).get("top_overlap_keywords", []),
                serp_examples=c.get("evidence", {}).get("serp_examples", [])
            )
            
            tier_map = {"tier1": CompetitorTier.TIER1, "tier2": CompetitorTier.TIER2, "tier3": CompetitorTier.TIER3}
            status_map = {"approved": CompetitorStatus.APPROVED, "rejected": CompetitorStatus.REJECTED, "pending_review": CompetitorStatus.PENDING_REVIEW}
            
            competitor = Competitor(
                name=c.get("name", ""),
                domain=c.get("domain", ""),
                tier=tier_map.get(c.get("tier", "tier1"), CompetitorTier.TIER1),
                status=status_map.get(c.get("status", "pending_review"), CompetitorStatus.PENDING_REVIEW),
                similarity_score=c.get("similarity_score", 50),
                serp_overlap=c.get("serp_overlap", 0),
                size_proximity=c.get("size_proximity", 50),
                evidence=evidence
            )
            competitors_list.append(competitor)
        
        competitors = Competitors(
            direct=comp_data.get("direct", []),
            indirect=comp_data.get("indirect", []),
            marketplaces=comp_data.get("marketplaces", []),
            competitors=competitors_list
        )
        
        # Parse strategic intent
        strat_data = data.get("strategic_intent", {})
        strategic_intent = StrategicIntent(
            growth_priority=strat_data.get("growth_priority", ""),
            risk_tolerance=strat_data.get("risk_tolerance", "medium"),
            primary_goal=strat_data.get("primary_goal", ""),
            secondary_goals=strat_data.get("secondary_goals", []),
            avoid=strat_data.get("avoid", [])
        )
        
        # Parse negative scope
        neg_data = data.get("negative_scope", {})
        negative_scope = NegativeScope(
            excluded_categories=neg_data.get("excluded_categories", []),
            excluded_keywords=neg_data.get("excluded_keywords", []),
            excluded_use_cases=neg_data.get("excluded_use_cases", []),
            excluded_competitors=neg_data.get("excluded_competitors", [])
        )
        
        # Parse governance
        gov_data = data.get("governance", {})
        governance = Governance(
            human_verified=gov_data.get("human_verified", False),
            context_hash=gov_data.get("context_hash", ""),
            context_version=gov_data.get("context_version", 1),
            validation_status=gov_data.get("validation_status", "needs_review")
        )
        
        return Configuration(
            id=data.get("id"),
            user_id=data.get("userId"),
            name=data.get("name", ""),
            brand=brand,
            category_definition=category_definition,
            competitors=competitors,
            demand_definition=data.get("demand_definition", {}),
            strategic_intent=strategic_intent,
            channel_context=data.get("channel_context", {}),
            negative_scope=negative_scope,
            governance=governance
        )
