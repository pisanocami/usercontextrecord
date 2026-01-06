# Keyword Gap Analysis - Technical Documentation

## Overview

El sistema de Keyword Gap Analysis identifica oportunidades de keywords donde los competidores rankean pero la marca no. Utiliza una **arquitectura multi-proveedor** que soporta DataForSEO y Ahrefs, aplicando un sistema de clasificación de 3 niveles con scoring inteligente.

**Principio clave:** El sistema clasifica keywords en 3 categorías: `pass`, `review`, y `out_of_play` basándose en capability scoring y detección de marcas competidoras.

---

## Arquitectura Multi-Proveedor

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MULTI-PROVIDER ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  server/keyword-data-provider.ts     → Interface + Factory Pattern      │
│  server/providers/                   → Provider Implementations         │
│     ├── dataforseo-provider.ts       → DataForSEO (domain_intersection) │
│     ├── ahrefs-provider.ts           → Ahrefs (organic-keywords + gap)  │
│     └── index.ts                     → Exports all providers            │
│                                                                         │
│  ┌─────────────────┐     ┌─────────────────┐                           │
│  │   DataForSEO    │     │     Ahrefs      │                           │
│  ├─────────────────┤     ├─────────────────┤                           │
│  │ domain_inter-   │     │ organic-keywords│                           │
│  │ section API     │     │ + in-memory gap │                           │
│  │ Basic Auth      │     │ Bearer Token    │                           │
│  │ No cache        │     │ 7-day TTL cache │                           │
│  └─────────────────┘     └─────────────────┘                           │
│           │                      │                                      │
│           └──────────┬───────────┘                                      │
│                      ▼                                                  │
│         getProvider("dataforseo" | "ahrefs")                           │
│                      │                                                  │
│                      ▼                                                  │
│            KeywordGapLiteResult                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### DataForSEO Provider
- **Endpoint:** POST `/v3/dataforseo_labs/google/domain_intersection/live`
- **Auth:** Basic Auth (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD)
- **Gap Method:** Direct API gap analysis (intersection_mode: "only_target2_keywords")
- **Fields:** keyword, search_volume, cpc, competition, keyword_difficulty

### Ahrefs Provider
- **Endpoint:** GET `/v3/site-explorer/organic-keywords`
- **Auth:** Bearer Token (AHREFS_API_KEY)
- **Gap Method:** In-memory computation (competitor_keywords - client_keywords)
- **Cache:** 7-day TTL, keyed by (domain, country, limit)
- **Limits:** 2000 keywords/domain, position ≤ 20 for competitors, ≤ 100 for client
- **Filters:** minVolume = 100, maxKd = 60
- **Fields:** keyword, best_position, volume, keyword_difficulty, cpc

---

## v3.1 Configurable Scoring Models (NEW)

Version 3.1 introduces **configurable capability models** and **vertical-specific presets** that can be customized per UCR.

### Configuration Sources (Priority Order)
1. `config.capability_model` - Direct UCR-level configuration
2. `config.governance.capability_model` - Nested in governance JSONB
3. `config.scoring_config.vertical_preset` - Reference to preset
4. `config.governance.scoring_config.vertical_preset` - Nested preset reference
5. Default preset (generic)

### Vertical Presets

**File:** `server/capability-presets.ts`

| Preset | Pass Threshold | Review Threshold | Key Boosters |
|--------|----------------|------------------|--------------|
| **dtc_footwear** | 0.55 | 0.30 | recovery (+0.5), comfort (+0.2), orthopedic (+0.3), sandals (+0.2) |
| **retail_big_box** | 0.65 | 0.35 | power tools (+0.3), appliances (+0.25), storage (+0.2) |
| **b2b_saas** | 0.50 | 0.25 | enterprise (+0.35), roi (+0.3), integration (+0.25) |

### Enhanced Opportunity Scoring Formula (v3.1)

```typescript
opportunityScore = volume × cpc × intentWeight × capabilityScore × difficultyFactor × positionFactor

where:
  difficultyFactor = 1 - (keywordDifficulty / 100) × difficulty_weight
  positionFactor = 1 / (1 + (competitorPosition / 10)) × position_weight
```

