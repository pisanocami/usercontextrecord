# Plan de Integración: Market Demand & Seasonality Module

**Proyecto:** Brand Intelligence Configuration Platform  
**Módulo:** Market Demand & Seasonality  
**Versión:** v1.0  
**Fecha:** Enero 2026  
**Owner Council:** Strategic Intelligence  
**Status:** Planificación

---

## 📋 Resumen Ejecutivo

Este documento define el plan completo de integración del módulo **Market Demand & Seasonality** al sistema existente de Brand Intelligence, siguiendo la arquitectura **Context-First** y el sistema de contratos de módulos establecido.

### Objetivo del Módulo

Responder la pregunta estratégica:
> **"¿Cuándo despierta nuestro mercado — y cuándo debemos actuar?"**

### Principio Fundamental

El módulo separa intencionalmente:
- ✅ **"¿CUÁNDO deberíamos movernos?"** (lo que SÍ responde)
- ❌ **"¿CUÁNTO deberíamos gastar?"** (lo que NO responde)

---

## 🏗️ Arquitectura de Integración

### Ubicación en el Sistema

```
usercontextrecord/
├── server/
│   ├── providers/
│   │   └── google-trends-provider.ts          [NUEVO]
│   ├── market-demand-seasonality.ts            [NUEVO]
│   └── routes.ts                               [MODIFICAR]
├── shared/
│   ├── module.contract.ts                      [MODIFICAR - agregar contrato]
│   └── schema.ts                               [MODIFICAR - agregar tipos]
├── client/
│   └── src/
│       ├── components/
│       │   └── MarketDemandAnalysis.tsx        [NUEVO]
│       └── pages/
│           └── MarketDemandPage.tsx            [NUEVO]
└── db/
    └── schema.ts                               [MODIFICAR - agregar tabla cache]
```

### Integración con UCR (User Context Record)

El módulo requiere las siguientes secciones del UCR:

| Sección | Uso | Obligatorio |
|---------|-----|-------------|
| **A. Brand Context** | Geo y market context | Sí |
| **B. Category Definition** | Query groups para tracking | Sí |
| **D. Demand Definition** | Theme classification | No |
| **E. Strategic Intent** | Timing sensitivity | No |
| **G. Negative Scope** | Hard exclusions | No |
| **H. Governance** | Confidence thresholds | No |

---

## 📐 Fase 1: Contrato del Módulo

### 1.1 Definir Module Contract

**Archivo:** `shared/module.contract.ts`

```typescript
export const MarketDemandSeasonalityContract: ModuleContract = {
  moduleId: "market.demand_seasonality.v1",
  name: "Market Demand & Seasonality",
  category: "Market Intelligence",
  layer: "Signal",
  version: "v1",

  description: "Surfaces historical and near-term demand cycles using Google Trends data for timing decisions",
  strategicQuestion: "When does our market actually wake up — and when should we act?",

  dataSources: ["GoogleTrends"],

  riskProfile: {
    confidence: "high",
    riskIfWrong: "medium",
    inferenceType: "external"
  },

  caching: {
    cadence: "monthly",
    ttlSeconds: 2592000, // 30 días
    bustOnChanges: ["category_scope", "market"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED", "AI_ANALYSIS_RUN"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B"],
    optionalSections: ["D", "E", "G", "H"],
    sectionUsage: {
      A: "Defines brand domain and geo for market context",
      B: "Defines category queries for demand tracking",
      D: "Maps demand themes for trend classification",
      E: "Adjusts timing sensitivity (aggressive vs conservative)",
      G: "Hard exclusions for prohibited categories",
      H: "Defines confidence thresholds for timing recommendations"
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      {
        name: "query_groups",
        type: "string[]",
        required: true,
        description: "Category-level clusters, not single keywords"
      },
      {
        name: "country_code",
        type: "string",
        required: false,
        default: "US",
        description: "Demand timing varies by geography"
      },
      {
        name: "time_range",
        type: "string",
        required: false,
        default: "today 5-y",
        description: "Captures multi-year seasonality"
      },
      {
        name: "interval",
        type: "string",
        required: false,
        default: "weekly",
        description: "Balances resolution and stability"
      },
      {
        name: "forecast_toggle",
        type: "boolean",
        required: false,
        default: false,
        description: "Enable 8-12 week forecast"
      }
    ]
  },

  disposition: {
    required: false,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "severity"],
    runTraceFields: ["sectionsUsed", "sectionsMissing", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "demand_timing_signal",
    visuals: [
      { kind: "line", title: "5-Year Demand Curve", description: "Historical weekly demand" },
      { kind: "heatmap", title: "Seasonality Heatmap", description: "Monthly average patterns" },
      { kind: "card", title: "Timing Recommendation", description: "When to act" }
    ],
    summaryFields: [
      "peak_months",
      "inflection_point",
      "yoy_consistency",
      "timing_recommendation",
      "confidence_level"
    ]
  },

  councilRules: {
    ownerCouncil: "Strategic Intelligence",
    supportingCouncils: ["Growth Strategy & Planning", "Performance Media & Messaging"],
    rulePacks: [
      { packId: "strategic_intel.timing", version: "v1", appliesTo: "run" }
    ]
  },

  guardrails: {
    neverPromiseRevenue: true,
    neverDumpRawEntitiesWithoutFraming: true,
    alwaysProvideNextStep: true
  }
};
```

