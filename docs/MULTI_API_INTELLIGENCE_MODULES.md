# Guía: Módulos de Inteligencia Multi-API

## Visión General

Esta guía documenta cómo agregar las 5 combinaciones de APIs de inteligencia competitiva al stack de módulos existente. Cada combinación se implementa como un módulo independiente que sigue la arquitectura Context-First.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-API INTELLIGENCE ARCHITECTURE                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                         DATA SOURCES (APIs)                          │    │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │    │
│   │  │ SerpApi  │ │DataForSEO│ │ GA4 API  │ │ Meta Ads │ │Brandwatch│   │    │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                          │
│                                    ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                    ETL PIPELINE (Per Module)                         │    │
│   │  Extract → Transform → Correlate → Score → Disposition               │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                          │
│                                    ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                    UNIFIED OUTPUT SCHEMA                             │    │
│   │  DecisionObject │ OpportunityScorecard │ StrategyPlaybook            │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Índice

1. [Nuevas Data Sources](#1-nuevas-data-sources)
2. [Las 5 Combinaciones de Módulos](#2-las-5-combinaciones-de-módulos)
3. [Contratos de Módulo Detallados](#3-contratos-de-módulo-detallados)
4. [Schema del Dataset Maestro](#4-schema-del-dataset-maestro)
5. [Patrones ETL y Pipelines](#5-patrones-etl-y-pipelines)
6. [Políticas de Cache](#6-políticas-de-cache)
7. [Implementación Paso a Paso](#7-implementación-paso-a-paso)

---

## 1. Nuevas Data Sources

### Actualizar module.contract.ts

Primero, agregar las nuevas fuentes de datos al tipo `DataSource`:

```typescript
// shared/module.contract.ts

export type DataSource =
  | "DataForSEO"
  | "Ahrefs"
  | "GoogleTrends"
  | "SERPAPI"
  | "BrightData"
  | "OpenAI"
  | "Gemini"
  | "Internal"
  // Nuevas fuentes para Multi-API Intelligence
  | "MetaAdLibrary"      // Meta Ad Library API
  | "GoogleAds"          // Google Ads API
  | "GA4"                // Google Analytics 4 API
  | "Brandwatch"         // Social Listening
  | "ExplodingTopics"    // Trend Detection
  | "Northbeam"          // Attribution
  | "TripleWhale"        // Attribution (alternativa)
  | "Prophet"            // Forecasting Library
  | "KnowledgeGraph"     // Google Knowledge Graph
  | "InternalCRM"        // CRM Interno
  | "Other";
```

### Usando Tipos de Item Existentes (Recomendado)

Los módulos de inteligencia multi-API deben usar los tipos de item existentes en lugar de crear nuevos. El tipo `"entity"` es el más flexible para casos de uso personalizados.

**Patrón recomendado:** Usar `itemType: "entity"` con un campo `entityType` personalizado:

```typescript
// Usar el tipo existente "entity" con entityType personalizado
const result: EntityItemResult = {
  itemType: "entity",           // Usa el discriminador existente
  itemId: "sig_123",
  title: "recovery sandals",
  entityName: "recovery sandals",
  entityType: "trend_signal",   // Subtipo personalizado (campo string)
  mentions: 150,
  sentiment: "positive",
  confidence: "high",
  trace: []
};
```

**Tipos de item disponibles:**

| itemType | Interface | Cuándo usar |
|----------|-----------|-------------|
| `keyword` | `KeywordItemResult` | Resultados centrados en keywords con scores y disposición |
| `cluster` | `ClusterItemResult` | Categorías/temas con estacionalidad y métricas de timing |
| `serp` | `SerpItemResult` | Análisis de SERPs con features y conteos |
| `url` | `UrlItemResult` | Análisis de URLs y páginas |
| `entity` | `EntityItemResult` | **Catch-all para entidades personalizadas** |

**Para los 5 módulos de inteligencia, usar:**

| Módulo | itemType recomendado | entityType personalizado |
|--------|---------------------|--------------------------|
| `intel.serp_trends_social.v1` | `entity` | `"trend_signal"` |
| `intel.cross_channel_messaging.v1` | `entity` | `"messaging_insight"` |
| `intel.serp_attribution.v1` | `keyword` | N/A (usa KeywordItemResult) |
| `intel.demand_forecasting.v1` | `cluster` | N/A (usa ClusterItemResult) |
| `intel.intent_positioning.v1` | `entity` | `"positioning_opportunity"` |

> **⚠️ Advertencia:** No modificar directamente `ModuleItemType` en `module.contract.ts` a menos que también actualices: `server/module-result-adapters.ts`, las interfaces de resultado correspondientes, y los renderers del frontend. El patrón `entity` + `entityType` evita este overhead.

### Configuración de Credenciales

Crear interfaz para gestionar múltiples providers:

```typescript
// server/api-credentials.ts

export interface APICredentials {
  serpApi?: { apiKey: string };
  dataForSEO?: { login: string; password: string };
  metaAdLibrary?: { accessToken: string; appId: string };
  googleAds?: { clientId: string; clientSecret: string; refreshToken: string };
  ga4?: { serviceAccountJson: string; propertyId: string };
  brandwatch?: { apiKey: string; projectId: string };
  explodingTopics?: { apiKey: string };
}

export function getCredentials(): APICredentials {
  return {
    serpApi: process.env.SERP_API_KEY ? { apiKey: process.env.SERP_API_KEY } : undefined,
    dataForSEO: process.env.DATAFORSEO_LOGIN ? {
      login: process.env.DATAFORSEO_LOGIN,
      password: process.env.DATAFORSEO_PASSWORD!
    } : undefined,
    // ... otros providers
  };
}
```

---

## 2. Las 5 Combinaciones de Módulos

### Resumen de Módulos

| # | Module ID | Nombre | APIs | Pregunta Estratégica |
|---|-----------|--------|------|---------------------|
| 1 | `intel.serp_trends_social.v1` | SERP + Trends + Social | SerpApi, DataForSEO, Brandwatch | ¿Qué demanda está creciendo antes de que competidores optimicen? |
| 2 | `intel.cross_channel_messaging.v1` | SERP + Paid + Meta Ads | SerpApi, DataForSEO Paid, Meta Ad Library | ¿Qué mensajes funcionan cross-channel? |
| 3 | `intel.serp_attribution.v1` | SERP + Analytics + Attribution | SerpApi, GA4, Northbeam/TripleWhale | ¿Qué keywords generan valor real de negocio? |
| 4 | `intel.demand_forecasting.v1` | Trends + SERP + Forecasting | DataForSEO Trends, SerpApi, Prophet | ¿Cuándo y dónde actuar según predicción? |
| 5 | `intel.intent_positioning.v1` | Intent + SERP + Competitive | DataForSEO NLP, SerpApi, ExplodingTopics | ¿Dónde hay demanda de compra con competidor débil? |

### Mapeo UCR por Módulo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UCR SECTION USAGE PER MODULE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  UCR Section     │ Mod 1 │ Mod 2 │ Mod 3 │ Mod 4 │ Mod 5 │                  │
│  ────────────────┼───────┼───────┼───────┼───────┼───────┼                  │
│  A. Brand        │  REQ  │  REQ  │  REQ  │  REQ  │  REQ  │ Dominio, geo     │
│  B. Category     │  REQ  │  OPT  │  OPT  │  REQ  │  REQ  │ Fence check      │
│  C. Competitors  │  REQ  │  REQ  │  OPT  │  REQ  │  REQ  │ Benchmark        │
│  D. Demand       │  OPT  │  OPT  │  REQ  │  OPT  │  OPT  │ Theme mapping    │
│  E. Strategic    │  OPT  │  OPT  │  OPT  │  REQ  │  OPT  │ Risk tolerance   │
│  F. Channel      │  OPT  │  REQ  │  REQ  │  OPT  │  OPT  │ Channel weights  │
│  G. Negative     │  REQ  │  OPT  │  OPT  │  OPT  │  REQ  │ Exclusions       │
│  H. Governance   │  OPT  │  OPT  │  OPT  │  OPT  │  OPT  │ Thresholds       │
│                                                                              │
│  REQ = Required, OPT = Optional                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Contratos de Módulo Detallados

### 3.1 SERP + Trends + Social Intelligence

```typescript
// shared/module.contract.ts

export const SerpTrendsSocialContract: ModuleContract = {
  moduleId: "intel.serp_trends_social.v1",
  name: "SERP + Trends + Social Signals",
  category: "Competitive Intelligence",
  layer: "Signal",
  version: "1.0.0",

  description: 
    "Sincroniza señales de demanda con cambios en SERP y movimiento de marca en social. " +
    "Detecta olas de demanda antes de que competidores optimicen.",
  strategicQuestion: 
    "¿Qué tendencias de búsqueda están creciendo y cómo se correlacionan con cambios en SERP y sentimiento social?",

  dataSources: ["SERPAPI", "DataForSEO", "Brandwatch"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "low",
    inferenceType: "external"
  },

  caching: {
    cadence: "daily",
    ttlSeconds: 86400, // 24 horas
    bustOnChanges: ["competitor_set", "category_scope"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B", "C", "G"],
    optionalSections: ["D", "E", "F", "H"],
    sectionUsage: {
      A: "Dominio y geo para queries de tendencia",
      B: "Queries de categoría para monitorear",
      C: "Competidores para detectar entradas en SERP",
      D: "Mapeo de keywords a temas de demanda",
      E: "Ajusta umbrales de oportunidad",
      F: "Ponderación de canales",
      G: "Exclusiones de términos/categorías",
      H: "Configuración de scoring"
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      { name: "queries", type: "string[]", required: true, description: "Keywords a monitorear" },
      { name: "country", type: "string", required: false, default: "US" },
      { name: "timeRange", type: "string", required: false, default: "today 3-m" },
      { name: "socialTimeWindow", type: "string", required: false, default: "7d" }
    ]
  },

  disposition: {
    required: true,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "evidence", "severity"],
    runTraceFields: ["sectionsUsed", "sectionsMissing", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "trend_signal",
    visuals: [
      { kind: "line", title: "Trend vs SERP Correlation" },
      { kind: "heatmap", title: "Social Sentiment by Topic" },
      { kind: "table", title: "Emerging Opportunities" }
    ],
    summaryFields: ["trendingUp", "serpChanges", "socialBuzz", "recommendation"]
  },

  preflight: {
    entityChecks: [
      {
        checkType: "min_competitors",
        minCount: 1,
        ucrSection: "C",
        fieldPath: "competitors.competitors",
        description: "Se requiere al menos 1 competidor para detectar entradas en SERP",
        actionLabel: "Agregar Competidores",
        actionPath: "/configuration/:id/competitive-set"
      },
      {
        checkType: "min_category_terms",
        minCount: 3,
        ucrSection: "B",
        fieldPath: "category_definition.included_categories",
        description: "Se requieren términos de categoría para monitorear tendencias",
        actionLabel: "Definir Categorías",
        actionPath: "/configuration/:id/category-definition"
      }
    ]
  },

  guardrails: {
    neverPromiseRevenue: true,
    neverDumpRawEntitiesWithoutFraming: true,
    alwaysProvideNextStep: true
  }
};
```

### 3.2 Cross-Channel Messaging Intelligence

```typescript
export const CrossChannelMessagingContract: ModuleContract = {
  moduleId: "intel.cross_channel_messaging.v1",
  name: "SERP + Paid + Meta Messaging",
  category: "Competitive Intelligence",
  layer: "Signal",
  version: "1.0.0",

  description: 
    "Mapa multi-canal de mensajes que funcionan vs. los que no. " +
    "Compara copy orgánico, PPC y anuncios sociales para identificar patrones de éxito.",
  strategicQuestion: 
    "¿Qué mensajes y ofertas tienen validación cross-channel y dónde están los gaps?",

  dataSources: ["SERPAPI", "DataForSEO", "MetaAdLibrary", "GoogleAds"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "medium",
    inferenceType: "external"
  },

  caching: {
    cadence: "weekly",
    ttlSeconds: 604800, // 7 días
    bustOnChanges: ["competitor_set", "category_scope"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "C", "F"],
    optionalSections: ["B", "D", "E", "G", "H"],
    sectionUsage: {
      A: "Dominio para identificar propios ads",
      B: "Categorías para filtrar ads relevantes",
      C: "Competidores para análisis de messaging",
      D: "Mapeo de temas para clasificar copy",
      E: "Objetivos estratégicos para priorización",
      F: "Distribución de canales para weighting",
      G: "Exclusiones de mensajes/ofertas",
      H: "Umbrales de scoring"
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      { name: "keywords", type: "string[]", required: true, description: "Keywords para análisis de ads" },
      { name: "country", type: "string", required: false, default: "US" },
      { name: "adTypes", type: "string[]", required: false, default: ["search", "display", "social"] },
      { name: "lookbackDays", type: "number", required: false, default: 30 }
    ]
  },

  disposition: {
    required: true,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "evidence", "severity"],
    runTraceFields: ["sectionsUsed", "sectionsMissing", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "messaging_insight",
    visuals: [
      { kind: "matrix", title: "Message Validation Matrix" },
      { kind: "bar", title: "CPC by Message Theme" },
      { kind: "table", title: "Top Cross-Channel Messages" }
    ],
    summaryFields: ["validatedMessages", "gapOpportunities", "avgCPC", "recommendation"]
  },

  preflight: {
    entityChecks: [
      {
        checkType: "min_competitors",
        minCount: 2,
        ucrSection: "C",
        fieldPath: "competitors.competitors",
        description: "Se requieren competidores para comparar messaging",
        actionLabel: "Agregar Competidores",
        actionPath: "/configuration/:id/competitive-set"
      }
    ]
  },

  guardrails: {
    neverPromiseRevenue: true,
    neverDumpRawEntitiesWithoutFraming: true,
    alwaysProvideNextStep: true
  }
};
```

### 3.3 SERP + Attribution Intelligence

```typescript
export const SerpAttributionContract: ModuleContract = {
  moduleId: "intel.serp_attribution.v1",
  name: "SERP + Analytics + Attribution",
  category: "Business Intelligence",
  layer: "Synthesis",
  version: "1.0.0",

  description: 
    "Conecta ranking + keyword potencial con resultados de negocio reales. " +
    "Mide ROI por keyword para decisiones tácticas basadas en valor.",
  strategicQuestion: 
    "¿Qué keywords que estamos rankeando generan valor real de negocio?",

  dataSources: ["SERPAPI", "DataForSEO", "GA4", "Northbeam", "InternalCRM"],

  riskProfile: {
    confidence: "high",
    riskIfWrong: "high",
    inferenceType: "hybrid"
  },

  caching: {
    cadence: "daily",
    ttlSeconds: 86400,
    bustOnChanges: ["all"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED"],
    allowMissingOptionalSections: false,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "D", "F"],
    optionalSections: ["B", "C", "E", "G", "H"],
    sectionUsage: {
      A: "Dominio para matchear datos de analytics",
      B: "Categorías para segmentación",
      C: "Competidores para contexto de mercado",
      D: "Temas de demanda para agrupación de ROI",
      E: "Objetivos para priorización",
      F: "Canales para atribución cross-channel",
      G: "Exclusiones",
      H: "Umbrales de ROI mínimo"
    },
    gates: {
      fenceMode: "none",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      { name: "dateRange", type: "string", required: true, description: "Rango de fechas para analytics" },
      { name: "conversionGoals", type: "string[]", required: true, description: "Goals de GA4 a trackear" },
      { name: "attributionModel", type: "string", required: false, default: "data_driven" },
      { name: "minSessions", type: "number", required: false, default: 100 }
    ]
  },

  disposition: {
    required: true,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "evidence", "severity"],
    runTraceFields: ["sectionsUsed", "sectionsMissing", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "keyword_roi",
    visuals: [
      { kind: "bar", title: "ROI by Keyword Cluster" },
      { kind: "table", title: "Keyword Attribution Table" },
      { kind: "line", title: "Conversion Trend by Theme" }
    ],
    summaryFields: ["totalAttributedRevenue", "topROIKeywords", "lowVolumeHighValue", "recommendation"]
  },

  preflight: {
    entityChecks: [
      {
        checkType: "has_domain",
        ucrSection: "A",
        fieldPath: "brand.domain",
        description: "Dominio requerido para matchear con GA4",
        actionLabel: "Configurar Dominio",
        actionPath: "/configuration/:id/brand-context"
      }
    ]
  },

  guardrails: {
    neverPromiseRevenue: false, // Este módulo SÍ puede hablar de revenue (con datos reales)
    neverDumpRawEntitiesWithoutFraming: true,
    alwaysProvideNextStep: true
  }
};
```

### 3.4 Demand Forecasting Intelligence

```typescript
export const DemandForecastingContract: ModuleContract = {
  moduleId: "intel.demand_forecasting.v1",
  name: "Trends + SERP + Forecasting",
  category: "Market Intelligence",
  layer: "Synthesis",
  version: "1.0.0",

  description: 
    "Predicción inteligente de evolución de SERP + demanda antes de que ocurra. " +
    "Genera predicciones de picos, valles y momentum shifts.",
  strategicQuestion: 
    "¿Cuándo y dónde debemos actuar según predicción de demanda y evolución de SERP?",

  dataSources: ["DataForSEO", "GoogleTrends", "SERPAPI", "Prophet"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "medium",
    inferenceType: "hybrid"
  },

  caching: {
    cadence: "weekly",
    ttlSeconds: 604800,
    bustOnChanges: ["category_scope", "market"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B", "C", "E"],
    optionalSections: ["D", "F", "G", "H"],
    sectionUsage: {
      A: "Geo y mercado base para forecasting",
      B: "Categorías para queries de tendencia",
      C: "Competidores para tracking de velocidad en SERP",
      D: "Temas para agrupación de forecast",
      E: "Horizonte temporal y tolerancia al riesgo",
      F: "Canales para weighting de recomendaciones",
      G: "Exclusiones de queries/categorías",
      H: "Umbrales de confianza de predicción"
    },
    gates: {
      fenceMode: "hard",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      { name: "queries", type: "string[]", required: true, description: "Queries para forecast" },
      { name: "historicalRange", type: "string", required: false, default: "today 5-y" },
      { name: "forecastHorizon", type: "string", required: false, default: "6m" },
      { name: "confidenceInterval", type: "number", required: false, default: 0.8 }
    ]
  },

  disposition: {
    required: true,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "evidence", "severity"],
    runTraceFields: ["sectionsUsed", "sectionsMissing", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "demand_forecast",
    visuals: [
      { kind: "line", title: "Demand Forecast with Confidence Bands" },
      { kind: "heatmap", title: "Predicted Peak Months by Category" },
      { kind: "table", title: "Action Timeline" }
    ],
    summaryFields: ["predictedPeaks", "serpMomentum", "actionWindows", "recommendation"]
  },

  preflight: {
    entityChecks: [
      {
        checkType: "min_categories",
        minCount: 1,
        ucrSection: "B",
        fieldPath: "category_definition.included_categories",
        description: "Categorías requeridas para forecast",
        actionLabel: "Definir Categorías",
        actionPath: "/configuration/:id/category-definition"
      }
    ]
  },

  guardrails: {
    neverPromiseRevenue: true,
    neverDumpRawEntitiesWithoutFraming: true,
    alwaysProvideNextStep: true
  }
};
```

### 3.5 Intent + Competitive Positioning

```typescript
export const IntentPositioningContract: ModuleContract = {
  moduleId: "intel.intent_positioning.v1",
  name: "Intent + SERP + Competitive Positioning",
  category: "Strategic Intelligence",
  layer: "Action",
  version: "1.0.0",

  description: 
    "Combina intención explícita de búsqueda con posición competitiva real. " +
    "Detecta demanda con intención de compra donde competidor está débil.",
  strategicQuestion: 
    "¿Dónde existe demanda de compra donde mi competidor X es fuerte pero Y es débil?",

  dataSources: ["DataForSEO", "SERPAPI", "ExplodingTopics", "InternalCRM"],

  riskProfile: {
    confidence: "high",
    riskIfWrong: "medium",
    inferenceType: "external"
  },

  caching: {
    cadence: "weekly",
    ttlSeconds: 604800,
    bustOnChanges: ["competitor_set", "category_scope", "negative_scope"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B", "C", "G"],
    optionalSections: ["D", "E", "F", "H"],
    sectionUsage: {
      A: "Baseline de marca para comparación",
      B: "Categorías para clasificación de intent",
      C: "Competidores para análisis de positioning",
      D: "Temas de demanda para priorización",
      E: "Objetivos para scoring de oportunidades",
      F: "Canales para recomendaciones de acción",
      G: "Exclusiones hard de categorías/intent",
      H: "Umbrales de oportunidad"
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      { name: "keywords", type: "string[]", required: false, description: "Keywords a analizar (opcional)" },
      { name: "intentTypes", type: "string[]", required: false, default: ["transactional", "commercial"] },
      { name: "minSearchVolume", type: "number", required: false, default: 500 },
      { name: "competitorWeakThreshold", type: "number", required: false, default: 20 }
    ]
  },

  disposition: {
    required: true,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "evidence", "severity"],
    runTraceFields: ["sectionsUsed", "sectionsMissing", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "positioning_opportunity",
    visuals: [
      { kind: "matrix", title: "Intent vs Competitive Position Matrix" },
      { kind: "bar", title: "Opportunities by Intent Type" },
      { kind: "table", title: "Priority Actions" }
    ],
    summaryFields: ["tofOpportunities", "mofOpportunities", "bofOpportunities", "recommendation"]
  },

  preflight: {
    entityChecks: [
      {
        checkType: "min_competitors",
        minCount: 2,
        ucrSection: "C",
        fieldPath: "competitors.competitors",
        description: "Se requieren al menos 2 competidores para análisis de positioning",
        actionLabel: "Agregar Competidores",
        actionPath: "/configuration/:id/competitive-set"
      }
    ]
  },

  guardrails: {
    neverPromiseRevenue: true,
    neverDumpRawEntitiesWithoutFraming: true,
    alwaysProvideNextStep: true
  }
};
```

---

## 4. Schema del Dataset Maestro

### 4.1 Decision Object

Output unificado para decisiones tácticas:

```typescript
// shared/intelligence-types.ts

/**
 * Decision Object - Output estándar para decisiones tácticas
 * Cada módulo produce uno o más DecisionObjects
 */
export interface DecisionObject {
  // Identificación
  id: string;
  term: string;                    // Keyword, topic, o entidad
  moduleSource: string;            // Qué módulo lo generó
  generatedAt: string;             // ISO timestamp
  
  // Señales de demanda
  demandSignal: {
    trend: "rising" | "stable" | "declining" | "volatile";
    acceleration: number;          // % de cambio en velocidad
    confidence: "low" | "medium" | "high";
    dataPoints: number;            // Cantidad de datos usados
  };
  
  // Posición competitiva
  competitivePosition: {
    yourRank: number | null;       // Tu posición actual (null = no rankeas)
    topCompetitor: {
      name: string;
      rank: number;
      domain: string;
    };
    competitorCount: number;       // Cuántos competidores en top20
    serpVolatility: "stable" | "shifting" | "volatile";
  };
  
  // Presión de mercado
  marketPressure: {
    paidCompetition: "low" | "medium" | "high";
    avgCPC?: number;
    adDensity?: number;            // Número de ads en SERP
    socialBuzz?: "quiet" | "moderate" | "high";
  };
  
  // Señal de valor (requiere integración con GA4/Attribution)
  valueSignal?: {
    sessions: number;
    conversions: number;
    attributedRevenue?: number;
    conversionRate: number;
  };
  
  // Recomendación
  recommendation: {
    action: "act" | "hold" | "deprioritize";
    confidence: "low" | "medium" | "high";
    timing?: "immediate" | "next_cycle" | "next_quarter" | "monitor";
    rationale: string;
    nextSteps: string[];
  };
  
  // Trazabilidad
  trace: ItemTrace[];
}
```

### 4.2 Opportunity Scorecard

Para evaluación comparativa de oportunidades:

```typescript
/**
 * Opportunity Scorecard - Evaluación cuantitativa de oportunidad
 */
export interface OpportunityScorecard {
  id: string;
  term: string;
  
  // Scores normalizados (0-100)
  scores: {
    roi: number;                   // Proyección de retorno
    captureSpeed: number;          // Qué tan rápido puedes capturar
    competitiveAdvantage: number;  // Ventaja sobre competidores
    marketTiming: number;          // Timing de mercado
    overallOpportunity: number;    // Score compuesto
  };
  
  // Comparación vs competidores
  competitorAnalysis: Array<{
    name: string;
    domain: string;
    advantage: "you_lead" | "you_trail" | "parity";
    gap: number;                   // Diferencia de score
  }>;
  
  // Contexto UCR
  ucrAlignment: {
    categoryFit: boolean;
    strategicFit: boolean;
    channelFit: boolean;
    negativeScopeClean: boolean;
  };
  
  // Meta
  moduleSource: string;
  generatedAt: string;
}
```

### 4.3 Strategy Playbook

Para recomendaciones de alto nivel:

```typescript
/**
 * Strategy Playbook - Guía de acción por área
 */
export interface StrategyPlaybook {
  id: string;
  generatedAt: string;
  configurationId: number;
  
  // Estrategia de contenido
  contentStrategy: {
    priorityTopics: Array<{
      topic: string;
      intent: string;
      rationale: string;
      suggestedFormats: string[];
    }>;
    gapOpportunities: string[];
    avoidTopics: string[];
  };
  
  // Asignación de paid
  paidAllocation: {
    highPriorityKeywords: Array<{
      keyword: string;
      suggestedBudgetShare: number;
      expectedCPC: number;
    }>;
    avoidKeywords: string[];
    channelMix: {
      search: number;
      display: number;
      social: number;
    };
  };
  
  // Alineación CRO
  croAlignment: {
    landingPagePriorities: string[];
    messagingThemes: string[];
    conversionBarriers: string[];
  };
  
  // Timing
  actionTimeline: Array<{
    action: string;
    timing: string;
    priority: "high" | "medium" | "low";
    owner: string;
  }>;
  
  trace: RunTrace;
}
```

### 4.4 Unified Pipeline Output

Ejemplo del output final de un pipeline completo:

```typescript
/**
 * Ejemplo de output de pipeline (como en el documento original)
 */
interface PipelineOutput {
  term: string;
  demand_trend: "rising" | "stable" | "declining";
  ranking: {
    your_brand: number | null;
    top_competitor: number;
  };
  paid_pressure: "low" | "medium" | "high";
  value_signal: {
    sessions: number;
    conversions: number;
  };
  recommendation: string;
}

// Ejemplo:
const exampleOutput: PipelineOutput = {
  term: "recovery sandals",
  demand_trend: "rising",
  ranking: {
    your_brand: 0,
    top_competitor: 3
  },
  paid_pressure: "medium",
  value_signal: {
    sessions: 1200,
    conversions: 80
  },
  recommendation: "Act – ramp SEO + TOF beginning next cycle"
};
```

---

## 5. Patrones ETL y Pipelines

### 5.1 Arquitectura de Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         ETL PIPELINE ARCHITECTURE                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ STAGE 1: EXTRACT                                                     │    │
│   │  ┌──────────────────────────────────────────────────────────────┐   │    │
│   │  │ Parallel API Calls (p-limit for rate limiting)               │   │    │
│   │  │                                                              │   │    │
│   │  │  SerpApi    DataForSEO    GA4    Meta Ads    Brandwatch     │   │    │
│   │  │     │           │          │         │           │          │   │    │
│   │  │     └───────────┴──────────┴─────────┴───────────┘          │   │    │
│   │  │                          │                                   │   │    │
│   │  │                    RawDataBuffer                             │   │    │
│   │  └──────────────────────────────────────────────────────────────┘   │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                          │
│                                    ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ STAGE 2: TRANSFORM                                                   │    │
│   │  ┌──────────────────────────────────────────────────────────────┐   │    │
│   │  │ Normalize → Dedupe → Enrich → Classify                       │   │    │
│   │  │                                                              │   │    │
│   │  │  • Normalizar keywords (lowercase, trim)                     │   │    │
│   │  │  • Deduplicar entre fuentes                                  │   │    │
│   │  │  • Enriquecer con intent classification                      │   │    │
│   │  │  • Clasificar por tema (UCR.D)                               │   │    │
│   │  └──────────────────────────────────────────────────────────────┘   │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                          │
│                                    ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ STAGE 3: CORRELATE                                                   │    │
│   │  ┌──────────────────────────────────────────────────────────────┐   │    │
│   │  │ Join data sources by common keys (keyword, domain, date)     │   │    │
│   │  │                                                              │   │    │
│   │  │  SERP Position  ←→  Trend Data  ←→  Social Mentions          │   │    │
│   │  │        │                │                  │                 │   │    │
│   │  │        └────────────────┴──────────────────┘                 │   │    │
│   │  │                         │                                    │   │    │
│   │  │                 CorrelatedDataset                            │   │    │
│   │  └──────────────────────────────────────────────────────────────┘   │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                          │
│                                    ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ STAGE 4: SCORE & DISPOSITION                                         │    │
│   │  ┌──────────────────────────────────────────────────────────────┐   │    │
│   │  │ Apply UCR gates in order: G → B → H → E/F                    │   │    │
│   │  │                                                              │   │    │
│   │  │  1. Negative Scope (G) - Hard gate                           │   │    │
│   │  │  2. Category Fence (B) - Soft gate                           │   │    │
│   │  │  3. Governance Scoring (H)                                   │   │    │
│   │  │  4. Strategic/Channel Priority (E/F)                         │   │    │
│   │  │                                                              │   │    │
│   │  │  → PASS / REVIEW / OUT_OF_PLAY                               │   │    │
│   │  └──────────────────────────────────────────────────────────────┘   │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                          │
│                                    ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ STAGE 5: OUTPUT                                                      │    │
│   │  ┌──────────────────────────────────────────────────────────────┐   │    │
│   │  │ Generate: DecisionObjects, Scorecards, Playbooks             │   │    │
│   │  │                                                              │   │    │
│   │  │  → ModuleRunResult (items + envelope + summary)              │   │    │
│   │  │  → Persist to module_runs table                              │   │    │
│   │  │  → Generate alerts for high-priority signals                 │   │    │
│   │  └──────────────────────────────────────────────────────────────┘   │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Implementación de Pipeline Base

```typescript
// server/pipelines/base-pipeline.ts

import pLimit from 'p-limit';
import pRetry from 'p-retry';
import type { Configuration } from '@shared/schema';
import type { ModuleRunResult, ItemTrace, UCRSectionID } from '@shared/module.contract';

/**
 * Pipeline base para módulos de inteligencia multi-API
 */
export abstract class BaseIntelligencePipeline<TInput, TOutput> {
  protected readonly rateLimiter = pLimit(3); // Max 3 concurrent API calls
  protected traces: ItemTrace[] = [];
  protected warnings: string[] = [];
  protected sectionsUsed: UCRSectionID[] = [];

  constructor(
    protected readonly config: Configuration,
    protected readonly moduleId: string
  ) {}

  /**
   * Template method para ejecutar el pipeline completo
   */
  async execute(input: TInput): Promise<ModuleRunResult> {
    const startTime = Date.now();

    try {
      // Stage 1: Extract
      const rawData = await this.extract(input);
      
      // Stage 2: Transform
      const transformedData = await this.transform(rawData);
      
      // Stage 3: Correlate
      const correlatedData = await this.correlate(transformedData);
      
      // Stage 4: Score & Disposition
      const scoredData = await this.scoreAndDisposition(correlatedData);
      
      // Stage 5: Output
      return this.buildOutput(scoredData, Date.now() - startTime);
    } catch (error) {
      return this.buildErrorOutput(error as Error, Date.now() - startTime);
    }
  }

  /**
   * Stage 1: Extract data from multiple APIs
   * Override in subclass
   */
  protected abstract extract(input: TInput): Promise<RawDataBuffer>;

  /**
   * Stage 2: Transform and normalize data
   * Override in subclass
   */
  protected abstract transform(raw: RawDataBuffer): Promise<TransformedData>;

  /**
   * Stage 3: Correlate data from different sources
   * Override in subclass
   */
  protected abstract correlate(transformed: TransformedData): Promise<CorrelatedDataset>;

  /**
   * Stage 4: Apply UCR gates and scoring
   * Default implementation follows gate order
   */
  protected async scoreAndDisposition(data: CorrelatedDataset): Promise<ScoredItem[]> {
    const results: ScoredItem[] = [];

    for (const item of data.items) {
      // G: Negative Scope (hard gate)
      if (this.isNegativeScope(item)) {
        results.push({
          ...item,
          disposition: "OUT_OF_PLAY",
          reason: "Negative scope exclusion",
          traces: [this.createTrace("G", "negative_scope", "hard_gate")]
        });
        continue;
      }

      // B: Category Fence (soft gate)
      const fenceResult = this.checkFence(item);
      if (!fenceResult.inFence) {
        item.flags = [...(item.flags || []), "outside_fence"];
      }

      // H: Governance Scoring
      const score = this.computeScore(item);
      const thresholds = this.getThresholds();

      let disposition: "PASS" | "REVIEW" | "OUT_OF_PLAY";
      if (score >= thresholds.pass) {
        disposition = "PASS";
      } else if (score >= thresholds.review) {
        disposition = "REVIEW";
      } else {
        disposition = "OUT_OF_PLAY";
      }

      results.push({
        ...item,
        score,
        disposition,
        traces: item.traces
      });
    }

    return results;
  }

  /**
   * Stage 5: Build final ModuleRunResult
   */
  protected buildOutput(scored: ScoredItem[], executionMs: number): ModuleRunResult {
    return {
      envelope: {
        moduleId: this.moduleId,
        runId: `run_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        contextVersion: this.config.id,
        contextStatus: this.config.status || "UNKNOWN",
        ucrSectionsUsed: this.sectionsUsed,
        filtersApplied: [],
        warnings: this.warnings.map(msg => ({ code: "WARNING", message: msg }))
      },
      items: scored.map(item => this.toModuleItemResult(item)),
      summary: this.buildSummary(scored, executionMs)
    };
  }

  /**
   * Helper: API call with retry and rate limiting
   */
  protected async apiCall<T>(
    fn: () => Promise<T>,
    options: { retries?: number; label?: string } = {}
  ): Promise<T> {
    return this.rateLimiter(() => 
      pRetry(fn, {
        retries: options.retries ?? 3,
        onFailedAttempt: (error) => {
          console.warn(`API call ${options.label} failed, attempt ${error.attemptNumber}:`, error.message);
        }
      })
    );
  }

  // Abstract methods for subclass implementation
  protected abstract toModuleItemResult(item: ScoredItem): ModuleItemResult;
  protected abstract buildSummary(scored: ScoredItem[], executionMs: number): Record<string, unknown>;

  // UCR gate helpers
  protected isNegativeScope(item: any): boolean {
    const excludedKeywords = this.config.negative_scope?.excluded_keywords || [];
    const excludedCategories = this.config.negative_scope?.excluded_categories || [];
    
    const term = (item.keyword || item.term || "").toLowerCase();
    
    if (excludedKeywords.some(ex => term.includes(ex.toLowerCase()))) {
      return true;
    }
    
    if (excludedCategories.some(cat => term.includes(cat.toLowerCase()))) {
      return true;
    }
    
    return false;
  }

  protected checkFence(item: any): { inFence: boolean; reason: string } {
    const included = this.config.category_definition?.included_categories || [];
    const excluded = this.config.category_definition?.excluded_categories || [];
    const term = (item.keyword || item.term || "").toLowerCase();

    if (excluded.some(cat => term.includes(cat.toLowerCase()))) {
      return { inFence: false, reason: "excluded_category" };
    }

    if (included.some(cat => term.includes(cat.toLowerCase()))) {
      return { inFence: true, reason: "included_category" };
    }

    return { inFence: false, reason: "no_match" };
  }

  protected getThresholds(): { pass: number; review: number } {
    const govConfig = this.config.governance?.scoring_config;
    return {
      pass: govConfig?.pass_threshold ?? 0.6,
      review: govConfig?.review_threshold ?? 0.3
    };
  }

  protected computeScore(item: any): number {
    // Default implementation - override in subclass
    return 0.5;
  }

  protected createTrace(
    section: UCRSectionID,
    ruleId: string,
    severity: "low" | "medium" | "high" | "critical"
  ): ItemTrace {
    return {
      ruleId,
      ucrSection: section,
      reason: `Applied from ${section}`,
      severity
    };
  }

  protected buildErrorOutput(error: Error, executionMs: number): ModuleRunResult {
    return {
      envelope: {
        moduleId: this.moduleId,
        runId: `run_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        contextVersion: this.config.id,
        contextStatus: this.config.status || "UNKNOWN",
        ucrSectionsUsed: this.sectionsUsed,
        filtersApplied: [],
        warnings: [{ code: "ERROR", message: error.message }]
      },
      items: [],
      summary: { error: error.message, executionMs }
    };
  }
}

// Supporting types
interface RawDataBuffer {
  serp?: any[];
  trends?: any[];
  social?: any[];
  ads?: any[];
  analytics?: any[];
}

interface TransformedData {
  items: any[];
  metadata: Record<string, any>;
}

interface CorrelatedDataset {
  items: any[];
  correlations: Record<string, any>;
}

interface ScoredItem {
  keyword?: string;
  term?: string;
  score: number;
  disposition: "PASS" | "REVIEW" | "OUT_OF_PLAY";
  reason?: string;
  flags?: string[];
  traces: ItemTrace[];
  [key: string]: any;
}
```

### 5.3 Ejemplo: Pipeline SERP + Trends + Social

```typescript
// server/pipelines/serp-trends-social-pipeline.ts

import { BaseIntelligencePipeline, RawDataBuffer, TransformedData, CorrelatedDataset } from './base-pipeline';
import type { Configuration } from '@shared/schema';
import type { ModuleItemResult, EntityItemResult } from '@shared/module.contract';

interface SerpTrendsSocialInput {
  queries: string[];
  country: string;
  timeRange: string;
  socialTimeWindow: string;
}

interface TrendSignalItem {
  term: string;
  trendAcceleration: number;
  serpChanges: number;
  socialMentions: number;
  socialSentiment: "positive" | "neutral" | "negative";
  score: number;
  disposition: "PASS" | "REVIEW" | "OUT_OF_PLAY";
  traces: ItemTrace[];
}

export class SerpTrendsSocialPipeline extends BaseIntelligencePipeline<
  SerpTrendsSocialInput,
  TrendSignalItem[]
> {
  constructor(config: Configuration) {
    super(config, "intel.serp_trends_social.v1");
    this.sectionsUsed = ["A", "B", "C", "G"];
  }

  protected async extract(input: SerpTrendsSocialInput): Promise<RawDataBuffer> {
    const { queries, country, timeRange, socialTimeWindow } = input;

    // Parallel API calls with rate limiting
    const [serpData, trendsData, socialData] = await Promise.all([
      this.apiCall(
        () => this.fetchSerpData(queries, country),
        { label: "SERP", retries: 2 }
      ),
      this.apiCall(
        () => this.fetchTrendsData(queries, country, timeRange),
        { label: "Trends", retries: 2 }
      ),
      this.apiCall(
        () => this.fetchSocialData(queries, socialTimeWindow),
        { label: "Social", retries: 2 }
      )
    ]);

    return {
      serp: serpData,
      trends: trendsData,
      social: socialData
    };
  }

  protected async transform(raw: RawDataBuffer): Promise<TransformedData> {
    // Normalize and dedupe
    const normalizedItems = new Map<string, any>();

    // Process SERP data
    for (const item of raw.serp || []) {
      const key = item.keyword.toLowerCase().trim();
      normalizedItems.set(key, {
        ...normalizedItems.get(key),
        keyword: key,
        serpRank: item.rank,
        serpFeatures: item.features,
        competitorsInSerp: item.competitors
      });
    }

    // Process Trends data
    for (const item of raw.trends || []) {
      const key = item.query.toLowerCase().trim();
      const existing = normalizedItems.get(key) || { keyword: key };
      normalizedItems.set(key, {
        ...existing,
        trendValue: item.value,
        trendAcceleration: item.acceleration,
        historicalPattern: item.pattern
      });
    }

    // Process Social data
    for (const item of raw.social || []) {
      const key = item.term.toLowerCase().trim();
      const existing = normalizedItems.get(key) || { keyword: key };
      normalizedItems.set(key, {
        ...existing,
        socialMentions: item.mentions,
        socialSentiment: item.sentiment,
        socialTrending: item.trending
      });
    }

    return {
      items: Array.from(normalizedItems.values()),
      metadata: {
        serpCount: raw.serp?.length || 0,
        trendsCount: raw.trends?.length || 0,
        socialCount: raw.social?.length || 0
      }
    };
  }

  protected async correlate(transformed: TransformedData): Promise<CorrelatedDataset> {
    const correlations: Record<string, any> = {};
    const items = transformed.items.map(item => {
      // Calculate correlation score
      const hasTrendSignal = (item.trendAcceleration || 0) > 10;
      const hasSerpMovement = (item.competitorsInSerp || 0) > 0;
      const hasSocialBuzz = (item.socialMentions || 0) > 50;

      // Opportunity = Rising trend + SERP not saturated + Social buzz
      const opportunitySignal = 
        (hasTrendSignal ? 0.4 : 0) +
        (hasSerpMovement ? -0.2 : 0.3) +  // Less competitors = more opportunity
        (hasSocialBuzz ? 0.3 : 0);

      correlations[item.keyword] = {
        signals: { hasTrendSignal, hasSerpMovement, hasSocialBuzz },
        opportunitySignal
      };

      return {
        ...item,
        opportunitySignal,
        traces: []
      };
    });

    return { items, correlations };
  }

  protected computeScore(item: any): number {
    // Score based on correlation signals
    const trendWeight = 0.4;
    const serpWeight = 0.3;
    const socialWeight = 0.3;

    const trendScore = Math.min((item.trendAcceleration || 0) / 50, 1);
    const serpScore = item.serpRank ? (1 - (item.serpRank / 100)) : 0;
    const socialScore = Math.min((item.socialMentions || 0) / 100, 1);

    return (trendScore * trendWeight) + (serpScore * serpWeight) + (socialScore * socialWeight);
  }

  protected toModuleItemResult(item: ScoredItem): EntityItemResult {
    return {
      itemType: "entity",
      itemId: `trend_${item.keyword.replace(/\s+/g, '_')}`,
      title: item.keyword,
      entityName: item.keyword,
      entityType: "trend_signal",
      mentions: item.socialMentions,
      sentiment: item.socialSentiment,
      confidence: item.score > 0.7 ? "high" : item.score > 0.4 ? "medium" : "low",
      trace: item.traces
    };
  }

  protected buildSummary(scored: ScoredItem[], executionMs: number): Record<string, unknown> {
    const passing = scored.filter(s => s.disposition === "PASS");
    const rising = scored.filter(s => (s.trendAcceleration || 0) > 20);

    return {
      totalAnalyzed: scored.length,
      passingOpportunities: passing.length,
      risingTrends: rising.length,
      topOpportunities: passing
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(s => ({
          term: s.keyword,
          score: s.score,
          trend: s.trendAcceleration,
          social: s.socialMentions
        })),
      executionMs,
      recommendation: this.generateRecommendation(passing, rising)
    };
  }

  private generateRecommendation(passing: ScoredItem[], rising: ScoredItem[]): string {
    if (passing.length === 0) {
      return "No hay oportunidades claras en este momento. Considerar ampliar el scope de categorías.";
    }

    const topOpp = passing[0];
    if (rising.length > 3) {
      return `${rising.length} tendencias en aceleración detectadas. Priorizar: "${topOpp.keyword}" con ${topOpp.trendAcceleration}% de crecimiento.`;
    }

    return `Oportunidad principal: "${topOpp.keyword}". La SERP aún no está saturada y el sentimiento social es ${topOpp.socialSentiment}.`;
  }

  // API fetchers (stubs - implement with real API clients)
  private async fetchSerpData(queries: string[], country: string): Promise<any[]> {
    // TODO: Implement SerpApi integration
    return [];
  }

  private async fetchTrendsData(queries: string[], country: string, timeRange: string): Promise<any[]> {
    // TODO: Implement DataForSEO Trends integration
    return [];
  }

  private async fetchSocialData(queries: string[], timeWindow: string): Promise<any[]> {
    // TODO: Implement Brandwatch integration
    return [];
  }
}
```

---

## 6. Políticas de Cache

### 6.1 Cadencias por Módulo

| Módulo | Cadencia | TTL | Bust On Changes |
|--------|----------|-----|-----------------|
| `intel.serp_trends_social.v1` | Daily | 24h | competitor_set, category_scope |
| `intel.cross_channel_messaging.v1` | Weekly | 7d | competitor_set, category_scope |
| `intel.serp_attribution.v1` | Daily | 24h | all |
| `intel.demand_forecasting.v1` | Weekly | 7d | category_scope, market |
| `intel.intent_positioning.v1` | Weekly | 7d | competitor_set, category_scope, negative_scope |

### 6.2 Implementación de Cache

```typescript
// server/cache/intelligence-cache.ts

import memoizee from 'memoizee';

interface CacheConfig {
  maxAge: number;      // TTL in ms
  preFetch: boolean;   // Refresh before expiry
  primitive: boolean;  // Use primitive key matching
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  "intel.serp_trends_social.v1": {
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    preFetch: true,
    primitive: true
  },
  "intel.cross_channel_messaging.v1": {
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    preFetch: true,
    primitive: true
  },
  "intel.serp_attribution.v1": {
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    preFetch: false,  // Don't prefetch - data changes frequently
    primitive: true
  },
  "intel.demand_forecasting.v1": {
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    preFetch: true,
    primitive: true
  },
  "intel.intent_positioning.v1": {
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    preFetch: true,
    primitive: true
  }
};

/**
 * Generate cache key for module execution
 */
export function generateCacheKey(
  moduleId: string,
  configId: number,
  params: Record<string, any>
): string {
  const paramStr = JSON.stringify(params, Object.keys(params).sort());
  return `${moduleId}:${configId}:${paramStr}`;
}

/**
 * Cache decorator for module execution
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  moduleId: string,
  fn: T
): T {
  const config = CACHE_CONFIGS[moduleId];
  if (!config) {
    return fn;
  }

  return memoizee(fn, {
    maxAge: config.maxAge,
    preFetch: config.preFetch,
    promise: true,
    normalizer: (args) => generateCacheKey(moduleId, args[0].id, args[1])
  }) as T;
}

/**
 * Bust cache for specific configuration
 */
export function bustCache(moduleId: string, configId: number): void {
  // Implementation depends on cache storage
  console.log(`Cache busted for ${moduleId}:${configId}`);
}

/**
 * Bust all caches when UCR section changes
 */
export function bustOnUCRChange(
  configId: number,
  changedSection: string
): void {
  const BUST_MAPPING: Record<string, string[]> = {
    competitor_set: [
      "intel.serp_trends_social.v1",
      "intel.cross_channel_messaging.v1",
      "intel.intent_positioning.v1"
    ],
    category_scope: [
      "intel.serp_trends_social.v1",
      "intel.cross_channel_messaging.v1",
      "intel.demand_forecasting.v1",
      "intel.intent_positioning.v1"
    ],
    negative_scope: [
      "intel.intent_positioning.v1"
    ],
    market: [
      "intel.demand_forecasting.v1"
    ],
    all: Object.keys(CACHE_CONFIGS)
  };

  const modulesToBust = BUST_MAPPING[changedSection] || [];
  for (const moduleId of modulesToBust) {
    bustCache(moduleId, configId);
  }
}
```

---

## 7. Implementación Paso a Paso

### 7.1 Checklist de Implementación

Para cada módulo nuevo, seguir estos pasos:

#### Paso 1: Contrato (shared/module.contract.ts)
- [ ] Definir `ModuleContract` completo
- [ ] Agregar a `CONTRACT_REGISTRY`
- [ ] Definir `preflight.entityChecks`

#### Paso 2: Tipos (shared/intelligence-types.ts)
- [ ] Definir tipos de entrada específicos
- [ ] Definir tipos de salida específicos
- [ ] Exportar interfaces

#### Paso 3: API Clients (server/api-clients/)
- [ ] Crear cliente para cada API externa
- [ ] Implementar rate limiting
- [ ] Agregar retry logic
- [ ] Manejar errores de API

#### Paso 4: Pipeline (server/pipelines/)
- [ ] Extender `BaseIntelligencePipeline`
- [ ] Implementar `extract()`
- [ ] Implementar `transform()`
- [ ] Implementar `correlate()`
- [ ] Implementar `computeScore()`
- [ ] Implementar `toModuleItemResult()`
- [ ] Implementar `buildSummary()`

#### Paso 5: Module Runner (server/module-runner.ts)
- [ ] Agregar case para el nuevo `moduleId`
- [ ] Instanciar pipeline
- [ ] Ejecutar y retornar resultado

#### Paso 6: Cache
- [ ] Configurar `CACHE_CONFIGS`
- [ ] Implementar bust triggers

#### Paso 7: UI (opcional)
- [ ] Agregar visualización en `module-visualizer.tsx`
- [ ] Agregar sugerencias de error en `module-shell.tsx`

### 7.2 Ejemplo Completo: Agregar SERP + Trends + Social

```bash
# Archivos a crear/modificar:

# 1. Tipos compartidos
shared/intelligence-types.ts          # Nuevos tipos

# 2. Contrato
shared/module.contract.ts             # Agregar SerpTrendsSocialContract

# 3. API Clients
server/api-clients/serpapi-client.ts  # Cliente SerpApi
server/api-clients/brandwatch-client.ts # Cliente Brandwatch

# 4. Pipeline
server/pipelines/base-pipeline.ts     # Pipeline base
server/pipelines/serp-trends-social-pipeline.ts # Pipeline específico

# 5. Runner
server/module-runner.ts               # Agregar case

# 6. Cache
server/cache/intelligence-cache.ts    # Configuración de cache

# 7. Environment
.env                                  # API keys
```

### 7.3 Variables de Entorno Requeridas

```bash
# .env

# SerpApi
SERP_API_KEY=your_serpapi_key

# DataForSEO (ya existente)
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password

# Brandwatch
BRANDWATCH_API_KEY=your_brandwatch_key
BRANDWATCH_PROJECT_ID=your_project_id

# Meta Ad Library
META_ACCESS_TOKEN=your_access_token
META_APP_ID=your_app_id

# Google Analytics 4
GA4_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GA4_PROPERTY_ID=your_property_id

# Google Ads
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token

# Attribution (opcional)
NORTHBEAM_API_KEY=your_northbeam_key
TRIPLE_WHALE_API_KEY=your_triple_whale_key

# Exploding Topics
EXPLODING_TOPICS_API_KEY=your_et_key
```

---

## Apéndice A: Agregar Contratos al Registry

```typescript
// shared/module.contract.ts (al final del archivo)

// Importar todos los contratos de inteligencia
export const CONTRACT_REGISTRY = createContractRegistry([
  // Módulos existentes
  KeywordGapVisibilityContract,
  CategoryDemandTrendContract,
  MarketDemandSeasonalityContract,
  CompetitiveRadarContract,
  SwotAnalysisContract,
  ContentBriefContract,
  
  // Nuevos módulos de inteligencia multi-API
  SerpTrendsSocialContract,
  CrossChannelMessagingContract,
  SerpAttributionContract,
  DemandForecastingContract,
  IntentPositioningContract,
]);
```

---

## Apéndice B: Recomendaciones por Caso de Uso

### Si quieres timing de mercado
```
Módulo: intel.demand_forecasting.v1
APIs: DataForSEO Trends + SerpApi + Prophet
UCR crítico: B (categorías), E (horizonte temporal)
```

### Si quieres mensajes que funcionan
```
Módulo: intel.cross_channel_messaging.v1
APIs: SerpApi + DataForSEO Paid + Meta Ad Library
UCR crítico: C (competidores), F (canales)
```

### Si quieres valor de negocio real
```
Módulo: intel.serp_attribution.v1
APIs: SerpApi + GA4 + Attribution API
UCR crítico: A (dominio), D (temas), F (canales)
```

### Si quieres priorización técnica inmediata
```
Módulo: intel.intent_positioning.v1
APIs: DataForSEO NLP + SerpApi + Exploding Topics
UCR crítico: B (categorías), C (competidores), G (exclusiones)
```

---

## Apéndice C: Referencia de Tipos Válidos

Valores permitidos según `shared/module.contract.ts`:

### ContextInjectionSpec.gates

```typescript
gates: {
  fenceMode: "soft" | "hard" | "none";
  negativeScopeMode: "hard" | "none";  // "hard" = exclusión estricta
}
```

### CachingPolicy

```typescript
caching: {
  cadence: "none" | "hourly" | "daily" | "weekly" | "monthly";
  ttlSeconds?: number;
  bustOnChanges?: Array<
    "competitor_set" | "category_scope" | "negative_scope" | "governance" | "market" | "all"
  >;
}
```

### RiskProfile

```typescript
riskProfile: {
  confidence: "low" | "medium" | "high";
  riskIfWrong: "low" | "medium" | "high";
  inferenceType: "external" | "internal" | "hybrid";
}
```

### ModuleItemType (NO MODIFICAR)

```typescript
// Estos son los únicos valores válidos - usar "entity" para casos personalizados
export type ModuleItemType = "keyword" | "cluster" | "serp" | "url" | "entity";
```

> **Importante:** Para módulos nuevos con entidades personalizadas, usar `itemType: "entity"` con un `entityType` personalizado en vez de modificar esta unión.

### ModuleOutputSpec.visuals.kind

```typescript
kind: "line" | "bar" | "table" | "heatmap" | "matrix" | "card" | "other";
```

### UCRStatus (para executionGate)

```typescript
export type UCRStatus =
  | "DRAFT_AI"
  | "AI_READY"
  | "AI_ANALYSIS_RUN"
  | "HUMAN_CONFIRMED"
  | "LOCKED";
```

---

## Conclusión

Esta guía proporciona el framework completo para agregar los 5 módulos de inteligencia multi-API al stack existente. La arquitectura aprovecha:

1. **Context-First**: Todos los módulos heredan contexto del UCR
2. **Pipeline Pattern**: Estructura consistente de Extract → Transform → Correlate → Score → Output
3. **Unified Schema**: DecisionObjects y Scorecards estandarizados
4. **Smart Caching**: Cadencias optimizadas por tipo de dato
5. **CMO-Safe**: Gates y trazabilidad en cada paso

Para implementar, comenzar con el módulo más simple (`intel.serp_trends_social.v1`) y usar como template para los demás.
