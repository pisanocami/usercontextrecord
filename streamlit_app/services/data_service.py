"""
Data Service - Servicio unificado de datos
==========================================

Servicio centralizado para todas las operaciones de datos del microservicio Streamlit.
Coordina acceso a APIs, base de datos, cache y proveedores externos.
"""

import asyncio
from typing import List, Optional, Dict, Any
from datetime import timedelta, datetime
from dataclasses import dataclass
import logging

from brand_intel.api import UCRAPIClient
from brand_intel.data import CacheManager
from brand_intel.core.models import Configuration, Competitor, Signal
from brand_intel.core.exceptions import BrandIntelError

logger = logging.getLogger(__name__)


@dataclass
class DataServiceResult:
    """Resultado de operación de data service."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    cached: bool = False
    execution_time: float = 0.0


@dataclass
class HealthCheckResult:
    """Resultado de health check."""
    service: str
    status: str  # "healthy", "degraded", "unhealthy"
    message: str
    response_time: float = 0.0


class DataService:
    """
    Servicio unificado para acceso a datos.

    Coordina todas las operaciones de datos:
    - API backend (UCR configurations)
    - Cache (Redis)
    - Proveedores externos (DataForSEO, Ahrefs, etc.)
    - Base de datos directa (cuando necesario)
    """

    def __init__(self, settings):
        self.settings = settings
        self._user_id: Optional[str] = None

        # Initialize clients
        self._api_client: Optional[UCRAPIClient] = None
        self._cache_manager: Optional[CacheManager] = None

        # Initialize on first access
        self._initialized = False

    def set_user(self, user_id: str):
        """Establecer usuario actual."""
        self._user_id = user_id

    def _ensure_initialized(self):
        """Asegurar que los clientes estén inicializados."""
        if not self._initialized:
            try:
                # API client for backend communication
                if hasattr(self.settings, 'ucr_api_base_url') and self.settings.ucr_api_base_url:
                    self._api_client = UCRAPIClient(self.settings.ucr_api_base_url)
                else:
                    logger.warning("UCR API base URL not configured")

                # Cache manager
                if hasattr(self.settings, 'redis_url') and self.settings.redis_url:
                    self._cache_manager = CacheManager(self.settings.redis_url)
                else:
                    logger.warning("Redis URL not configured, using in-memory cache")

                self._initialized = True

            except Exception as e:
                logger.error(f"Failed to initialize data service: {e}")
                raise BrandIntelError(f"Data service initialization failed: {e}")

    @property
    def api_client(self) -> Optional[UCRAPIClient]:
        """Get API client."""
        self._ensure_initialized()
        return self._api_client

    @property
    def cache_manager(self) -> Optional[CacheManager]:
        """Get cache manager."""
        self._ensure_initialized()
        return self._cache_manager

    async def get_configurations(self) -> DataServiceResult:
        """
        Obtener todas las configuraciones del usuario actual.

        Returns:
            DataServiceResult con lista de configuraciones
        """
        if not self._user_id:
            return DataServiceResult(
                success=False,
                error="No user ID set"
            )

        start_time = asyncio.get_event_loop().time()

        try:
            # Try cache first
            cache_key = f"configs:{self._user_id}"
            cached_data = None

            if self.cache_manager:
                cached_data = self.cache_manager.get(cache_key)

            if cached_data:
                # Return cached data
                configs = [Configuration(**c) for c in cached_data]
                execution_time = asyncio.get_event_loop().time() - start_time

                return DataServiceResult(
                    success=True,
                    data=configs,
                    cached=True,
                    execution_time=execution_time
                )

            # Fetch from API
            if not self.api_client:
                return DataServiceResult(
                    success=False,
                    error="API client not available"
                )

            configs_data = await self.api_client.list_configurations(self._user_id)
            configs = [Configuration(**c) for c in configs_data]

            # Cache the result
            if self.cache_manager:
                cache_data = [c.dict() for c in configs]
                self.cache_manager.set(cache_key, cache_data, ttl=timedelta(minutes=5))

            execution_time = asyncio.get_event_loop().time() - start_time

            return DataServiceResult(
                success=True,
                data=configs,
                cached=False,
                execution_time=execution_time
            )

        except Exception as e:
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"Failed to get configurations: {e}")

            return DataServiceResult(
                success=False,
                error=f"Failed to get configurations: {str(e)}",
                execution_time=execution_time
            )

    async def get_configuration(self, config_id: int) -> DataServiceResult:
        """
        Obtener una configuración específica.

        Args:
            config_id: ID de la configuración

        Returns:
            DataServiceResult con la configuración
        """
        if not self._user_id:
            return DataServiceResult(
                success=False,
                error="No user ID set"
            )

        start_time = asyncio.get_event_loop().time()

        try:
            # Try cache first
            cache_key = f"config:{config_id}:{self._user_id}"
            cached_data = None

            if self.cache_manager:
                cached_data = self.cache_manager.get(cache_key)

            if cached_data:
                config = Configuration(**cached_data)
                execution_time = asyncio.get_event_loop().time() - start_time

                return DataServiceResult(
                    success=True,
                    data=config,
                    cached=True,
                    execution_time=execution_time
                )

            # Fetch from API
            if not self.api_client:
                return DataServiceResult(
                    success=False,
                    error="API client not available"
                )

            config_data = await self.api_client.get_configuration(config_id, self._user_id)
            config = Configuration(**config_data)

            # Cache the result
            if self.cache_manager:
                self.cache_manager.set(cache_key, config.dict(), ttl=timedelta(minutes=10))

            execution_time = asyncio.get_event_loop().time() - start_time

            return DataServiceResult(
                success=True,
                data=config,
                cached=False,
                execution_time=execution_time
            )

        except Exception as e:
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"Failed to get configuration {config_id}: {e}")

            return DataServiceResult(
                success=False,
                error=f"Failed to get configuration: {str(e)}",
                execution_time=execution_time
            )

    async def save_configuration(self, config: Configuration) -> DataServiceResult:
        """
        Guardar cambios en una configuración.

        Args:
            config: Configuración a guardar

        Returns:
            DataServiceResult con la configuración guardada
        """
        if not self._user_id:
            return DataServiceResult(
                success=False,
                error="No user ID set"
            )

        start_time = asyncio.get_event_loop().time()

        try:
            # Invalidate related caches
            self._invalidate_configuration_caches(config.id)

            # Save via API
            if not self.api_client:
                return DataServiceResult(
                    success=False,
                    error="API client not available"
                )

            saved_config_data = await self.api_client.save_configuration(config.dict(), self._user_id)
            saved_config = Configuration(**saved_config_data)

            # Cache the updated configuration
            cache_key = f"config:{config.id}:{self._user_id}"
            if self.cache_manager:
                self.cache_manager.set(cache_key, saved_config.dict(), ttl=timedelta(minutes=10))

            execution_time = asyncio.get_event_loop().time() - start_time

            return DataServiceResult(
                success=True,
                data=saved_config,
                cached=False,
                execution_time=execution_time
            )

        except Exception as e:
            execution_time = asyncio.get_event_loop().time() - start_time
            logger.error(f"Failed to save configuration {config.id}: {e}")

            return DataServiceResult(
                success=False,
                error=f"Failed to save configuration: {str(e)}",
                execution_time=execution_time
            )

    async def get_keyword_gap_analysis(self, config_id: int) -> DataServiceResult:
        """
        Obtener análisis de keyword gap.

        Args:
            config_id: ID de la configuración

        Returns:
            DataServiceResult con datos de keyword gap
        """
        cache_key = f"keyword_gap:{config_id}"

        # Try cache first
        if self.cache_manager:
            cached_data = self.cache_manager.get(cache_key)
            if cached_data:
                return DataServiceResult(
                    success=True,
                    data=cached_data,
                    cached=True
                )

        # Fetch from API or compute
        try:
            if self.api_client:
                data = await self.api_client.get_keyword_gap_analysis(config_id, self._user_id)
            else:
                # Fallback: compute locally (would use data providers)
                data = await self._compute_keyword_gap_locally(config_id)

            # Cache result
            if self.cache_manager:
                self.cache_manager.set(cache_key, data, ttl=timedelta(hours=6))

            return DataServiceResult(
                success=True,
                data=data,
                cached=False
            )

        except Exception as e:
            logger.error(f"Failed to get keyword gap analysis: {e}")
            return DataServiceResult(
                success=False,
                error=f"Keyword gap analysis failed: {str(e)}"
            )

    async def get_market_demand_analysis(self, config_id: int) -> DataServiceResult:
        """
        Obtener análisis de demanda de mercado.

        Args:
            config_id: ID de la configuración

        Returns:
            DataServiceResult con datos de market demand
        """
        cache_key = f"market_demand:{config_id}"

        # Try cache first
        if self.cache_manager:
            cached_data = self.cache_manager.get(cache_key)
            if cached_data:
                return DataServiceResult(
                    success=True,
                    data=cached_data,
                    cached=True
                )

        try:
            if self.api_client:
                data = await self.api_client.get_market_demand_analysis(config_id, self._user_id)
            else:
                data = await self._compute_market_demand_locally(config_id)

            # Cache result
            if self.cache_manager:
                self.cache_manager.set(cache_key, data, ttl=timedelta(hours=24))  # Market data changes slower

            return DataServiceResult(
                success=True,
                data=data,
                cached=False
            )

        except Exception as e:
            logger.error(f"Failed to get market demand analysis: {e}")
            return DataServiceResult(
                success=False,
                error=f"Market demand analysis failed: {str(e)}"
            )

    async def get_competitive_signals(self, config_id: int, limit: int = 50) -> DataServiceResult:
        """
        Obtener señales competitivas.

        Args:
            config_id: ID de la configuración
            limit: Número máximo de señales

        Returns:
            DataServiceResult con señales competitivas
        """
        cache_key = f"signals:{config_id}:{limit}"

        # Try cache first
        if self.cache_manager:
            cached_data = self.cache_manager.get(cache_key)
            if cached_data:
                signals = [Signal(**s) for s in cached_data]
                return DataServiceResult(
                    success=True,
                    data=signals,
                    cached=True
                )

        try:
            if self.api_client:
                signals_data = await self.api_client.get_competitive_signals(config_id, self._user_id, limit)
                signals = [Signal(**s) for s in signals_data]
            else:
                signals = await self._compute_signals_locally(config_id, limit)

            # Cache result
            if self.cache_manager:
                cache_data = [s.dict() for s in signals]
                self.cache_manager.set(cache_key, cache_data, ttl=timedelta(minutes=30))  # Signals change frequently

            return DataServiceResult(
                success=True,
                data=signals,
                cached=False
            )

        except Exception as e:
            logger.error(f"Failed to get competitive signals: {e}")
            return DataServiceResult(
                success=False,
                error=f"Competitive signals retrieval failed: {str(e)}"
            )

    async def save_module_result(self, module_id: str, config_id: int, result: Dict[str, Any]) -> DataServiceResult:
        """
        Guardar resultado de ejecución de módulo.

        Args:
            module_id: ID del módulo
            config_id: ID de la configuración
            result: Resultado del módulo

        Returns:
            DataServiceResult
        """
        try:
            cache_key = f"module_result:{module_id}:{config_id}"

            if self.cache_manager:
                # Store with timestamp
                result_data = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "result": result
                }
                self.cache_manager.set(cache_key, result_data, ttl=timedelta(days=30))

            return DataServiceResult(success=True, data=result_data)

        except Exception as e:
            logger.error(f"Failed to save module result: {e}")
            return DataServiceResult(
                success=False,
                error=f"Failed to save module result: {str(e)}"
            )

    async def get_module_result(self, module_id: str, config_id: int) -> DataServiceResult:
        """
        Obtener resultado guardado de módulo.

        Args:
            module_id: ID del módulo
            config_id: ID de la configuración

        Returns:
            DataServiceResult con resultado del módulo
        """
        try:
            cache_key = f"module_result:{module_id}:{config_id}"

            if self.cache_manager:
                cached_data = self.cache_manager.get(cache_key)
                if cached_data:
                    return DataServiceResult(
                        success=True,
                        data=cached_data,
                        cached=True
                    )

            return DataServiceResult(
                success=False,
                error="No cached result found"
            )

        except Exception as e:
            logger.error(f"Failed to get module result: {e}")
            return DataServiceResult(
                success=False,
                error=f"Failed to get module result: {str(e)}"
            )

    def _invalidate_configuration_caches(self, config_id: int):
        """Invalidar todos los caches relacionados con una configuración."""
        if not self.cache_manager:
            return

        patterns_to_invalidate = [
            f"config:{config_id}:*",
            f"configs:*",
            f"keyword_gap:{config_id}",
            f"market_demand:{config_id}",
            f"signals:{config_id}:*",
            f"module_result:*:{config_id}"
        ]

        for pattern in patterns_to_invalidate:
            try:
                self.cache_manager.invalidate_pattern(pattern)
            except Exception as e:
                logger.warning(f"Failed to invalidate cache pattern {pattern}: {e}")

    async def _compute_keyword_gap_locally(self, config_id: int) -> Dict[str, Any]:
        """Computar keyword gap localmente (fallback)."""
        # This would use data providers directly
        # For now, return mock data
        await asyncio.sleep(0.1)
        return {
            "total_gaps": 25,
            "estimated_traffic": 15000,
            "opportunities": [
                {"keyword": "example keyword", "volume": 1200, "difficulty": 45}
            ]
        }

    async def _compute_market_demand_locally(self, config_id: int) -> Dict[str, Any]:
        """Computar market demand localmente (fallback)."""
        await asyncio.sleep(0.1)
        return {
            "trend": "growing",
            "growth_rate": 12.5,
            "seasonality_index": 35
        }

    async def _compute_signals_locally(self, config_id: int, limit: int) -> List[Signal]:
        """Computar signals localmente (fallback)."""
        await asyncio.sleep(0.1)
        return [
            Signal(
                signal_type="ranking_shift",
                severity="high",
                competitor="competitor.com",
                description="Competitor gained 15 positions",
                impact="High impact on visibility"
            )
        ]

    async def health_check(self) -> List[HealthCheckResult]:
        """
        Verificar estado de todos los servicios de datos.

        Returns:
            Lista de resultados de health check
        """
        results = []

        # Check API client
        if self.api_client:
            start_time = asyncio.get_event_loop().time()
            try:
                health = await self.api_client.health_check()
                response_time = asyncio.get_event_loop().time() - start_time
                results.append(HealthCheckResult(
                    service="Backend API",
                    status="healthy" if health else "unhealthy",
                    message="API responding" if health else "API not responding",
                    response_time=response_time
                ))
            except Exception as e:
                response_time = asyncio.get_event_loop().time() - start_time
                results.append(HealthCheckResult(
                    service="Backend API",
                    status="unhealthy",
                    message=f"API error: {str(e)}",
                    response_time=response_time
                ))
        else:
            results.append(HealthCheckResult(
                service="Backend API",
                status="unhealthy",
                message="API client not configured"
            ))

        # Check cache
        if self.cache_manager:
            start_time = asyncio.get_event_loop().time()
            try:
                health = self.cache_manager.health_check()
                response_time = asyncio.get_event_loop().time() - start_time
                results.append(HealthCheckResult(
                    service="Redis Cache",
                    status="healthy" if health else "unhealthy",
                    message="Cache operational" if health else "Cache not responding",
                    response_time=response_time
                ))
            except Exception as e:
                response_time = asyncio.get_event_loop().time() - start_time
                results.append(HealthCheckResult(
                    service="Redis Cache",
                    status="unhealthy",
                    message=f"Cache error: {str(e)}",
                    response_time=response_time
                ))
        else:
            results.append(HealthCheckResult(
                service="Redis Cache",
                status="degraded",
                message="Cache not configured, using in-memory fallback"
            ))

    def invalidate_ucr_caches(self, config_id: int):
        """
        Invalidate all caches related to a UCR configuration.
        
        Args:
            config_id: Configuration ID to invalidate caches for
        """
        if not self.cache_manager:
            return

        # Patterns to invalidate
        patterns_to_invalidate = [
            f"config:{config_id}:*",
            f"configs:*",  # Invalidate config list cache
            f"keyword_gap:{config_id}",
            f"market_demand:{config_id}",
            f"signals:{config_id}:*",
            f"module_result:*:{config_id}"
        ]

        for pattern in patterns_to_invalidate:
            try:
                self.cache_manager.invalidate_pattern(pattern)
                logger.debug(f"Invalidated cache pattern: {pattern}")
            except Exception as e:
                logger.warning(f"Failed to invalidate cache pattern {pattern}: {e}")

    def invalidate_user_caches(self, user_id: str):
        """
        Invalidate all caches for a specific user.
        
        Args:
            user_id: User ID to invalidate caches for
        """
        if not self.cache_manager:
            return

        patterns_to_invalidate = [
            f"configs:{user_id}",
            f"config:*:{user_id}",
            f"keyword_gap:*",  # Invalidate all keyword gap caches (expensive but safe)
            f"market_demand:*",
            f"signals:*:*",
            f"module_result:*:*:*"
        ]

        for pattern in patterns_to_invalidate:
            try:
                self.cache_manager.invalidate_pattern(pattern)
                logger.debug(f"Invalidated user cache pattern: {pattern}")
            except Exception as e:
                logger.warning(f"Failed to invalidate user cache pattern {pattern}: {e}")

    def clear_all_caches(self):
        """Clear all caches (use with caution)."""
        if not self.cache_manager:
            return

        try:
            self.cache_manager.clear_all()
            logger.info("Cleared all caches")
        except Exception as e:
            logger.error(f"Failed to clear all caches: {e}")

    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics and health information.
        
        Returns:
            Dictionary with cache statistics
        """
        if not self.cache_manager:
            return {"status": "not_configured"}

        try:
            stats = self.cache_manager.get_stats()
            return {
                "status": "operational",
                "stats": stats
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }


# Global instance for easy access
_data_service_instance = None

def get_data_service(settings=None) -> DataService:
    """Obtener instancia global del data service."""
    global _data_service_instance
    if _data_service_instance is None:
        if settings is None:
            from streamlit_app.config.settings import Settings
            settings = Settings()
        _data_service_instance = DataService(settings)
    return _data_service_instance
