# Strategic Features x10: Guía Técnica de Implementación

> **Documento**: Funcionalidades Estratégicas para CMO/Board  
> **Versión**: 1.0  
> **Fecha**: Enero 2026  
> **Arquitectura Base**: Context-First OS (UCR como Single Source of Truth)

---

## Resumen Ejecutivo

Este documento detalla 5 funcionalidades estratégicas que transforman la plataforma de "inteligencia de marca" a **"Sistema Operativo de Decisiones Competitivas"**. Cada funcionalidad está diseñada para:

1. **Aprovechar la arquitectura existente** (UCR, Module Contracts, Providers)
2. **Reutilizar datos ya disponibles** (DataForSEO, Ahrefs, OpenAI/Gemini)
3. **Mantener el estándar CMO-Safe** (trazabilidad, explicabilidad, no promesas de revenue)

---

## Arquitectura Actual (Resumen)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTEXT-FIRST ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   UCR (8 Secciones)          Providers              Modules                 │
│   ├── A: Brand Context       ├── DataForSEO         ├── Keyword Gap Lite    │
│   ├── B: Category Def        ├── Ahrefs             ├── Market Demand       │
│   ├── C: Competitive Set     ├── Google Trends      ├── Share of Voice      │
│   ├── D: Demand Definition   ├── OpenAI/Gemini      └── [+5 Nuevos]         │
│   ├── E: Strategic Intent    └── Internal                                   │
│   ├── F: Channel Context                                                    │
│   ├── G: Negative Scope                                                     │
│   └── H: Governance                                                         │
│                                                                             │
│   Stack: React + Express + Drizzle/PostgreSQL + TypeScript                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Las 5 Funcionalidades Estratégicas

| # | Funcionalidad | Valor CMO | Complejidad | Tiempo Est. |
|---|---------------|-----------|-------------|-------------|
| 1 | Market Defense Radar™ | Early-warning de amenazas | Alta | 6-8 semanas |
| 2 | Competitive Budget Simulator | ROI antes de invertir | Media | 4-5 semanas |
| 3 | Positioning Stress Test™ | Arquitectura defensiva | Media | 4-5 semanas |
| 4 | Strategic Move Generator | Decisiones top 1% CMO | Alta | 6-8 semanas |
| 5 | Board-Ready Strategy Brief | De insight a decisión | Baja | 2-3 semanas |

---

# 1️⃣ Market Defense Radar™

## Concepto Mejorado x10

**De**: Sistema de alertas básico  
**A**: **Inteligencia predictiva de amenazas competitivas con scoring de urgencia y playbooks de respuesta automáticos**

### Qué Detecta (Señales Enriquecidas)

| Señal | Fuente de Datos | Peso | Acción Sugerida |
|-------|-----------------|------|-----------------|
| Keyword Intent Shift | DataForSEO/Ahrefs | 0.25 | Lock narrative |
| New Landing Pages | Web scraping | 0.20 | Counter-content |
| Paid Media Surge | DataForSEO Ads | 0.15 | Defensive SEO |
| Backlink Velocity | Ahrefs | 0.15 | Authority build |
| SERP Feature Capture | DataForSEO SERP | 0.15 | Feature targeting |
| Social Mention Spike | Future: BrandWatch | 0.10 | PR response |

### Output CMO-Ready

```typescript
interface MarketDefenseAlert {
  id: string;
  competitor: string;
  competitorTier: "tier1" | "tier2" | "tier3";
  signalType: DefenseSignalType;
  signalStrength: "weak" | "moderate" | "strong" | "critical";
  confidence: number; // 0-1
  timeHorizon: "immediate" | "3-6_months" | "6-12_months" | "12+_months";
  
  // CMO-Safe framing
  headline: string; // "HOKA entering recovery-adjacent messaging"
  businessImpact: string; // "Risk to post-performance moment ownership"
  urgencyScore: number; // 1-100
  
  // Actionable recommendations
  recommendedActions: {
    action: string;
    priority: "critical" | "high" | "medium" | "low";
    owner: "marketing" | "product" | "sales" | "executive";
    timeframe: string;
    estimatedEffort: string;
  }[];
  
  // Evidence trail
  evidence: {
    dataPoint: string;
    source: DataSource;
    timestamp: string;
    delta: string; // "+45% keyword overlap in 30 days"
  }[];
  
  // UCR linkage
  affectedUCRSections: UCRSectionID[];
  trace: ItemTrace[];
}
```

---

## Implementación Técnica

### 1.1 Nuevo Module Contract