### Confidence Levels

| Level | Condition | Description |
|-------|-----------|-------------|
| **High** | capability > pass_threshold + 0.15 | Clear fit, proceed with confidence |
| **Medium** | Within 0.15 of threshold | Good fit, monitor results |
| **Low** | Near threshold boundary | Borderline, needs human validation |

### Case Study: OOFOS (DTC Footwear)

Using `vertical_preset: "dtc_footwear"`:

| Metric | Before Preset | After SPEC 3.1 |
|--------|---------------|----------------|
| Pass Rate | 0% | **23% (62 keywords)** |
| Review Rate | 75% | 52% (140 keywords) |
| Out of Play | 25% | 25% (67 keywords) |
| Top Keywords | none | "recovery shoes" (153K score) |

See `OOFOS_CASE_STUDY.md` for detailed analysis.

---

## SPEC 3.1 — Fence Override Fix

### Problema Resuelto

Keywords con alta capability (ej: 75%) caían en **Review** por estar "fuera del fence" aunque el scoring indicaba que eran oportunidades ganadoras.

### Nuevo Comportamiento

**Capability manda. Fence solo flaggea.**

| Capability Score | Fence Status | Resultado | Flags |
|------------------|--------------|-----------|-------|
| ≥ pass_threshold | In Fence | **PASS** | - |
| ≥ pass_threshold | Outside Fence | **PASS** | `["outside_fence"]` |
| review_threshold - pass_threshold | Any | **REVIEW** | `["outside_fence"]` si aplica |
| < review_threshold | Any | **OUT_OF_PLAY** | - |

### Lógica de Evaluación (pseudocódigo)

```typescript
const fence = fenceCheck(keyword, config);
const capability = computeCapabilityScore(keyword, config);
const flags = [];

if (!fence.inFence) {
  flags.push("outside_fence");
}

if (isCompetitorBrand(keyword, config)) {
  return outOfPlay("competitor_brand", flags);
}

if (intentType === "variant_or_size") {
  return outOfPlay("variant_or_size", flags);
}

if (capability < review_threshold) {
  return outOfPlay("low_capability", flags);
}

if (capability < pass_threshold) {
  return review("medium_capability", flags);
}

// capability >= pass_threshold
return pass("strong_capability", flags);
```

### UI: Badge "Outside Fence"

En la tabla de Top Opportunities, los keywords con flag `outside_fence` muestran:
- **Badge**: ⚠️ Fence (color amber)
- **Tooltip**: "Strong keyword opportunity, but not included in current category scope. Verify alignment."

### Ejemplo

**Keyword**: `clogs women`
- **Antes**: Status = Review, Reason = "Outside category fence - needs review"
- **Después**: Status = **Pass**, Flags = `["outside_fence"]`, Reason = "Strong capability fit — verify category alignment"

---

