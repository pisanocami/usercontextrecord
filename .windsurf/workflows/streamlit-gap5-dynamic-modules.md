---
description: Implementar los 25 módulos dinámicos del sistema
---

# Gap 5: 25 Módulos Dinámicos

## Objetivo
Implementar el sistema de módulos dinámicos basado en `module.contract.ts`.

## Módulos Prioritarios (Fase 1)

| Prioridad | Módulo | Descripción |
|-----------|--------|-------------|
| 1 | Keyword Gap | Análisis de keywords vs competidores |
| 2 | Market Demand | Análisis de demanda de mercado |
| 3 | Competitive Radar | Vista 360° de competidores |
| 4 | SWOT Analysis | Análisis estratégico |
| 5 | Content Brief | Generador de briefs |

## Pasos

### 1. Crear estructura de módulos
```bash
mkdir -p streamlit_app/modules
touch streamlit_app/modules/__init__.py
```

### 2. Crear clase base de módulo
Crear `streamlit_app/modules/base_module.py`:
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from brand_intel.core.models import Configuration
from brand_intel.services import UCRService

@dataclass
class ModulePreflightResult:
    status: str  # "ready", "missing_requirements", "error"
    section_checks: List[Dict]
    entity_checks: List[Dict]
    missing_required: List[str]
    all_requirements_met: bool
    summary: str

@dataclass
class ModuleRunResult:
    envelope: Dict[str, Any]
    items: List[Dict[str, Any]]
    summary: Dict[str, Any]

class BaseModule(ABC):
    module_id: str
    name: str
    category: str
    layer: str  # Signal, Synthesis, Action
    description: str
    strategic_question: str
    required_sections: List[str]
    optional_sections: List[str] = []
    data_sources: List[str] = []
    
    def __init__(self, ucr_service: UCRService):
        self.ucr_service = ucr_service
    
    def preflight_check(self, config: Configuration) -> ModulePreflightResult:
        """Check if module can execute."""
        validation = self.ucr_service.validate(config)
        
        section_checks = []
        for section in self.required_sections:
            available = validation.sections_valid.get(section, False)
            section_checks.append({
                "section": section,
                "required": True,
                "available": available
            })
        
        missing = [s["section"] for s in section_checks if not s["available"]]
        
        return ModulePreflightResult(
            status="ready" if not missing else "missing_requirements",
            section_checks=section_checks,
            entity_checks=[],
            missing_required=missing,
            all_requirements_met=len(missing) == 0,
            summary=f"Missing sections: {', '.join(missing)}" if missing else "Ready to execute"
        )
    
    @abstractmethod
    async def execute(self, config: Configuration, params: Dict[str, Any]) -> ModuleRunResult:
        """Execute the module."""
        pass
    
    @abstractmethod
    def render_inputs(self) -> Dict[str, Any]:
        """Render input form and return parameters."""
        pass
    
    @abstractmethod
    def render_results(self, result: ModuleRunResult):
        """Render results in Streamlit."""
        pass
```

### 3. Implementar Keyword Gap Module
Crear `streamlit_app/modules/keyword_gap.py`:
```python
class KeywordGapModule(BaseModule):
    module_id = "seo.keyword_gap_visibility.v1"
    name = "Keyword Gap & Visibility"
    category = "SEO Signal"
    layer = "Signal"
    description = "Identifies search demand competitors capture that you don't"
    strategic_question = "What high-intent demand are competitors capturing?"
    required_sections = ["A", "B", "C"]
    optional_sections = ["D", "E", "F", "G", "H"]
    data_sources = ["DataForSEO", "Ahrefs"]
    
    def render_inputs(self) -> Dict[str, Any]:
        st.subheader("Parameters")
        
        min_volume = st.slider("Min Search Volume", 0, 10000, 500)
        position_range = st.slider("Position Range", 1, 100, (1, 20))
        
        return {
            "min_search_volume": min_volume,
            "positions_to_include": list(position_range)
        }
    
    async def execute(self, config: Configuration, params: Dict) -> ModuleRunResult:
        # Get competitors from UCR
        competitors = config.competitors.get_approved()
        
        # Call DataForSEO API
        # Apply UCR filters
        # Return results
        
        return ModuleRunResult(
            envelope={...},
            items=[...],
            summary={...}
        )
    
    def render_results(self, result: ModuleRunResult):
        st.subheader("Keyword Gap Analysis")
        
        # Summary metrics
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Keywords", result.summary.get("total_keywords", 0))
        with col2:
            st.metric("Missed Traffic", result.summary.get("missed_traffic", 0))
        with col3:
            st.metric("Opportunities", result.summary.get("opportunities", 0))
        
        # Results table
        if result.items:
            df = pd.DataFrame(result.items)
            st.dataframe(df, use_container_width=True)
```

### 4. Implementar Market Demand Module
Crear `streamlit_app/modules/market_demand.py` (similar structure)

### 5. Implementar Competitive Radar Module
Crear `streamlit_app/modules/competitive_radar.py`

### 6. Implementar SWOT Analysis Module
Crear `streamlit_app/modules/swot_analysis.py`

### 7. Implementar Content Brief Module
Crear `streamlit_app/modules/content_brief.py`

### 8. Crear Module Registry
Crear `streamlit_app/modules/registry.py`:
```python
from streamlit_app.modules.keyword_gap import KeywordGapModule
from streamlit_app.modules.market_demand import MarketDemandModule
# ...

MODULE_REGISTRY = {
    "seo.keyword_gap_visibility.v1": KeywordGapModule,
    "market.category_demand_trend.v1": MarketDemandModule,
    # ...
}

def get_module(module_id: str, ucr_service: UCRService) -> BaseModule:
    module_class = MODULE_REGISTRY.get(module_id)
    if not module_class:
        raise ValueError(f"Unknown module: {module_id}")
    return module_class(ucr_service)

def get_all_modules() -> List[Dict]:
    return [
        {"id": mid, "name": cls.name, "category": cls.category, "layer": cls.layer}
        for mid, cls in MODULE_REGISTRY.items()
    ]
```

### 9. Crear página Module Center
Crear `streamlit_app/pages/6_🧩_Module_Center.py`:
```python
def render_module_center():
    st.title("🧩 Module Center")
    
    modules = get_all_modules()
    
    # Group by category
    categories = {}
    for m in modules:
        cat = m["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(m)
    
    # Render by category
    for category, mods in categories.items():
        st.subheader(category)
        cols = st.columns(3)
        for i, mod in enumerate(mods):
            with cols[i % 3]:
                render_module_card(mod)
```

### 10. Crear página Module Runner
Crear `streamlit_app/pages/7_📊_Module_Runner.py`:
```python
def render_module_runner():
    module_id = st.session_state.get("selected_module")
    if not module_id:
        st.warning("Select a module from Module Center")
        return
    
    module = get_module(module_id, UCRService())
    config = session.get_current_ucr()
    
    # Preflight check
    preflight = module.preflight_check(config)
    if not preflight.all_requirements_met:
        st.error(preflight.summary)
        return
    
    # Render inputs
    params = module.render_inputs()
    
    # Execute button
    if st.button("▶️ Run Module"):
        with st.spinner("Executing..."):
            result = asyncio.run(module.execute(config, params))
            module.render_results(result)
```

### 11. Agregar tests
Crear `tests/unit/test_modules.py`

## Verificación
- [ ] Base module class creada
- [ ] 5 módulos prioritarios implementados
- [ ] Module registry funcionando
- [ ] Module Center page creada
- [ ] Module Runner page creada
- [ ] Preflight checks funcionando
- [ ] Tests pasando
