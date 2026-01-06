# Arquitectura Context-First: Relación entre UCR y Módulos

## Principio Fundamental

**El User Context Record (UCR) es el single source of truth. Ningún módulo ejecuta sin un contexto validado y completo.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTEXT-FIRST ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Brand (1)  →  Context/UCR (1)  →  Exec Reports (N)  →  Master Report     │
│                                                                             │
│   ┌─────────┐      ┌─────────────────────────────────────┐                 │
│   │ OOFOS   │ ──►  │ UCR (8 Canonical Sections)          │                 │
│   │ Brand   │      │                                     │                 │
│   └─────────┘      │  A. Brand Context                   │                 │
│                    │  B. Category Definition             │                 │
│                    │  C. Competitive Set                 │                 │
│                    │  D. Demand Definition               │                 │
│                    │  E. Strategic Intent                │                 │
│                    │  F. Channel Context                 │                 │
│                    │  G. Negative Scope                  │                 │
│                    │  H. Governance                      │                 │
│                    └─────────────────────────────────────┘                 │
│                                      │                                      │
│                                      ▼                                      │
│                    ┌─────────────────────────────────────┐                 │
│                    │ MODULES (require validated UCR)     │                 │
│                    │                                     │                 │
│                    │  ├── Keyword Gap Lite               │                 │
│                    │  ├── Content Gap (future)           │                 │
│                    │  ├── SERP Analysis (future)         │                 │
│                    │  └── Growth Signals (future)        │                 │
│                    └─────────────────────────────────────┘                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## El UCR: 8 Secciones Canónicas

Cada sección del UCR alimenta diferentes aspectos del análisis de módulos.

### A. Brand Context
**Propósito:** Identidad de la marca  
**Campos clave:**
- `domain` - Dominio principal (ej: oofos.com)
- `name` - Nombre de la marca
- `tagline` - Propuesta de valor

**Uso en Keyword Gap:**
```typescript
// El domain es el punto de partida del análisis
const clientDomain = config.brand.domain; // "oofos.com"
```

---

### B. Category Definition
**Propósito:** Define el "fence" - qué categorías son relevantes  
**Campos clave:**
- `primary_category` - Categoría principal (ej: "Recovery Footwear")
- `included_categories` - Categorías incluidas
- `excluded_categories` - Categorías a ignorar

**Uso en Keyword Gap:**
```typescript
// Fence check: ¿El keyword está dentro de las categorías definidas?
function checkFence(keyword: string, config: Configuration): FenceResult {
  const included = config.category_definition?.included_categories || [];
  const excluded = config.category_definition?.excluded_categories || [];
  
  // Si el keyword menciona una categoría excluida → outside fence
  if (excluded.some(cat => keyword.includes(cat.toLowerCase()))) {
    return { inFence: false, reason: "Excluded category" };
  }
  
  // Si el keyword menciona una categoría incluida → inside fence
  if (included.some(cat => keyword.includes(cat.toLowerCase()))) {
    return { inFence: true, reason: "Included category" };
  }
  
  // Default: outside fence
  return { inFence: false, reason: "No category match" };
}
```

---

### C. Competitive Set
**Propósito:** Define quiénes son los competidores  
**Campos clave:**
- `competitors[]` - Lista de competidores con tier y domain
  - `tier1` - Competidores directos (HOKA, Brooks)
  - `tier2` - Competidores indirectos (Birkenstock, Crocs)
  - `tier3` - Jugadores aspiracionales (no usados en gap analysis)

**Uso en Keyword Gap:**
```typescript
// Extraer dominios de competidores tier1 + tier2
function getCompetitorDomains(config: Configuration): string[] {
  const competitors = config.competitors?.competitors || [];
  return competitors
    .filter(c => c.tier === "tier1" || c.tier === "tier2")
    .map(c => normalizeDomain(c.domain));
}

// Detectar marcas competidoras en keywords
function getCompetitorBrandTerms(config: Configuration): string[] {
  const terms = [];
  for (const comp of config.competitors?.competitors || []) {
    if (comp.name) terms.push(comp.name.toLowerCase());
  }
  return terms;
}

// Keyword "hoka recovery sandals" → OUT_OF_PLAY (competitor brand)
```