```typescript
// shared/module.contract.ts - Agregar

export const MarketDefenseRadarContract: ModuleContract = {
  moduleId: "strategic.market_defense_radar.v1",
  name: "Market Defense Radar",
  category: "Strategic Intelligence",
  layer: "Synthesis",
  version: "contract.v1",

  description: "Early-warning system that detects competitive threats before they become obvious, enabling proactive defense.",
  strategicQuestion: "What competitive moves are happening now that could threaten our market position in 6-12 months?",

  dataSources: ["DataForSEO", "Ahrefs", "OpenAI", "Internal"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "low", // False positives are acceptable
    inferenceType: "hybrid"
  },

  caching: {
    cadence: "daily",
    bustOnChanges: ["competitor_set", "category_scope"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B", "C"],
    optionalSections: ["D", "E", "G"],
    sectionUsage: {
      A: "Client domain for baseline comparison",
      B: "Category fence for relevant signal filtering",
      C: "Competitor domains to monitor",
      D: "Demand themes for intent shift detection",
      E: "Strategic posture for alert prioritization",
      G: "Exclusions to reduce noise"
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      { name: "lookback_days", type: "number", default: 30, constraints: { min: 7, max: 90 } },
      { name: "min_signal_strength", type: "string", default: "moderate" },
      { name: "include_tier3", type: "boolean", default: false }
    ]
  },

  disposition: {
    required: true,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"],
    hideOutOfPlayByDefault: true
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "evidence", "severity"],
    runTraceFields: ["sectionsUsed", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "defense_alert",
    visuals: [
      { kind: "heatmap", title: "Threat Matrix by Competitor" },
      { kind: "table", title: "Active Alerts" },
      { kind: "card", title: "Critical Alert Summary" }
    ],
    summaryFields: ["total_alerts", "critical_count", "top_threat", "recommended_immediate_action"]
  },

  guardrails: {
    neverPromiseRevenue: true,
    neverDumpRawEntitiesWithoutFraming: true,
    alwaysProvideNextStep: true
  }
};
```

### 1.2 Nuevo Schema (Database)

```typescript
// shared/schema.ts - Agregar

export const marketDefenseAlerts = pgTable("market_defense_alerts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  configurationId: integer("configuration_id").notNull(),
  
  // Alert identification
  alertType: varchar("alert_type").notNull(), // "keyword_shift" | "landing_page" | "paid_surge" | etc
  competitor: varchar("competitor").notNull(),
  competitorTier: varchar("competitor_tier").notNull(),
  
  // Scoring
  signalStrength: varchar("signal_strength").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  urgencyScore: integer("urgency_score").notNull(), // 1-100
  timeHorizon: varchar("time_horizon").notNull(),
  
  // Content
  headline: text("headline").notNull(),
  businessImpact: text("business_impact").notNull(),
  recommendedActions: jsonb("recommended_actions").notNull(),
  evidence: jsonb("evidence").notNull(),
  
  // Status
  status: varchar("status").default("active"), // "active" | "acknowledged" | "resolved" | "dismissed"
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  
  // Trace
  trace: jsonb("trace").notNull(),
  
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export interface MarketDefenseAlert {
  id: number;
  userId: string;
  configurationId: number;
  alertType: string;
  competitor: string;
  competitorTier: string;
  signalStrength: string;
  confidence: number;
  urgencyScore: number;
  timeHorizon: string;
  headline: string;
  businessImpact: string;
  recommendedActions: RecommendedAction[];
  evidence: AlertEvidence[];
  status: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  trace: ItemTrace[];
  created_at: Date;
  updated_at: Date;
}
```

### 1.3 Nuevo Provider Service

```typescript
// server/modules/market-defense-radar.ts

import type { Configuration } from "@shared/schema";
import type { MarketDefenseAlert, ItemTrace, UCRSectionID } from "@shared/module.contract";
import { getProvider } from "../providers";
import { validateModuleExecution, createExecutionContext } from "../execution-gateway";

interface DefenseSignal {
  type: "keyword_shift" | "landing_page" | "paid_surge" | "backlink_velocity" | "serp_capture";
  competitor: string;
  rawData: unknown;
  detectedAt: Date;
}

export async function runMarketDefenseRadar(
  config: Configuration,
  options: {
    lookbackDays?: number;
    minSignalStrength?: string;
    includeTier3?: boolean;
  } = {}
): Promise<{
  alerts: MarketDefenseAlert[];
  summary: {
    totalAlerts: number;
    criticalCount: number;
    topThreat: string | null;
    recommendedImmediateAction: string | null;
  };
  trace: {
    sectionsUsed: UCRSectionID[];
    rulesTriggered: string[];
    executedAt: string;
  };
}> {
  const { lookbackDays = 30, minSignalStrength = "moderate", includeTier3 = false } = options;
  
  // 1. Validate UCR
  const validation = validateModuleExecution(config, "strategic.market_defense_radar.v1");
  if (!validation.canExecute) {
    throw new Error(`Cannot execute: ${validation.errors.join(", ")}`);
  }
  
  // 2. Extract competitors from UCR
  const competitors = config.competitors?.competitors || [];
  const targetCompetitors = competitors.filter(c => 
    includeTier3 ? true : (c.tier === "tier1" || c.tier === "tier2")
  );
  
  // 3. Gather signals from multiple sources
  const signals: DefenseSignal[] = [];
  
  // 3a. Keyword overlap changes (DataForSEO/Ahrefs)
  const keywordSignals = await detectKeywordShifts(config, targetCompetitors, lookbackDays);
  signals.push(...keywordSignals);
  
  // 3b. SERP feature changes
  const serpSignals = await detectSerpFeatureCapture(config, targetCompetitors, lookbackDays);
  signals.push(...serpSignals);
  
  // 3c. Backlink velocity (Ahrefs)
  const backlinkSignals = await detectBacklinkVelocity(config, targetCompetitors, lookbackDays);
  signals.push(...backlinkSignals);
  
  // 4. Score and classify signals
  const alerts = await classifySignalsToAlerts(signals, config, minSignalStrength);
  
  // 5. Generate summary
  const criticalAlerts = alerts.filter(a => a.signalStrength === "critical");
  const summary = {
    totalAlerts: alerts.length,
    criticalCount: criticalAlerts.length,
    topThreat: criticalAlerts[0]?.competitor || null,
    recommendedImmediateAction: criticalAlerts[0]?.recommendedActions[0]?.action || null
  };
  
  return {
    alerts,
    summary,
    trace: {
      sectionsUsed: ["A", "B", "C", "D"] as UCRSectionID[],
      rulesTriggered: signals.map(s => `SIGNAL_${s.type.toUpperCase()}`),
      executedAt: new Date().toISOString()
    }
  };
}

// Helper functions (implementar según providers disponibles)
async function detectKeywordShifts(config: Configuration, competitors: any[], lookbackDays: number): Promise<DefenseSignal[]> {
  // Usar DataForSEO/Ahrefs para detectar cambios en keyword overlap
  // Comparar snapshot actual vs snapshot de hace lookbackDays
  return [];
}

async function detectSerpFeatureCapture(config: Configuration, competitors: any[], lookbackDays: number): Promise<DefenseSignal[]> {
  // Detectar cuando competidores capturan featured snippets, PAA, etc.
  return [];
}

async function detectBacklinkVelocity(config: Configuration, competitors: any[], lookbackDays: number): Promise<DefenseSignal[]> {
  // Usar Ahrefs para detectar picos de backlinks
  return [];
}

async function classifySignalsToAlerts(signals: DefenseSignal[], config: Configuration, minStrength: string): Promise<MarketDefenseAlert[]> {
  // Clasificar señales en alertas con scoring
  return [];
}
```

