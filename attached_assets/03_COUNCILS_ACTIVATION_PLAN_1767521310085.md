# 🏛️ Phase 3: Councils Activation Plan

**Duración:** 1 semana  
**Prioridad:** P1 - Alto  
**Gap:** 5/7 councils desactivados (71%)

---

## 🎯 Objetivo

Activar los 5 councils desactivados y conectarlos correctamente con sus módulos.

---

## 📊 Estado Actual

| Council | is_active | Módulos Gobernados |
|---------|-----------|-------------------|
| strategic_intelligence | ✅ True | Market Demand, Breakout Terms, Category Visibility, Emerging Competitor, Market Momentum |
| seo_visibility_demand | ✅ True | Keyword Gap, Share of Voice, Link Authority |
| performance_media_messaging | ❌ False | Branded Demand, Paid/Organic Overlap, Competitor Ads |
| creative_funnel | ❌ False | (Supporting) Competitor Ads |
| growth_strategy_planning | ❌ False | Strategic Summary, Action Cards, Priority Scoring, Deprioritization, OS Drop |
| ops_attribution | ❌ False | (Supporting) Paid/Organic, Deprioritization |
| product_gtm_alignment | ❌ False | (Supporting) |

---

## 🔧 Cambios Requeridos

### 1. Activar Councils en constants.py

```python
# backend/apps/councils/constants.py

'performance_media_messaging': {
    'is_active': True,  # Cambiar de False a True
    ...
},

'creative_funnel': {
    'is_active': True,  # Cambiar de False a True
    ...
},

'growth_strategy_planning': {
    'is_active': True,  # Cambiar de False a True
    ...
},

'ops_attribution': {
    'is_active': True,  # Cambiar de False a True
    ...
},

'product_gtm_alignment': {
    'is_active': True,  # Cambiar de False a True
    ...
},
```

### 2. Actualizar Module-Council Mapping

```python
# backend/apps/reports/services.py

MODULE_COUNCIL_MAP = {
    # Strategic Intelligence Council
    'market-demand': 'strategic_intelligence',
    'breakout-terms': 'strategic_intelligence',
    'category-visibility': 'strategic_intelligence',
    'emerging-competitor': 'strategic_intelligence',
    'market-momentum': 'strategic_intelligence',
    
    # SEO Visibility & Demand Council
    'keyword-gap': 'seo_visibility_demand',
    'share-of-voice': 'seo_visibility_demand',
    'link-authority': 'seo_visibility_demand',
    
    # Performance Media & Messaging Council
    'branded-demand': 'performance_media_messaging',
    'paid-organic-overlap': 'performance_media_messaging',
    'competitor-ads': 'performance_media_messaging',
    
    # Growth Strategy & Planning Council
    'strategic-summary': 'growth_strategy_planning',
    'priority-scoring': 'growth_strategy_planning',
    'deprioritization': 'growth_strategy_planning',
    'os-drop': 'growth_strategy_planning',
}

SUPPORTING_COUNCILS = {
    'competitor-ads': ['creative_funnel'],
    'paid-organic-overlap': ['ops_attribution'],
    'deprioritization': ['ops_attribution'],
}
```

### 3. Implementar Multi-Council Consultation

```python
def _get_council_perspectives(self, module_outputs: Dict) -> Dict:
    """Get perspectives from owner and supporting councils."""
    perspectives = {}
    
    for module_id, output in module_outputs.items():
        # Owner council
        owner = MODULE_COUNCIL_MAP.get(module_id)
        if owner:
            perspectives[owner] = self._consult_council(owner, output)
        
        # Supporting councils
        supporters = SUPPORTING_COUNCILS.get(module_id, [])
        for supporter in supporters:
            if supporter not in perspectives:
                perspectives[supporter] = self._consult_council(supporter, output)
    
    return perspectives
```

---

## 📋 Tareas

### Día 1-2: Activación Base
- [ ] Cambiar `is_active: True` para 5 councils
- [ ] Actualizar MODULE_COUNCIL_MAP
- [ ] Agregar SUPPORTING_COUNCILS map
- [ ] Tests unitarios

### Día 3-4: Multi-Council Integration
- [ ] Implementar `_get_council_perspectives` mejorado
- [ ] Agregar supporting council logic
- [ ] Weighted synthesis de múltiples councils
- [ ] Tests de integración

### Día 5: Polish & QA
- [ ] Verificar todos los councils responden
- [ ] Validar output structure
- [ ] Performance testing
- [ ] Documentación

---

## 🧪 Tests

```python
class TestCouncilsActivation:
    def test_all_councils_active(self):
        """Verify all 7 councils are active."""
        
    def test_module_council_mapping(self):
        """Verify each module maps to correct council."""
        
    def test_supporting_councils(self):
        """Verify supporting councils are consulted."""
        
    def test_council_response_structure(self):
        """Verify council responses have required fields."""
```

---

## ✅ Entregables

- [ ] 7/7 councils activos
- [ ] Module-council mapping completo
- [ ] Supporting councils integrados
- [ ] Tests pasando
- [ ] Documentación actualizada
