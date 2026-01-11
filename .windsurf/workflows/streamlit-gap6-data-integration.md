---
description: Integrar Streamlit con datos reales (PostgreSQL, Redis, APIs)
---

# Gap 6: Integración con Datos Reales

## Objetivo
Conectar el microservicio Streamlit con la base de datos PostgreSQL, Redis cache, y APIs externas.

## Pasos

### 1. Crear Data Service unificado
Crear `streamlit_app/services/data_service.py`:
```python
from typing import List, Optional
from datetime import timedelta
from brand_intel.api import UCRAPIClient
from brand_intel.data import CacheManager
from brand_intel.core.models import Configuration

class DataService:
    def __init__(self, settings):
        self.api_client = UCRAPIClient(settings.ucr_api_base_url)
        self.cache = CacheManager(settings.redis_url)
        self._user_id: Optional[str] = None
    
    def set_user(self, user_id: str):
        self._user_id = user_id
    
    async def get_configurations(self) -> List[Configuration]:
        """Get all configurations for current user."""
        if not self._user_id:
            return []
        
        # Try cache
        cache_key = f"configs:{self._user_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return [Configuration(**c) for c in cached]
        
        # Fetch from API
        configs = await self.api_client.list_configurations(self._user_id)
        
        # Cache for 5 minutes
        self.cache.set(cache_key, [c.dict() for c in configs], ttl=timedelta(minutes=5))
        
        return configs
    
    async def get_configuration(self, config_id: int) -> Optional[Configuration]:
        """Get single configuration."""
        if not self._user_id:
            return None
        
        return await self.api_client.get_configuration(config_id, self._user_id)
    
    async def save_configuration(self, config: Configuration) -> Configuration:
        """Save configuration changes."""
        # Invalidate cache
        self.cache.invalidate_ucr(config.id)
        
        # Save via API
        # ...
        
        return config
    
    async def get_keyword_gap_analysis(self, config_id: int):
        """Get keyword gap analysis."""
        return await self.api_client.get_keyword_gap_analysis(config_id, self._user_id)
    
    async def get_market_demand_analysis(self, config_id: int):
        """Get market demand analysis."""
        return await self.api_client.get_market_demand_analysis(config_id, self._user_id)
    
    async def get_competitive_signals(self, config_id: int, limit: int = 50):
        """Get competitive signals."""
        return await self.api_client.get_competitive_signals(config_id, self._user_id, limit)
```

### 2. Crear DataForSEO Provider
Crear `brand_intel/data/providers/dataforseo.py`:
```python
import os
import httpx
import base64
from typing import List, Dict, Any

class DataForSEOProvider:
    BASE_URL = "https://api.dataforseo.com/v3"
    
    def __init__(self):
        login = os.getenv("DATAFORSEO_LOGIN")
        password = os.getenv("DATAFORSEO_PASSWORD")
        
        if not login or not password:
            raise ValueError("DataForSEO credentials not configured")
        
        credentials = f"{login}:{password}"
        self.auth = base64.b64encode(credentials.encode()).decode()
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Basic {self.auth}"},
            timeout=60.0
        )
    
    async def get_ranked_keywords(
        self,
        domain: str,
        location_code: int = 2840,
        limit: int = 100
    ) -> List[Dict]:
        """Get keywords a domain ranks for."""
        response = await self.client.post(
            f"{self.BASE_URL}/dataforseo_labs/google/ranked_keywords/live",
            json=[{
                "target": domain,
                "location_code": location_code,
                "limit": limit
            }]
        )
        data = response.json()
        if data.get("status_code") == 20000:
            return data["tasks"][0]["result"][0].get("items", [])
        return []
    
    async def get_keyword_gap(
        self,
        target: str,
        competitors: List[str],
        location_code: int = 2840
    ) -> Dict:
        """Get keyword gap between target and competitors."""
        response = await self.client.post(
            f"{self.BASE_URL}/dataforseo_labs/google/competitors_domain/live",
            json=[{
                "target": target,
                "competitors": competitors[:10],
                "location_code": location_code
            }]
        )
        data = response.json()
        if data.get("status_code") == 20000:
            return data["tasks"][0]["result"][0]
        return {}
```