### 1.4 API Routes

```typescript
// server/routes.ts - Agregar endpoints

// GET /api/market-defense/alerts
app.get("/api/market-defense/alerts", requireAuth, async (req, res) => {
  const userId = req.user?.id;
  const { configurationId, status } = req.query;
  
  const alerts = await storage.getMarketDefenseAlerts(userId, {
    configurationId: configurationId ? Number(configurationId) : undefined,
    status: status as string
  });
  
  res.json(alerts);
});

// POST /api/market-defense/run
app.post("/api/market-defense/run", requireAuth, async (req, res) => {
  const userId = req.user?.id;
  const { configurationId, options } = req.body;
  
  const config = await storage.getConfigurationById(configurationId, userId);
  if (!config) {
    return res.status(404).json({ error: "Configuration not found" });
  }
  
  const result = await runMarketDefenseRadar(config, options);
  
  // Persist alerts
  for (const alert of result.alerts) {
    await storage.createMarketDefenseAlert(userId, configurationId, alert);
  }
  
  res.json(result);
});

// PATCH /api/market-defense/alerts/:id/acknowledge
app.patch("/api/market-defense/alerts/:id/acknowledge", requireAuth, async (req, res) => {
  const userId = req.user?.id;
  const alertId = Number(req.params.id);
  
  const alert = await storage.acknowledgeMarketDefenseAlert(alertId, userId);
  res.json(alert);
});
```

### 1.5 UI Component

```tsx
// client/src/pages/market-defense.tsx

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, TrendingUp, Eye } from "lucide-react";

export default function MarketDefensePage() {
  const [selectedConfig, setSelectedConfig] = useState<number | null>(null);
  
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["/api/market-defense/alerts", selectedConfig],
    enabled: !!selectedConfig
  });
  
  const runScan = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/market-defense/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configurationId: selectedConfig })
      });
      return res.json();
    }
  });
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Market Defense Radar™</h1>
      </div>
      
      {/* Alert Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard 
          title="Critical Alerts" 
          value={alerts?.filter(a => a.signalStrength === "critical").length || 0}
          icon={<AlertTriangle className="text-red-500" />}
          variant="danger"
        />
        {/* ... más cards */}
      </div>
      
      {/* Threat Matrix Heatmap */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Threat Matrix by Competitor</CardTitle>
        </CardHeader>
        <CardContent>
          <ThreatMatrixHeatmap alerts={alerts || []} />
        </CardContent>
      </Card>
      
      {/* Active Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertsTable alerts={alerts || []} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

# 2️⃣ Competitive Budget Simulator

## Concepto Mejorado x10

**De**: Calculadora de presupuesto simple  
**A**: **Simulador de escenarios competitivos con modelado de elasticidad, análisis de moat y recomendaciones de arbitraje canal-por-canal**

### Modelo de Simulación

```typescript
interface BudgetSimulationInput {
  // Target segment
  segment: string; // "Recovery Footwear Keywords"
  targetCompetitor: string;
  
  // Market data (auto-populated from UCR + providers)
  marketData: {
    totalAddressableVolume: number;
    currentClientShare: number;
    competitorShare: number;
    avgCPC: number;
    avgKeywordDifficulty: number;
    serpVolatility: number; // How often rankings change
  };
  
