"""
Health Check Service
====================

System health monitoring for all data services and external APIs.
"""

import asyncio
from typing import List, Dict, Any
from streamlit_app.services.data_service import get_data_service
from brand_intel.data.providers.dataforseo import get_dataforseo_provider
from brand_intel.data.providers.ahrefs import get_ahrefs_provider
from brand_intel.data import get_database
from datetime import datetime


class HealthCheckService:
    """
    Health check service for monitoring system components.
    
    Checks all external services, databases, and caches for operational status.
    """

    def __init__(self):
        self.data_service = get_data_service()

    async def check_all_services(self) -> List[Dict[str, Any]]:
        """
        Perform comprehensive health check of all services.
        
        Returns:
            List of health check results for each service
        """
        results = []

        # Check services in parallel for better performance
        tasks = [
            self._check_backend_api(),
            self._check_database(),
            self._check_cache(),
            self._check_dataforseo(),
            self._check_ahrefs(),
            self._check_external_apis()
        ]

        # Execute all checks concurrently
        check_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        service_names = [
            "Backend API", "Database", "Cache", "DataForSEO", "Ahrefs", "External APIs"
        ]

        for service_name, result in zip(service_names, check_results):
            if isinstance(result, Exception):
                results.append({
                    "service": service_name,
                    "status": "error",
                    "message": f"Check failed: {str(result)}",
                    "response_time": None,
                    "timestamp": datetime.utcnow().isoformat()
                })
            else:
                result["timestamp"] = datetime.utcnow().isoformat()
                results.append(result)

        return results

    async def _check_backend_api(self) -> Dict[str, Any]:
        """Check backend API health."""
        start_time = asyncio.get_event_loop().time()

        try:
            # Use data service health check
            health_results = await self.data_service.health_check()

            # Find API result
            api_result = next(
                (r for r in health_results if r.service == "Backend API"),
                None
            )

            if api_result:
                response_time = asyncio.get_event_loop().time() - start_time
                return {
                    "service": "Backend API",
                    "status": api_result.status,
                    "message": api_result.message,
                    "response_time": response_time
                }
            else:
                return {
                    "service": "Backend API",
                    "status": "unknown",
                    "message": "API health check not available",
                    "response_time": asyncio.get_event_loop().time() - start_time
                }

        except Exception as e:
            response_time = asyncio.get_event_loop().time() - start_time
            return {
                "service": "Backend API",
                "status": "unhealthy",
                "message": f"API check failed: {str(e)}",
                "response_time": response_time
            }

    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity."""
        start_time = asyncio.get_event_loop().time()

        try:
            db = get_database()
            async with db.session() as session:
                # Simple query to test connectivity
                await session.execute("SELECT 1")
            
            response_time = asyncio.get_event_loop().time() - start_time
            return {
                "service": "Database",
                "status": "healthy",
                "message": "Database connection successful",
                "response_time": response_time
            }

        except Exception as e:
            response_time = asyncio.get_event_loop().time() - start_time
            return {
                "service": "Database",
                "status": "unhealthy",
                "message": f"Database connection failed: {str(e)}",
                "response_time": response_time
            }

    async def _check_cache(self) -> Dict[str, Any]:
        """Check cache service health."""
        start_time = asyncio.get_event_loop().time()

        try:
            # Use data service cache health check
            health_results = await self.data_service.health_check()

            cache_result = next(
                (r for r in health_results if r.service == "Redis Cache"),
                None
            )

            if cache_result:
                response_time = asyncio.get_event_loop().time() - start_time
                return {
                    "service": "Cache",
                    "status": cache_result.status,
                    "message": cache_result.message,
                    "response_time": response_time
                }
            else:
                return {
                    "service": "Cache",
                    "status": "unknown",
                    "message": "Cache health check not available",
                    "response_time": asyncio.get_event_loop().time() - start_time
                }

        except Exception as e:
            response_time = asyncio.get_event_loop().time() - start_time
            return {
                "service": "Cache",
                "status": "unhealthy",
                "message": f"Cache check failed: {str(e)}",
                "response_time": response_time
            }

    async def _check_dataforseo(self) -> Dict[str, Any]:
        """Check DataForSEO API health."""
        start_time = asyncio.get_event_loop().time()

        try:
            provider = await get_dataforseo_provider()
            async with provider:
                is_healthy = await provider.health_check()

            response_time = asyncio.get_event_loop().time() - start_time

            if is_healthy:
                return {
                    "service": "DataForSEO",
                    "status": "healthy",
                    "message": "DataForSEO API responding",
                    "response_time": response_time
                }
            else:
                return {
                    "service": "DataForSEO",
                    "status": "unhealthy",
                    "message": "DataForSEO API not responding",
                    "response_time": response_time
                }

        except Exception as e:
            response_time = asyncio.get_event_loop().time() - start_time
            return {
                "service": "DataForSEO",
                "status": "unhealthy",
                "message": f"DataForSEO check failed: {str(e)}",
                "response_time": response_time
            }

    async def _check_ahrefs(self) -> Dict[str, Any]:
        """Check Ahrefs API health."""
        start_time = asyncio.get_event_loop().time()

        try:
            provider = await get_ahrefs_provider()
            async with provider:
                is_healthy = await provider.health_check()

            response_time = asyncio.get_event_loop().time() - start_time

            if is_healthy:
                return {
                    "service": "Ahrefs",
                    "status": "healthy",
                    "message": "Ahrefs API responding",
                    "response_time": response_time
                }
            else:
                return {
                    "service": "Ahrefs",
                    "status": "unhealthy",
                    "message": "Ahrefs API not responding",
                    "response_time": response_time
                }

        except Exception as e:
            response_time = asyncio.get_event_loop().time() - start_time
            return {
                "service": "Ahrefs",
                "status": "unhealthy",
                "message": f"Ahrefs check failed: {str(e)}",
                "response_time": response_time
            }

    async def _check_external_apis(self) -> Dict[str, Any]:
        """Check general external API connectivity."""
        start_time = asyncio.get_event_loop().time()

        try:
            # Simple connectivity test to a reliable external service
            import httpx
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get("https://httpbin.org/status/200")

            response_time = asyncio.get_event_loop().time() - start_time

            if response.status_code == 200:
                return {
                    "service": "External APIs",
                    "status": "healthy",
                    "message": "External API connectivity confirmed",
                    "response_time": response_time
                }
            else:
                return {
                    "service": "External APIs",
                    "status": "degraded",
                    "message": f"External API returned status {response.status_code}",
                    "response_time": response_time
                }

        except Exception as e:
            response_time = asyncio.get_event_loop().time() - start_time
            return {
                "service": "External APIs",
                "status": "unhealthy",
                "message": f"External API connectivity failed: {str(e)}",
                "response_time": response_time
            }

    def get_overall_health_status(self, health_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate overall system health status.
        
        Args:
            health_results: Individual service health results
            
        Returns:
            Overall health summary
        """
        if not health_results:
            return {
                "status": "unknown",
                "message": "No health data available"
            }

        # Count statuses
        status_counts = {}
        unhealthy_services = []
        total_response_time = 0
        response_time_count = 0

        for result in health_results:
            status = result.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1

            if status in ["unhealthy", "error"]:
                unhealthy_services.append(result["service"])

            if result.get("response_time") is not None:
                total_response_time += result["response_time"]
                response_time_count += 1

        # Determine overall status
        if status_counts.get("unhealthy", 0) > 0 or status_counts.get("error", 0) > 0:
            overall_status = "unhealthy"
            message = f"System unhealthy: {', '.join(unhealthy_services)}"
        elif status_counts.get("degraded", 0) > 0:
            overall_status = "degraded"
            message = "System degraded: some services have issues"
        elif status_counts.get("healthy", 0) == len(health_results):
            overall_status = "healthy"
            message = "All systems operational"
        else:
            overall_status = "unknown"
            message = "System status unclear"

        avg_response_time = (
            total_response_time / response_time_count
            if response_time_count > 0 else None
        )

        return {
            "status": overall_status,
            "message": message,
            "service_counts": status_counts,
            "unhealthy_services": unhealthy_services,
            "average_response_time": avg_response_time,
            "total_services": len(health_results)
        }


# Global instance
_health_service_instance = None

def get_health_service() -> HealthCheckService:
    """Get global health check service instance."""
    global _health_service_instance
    if _health_service_instance is None:
        _health_service_instance = HealthCheckService()
    return _health_service_instance
