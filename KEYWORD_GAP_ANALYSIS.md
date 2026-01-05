# Keyword Gap Analysis - Technical Documentation

## Overview

El sistema de Keyword Gap Analysis identifica oportunidades de keywords donde los competidores rankean pero la marca no. Utiliza DataForSEO para obtener datos reales de ranking y aplica guardrails del UCR para clasificar resultados.

**Principio clave:** El sistema NUNCA bloquea keywords. Solo clasifica con status `pass` o `warn` para permitir revisión humana.

---

## Arquitectura del Flujo (NUEVA)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KEYWORD GAP LITE FLOW v2                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. INPUT: Configuration (UCR)                                          │
│     ├── brand.domain → "oofos.com"                                      │
│     ├── competitors.direct → ["hoka.com", "brooks.com", ...]            │
│     └── negative_scope → exclusiones (solo para warnings)               │
│                                                                         │
│  2. DATA FETCH: DataForSEO API                                          │
│     └── POST /dataforseo_labs/google/domain_intersection/live           │
│         ├── target1: brand domain                                       │
│         ├── target2: competitor domain                                  │
│         └── intersection_mode: "only_target2_keywords"                  │
│         → Retorna keywords donde SOLO el competidor rankea              │
│                                                                         │
│  3. GUARDRAIL EVALUATION (por cada keyword) - SOLO WARN, NO BLOCK       │
│     ├── checkExclusions() → ¿Matchea negative_scope? → warn             │
│     └── fenceCheck() → ¿Fuera del category fence? → warn                │
│                                                                         │
│  4. THEME ASSIGNMENT                                                    │
│     └── Brand | Category | Problem/Solution | Product | Other           │
│                                                                         │
│  5. SORTING: Por search volume (mayor a menor)                          │
│                                                                         │
│  6. OUTPUT: Todos los keywords con status + search volume               │
│     ├── ✅ pass: Dentro del fence, sin exclusiones                      │
│     └── ⚠️ warn: Fuera del fence O matchea exclusión (requiere review)  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes Detallados

### 1. Fuente de Datos: DataForSEO (NUEVO)

**Archivo:** `server/dataforseo.ts`

**API Endpoint:** `/dataforseo_labs/google/domain_intersection/live`

**Parámetros:**
```typescript
{
  target1: "oofos.com",                    // Marca (brand)
  target2: "hoka.com",                     // Competidor
  language_name: "English",
  location_code: 2840,                     // USA
  intersections: {
    included_keywords: false,              // Excluir overlap
    excluded_keywords: true,               // Solo keywords del competidor
  },
  // O usar:
  intersection_mode: "only_target2_keywords",
  limit: 200
}
```

**Response por keyword:**
```typescript
{
  keyword: "recovery sandals for runners",
  search_volume: 8100,
  target2_position: 5,                     // Ranking del competidor
  target1_position: null,                  // Marca no rankea (gap real)
  cpc: 1.45,
  competition: 0.72
}
```

**MEJORA:** Ahora obtenemos keywords donde la marca NO rankea pero el competidor SÍ (gap analysis real).

---

### 2. Sistema de Guardrails (NUEVO - Solo Warn)

**Archivo:** `server/keyword-gap-lite.ts`

**Principio:** El sistema NUNCA bloquea. Solo clasifica como `pass` o `warn`.

#### 2.1 Exclusion Check (`checkExclusions`) - WARN ONLY

```typescript
function checkExclusions(keyword: string, exclusions: string[]): { 
  hasMatch: boolean; 
  reason: string 
} {
  const normalizedKw = normalizeKeyword(keyword);
  
  for (const exclusion of exclusions) {
    // Word boundary matching (más preciso)
    const regex = new RegExp(`\\b${escapeRegex(exclusion)}\\b`, 'i');
    
    if (regex.test(normalizedKw)) {
      return { 
        hasMatch: true, 
        reason: `Matches exclusion: "${exclusion}"` 
      };
    }
  }
  
  return { hasMatch: false, reason: "" };
}

// Resultado: Si hasMatch = true → status = "warn" (NO "block")
```

#### 2.2 Fence Check (`fenceCheck`) - WARN ONLY

```typescript
function fenceCheck(keyword: string, inScopeConcepts: string[]): {
  inFence: boolean;
  reason: string;
} {
  const normalizedKw = normalizeKeyword(keyword);
  
  for (const concept of inScopeConcepts) {
    if (hasSemanticMatch(normalizedKw, concept)) {
      return { inFence: true, reason: `Matches: "${concept}"` };
    }
  }
  
  // NUEVO: Ya no bloqueamos, solo advertimos
  return { 
    inFence: false, 
    reason: "Outside category fence - needs review" 
  };
}

// Resultado: Si inFence = false → status = "warn" (NO "block")
```

#### 2.3 Evaluación Final

