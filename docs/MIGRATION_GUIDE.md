# 🔄 Guía Técnica de Migración - UCR FIRST

## Objetivo

Migrar la lógica de negocio del backend TypeScript (`server/`) a la biblioteca Python (`brand_intel/`) **sin crear dependencias directas**. El microservicio Streamlit será autónomo y se comunicará con el backend existente vía API REST.

---

## Principios de Migración

### ❌ NO Hacer (Dependencias Directas)
```python
# INCORRECTO - Dependencia directa con TypeScript
from server.competitive_signal_detector import detectSignals  # NO!
import subprocess; subprocess.run(["npx", "tsx", "server/..."])  # NO!
```

### ✅ SÍ Hacer (Traslado Completo)
```python
# CORRECTO - Lógica trasladada a Python
from brand_intel.services import SignalDetector
detector = SignalDetector(ucr_service, ai_client)
result = await detector.detect_signals(config)
```

---

## Mapeo de Componentes TypeScript → Python

| TypeScript (server/) | Python (brand_intel/) | Estado |
|---------------------|----------------------|--------|
| `competitive-signal-detector.ts` | `services/signal_detector.py` | ✅ Trasladado |
| `context-validator.ts` | `services/ucr_service.py` | ✅ Trasladado |
| `shared/validation.ts` | `services/quality_scorer.py` | ✅ Trasladado |
| `shared/schema.ts` | `core/models.py` | ✅ Trasladado |
| `shared/module.contract.ts` | `core/enums.py` + `services/ucr_service.py` | ✅ Trasladado |
| `dataforseo.ts` | `data/providers/dataforseo.py` | 🔄 Pendiente |
| `keyword-gap-lite.ts` | `services/keyword_gap.py` | 🔄 Pendiente |
| `market-demand-analyzer.ts` | `services/market_analyzer.py` | 🔄 Pendiente |
| `content-brief-generator.ts` | `services/content_brief.py` | 🔄 Pendiente |

---

## Fase 1: Modelos de Datos (✅ Completado)

### TypeScript Original (`shared/schema.ts`)
```typescript
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  domain: varchar("domain").notNull(),
  name: text("name").default(""),
  industry: text("industry").default(""),
  // ...
});
```

### Python Trasladado (`brand_intel/core/models.py`)
```python
class Brand(BaseModel):
    name: str
    domain: str
    industry: str = ""
    business_model: str = "B2B"
    primary_geography: List[str] = Field(default_factory=list)
    revenue_band: str = ""
    target_market: str = ""
    funding_stage: FundingStage = FundingStage.UNKNOWN
    
    @field_validator("domain")
    @classmethod
    def normalize_domain(cls, v: str) -> str:
        # Lógica de normalización trasladada
        ...
```

---

## Fase 2: Validación UCR (✅ Completado)

### TypeScript Original (`shared/validation.ts`)
```typescript
export function validateBrandContext(brand: Brand): SectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!brand.domain || brand.domain.trim() === "") {
    errors.push("Domain is required");
  }
  // ...
}
```

### Python Trasladado (`brand_intel/services/ucr_service.py`)
```python
def validate(self, config: Configuration) -> UCRValidationResult:
    blocked_reasons: List[str] = []
    warnings: List[str] = []
    
    # Section A: Brand Identity - REQUIRED
    if not config.brand.domain or not config.brand.domain.strip():
        blocked_reasons.append("Domain is required (Section A)")
    # ...
```

---

## Fase 3: Signal Detector (✅ Completado)

### TypeScript Original (`server/competitive-signal-detector.ts`)
```typescript
export class CompetitiveSignalDetector {
  async detectSignals(context: SignalDetectionContext): Promise<SignalDetectionResult> {
    const sectionsUsed: UCRSectionID[] = [];
    const ucr = await this.loadUCRContext(context.configurationId, context.userId);
    
    if (!ucr) {
      return { signals: [], runTrace: {...}, summary: {...} };
    }
    
    sectionsUsed.push("A", "B", "C", "E", "G");
    // ...
  }
}
```