---

### D. Demand Definition
**Propósito:** Define los temas/clusters de demanda  
**Campos clave:**
- `demand_themes[]` - Temas de demanda agrupados
  - `name` - Nombre del tema (ej: "Recovery Footwear")
  - `keywords[]` - Keywords representativos
  - `priority` - Prioridad (high/medium/low)

**Uso en Keyword Gap:**
```typescript
// Agrupar keywords por tema
function classifyTheme(keyword: string, config: Configuration): string {
  const themes = config.demand_definition?.demand_themes || [];
  
  for (const theme of themes) {
    for (const themeKeyword of theme.keywords || []) {
      if (keyword.includes(themeKeyword.toLowerCase())) {
        return theme.name;
      }
    }
  }
  
  return "Other";
}

// Keyword "best recovery sandals" → Theme: "Recovery Footwear"
```

---

### E. Strategic Intent
**Propósito:** Define objetivos estratégicos  
**Campos clave:**
- `goal_type` - Tipo de objetivo (growth/defend/explore)
- `risk_tolerance` - Tolerancia al riesgo
- `time_horizon` - Horizonte temporal

**Uso en Keyword Gap:**
```typescript
// Ajustar thresholds según strategic intent
function getThresholds(config: Configuration): { pass: number; review: number } {
  const riskTolerance = config.strategic_intent?.risk_tolerance || "moderate";
  
  switch (riskTolerance) {
    case "aggressive":
      return { pass: 0.50, review: 0.25 }; // Más permisivo
    case "conservative":
      return { pass: 0.70, review: 0.40 }; // Más estricto
    default:
      return { pass: 0.60, review: 0.30 }; // Default
  }
}
```

---

### F. Channel Context
**Propósito:** Define el mix de canales y prioridades SEO  
**Campos clave:**
- `channel_mix` - Distribución de canales
- `seo_maturity` - Nivel de madurez SEO
- `primary_channels[]` - Canales prioritarios

**Uso en Keyword Gap:**
```typescript
// Ajustar límites según madurez SEO
function getKeywordLimit(config: Configuration): number {
  const seoMaturity = config.channel_context?.seo_maturity || "developing";
  
  switch (seoMaturity) {
    case "advanced": return 500;  // Más keywords
    case "developing": return 200; // Default
    case "nascent": return 100;    // Menos keywords
    default: return 200;
  }
}
```

---

### G. Negative Scope
**Propósito:** Define exclusiones absolutas  
**Campos clave:**
- `excluded_keywords[]` - Keywords a excluir siempre
- `excluded_categories[]` - Categorías a excluir
- `excluded_use_cases[]` - Casos de uso a excluir

**Uso en Keyword Gap:**
```typescript
// Filtrar keywords excluidos ANTES del análisis
function applyNegativeScope(keywords: string[], config: Configuration): string[] {
  const excluded = config.negative_scope?.excluded_keywords || [];
  const excludedCategories = config.negative_scope?.excluded_categories || [];
  
  return keywords.filter(kw => {
    // Excluir si coincide con keyword excluido
    if (excluded.some(ex => kw.includes(ex.toLowerCase()))) {
      return false;
    }
    
    // Excluir si coincide con categoría excluida
    if (excludedCategories.some(cat => kw.includes(cat.toLowerCase()))) {
      return false;
    }
    
    return true;
  });
}

// Keyword "running shoes" → EXCLUDED (negative scope)
```

---

### H. Governance
**Propósito:** Controles, aprobaciones y configuración avanzada  
**Campos clave:**
- `scoring_config` - Configuración de scoring
  - `vertical_preset` - Preset de vertical (dtc_footwear, retail_big_box, b2b_saas)
  - `pass_threshold` - Umbral para PASS
  - `review_threshold` - Umbral para REVIEW
