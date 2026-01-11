# 🎯 UCR FIRST Architecture

## Principio Fundamental

**UCR FIRST** significa que el **User Context Record (UCR)** es la **única fuente de verdad** para todas las operaciones del sistema. Ninguna operación puede ejecutarse sin un UCR válido.

```
┌─────────────────────────────────────────────────────────────┐
│                      UCR FIRST FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Request → UCR Validation → Operation → Guardrail Check    │
│                    ↓              ↓              ↓          │
│               BLOCKED?      UCR Sections    VIOLATIONS?     │
│                    ↓              ↓              ↓          │
│                 FAIL         Run Trace        BLOCK         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## UCR Sections

| Section | Nombre | Descripción | Crítico |
|---------|--------|-------------|---------|
| **A** | Brand Identity | Nombre, dominio, industria, modelo de negocio | ✅ |
| **B** | Category Definition | Categoría primaria, incluidas/excluidas | ✅ |
| **C** | Competitive Set | Competidores aprobados con evidencia | ✅ |
| **D** | Demand Definition | Keywords de marca y categoría | ⚠️ |
| **E** | Strategic Intent | Objetivos, tolerancia al riesgo | ⚠️ |
| **F** | Channel Context | Canales activos, inversión | ⚠️ |
| **G** | Negative Scope | Guardrails, exclusiones | ✅ CRÍTICO |
| **H** | Governance | Aprobaciones, versionado | ✅ |

---

## Principios UCR FIRST

### 1. NO Operation Without UCR
```python
# ❌ INCORRECTO
def analyze_competitors(domain):
    return search_competitors(domain)

# ✅ CORRECTO (UCR FIRST)
def analyze_competitors(config: Configuration):
    validation = ucr_service.validate(config)
    if validation.status == UCRValidationStatus.BLOCKED:
        raise ConfigurationError(validation.blocked_reasons)
    
    competitors = config.competitors.get_approved()  # Solo UCR Section C
    return analyze(competitors)
```

### 2. ALL Outputs Traced to UCR Sections
```python
# Cada operación crea un trace
trace = ucr_service.create_run_trace(
    operation="signal_detection",
    config=config,
    sections_used=[UCRSection.A, UCRSection.C, UCRSection.G]
)
```

### 3. ALL AI Calls Filtered Through Guardrails
```python
# Antes de devolver output de AI
guardrail_check = ucr_service.check_guardrails(config, ai_output)
if guardrail_check.is_blocked:
    raise GuardrailViolationError(guardrail_check.violations)
```

### 4. FAIL-CLOSED Validation
```python
# Si UCR es inválido, la operación FALLA
# No hay "modo degradado" - UCR es obligatorio
if not config.is_valid:
    raise ConfigurationError("UCR validation failed - operation blocked")
```

---

## Estructura del Proyecto

```
usercontextrecord/
├── brand_intel/                 # 🐍 Python Shared Library (UCR FIRST)
│   ├── core/
│   │   ├── models.py           # Modelos Pydantic (Brand, Competitor, etc.)
│   │   ├── enums.py            # Enumeraciones
│   │   └── exceptions.py       # Excepciones personalizadas
│   ├── services/
│   │   ├── ucr_service.py      # 🎯 CORE: Servicio UCR central
│   │   ├── signal_detector.py  # Detección de señales (UCR-driven)
│   │   ├── quality_scorer.py   # Cálculo de quality score
│   │   └── guardrail_validator.py  # Validación Section G
│   └── ai/
│       ├── claude_client.py    # Cliente Claude (BYOK)
│       ├── openai_client.py    # Cliente OpenAI (BYOK)
│       └── gemini_client.py    # Cliente Gemini (BYOK)
│
├── streamlit_app/               # 🎨 Streamlit Microservice (UCR FIRST UI)
│   ├── app.py                  # Entry point
│   ├── pages/
│   │   ├── 1_🎯_Competitive_Signals.py
│   │   ├── 2_🛡️_Guardrail_Monitor.py
│   │   └── 3_📊_Market_Analysis.py
│   └── services/
│       └── session_manager.py  # UCR-centric session state
│
├── client/                      # ⚛️ React App (existente)
├── server/                      # 🟢 Express Backend (existente)
└── shared/                      # 📦 TypeScript shared (existente)
```

---

## UCR Service - El Corazón del Sistema

```python
from brand_intel.services import UCRService