  // Competitor intelligence
  competitorIntel: {
    estimatedMonthlySpend: number;
    domainAuthority: number;
    contentVelocity: number; // Pages/month
    backlinkVelocity: number; // Links/month
  };
  
  // Client capabilities (from UCR)
  clientCapabilities: {
    currentDomainAuthority: number;
    contentCapacity: number;
    seoMaturity: "nascent" | "developing" | "advanced";
    brandMoat: number; // 0-1 score
  };
}

interface BudgetSimulationOutput {
  // Core recommendation
  recommendation: "ATTACK" | "DEFEND" | "AVOID" | "DIFFERENTIATE";
  confidenceLevel: number;
  
  // Financial projections (NEVER promise revenue)
  projections: {
    monthlySpendRequired: number;
    expectedPaybackMonths: number;
    riskLevel: "low" | "medium" | "high" | "very_high";
    breakEvenProbability: number;
  };
  
  // Channel-by-channel breakdown
  channelBreakdown: {
    channel: "seo" | "paid_search" | "content" | "link_building";
    recommendedSpend: number;
    expectedImpact: string;
    timeToImpact: string;
    competitorAdvantage: number; // -1 to 1
  }[];
  
  // Alternative strategies
  alternatives: {
    strategy: string;
    description: string;
    estimatedSpend: number;
    expectedOutcome: string;
    riskLevel: string;
  }[];
  
  // CMO-safe framing
  executiveSummary: string;
  keyInsight: string;
  recommendedNextStep: string;
  
  // Trace
  assumptions: string[];
  dataSources: string[];
  trace: ItemTrace[];
}
```

### Implementación Técnica

```typescript
// server/modules/competitive-budget-simulator.ts

export async function runBudgetSimulation(
  config: Configuration,
  input: {
    segment: string;
    targetCompetitor: string;
    scenarioType?: "aggressive" | "moderate" | "conservative";
  }
): Promise<BudgetSimulationOutput> {
  // 1. Gather market data from providers
  const marketData = await gatherMarketData(config, input.segment);
  
  // 2. Estimate competitor spend (heuristic based on visibility)
  const competitorIntel = await estimateCompetitorIntel(
    config, 
    input.targetCompetitor,
    input.segment
  );
  
  // 3. Extract client capabilities from UCR
  const clientCapabilities = extractClientCapabilities(config);
  
  // 4. Run simulation model
  const simulation = runSimulationModel({
    marketData,
    competitorIntel,
    clientCapabilities,
    scenarioType: input.scenarioType || "moderate"
  });
  
  // 5. Generate alternatives
  const alternatives = generateAlternativeStrategies(simulation, config);
  
  // 6. Frame for CMO
  const framing = generateExecutiveFraming(simulation, alternatives);
  
  return {
    recommendation: simulation.recommendation,
    confidenceLevel: simulation.confidence,
    projections: simulation.projections,
    channelBreakdown: simulation.channelBreakdown,
    alternatives,
    ...framing,
    assumptions: simulation.assumptions,
    dataSources: ["DataForSEO", "Ahrefs", "Internal"],
    trace: simulation.trace
  };
}

function runSimulationModel(input: SimulationModelInput): SimulationResult {
  // Modelo basado en:
  // 1. Share of Voice gap
  // 2. Authority gap (DA difference)
  // 3. Content velocity required
  // 4. Estimated time to parity
  
  const authorityGap = input.competitorIntel.domainAuthority - input.clientCapabilities.currentDomainAuthority;
  const shareGap = input.competitorIntel.share - input.marketData.currentClientShare;
  
  // Heuristic: $10k/month per 10 DA points to close
  const daClosingCost = Math.max(0, authorityGap) * 1000;
  
  // Heuristic: $5k/month per 1% share to capture
  const shareCaptureCost = Math.max(0, shareGap) * 5000;
  
  const monthlySpendRequired = daClosingCost + shareCaptureCost;
  
  // Risk assessment
  let riskLevel: "low" | "medium" | "high" | "very_high";
  if (authorityGap > 30 || monthlySpendRequired > 500000) {
    riskLevel = "very_high";
  } else if (authorityGap > 20 || monthlySpendRequired > 200000) {
    riskLevel = "high";
  } else if (authorityGap > 10 || monthlySpendRequired > 50000) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }
  
  // Recommendation logic
  let recommendation: "ATTACK" | "DEFEND" | "AVOID" | "DIFFERENTIATE";
  if (riskLevel === "very_high") {
    recommendation = "AVOID";
  } else if (riskLevel === "high" && input.clientCapabilities.brandMoat > 0.6) {
    recommendation = "DIFFERENTIATE";
  } else if (riskLevel === "low" || riskLevel === "medium") {
    recommendation = "ATTACK";
  } else {
    recommendation = "DEFEND";
  }
  
  return {
    recommendation,
    confidence: calculateConfidence(input),
    projections: {
      monthlySpendRequired,
      expectedPaybackMonths: calculatePayback(monthlySpendRequired, shareGap),
      riskLevel,
      breakEvenProbability: calculateBreakEvenProbability(riskLevel)
    },
    channelBreakdown: generateChannelBreakdown(monthlySpendRequired, input),
    assumptions: [
      `Authority gap: ${authorityGap} points`,
      `Share gap: ${shareGap}%`,
      `Competitor estimated spend: $${input.competitorIntel.estimatedMonthlySpend}/mo`
    ],
    trace: []
  };
}
```

---

# 3️⃣ Positioning Stress Test™

## Concepto Mejorado x10

**De**: Análisis de vulnerabilidad básico  
**A**: **War-gaming automatizado que simula ataques competitivos reales y mide la resiliencia de cada claim del posicionamiento**

### Escenarios de Ataque Simulados

```typescript
interface StressTestScenario {
  id: string;
  name: string;
  description: string;
  attackVector: "copy_message" | "outspend" | "new_entrant" | "price_war" | "feature_parity" | "narrative_hijack";
  severity: "mild" | "moderate" | "severe" | "existential";
}

