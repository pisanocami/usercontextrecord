# Implementation Guide: Market Defense Radar™

> **Feature**: 1 of 5 Strategic Features  
> **Complexity**: Alta  
> **Timeline**: 6-8 semanas  
> **Dependencies**: Keyword Gap Lite, Ahrefs Provider, DataForSEO

---

## Arquitectura del Módulo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MARKET DEFENSE RADAR ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   UCR (Config)                                                              │
│   ├── A: Brand Domain (baseline)                                            │
│   ├── B: Category Fence (signal filtering)                                  │
│   ├── C: Competitors (monitoring targets)                                   │
│   └── G: Negative Scope (noise reduction)                                   │
│                         │                                                   │
│                         ▼                                                   │
│   ┌─────────────────────────────────────────┐                              │
│   │         SIGNAL COLLECTORS               │                              │
│   ├─────────────────────────────────────────┤                              │
│   │  ┌──────────┐  ┌──────────┐  ┌────────┐ │                              │
│   │  │ Keyword  │  │  SERP    │  │Backlink│ │                              │
│   │  │  Shift   │  │ Feature  │  │Velocity│ │                              │
│   │  │ Detector │  │ Capture  │  │Monitor │ │                              │
│   │  └────┬─────┘  └────┬─────┘  └───┬────┘ │                              │
│   └───────┼─────────────┼────────────┼──────┘                              │
│           │             │            │                                      │
│           ▼             ▼            ▼                                      │
│   ┌─────────────────────────────────────────┐                              │
│   │         SIGNAL AGGREGATOR               │                              │
│   │  - Normalize signals                    │                              │
│   │  - Calculate confidence                 │                              │
│   │  - Deduplicate                          │                              │
│   └─────────────────┬───────────────────────┘                              │
│                     │                                                       │
│                     ▼                                                       │
│   ┌─────────────────────────────────────────┐                              │
│   │         ALERT CLASSIFIER                │                              │
│   │  - Score urgency (1-100)                │                              │
│   │  - Classify strength                    │                              │
│   │  - Generate recommendations             │                              │
│   └─────────────────┬───────────────────────┘                              │
│                     │                                                       │
│                     ▼                                                       │
│   ┌─────────────────────────────────────────┐                              │
│   │         ALERT STORAGE                   │                              │
│   │  - PostgreSQL (market_defense_alerts)   │                              │
│   │  - Status tracking                      │                              │
│   │  - Audit trail                          │                              │
│   └─────────────────────────────────────────┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Database Schema (Semana 1)

### 1.1 Crear tabla de alertas

```typescript
// shared/schema.ts - Agregar después de marketDemandAnalyses

// Market Defense Alerts table
export const marketDefenseAlerts = pgTable("market_defense_alerts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  configurationId: integer("configuration_id").notNull(),
  
  // Alert identification
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  competitor: varchar("competitor", { length: 255 }).notNull(),
  competitorTier: varchar("competitor_tier", { length: 20 }).notNull(),
  
  // Scoring
  signalStrength: varchar("signal_strength", { length: 20 }).notNull(),
  confidence: integer("confidence").notNull(),
  urgencyScore: integer("urgency_score").notNull(),
  timeHorizon: varchar("time_horizon", { length: 50 }).notNull(),
  
  // Content
  headline: text("headline").notNull(),
  businessImpact: text("business_impact").notNull(),
  recommendedActions: jsonb("recommended_actions").notNull(),
  evidence: jsonb("evidence").notNull(),
  
  // Status workflow
  status: varchar("status", { length: 20 }).default("active").notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  dismissedAt: timestamp("dismissed_at"),
  dismissReason: text("dismiss_reason"),
  
  // Trace for explainability
  trace: jsonb("trace").notNull(),
  affectedUcrSections: jsonb("affected_ucr_sections").notNull(),
  
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Signal snapshots for historical comparison
export const competitorSignalSnapshots = pgTable("competitor_signal_snapshots", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  configurationId: integer("configuration_id").notNull(),
  competitor: varchar("competitor", { length: 255 }).notNull(),
  
  // Snapshot data
  snapshotType: varchar("snapshot_type", { length: 50 }).notNull(),
  snapshotData: jsonb("snapshot_data").notNull(),
  
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
```

### 1.2 Crear tipos TypeScript

```typescript
// shared/schema.ts - Agregar interfaces

export type AlertType = 
  | "keyword_intent_shift"
  | "serp_feature_capture"
  | "backlink_velocity"
  | "paid_media_surge"
  | "content_velocity"
  | "landing_page_new";

export type SignalStrength = "weak" | "moderate" | "strong" | "critical";
export type TimeHorizon = "immediate" | "3-6_months" | "6-12_months" | "12+_months";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "dismissed";

export interface RecommendedAction {
  action: string;
  priority: "critical" | "high" | "medium" | "low";
  owner: "marketing" | "product" | "sales" | "executive";
  timeframe: string;
  estimatedEffort: string;
}

export interface AlertEvidence {
  dataPoint: string;
  source: string;
  timestamp: string;
  delta: string;
  rawValue?: unknown;
}

export interface MarketDefenseAlertInsert {
  userId: string;
  configurationId: number;
  alertType: AlertType;
  competitor: string;
  competitorTier: string;
  signalStrength: SignalStrength;
  confidence: number;
  urgencyScore: number;
  timeHorizon: TimeHorizon;
  headline: string;
  businessImpact: string;
  recommendedActions: RecommendedAction[];
  evidence: AlertEvidence[];
  trace: ItemTrace[];
  affectedUcrSections: UCRSectionID[];
}

export interface MarketDefenseAlert extends MarketDefenseAlertInsert {
  id: number;
  status: AlertStatus;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  dismissedAt?: Date;
  dismissReason?: string;
  created_at: Date;
  updated_at: Date;
}
```