## Arquitectura del Flujo (v3 - 3-Tier System)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    KEYWORD GAP LITE FLOW v3 (3-TIER)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. INPUT: Configuration (UCR)                                          │
│     ├── brand.domain → "homedepot.com"                                  │
│     ├── competitors.competitors[] → tier1+tier2 domains only            │
│     │   └── [{domain: "lowes.com", tier: "tier1"}, ...]                 │
│     ├── category_definition.included → ["home improvement", ...]        │
│     └── negative_scope → exclusiones para filtrado                      │
│                                                                         │
│  2. DATA FETCH: Provider API (DataForSEO OR Ahrefs)                     │
│     ├── DataForSEO: POST /domain_intersection/live                      │
│     │   └── intersection_mode: "only_target2_keywords"                  │
│     └── Ahrefs: GET /organic-keywords × 2 → in-memory gap               │
│         └── gap = competitor_keywords - client_keywords                 │
│                                                                         │
│  3. INTENT CLASSIFICATION (por cada keyword)                            │
│     ├── category_capture: sandals, slides, recovery shoes               │
│     ├── problem_solution: plantar fasciitis, nurses, comfort            │
│     ├── product_generic: shoes, sneakers, footwear                      │
│     ├── brand_capture: competitor brand terms                           │
│     ├── variant_or_size: size 8, wide width, black shoe                 │
│     └── other: sin match específico                                     │
│                                                                         │
│  4. CAPABILITY SCORING (0-1 scale)                                      │
│     ├── Base: 0.5                                                       │
│     ├── Boosters: recovery (+0.55), comfort (+0.2), nurses (+0.25)      │
│     ├── Penalties: running shoes (-0.6), basketball (-0.55)             │
│     └── Competitor brand detection → score reduction                    │
│                                                                         │
│  5. OPPORTUNITY SCORING                                                 │
│     └── opportunityScore = volume × cpc × intentWeight × capability     │
│                                                                         │
│  6. 3-TIER CLASSIFICATION (thresholds configurables por vertical)       │
│     ├── ✅ PASS: capability ≥ pass_threshold (Top Opportunities)        │
│     │   └── Si outside_fence: status=PASS + flag ["outside_fence"]      │
│     ├── ⚠️ REVIEW: capability entre review y pass threshold             │
│     └── 💤 OUT_OF_PLAY: capability < review_threshold OR competitor OR size │
│                                                                         │
│  7. OUTPUT: Keywords ordenados por opportunity score dentro de tier     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes Detallados

### 1. Intent Classification

**Archivo:** `server/keyword-gap-lite.ts` → `classifyIntent()`

```typescript
type IntentType = 
  | "category_capture"    // sandals, slides, clogs, recovery shoes
  | "problem_solution"    // plantar fasciitis, nurses, doctors, comfort
  | "product_generic"     // shoes, sneakers, footwear
  | "brand_capture"       // competitor brand terms (hoka, nike, etc.)
  | "variant_or_size"     // size 8, wide width, black shoe
  | "other";              // no specific match

// Intent Weights para opportunity scoring
const INTENT_WEIGHTS = {
  category_capture: 1.0,   // Máxima prioridad
  problem_solution: 1.0,   // Máxima prioridad
  product_generic: 0.7,    // Alta prioridad
  brand_capture: 0.2,      // Baja (son marcas competidoras)
  variant_or_size: 0.0,    // Cero (no targetear)
  other: 0.1               // Mínima
};
```

---

### 2. Capability Scoring

**Archivo:** `server/keyword-gap-lite.ts` → `computeCapabilityScore()`

```typescript
function computeCapabilityScore(keyword: string, config: Configuration): number {
  let score = 0.5; // Base score
  
  // BOOSTERS (incrementan capability)
  if (/\b(recovery|recover|post.?workout)\b/i.test(kw)) score += 0.55;
  if (/\b(sandals?|slides?|flip.?flops?|clogs?)\b/i.test(kw)) score += 0.25;
  if (/\b(plantar fasciitis|arch support|foot pain)\b/i.test(kw)) score += 0.40;
  if (/\b(comfort|comfortable|cushion|soft)\b/i.test(kw)) score += 0.20;
  if (/\b(nurses?|nursing|doctors?|healthcare)\b/i.test(kw)) score += 0.25;
  if (/\b(orthopedic|ortho|supportive|therapeutic)\b/i.test(kw)) score += 0.30;
  
  // PENALTIES (reducen capability)
  if (/\b(running shoes?|hiking boots?|marathon)\b/i.test(kw)) score -= 0.60;
  if (/\b(basketball|soccer|football|tennis|golf)\b/i.test(kw)) score -= 0.55;
  if (/\b(steel toe|work boots?|safety shoes?)\b/i.test(kw)) score -= 0.45;
  if (/\b(dress shoes?|heels|formal|loafers?)\b/i.test(kw)) score -= 0.45;
  
  // Competitor brand penalty
  if (isCompetitorBrand(kw, config)) score -= 0.60;
  
  return Math.max(0, Math.min(1, score)); // Clamp 0-1
}
```

---

### 3. Competitor Brand Detection

**Archivo:** `server/keyword-gap-lite.ts` → `getCompetitorBrandTerms()`