const STRESS_SCENARIOS: StressTestScenario[] = [
  {
    id: "copy_message",
    name: "Message Copying",
    description: "A tier-1 competitor copies your exact messaging",
    attackVector: "copy_message",
    severity: "moderate"
  },
  {
    id: "outspend_10x",
    name: "10x Budget Attack",
    description: "Competitor allocates 10x your budget to your category",
    attackVector: "outspend",
    severity: "severe"
  },
  {
    id: "new_entrant_vc",
    name: "VC-Backed New Entrant",
    description: "Well-funded startup enters with better storytelling",
    attackVector: "new_entrant",
    severity: "severe"
  },
  {
    id: "recession",
    name: "Demand Contraction",
    description: "Category demand drops 30% due to economic conditions",
    attackVector: "price_war",
    severity: "existential"
  }
];
```

### Output del Stress Test

```typescript
interface PositioningStressTestResult {
  // Overall resilience score
  overallResilienceScore: number; // 0-100
  resilienceGrade: "A" | "B" | "C" | "D" | "F";
  
  // Per-claim analysis
  claimAnalysis: {
    claim: string; // "The Most Comfortable Shoe"
    source: "tagline" | "category_definition" | "demand_theme";
    
    // Vulnerability assessment
    vulnerabilityScore: number; // 0-100 (higher = more vulnerable)
    vulnerabilityLevel: "low" | "medium" | "high" | "critical";
    
    // Scenario results
    scenarioResults: {
      scenarioId: string;
      survives: boolean;
      impactDescription: string;
      mitigationRequired: string;
    }[];
    
    // Recommendations
    recommendation: "KEEP" | "STRENGTHEN" | "REPLACE" | "ABANDON";
    suggestedAlternative?: string;
    proofRequired?: string[];
  }[];
  
  // Defensible claims identified
  defensibleClaims: {
    claim: string;
    whyDefensible: string;
    proofPoints: string[];
  }[];
  
  // Critical gaps
  criticalGaps: {
    gap: string;
    risk: string;
    urgency: "immediate" | "short_term" | "medium_term";
    suggestedAction: string;
  }[];
  
  // Executive summary
  executiveSummary: string;
  topPriority: string;
  
  trace: ItemTrace[];
}
```

### Implementación

```typescript
// server/modules/positioning-stress-test.ts

export async function runPositioningStressTest(
  config: Configuration,
  options: {
    scenarios?: string[]; // Specific scenarios to run
    includeCompetitorBenchmark?: boolean;
  } = {}
): Promise<PositioningStressTestResult> {
  // 1. Extract claims from UCR
  const claims = extractPositioningClaims(config);
  
  // 2. Get competitive context
  const competitorPositioning = await analyzeCompetitorPositioning(config);
  
  // 3. Run each claim through stress scenarios
  const claimAnalysis = await Promise.all(
    claims.map(claim => stressTestClaim(claim, competitorPositioning, config))
  );
  
  // 4. Calculate overall resilience
  const overallScore = calculateOverallResilience(claimAnalysis);
  
  // 5. Identify defensible claims
  const defensibleClaims = claimAnalysis
    .filter(c => c.vulnerabilityLevel === "low")
    .map(c => ({
      claim: c.claim,
      whyDefensible: c.scenarioResults.find(s => s.survives)?.impactDescription || "Unique positioning",
      proofPoints: c.proofRequired || []
    }));
  
  // 6. Identify critical gaps
  const criticalGaps = claimAnalysis
    .filter(c => c.vulnerabilityLevel === "critical")
    .map(c => ({
      gap: c.claim,
      risk: `Vulnerable to ${c.scenarioResults.filter(s => !s.survives).length} attack scenarios`,
      urgency: "immediate" as const,
      suggestedAction: c.suggestedAlternative || "Develop proof points"
    }));
  
  return {
    overallResilienceScore: overallScore,
    resilienceGrade: scoreToGrade(overallScore),
    claimAnalysis,
    defensibleClaims,
    criticalGaps,
    executiveSummary: generateStressTestSummary(overallScore, criticalGaps),
    topPriority: criticalGaps[0]?.suggestedAction || "Maintain current positioning",
    trace: []
  };
}

