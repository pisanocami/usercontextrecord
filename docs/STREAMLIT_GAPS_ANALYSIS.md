# 🔍 Análisis de Gaps - Streamlit Microservice

## Resumen Ejecutivo

La aplicación Streamlit actual es un **MVP básico** que necesita expandirse significativamente para alcanzar paridad con la aplicación React existente. Este documento identifica todos los gaps y proporciona guías técnicas para solucionarlos.

---

## Estado Actual vs Objetivo

| Funcionalidad | React App | Streamlit App | Gap |
|--------------|-----------|---------------|-----|
| Secciones UCR (A-H) | ✅ 8 secciones completas | ⚠️ Solo vista básica | 🔴 CRÍTICO |
| Crear nuevo contexto | ✅ Wizard completo | ❌ No implementado | 🔴 CRÍTICO |
| Generación con IA | ✅ Claude/GPT/Gemini | ❌ No implementado | 🔴 CRÍTICO |
| Validación interactiva | ✅ Tiempo real | ⚠️ Solo lectura | 🟡 ALTO |
| Quality Score | ✅ Detallado | ⚠️ Solo número | 🟡 ALTO |
| 25 Módulos dinámicos | ✅ Module Center | ❌ No implementado | 🔴 CRÍTICO |
| Keyword Gap Analysis | ✅ Completo | ❌ No implementado | 🔴 CRÍTICO |
| Market Demand Analysis | ✅ Completo | ❌ No implementado | 🔴 CRÍTICO |
| Competitive Radar | ✅ Completo | ❌ No implementado | 🟡 ALTO |
| Content Brief Generator | ✅ Completo | ❌ No implementado | 🟡 ALTO |
| SWOT Analysis | ✅ Completo | ❌ No implementado | 🟡 ALTO |
| One-Pager Export | ✅ PDF/MD | ❌ No implementado | 🟢 MEDIO |
| Version History | ✅ Completo | ❌ No implementado | 🟢 MEDIO |
| Bulk Generation | ✅ Completo | ❌ No implementado | 🟢 MEDIO |
| Integración DB real | ✅ PostgreSQL | ❌ Mock data | 🔴 CRÍTICO |
| Autenticación | ✅ Replit Auth | ❌ No implementado | 🟡 ALTO |

---

## Gap 1: Secciones UCR Completas (A-H)

### Descripción
La app actual solo muestra un resumen básico del UCR. Necesita formularios completos para cada sección.

### Secciones Requeridas

| Sección | Nombre | Componente React | Campos Clave |
|---------|--------|------------------|--------------|
| **A** | Brand Context | `what-we-are-block.tsx` | name, domain, industry, target_market, geography |
| **B** | Category Definition | `fence-block.tsx` | primary_category, included, excluded, semantic_extensions |
| **C** | Competitive Set | `competitor-set-block.tsx` | competitors[], tiers, evidence, approval status |
| **D** | Demand Definition | `demand-definition-block.tsx` | brand_keywords, category_terms, themes |
| **E** | Strategic Intent | (en configuration) | primary_goal, risk_tolerance, avoid[] |
| **F** | Channel Context | `channel-context-block.tsx` | active_channels, investment_levels |
| **G** | Negative Scope | `fence-block.tsx` | excluded_categories, excluded_keywords, enforcement_rules |
| **H** | Governance | `governance-footer.tsx` | human_verified, context_version, validation_status |

### Archivos a Crear

```
streamlit_app/pages/
├── 4_📋_UCR_Editor.py          # Editor principal de UCR
├── sections/
│   ├── section_a_brand.py      # Brand Context
│   ├── section_b_category.py   # Category Definition
│   ├── section_c_competitors.py # Competitive Set
│   ├── section_d_demand.py     # Demand Definition
│   ├── section_e_strategy.py   # Strategic Intent
│   ├── section_f_channels.py   # Channel Context
│   ├── section_g_guardrails.py # Negative Scope
│   └── section_h_governance.py # Governance
```

### Implementación Requerida