### 1.3 Migración de base de datos

```bash
# Ejecutar migración
npx drizzle-kit push
```

---

## Fase 2: Module Contract (Semana 1-2)

### 2.1 Agregar contrato al registry

```typescript
// shared/module.contract.ts - Agregar después de CategoryDemandTrendContract

export const MarketDefenseRadarContract: ModuleContract = {
  moduleId: "strategic.market_defense_radar.v1",
  name: "Market Defense Radar",
  category: "Strategic Intelligence",
  layer: "Synthesis",
  version: "contract.v1",

  description: 
    "Early-warning system that detects competitive threats before they become obvious, " +
    "enabling proactive defense through continuous monitoring of keyword shifts, " +
    "SERP feature captures, and backlink velocity changes.",
  
  strategicQuestion: 
    "What competitive moves are happening now that could threaten our market position in 6-12 months?",

  dataSources: ["DataForSEO", "Ahrefs", "Internal"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "low",
    inferenceType: "hybrid"
  },

  caching: {
    cadence: "daily",
    ttlSeconds: 86400,
    bustOnChanges: ["competitor_set", "category_scope"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED", "AI_ANALYSIS_RUN"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "C"],
    optionalSections: ["B", "D", "E", "G"],
    sectionUsage: {
      A: "Client domain for baseline comparison and brand detection",
      B: "Category fence for filtering relevant signals only",
      C: "Competitor domains to monitor (tier1 + tier2)",
      D: "Demand themes for intent shift classification",
      E: "Strategic posture for alert prioritization thresholds",
      G: "Exclusions to reduce false positive noise"
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      {
        name: "lookback_days",
        type: "number",
        required: false,
        default: 30,
        description: "Days to look back for signal comparison",
        constraints: { min: 7, max: 90 }
      },
      {
        name: "min_signal_strength",
        type: "string",
        required: false,
        default: "moderate",
        description: "Minimum signal strength to report",
        constraints: { enum: ["weak", "moderate", "strong", "critical"] }
      },
      {
        name: "include_tier3",
        type: "boolean",
        required: false,
        default: false,
        description: "Include tier3 (aspirational) competitors"
      },
      {
        name: "signal_types",
        type: "string[]",
        required: false,
        default: ["keyword_intent_shift", "serp_feature_capture", "backlink_velocity"],
        description: "Types of signals to monitor"
      }
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
    runTraceFields: ["sectionsUsed", "sectionsMissing", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "defense_alert",
    visuals: [
      { kind: "heatmap", title: "Threat Matrix by Competitor", description: "Signal strength by competitor and type" },
      { kind: "table", title: "Active Alerts", description: "List of current threats requiring attention" },
      { kind: "card", title: "Critical Alert Summary", description: "Top priority items" },
      { kind: "line", title: "Signal Trend", description: "Historical signal strength over time" }
    ],
    summaryFields: [
      "total_alerts",
      "critical_count",
      "top_threat_competitor",
      "recommended_immediate_action"
    ]
  },

  councilRules: {
    ownerCouncil: "Strategic Intelligence",
    supportingCouncils: ["SEO Visibility & Demand", "Competitive Analysis"],
    rulePacks: [
      { packId: "strategic_intel.defense_signals.core", version: "v1", appliesTo: "both" },
      { packId: "seo_visibility.competitor_monitoring", version: "v1", appliesTo: "item" }
    ]
  },

  guardrails: {
    neverPromiseRevenue: true,
    neverDumpRawEntitiesWithoutFraming: true,
    alwaysProvideNextStep: true
  }
};

// Agregar al registry
export const MODULE_CONTRACTS: ModuleContract[] = [
  KeywordGapVisibilityContract,
  CategoryDemandTrendContract,
  MarketDefenseRadarContract, // Nuevo
  // ... otros
];
```

---

## Fase 3: Signal Collectors (Semana 2-4)

### 3.1 Estructura base del módulo