```typescript
function getCompetitorBrandTerms(config: Configuration): string[] {
  const terms = [];
  
  // Stop words que NO deben flaggearse como marcas
  const stopWords = new Set([
    "new", "on", "the", "inc", "llc", "co", "company", "corp",
    "shoes", "sandals", "footwear", "best", "top", "good", "great"
  ]);
  
  // Extraer de UCR competitors
  for (const comp of config.competitors?.competitors || []) {
    const name = comp.name?.toLowerCase().trim();
    if (name && name.length > 3 && !stopWords.has(name)) {
      terms.push(name);
      // Extraer partes significativas (ej: "kane" de "Kane Footwear")
      for (const part of name.split(/[\s\-\_]+/)) {
        if (part.length > 2 && !stopWords.has(part)) {
          terms.push(part);
        }
      }
    }
  }
  
  // Common footwear brands
  const commonBrands = [
    "hoka", "birkenstock", "crocs", "brooks", "asics", "new balance",
    "nike", "adidas", "saucony", "vionic", "orthofeet", "propet",
    "alegria", "dansko", "merrell", "keen", "teva", "chaco", "altra",
    "skechers", "clarks", "ecco", "sperry", "ugg", "reef", "kane"
  ];
  
  return [...new Set([...terms, ...commonBrands])];
}
```

---

### 4. Opportunity Score Calculation

```typescript
function computeOpportunityScore(
  searchVolume: number,
  cpc: number | undefined,
  intentType: IntentType,
  capabilityScore: number
): number {
  const volume = searchVolume || 0;
  const cpcValue = cpc || 1;
  const intentWeight = INTENT_WEIGHTS[intentType];
  
  // Fórmula: volume × cpc × intentWeight × capability
  return volume * cpcValue * intentWeight * capabilityScore;
}

// Ejemplo:
// "best footwear for nurses" 
//   → volume: 33,100 × cpc: 2.26 × intent: 1.0 × capability: 0.75
//   → opportunity: 56,104 ⭐ TOP OPPORTUNITY
```

---

### 5. 3-Tier Classification (v3.1)

```typescript
function evaluateKeyword(keyword: string, config: Configuration): {
  status: "pass" | "review" | "out_of_play";
  statusIcon: string;
  capabilityScore: number;
  opportunityScore: number;
  reason: string;
  flags: string[];
  confidence: "high" | "medium" | "low";
} {
  // Thresholds configurables por vertical preset
  const passThreshold = config.scoring_config?.pass_threshold ?? 0.60;
  const reviewThreshold = config.scoring_config?.review_threshold ?? 0.30;
  
  const { intentType, flags } = classifyIntent(keyword, config);
  const capabilityScore = computeCapabilityScore(keyword, config);
  const fenceResult = checkFence(keyword, config);
  
  // SPEC 3.1: Fence solo flaggea, capability manda
  const resultFlags = [...flags];
  if (!fenceResult.inFence) {
    resultFlags.push("outside_fence");
  }
  
  // OUT_OF_PLAY: Competitor brands (siempre)
  if (resultFlags.includes("competitor_brand")) {
    return { status: "out_of_play", reason: "Competitor brand term", flags: resultFlags };
  }
  
  // OUT_OF_PLAY: Size/variant queries (siempre)
  if (intentType === "variant_or_size") {
    return { status: "out_of_play", reason: "Size/variant query", flags: resultFlags };
  }
  
  // OUT_OF_PLAY: Very low capability
  if (capabilityScore < reviewThreshold) {
    return { status: "out_of_play", reason: "Low capability fit", flags: resultFlags };
  }
  
  // REVIEW: Medium capability
  if (capabilityScore < passThreshold) {
    const reason = fenceResult.inFence ? "Medium capability" : "Medium capability — outside fence";
    return { status: "review", reason, flags: resultFlags };
  }
  
  // PASS: High capability (incluso si outside_fence)
  const reason = resultFlags.includes("outside_fence") 
    ? "Strong capability fit — verify category alignment"
    : "Strong category fit";
  return { status: "pass", reason, flags: resultFlags };
}
```

---

## Estructura de Output (v3)