### Python Trasladado (`brand_intel/services/signal_detector.py`)
```python
class SignalDetector:
    REQUIRED_SECTIONS = [UCRSection.A, UCRSection.B, UCRSection.C, UCRSection.E, UCRSection.G]
    
    async def detect_signals(
        self,
        config: Configuration,
        signal_types: Optional[List[SignalType]] = None,
        lookback_days: int = 30,
        min_severity: SignalSeverity = SignalSeverity.LOW
    ) -> SignalDetectionResult:
        # Step 1: UCR Validation (FAIL-CLOSED)
        validation = self.ucr_service.validate(config)
        if validation.status == UCRValidationStatus.BLOCKED:
            raise ConfigurationError(...)
        # ...
```

---

## Fase 4: Cliente API (Para comunicación con backend existente)

### Crear `brand_intel/api/ucr_api_client.py`

```python
"""
UCR API Client - Comunicación con Backend TypeScript
=====================================================

Cliente HTTP para comunicarse con el backend existente sin dependencias directas.
Permite al microservicio Streamlit obtener datos del servidor principal.
"""

import os
import httpx
from typing import Optional, List, Dict, Any
from brand_intel.core.models import Configuration, Brand
from brand_intel.core.exceptions import APIError


class UCRAPIClient:
    """
    Cliente para comunicarse con el backend TypeScript vía REST API.
    
    NO crea dependencias directas - solo comunicación HTTP.
    """
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.getenv("UCR_API_BASE_URL", "http://localhost:3000")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_configuration(self, config_id: int, user_id: str) -> Optional[Configuration]:
        """Obtener configuración UCR del backend."""
        try:
            response = await self.client.get(
                f"{self.base_url}/api/configurations/{config_id}",
                headers={"X-User-ID": user_id}
            )
            if response.status_code == 200:
                data = response.json()
                return Configuration(**data)
            return None
        except Exception as e:
            raise APIError(f"Failed to fetch configuration: {e}")
    
    async def list_configurations(self, user_id: str) -> List[Configuration]:
        """Listar todas las configuraciones del usuario."""
        try:
            response = await self.client.get(
                f"{self.base_url}/api/configurations",
                headers={"X-User-ID": user_id}
            )
            if response.status_code == 200:
                data = response.json()
                return [Configuration(**c) for c in data]
            return []
        except Exception as e:
            raise APIError(f"Failed to list configurations: {e}")
    
    async def get_keyword_gap_analysis(
        self,
        config_id: int,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Obtener análisis de keyword gap del backend."""
        try:
            response = await self.client.get(
                f"{self.base_url}/api/keyword-gap/{config_id}",
                headers={"X-User-ID": user_id}
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            raise APIError(f"Failed to fetch keyword gap: {e}")
    
    async def get_market_demand_analysis(
        self,
        config_id: int,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Obtener análisis de market demand del backend."""
        try:
            response = await self.client.get(
                f"{self.base_url}/api/market-demand/{config_id}",
                headers={"X-User-ID": user_id}
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            raise APIError(f"Failed to fetch market demand: {e}")
    
    async def close(self):
        """Cerrar cliente HTTP."""
        await self.client.aclose()
```

---

## Fase 5: Proveedores de Datos

### DataForSEO Provider (`brand_intel/data/providers/dataforseo.py`)

