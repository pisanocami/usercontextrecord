---
description: Implementar las 8 secciones UCR completas en Streamlit (A-H)
---

# Gap 1: Secciones UCR Completas (A-H)

## Objetivo
Crear formularios interactivos para las 8 secciones del UCR en Streamlit.

## Pasos

### 1. Crear estructura de carpetas
```bash
mkdir -p streamlit_app/pages/sections
touch streamlit_app/pages/sections/__init__.py
```

### 2. Crear página principal del editor UCR
Crear archivo `streamlit_app/pages/4_📋_UCR_Editor.py`:
- Tabs para cada sección (A-H)
- Navegación entre secciones
- Botón de guardar cambios
- Indicador de validación por sección

### 3. Implementar Section A: Brand Context
Crear `streamlit_app/pages/sections/section_a_brand.py`:
- Campos: name, domain, industry, business_model, target_market, primary_geography
- Validación de dominio en tiempo real
- Botón "Generate with AI" para auto-completar

### 4. Implementar Section B: Category Definition
Crear `streamlit_app/pages/sections/section_b_category.py`:
- Campo: primary_category
- Multiselect: included categories
- Multiselect: excluded categories
- Semantic extensions (tags)
- Visualización de "Category Fence"

### 5. Implementar Section C: Competitive Set
Crear `streamlit_app/pages/sections/section_c_competitors.py`:
- Lista de competidores con cards
- Tier selector (Tier 1, 2, 3)
- Status (Approved, Rejected, Pending)
- Evidence pack editor
- Botón "Search Competitors with AI"

### 6. Implementar Section D: Demand Definition
Crear `streamlit_app/pages/sections/section_d_demand.py`:
- Brand keywords (seed terms)
- Category terms
- Themes/clusters
- Keyword grouping

### 7. Implementar Section E: Strategic Intent
Crear `streamlit_app/pages/sections/section_e_strategy.py`:
- Primary goal selector
- Secondary goals multiselect
- Risk tolerance slider
- Time horizon selector
- Avoid list

### 8. Implementar Section F: Channel Context
Crear `streamlit_app/pages/sections/section_f_channels.py`:
- Active channels checkboxes
- Investment level per channel
- Priority ranking

### 9. Implementar Section G: Negative Scope (Guardrails)
Crear `streamlit_app/pages/sections/section_g_guardrails.py`:
- Excluded categories (with match type)
- Excluded keywords (with match type)
- Excluded use cases
- Excluded competitors
- Enforcement rules toggles

### 10. Implementar Section H: Governance
Crear `streamlit_app/pages/sections/section_h_governance.py`:
- Human verified toggle
- Context version display
- Validation status
- Context hash
- Audit log viewer

### 11. Integrar con UCRService
- Usar `brand_intel.services.UCRService` para validación
- Mostrar errores/warnings en tiempo real
- Calcular quality score al cambiar

### 12. Agregar tests
Crear tests para cada sección en `tests/unit/test_sections.py`

## Verificación
- [ ] 8 secciones implementadas
- [ ] Validación en tiempo real funcionando
- [ ] Datos se guardan correctamente
- [ ] Quality score se actualiza
- [ ] Tests pasando