```typescript
interface KeywordGapLiteResult {
  brandDomain: string;
  competitors: string[];
  totalGapKeywords: number;
  
  // 3 TIERS (mutuamente excluyentes)
  topOpportunities: KeywordResult[];  // status = "pass"
  needsReview: KeywordResult[];       // status = "review"
  outOfPlay: KeywordResult[];         // status = "out_of_play"
  
  // Agrupación por theme (solo topOpportunities)
  grouped: Record<string, KeywordResult[]>;
  
  stats: {
    passed: number;
    review: number;
    outOfPlay: number;
    percentPassed: number;      // ~3%
    percentReview: number;      // ~24%
    percentOutOfPlay: number;   // ~74%
  };
  
  filtersApplied: {
    excludedCategories: number;
    excludedKeywords: number;
    excludedUseCases: number;
    competitorBrandTerms: number;  // Nuevos
    variantTerms: number;          // Nuevos
    totalFilters: number;
  };
  
  contextVersion: number;
  configurationName: string;
}

interface KeywordResult {
  keyword: string;
  normalizedKeyword: string;
  status: "pass" | "review" | "out_of_play";
  statusIcon: "✅" | "⚠️" | "💤";
  intentType: IntentType;
  capabilityScore: number;      // 0-1 scale
  opportunityScore: number;     // volume × cpc × intent × capability × difficultyFactor × positionFactor
  reason: string;
  flags: string[];              // ["competitor_brand", "size_variant", "outside_fence", etc.]
  confidence: "high" | "medium" | "low";  // Proximity to threshold
  competitorsSeen: string[];
  searchVolume?: number;
  cpc?: number;
  keywordDifficulty?: number;   // 0-100 scale (Ahrefs KD)
  competitorPosition?: number;
  theme: string;
}
```

---

## UI: 3-Tab Layout (v3.1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 Keyword Gap Lite Results                                                │
│  oofos.com vs 2 competitors - 269 keywords analyzed                        │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ Executive Summary                                                 │      │
│  │ Est. Missing Value: $45,230/mo | Top Theme: Recovery Footwear     │      │
│  │ Competitor Ownership: Hoka 34% | Brooks 28% | Birkenstock 22%     │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                             │
│  [23% Pass (62)] [52% Review (140)] [25% Out (67)]                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Top Opportunities] [Needs Review] [Out of Play]                           │
│  ───────────────────────────────────────────────                            │
│                                                                             │
│  ✅ TOP OPPORTUNITIES (62)                                                  │
│  High-capability keywords aligned with your category.                       │
│                                                                             │
│  Keyword                  | Reason          | Conf | KD | Vol  | Score     │
│  ────────────────────────────────────────────────────────────────────────  │
│  recovery shoes          ⚠️| Strong fit      | High | 24 |14.8K| 153,247   │
│  best footwear for nurses | Strong fit      | High | 32 |33.1K| 56,104    │
│  clogs women         [Fence]| Strong fit-fence| Med  | 18 | 2.4K| 12,340   │
│  plantar fasciitis sandals| Strong fit      | High | 45 | 8.2K| 28,567    │
│                                                                             │
│  [Fence] = Badge ambar con tooltip "Outside category scope"                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Columnas de la Tabla (v3.1)

| Columna | Descripción |
|---------|-------------|
| **Keyword** | Término + badge "Fence" si `outside_fence` flag presente |
| **Reason** | Justificación del status (Strong fit, Medium capability, etc.) |
| **Conf** | Confidence level (High/Med/Low) basado en proximity a threshold |
| **KD** | Keyword Difficulty (0-100) - solo disponible con Ahrefs |
| **Vol** | Search Volume mensual |
| **Score** | Opportunity Score (volumen × cpc × intent × capability × factors) |

---

## Comparación: v2 vs v3 vs v3.1