function extractPositioningClaims(config: Configuration): string[] {
  const claims: string[] = [];
  
  // From brand tagline
  if (config.brand?.tagline) {
    claims.push(config.brand.tagline);
  }
  
  // From category definition
  if (config.category_definition?.primary_category) {
    claims.push(`Leader in ${config.category_definition.primary_category}`);
  }
  
  // From demand themes
  const themes = config.demand_definition?.demand_themes || [];
  for (const theme of themes) {
    if (theme.priority === "high") {
      claims.push(`${theme.name} authority`);
    }
  }
  
  return claims;
}

async function stressTestClaim(
  claim: string,
  competitorPositioning: CompetitorPositioning[],
  config: Configuration
): Promise<ClaimAnalysis> {
  const scenarioResults = [];
  
  for (const scenario of STRESS_SCENARIOS) {
    const result = simulateScenario(claim, scenario, competitorPositioning, config);
    scenarioResults.push(result);
  }
  
  const failedScenarios = scenarioResults.filter(r => !r.survives).length;
  const vulnerabilityScore = (failedScenarios / STRESS_SCENARIOS.length) * 100;
  
  return {
    claim,
    source: "tagline",
    vulnerabilityScore,
    vulnerabilityLevel: scoreToVulnerabilityLevel(vulnerabilityScore),
    scenarioResults,
    recommendation: getClaimRecommendation(vulnerabilityScore),
    suggestedAlternative: vulnerabilityScore > 70 ? generateAlternativeClaim(claim, config) : undefined,
    proofRequired: vulnerabilityScore > 50 ? generateProofRequirements(claim) : undefined
  };
}
```

---

# 4️⃣ Strategic Move Generator

## Concepto Mejorado x10

**De**: Sugerencias genéricas de estrategia  
**A**: **Motor de decisiones que genera movimientos estratégicos priorizados con análisis de second-order effects y probabilidad de éxito**

### Tipos de Movimientos Estratégicos

```typescript
type StrategicMoveType = 
  | "category_defense"      // Proteger territorio actual
  | "category_expansion"    // Expandir a categoría adyacente
  | "competitor_attack"     // Atacar debilidad de competidor
  | "narrative_ownership"   // Capturar narrativa de mercado
  | "channel_arbitrage"     // Explotar canal sub-utilizado
  | "partnership_play"      // Alianza estratégica
  | "product_moat"          // Crear barrera de producto
  | "audience_expansion"    // Nuevo segmento de audiencia
  | "geographic_expansion"  // Nuevo mercado geográfico
  | "pricing_play";         // Estrategia de pricing

interface StrategicMove {
  id: string;
  type: StrategicMoveType;
  
  // Core description
  title: string;
  description: string;
  strategicRationale: string;
  
  // Impact assessment
  expectedImpact: {
    revenueImpact: string; // "$15-25M ARR potential" (directional only)
    marketShareImpact: string;
    brandEquityImpact: string;
    timeToImpact: string;
  };
  
  // Feasibility
  feasibility: {
    score: number; // 0-100
    resourcesRequired: string;
    capabilitiesRequired: string[];
    riskFactors: string[];
  };
  
  // Second-order effects
  secondOrderEffects: {
    effect: string;
    likelihood: "low" | "medium" | "high";
    impact: "positive" | "negative" | "neutral";
  }[];
  
  // Competitive response prediction
  competitorResponse: {
    likelyResponse: string;
    responseTime: string;
    counterStrategy: string;
  };
  
  // Execution roadmap
  executionRoadmap: {
    phase: string;
    duration: string;
    keyMilestones: string[];
    successMetrics: string[];
  }[];
  
  // CMO-safe framing
  boardPitch: string; // One-liner for board
  cmoDecision: string; // What the CMO needs to decide
  
  // Priority
  priorityScore: number; // 1-100
  priorityRationale: string;
  
  trace: ItemTrace[];
}
```

### Implementación

```typescript
// server/modules/strategic-move-generator.ts

export async function generateStrategicMoves(
  config: Configuration,
  options: {
    maxMoves?: number;
    focusAreas?: StrategicMoveType[];
    riskTolerance?: "conservative" | "moderate" | "aggressive";
  } = {}
): Promise<{
  moves: StrategicMove[];
  topRecommendation: StrategicMove;
  summary: {
    totalMovesGenerated: number;
    highPriorityCount: number;
    quickWinsCount: number;
    bigBetsCount: number;
  };
  trace: ItemTrace[];
}> {
  const { maxMoves = 5, riskTolerance = "moderate" } = options;
  
  // 1. Analyze current position from UCR
  const currentPosition = analyzeCurrentPosition(config);
  
  // 2. Identify opportunities from existing analyses
  const opportunities = await gatherOpportunities(config);
  
  // 3. Generate candidate moves
  const candidateMoves = generateCandidateMoves(currentPosition, opportunities, config);
  
  // 4. Score and prioritize
  const scoredMoves = candidateMoves.map(move => ({
    ...move,
    priorityScore: calculateMovePriority(move, config, riskTolerance)
  }));
  
  // 5. Filter by risk tolerance
  const filteredMoves = filterByRiskTolerance(scoredMoves, riskTolerance);
  
  // 6. Select top moves
  const topMoves = filteredMoves
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, maxMoves);
  
  // 7. Enrich with second-order effects and competitor response
  const enrichedMoves = await Promise.all(
    topMoves.map(move => enrichMoveWithAnalysis(move, config))
  );
  
  return {
    moves: enrichedMoves,
    topRecommendation: enrichedMoves[0],
    summary: {
      totalMovesGenerated: candidateMoves.length,
      highPriorityCount: enrichedMoves.filter(m => m.priorityScore > 70).length,
      quickWinsCount: enrichedMoves.filter(m => m.feasibility.score > 80 && m.expectedImpact.timeToImpact === "0-3 months").length,
      bigBetsCount: enrichedMoves.filter(m => m.feasibility.score < 50 && m.priorityScore > 80).length
    },
    trace: []
  };
}

