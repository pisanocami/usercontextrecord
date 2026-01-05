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
│  6. 3-TIER CLASSIFICATION                                               │
│     ├── ✅ PASS: capability ≥ 0.60 (Top Opportunities)                  │
│     ├── ⚠️ REVIEW: capability 0.30-0.60 (Needs Human Review)            │
│     └── 💤 OUT_OF_PLAY: capability < 0.30 OR competitor brand OR size   │
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

### 5. 3-Tier Classification

```typescript
function evaluateKeyword(keyword: string, config: Configuration): {
  status: "pass" | "review" | "out_of_play";
  statusIcon: string;
  capabilityScore: number;
  opportunityScore: number;
  reason: string;
  flags: string[];
} {
  const { intentType, flags } = classifyIntent(keyword, config);
  const capabilityScore = computeCapabilityScore(keyword, config);
  const opportunityScore = computeOpportunityScore(volume, cpc, intentType, capability);
  
  // OUT_OF_PLAY: Competitor brands
  if (flags.includes("competitor_brand")) {
    return { status: "out_of_play", reason: "Competitor brand term" };
  }
  
  // OUT_OF_PLAY: Size/variant queries
  if (intentType === "variant_or_size") {
    return { status: "out_of_play", reason: "Size/variant query" };
  }
  
  // OUT_OF_PLAY: Very low capability
  if (capabilityScore < 0.3) {
    return { status: "out_of_play", reason: "Low capability fit" };
  }
  
  // OUT_OF_PLAY: Negative scope exclusions
  if (matchesExclusions(keyword, config.negative_scope)) {
    return { status: "out_of_play", reason: "Excluded by guardrails" };
  }
  
  // REVIEW: Medium capability (borderline)
  if (capabilityScore < 0.6) {
    return { status: "review", reason: "Medium capability" };
  }
  
  // PASS: High capability
  return { status: "pass", reason: "Strong category fit" };
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
  opportunityScore: number;     // volume × cpc × intent × capability
  reason: string;
  flags: string[];              // ["competitor_brand", "size_variant", etc.]
  competitorsSeen: string[];
  searchVolume?: number;
  cpc?: number;
  competitorPosition?: number;
  theme: string;
}
```

---

## UI: 3-Tab Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Keyword Gap Lite Results                                    │
│  oofos.com vs 2 competitors - 400 keywords analyzed             │
│                                                                 │
│  [3% Pass (10)] [24% Review (95)] [74% Out (295)]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Top Opportunities] [Needs Review] [Out of Play]               │
│  ─────────────────────────────────────────────────              │
│                                                                 │
│  ✅ TOP OPPORTUNITIES (10)                                      │
│  High-capability keywords aligned with your category.           │
│                                                                 │
│  Keyword                    | Intent          | Vol   | Score   │
│  ──────────────────────────────────────────────────────────────│
│  best footwear for nurses   | problem_solution| 33.1K | 56,104  │
│  best doctors shoes         | problem_solution| 720   | 1,533   │
│  best healthcare shoes      | problem_solution| 590   | 1,234   │
│  eva material shoes         | product_generic | 390   | 230     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Comparación: v2 vs v3

| Aspecto | v2 (Anterior) | v3 (Actual) |
|---------|---------------|-------------|
| Status posibles | pass, warn | pass, review, out_of_play |
| Scoring | Solo search volume | opportunityScore completo |
| Intent | No | 6 tipos con weights |
| Capability | No | 0-1 scale con boosters/penalties |
| Brand detection | Básico | Avanzado con stopwords |
| Variant detection | Muy amplio (falsos positivos) | Preciso (size X, wide width) |
| UI | Accordion por theme | 3 tabs (Pass/Review/Out) |
| Stats | passed/blocked | passed/review/outOfPlay con % |

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