| Aspecto | v2 | v3 | v3.1 (Actual) |
|---------|-----|-----|---------------|
| Status posibles | pass, warn | pass, review, out_of_play | pass, review, out_of_play |
| Scoring | Solo search volume | opportunityScore básico | opportunityScore + difficulty + position factors |
| Intent | No | 6 tipos con weights | 6 tipos con weights |
| Capability | No | 0-1 fijo | 0-1 configurable por vertical |
| Thresholds | N/A | Fijos (0.30, 0.60) | Configurables por preset |
| Brand detection | Básico | Avanzado con stopwords | + extraído de UCR competitors |
| Fence handling | N/A | Fence determina status | Fence solo flaggea, capability manda |
| Confidence | No | No | high/medium/low por keyword |
| Vertical presets | No | No | DTC footwear, retail, B2B SaaS |
| UI | Accordion | 3 tabs | 3 tabs + Executive Summary + Fence badge |
| Columnas tabla | Keyword, Vol, Score | + Intent, Capability | + Reason, Confidence, KD |

---

## Flujo de Decisión por Keyword

```
keyword: "kane recovery sandals"
    │
    ├── Intent Classification
    │   └── Detecta "kane" → competitor brand flag
    │
    ├── ¿Es marca competidora?
    │   └── SÍ → status: "out_of_play" 💤 + reason: "Competitor brand term"
    │
    └── FIN (no evalúa capability)

keyword: "best footwear for nurses"
    │
    ├── Intent Classification
    │   └── Detecta "nurses" → problem_solution (weight: 1.0)
    │
    ├── ¿Es marca competidora?
    │   └── NO → continuar
    │
    ├── Capability Scoring
    │   ├── Base: 0.50
    │   ├── "nurses" boost: +0.25
    │   └── Total: 0.75 (75%)
    │
    ├── Opportunity Score
    │   └── 33,100 × 2.26 × 1.0 × 0.75 = 56,104
    │
    ├── ¿Capability ≥ 0.60?
    │   └── SÍ (0.75) → status: "pass" ✅
    │
    └── Clasificar en theme: "Brand" (por demand definition match)
```

---

## API Endpoints

```
POST /api/keyword-gap-lite/run
├── Body: { 
│     configurationId: number,
│     provider?: "dataforseo" | "ahrefs",  // default: "dataforseo"
│     location?: string,                    // default: "us"
│     language?: string,                    // default: "en"
│     limit?: number                        // default: 200
│   }
├── Process: computeKeywordGap(config, provider)
└── Response: KeywordGapLiteResult (3-tier structure)

GET /api/keyword-gap-lite/cache
└── Response: { size: number, keys: string[] }

DELETE /api/keyword-gap-lite/cache
└── Response: { message: "Cache cleared" }

GET /api/keyword-gap/status
└── Response: { configured: boolean, providers: { dataforseo: boolean, ahrefs: boolean } }
```

---

## Consideraciones para Demo

1. **3 Tabs claros** - Top Opportunities, Needs Review, Out of Play
2. **Percentages visibles** - Stats badges muestran distribución (3%/24%/74%)
3. **Opportunity Score** - Priorización inteligente basada en volume × cpc × intent × capability
4. **Competitor brands filtrados** - Lowes, Menards, Amazon, Walmart, etc. van a Out of Play automáticamente
5. **Sin falsos positivos** - Variant regex preciso, stopwords para brand detection
6. **Collapsible Out of Play** - Accordion para no abrumar con keywords filtrados
7. **Multi-Provider** - Selector para cambiar entre DataForSEO y Ahrefs

---

## Environment Variables

```bash
# DataForSEO
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password

# Ahrefs
AHREFS_API_KEY=your_api_key
```

---

## Ejemplo de Uso con Ahrefs

```typescript
// Request
POST /api/keyword-gap-lite/run
{
  "configurationId": 8,
  "provider": "ahrefs",
  "location": "us",
  "limit": 50
}

// Response
{
  "brandDomain": "homedepot.com",
  "competitors": ["lowes.com", "menards.com", "acehardware.com", "amazon.com", "walmart.com"],
  "totalGapKeywords": 88,
  "topOpportunities": [...],
  "needsReview": [...],       // 33 keywords
  "outOfPlay": [...],         // 55 keywords (competitor brands)
  "stats": {
    "passed": 0,
    "review": 33,
    "outOfPlay": 55,
    "percentPassed": 0,
    "percentReview": 38,
    "percentOutOfPlay": 63
  },
  "filtersApplied": {
    "competitorBrandTerms": 55  // walmart, lowes, amazon, etc.
  }
}
```