```typescript
// server/modules/market-defense-radar.ts

import type { Configuration } from "@shared/schema";
import type { 
  MarketDefenseAlert, 
  MarketDefenseAlertInsert,
  AlertType,
  SignalStrength,
  TimeHorizon,
  RecommendedAction,
  AlertEvidence
} from "@shared/schema";
import type { ItemTrace, UCRSectionID } from "@shared/module.contract";
import { getProvider } from "../providers";
import { validateModuleExecution, createExecutionContext } from "../execution-gateway";
import { MarketDefenseRadarContract } from "@shared/module.contract";
import { storage } from "../storage";

// Signal types
interface RawSignal {
  type: AlertType;
  competitor: string;
  competitorTier: string;
  detectedAt: Date;
  rawData: unknown;
  confidence: number;
  delta: string;
}

interface ProcessedSignal extends RawSignal {
  strength: SignalStrength;
  urgencyScore: number;
  timeHorizon: TimeHorizon;
  headline: string;
  businessImpact: string;
}

// Module options
export interface DefenseRadarOptions {
  lookbackDays?: number;
  minSignalStrength?: SignalStrength;
  includeTier3?: boolean;
  signalTypes?: AlertType[];
}

// Module result
export interface DefenseRadarResult {
  alerts: MarketDefenseAlertInsert[];
  summary: {
    totalAlerts: number;
    criticalCount: number;
    strongCount: number;
    moderateCount: number;
    topThreatCompetitor: string | null;
    recommendedImmediateAction: string | null;
  };
  signalsByCompetitor: Record<string, ProcessedSignal[]>;
  trace: {
    sectionsUsed: UCRSectionID[];
    sectionsMissing: UCRSectionID[];
    rulesTriggered: string[];
    executedAt: string;
    moduleId: string;
  };
}

/**
 * Main entry point for Market Defense Radar
 */
export async function runMarketDefenseRadar(
  config: Configuration,
  options: DefenseRadarOptions = {}
): Promise<DefenseRadarResult> {
  const {
    lookbackDays = 30,
    minSignalStrength = "moderate",
    includeTier3 = false,
    signalTypes = ["keyword_intent_shift", "serp_feature_capture", "backlink_velocity"]
  } = options;

  // 1. Validate UCR requirements
  const validation = validateModuleExecution(config, MarketDefenseRadarContract.moduleId);
  if (!validation.canExecute) {
    throw new Error(`Cannot execute Market Defense Radar: ${validation.errors.join(", ")}`);
  }

  // 2. Extract competitors from UCR
  const competitors = extractCompetitors(config, includeTier3);
  if (competitors.length === 0) {
    throw new Error("No competitors defined in UCR section C");
  }

  // 3. Collect signals from all sources
  const rawSignals: RawSignal[] = [];

  if (signalTypes.includes("keyword_intent_shift")) {
    const keywordSignals = await collectKeywordShiftSignals(config, competitors, lookbackDays);
    rawSignals.push(...keywordSignals);
  }

  if (signalTypes.includes("serp_feature_capture")) {
    const serpSignals = await collectSerpFeatureSignals(config, competitors, lookbackDays);
    rawSignals.push(...serpSignals);
  }

  if (signalTypes.includes("backlink_velocity")) {
    const backlinkSignals = await collectBacklinkVelocitySignals(config, competitors, lookbackDays);
    rawSignals.push(...backlinkSignals);
  }

  // 4. Process and classify signals
  const processedSignals = rawSignals.map(signal => processSignal(signal, config));

  // 5. Filter by minimum strength
  const strengthOrder: SignalStrength[] = ["weak", "moderate", "strong", "critical"];
  const minStrengthIndex = strengthOrder.indexOf(minSignalStrength);
  const filteredSignals = processedSignals.filter(
    s => strengthOrder.indexOf(s.strength) >= minStrengthIndex
  );

  // 6. Convert to alerts
  const alerts = filteredSignals.map(signal => signalToAlert(signal, config));

  // 7. Group by competitor for summary
  const signalsByCompetitor: Record<string, ProcessedSignal[]> = {};
  for (const signal of filteredSignals) {
    if (!signalsByCompetitor[signal.competitor]) {
      signalsByCompetitor[signal.competitor] = [];
    }
    signalsByCompetitor[signal.competitor].push(signal);
  }

  // 8. Generate summary
  const criticalAlerts = alerts.filter(a => a.signalStrength === "critical");
  const strongAlerts = alerts.filter(a => a.signalStrength === "strong");
  const moderateAlerts = alerts.filter(a => a.signalStrength === "moderate");

  const topThreat = criticalAlerts[0] || strongAlerts[0] || null;

  return {
    alerts,
    summary: {
      totalAlerts: alerts.length,
      criticalCount: criticalAlerts.length,
      strongCount: strongAlerts.length,
      moderateCount: moderateAlerts.length,
      topThreatCompetitor: topThreat?.competitor || null,
      recommendedImmediateAction: topThreat?.recommendedActions[0]?.action || null
    },
    signalsByCompetitor,
    trace: {
      sectionsUsed: validation.sectionsUsed,
      sectionsMissing: validation.sectionsMissing,
      rulesTriggered: rawSignals.map(s => `SIGNAL_${s.type.toUpperCase()}`),
      executedAt: new Date().toISOString(),
      moduleId: MarketDefenseRadarContract.moduleId
    }
  };
}

// Helper: Extract competitors from config
function extractCompetitors(
  config: Configuration, 
  includeTier3: boolean
): Array<{ name: string; domain: string; tier: string }> {
  const competitors = config.competitors?.competitors || [];
  return competitors.filter(c => 
    includeTier3 ? true : (c.tier === "tier1" || c.tier === "tier2")
  );
}
```

### 3.2 Keyword Shift Signal Collector