- `capability_model` - Modelo de capability
  - `boosters[]` - Términos que aumentan capability
  - `penalties[]` - Términos que reducen capability
- `approval_workflow` - Flujo de aprobación

**Uso en Keyword Gap:**
```typescript
// Aplicar vertical preset desde governance
function getScoringConfig(config: Configuration): ScoringConfig {
  // Prioridad: governance.scoring_config > top-level > defaults
  const govConfig = config.governance?.scoring_config;
  const topConfig = config.scoring_config;
  
  const preset = govConfig?.vertical_preset || topConfig?.vertical_preset || "generic";
  
  return {
    pass_threshold: govConfig?.pass_threshold ?? getPreset(preset).pass_threshold,
    review_threshold: govConfig?.review_threshold ?? getPreset(preset).review_threshold,
  };
}

// Aplicar capability model desde governance
function getCapabilityModel(config: Configuration): CapabilityModel {
  return config.governance?.capability_model 
      || config.capability_model 
      || getPreset("generic").capability_model;
}
```

---

## Flujo Completo: UCR → Keyword Gap Lite

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    UCR → KEYWORD GAP LITE FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. VALIDATION GATE                                                         │
│     ├── ¿UCR existe?                    → Si no, ERROR                      │
│     ├── ¿UCR tiene brand.domain?        → Si no, ERROR                      │
│     ├── ¿UCR tiene competitors?         → Si no, ERROR                      │
│     └── ¿UCR status >= AI_READY?        → Si no, WARNING                    │
│                                                                             │
│  2. CONFIGURATION EXTRACTION                                                │
│     ├── brand.domain          → clientDomain                                │
│     ├── competitors           → competitorDomains[], brandTerms[]          │
│     ├── category_definition   → fenceConfig                                 │
│     ├── demand_definition     → themeClassifier                             │
│     ├── negative_scope        → exclusionFilters                            │
│     └── governance            → scoringConfig, capabilityModel              │
│                                                                             │
│  3. PROVIDER API CALL                                                       │
│     └── fetchKeywordGap(clientDomain, competitorDomains, provider)          │
│                                                                             │
│  4. PER-KEYWORD EVALUATION (for each gap keyword)                           │
│     ├── Normalize: lowercase, trim, collapse spaces                         │
│     ├── Intent: classifyIntent(kw, config)                                  │
│     ├── Fence: checkFence(kw, config.category_definition)                   │
│     ├── Capability: computeCapability(kw, config.capability_model)          │
│     ├── Brand Check: isCompetitorBrand(kw, config.competitors)              │
│     └── Evaluate: evaluateKeyword(kw, config) → status, reason, flags       │
│                                                                             │
│  5. 3-TIER CLASSIFICATION                                                   │
│     ├── PASS: capability >= pass_threshold (from governance)                │
│     ├── REVIEW: capability >= review_threshold                              │
│     └── OUT_OF_PLAY: < review_threshold OR brand OR variant                 │
│                                                                             │
│  6. THEME GROUPING                                                          │
│     └── classifyTheme(kw, config.demand_definition)                         │
│                                                                             │
│  7. OUTPUT                                                                  │
│     └── KeywordGapLiteResult with contextVersion, filtersApplied            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Ejemplo Práctico: OOFOS

### UCR de OOFOS

