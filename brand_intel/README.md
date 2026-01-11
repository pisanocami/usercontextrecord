# 🎯 Brand Intel - UCR FIRST Shared Library

**Brand Intelligence Shared Library** - Fortune 500 Grade Competitive Intelligence

## UCR FIRST Architecture

Esta biblioteca implementa el principio **UCR FIRST** (User Context Record First):

- **NO** operation without valid UCR
- **ALL** outputs traced to UCR sections
- **ALL** AI calls filtered through UCR guardrails
- **FAIL-CLOSED** validation

## Instalación

```bash
# Desde el directorio raíz del proyecto
pip install -e brand_intel/

# O con dependencias de desarrollo
pip install -e "brand_intel/[dev]"
```

## Estructura

```
brand_intel/
├── core/                    # Modelos y tipos core
│   ├── models.py           # Pydantic models (Brand, Competitor, etc.)
│   ├── enums.py            # Enumeraciones
│   └── exceptions.py       # Excepciones personalizadas
│
├── services/                # Servicios de negocio (UCR FIRST)
│   ├── ucr_service.py      # 🎯 CORE: Servicio UCR central
│   ├── signal_detector.py  # Detección de señales competitivas
│   ├── quality_scorer.py   # Cálculo de quality score
│   └── guardrail_validator.py  # Validación Section G
│
├── ai/                      # Clientes AI (BYOK)
│   ├── base.py             # Interfaz base
│   ├── claude_client.py    # Anthropic Claude
│   ├── openai_client.py    # OpenAI GPT
│   ├── gemini_client.py    # Google Gemini
│   └── prompts/            # Templates de prompts
│
├── data/                    # Capa de acceso a datos
│   ├── database.py         # Conexión a base de datos
│   ├── cache.py            # Cache Redis
│   └── repositories/       # Patrón Repository
│
└── utils/                   # Utilidades
    ├── domain_normalizer.py
    ├── validators.py
    └── formatters.py
```

## Uso Básico

### UCR Service (Core)

```python
from brand_intel.services import UCRService
from brand_intel.core.models import Configuration

ucr_service = UCRService()

# 1. Validar UCR (OBLIGATORIO antes de cualquier operación)
validation = ucr_service.validate(config)
if not validation.is_valid:
    raise Exception(validation.blocked_reasons)

# 2. Verificar guardrails
guardrail_check = ucr_service.check_guardrails(config, content)
if guardrail_check.is_blocked:
    raise Exception("Content blocked by guardrails")

# 3. Calcular quality score
quality = ucr_service.calculate_quality_score(config)
print(f"Quality: {quality.overall}% ({quality.grade})")

# 4. Crear trace para auditoría
trace = ucr_service.create_run_trace("operation_name", config)
```

### Signal Detector

```python
from brand_intel.services import SignalDetector, UCRService
from brand_intel.ai import ClaudeClient

ucr_service = UCRService()
ai_client = ClaudeClient()  # BYOK: usa ANTHROPIC_API_KEY
detector = SignalDetector(ucr_service, ai_client)

# Detectar señales (UCR validation automática)
result = await detector.detect_signals(
    config=config,
    signal_types=["ranking_shift", "new_keyword"],
    lookback_days=30
)

print(f"Detected {len(result.signals)} signals")
print(f"UCR Sections used: {result.run_trace.sections_used}")
```

### AI Clients (BYOK)

```python
from brand_intel.ai import ClaudeClient, OpenAIClient, GeminiClient

# Claude (BYOK)
claude = ClaudeClient()  # Usa ANTHROPIC_API_KEY
competitors = await claude.analyze_competitors(
    brand_name="Nike",
    domain="nike.com",
    category="Athletic Footwear"
)

# OpenAI (BYOK)
openai = OpenAIClient()  # Usa OPENAI_API_KEY
insights = await openai.generate_insights(signals, brand_context)

# Gemini con Google Search (BYOK)
gemini = GeminiClient()  # Usa GEMINI_API_KEY
competitors = await gemini.analyze_competitors(...)  # Con grounding
```

## UCR Sections

| Section | Nombre | Descripción |
|---------|--------|-------------|
| **A** | Brand Identity | Nombre, dominio, industria |
| **B** | Category Definition | Categoría primaria, fence |
| **C** | Competitive Set | Competidores aprobados |
| **D** | Demand Definition | Keywords de marca/categoría |
| **E** | Strategic Intent | Objetivos, tolerancia al riesgo |
| **F** | Channel Context | Canales activos |
| **G** | Negative Scope | Guardrails (CRÍTICO) |
| **H** | Governance | Aprobaciones, versionado |

## Variables de Entorno (BYOK)

```env
# AI Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=...

# Database
DATABASE_URL=postgresql://...

# Cache
REDIS_URL=redis://localhost:6379

# External APIs
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...
AHREFS_API_KEY=...
```

## Testing

```bash
# Ejecutar tests
pytest tests/

# Con coverage
pytest tests/ --cov=brand_intel --cov-report=html
```

## Licencia

MIT License - Brand Intelligence Platform Team