```python
# Ejemplo: section_a_brand.py
def render_section_a(config: Configuration) -> Configuration:
    st.subheader("Section A: Brand Context")
    
    col1, col2 = st.columns(2)
    
    with col1:
        brand_name = st.text_input("Brand Name", value=config.brand.name)
        domain = st.text_input("Domain", value=config.brand.domain)
        industry = st.text_input("Industry", value=config.brand.industry)
    
    with col2:
        target_market = st.text_area("Target Market", value=config.brand.target_market)
        geography = st.multiselect(
            "Primary Geography",
            options=["US", "EU", "APAC", "LATAM", "Global"],
            default=config.brand.primary_geography
        )
    
    # AI Generation button
    if st.button("🤖 Generate with AI"):
        with st.spinner("Analyzing brand..."):
            # Call AI client
            pass
    
    # Update config
    config.brand.name = brand_name
    config.brand.domain = domain
    # ...
    
    return config
```

---

## Gap 2: Creación de Nuevo Contexto UCR

### Descripción
No hay forma de crear un nuevo UCR desde cero. Se necesita un wizard de creación.

### Flujo Requerido

```
1. Ingresar dominio → 2. AI analiza → 3. Genera secciones A-G → 4. Usuario revisa → 5. Guardar
```

### Archivos a Crear

```
streamlit_app/pages/
├── 5_➕_New_Context.py         # Wizard de creación
```

### Implementación Requerida

```python
# 5_➕_New_Context.py
def render_new_context_wizard():
    st.title("➕ Create New UCR Context")
    
    # Step indicator
    step = st.session_state.get("wizard_step", 1)
    
    if step == 1:
        render_step_1_domain()
    elif step == 2:
        render_step_2_ai_analysis()
    elif step == 3:
        render_step_3_review_sections()
    elif step == 4:
        render_step_4_competitors()
    elif step == 5:
        render_step_5_guardrails()
    elif step == 6:
        render_step_6_save()

def render_step_1_domain():
    st.subheader("Step 1: Enter Brand Domain")
    
    domain = st.text_input("Domain (e.g., nike.com)")
    brand_name = st.text_input("Brand Name (optional)")
    
    if st.button("Analyze with AI →"):
        st.session_state.domain = domain
        st.session_state.brand_name = brand_name
        st.session_state.wizard_step = 2
        st.rerun()
```

---

## Gap 3: Integración con IA (Claude, OpenAI, Gemini)

### Descripción
Los clientes AI están creados en `brand_intel/ai/` pero no están conectados a la UI.

### Funcionalidades Requeridas

| Función | Descripción | Cliente AI |
|---------|-------------|------------|
| Competitor Search | Buscar competidores con Google Search | Gemini |
| Competitor Enrichment | Enriquecer datos de competidores | Claude/OpenAI |
| Insight Generation | Generar insights de señales | Claude |
| Content Brief | Generar briefs de contenido | Claude/OpenAI |
| Guardrail Validation | Validar contenido contra guardrails | Claude |

### Archivos a Crear

```
streamlit_app/services/
├── ai_service.py              # Servicio unificado de AI
```

### Implementación Requerida

```python
# ai_service.py
from brand_intel.ai import ClaudeClient, OpenAIClient, GeminiClient

class AIService:
    def __init__(self, settings: Settings):
        self.claude = ClaudeClient() if settings.has_claude() else None
        self.openai = OpenAIClient() if settings.has_openai() else None
        self.gemini = GeminiClient() if settings.has_gemini() else None
    
    async def search_competitors(
        self,
        domain: str,
        category: str,
        brand_name: str = ""
    ) -> List[Competitor]:
        """Search competitors using Gemini with Google Search."""
        if self.gemini:
            return await self.gemini.analyze_competitors(
                brand_name=brand_name,
                domain=domain,
                category=category
            )
        elif self.openai:
            return await self.openai.analyze_competitors(...)
        raise AIClientError("No AI provider configured")
    
    async def generate_insights(
        self,
        signals: List[Signal],
        config: Configuration
    ) -> str:
        """Generate insights from signals."""
        if self.claude:
            return await self.claude.generate_insights(signals, config)
        # fallback...
```

---

## Gap 4: Validación y Quality Score Interactivo

### Descripción
El Quality Score actual es solo un número. Necesita breakdown detallado y sugerencias de mejora.

### Archivos a Crear