```json
{
  "id": 15,
  "name": "OOFOS Recovery Footwear",
  "status": "LOCKED",
  
  "brand": {
    "domain": "oofos.com",
    "name": "OOFOS"
  },
  
  "category_definition": {
    "primary_category": "Recovery Footwear",
    "included_categories": ["sandals", "slides", "clogs", "recovery shoes"],
    "excluded_categories": ["running shoes", "hiking boots", "basketball"]
  },
  
  "competitors": {
    "competitors": [
      { "name": "HOKA", "domain": "hoka.com", "tier": "tier1" },
      { "name": "Brooks", "domain": "brooksrunning.com", "tier": "tier1" },
      { "name": "Birkenstock", "domain": "birkenstock.com", "tier": "tier2" }
    ]
  },
  
  "demand_definition": {
    "demand_themes": [
      { "name": "Recovery", "keywords": ["recovery", "post-workout"], "priority": "high" },
      { "name": "Comfort", "keywords": ["comfort", "cushion", "soft"], "priority": "high" },
      { "name": "Medical", "keywords": ["plantar fasciitis", "arch support"], "priority": "medium" }
    ]
  },
  
  "negative_scope": {
    "excluded_keywords": ["running marathon", "basketball shoes"],
    "excluded_categories": ["athletic performance", "sports training"]
  },
  
  "governance": {
    "scoring_config": {
      "vertical_preset": "dtc_footwear",
      "pass_threshold": 0.55,
      "review_threshold": 0.30
    },
    "capability_model": {
      "boosters": [
        { "term": "recovery", "weight": 0.55 },
        { "term": "comfort", "weight": 0.20 },
        { "term": "nurses", "weight": 0.25 }
      ],
      "penalties": [
        { "term": "running shoes", "weight": -0.60 },
        { "term": "basketball", "weight": -0.55 }
      ]
    }
  }
}
```

### Análisis de Keyword: "recovery shoes"

```
Keyword: "recovery shoes"
    │
    ├── 1. UCR Extraction
    │   ├── clientDomain: "oofos.com"
    │   ├── competitors: ["hoka.com", "brooksrunning.com", "birkenstock.com"]
    │   └── preset: "dtc_footwear" (pass: 0.55, review: 0.30)
    │
    ├── 2. Intent Classification
    │   └── category_capture (matches "recovery" in demand themes)
    │
    ├── 3. Fence Check
    │   └── inFence: true (matches "recovery shoes" in included_categories)
    │
    ├── 4. Capability Scoring
    │   ├── Base: 0.50
    │   ├── "recovery" boost: +0.55 (from governance.capability_model)
    │   └── Total: 1.00 (clamped)
    │
    ├── 5. Brand Check
    │   └── isCompetitorBrand: false
    │
    ├── 6. Evaluation
    │   ├── capability (1.00) >= pass_threshold (0.55)
    │   └── status: PASS
    │
    └── 7. Output
        {
          "keyword": "recovery shoes",
          "status": "pass",
          "capabilityScore": 1.00,
          "theme": "Recovery",
          "reason": "Strong category fit",
          "flags": [],
          "confidence": "high"
        }
```

### Análisis de Keyword: "clogs women"

```
Keyword: "clogs women"
    │
    ├── 1. UCR Extraction (same as above)
    │
    ├── 2. Intent Classification
    │   └── category_capture (matches "clogs" in included_categories)
    │
    ├── 3. Fence Check
    │   └── inFence: false (no exact match in primary_category)
    │       → flag: "outside_fence"
    │
    ├── 4. Capability Scoring
    │   ├── Base: 0.50
    │   ├── "clogs" boost: +0.25 (sandals/clogs booster)
    │   └── Total: 0.75
    │
    ├── 5. Brand Check
    │   └── isCompetitorBrand: false
    │
    ├── 6. Evaluation (SPEC 3.1)
    │   ├── capability (0.75) >= pass_threshold (0.55)
    │   ├── SPEC 3.1: Capability manda, fence solo flaggea
    │   └── status: PASS (con flag "outside_fence")
    │
    └── 7. Output
        {
          "keyword": "clogs women",
          "status": "pass",
          "capabilityScore": 0.75,
          "theme": "Comfort",
          "reason": "Strong capability fit — verify category alignment",
          "flags": ["outside_fence"],
          "confidence": "medium"
        }
```

### Análisis de Keyword: "hoka recovery sandals"