ucr_service = UCRService()

# 1. Validar UCR (OBLIGATORIO antes de cualquier operación)
validation = ucr_service.validate(config)
if validation.status == UCRValidationStatus.BLOCKED:
    # FAIL-CLOSED: No continuar
    raise ConfigurationError(validation.blocked_reasons)

# 2. Obtener secciones requeridas para una operación
sections = ucr_service.get_required_sections(["signal_detection"])
# Returns: [UCRSection.A, UCRSection.B, UCRSection.C, UCRSection.E, UCRSection.G]

# 3. Verificar guardrails antes de output
guardrail_check = ucr_service.check_guardrails(config, content)
if guardrail_check.is_blocked:
    raise GuardrailViolationError(guardrail_check.violations)

# 4. Calcular quality score
quality = ucr_service.calculate_quality_score(config)
# Returns: QualityScore(overall=78, grade="high", ...)

# 5. Crear trace para auditoría
trace = ucr_service.create_run_trace("operation_name", config)
```

---

## Flujo de Operaciones

### Signal Detection (UCR FIRST)

```
1. Request: "Detect competitive signals"
       ↓
2. UCR Validation
   - Check Section A (Brand) ✓
   - Check Section B (Category) ✓
   - Check Section C (Competitors) ✓
   - Check Section G (Guardrails) ✓
       ↓
3. Get Approved Competitors (Section C only)
       ↓
4. Apply Category Filters (Section B)
       ↓
5. Detect Signals
       ↓
6. Filter Through Guardrails (Section G)
       ↓
7. Create Run Trace
       ↓
8. Return Results with UCR Trace
```

### Guardrail Validation (Section G)

```
Content → Check Excluded Categories
       → Check Excluded Keywords
       → Check Excluded Competitors
       → Check Excluded Use Cases
       ↓
   VIOLATIONS?
       ↓
   YES → BLOCK (if hard_exclusion=true)
   NO  → PASS
```

---

## Quality Score (UCR-Based)

| Dimensión | Peso | Fuente UCR |
|-----------|------|------------|
| Completeness | 25% | Sections A, B, E |
| Competitor Confidence | 25% | Section C |
| Negative Strength | 30% | Section G |
| Evidence Coverage | 20% | Section C (evidence packs) |

```python
# Cálculo de Quality Score
quality = QualityScore(
    completeness=85,           # Campos requeridos completos
    competitor_confidence=70,  # Competidores con evidencia
    negative_strength=90,      # Guardrails definidos
    evidence_coverage=65,      # Evidence packs completos
    overall=78,                # Promedio ponderado
    grade="high"               # high >= 75, medium >= 50, low < 50
)
```

---

## Ejecución

### Local (Windows)
```bash
scripts\run_streamlit.bat
```

### Local (Linux/Mac)
```bash
chmod +x scripts/run_streamlit.sh
./scripts/run_streamlit.sh
```

### Docker
```bash
cd streamlit_app
docker-compose up -d
```

### Acceso
- **Streamlit**: http://localhost:8501
- **React App**: http://localhost:3001
- **API**: http://localhost:3000

---

## BYOK (Bring Your Own Key)

Configura tus API keys en `.env`:

```env
# AI Providers (BYOK)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=...

# External APIs
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...
AHREFS_API_KEY=...
SERPAPI_KEY=...
```

---

## Resumen

**UCR FIRST** garantiza:

1. ✅ **Consistencia**: Todas las operaciones usan la misma fuente de verdad
2. ✅ **Trazabilidad**: Cada operación está vinculada a secciones UCR
3. ✅ **Seguridad**: Guardrails (Section G) filtran todo output
4. ✅ **Auditabilidad**: Run traces para compliance
5. ✅ **Fail-Closed**: Si UCR es inválido, la operación falla

---

*Documento Version: 1.0.0*
*Arquitectura: UCR FIRST*
*Nivel: Fortune 500 Grade*