---

## CMO-Safe Gate Order (v3.2)

El sistema evalúa keywords siguiendo un orden estricto de gates para garantizar auditoría completa y decisiones explicables.

### Gate Evaluation Order

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        CMO-SAFE GATE ORDER                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   GATE G (Negative Scope) ─► HARD GATE                                     │
│   │  ├── Excluded keywords → OUT_OF_PLAY (immediate return)               │
│   │  ├── Excluded categories → OUT_OF_PLAY (immediate return)             │
│   │  └── Competitor brands → OUT_OF_PLAY (immediate return)               │
│   │                                                                        │
│   ▼                                                                        │
│   GATE B (Category Fence) ─► SOFT GATE                                     │
│   │  ├── Inside fence → continue (no flag)                                │
│   │  └── Outside fence → continue + add "outside_fence" flag              │
│   │                                                                        │
│   ▼                                                                        │
│   GATE H (Scoring) ─► CLASSIFICATION                                       │
│   │  ├── capabilityScore >= pass_threshold → PASS                         │
│   │  ├── capabilityScore >= review_threshold → REVIEW                     │
│   │  └── capabilityScore < review_threshold → OUT_OF_PLAY                 │
│   │                                                                        │
│   ▼                                                                        │
│   GATE E/F (Strategic/Channel) ─► PRIORITIZATION                           │
│      ├── Goal alignment → boost opportunityScore                          │
│      └── Channel fit → adjust ranking                                     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Gate Types

| Gate | UCR Section | Type | Behavior |
|------|-------------|------|----------|
| G | Negative Scope | Hard | Immediate OUT_OF_PLAY, stops evaluation |
| B | Category Fence | Soft | Adds flag, evaluation continues |
| H | Governance/Scoring | Classification | Determines PASS/REVIEW/OUT_OF_PLAY |
| E/F | Strategic/Channel | Prioritization | Adjusts opportunity ranking |

### Implementation

```typescript
function evaluateKeyword(keyword: KeywordData, ucr: Configuration): KeywordResult {
  const trace: ItemTrace[] = [];
  
  // GATE G - Negative Scope (HARD GATE - early return)
  if (isNegativeExclusion(keyword, ucr)) {
    trace.push({
      ruleId: "G_NEGATIVE_EXCLUSION",
      ucrSection: "G",
      reason: "Keyword matches negative scope exclusion",
      severity: "critical",
      evidence: matchedExclusion
    });
    return { disposition: "OUT_OF_PLAY", trace };
  }
  
  // GATE B - Category Fence (SOFT GATE - flag only)
  const fenceResult = checkCategoryFence(keyword, ucr);
  if (!fenceResult.inFence) {
    trace.push({
      ruleId: "B_OUTSIDE_FENCE",
      ucrSection: "B",
      reason: "Keyword outside category fence",
      severity: "medium"
    });
    flags.push("outside_fence");
  }
  
  // GATE H - Scoring (determines disposition)
  const { capabilityScore, opportunityScore } = computeScores(keyword, ucr);
  const disposition = classifyByCapability(capabilityScore, thresholds);
  
  // GATE E/F - Strategic prioritization
  const priorityBoost = computeStrategicFit(keyword, ucr);
  
  return { disposition, trace, opportunityScore: opportunityScore * priorityBoost };
}
```

---

## Item-Level Traces (v3.2)

Cada keyword procesado incluye un array de trazas que documentan cada gate evaluado.

### ItemTrace Structure

```typescript
interface ItemTrace {
  ruleId: string;        // Identificador único del gate/regla
  ucrSection: UCRSectionID;  // A-H, sección del UCR que activó
  reason: string;        // Explicación human-readable
  severity: Severity;    // critical | high | medium | low
  evidence?: string;     // Datos específicos (ej: "matched: walmart")
}
```

### Trace Examples

