---
description: Implementar wizard de creación de nuevo contexto UCR
---

# Gap 2: Creación de Nuevo Contexto UCR

## Objetivo
Crear un wizard paso a paso para crear un nuevo UCR desde cero.

## Pasos

### 1. Crear página del wizard
Crear `streamlit_app/pages/5_➕_New_Context.py`:
- 6 pasos del wizard
- Progress bar
- Navegación anterior/siguiente
- Guardar progreso en session_state

### 2. Implementar Step 1: Domain Input
```python
def render_step_1():
    st.subheader("Step 1: Enter Brand Domain")
    domain = st.text_input("Domain (e.g., nike.com)")
    brand_name = st.text_input("Brand Name (optional)")
    
    if st.button("Analyze with AI →"):
        # Validate domain
        # Save to session
        # Move to step 2
```

### 3. Implementar Step 2: AI Analysis
- Llamar a GeminiClient.analyze_competitors()
- Mostrar spinner mientras analiza
- Mostrar resultados preliminares
- Permitir editar antes de continuar

### 4. Implementar Step 3: Review Sections A-B
- Mostrar Section A pre-llenada por AI
- Mostrar Section B pre-llenada por AI
- Permitir ediciones
- Validar antes de continuar

### 5. Implementar Step 4: Competitors
- Mostrar competidores encontrados por AI
- Permitir aprobar/rechazar
- Permitir agregar manualmente
- Mostrar evidence packs

### 6. Implementar Step 5: Guardrails
- Sugerir exclusiones basadas en industria
- Permitir agregar exclusiones custom
- Configurar enforcement rules

### 7. Implementar Step 6: Save & Confirm
- Mostrar resumen completo
- Calcular quality score
- Botón "Create Context"
- Guardar en base de datos
- Redirigir al editor

### 8. Integrar con AI Service
Crear `streamlit_app/services/ai_service.py`:
```python
class AIService:
    async def analyze_domain(self, domain: str) -> dict:
        """Analyze domain and generate initial UCR."""
        pass
    
    async def search_competitors(self, domain: str, category: str) -> List[Competitor]:
        """Search competitors with Google Search."""
        pass
```

### 9. Agregar persistencia
- Guardar progreso del wizard en session_state
- Permitir retomar wizard incompleto
- Guardar UCR final via API client

### 10. Agregar tests
Crear `tests/unit/test_new_context_wizard.py`

## Verificación
- [ ] Wizard de 6 pasos funcionando
- [ ] AI genera datos iniciales
- [ ] Usuario puede editar todo
- [ ] UCR se guarda correctamente
- [ ] Quality score se calcula
- [ ] Tests pasando