```typescript
// server/modules/market-defense-radar.ts (continuación)

/**
 * Detect keyword intent shifts by comparing current vs historical overlap
 */
async function collectKeywordShiftSignals(
  config: Configuration,
  competitors: Array<{ name: string; domain: string; tier: string }>,
  lookbackDays: number
): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const clientDomain = config.brand?.domain;
  
  if (!clientDomain) return signals;

  for (const competitor of competitors) {
    try {
      // Get current keyword overlap
      const currentOverlap = await getKeywordOverlap(clientDomain, competitor.domain);
      
      // Get historical snapshot (if exists)
      const historicalSnapshot = await storage.getCompetitorSnapshot(
        config.id,
        competitor.domain,
        "keyword_overlap",
        lookbackDays
      );

      if (historicalSnapshot) {
        const historicalOverlap = historicalSnapshot.snapshotData as KeywordOverlapData;
        
        // Calculate delta
        const overlapDelta = currentOverlap.overlapPercentage - historicalOverlap.overlapPercentage;
        const newKeywordsCount = currentOverlap.keywords.filter(
          k => !historicalOverlap.keywords.includes(k)
        ).length;

        // Detect significant shift
        if (overlapDelta > 10 || newKeywordsCount > 50) {
          signals.push({
            type: "keyword_intent_shift",
            competitor: competitor.name,
            competitorTier: competitor.tier,
            detectedAt: new Date(),
            rawData: {
              currentOverlap: currentOverlap.overlapPercentage,
              historicalOverlap: historicalOverlap.overlapPercentage,
              newKeywords: newKeywordsCount,
              topNewKeywords: currentOverlap.keywords
                .filter(k => !historicalOverlap.keywords.includes(k))
                .slice(0, 10)
            },
            confidence: calculateConfidence(overlapDelta, newKeywordsCount),
            delta: `+${overlapDelta.toFixed(1)}% overlap, ${newKeywordsCount} new keywords`
          });
        }
      }

      // Save current snapshot for future comparison
      await storage.saveCompetitorSnapshot(
        config.id,
        competitor.domain,
        "keyword_overlap",
        currentOverlap
      );

    } catch (error) {
      console.error(`Error collecting keyword signals for ${competitor.domain}:`, error);
    }
  }

  return signals;
}

interface KeywordOverlapData {
  overlapPercentage: number;
  keywords: string[];
  totalClientKeywords: number;
  totalCompetitorKeywords: number;
}

async function getKeywordOverlap(
  clientDomain: string, 
  competitorDomain: string
): Promise<KeywordOverlapData> {
  // Use existing keyword gap provider
  const provider = getProvider("dataforseo");
  
  // This leverages existing infrastructure
  const gapData = await provider.getKeywordGap(clientDomain, competitorDomain, {
    limit: 1000,
    locationCode: 2840, // US
    languageCode: "en"
  });

  const competitorOnlyKeywords = gapData.filter(k => k.competitorPosition > 0 && k.clientPosition === 0);
  const sharedKeywords = gapData.filter(k => k.competitorPosition > 0 && k.clientPosition > 0);

  return {
    overlapPercentage: (sharedKeywords.length / gapData.length) * 100,
    keywords: competitorOnlyKeywords.map(k => k.keyword),
    totalClientKeywords: gapData.filter(k => k.clientPosition > 0).length,
    totalCompetitorKeywords: gapData.filter(k => k.competitorPosition > 0).length
  };
}

function calculateConfidence(overlapDelta: number, newKeywordsCount: number): number {
  // Higher delta and more new keywords = higher confidence
  let confidence = 0.5; // Base
  
  if (overlapDelta > 20) confidence += 0.2;
  else if (overlapDelta > 10) confidence += 0.1;
  
  if (newKeywordsCount > 100) confidence += 0.2;
  else if (newKeywordsCount > 50) confidence += 0.1;
  
  return Math.min(confidence, 0.95);
}
```

### 3.3 SERP Feature Signal Collector

