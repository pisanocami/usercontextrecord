# Guía para Agregar Nuevos Módulos

Esta guía explica cómo agregar un nuevo módulo al sistema de Brand Intelligence Platform.

## Arquitectura del Sistema de Módulos

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ ModuleShell  │ -> │ ModuleVisu-  │ -> │ EmptyModuleResult    │   │
│  │ (ejecutor)   │    │ alizer       │    │ (cuando no hay datos)│   │
│  └──────────────┘    └──────────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ POST /api/modules/:moduleId/run
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend (Express)                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ routes.ts    │ -> │ execution-   │ -> │ module-runner.ts     │   │
│  │              │    │ gateway.ts   │    │ (dispatch a handlers)│   │
│  └──────────────┘    └──────────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Contratos (shared/)                               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ module.contract.ts                                            │   │
│  │ - CONTRACT_REGISTRY: catálogo de todos los módulos            │   │
│  │ - ModuleContract: interfaz de definición de módulo            │   │
│  │ - ModuleRunResult: formato de salida v2 (polimórfico)         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Paso 1: Definir el Contrato del Módulo

Edita `shared/module.contract.ts` y agrega tu contrato antes del `CONTRACT_REGISTRY`:

```typescript
export const MiNuevoModuloContract: ModuleContract = {
  // ID único con namespace y versión
  moduleId: "categoria.mi_nuevo_modulo.v1",
  
  // Metadatos de UI
  name: "Mi Nuevo Módulo",
  category: "Mi Categoría",
  layer: "Signal", // "Signal" | "Synthesis" | "Action"
  version: "1.0.0",
  
  // Descripción y pregunta estratégica
  description: "Descripción breve del módulo",
  strategicQuestion: "¿Qué pregunta estratégica responde este módulo?",
  
  // Fuentes de datos que usa
  dataSources: ["DataForSEO", "GoogleTrends"], // DataSource[]
  
  // Perfil de riesgo
  riskProfile: {
    confidence: "medium", // "low" | "medium" | "high"
    riskIfWrong: "medium",
    inferenceType: "api_driven" // "api_driven" | "model_inferred" | "internal"
  },
  
  // Política de cache
  caching: {
    cadence: "weekly", // "daily" | "weekly" | "monthly" | "realtime"
    bustOnChanges: ["competitors", "categories"]
  },
  
  // Gate de ejecución (qué UCR statuses permiten ejecutar)
  executionGate: {
    allowedStatuses: ["LOCKED", "AI_READY", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },
  
  // Inyección de contexto (qué secciones UCR necesita)
  contextInjection: {
    requiredSections: ["A", "B", "C"], // Obligatorias
    optionalSections: ["D", "E", "G"], // Opcionales
    sectionUsage: {
      A: "Identidad de marca y dominio",
      B: "Definición de categoría",
      C: "Competidores para comparación"
    },
    gates: {
      fenceMode: "strict", // "strict" | "soft" | "none"
      negativeScopeMode: "filter" // "filter" | "warn" | "none"
    }
  },
  
  // Parámetros de entrada
  inputs: {
    fields: [
      { name: "ucr", type: "json", required: true },
      { name: "timeRange", type: "string", required: false, description: "Rango de tiempo" }
    ]
  },
  
  // Política de disposición
  disposition: {
    required: true,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },
  
  // Política de explicabilidad
  explainability: {
    required: true,
    itemTraceFields: ["keyword", "score", "reason"],
    runTraceFields: ["sectionsUsed", "filtersApplied"]
  },
  
  // Especificación de salida
  output: {
    entityType: "keyword", // "keyword" | "cluster" | "serp" | "url" | "entity" | etc.
    visuals: [
      { kind: "table", title: "Resultados" },
      { kind: "bar_chart", title: "Distribución" }
    ],
    summaryFields: ["total", "topOpportunities"]
  }
};
```

Luego agrégalo al `CONTRACT_REGISTRY`:

```typescript
export const CONTRACT_REGISTRY = createContractRegistry([
  // ... otros contratos
  MiNuevoModuloContract,
]);
```

---

## Paso 2: Implementar el Handler del Módulo

### Opción A: Servicio Independiente (Recomendado)

Crea un archivo en `server/` para tu lógica:

```typescript
// server/mi-nuevo-modulo-analyzer.ts

import type { Configuration } from "@shared/schema";
import type { ModuleRunResult, ClusterItemResult } from "@shared/module.contract";

export interface MiModuloParams {
  timeRange?: string;
  limit?: number;
}

export class MiNuevoModuloAnalyzer {
  async analyze(config: Configuration, params: MiModuloParams = {}): Promise<any> {
    // Tu lógica de análisis aquí
    // Usa config.brand, config.competitors, etc.
    return {
      items: [],
      summary: {}
    };
  }
  
  // Método v2: devuelve ModuleRunResult
  async analyzeAsModuleRunResult(
    config: Configuration,
    params: MiModuloParams = {}
  ): Promise<ModuleRunResult> {
    const result = await this.analyze(config, params);
    
    // Usa los adaptadores de module-result-adapters.ts
    // o construye el resultado manualmente:
    return {
      envelope: {
        moduleId: "categoria.mi_nuevo_modulo.v1",
        runId: `run_${Date.now()}`,
        executedAt: new Date().toISOString(),
        contextVersion: `v${config.id}`,
        ucrSectionsUsed: ["A", "B", "C"],
        filtersApplied: [],
        warnings: []
      },
      items: result.items.map(item => ({
        itemType: "keyword",
        itemId: item.id,
        title: item.name,
        // ... otros campos según el tipo
        trace: []
      })),
      summary: result.summary
    };
  }
}

export const miNuevoModuloAnalyzer = new MiNuevoModuloAnalyzer();
```