```python
"""
DataForSEO Provider - Trasladado de server/dataforseo.ts
=========================================================
"""

import os
import httpx
import base64
from typing import List, Dict, Any, Optional
from brand_intel.core.exceptions import APIError


class DataForSEOProvider:
    """
    Cliente DataForSEO trasladado de TypeScript.
    
    Funcionalidad original en: server/dataforseo.ts
    """
    
    BASE_URL = "https://api.dataforseo.com/v3"
    
    def __init__(
        self,
        login: Optional[str] = None,
        password: Optional[str] = None
    ):
        self.login = login or os.getenv("DATAFORSEO_LOGIN")
        self.password = password or os.getenv("DATAFORSEO_PASSWORD")
        
        if not self.login or not self.password:
            raise APIError("DataForSEO credentials not configured")
        
        credentials = f"{self.login}:{self.password}"
        self.auth_header = base64.b64encode(credentials.encode()).decode()
        
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Basic {self.auth_header}"},
            timeout=60.0
        )
    
    async def get_ranked_keywords(
        self,
        domain: str,
        location_code: int = 2840,  # US
        language_code: str = "en",
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Obtener keywords rankeadas para un dominio.
        
        Trasladado de: getRankedKeywords() en dataforseo.ts
        """
        try:
            response = await self.client.post(
                f"{self.BASE_URL}/dataforseo_labs/google/ranked_keywords/live",
                json=[{
                    "target": domain,
                    "location_code": location_code,
                    "language_code": language_code,
                    "limit": limit
                }]
            )
            
            data = response.json()
            if data.get("status_code") == 20000:
                tasks = data.get("tasks", [])
                if tasks and tasks[0].get("result"):
                    return tasks[0]["result"][0].get("items", [])
            return []
        except Exception as e:
            raise APIError(f"DataForSEO ranked keywords failed: {e}")
    
    async def get_keyword_gap(
        self,
        target_domain: str,
        competitor_domains: List[str],
        location_code: int = 2840,
        language_code: str = "en",
        limit: int = 1000
    ) -> Dict[str, Any]:
        """
        Obtener keyword gap entre dominio y competidores.
        
        Trasladado de: getKeywordGap() en dataforseo.ts
        """
        try:
            response = await self.client.post(
                f"{self.BASE_URL}/dataforseo_labs/google/competitors_domain/live",
                json=[{
                    "target": target_domain,
                    "competitors": competitor_domains[:10],  # Max 10
                    "location_code": location_code,
                    "language_code": language_code,
                    "limit": limit
                }]
            )
            
            data = response.json()
            if data.get("status_code") == 20000:
                tasks = data.get("tasks", [])
                if tasks and tasks[0].get("result"):
                    return tasks[0]["result"][0]
            return {}
        except Exception as e:
            raise APIError(f"DataForSEO keyword gap failed: {e}")
    
    async def close(self):
        await self.client.aclose()
```

---

## Fase 6: Tests

### Estructura de Tests

```
tests/
├── conftest.py              # Fixtures compartidos
├── unit/
│   ├── test_models.py       # Tests de modelos Pydantic
│   ├── test_ucr_service.py  # Tests de UCRService
│   ├── test_signal_detector.py
│   ├── test_quality_scorer.py
│   └── test_validators.py
├── integration/
│   ├── test_api_client.py   # Tests de cliente API
│   ├── test_ai_clients.py   # Tests de clientes AI
│   └── test_providers.py    # Tests de DataForSEO, etc.
└── e2e/
    └── test_streamlit_app.py
```

### Ejemplo: `tests/conftest.py`

```python
import pytest
from brand_intel.core.models import (
    Brand, Competitor, Configuration, CompetitorTier, CompetitorStatus,
    CategoryDefinition, Competitors, StrategicIntent, NegativeScope, Governance
)

@pytest.fixture
def sample_brand():
    return Brand(
        name="Nike",
        domain="nike.com",
        industry="Athletic Footwear",
        business_model="B2C",
        primary_geography=["US", "EU"],
        target_market="Athletes and fitness enthusiasts"
    )

@pytest.fixture
def sample_competitor():
    return Competitor(
        name="Adidas",
        domain="adidas.com",
        tier=CompetitorTier.TIER1,
        status=CompetitorStatus.APPROVED,
        similarity_score=75,
        serp_overlap=65
    )

@pytest.fixture
def sample_configuration(sample_brand, sample_competitor):
    return Configuration(
        id=1,
        name="Nike Brand Context",
        brand=sample_brand,
        category_definition=CategoryDefinition(
            primary_category="Athletic Footwear",
            included=["Running Shoes", "Basketball Shoes"],
            excluded=["Formal Shoes"]
        ),
        competitors=Competitors(
            competitors=[sample_competitor],
            direct=["adidas.com"],
            indirect=["puma.com"]
        ),
        strategic_intent=StrategicIntent(
            primary_goal="market_share",
            risk_tolerance="medium"
        ),
        negative_scope=NegativeScope(
            excluded_categories=["gambling"],
            excluded_keywords=["cheap", "fake"]
        ),
        governance=Governance()
    )
```