```
streamlit_app/components/
├── quality_score_card.py      # Componente de Quality Score
├── validation_panel.py        # Panel de validación
```

### Implementación Requerida

```python
# quality_score_card.py
def render_quality_score_card(config: Configuration):
    from brand_intel.services import UCRService, QualityScorer
    
    ucr_service = UCRService()
    scorer = QualityScorer(ucr_service)
    
    score = scorer.calculate(config)
    suggestions = scorer.get_improvement_suggestions(config)
    
    # Visual gauge
    col1, col2 = st.columns([1, 2])
    
    with col1:
        # Circular gauge
        fig = create_gauge_chart(score.overall, score.grade)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        # Breakdown
        st.markdown("### Score Breakdown")
        
        metrics = [
            ("Completeness", score.completeness, "Section A, B, E"),
            ("Competitor Confidence", score.competitor_confidence, "Section C"),
            ("Negative Strength", score.negative_strength, "Section G"),
            ("Evidence Coverage", score.evidence_coverage, "Section C evidence"),
        ]
        
        for name, value, source in metrics:
            st.progress(value / 100)
            st.caption(f"{name}: {value}% ({source})")
    
    # Improvement suggestions
    if suggestions:
        st.markdown("### 💡 Improvement Suggestions")
        for s in suggestions[:5]:
            priority_color = {"critical": "🔴", "high": "🟠", "medium": "🟡"}
            st.markdown(f"""
            {priority_color.get(s['priority'], '⚪')} **{s['field']}**: {s['suggestion']}
            *Impact: {s['impact']}*
            """)
```

---

## Gap 5: 25 Módulos Dinámicos

### Descripción
El sistema tiene 25+ módulos definidos en `module.contract.ts` que no están implementados en Streamlit.

### Módulos Definidos

| ID | Nombre | Categoría | Layer |
|----|--------|-----------|-------|
| `seo.keyword_gap_visibility.v1` | Keyword Gap & Visibility | SEO Signal | Signal |
| `market.category_demand_trend.v1` | Category Demand Trend | Market Trends | Signal |
| `market.demand_seasonality.v1` | Demand Seasonality | Market Trends | Signal |
| `seo.serp_analysis.v1` | SERP Analysis | SEO Signal | Signal |
| `content.gap_analysis.v1` | Content Gap Analysis | Content | Signal |
| `competitive.radar.v1` | Competitive Radar | Competitive | Synthesis |
| `strategic.swot.v1` | SWOT Analysis | Strategic | Synthesis |
| `content.brief_generator.v1` | Content Brief Generator | Content | Action |
| ... | ... | ... | ... |

### Archivos a Crear

```
streamlit_app/
├── pages/
│   ├── 6_🧩_Module_Center.py    # Centro de módulos
│   └── 7_📊_Module_Runner.py    # Ejecutor de módulos
├── modules/
│   ├── __init__.py
│   ├── base_module.py           # Clase base
│   ├── keyword_gap.py           # Keyword Gap
│   ├── market_demand.py         # Market Demand
│   ├── competitive_radar.py     # Competitive Radar
│   ├── swot_analysis.py         # SWOT
│   └── content_brief.py         # Content Brief
```

### Implementación Requerida

```python
# base_module.py
from abc import ABC, abstractmethod
from brand_intel.core.models import Configuration
from brand_intel.services import UCRService

class BaseModule(ABC):
    """Base class for all dynamic modules."""
    
    module_id: str
    name: str
    category: str
    layer: str  # Signal, Synthesis, Action
    required_sections: List[str]
    
    def __init__(self, ucr_service: UCRService):
        self.ucr_service = ucr_service
    
    def preflight_check(self, config: Configuration) -> ModulePreflightResult:
        """Check if module can execute with current UCR."""
        validation = self.ucr_service.validate(config)
        sections = self.ucr_service.get_required_sections([self.module_id])
        # ...
    
    @abstractmethod
    async def execute(self, config: Configuration, params: dict) -> ModuleRunResult:
        """Execute the module."""
        pass
    
    @abstractmethod
    def render_results(self, result: ModuleRunResult):
        """Render results in Streamlit."""
        pass

# keyword_gap.py
class KeywordGapModule(BaseModule):
    module_id = "seo.keyword_gap_visibility.v1"
    name = "Keyword Gap & Visibility"
    category = "SEO Signal"
    layer = "Signal"
    required_sections = ["A", "B", "C"]
    
    async def execute(self, config: Configuration, params: dict) -> ModuleRunResult:
        # Call DataForSEO API
        # Apply UCR filters
        # Return results
        pass
    
    def render_results(self, result: ModuleRunResult):
        st.subheader("Keyword Gap Analysis")
        # Render charts and tables
        pass
```