```typescript
// server/modules/market-defense-radar.ts (continuación)

/**
 * Detect when competitors capture SERP features (featured snippets, PAA, etc.)
 */
async function collectSerpFeatureSignals(
  config: Configuration,
  competitors: Array<{ name: string; domain: string; tier: string }>,
  lookbackDays: number
): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  
  // Get category keywords from UCR
  const categoryKeywords = extractCategoryKeywords(config);
  if (categoryKeywords.length === 0) return signals;

  for (const competitor of competitors) {
    try {
      // Check SERP features for category keywords
      const serpFeatures = await checkSerpFeatures(categoryKeywords, competitor.domain);
      
      // Get historical snapshot
      const historicalSnapshot = await storage.getCompetitorSnapshot(
        config.id,
        competitor.domain,
        "serp_features",
        lookbackDays
      );

      if (historicalSnapshot) {
        const historicalFeatures = historicalSnapshot.snapshotData as SerpFeatureData;
        
        // Find newly captured features
        const newFeatures = serpFeatures.features.filter(
          f => !historicalFeatures.features.some(hf => hf.keyword === f.keyword && hf.type === f.type)
        );

        if (newFeatures.length > 0) {
          signals.push({
            type: "serp_feature_capture",
            competitor: competitor.name,
            competitorTier: competitor.tier,
            detectedAt: new Date(),
            rawData: {
              newFeatures,
              totalFeatures: serpFeatures.features.length,
              previousTotal: historicalFeatures.features.length
            },
            confidence: 0.8, // SERP data is reliable
            delta: `+${newFeatures.length} new SERP features captured`
          });
        }
      }

      // Save current snapshot
      await storage.saveCompetitorSnapshot(
        config.id,
        competitor.domain,
        "serp_features",
        serpFeatures
      );

    } catch (error) {
      console.error(`Error collecting SERP signals for ${competitor.domain}:`, error);
    }
  }

  return signals;
}

interface SerpFeatureData {
  features: Array<{
    keyword: string;
    type: "featured_snippet" | "paa" | "local_pack" | "knowledge_panel";
    position: number;
  }>;
}

function extractCategoryKeywords(config: Configuration): string[] {
  const keywords: string[] = [];
  
  // From demand themes
  const themes = config.demand_definition?.demand_themes || [];
  for (const theme of themes) {
    keywords.push(...(theme.keywords || []));
  }
  
  // From category definition
  if (config.category_definition?.primary_category) {
    keywords.push(config.category_definition.primary_category);
  }
  
  return [...new Set(keywords)].slice(0, 50); // Limit to 50 keywords
}

async function checkSerpFeatures(
  keywords: string[], 
  competitorDomain: string
): Promise<SerpFeatureData> {
  // Use DataForSEO SERP API
  const provider = getProvider("dataforseo");
  const features: SerpFeatureData["features"] = [];

  // Batch check keywords
  for (const keyword of keywords.slice(0, 20)) { // Limit API calls
    try {
      const serpData = await provider.getSerpResults(keyword, {
        locationCode: 2840,
        languageCode: "en"
      });

      // Check if competitor owns any features
      if (serpData.featuredSnippet?.domain === competitorDomain) {
        features.push({
          keyword,
          type: "featured_snippet",
          position: 0
        });
      }

      // Check PAA
      const paaOwned = serpData.peopleAlsoAsk?.filter(
        paa => paa.sourceDomain === competitorDomain
      );
      for (const paa of paaOwned || []) {
        features.push({
          keyword,
          type: "paa",
          position: paa.position
        });
      }

    } catch (error) {
      // Continue with other keywords
    }
  }

  return { features };
}
```

### 3.4 Backlink Velocity Signal Collector

```typescript
// server/modules/market-defense-radar.ts (continuación)

/**
 * Detect unusual backlink acquisition velocity
 */
async function collectBacklinkVelocitySignals(
  config: Configuration,
  competitors: Array<{ name: string; domain: string; tier: string }>,
  lookbackDays: number
): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];

  for (const competitor of competitors) {
    try {
      // Get backlink stats from Ahrefs
      const backlinkStats = await getBacklinkStats(competitor.domain);
      
      // Get historical snapshot
      const historicalSnapshot = await storage.getCompetitorSnapshot(
        config.id,
        competitor.domain,
        "backlink_stats",
        lookbackDays
      );

      if (historicalSnapshot) {
        const historicalStats = historicalSnapshot.snapshotData as BacklinkStatsData;
        
        // Calculate velocity
        const newBacklinks = backlinkStats.totalBacklinks - historicalStats.totalBacklinks;
        const newRefDomains = backlinkStats.referringDomains - historicalStats.referringDomains;
        
        // Detect unusual velocity (>20% increase)
        const backlinkGrowthRate = (newBacklinks / historicalStats.totalBacklinks) * 100;
        const refDomainGrowthRate = (newRefDomains / historicalStats.referringDomains) * 100;

        if (backlinkGrowthRate > 20 || refDomainGrowthRate > 15) {
          signals.push({
            type: "backlink_velocity",
            competitor: competitor.name,
            competitorTier: competitor.tier,
            detectedAt: new Date(),
            rawData: {
              currentBacklinks: backlinkStats.totalBacklinks,
              previousBacklinks: historicalStats.totalBacklinks,
              currentRefDomains: backlinkStats.referringDomains,
              previousRefDomains: historicalStats.referringDomains,
              growthRate: backlinkGrowthRate
            },
            confidence: 0.85,
            delta: `+${newBacklinks} backlinks (+${backlinkGrowthRate.toFixed(1)}%), +${newRefDomains} referring domains`
          });
        }
      }

      // Save current snapshot
      await storage.saveCompetitorSnapshot(
        config.id,
        competitor.domain,
        "backlink_stats",
        backlinkStats
      );

    } catch (error) {
      console.error(`Error collecting backlink signals for ${competitor.domain}:`, error);
    }
  }

  return signals;
}

interface BacklinkStatsData {
  totalBacklinks: number;
  referringDomains: number;
  domainRating: number;
  urlRating: number;
}

async function getBacklinkStats(domain: string): Promise<BacklinkStatsData> {
  // Use Ahrefs provider
  const ahrefsProvider = getProvider("ahrefs");
  
  const stats = await ahrefsProvider.getBacklinkStats(domain);
  
  return {
    totalBacklinks: stats.backlinks || 0,
    referringDomains: stats.refdomains || 0,
    domainRating: stats.domain_rating || 0,
    urlRating: stats.url_rating || 0
  };
}
```

### 3.5 Signal Processing and Alert Generation