### Opción B: Usar Adaptadores Existentes

Si tu módulo devuelve keywords o clusters, usa los adaptadores:

```typescript
import { 
  wrapKeywordResultAsModuleRunResult,
  wrapCategoryResultAsModuleRunResult 
} from "./module-result-adapters";
```

---

## Paso 3: Registrar en el Module Runner

Edita `server/module-runner.ts` para agregar tu handler:

```typescript
import { miNuevoModuloAnalyzer } from "./mi-nuevo-modulo-analyzer";

// Dentro de la función runModule o switch statement:
case "categoria.mi_nuevo_modulo.v1":
  return await miNuevoModuloAnalyzer.analyzeAsModuleRunResult(config, params);
```

---

## Paso 4: Agregar Visualización (Opcional)

Si necesitas visualización personalizada, edita `client/src/components/module-visualizer.tsx`:

```typescript
// Agrega un case para tu tipo de visual
case "mi_visual_personalizado":
  return <MiComponenteVisual data={data} />;
```

---

## Formato de Resultados v2 (ModuleRunResult)

### Estructura General

```typescript
interface ModuleRunResult {
  envelope: ModuleRunEnvelope;  // Metadata de la ejecución
  items: ModuleItemResult[];    // Resultados polimórficos
  summary?: Record<string, any>; // Resumen opcional
}
```

### Tipos de Items Disponibles

| itemType | Interface | Uso |
|----------|-----------|-----|
| `keyword` | `KeywordItemResult` | Keywords con score y disposición |
| `cluster` | `ClusterItemResult` | Clusters/categorías con estacionalidad |
| `serp` | `SerpItemResult` | Análisis de SERPs |
| `url` | `UrlItemResult` | Análisis de URLs |
| `entity` | `EntityItemResult` | Entidades genéricas |

### Ejemplo: KeywordItemResult

```typescript
{
  itemType: "keyword",
  itemId: "kw_123",
  title: "running shoes",
  keyword: "running shoes",
  status: "PASS",
  capabilityScore: 85,
  theme: "Footwear",
  searchVolume: 50000,
  trace: [
    { ruleId: "category_fence", ucrSection: "B", reason: "In category", severity: "low" }
  ]
}
```

### Ejemplo: ClusterItemResult

```typescript
{
  itemType: "cluster",
  itemId: "cluster_recovery_footwear",
  title: "Recovery Footwear",
  themeName: "Recovery Footwear",
  geo: "US",
  timeRange: "today 5-y",
  interval: "weekly",
  peakMonth: "January",
  lowMonth: "July",
  stabilityScore: 78,
  timingClassification: "early_ramp_dominant",
  queries: ["recovery sandals", "post workout shoes"],
  recommendedLaunchByISO: "2025-11-01",
  recommendationRationale: "Launch 6-8 weeks before peak",
  heatmap: { "Jan": 100, "Feb": 85, ... },
  trace: []
}
```

---

## Mensajes de Error y Resultados Vacíos

El sistema muestra automáticamente un mensaje amigable cuando un módulo devuelve 0 resultados. Las sugerencias se personalizan según la categoría del módulo.

Para agregar sugerencias específicas para tu categoría, edita `getEmptyResultSuggestions()` en `client/src/pages/module-shell.tsx`:

```typescript
const suggestions: Record<string, string[]> = {
  // ... otras categorías
  "mi_categoria": [
    "Sugerencia específica 1",
    "Sugerencia específica 2",
    "Sugerencia específica 3"
  ]
};
```

---

## Formato de Resultados para UI

**Importante:** El ModuleShell detecta automáticamente resultados vacíos. Para que la UI muestre correctamente los resultados:

1. **ModuleRunResult v2**: Debe tener `items` como array (aunque sea vacío para indicar sin resultados)
2. **Formato legacy**: Debe incluir al menos uno de estos campos con contenido:
   - Arrays: `items`, `topOpportunities`, `results`, `keywords`, `clusters`, `rows`, `opportunities`
   - Objetos: `grouped`, `byCategory`, `byTheme`, `heatmap`
   - Numérico: `totalGapKeywords > 0`

Si ninguno de estos campos tiene contenido, se mostrará el mensaje "Análisis completado sin resultados".

---

## Checklist Rápido

- [ ] Contrato definido en `shared/module.contract.ts`
- [ ] Contrato agregado a `CONTRACT_REGISTRY`
- [ ] Handler implementado en `server/`
- [ ] Handler registrado en `module-runner.ts`
- [ ] Resultados incluyen campos reconocidos por la UI (items, topOpportunities, etc.)
- [ ] (Opcional) Visualización personalizada en `module-visualizer.tsx`
- [ ] (Opcional) Sugerencias de error personalizadas en `module-shell.tsx`

---

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `shared/module.contract.ts` | Definición de contratos y registry |
| `server/module-runner.ts` | Dispatch de ejecución |
| `server/execution-gateway.ts` | Validación UCR y gate |
| `server/module-result-adapters.ts` | Adaptadores para ModuleRunResult v2 |
| `client/src/pages/module-shell.tsx` | UI de ejecución de módulos |
| `client/src/components/module-visualizer.tsx` | Renderizado de resultados |

---

## Guías Relacionadas

- **[Módulos de Inteligencia Multi-API](docs/MULTI_API_INTELLIGENCE_MODULES.md)**: Guía completa para implementar módulos que combinan múltiples APIs externas (SerpApi, DataForSEO, GA4, Meta Ads, etc.) con patrones ETL, caching, y schemas unificados de output.