---

## Gap 6: Integración con Datos Reales

### Descripción
Actualmente usa datos mock. Necesita conectarse a la base de datos PostgreSQL y APIs externas.

### Conexiones Requeridas

| Servicio | Propósito | Implementación |
|----------|-----------|----------------|
| PostgreSQL | Almacenamiento de UCR | `brand_intel/data/database.py` |
| Redis | Cache | `brand_intel/data/cache.py` |
| Backend API | Datos existentes | `brand_intel/api/ucr_api_client.py` |
| DataForSEO | Keyword data | Nuevo provider |
| Ahrefs | Backlink data | Nuevo provider |

### Archivos a Crear

```
brand_intel/data/providers/
├── __init__.py
├── dataforseo.py              # DataForSEO client
├── ahrefs.py                  # Ahrefs client
└── google_trends.py           # Google Trends client
```

### Implementación Requerida

```python
# Conectar Streamlit a datos reales
# streamlit_app/services/data_service.py

class DataService:
    def __init__(self, settings: Settings):
        self.api_client = UCRAPIClient(settings.ucr_api_base_url)
        self.cache = CacheManager(settings.redis_url)
    
    async def get_configurations(self, user_id: str) -> List[Configuration]:
        """Get configurations from backend API."""
        # Try cache first
        cached = self.cache.get(f"configs:{user_id}")
        if cached:
            return [Configuration(**c) for c in cached]
        
        # Fetch from API
        configs = await self.api_client.list_configurations(user_id)
        
        # Cache for 5 minutes
        self.cache.set(f"configs:{user_id}", [c.dict() for c in configs], ttl=timedelta(minutes=5))
        
        return configs
```

---

## Gap 7: Autenticación

### Descripción
No hay autenticación. Necesita integrarse con el sistema existente o implementar uno nuevo.

### Opciones

1. **Compartir sesión con React app** (cookies)
2. **API Key simple** (para desarrollo)
3. **OAuth** (para producción)

### Implementación Requerida

```python
# streamlit_app/services/auth_service.py

class AuthService:
    def __init__(self, settings: Settings):
        self.api_client = UCRAPIClient(settings.ucr_api_base_url)
    
    def get_current_user(self) -> Optional[str]:
        """Get current user from session or cookie."""
        # Check session state
        if "user_id" in st.session_state:
            return st.session_state.user_id
        
        # Check cookie (shared with React app)
        # ...
        
        return None
    
    def require_auth(self):
        """Decorator to require authentication."""
        user_id = self.get_current_user()
        if not user_id:
            st.error("Please log in to continue")
            st.stop()
        return user_id
```

---

## Priorización de Implementación

### Fase 1: Core UCR (Semana 1-2)
1. ✅ Gap 6: Integración con datos reales (API client)
2. Gap 1: Secciones UCR completas (A-H)
3. Gap 2: Creación de nuevo contexto

### Fase 2: AI Integration (Semana 3)
4. Gap 3: Integración con IA
5. Gap 4: Validación y Quality Score interactivo

### Fase 3: Modules (Semana 4-6)
6. Gap 5: Módulos dinámicos (empezar con 5 core)
   - Keyword Gap
   - Market Demand
   - Competitive Radar
   - SWOT Analysis
   - Content Brief

### Fase 4: Polish (Semana 7-8)
7. Gap 7: Autenticación
8. UI/UX improvements
9. Testing y documentación

---

## Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Secciones UCR implementadas | 8/8 |
| Módulos implementados | 10/25 |
| Tests pasando | 100% |
| Cobertura de código | >80% |
| Tiempo de carga | <3s |

---

*Documento Version: 1.0.0*
*Última actualización: Enero 2026*