```typescript
// server/modules/market-defense-radar.ts (continuación)

/**
 * Process raw signal into classified signal with strength and recommendations
 */
function processSignal(signal: RawSignal, config: Configuration): ProcessedSignal {
  // Calculate strength based on signal type and magnitude
  const strength = calculateSignalStrength(signal);
  
  // Calculate urgency score (1-100)
  const urgencyScore = calculateUrgencyScore(signal, strength, config);
  
  // Determine time horizon
  const timeHorizon = determineTimeHorizon(signal, strength);
  
  // Generate headline and impact
  const { headline, businessImpact } = generateSignalFraming(signal, config);

  return {
    ...signal,
    strength,
    urgencyScore,
    timeHorizon,
    headline,
    businessImpact
  };
}

function calculateSignalStrength(signal: RawSignal): SignalStrength {
  const { type, confidence, rawData } = signal;

  switch (type) {
    case "keyword_intent_shift": {
      const data = rawData as { currentOverlap: number; newKeywords: number };
      if (data.newKeywords > 100 && confidence > 0.7) return "critical";
      if (data.newKeywords > 50 || confidence > 0.6) return "strong";
      if (data.newKeywords > 20) return "moderate";
      return "weak";
    }
    
    case "serp_feature_capture": {
      const data = rawData as { newFeatures: any[] };
      if (data.newFeatures.length > 10) return "critical";
      if (data.newFeatures.length > 5) return "strong";
      if (data.newFeatures.length > 2) return "moderate";
      return "weak";
    }
    
    case "backlink_velocity": {
      const data = rawData as { growthRate: number };
      if (data.growthRate > 50) return "critical";
      if (data.growthRate > 30) return "strong";
      if (data.growthRate > 20) return "moderate";
      return "weak";
    }
    
    default:
      return "moderate";
  }
}

function calculateUrgencyScore(
  signal: RawSignal, 
  strength: SignalStrength,
  config: Configuration
): number {
  let score = 50; // Base score

  // Strength multiplier
  const strengthMultiplier: Record<SignalStrength, number> = {
    critical: 1.5,
    strong: 1.2,
    moderate: 1.0,
    weak: 0.7
  };
  score *= strengthMultiplier[strength];

  // Tier multiplier (tier1 competitors are more urgent)
  if (signal.competitorTier === "tier1") score *= 1.3;
  else if (signal.competitorTier === "tier2") score *= 1.1;

  // Confidence multiplier
  score *= (0.5 + signal.confidence * 0.5);

  // Strategic intent adjustment
  const riskTolerance = config.strategic_intent?.risk_tolerance || "moderate";
  if (riskTolerance === "conservative") score *= 1.2;
  else if (riskTolerance === "aggressive") score *= 0.9;

  return Math.min(Math.round(score), 100);
}

function determineTimeHorizon(signal: RawSignal, strength: SignalStrength): TimeHorizon {
  if (strength === "critical") return "immediate";
  if (strength === "strong") return "3-6_months";
  if (strength === "moderate") return "6-12_months";
  return "12+_months";
}

function generateSignalFraming(
  signal: RawSignal, 
  config: Configuration
): { headline: string; businessImpact: string } {
  const category = config.category_definition?.primary_category || "your category";

  switch (signal.type) {
    case "keyword_intent_shift":
      return {
        headline: `${signal.competitor} expanding into ${category}-adjacent keywords`,
        businessImpact: `Risk of losing share in consideration-stage searches. ${signal.delta}`
      };
    
    case "serp_feature_capture":
      return {
        headline: `${signal.competitor} capturing SERP features in ${category}`,
        businessImpact: `Reduced visibility for high-intent queries. ${signal.delta}`
      };
    
    case "backlink_velocity":
      return {
        headline: `${signal.competitor} accelerating authority building`,
        businessImpact: `Potential ranking pressure in 3-6 months. ${signal.delta}`
      };
    
    default:
      return {
        headline: `Competitive signal detected from ${signal.competitor}`,
        businessImpact: signal.delta
      };
  }
}

/**
 * Convert processed signal to alert format
 */
function signalToAlert(
  signal: ProcessedSignal, 
  config: Configuration
): MarketDefenseAlertInsert {
  return {
    userId: "", // Will be set by caller
    configurationId: config.id,
    alertType: signal.type,
    competitor: signal.competitor,
    competitorTier: signal.competitorTier,
    signalStrength: signal.strength,
    confidence: Math.round(signal.confidence * 100),
    urgencyScore: signal.urgencyScore,
    timeHorizon: signal.timeHorizon,
    headline: signal.headline,
    businessImpact: signal.businessImpact,
    recommendedActions: generateRecommendedActions(signal, config),
    evidence: [
      {
        dataPoint: signal.delta,
        source: getSignalSource(signal.type),
        timestamp: signal.detectedAt.toISOString(),
        delta: signal.delta,
        rawValue: signal.rawData
      }
    ],
    trace: generateSignalTrace(signal),
    affectedUcrSections: getAffectedSections(signal.type)
  };
}

function generateRecommendedActions(
  signal: ProcessedSignal, 
  config: Configuration
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  switch (signal.type) {
    case "keyword_intent_shift":
      actions.push({
        action: "Audit content coverage for newly contested keywords",
        priority: signal.strength === "critical" ? "critical" : "high",
        owner: "marketing",
        timeframe: "1-2 weeks",
        estimatedEffort: "Medium"
      });
      actions.push({
        action: "Create defensive content for high-value gap keywords",
        priority: "high",
        owner: "marketing",
        timeframe: "2-4 weeks",
        estimatedEffort: "High"
      });
      break;

    case "serp_feature_capture":
      actions.push({
        action: "Optimize existing content for featured snippet capture",
        priority: signal.strength === "critical" ? "critical" : "high",
        owner: "marketing",
        timeframe: "1-2 weeks",
        estimatedEffort: "Medium"
      });
      actions.push({
        action: "Add structured data markup to key pages",
        priority: "medium",
        owner: "marketing",
        timeframe: "2-3 weeks",
        estimatedEffort: "Low"
      });
      break;

    case "backlink_velocity":
      actions.push({
        action: "Accelerate link building outreach program",
        priority: signal.strength === "critical" ? "critical" : "high",
        owner: "marketing",
        timeframe: "Ongoing",
        estimatedEffort: "High"
      });
      actions.push({
        action: "Analyze competitor's new backlink sources for opportunities",
        priority: "medium",
        owner: "marketing",
        timeframe: "1 week",
        estimatedEffort: "Low"
      });
      break;
  }

  return actions;
}

function getSignalSource(type: AlertType): string {
  switch (type) {
    case "keyword_intent_shift": return "DataForSEO Keyword Gap";
    case "serp_feature_capture": return "DataForSEO SERP API";
    case "backlink_velocity": return "Ahrefs Backlink Stats";
    default: return "Internal Analysis";
  }
}

function generateSignalTrace(signal: ProcessedSignal): ItemTrace[] {
  return [
    {
      ruleId: `SIGNAL_${signal.type.toUpperCase()}`,
      ucrSection: "C" as UCRSectionID,
      reason: `Detected ${signal.type} from competitor ${signal.competitor}`,
      severity: signal.strength === "critical" ? "critical" : 
               signal.strength === "strong" ? "high" : "medium",
      evidence: signal.delta
    }
  ];
}

function getAffectedSections(type: AlertType): UCRSectionID[] {
  switch (type) {
    case "keyword_intent_shift": return ["B", "C", "D"];
    case "serp_feature_capture": return ["B", "C"];
    case "backlink_velocity": return ["C"];
    default: return ["C"];
  }
}
```