```typescript
function evaluateKeyword(keyword: string, config: Configuration): KeywordEvaluation {
  // 1. Check exclusions
  const exclusionCheck = checkExclusions(keyword, getAllExclusions(config));
  
  // 2. Check fence
  const fenceCheck = fenceCheck(keyword, getInScopeConcepts(config));
  
  // 3. Determinar status (NUNCA block)
  if (exclusionCheck.hasMatch) {
    return { 
      status: "warn", 
      statusIcon: "⚠️", 
      reason: exclusionCheck.reason 
    };
  }
  
  if (!fenceCheck.inFence) {
    return { 
      status: "warn", 
      statusIcon: "⚠️", 
      reason: fenceCheck.reason 
    };
  }
  
  return { 
    status: "pass", 
    statusIcon: "✅", 
    reason: fenceCheck.reason 
  };
}
```

---

### 3. Search Volume y Sorting (NUEVO)

```typescript
interface KeywordResult {
  keyword: string;
  searchVolume: number;          // ✅ Ahora incluido
  competitorPosition: number;    // ✅ Ranking del competidor
  status: "pass" | "warn";       // Solo 2 estados
  statusIcon: string;
  reason: string;
  competitorsSeen: string[];
  theme: string;
}

// Sorting: Por search volume descendente
results.sort((a, b) => {
  // Primero pass, luego warn
  if (a.status !== b.status) {
    return a.status === "pass" ? -1 : 1;
  }
  // Luego por search volume
  return (b.searchVolume || 0) - (a.searchVolume || 0);
});
```

---

### 4. Theme Assignment

```typescript
const themes = [
  { name: "Brand", terms: brand_keywords.seed_terms },
  { name: "Category", terms: category_terms },
  { name: "Problem/Solution", terms: problem_terms },
  { name: "Product", terms: category_definition.included },
];

// Si ningún theme matchea → "Other"
// "Other" NO es malo - solo significa que necesita clasificación manual
```

---

## Estructura de Output (NUEVA)

```typescript
interface KeywordGapResult {
  brandDomain: string;
  competitors: string[];
  totalGapKeywords: number;
  
  results: KeywordResult[];              // Todos los keywords
  grouped: Record<string, KeywordResult[]>;  // Por theme
  needsReview: KeywordResult[];          // Solo los "warn"
  
  stats: {
    passed: number;
    needsReview: number;                 // Antes era "blocked"
  };
  
  filtersApplied: {
    excludedCategories: number;
    excludedKeywords: number;
    excludedUseCases: number;
    totalFilters: number;
  };
}

interface KeywordResult {
  keyword: string;
  normalizedKeyword: string;
  searchVolume: number;                  // ✅ NUEVO
  competitorPosition: number;            // ✅ NUEVO
  status: "pass" | "warn";               // Solo 2 estados (no "block")
  statusIcon: "✅" | "⚠️";
  reason: string;
  competitorsSeen: string[];
  theme: string;
}
```

---

## Comparación: Antes vs Después

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| Data Source | `ranked_keywords/live` (solo donde marca rankea) | `domain_intersection/live` (gap real) |
| Status posibles | pass, warn, block | pass, warn (NO block) |
| Exclusion fail | Block ⛔ | Warn ⚠️ |
| Fence fail | Block ⛔ | Warn ⚠️ |
| Search Volume | No incluido | ✅ Incluido |
| Sorting | Por # competidores | Por search volume |
| UCR incompleto | Bloquea casi todo | Warn para review humano |

---

## Flujo de Decisión por Keyword

```
keyword: "recovery sandals for plantar fasciitis"
    │
    ├── ¿Matchea exclusión? (excluded_keywords, excluded_categories, etc.)
    │   ├── SÍ → status: "warn" ⚠️ + reason: "Matches exclusion: X"
    │   └── NO → continuar
    │
    ├── ¿Dentro del category fence? (category_terms, problem_terms, etc.)
    │   ├── SÍ → status: "pass" ✅ + reason: "Matches: recovery"
    │   └── NO → status: "warn" ⚠️ + reason: "Outside fence - needs review"
    │
    └── Asignar theme → "Problem/Solution"
```

---

## API Endpoints

```
POST /api/keyword-gap-lite/run
├── Body: { configurationId: number }
├── Process: computeKeywordGap(config, dataforseoClient)
└── Response: KeywordGapResult

GET /api/keyword-gap-lite/cache
└── Response: { size: number, keys: string[] }

DELETE /api/keyword-gap-lite/cache
└── Response: { message: "Cache cleared" }
```

---

## Consideraciones para Demo

1. **Sin bloqueos duros** - Todo keyword aparece, algunos con ⚠️ para review
2. **Search volume visible** - Priorización clara por oportunidad
3. **Posición del competidor** - Ver qué tan bien rankean
4. **Themes** - Agrupación lógica para análisis
5. **Needs Review** - Sección separada para keywords ambiguos
