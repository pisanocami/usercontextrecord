# Keyword Gap Analysis - Technical Documentation

## Overview

El sistema de Keyword Gap Analysis identifica oportunidades de keywords donde los competidores rankean pero la marca no. Utiliza DataForSEO para obtener datos reales de ranking y aplica guardrails del UCR para filtrar resultados.

---

## Arquitectura del Flujo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KEYWORD GAP LITE FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. INPUT: Configuration (UCR)                                          │
│     ├── brand.domain → "oofos.com"                                      │
│     ├── competitors.direct → ["hoka.com", "brooks.com", ...]            │
│     └── negative_scope → exclusiones                                    │
│                                                                         │
│  2. DATA FETCH: DataForSEO API                                          │
│     ├── GET ranked_keywords/live para brand domain                      │
│     └── GET ranked_keywords/live para cada competitor (paralelo)        │
│                                                                         │
│  3. GAP CALCULATION                                                     │
│     └── competitor_keywords - brand_keywords = gap_keywords             │
│                                                                         │
│  4. GUARDRAIL EVALUATION (por cada keyword)                             │
│     ├── applyExclusions() → ¿Bloqueado por negative_scope?              │
│     └── fenceCheck() → ¿Dentro del category fence?                      │
│                                                                         │
│  5. THEME ASSIGNMENT                                                    │
│     └── Brand | Category | Problem/Solution | Product | Other           │
│                                                                         │
│  6. OUTPUT: Top 30 passed + 10 borderline                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes Detallados

### 1. Fuente de Datos: DataForSEO

**Archivo:** `server/dataforseo.ts`

**API Endpoint:** `/dataforseo_labs/google/ranked_keywords/live`

**Parámetros:**
```typescript
{
  target: "oofos.com",           // Dominio a analizar
  language_name: "English",      // Idioma
  location_code: 2840,           // USA (código de país)
  limit: 200                     // Max keywords por dominio
}
```

**Response por keyword:**
```typescript
{
  keyword: "recovery sandals",
  search_volume: 12000,
  position: 3,                   // Ranking actual
  cpc: 1.25,
  competition: 0.65
}
```

**PROBLEMA ACTUAL:** Solo obtenemos keywords donde el dominio YA rankea. NO obtenemos keywords donde el dominio NO rankea (que es lo que queremos para gap analysis).

---

### 2. Cálculo del Gap

**Archivo:** `server/keyword-gap-lite.ts` → `computeKeywordGap()`

**Lógica actual:**
```typescript
// 1. Obtener keywords de la marca
brandKeywords = await getRankedKeywords(brandDomain);

// 2. Obtener keywords de cada competidor
competitorKeywords = await getRankedKeywords(competitorDomain);

// 3. Calcular gap: keywords del competidor que la marca NO tiene
gapKeywords = competitorKeywords.filter(kw => !brandKeywords.includes(kw));
```

**PROBLEMA:** El gap solo incluye keywords donde:
- El competidor rankea
- La marca NO aparece en top 100

Esto NO captura keywords donde la marca rankea bajo (posición 50+) vs competidor rankea alto (posición 1-10).

---

### 3. Sistema de Guardrails

**Archivo:** `server/keyword-gap-lite.ts`

#### 3.1 Exclusion Check (`applyExclusions`)

Bloquea keywords que contengan términos del negative_scope:

```typescript
const exclusions = [
  ...config.negative_scope.excluded_categories,    // ["running shoes", "athletic gear"]
  ...config.negative_scope.excluded_keywords,      // ["cheap", "fake"]
  ...config.negative_scope.excluded_use_cases,     // ["marathon", "hiking"]
  ...config.negative_scope.excluded_competitors    // ["nike"]
];

// Bloquea si el keyword contiene O está contenido en la exclusión
if (keyword.includes(exclusion) || exclusion.includes(keyword)) {
  return { blocked: true, reason: `Matches exclusion: "${exclusion}"` };
}
```

**PROBLEMA:** El matching es demasiado agresivo:
- `exclusion.includes(keyword)` puede bloquear falsamente
- No diferencia entre palabra completa vs substring
- "shoe" bloquearía "recovery shoe" si "shoe" está en exclusiones

#### 3.2 Fence Check (`fenceCheck`)

Verifica que el keyword esté dentro del "category fence":

```typescript
const inScopeConcepts = [
  ...config.category_definition.included,           // ["sandals", "slides"]
  config.category_definition.primary_category,      // "Recovery Footwear"
  ...config.category_definition.approved_categories // ["footwear", "wellness"]
];

const demandThemes = [
  ...config.demand_definition.brand_keywords.seed_terms,        // ["oofos", "oofoam"]
  ...config.demand_definition.non_brand_keywords.category_terms, // ["recovery", "comfort"]
  ...config.demand_definition.non_brand_keywords.problem_terms   // ["foot pain", "plantar fasciitis"]
];

// Token matching: busca overlap de tokens > 2 caracteres
for (const concept of allConcepts) {
  const conceptTokens = concept.split(" ");
  const keywordTokens = keyword.split(" ");
  
  const hasMatch = conceptTokens.some(token => 
    token.length > 2 && keywordTokens.some(kwToken => 
      kwToken.includes(token) || token.includes(kwToken)
    )
  );
  
  if (hasMatch) return { status: "pass" };
}

return { status: "block", reason: "Outside category fence" };
```