```
Keyword: "hoka recovery sandals"
    │
    ├── 1. Intent Classification
    │   └── brand_capture (detects "hoka" in competitor names)
    │       → flag: "competitor_brand"
    │
    ├── 2. Brand Check
    │   └── isCompetitorBrand: true (HOKA is tier1 competitor)
    │
    ├── 3. Evaluation (short-circuit)
    │   ├── competitor_brand flag detected
    │   └── status: OUT_OF_PLAY (no evalúa capability)
    │
    └── 4. Output
        {
          "keyword": "hoka recovery sandals",
          "status": "out_of_play",
          "reason": "Competitor brand term",
          "flags": ["competitor_brand"],
          "theme": "N/A"
        }
```

---

## Validación de UCR antes de Módulos

### Estados del UCR (State Machine)

```
DRAFT_AI → AI_READY → AI_ANALYSIS_RUN → HUMAN_CONFIRMED → LOCKED
    │          │              │                │             │
    │          │              │                │             └── Full module access
    │          │              │                └── Module access with warning
    │          │              └── Module access with warning
    │          └── Module access with warning
    └── NO module access (UCR incomplete)
```

### Validation Gate en Keyword Gap

```typescript
// server/routes.ts - POST /api/keyword-gap-lite/run
async function runKeywordGapLite(req, res) {
  const { configurationId } = req.body;
  
  // 1. Fetch configuration
  const config = await storage.getConfiguration(configurationId);
  if (!config) {
    return res.status(404).json({ error: "Configuration not found" });
  }
  
  // 2. Validate minimum requirements
  if (!config.brand?.domain) {
    return res.status(400).json({ error: "UCR missing brand.domain" });
  }
  
  if (!config.competitors?.competitors?.length) {
    return res.status(400).json({ error: "UCR missing competitors" });
  }
  
  // 3. Check status (warning if not locked)
  if (config.status !== "LOCKED" && config.status !== "HUMAN_CONFIRMED") {
    console.warn(`Running analysis on non-confirmed UCR: ${config.status}`);
  }
  
  // 4. Execute module
  const result = await computeKeywordGap(config, provider);
  
  // 5. Include context version in output
  result.contextVersion = config.version || 1;
  result.contextStatus = config.status;
  
  return res.json(result);
}
```

---

## Resumen: Dependencias UCR → Keyword Gap

| Sección UCR | Uso en Keyword Gap | Obligatorio |
|-------------|-------------------|-------------|
| **A. Brand** | clientDomain para API call | Si |
| **B. Category** | Fence check (in/out) | No (default: all pass) |
| **C. Competitors** | Dominios para gap, brand detection | Si |
| **D. Demand** | Theme classification | No (default: "Other") |
| **E. Strategic** | Risk-based thresholds | No (default: moderate) |
| **F. Channel** | Keyword limits | No (default: 200) |
| **G. Negative** | Pre-filter exclusions | No (default: none) |
| **H. Governance** | Scoring config, capability model | No (default: generic) |

---

## Próximos Módulos (Roadmap)

Cada módulo futuro seguirá el mismo patrón Context-First:

| Módulo | Secciones UCR Clave | Estado |
|--------|---------------------|--------|
| **Keyword Gap Lite** | B, C, D, G, H | Implementado |
| **Content Gap** | B, C, D, E | Planificado |
| **SERP Analysis** | A, B, C | Planificado |
| **Growth Signals** | A-H (todos) | Planificado |
| **AI Councils** | E, F, H | Planificado |

---

## Principios de Diseño

1. **UCR es inmutable durante análisis** - Una vez iniciado un módulo, el UCR no cambia
2. **Version tracking** - Cada output incluye `contextVersion` para trazabilidad
3. **Graceful degradation** - Si falta una sección, usar defaults razonables
4. **No mock data** - Solo datos reales de APIs externas
5. **Auditabilidad** - `filtersApplied` muestra exactamente qué reglas del UCR se usaron