### 1.2 Registrar en CONTRACT_REGISTRY

```typescript
export const CONTRACT_REGISTRY = createContractRegistry([
  KeywordGapVisibilityContract,
  CategoryDemandTrendContract,
  BrandAttentionContract,
  MarketDemandSeasonalityContract  // AGREGAR
]);
```

---

## 📊 Fase 2: Tipos y Schemas

### 2.1 Tipos Base en `shared/schema.ts`

```typescript
export interface TrendsDataPoint {
  date: string;
  value: number; // 0-100 normalized
}

export interface TrendsQuery {
  query: string;
  country: string;
  timeRange: string;
  interval: 'daily' | 'weekly' | 'monthly';
}

export interface TrendsResponse {
  query: string;
  data: TrendsDataPoint[];
  metadata: {
    fetchedAt: string;
    source: 'SerpAPI' | 'DataForSEO' | 'GoogleTrends';
    cached: boolean;
  };
}

export interface SeasonalityPattern {
  inflectionPoint: {
    month: number;
    week: number;
    date: string;
  };
  peakWindow: {
    start: string;
    end: string;
    months: string[];
  };
  declinePhase: {
    start: string;
  };
  yoyConsistency: 'high' | 'medium' | 'low';
  consistencyScore: number; // 0-1
}

export interface MarketDemandResult {
  configurationId: number;
  contextVersion: number;
  
  demandCurve: {
    query: string;
    data: TrendsDataPoint[];
    forecast?: TrendsDataPoint[];
  }[];
  
  seasonality: SeasonalityPattern;
  
  timingRecommendation: {
    inflectionMonth: string;
    peakMonths: string[];
    recommendedActionDate: string;
    reasoning: string;
    confidence: 'high' | 'medium' | 'low';
  };
  
  yoyAnalysis: {
    consistency: 'high' | 'medium' | 'low';
    variance: number;
    anomalies: string[];
  };
  
  executiveSummary: string;
  
  trace: RunTrace;
  metadata: {
    fetchedAt: string;
    cached: boolean;
    dataSource: string;
  };
}
```

---

## 🔌 Fase 3: Google Trends Provider

### 3.1 Opciones de Implementación

**Opción A: SerpAPI (Recomendada)**
- ✅ API estable y confiable
- ✅ Pricing predecible
- ✅ Fácil integración
- ✅ Endpoint: `/search?engine=google_trends`

**Opción B: DataForSEO (Ya integrado)**
- ✅ Ya tienes credenciales
- ✅ Endpoint: Google Trends API
- ✅ Consistente con tu stack actual