---

## Fase 4: Storage Layer (Semana 4-5)

### 4.1 Agregar métodos al storage

```typescript
// server/storage.ts - Agregar métodos

// Market Defense Alerts
async createMarketDefenseAlert(
  userId: string,
  configurationId: number,
  alert: Omit<MarketDefenseAlertInsert, "userId" | "configurationId">
): Promise<MarketDefenseAlert> {
  const [result] = await db
    .insert(marketDefenseAlerts)
    .values({
      ...alert,
      userId,
      configurationId
    })
    .returning();
  
  return result as MarketDefenseAlert;
}

async getMarketDefenseAlerts(
  userId: string,
  options: {
    configurationId?: number;
    status?: AlertStatus;
    minStrength?: SignalStrength;
    limit?: number;
  } = {}
): Promise<MarketDefenseAlert[]> {
  let query = db
    .select()
    .from(marketDefenseAlerts)
    .where(eq(marketDefenseAlerts.userId, userId))
    .orderBy(desc(marketDefenseAlerts.urgencyScore));

  if (options.configurationId) {
    query = query.where(
      and(
        eq(marketDefenseAlerts.userId, userId),
        eq(marketDefenseAlerts.configurationId, options.configurationId)
      )
    );
  }

  if (options.status) {
    query = query.where(eq(marketDefenseAlerts.status, options.status));
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const results = await query;
  return results as MarketDefenseAlert[];
}

async acknowledgeMarketDefenseAlert(
  alertId: number,
  userId: string
): Promise<MarketDefenseAlert> {
  const [result] = await db
    .update(marketDefenseAlerts)
    .set({
      status: "acknowledged",
      acknowledgedAt: new Date(),
      acknowledgedBy: userId,
      updated_at: new Date()
    })
    .where(
      and(
        eq(marketDefenseAlerts.id, alertId),
        eq(marketDefenseAlerts.userId, userId)
      )
    )
    .returning();
  
  return result as MarketDefenseAlert;
}

async resolveMarketDefenseAlert(
  alertId: number,
  userId: string
): Promise<MarketDefenseAlert> {
  const [result] = await db
    .update(marketDefenseAlerts)
    .set({
      status: "resolved",
      resolvedAt: new Date(),
      resolvedBy: userId,
      updated_at: new Date()
    })
    .where(
      and(
        eq(marketDefenseAlerts.id, alertId),
        eq(marketDefenseAlerts.userId, userId)
      )
    )
    .returning();
  
  return result as MarketDefenseAlert;
}

async dismissMarketDefenseAlert(
  alertId: number,
  userId: string,
  reason: string
): Promise<MarketDefenseAlert> {
  const [result] = await db
    .update(marketDefenseAlerts)
    .set({
      status: "dismissed",
      dismissedAt: new Date(),
      dismissReason: reason,
      updated_at: new Date()
    })
    .where(
      and(
        eq(marketDefenseAlerts.id, alertId),
        eq(marketDefenseAlerts.userId, userId)
      )
    )
    .returning();
  
  return result as MarketDefenseAlert;
}

// Competitor Snapshots
async saveCompetitorSnapshot(
  configurationId: number,
  competitor: string,
  snapshotType: string,
  data: unknown
): Promise<void> {
  await db.insert(competitorSignalSnapshots).values({
    userId: "", // Will be set from context
    configurationId,
    competitor,
    snapshotType,
    snapshotData: data
  });
}

async getCompetitorSnapshot(
  configurationId: number,
  competitor: string,
  snapshotType: string,
  daysAgo: number
): Promise<{ snapshotData: unknown } | null> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

  const results = await db
    .select()
    .from(competitorSignalSnapshots)
    .where(
      and(
        eq(competitorSignalSnapshots.configurationId, configurationId),
        eq(competitorSignalSnapshots.competitor, competitor),
        eq(competitorSignalSnapshots.snapshotType, snapshotType)
      )
    )
    .orderBy(desc(competitorSignalSnapshots.created_at))
    .limit(1);

  if (results.length === 0) return null;
  
  const snapshot = results[0];
  if (new Date(snapshot.created_at) < cutoffDate) {
    return { snapshotData: snapshot.snapshotData };
  }
  
  return null;
}
```