function generateCandidateMoves(
  position: CurrentPosition,
  opportunities: Opportunity[],
  config: Configuration
): StrategicMove[] {
  const moves: StrategicMove[] = [];
  
  // Category Defense moves
  if (position.categoryThreats.length > 0) {
    moves.push({
      id: `defense_${Date.now()}`,
      type: "category_defense",
      title: `Defend ${config.category_definition?.primary_category}`,
      description: `Lock down ${position.categoryThreats[0].segment} before competitor entry`,
      strategicRationale: `Threat detected: ${position.categoryThreats[0].competitor} showing intent signals`,
      // ... rest of move properties
    });
  }
  
  // Category Expansion moves
  const adjacentCategories = identifyAdjacentCategories(config);
  for (const category of adjacentCategories.slice(0, 2)) {
    moves.push({
      id: `expansion_${category.name}_${Date.now()}`,
      type: "category_expansion",
      title: `Expand into ${category.name}`,
      description: `Leverage existing authority to capture ${category.name} demand`,
      strategicRationale: `${category.overlapScore}% keyword overlap with current positioning`,
      // ... rest of move properties
    });
  }
  
  // Narrative Ownership moves
  const unownedNarratives = identifyUnownedNarratives(config, opportunities);
  for (const narrative of unownedNarratives.slice(0, 2)) {
    moves.push({
      id: `narrative_${narrative.id}_${Date.now()}`,
      type: "narrative_ownership",
      title: `Own "${narrative.name}" narrative`,
      description: `Become the definitive voice for ${narrative.name}`,
      strategicRationale: `No clear owner, ${narrative.searchVolume} monthly searches`,
      // ... rest of move properties
    });
  }
  
  return moves;
}
```

---

# 5️⃣ Board-Ready Strategy Brief Generator

## Concepto Mejorado x10

**De**: Generador de resúmenes básico  
**A**: **Sistema de síntesis ejecutiva que convierte cualquier análisis en formato de decisión de board con opciones, riesgos y recomendación clara**

### Formato de Brief

```typescript
interface BoardStrategyBrief {
  // Header
  id: string;
  title: string;
  preparedFor: string; // "Board of Directors" | "Executive Team" | "CMO"
  preparedBy: string;
  date: string;
  confidentiality: "internal" | "board_only" | "public";
  
  // Executive Summary (5 bullets max)
  executiveSummary: {
    situation: string;
    challenge: string;
    recommendation: string;
    impact: string;
    timeline: string;
  };
  
  // Context (1 paragraph)
  context: {
    marketContext: string;
    competitiveContext: string;
    internalContext: string;
  };
  
  // The Decision Required
  decision: {
    question: string; // "Should we invest $X in Y?"
    deadline: string;
    decisionMaker: string;
    stakeholders: string[];
  };
  
  // Options Analysis
  options: {
    id: "A" | "B" | "C";
    name: string;
    description: string;
    pros: string[];
    cons: string[];
    investment: string;
    expectedOutcome: string;
    riskLevel: "low" | "medium" | "high";
    probability: number; // Success probability
  }[];
  
  // Recommendation
  recommendation: {
    selectedOption: "A" | "B" | "C";
    rationale: string;
    keyAssumptions: string[];
    successMetrics: string[];
  };
  
  // Risk Analysis
  risks: {
    risk: string;
    likelihood: "low" | "medium" | "high";
    impact: "low" | "medium" | "high";
    mitigation: string;
  }[];
  
  // Cost of Inaction
  costOfInaction: {
    description: string;
    quantifiedImpact: string;
    timeframe: string;
  };
  
  // Next Steps
  nextSteps: {
    step: string;
    owner: string;
    deadline: string;
  }[];
  
  // Appendix references
  appendixReferences: {
    title: string;
    type: "analysis" | "data" | "benchmark";
    link: string;
  }[];
  
  // Metadata
  sourceAnalyses: string[]; // IDs of analyses used
  generatedAt: string;
  version: string;
}
```

### Implementación

```typescript
// server/modules/board-brief-generator.ts