**OUT_OF_PLAY por Competitor Brand:**
```json
{
  "keyword": "walmart home improvement",
  "disposition": "OUT_OF_PLAY",
  "trace": [
    {
      "ruleId": "G_COMPETITOR_BRAND",
      "ucrSection": "G",
      "reason": "Contains competitor brand term",
      "severity": "critical",
      "evidence": "matched: walmart"
    }
  ]
}
```

**PASS con Outside Fence Flag:**
```json
{
  "keyword": "orthopedic sandals",
  "disposition": "PASS",
  "trace": [
    {
      "ruleId": "B_OUTSIDE_FENCE",
      "ucrSection": "B",
      "reason": "Keyword outside category fence",
      "severity": "medium"
    },
    {
      "ruleId": "H_CAPABILITY_PASS",
      "ucrSection": "H",
      "reason": "Capability score 0.78 exceeds pass threshold 0.55",
      "severity": "low"
    }
  ]
}
```

### Severity Levels

| Severity | Color | Meaning |
|----------|-------|---------|
| critical | Red | Blocking issue, immediate exclusion |
| high | Orange | Significant concern, likely exclusion |
| medium | Amber | Moderate flag, may affect classification |
| low | Gray | Informational, no impact on disposition |

### UI Display

Las trazas se muestran en filas expandibles en las tablas de keywords:

```
┌──────────────────────────────────────────────────────────────┐
│ Keyword          │ Intent   │ Volume │ Capability │ ▶ Trace │
├──────────────────────────────────────────────────────────────┤
│ recovery sandals │ Solution │ 12,100 │ 85%        │ ▶       │
├──────────────────────────────────────────────────────────────┤
│ ▼ Gate Evaluation Trace:                                    │
│   [B] [medium] B_OUTSIDE_FENCE: Outside category fence      │
│   [H] [low] H_CAPABILITY_PASS: Score 0.85 > 0.55 threshold  │
└──────────────────────────────────────────────────────────────┘
```

---

## Changelog

### v3.2 (Enero 2026)

**CMO-Safe Gate Order:**
- Implementación estricta del orden de gates: G → B → H → E/F
- Gate G (Negative Scope) como hard gate con early return
- Gate B (Category Fence) como soft gate que solo añade flags
- Documentación completa del flujo de evaluación

**Item-Level Traces:**
- Cada keyword incluye array `trace` con evaluaciones de gate
- Estructura ItemTrace: ruleId, ucrSection, reason, severity, evidence
- UI expandible para ver trazas en tablas de keywords
- Severidades: critical, high, medium, low con colores distintivos

**Module Contract Consolidation:**
- Todas las definiciones consolidadas en `shared/module.contract.ts`
- `module-registry.ts` marcado como deprecated
- Tipos compartidos entre frontend y backend

### v3.1 (Enero 2026)

**Nuevas Funcionalidades:**
- **Configurable Capability Models**: Boosters y penalties definibles por UCR o vertical preset
- **Vertical Presets**: DTC footwear (0.55), retail big box (0.65), B2B SaaS (0.50)
- **Enhanced Opportunity Scoring**: Factores de difficulty y position en fórmula
- **Confidence Levels**: high/medium/low basado en proximity a thresholds
- **Executive Summary Card**: Missing value, top themes, competitor ownership

**SPEC 3.1 - Fence Override:**
- Capability score ahora determina status Pass/Review
- Fence check solo añade flag `outside_fence` sin afectar clasificación
- Keywords con alta capability pasan aunque estén fuera del fence
- UI muestra badge "Fence" en ámbar con tooltip explicativo

**UI Enhancements:**
- Columnas adicionales: Reason, Confidence, KD
- Badge "Fence" para keywords outside_fence
- Tooltip con contexto sobre keywords fuera del scope

**Case Study:**
- OOFOS: Mejora de 15% → 23% pass rate con SPEC 3.1
- 21 keywords promovidos de Review a Pass con `outside_fence` flag

### v3.0 (Diciembre 2025)

- Sistema de 3 tiers: pass, review, out_of_play
- Intent classification con 6 tipos y weights
- Capability scoring 0-1 con boosters/penalties
- Competitor brand detection con stopwords
- Multi-provider architecture (DataForSEO + Ahrefs)