---

## Fase 5: API Routes (Semana 5)

### 5.1 Agregar endpoints

```typescript
// server/routes.ts - Agregar endpoints

import { runMarketDefenseRadar, type DefenseRadarOptions } from "./modules/market-defense-radar";

// GET /api/market-defense/alerts - List alerts
app.get("/api/market-defense/alerts", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { configurationId, status, minStrength, limit } = req.query;

    const alerts = await storage.getMarketDefenseAlerts(userId, {
      configurationId: configurationId ? Number(configurationId) : undefined,
      status: status as AlertStatus | undefined,
      minStrength: minStrength as SignalStrength | undefined,
      limit: limit ? Number(limit) : 50
    });

    res.json(alerts);
  } catch (error) {
    console.error("Error fetching defense alerts:", error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// POST /api/market-defense/run - Run radar scan
app.post("/api/market-defense/run", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { configurationId, options } = req.body as {
      configurationId: number;
      options?: DefenseRadarOptions;
    };

    // Get configuration
    const config = await storage.getConfigurationById(configurationId, userId);
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    // Run radar
    const result = await runMarketDefenseRadar(config, options);

    // Persist alerts
    const savedAlerts = [];
    for (const alert of result.alerts) {
      const saved = await storage.createMarketDefenseAlert(userId, configurationId, alert);
      savedAlerts.push(saved);
    }

    res.json({
      ...result,
      alerts: savedAlerts
    });
  } catch (error) {
    console.error("Error running defense radar:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to run radar" });
  }
});

// PATCH /api/market-defense/alerts/:id/acknowledge
app.patch("/api/market-defense/alerts/:id/acknowledge", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const alertId = Number(req.params.id);
    const alert = await storage.acknowledgeMarketDefenseAlert(alertId, userId);
    
    res.json(alert);
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    res.status(500).json({ error: "Failed to acknowledge alert" });
  }
});

// PATCH /api/market-defense/alerts/:id/resolve
app.patch("/api/market-defense/alerts/:id/resolve", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const alertId = Number(req.params.id);
    const alert = await storage.resolveMarketDefenseAlert(alertId, userId);
    
    res.json(alert);
  } catch (error) {
    console.error("Error resolving alert:", error);
    res.status(500).json({ error: "Failed to resolve alert" });
  }
});

// PATCH /api/market-defense/alerts/:id/dismiss
app.patch("/api/market-defense/alerts/:id/dismiss", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const alertId = Number(req.params.id);
    const { reason } = req.body;
    
    const alert = await storage.dismissMarketDefenseAlert(alertId, userId, reason || "Dismissed by user");
    
    res.json(alert);
  } catch (error) {
    console.error("Error dismissing alert:", error);
    res.status(500).json({ error: "Failed to dismiss alert" });
  }
});

// GET /api/market-defense/summary - Get summary stats
app.get("/api/market-defense/summary", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { configurationId } = req.query;

    const alerts = await storage.getMarketDefenseAlerts(userId, {
      configurationId: configurationId ? Number(configurationId) : undefined,
      status: "active"
    });

    const summary = {
      totalActive: alerts.length,
      critical: alerts.filter(a => a.signalStrength === "critical").length,
      strong: alerts.filter(a => a.signalStrength === "strong").length,
      moderate: alerts.filter(a => a.signalStrength === "moderate").length,
      byCompetitor: groupBy(alerts, "competitor"),
      byType: groupBy(alerts, "alertType"),
      topThreat: alerts.sort((a, b) => b.urgencyScore - a.urgencyScore)[0] || null
    };

    res.json(summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

function groupBy<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
```

---

## Fase 6: UI Components (Semana 6-8)

Ver archivo separado: `IMPLEMENTATION_GUIDE_FEATURE_1_UI.md`

---

## Testing Checklist

- [ ] Unit tests para signal collectors
- [ ] Unit tests para signal processing
- [ ] Integration tests para API endpoints
- [ ] E2E tests para UI flow
- [ ] Performance tests para large competitor sets

---

## Rollout Plan

1. **Week 1**: Deploy schema + contract
2. **Week 2-4**: Deploy signal collectors (feature-flagged)
3. **Week 5**: Deploy API routes
4. **Week 6-7**: Deploy UI
5. **Week 8**: Enable for beta users, gather feedback
