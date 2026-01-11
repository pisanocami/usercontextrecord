---
description: Integrar clientes AI (Claude, OpenAI, Gemini) con la UI de Streamlit
---

# Gap 3: Integración con IA

## Objetivo
Conectar los clientes AI existentes en `brand_intel/ai/` con la interfaz de Streamlit.

## Pasos

### 1. Crear AI Service unificado
Crear `streamlit_app/services/ai_service.py`:
```python
from brand_intel.ai import ClaudeClient, OpenAIClient, GeminiClient
from brand_intel.core.models import Configuration, Competitor, Signal

class AIService:
    def __init__(self, settings: Settings):
        self.claude = ClaudeClient() if settings.has_claude() else None
        self.openai = OpenAIClient() if settings.has_openai() else None
        self.gemini = GeminiClient() if settings.has_gemini() else None
    
    def get_available_providers(self) -> List[str]:
        providers = []
        if self.claude: providers.append("Claude")
        if self.openai: providers.append("OpenAI")
        if self.gemini: providers.append("Gemini")
        return providers
```

### 2. Implementar Competitor Search
```python
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
    # Fallback to other providers
```

### 3. Implementar Insight Generation
```python
async def generate_insights(
    self,
    signals: List[Signal],
    config: Configuration
) -> str:
    """Generate executive insights from signals."""
    if self.claude:
        return await self.claude.generate_insights(signals, config)
```

### 4. Implementar Content Brief Generation
```python
async def generate_content_brief(
    self,
    keyword: str,
    config: Configuration,
    brief_type: str = "blog"
) -> dict:
    """Generate content brief for a keyword."""
    if self.claude:
        return await self.claude.generate_content_brief(
            keyword=keyword,
            brand_context=config.brand.dict(),
            brief_type=brief_type
        )
```

### 5. Implementar Guardrail Validation
```python
async def validate_content(
    self,
    content: str,
    config: Configuration
) -> dict:
    """Validate content against UCR guardrails using AI."""
    if self.claude:
        return await self.claude.validate_guardrails(
            content=content,
            guardrails=config.negative_scope.dict()
        )
```

### 6. Crear componente AI Provider Selector
Crear `streamlit_app/components/ai_provider_selector.py`:
```python
def render_ai_provider_selector(ai_service: AIService) -> str:
    providers = ai_service.get_available_providers()
    if not providers:
        st.warning("No AI providers configured. Add API keys to .env")
        return None
    
    return st.selectbox("AI Provider", providers)
```

### 7. Crear componente AI Generation Button
Crear `streamlit_app/components/ai_generate_button.py`:
```python
def render_ai_generate_button(
    label: str,
    on_click: Callable,
    key: str
):
    col1, col2 = st.columns([3, 1])
    with col1:
        if st.button(f"🤖 {label}", key=key):
            with st.spinner("Generating with AI..."):
                result = on_click()
                return result
    with col2:
        st.caption("BYOK")
    return None
```

### 8. Integrar en Section C (Competitors)
- Agregar botón "Search Competitors with AI"
- Mostrar resultados en cards
- Permitir aprobar/rechazar

### 9. Integrar en Signals page
- Agregar botón "Generate Insights"
- Mostrar insights en markdown
- Permitir exportar

### 10. Agregar manejo de errores
```python
try:
    result = await ai_service.search_competitors(...)
except AIClientError as e:
    st.error(f"AI Error: {e.message}")
except RateLimitError:
    st.warning("Rate limit reached. Please wait...")
```

### 11. Agregar tests
Crear `tests/unit/test_ai_service.py`

## Verificación
- [ ] AI Service creado con fallbacks
- [ ] Competitor search funcionando
- [ ] Insight generation funcionando
- [ ] Content brief generation funcionando
- [ ] Guardrail validation funcionando
- [ ] Manejo de errores implementado
- [ ] Tests pasando