export async function generateBoardBrief(
  config: Configuration,
  input: {
    topic: string;
    analysisIds: number[]; // IDs of analyses to synthesize
    audience: "board" | "executive" | "cmo";
    urgency: "routine" | "important" | "critical";
  }
): Promise<BoardStrategyBrief> {
  // 1. Gather source analyses
  const analyses = await gatherSourceAnalyses(input.analysisIds);
  
  // 2. Extract key insights
  const insights = extractKeyInsights(analyses);
  
  // 3. Generate options
  const options = generateOptions(insights, config, input.topic);
  
  // 4. Analyze risks
  const risks = analyzeRisks(options, config);
  
  // 5. Calculate cost of inaction
  const costOfInaction = calculateCostOfInaction(insights, config);
  
  // 6. Generate recommendation
  const recommendation = generateRecommendation(options, risks, costOfInaction);
  
  // 7. Use AI to synthesize executive summary
  const executiveSummary = await synthesizeExecutiveSummary(
    insights,
    options,
    recommendation,
    input.audience
  );
  
  // 8. Generate next steps
  const nextSteps = generateNextSteps(recommendation, input.urgency);
  
  return {
    id: `brief_${Date.now()}`,
    title: `Strategic Brief: ${input.topic}`,
    preparedFor: audienceToLabel(input.audience),
    preparedBy: "Brand Intelligence Platform",
    date: new Date().toISOString().split("T")[0],
    confidentiality: "board_only",
    
    executiveSummary,
    context: generateContext(insights, config),
    decision: generateDecisionFrame(input.topic, recommendation),
    options,
    recommendation,
    risks,
    costOfInaction,
    nextSteps,
    
    appendixReferences: analyses.map(a => ({
      title: a.name,
      type: "analysis",
      link: `/analysis/${a.id}`
    })),
    
    sourceAnalyses: input.analysisIds.map(String),
    generatedAt: new Date().toISOString(),
    version: "1.0"
  };
}

async function synthesizeExecutiveSummary(
  insights: Insight[],
  options: Option[],
  recommendation: Recommendation,
  audience: string
): Promise<ExecutiveSummary> {
  // Use OpenAI/Gemini to synthesize
  const prompt = `
    You are a McKinsey-trained strategy consultant preparing a board brief.
    
    Audience: ${audience}
    
    Key Insights:
    ${insights.map(i => `- ${i.headline}: ${i.detail}`).join("\n")}
    
    Options:
    ${options.map(o => `- Option ${o.id}: ${o.name} - ${o.description}`).join("\n")}
    
    Recommendation: Option ${recommendation.selectedOption}
    
    Generate a 5-bullet executive summary with:
    1. Situation (what's happening)
    2. Challenge (what we need to solve)
    3. Recommendation (what we should do)
    4. Impact (what we expect to achieve)
    5. Timeline (when we need to act)
    
    Each bullet must be ONE sentence, max 20 words.
    Use active voice. Be specific. No jargon.
  `;
  
  const response = await generateWithAI(prompt);
  return parseExecutiveSummary(response);
}
```

---

## Resumen de Implementación

### Priorización por Impacto vs Complejidad

```
                    IMPACTO
                      ↑
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
    │  3. Stress Test │ 1. Defense Radar│
    │     (Medium)    │    (High)       │
    │                 │                 │
    ├─────────────────┼─────────────────┤
    │                 │                 │
    │  5. Board Brief │ 4. Move Gen     │
    │     (Low)       │    (High)       │
    │                 │                 │
    │  2. Budget Sim  │                 │
    │     (Medium)    │                 │
    └─────────────────┴─────────────────┘
                      │
                      └──────────────────→ COMPLEJIDAD
```

### Orden de Implementación Recomendado

| Fase | Funcionalidad | Duración | Dependencias |
|------|---------------|----------|--------------|
| 1 | Board-Ready Brief Generator | 2-3 sem | Ninguna (usa análisis existentes) |
| 2 | Positioning Stress Test | 4-5 sem | UCR completo |
| 3 | Competitive Budget Simulator | 4-5 sem | DataForSEO/Ahrefs |
| 4 | Market Defense Radar | 6-8 sem | Keyword Gap, Ahrefs |
| 5 | Strategic Move Generator | 6-8 sem | Todas las anteriores |

### Archivos a Crear

```
server/
├── modules/
│   ├── market-defense-radar.ts      # Funcionalidad 1
│   ├── competitive-budget-sim.ts    # Funcionalidad 2
│   ├── positioning-stress-test.ts   # Funcionalidad 3
│   ├── strategic-move-generator.ts  # Funcionalidad 4
│   └── board-brief-generator.ts     # Funcionalidad 5

shared/
├── module.contract.ts               # Agregar 5 nuevos contracts
└── schema.ts                        # Agregar tablas para alerts, briefs, etc.

client/src/pages/
├── market-defense.tsx               # UI para Defense Radar
├── budget-simulator.tsx             # UI para Budget Sim
├── stress-test.tsx                  # UI para Stress Test
├── strategic-moves.tsx              # UI para Move Generator
└── board-briefs.tsx                 # UI para Board Briefs
```

---

## Próximos Pasos

1. **Revisar y aprobar** este documento técnico
2. **Priorizar** qué funcionalidad implementar primero
3. **Crear tickets** detallados para cada fase
4. **Comenzar con Board Brief Generator** (menor complejidad, valor inmediato)

¿Procedemos con la implementación de alguna funcionalidad específica?