**PROBLEMA:** 
- Matching muy permisivo: "sandal" matchea "sandals" pero también "sandal bag"
- No considera relevancia semántica
- Keywords válidos pueden ser bloqueados si no contienen tokens exactos

---

### 4. Theme Assignment

Asigna cada keyword a un grupo temático:

```typescript
const themes = [
  { name: "Brand", terms: brand_keywords.seed_terms },      // "oofos", "oofoam"
  { name: "Category", terms: category_terms },              // "recovery sandals"
  { name: "Problem/Solution", terms: problem_terms },       // "foot pain relief"
  { name: "Product", terms: category_definition.included }, // "slides", "clogs"
];

// Si ningún theme matchea → "Other"
```

**PROBLEMA:** Muchos keywords terminan en "Other" porque el matching es estricto.

---

## Problemas Identificados

### P1: DataForSEO no da keywords donde la marca NO rankea

**Impacto:** Alto
**Descripción:** El API `ranked_keywords/live` solo retorna keywords donde el dominio tiene ranking. Para gap analysis real necesitamos `keyword_gap/live` de DataForSEO.

**Solución propuesta:**
```typescript
// Usar keyword gap endpoint directamente
POST /dataforseo_labs/google/domain_intersection/live
{
  "target1": "oofos.com",      // Marca
  "target2": "hoka.com",       // Competidor
  "intersection_mode": "only_in_target2"  // Keywords solo en competidor
}
```

### P2: Matching de exclusiones demasiado agresivo

**Impacto:** Medio
**Descripción:** Bloquea keywords válidos por substring matching.

**Solución propuesta:**
- Usar word boundary matching: `\b${exclusion}\b`
- Implementar fuzzy matching con threshold

### P3: Fence check depende de datos UCR incompletos

**Impacto:** Alto
**Descripción:** Si el UCR no tiene `category_terms` o `problem_terms` bien definidos, casi todo se bloquea.

**Solución propuesta:**
- Default `status: "warn"` en lugar de `status: "block"` para fence failures
- Usar AI para inferir relevancia si fence check es ambiguo

### P4: No hay volumen de búsqueda en output

**Impacto:** Medio
**Descripción:** Los keywords se ordenan por número de competidores que rankean, no por search volume.

**Solución propuesta:**
- Incluir `searchVolume` en el resultado
- Ordenar por `searchVolume * priority_multiplier`

---

## Flujo de API Endpoints

```
POST /api/keyword-gap-lite/run
├── Body: { configurationId: number }
├── Process: computeKeywordGap(config, dataforseoClient, options)
└── Response: KeywordGapResult

GET /api/keyword-gap-lite/cache
└── Response: { size: number, keys: string[] }

DELETE /api/keyword-gap-lite/cache
└── Response: { message: "Cache cleared" }
```

---

## Estructura de Output Actual

```typescript
interface KeywordGapResult {
  brandDomain: string;           // "oofos.com"
  competitors: string[];         // ["hoka.com", "brooks.com"]
  totalGapKeywords: number;      // Total antes de filtrar
  
  results: KeywordResult[];      // Top 30 que pasaron guardrails
  grouped: Record<string, KeywordResult[]>;  // Agrupados por theme
  borderline: KeywordResult[];   // Top 10 bloqueados (para review)
  
  stats: {
    passed: number;
    blocked: number;
  };
  
  filtersApplied: {
    excludedCategories: number;
    excludedKeywords: number;
    excludedUseCases: number;
    totalFilters: number;
  };
  
  contextVersion: number;
  configurationName: string;
}

interface KeywordResult {
  keyword: string;
  normalizedKeyword: string;
  status: "pass" | "warn" | "block";
  statusIcon: string;            // "✅" | "⚠️" | "⛔"
  reason: string;
  competitorsSeen: string[];     // Qué competidores rankean
  searchVolume?: number;         // ⚠️ Actualmente undefined
  theme: string;                 // Brand | Category | Problem/Solution | Product | Other
}
```

---

## Dónde Mejorar

| Área | Problema | Prioridad | Solución |
|------|----------|-----------|----------|
| Data Source | Solo keywords donde marca rankea | ALTA | Usar `domain_intersection/live` o `keyword_gap/live` |
| Exclusions | Substring matching muy agresivo | MEDIA | Word boundary regex |
| Fence Check | Bloquea todo si UCR incompleto | ALTA | Default a "warn" no "block" |
| Sorting | Sin search volume | MEDIA | Incluir y ordenar por volumen |
| Themes | Muchos "Other" | BAJA | Fallback a AI classification |
| Competitors | Hardcodeados del UCR | MEDIA | Validar que existan en DataForSEO |

---

## Próximos Pasos Sugeridos

1. **Migrar a `domain_intersection/live`** para obtener keywords reales de gap
2. **Cambiar fence check default** de "block" a "warn" 
3. **Agregar search volume** al sorting y display
4. **Implementar word boundary matching** para exclusiones
5. **Agregar fallback de AI** para keywords ambiguos