### 3. Crear Ahrefs Provider
Crear `brand_intel/data/providers/ahrefs.py`:
```python
class AhrefsProvider:
    BASE_URL = "https://api.ahrefs.com/v3"
    
    def __init__(self):
        self.api_key = os.getenv("AHREFS_API_KEY")
        if not self.api_key:
            raise ValueError("Ahrefs API key not configured")
        
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {self.api_key}"},
            timeout=60.0
        )
    
    async def get_backlinks_stats(self, domain: str) -> Dict:
        """Get backlink statistics for a domain."""
        # Implementation
        pass
    
    async def get_organic_keywords(self, domain: str) -> List[Dict]:
        """Get organic keywords for a domain."""
        # Implementation
        pass
```

### 4. Actualizar Session Manager
Actualizar `streamlit_app/services/session_manager.py`:
```python
class SessionManager:
    def __init__(self, data_service: DataService):
        self.data_service = data_service
        self._init_session_state()
    
    async def load_configurations(self) -> List[Configuration]:
        """Load configurations from backend."""
        configs = await self.data_service.get_configurations()
        st.session_state[self.KEY_UCR_LIST] = [c.dict() for c in configs]
        return configs
    
    async def load_ucr(self, config_id: int) -> Optional[Configuration]:
        """Load specific UCR from backend."""
        config = await self.data_service.get_configuration(config_id)
        if config:
            st.session_state[self.KEY_CURRENT_UCR] = config.dict()
        return config
```

### 5. Crear conexión directa a PostgreSQL (opcional)
Si se necesita acceso directo a la DB:
```python
# brand_intel/data/database.py ya tiene esto
from brand_intel.data import Database, get_database

async def get_configurations_direct(user_id: str) -> List[Configuration]:
    db = get_database()
    async with db.session() as session:
        # Query directly
        pass
```

### 6. Implementar cache invalidation
```python
# Cuando se actualiza un UCR
def on_ucr_update(config_id: int):
    cache = CacheManager()
    cache.invalidate_ucr(config_id)
    
    # También invalidar caches relacionados
    cache.delete(f"keyword_gap:{config_id}")
    cache.delete(f"market_demand:{config_id}")
```

### 7. Crear health check endpoint
Crear `streamlit_app/services/health.py`:
```python
async def check_all_services() -> Dict[str, bool]:
    results = {}
    
    # Check backend API
    try:
        api = UCRAPIClient()
        results["backend_api"] = await api.health_check()
    except:
        results["backend_api"] = False
    
    # Check Redis
    try:
        cache = CacheManager()
        results["redis"] = cache.health_check()
    except:
        results["redis"] = False
    
    # Check DataForSEO
    try:
        dfs = DataForSEOProvider()
        results["dataforseo"] = True
    except:
        results["dataforseo"] = False
    
    return results
```

### 8. Actualizar app.py para usar datos reales
```python
# app.py
from streamlit_app.services.data_service import DataService

@st.cache_resource
def get_data_service():
    settings = Settings()
    return DataService(settings)

def main():
    data_service = get_data_service()
    session = SessionManager(data_service)
    
    # Load real data
    if "configs_loaded" not in st.session_state:
        asyncio.run(session.load_configurations())
        st.session_state.configs_loaded = True
```

### 9. Agregar tests de integración
Crear `tests/integration/test_data_service.py`

## Verificación
- [ ] Data Service creado
- [ ] UCR API Client funcionando
- [ ] DataForSEO Provider funcionando
- [ ] Cache funcionando
- [ ] Session Manager actualizado
- [ ] Health checks implementados
- [ ] Tests de integración pasando