### Ejemplo: `tests/unit/test_ucr_service.py`

```python
import pytest
from brand_intel.services.ucr_service import UCRService, UCRValidationStatus

class TestUCRService:
    
    def test_validate_complete_config(self, sample_configuration):
        service = UCRService()
        result = service.validate(sample_configuration)
        
        assert result.is_valid
        assert result.status != UCRValidationStatus.BLOCKED
    
    def test_validate_missing_domain(self, sample_configuration):
        sample_configuration.brand.domain = ""
        service = UCRService()
        result = service.validate(sample_configuration)
        
        assert not result.is_valid
        assert result.status == UCRValidationStatus.BLOCKED
        assert "Domain is required" in str(result.blocked_reasons)
    
    def test_validate_missing_category(self, sample_configuration):
        sample_configuration.category_definition.primary_category = ""
        service = UCRService()
        result = service.validate(sample_configuration)
        
        assert not result.is_valid
        assert result.status == UCRValidationStatus.BLOCKED
    
    def test_check_guardrails_pass(self, sample_configuration):
        service = UCRService()
        content = "Nike running shoes are great for athletes"
        result = service.check_guardrails(sample_configuration, content)
        
        assert result.is_valid
        assert not result.is_blocked
    
    def test_check_guardrails_violation(self, sample_configuration):
        service = UCRService()
        content = "Buy cheap fake Nike shoes"
        result = service.check_guardrails(sample_configuration, content)
        
        assert not result.is_valid
        assert result.is_blocked
        assert len(result.violations) >= 2  # "cheap" and "fake"
    
    def test_calculate_quality_score(self, sample_configuration):
        service = UCRService()
        score = service.calculate_quality_score(sample_configuration)
        
        assert 0 <= score.overall <= 100
        assert score.grade in ["low", "medium", "high"]
```

---

## Checklist de Migración

### Modelos (✅ Completado)
- [x] Brand
- [x] Competitor
- [x] CompetitorTier, CompetitorStatus
- [x] Evidence
- [x] Configuration
- [x] CategoryDefinition
- [x] StrategicIntent
- [x] NegativeScope
- [x] Governance
- [x] Signal, SignalType, SignalSeverity
- [x] QualityScore

### Servicios (✅ Completado)
- [x] UCRService (validación, guardrails, quality score)
- [x] SignalDetector
- [x] QualityScorer
- [x] GuardrailValidator

### AI Clients (✅ Completado)
- [x] ClaudeClient (BYOK)
- [x] OpenAIClient (BYOK)
- [x] GeminiClient (BYOK + Search)
- [x] Prompts templates

### Data Layer (✅ Completado)
- [x] Database connection
- [x] Cache manager
- [x] Repositories (Brand, Config, Analysis, Signal)

### Utilidades (✅ Completado)
- [x] Domain normalizer
- [x] Validators
- [x] Formatters

### Pendiente
- [ ] UCR API Client (comunicación con backend)
- [ ] DataForSEO Provider
- [ ] Ahrefs Provider
- [ ] Keyword Gap Service
- [ ] Market Analyzer Service
- [ ] Content Brief Generator
- [ ] Tests completos

---

## Comandos de Ejecución

```bash
# Instalar dependencias
cd brand_intel
pip install -e ".[dev]"

# Ejecutar tests
pytest tests/ -v

# Ejecutar tests con coverage
pytest tests/ --cov=brand_intel --cov-report=html

# Ejecutar Streamlit
cd ../streamlit_app
streamlit run app.py
```

---

*Documento Version: 1.0.0*
*Última actualización: Enero 2026*