**Opción C: Unofficial google-trends-api**
- ⚠️ Gratuita pero menos estable
- ⚠️ Puede requerir proxies
- ⚠️ Riesgo de rate limiting

**Recomendación:** Usar **SerpAPI** o **DataForSEO**

### 3.2 Implementación del Provider

**Archivo:** `server/providers/google-trends-provider.ts`

```typescript
import axios from 'axios';

export interface GoogleTrendsProviderConfig {
  apiKey: string;
  provider: 'serpapi' | 'dataforseo';
}

export class GoogleTrendsProvider {
  private config: GoogleTrendsProviderConfig;
  
  constructor(config: GoogleTrendsProviderConfig) {
    this.config = config;
  }

  /**
   * Fetch trends data for a single query
   */
  async fetchTrends(query: TrendsQuery): Promise<TrendsResponse> {
    if (this.config.provider === 'serpapi') {
      return this.fetchFromSerpAPI(query);
    } else {
      return this.fetchFromDataForSEO(query);
    }
  }

  /**
   * Compare multiple queries in one request (cost optimization)
   */
  async compareQueries(
    queries: string[], 
    options: Omit<TrendsQuery, 'query'>
  ): Promise<TrendsResponse[]> {
    // Google Trends permite hasta 5 queries en compare mode
    const batches = this.chunkArray(queries, 5);
    
    const results = await Promise.all(
      batches.map(batch => this.fetchCompareMode(batch, options))
    );
    
    return results.flat();
  }

  private async fetchFromSerpAPI(query: TrendsQuery): Promise<TrendsResponse> {
    const params = {
      engine: 'google_trends',
      q: query.query,
      geo: query.country,
      date: query.timeRange,
      api_key: this.config.apiKey
    };

    const response = await axios.get('https://serpapi.com/search', { params });
    
    return {
      query: query.query,
      data: this.normalizeSerpAPIResponse(response.data),
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'SerpAPI',
        cached: false
      }
    };
  }

  private async fetchFromDataForSEO(query: TrendsQuery): Promise<TrendsResponse> {
    // Implementación similar usando DataForSEO API
    // Ver: https://docs.dataforseo.com/v3/keywords_data/google_trends/explore/
    throw new Error('DataForSEO implementation pending');
  }

  private normalizeSerpAPIResponse(data: any): TrendsDataPoint[] {
    // Convertir formato SerpAPI a nuestro formato estándar
    return data.interest_over_time?.timeline_data?.map((point: any) => ({
      date: point.date,
      value: point.values[0]?.value || 0
    })) || [];
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

---

## 🧮 Fase 4: Lógica de Análisis Core

### 4.1 Archivo Principal

**Archivo:** `server/market-demand-seasonality.ts`

```typescript
import { GoogleTrendsProvider } from './providers/google-trends-provider';
import type { Configuration } from './storage';

export class MarketDemandAnalyzer {
  private provider: GoogleTrendsProvider;

  constructor(provider: GoogleTrendsProvider) {
    this.provider = provider;
  }

  /**
   * Ejecuta análisis completo de demanda y estacionalidad
   */
  async analyze(
    config: Configuration,
    options: {
      forecast?: boolean;
      forceRefresh?: boolean;
    } = {}
  ): Promise<MarketDemandResult> {
    
    // 1. Extract query groups from UCR Section B
    const queryGroups = this.extractQueryGroups(config);
    
    // 2. Apply negative scope (Section G)
    const filteredQueries = this.applyNegativeScope(queryGroups, config);
    
    // 3. Fetch trends data
    const trendsData = await this.fetchTrendsData(filteredQueries, config);
    
    // 4. Detect seasonality patterns
    const seasonality = this.detectSeasonality(trendsData);
    
    // 5. Analyze YoY consistency
    const yoyAnalysis = this.analyzeYoYConsistency(trendsData);
    
    // 6. Generate timing recommendation
    const timingRec = this.generateTimingRecommendation(
      seasonality, 
      yoyAnalysis, 
      config
    );
    
    // 7. Optional: Generate forecast
    let forecast;
    if (options.forecast) {
      forecast = this.generateForecast(trendsData, 12); // 12 weeks
    }
    
    // 8. Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(
      seasonality,
      timingRec,
      yoyAnalysis
    );
    
    return {
      configurationId: config.id,
      contextVersion: config.version || 1,
      demandCurve: trendsData.map(t => ({
        query: t.query,
        data: t.data,
        forecast
      })),
      seasonality,
      timingRecommendation: timingRec,
      yoyAnalysis,
      executiveSummary,
      trace: this.buildTrace(config),
      metadata: {
        fetchedAt: new Date().toISOString(),
        cached: false,
        dataSource: 'GoogleTrends'
      }
    };
  }

  /**
   * Detecta patrones de estacionalidad
   * Implementa las 4 reglas del Strategic Intelligence Council
   */
  private detectSeasonality(data: TrendsResponse[]): SeasonalityPattern {
    // Regla 1: Consistency beats magnitude
    // Regla 2: Timing > volume
    // Regla 3: Early inflection > peak
    // Regla 4: Do not over-react to anomalies
    
    const aggregated = this.aggregateByMonth(data[0].data);
    
    // Encontrar punto de inflexión (inicio de rampa)
    const inflectionPoint = this.findInflectionPoint(aggregated);
    
    // Encontrar ventana de pico
    const peakWindow = this.findPeakWindow(aggregated);
    
    // Encontrar fase de declive
    const declinePhase = this.findDeclinePhase(aggregated);
    
    // Calcular consistencia YoY
    const consistency = this.calculateConsistency(data);
    
    return {
      inflectionPoint,
      peakWindow,
      declinePhase,
      yoyConsistency: consistency > 0.7 ? 'high' : consistency > 0.4 ? 'medium' : 'low',
      consistencyScore: consistency
    };
  }

  /**
   * Analiza consistencia año-sobre-año
   */
  private analyzeYoYConsistency(data: TrendsResponse[]): {
    consistency: 'high' | 'medium' | 'low';
    variance: number;
    anomalies: string[];
  } {
    // Comparar forma de curva año sobre año
    // Detectar anomalías (picos únicos de un año)
    
    const yearlyPatterns = this.extractYearlyPatterns(data[0].data);
    const variance = this.calculateVariance(yearlyPatterns);
    const anomalies = this.detectAnomalies(yearlyPatterns);
    
    return {
      consistency: variance < 0.2 ? 'high' : variance < 0.4 ? 'medium' : 'low',
      variance,
      anomalies
    };
  }

  /**
   * Genera recomendación de timing
   */
  private generateTimingRecommendation(
    seasonality: SeasonalityPattern,
    yoyAnalysis: any,
    config: Configuration
  ): MarketDemandResult['timingRecommendation'] {
    
    // Si consistencia es baja, no hacer recomendaciones fuertes
    if (seasonality.yoyConsistency === 'low') {
      return {
        inflectionMonth: 'N/A',
        peakMonths: [],
        recommendedActionDate: 'N/A',
        reasoning: 'Timing neutral — do not over-optimize. Demand pattern is erratic.',
        confidence: 'low'
      };
    }
    
    // Calcular fecha recomendada (antes del punto de inflexión)
    const actionDate = this.calculateActionDate(seasonality.inflectionPoint);
    
    return {
      inflectionMonth: this.formatMonth(seasonality.inflectionPoint.month),
      peakMonths: seasonality.peakWindow.months,
      recommendedActionDate: actionDate,
      reasoning: this.buildReasoning(seasonality, yoyAnalysis),
      confidence: seasonality.yoyConsistency
    };
  }

  /**
   * Genera forecast ligero (8-12 semanas)
   */
  private generateForecast(
    data: TrendsResponse[],
    weeks: number
  ): TrendsDataPoint[] {
    // Lightweight smoothing (moving average)
    // NO usar ML pesado
    
    const lastPoints = data[0].data.slice(-12); // últimas 12 semanas
    const movingAvg = this.calculateMovingAverage(lastPoints, 4);
    
    // Proyectar hacia adelante
    const forecast: TrendsDataPoint[] = [];
    for (let i = 1; i <= weeks; i++) {
      const lastDate = new Date(lastPoints[lastPoints.length - 1].date);
      lastDate.setDate(lastDate.getDate() + (7 * i));
      
      forecast.push({
        date: lastDate.toISOString().split('T')[0],
        value: movingAvg // Simplificado, podría usar tendencia
      });
    }
    
    return forecast;
  }

  /**
   * Genera executive summary siguiendo el template del playbook
   */
  private generateExecutiveSummary(
    seasonality: SeasonalityPattern,
    timing: MarketDemandResult['timingRecommendation'],
    yoy: any
  ): string {
    if (timing.confidence === 'low') {
      return `Demand pattern shows low year-over-year consistency. Recommend timing-neutral approach and focus on other growth levers.`;
    }
    
    return `Demand consistently begins rising in ${timing.inflectionMonth} and peaks in ${timing.peakMonths.join(' and ')}. Over five years, the pattern is ${seasonality.yoyConsistency} consistency with ${(seasonality.consistencyScore * 100).toFixed(0)}% stability. This suggests TOF media and content should launch no later than ${timing.recommendedActionDate}, with creative finalized 2-3 weeks prior. Delaying until peak months historically results in higher CAC and weaker share capture.`;
  }

  // Helper methods
  private extractQueryGroups(config: Configuration): string[] {
    // Extraer de UCR Section B
    return config.category_definition?.included_categories || [];
  }

  private applyNegativeScope(queries: string[], config: Configuration): string[] {
    const excluded = config.negative_scope?.excluded_keywords || [];
    return queries.filter(q => !excluded.some(ex => q.toLowerCase().includes(ex.toLowerCase())));
  }

  private buildTrace(config: Configuration): RunTrace {
    // Implementar trazabilidad
    return {
      sectionsUsed: ['A', 'B'],
      sectionsMissing: [],
      filtersApplied: ['negative_scope'],
      rulesTriggered: ['timing_consistency_check']
    };
  }

  // Implementar métodos auxiliares...
  private aggregateByMonth(data: TrendsDataPoint[]): any { /* ... */ }
  private findInflectionPoint(data: any): any { /* ... */ }
  private findPeakWindow(data: any): any { /* ... */ }
  private findDeclinePhase(data: any): any { /* ... */ }
  private calculateConsistency(data: TrendsResponse[]): number { /* ... */ }
  private extractYearlyPatterns(data: TrendsDataPoint[]): any { /* ... */ }
  private calculateVariance(patterns: any): number { /* ... */ }
  private detectAnomalies(patterns: any): string[] { /* ... */ }
  private calculateActionDate(inflection: any): string { /* ... */ }
  private buildReasoning(seasonality: any, yoy: any): string { /* ... */ }
  private calculateMovingAverage(data: TrendsDataPoint[], window: number): number { /* ... */ }
  private formatMonth(month: number): string { /* ... */ }
  private async fetchTrendsData(queries: string[], config: Configuration): Promise<TrendsResponse[]> { /* ... */ }
}
```

---

## 💾 Fase 5: Schema de Base de Datos

### 5.1 Tabla de Cache

**Archivo:** `db/schema.ts` (o agregar a `server/storage.ts`)

```typescript
export const marketDemandCache = pgTable('market_demand_cache', {
  id: serial('id').primaryKey(),
  configurationId: integer('configuration_id')
    .references(() => configurations.id)
    .notNull(),
  queryGroup: text('query_group').notNull(),
  country: text('country').notNull(),
  timeRange: text('time_range').notNull(),
  data: jsonb('data').notNull(), // TrendsResponse[]
  analysis: jsonb('analysis').notNull(), // MarketDemandResult
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Índices para performance
export const marketDemandCacheIndexes = {
  configIdx: index('idx_market_demand_config').on(marketDemandCache.configurationId),
  expiryIdx: index('idx_market_demand_expiry').on(marketDemandCache.expiresAt),
};
```

### 5.2 Migration Script

```sql
-- Migration: Add market_demand_cache table
CREATE TABLE market_demand_cache (
  id SERIAL PRIMARY KEY,
  configuration_id INTEGER NOT NULL REFERENCES configurations(id) ON DELETE CASCADE,
  query_group TEXT NOT NULL,
  country TEXT NOT NULL,
  time_range TEXT NOT NULL,
  data JSONB NOT NULL,
  analysis JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_market_demand_config ON market_demand_cache(configuration_id);
CREATE INDEX idx_market_demand_expiry ON market_demand_cache(expires_at);
```

---

## 🌐 Fase 6: Endpoints API

### 6.1 Agregar a `server/routes.ts`

```typescript
// GET /api/market-demand/status
// Verifica configuración de Google Trends API
app.get('/api/market-demand/status', async (req, res) => {
  try {
    const provider = new GoogleTrendsProvider({
      apiKey: process.env.SERPAPI_KEY || '',
      provider: 'serpapi'
    });
    
    // Test query
    const testResult = await provider.fetchTrends({
      query: 'test',
      country: 'US',
      timeRange: 'today 1-m',
      interval: 'weekly'
    });
    
    res.json({ 
      status: 'ok', 
      provider: 'serpapi',
      testQuery: testResult.query
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// POST /api/market-demand/analyze
// Ejecuta análisis completo
app.post('/api/market-demand/analyze', isAuthenticated, async (req, res) => {
  try {
    const { configurationId, forecast = false, forceRefresh = false } = req.body;
    
    // 1. Fetch configuration
    const config = await storage.getConfiguration(configurationId);
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    // 2. Validate UCR
    const validation = validateContractExecution(
      config.status,
      getAvailableSections(config),
      MarketDemandSeasonalityContract
    );
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'UCR validation failed', 
        details: validation.errors 
      });
    }
    
    // 3. Check cache
    if (!forceRefresh) {
      const cached = await storage.getMarketDemandCache(configurationId);
      if (cached && new Date(cached.expiresAt) > new Date()) {
        return res.json({ ...cached.analysis, cached: true });
      }
    }
    
    // 4. Execute analysis
    const provider = new GoogleTrendsProvider({
      apiKey: process.env.SERPAPI_KEY || '',
      provider: 'serpapi'
    });
    
    const analyzer = new MarketDemandAnalyzer(provider);
    const result = await analyzer.analyze(config, { forecast, forceRefresh });
    
    // 5. Cache result
    await storage.saveMarketDemandCache(configurationId, result);
    
    res.json(result);
  } catch (error) {
    console.error('Market demand analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/market-demand/cache/:configurationId
// Retorna datos cacheados si existen
app.get('/api/market-demand/cache/:configurationId', isAuthenticated, async (req, res) => {
  try {
    const configurationId = parseInt(req.params.configurationId);
    const cached = await storage.getMarketDemandCache(configurationId);
    
    if (!cached) {
      return res.status(404).json({ error: 'No cached data found' });
    }
    
    const isExpired = new Date(cached.expiresAt) < new Date();
    
    res.json({
      ...cached.analysis,
      cached: true,
      expired: isExpired,
      expiresAt: cached.expiresAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/market-demand/cache/:configurationId
// Limpia cache para re-ejecutar
app.delete('/api/market-demand/cache/:configurationId', isAuthenticated, async (req, res) => {
  try {
    const configurationId = parseInt(req.params.configurationId);
    await storage.deleteMarketDemandCache(configurationId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🎨 Fase 7: Componentes UI

### 7.1 Página Principal

**Archivo:** `client/src/pages/MarketDemandPage.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { MarketDemandAnalysis } from '@/components/MarketDemandAnalysis';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function MarketDemandPage() {
  const { id } = useParams();
  const configurationId = parseInt(id);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['market-demand', configurationId],
    queryFn: async () => {
      const res = await fetch(`/api/market-demand/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configurationId, forecast: true })
      });
      if (!res.ok) throw new Error('Failed to fetch analysis');
      return res.json();
    }
  });

  if (isLoading) {
    return <div>Loading market demand analysis...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Market Demand & Seasonality</h1>
        <Button onClick={() => refetch()}>Refresh Analysis</Button>
      </div>

      <MarketDemandAnalysis data={data} />
    </div>
  );
}
```

### 7.2 Componente de Análisis

**Archivo:** `client/src/components/MarketDemandAnalysis.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';

export function MarketDemandAnalysis({ data }: { data: MarketDemandResult }) {
  return (
    <div className="space-y-6">
      {/* Executive Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{data.executiveSummary}</p>
          <div className="mt-4 flex gap-2">
            <Badge variant={data.timingRecommendation.confidence === 'high' ? 'default' : 'secondary'}>
              {data.timingRecommendation.confidence.toUpperCase()} CONFIDENCE
            </Badge>
            <Badge variant="outline">
              YoY Consistency: {data.yoyAnalysis.consistency.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Timing Recommendation Card */}
      <Card>
        <CardHeader>
          <CardTitle>Timing Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Inflection Point</p>
              <p className="text-2xl font-bold">{data.timingRecommendation.inflectionMonth}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Peak Months</p>
              <p className="text-2xl font-bold">{data.timingRecommendation.peakMonths.join(', ')}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Recommended Action Date</p>
              <p className="text-xl font-bold text-primary">{data.timingRecommendation.recommendedActionDate}</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">{data.timingRecommendation.reasoning}</p>
          </div>
        </CardContent>
      </Card>

      {/* 5-Year Demand Curve */}
      <Card>
        <CardHeader>
          <CardTitle>5-Year Demand Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart width={1000} height={400} data={data.demandCurve[0].data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#8884d8" 
              name="Historical Demand"
            />
            {data.demandCurve[0].forecast && (
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#82ca9d" 
                strokeDasharray="5 5"
                name="Forecast"
                data={data.demandCurve[0].forecast}
              />
            )}
          </LineChart>
        </CardContent>
      </Card>

      {/* Seasonality Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonality Pattern</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Implementar heatmap con recharts o custom component */}
          <div className="text-sm text-muted-foreground">
            Heatmap visualization coming soon
          </div>
        </CardContent>
      </Card>

      {/* YoY Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Year-over-Year Consistency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Consistency Score:</span>
              <span className="font-bold">{(data.seasonality.consistencyScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Variance:</span>
              <span className="font-bold">{(data.yoyAnalysis.variance * 100).toFixed(1)}%</span>
            </div>
            {data.yoyAnalysis.anomalies.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Anomalies Detected:</p>
                <ul className="list-disc list-inside">
                  {data.yoyAnalysis.anomalies.map((anomaly, i) => (
                    <li key={i} className="text-sm">{anomaly}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## ⚙️ Fase 8: Optimización de Costos

### 8.1 Estrategia de Cache

```typescript
// Cache strategy según playbook
const CACHE_RULES = {
  default: {
    ttl: 30 * 24 * 60 * 60, // 30 días
    revalidate: 'monthly'
  },
  bustOn: [
    'category_definition.included_categories',
    'category_definition.primary_category',
    'brand.country_code'
  ]
};

// Implementar en storage.ts
export async function saveMarketDemandCache(
  configurationId: number,
  result: MarketDemandResult
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 días

  await db.insert(marketDemandCache).values({
    configurationId,
    queryGroup: result.demandCurve[0].query,
    country: 'US', // extraer de config
    timeRange: 'today 5-y',
    data: result.demandCurve,
    analysis: result,
    expiresAt
  });
}
```

### 8.2 Compare Mode Optimization

```typescript
// Agrupar queries en una sola request
async function fetchTrendsOptimized(queries: string[]) {
  // Máximo 5 queries por request (límite de Google Trends)
  const batches = chunk(queries, 5);
  
  return Promise.all(batches.map(batch => 
    provider.compareQueries(batch, {
      country: 'US',
      timeRange: 'today 5-y',
      interval: 'weekly'
    })
  ));
}
```

---

## 🔐 Fase 9: Configuración de Secrets

### 9.1 Replit Secrets

Agregar en Replit Secrets:

```
SERPAPI_KEY=your_serpapi_key_here
```

O reutilizar:
```
DATAFORSEO_LOGIN=existing_login
DATAFORSEO_PASSWORD=existing_password
```

---

## 🧪 Fase 10: Testing

### 10.1 Unit Tests

```typescript
// test/market-demand-analyzer.test.ts
describe('MarketDemandAnalyzer', () => {
  test('detectSeasonality identifies inflection point', () => {
    // ...
  });

  test('analyzeYoYConsistency calculates variance correctly', () => {
    // ...
  });

  test('generateForecast produces 12-week projection', () => {
    // ...
  });
});
```

### 10.2 Integration Tests

```typescript
// test/market-demand-api.test.ts
describe('Market Demand API', () => {
  test('POST /api/market-demand/analyze returns valid result', async () => {
    // ...
  });

  test('Cache is used when not expired', async () => {
    // ...
  });
});
```

---

## 📅 Timeline de Implementación

| Fase | Tarea | Tiempo Estimado | Prioridad |
|------|-------|-----------------|-----------|
| 1 | Definir contrato del módulo | 30 min | Alta |
| 2 | Crear tipos y schemas | 20 min | Alta |
| 3 | Implementar Google Trends provider | 2-3 horas | Alta |
| 4 | Crear lógica de análisis core | 3-4 horas | Alta |
| 5 | Agregar tabla de cache a DB | 30 min | Media |
| 6 | Crear endpoints API | 2 horas | Alta |
| 7 | Desarrollar componentes UI | 4-5 horas | Media |
| 8 | Implementar optimización de costos | 1 hora | Media |
| 9 | Configurar secrets | 10 min | Alta |
| 10 | Testing y refinamiento | 2-3 horas | Media |

**Tiempo total estimado: 15-20 horas**

---

## 🚀 Roadmap de Features

### v1.0 (MVP)
- ✅ Historic seasonality (5 años)
- ✅ Peak detection
- ✅ YoY consistency
- ✅ Basic timing recommendation
- ✅ Cache con TTL 30 días
- ✅ Executive summary

### v1.1 (Planned)
- Category Momentum delta vs prior year
- Anomaly detection mejorado
- Export to PDF/CSV
- Email alerts para timing shifts

### v2.0 (Future)
- Geo-specific seasonality overlays
- Multi-market comparison
- Forecast accuracy tracking
- Integration con Performance Media Council

---

## 📚 Documentación Relacionada

- `CONTEXT_MODULE_ARCHITECTURE.md` - Arquitectura Context-First
- `KEYWORD_GAP_ANALYSIS.md` - Ejemplo de módulo implementado
- `docs/MODULE_CONTRACTS.md` - Sistema de contratos
- `Market Demand & Seasonality Playbook.md` - Playbook original

---

## 🎯 Criterios de Éxito

1. **Funcionalidad Core**
   - ✅ Fetch de Google Trends data
   - ✅ Detección de estacionalidad
   - ✅ Timing recommendations
   - ✅ YoY consistency analysis

2. **Integración UCR**
   - ✅ Validación de secciones requeridas
   - ✅ Aplicación de negative scope
   - ✅ Trazabilidad completa

3. **Performance**
   - ✅ Cache hit rate > 80%
   - ✅ Response time < 3s (cached)
   - ✅ Response time < 10s (fresh)

4. **UX**
   - ✅ Executive summary clara
   - ✅ Visualizaciones intuitivas
   - ✅ Confidence indicators

---

## 🔄 Changelog

### v1.0 (Enero 2026)
- Plan inicial de integración
- Definición de arquitectura
- Especificación de contratos

---

**Documento generado:** Enero 2026  
**Autor:** Force of Nature Team  
**Status:** Planificación → Implementación
