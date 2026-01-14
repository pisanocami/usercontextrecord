# Implementation Guide: Competitive Budget Simulator

> **Feature**: 2 of 5 Strategic Features  
> **Complexity**: Media  
> **Timeline**: 4-5 semanas  
> **Dependencies**: DataForSEO, Ahrefs Provider

---

## Concepto

Simula el costo real de competir contra un rival en un segmento específico **antes** de invertir, evitando quemar presupuesto en guerras perdidas de antemano.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPETITIVE BUDGET SIMULATOR                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   INPUTS                          SIMULATION ENGINE                         │
│   ├── Segment (from UCR)          ├── Market Data Gatherer                  │
│   ├── Target Competitor           ├── Competitor Intel Estimator            │
│   ├── Scenario Type               ├── Cost Model Calculator                 │
│   └── Risk Tolerance              └── ROI Projector                         │
│                                                                             │
│   DATA SOURCES                    OUTPUTS                                   │
│   ├── DataForSEO (CPC, KD)        ├── Recommendation (Attack/Defend/Avoid)  │
│   ├── Ahrefs (DA, Backlinks)      ├── Monthly Spend Required                │
│   ├── UCR (Capabilities)          ├── Expected Payback Period               │
│   └── Historical Analyses         ├── Channel Breakdown                     │
│                                   └── Alternative Strategies                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Types & Interfaces

```typescript
// shared/types/budget-simulator.ts

export type SimulationRecommendation = "ATTACK" | "DEFEND" | "AVOID" | "DIFFERENTIATE";
export type RiskLevel = "low" | "medium" | "high" | "very_high";
export type ScenarioType = "aggressive" | "moderate" | "conservative";

export interface MarketDataInput {
  segment: string;
  totalAddressableVolume: number;
  currentClientShare: number;
  competitorShare: number;
  avgCPC: number;
  avgKeywordDifficulty: number;
  serpVolatility: number;
}

export interface CompetitorIntelInput {
  competitor: string;
  estimatedMonthlySpend: number;
  domainAuthority: number;
  contentVelocity: number;
  backlinkVelocity: number;
  organicTraffic: number;
}

export interface ClientCapabilitiesInput {
  currentDomainAuthority: number;
  contentCapacity: number;
  seoMaturity: "nascent" | "developing" | "advanced";
  brandMoat: number;
  currentOrganicTraffic: number;
}

export interface BudgetSimulationRequest {
  configurationId: number;
  segment: string;
  targetCompetitor: string;
  scenarioType?: ScenarioType;
}

export interface ChannelBreakdown {
  channel: "seo" | "paid_search" | "content" | "link_building";
  recommendedSpend: number;
  percentOfTotal: number;
  expectedImpact: string;
  timeToImpact: string;
  competitorAdvantage: number;
}

export interface AlternativeStrategy {
  id: string;
  strategy: string;
  description: string;
  estimatedSpend: number;
  expectedOutcome: string;
  riskLevel: RiskLevel;
  timeToResults: string;
}

export interface BudgetSimulationResult {
  // Core recommendation
  recommendation: SimulationRecommendation;
  confidenceLevel: number;
  
  // Financial projections
  projections: {
    monthlySpendRequired: number;
    expectedPaybackMonths: number;
    riskLevel: RiskLevel;
    breakEvenProbability: number;
    totalInvestmentYear1: number;
  };
  
  // Channel breakdown
  channelBreakdown: ChannelBreakdown[];
  
  // Alternatives
  alternatives: AlternativeStrategy[];
  
  // CMO-safe framing
  executiveSummary: string;
  keyInsight: string;
  recommendedNextStep: string;
  
  // Inputs used (for transparency)
  inputsUsed: {
    marketData: MarketDataInput;
    competitorIntel: CompetitorIntelInput;
    clientCapabilities: ClientCapabilitiesInput;
  };
  
  // Assumptions
  assumptions: string[];
  dataSources: string[];
  
  // Trace
  trace: ItemTrace[];
  executedAt: string;
}
```

---

## Fase 2: Module Contract

```typescript
// shared/module.contract.ts - Agregar

export const CompetitiveBudgetSimulatorContract: ModuleContract = {
  moduleId: "strategic.competitive_budget_simulator.v1",
  name: "Competitive Budget Simulator",
  category: "Strategic Planning",
  layer: "Synthesis",
  version: "contract.v1",

  description: 
    "Simulates the real cost of competing against a rival in a specific segment, " +
    "providing ROI projections and channel-by-channel recommendations before investment.",
  
  strategicQuestion: 
    "How much would it cost to compete effectively in this segment, and is it worth it?",

  dataSources: ["DataForSEO", "Ahrefs", "Internal"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "medium",
    inferenceType: "hybrid"
  },

  caching: {
    cadence: "weekly",
    ttlSeconds: 604800,
    bustOnChanges: ["competitor_set", "category_scope", "governance"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "C"],
    optionalSections: ["B", "E", "F", "H"],
    sectionUsage: {
      A: "Client domain for baseline metrics",
      B: "Category for segment definition",
      C: "Competitor data for comparison",
      E: "Risk tolerance for scenario selection",
      F: "Channel context for spend allocation",
      H: "Capability model for feasibility assessment"
    },
    gates: {
      fenceMode: "none",
      negativeScopeMode: "none"
    }
  },

  inputs: {
    fields: [
      {
        name: "segment",
        type: "string",
        required: true,
        description: "Market segment to simulate competition in"
      },
      {
        name: "target_competitor",
        type: "string",
        required: true,
        description: "Competitor domain to simulate against"
      },
      {
        name: "scenario_type",
        type: "string",
        required: false,
        default: "moderate",
        constraints: { enum: ["aggressive", "moderate", "conservative"] }
      }
    ]
  },

  disposition: {
    required: false,
    allowed: ["PASS", "REVIEW"],
    hideOutOfPlayByDefault: false
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "evidence"],
    runTraceFields: ["sectionsUsed", "filtersApplied"]
  },

  output: {
    entityType: "budget_simulation",
    visuals: [
      { kind: "card", title: "Recommendation Summary" },
      { kind: "bar", title: "Channel Spend Breakdown" },
      { kind: "table", title: "Alternative Strategies" }
    ],
    summaryFields: [
      "recommendation",
      "monthly_spend_required",
      "payback_months",
      "risk_level"
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

## Fase 3: Core Module Implementation

```typescript
// server/modules/competitive-budget-simulator.ts

import type { Configuration } from "@shared/schema";
import type { 
  BudgetSimulationRequest,
  BudgetSimulationResult,
  MarketDataInput,
  CompetitorIntelInput,
  ClientCapabilitiesInput,
  ChannelBreakdown,
  AlternativeStrategy,
  SimulationRecommendation,
  RiskLevel,
  ScenarioType
} from "@shared/types/budget-simulator";
import type { ItemTrace, UCRSectionID } from "@shared/module.contract";
import { getProvider } from "../providers";
import { validateModuleExecution } from "../execution-gateway";
import { CompetitiveBudgetSimulatorContract } from "@shared/module.contract";

/**
 * Main entry point for Budget Simulation
 */
export async function runBudgetSimulation(
  config: Configuration,
  request: BudgetSimulationRequest
): Promise<BudgetSimulationResult> {
  const { segment, targetCompetitor, scenarioType = "moderate" } = request;

  // 1. Validate UCR
  const validation = validateModuleExecution(config, CompetitiveBudgetSimulatorContract.moduleId);
  if (!validation.canExecute) {
    throw new Error(`Cannot execute: ${validation.errors.join(", ")}`);
  }

  // 2. Gather market data
  const marketData = await gatherMarketData(config, segment, targetCompetitor);

  // 3. Estimate competitor intelligence
  const competitorIntel = await estimateCompetitorIntel(config, targetCompetitor);

  // 4. Extract client capabilities from UCR
  const clientCapabilities = await extractClientCapabilities(config);

  // 5. Run simulation model
  const simulation = runSimulationModel({
    marketData,
    competitorIntel,
    clientCapabilities,
    scenarioType
  });

  // 6. Generate channel breakdown
  const channelBreakdown = generateChannelBreakdown(
    simulation.monthlySpendRequired,
    marketData,
    competitorIntel,
    clientCapabilities
  );

  // 7. Generate alternative strategies
  const alternatives = generateAlternatives(simulation, config, segment);

  // 8. Generate executive framing
  const framing = generateExecutiveFraming(simulation, alternatives, targetCompetitor, segment);

  return {
    recommendation: simulation.recommendation,
    confidenceLevel: simulation.confidence,
    projections: {
      monthlySpendRequired: simulation.monthlySpendRequired,
      expectedPaybackMonths: simulation.paybackMonths,
      riskLevel: simulation.riskLevel,
      breakEvenProbability: simulation.breakEvenProbability,
      totalInvestmentYear1: simulation.monthlySpendRequired * 12
    },
    channelBreakdown,
    alternatives,
    executiveSummary: framing.executiveSummary,
    keyInsight: framing.keyInsight,
    recommendedNextStep: framing.recommendedNextStep,
    inputsUsed: {
      marketData,
      competitorIntel,
      clientCapabilities
    },
    assumptions: simulation.assumptions,
    dataSources: ["DataForSEO", "Ahrefs", "UCR"],
    trace: simulation.trace,
    executedAt: new Date().toISOString()
  };
}

/**
 * Gather market data from providers
 */
async function gatherMarketData(
  config: Configuration,
  segment: string,
  targetCompetitor: string
): Promise<MarketDataInput> {
  const clientDomain = config.brand?.domain;
  if (!clientDomain) throw new Error("Client domain not found in UCR");

  const provider = getProvider("dataforseo");

  // Get keyword data for segment
  const segmentKeywords = await provider.getKeywordsForSegment(segment, {
    locationCode: 2840,
    languageCode: "en",
    limit: 100
  });

  // Calculate metrics
  const totalVolume = segmentKeywords.reduce((sum, k) => sum + (k.searchVolume || 0), 0);
  const avgCPC = segmentKeywords.reduce((sum, k) => sum + (k.cpc || 0), 0) / segmentKeywords.length;
  const avgKD = segmentKeywords.reduce((sum, k) => sum + (k.keywordDifficulty || 0), 0) / segmentKeywords.length;

  // Estimate shares (simplified - would need SERP analysis for accuracy)
  const clientShare = await estimateOrganicShare(clientDomain, segmentKeywords);
  const competitorShare = await estimateOrganicShare(targetCompetitor, segmentKeywords);

  return {
    segment,
    totalAddressableVolume: totalVolume,
    currentClientShare: clientShare,
    competitorShare: competitorShare,
    avgCPC: avgCPC,
    avgKeywordDifficulty: avgKD,
    serpVolatility: 0.3 // Default, could be calculated from historical data
  };
}

async function estimateOrganicShare(domain: string, keywords: any[]): Promise<number> {
  // Simplified share estimation
  // In production, would check SERP positions for each keyword
  const provider = getProvider("dataforseo");
  
  let rankedKeywords = 0;
  for (const kw of keywords.slice(0, 20)) { // Sample
    try {
      const serp = await provider.getSerpResults(kw.keyword, { locationCode: 2840 });
      if (serp.organicResults?.some(r => r.domain?.includes(domain))) {
        rankedKeywords++;
      }
    } catch {
      // Continue
    }
  }
  
  return (rankedKeywords / 20) * 100;
}

/**
 * Estimate competitor intelligence from available data
 */
async function estimateCompetitorIntel(
  config: Configuration,
  targetCompetitor: string
): Promise<CompetitorIntelInput> {
  const ahrefsProvider = getProvider("ahrefs");
  
  // Get backlink stats
  const backlinkStats = await ahrefsProvider.getBacklinkStats(targetCompetitor);
  
  // Get traffic estimate
  const trafficEstimate = await ahrefsProvider.getOrganicTraffic(targetCompetitor);

  // Estimate monthly spend based on DA and traffic
  // Heuristic: $500/month per DA point above 30 + $0.10 per monthly organic visit
  const estimatedSpend = Math.max(0, (backlinkStats.domain_rating - 30) * 500) + 
                         (trafficEstimate.organicTraffic * 0.10);

  // Estimate content velocity from indexed pages growth
  const contentVelocity = await estimateContentVelocity(targetCompetitor);

  return {
    competitor: targetCompetitor,
    estimatedMonthlySpend: Math.round(estimatedSpend),
    domainAuthority: backlinkStats.domain_rating || 0,
    contentVelocity: contentVelocity,
    backlinkVelocity: Math.round((backlinkStats.backlinks || 0) / 12), // Rough monthly
    organicTraffic: trafficEstimate.organicTraffic || 0
  };
}

async function estimateContentVelocity(domain: string): Promise<number> {
  // Simplified - would use site: search or crawl data
  return 10; // Default 10 pages/month
}

/**
 * Extract client capabilities from UCR
 */
async function extractClientCapabilities(
  config: Configuration
): Promise<ClientCapabilitiesInput> {
  const clientDomain = config.brand?.domain;
  if (!clientDomain) throw new Error("Client domain not found");

  const ahrefsProvider = getProvider("ahrefs");
  
  const backlinkStats = await ahrefsProvider.getBacklinkStats(clientDomain);
  const trafficEstimate = await ahrefsProvider.getOrganicTraffic(clientDomain);

  // Get SEO maturity from UCR
  const seoMaturity = config.channel_context?.seo_maturity || "developing";

  // Calculate brand moat from UCR governance
  const brandMoat = calculateBrandMoat(config);

  return {
    currentDomainAuthority: backlinkStats.domain_rating || 0,
    contentCapacity: getContentCapacity(seoMaturity),
    seoMaturity: seoMaturity as "nascent" | "developing" | "advanced",
    brandMoat: brandMoat,
    currentOrganicTraffic: trafficEstimate.organicTraffic || 0
  };
}

function calculateBrandMoat(config: Configuration): number {
  let moat = 0.5; // Base

  // Boost for defined capability model
  if (config.governance?.capability_model?.boosters?.length > 0) {
    moat += 0.1;
  }

  // Boost for clear category definition
  if (config.category_definition?.primary_category) {
    moat += 0.1;
  }

  // Boost for demand themes
  if ((config.demand_definition?.demand_themes?.length || 0) > 3) {
    moat += 0.1;
  }

  return Math.min(moat, 1.0);
}

function getContentCapacity(maturity: string): number {
  switch (maturity) {
    case "advanced": return 20; // 20 pages/month
    case "developing": return 10;
    case "nascent": return 5;
    default: return 10;
  }
}

/**
 * Core simulation model
 */
interface SimulationModelInput {
  marketData: MarketDataInput;
  competitorIntel: CompetitorIntelInput;
  clientCapabilities: ClientCapabilitiesInput;
  scenarioType: ScenarioType;
}

interface SimulationModelOutput {
  recommendation: SimulationRecommendation;
  confidence: number;
  monthlySpendRequired: number;
  paybackMonths: number;
  riskLevel: RiskLevel;
  breakEvenProbability: number;
  assumptions: string[];
  trace: ItemTrace[];
}

function runSimulationModel(input: SimulationModelInput): SimulationModelOutput {
  const { marketData, competitorIntel, clientCapabilities, scenarioType } = input;
  const assumptions: string[] = [];
  const trace: ItemTrace[] = [];

  // 1. Calculate authority gap
  const authorityGap = competitorIntel.domainAuthority - clientCapabilities.currentDomainAuthority;
  assumptions.push(`Authority gap: ${authorityGap} DA points`);

  // 2. Calculate share gap
  const shareGap = marketData.competitorShare - marketData.currentClientShare;
  assumptions.push(`Share gap: ${shareGap.toFixed(1)}%`);

  // 3. Calculate content velocity gap
  const contentGap = competitorIntel.contentVelocity - clientCapabilities.contentCapacity;
  assumptions.push(`Content velocity gap: ${contentGap} pages/month`);

  // 4. Estimate cost to close gaps
  // DA closing: ~$2k/month per DA point (link building + content)
  const daClosingCost = Math.max(0, authorityGap) * 2000;
  
  // Share capture: Based on CPC and required traffic
  const trafficNeeded = (shareGap / 100) * marketData.totalAddressableVolume;
  const shareCaptureCost = trafficNeeded * marketData.avgCPC * 0.1; // 10% of paid equivalent
  
  // Content gap: $500 per additional page/month
  const contentCost = Math.max(0, contentGap) * 500;

  // 5. Apply scenario multiplier
  const scenarioMultiplier: Record<ScenarioType, number> = {
    aggressive: 1.5,
    moderate: 1.0,
    conservative: 0.7
  };
  
  const baseMonthlySpend = daClosingCost + shareCaptureCost + contentCost;
  const monthlySpendRequired = Math.round(baseMonthlySpend * scenarioMultiplier[scenarioType]);

  assumptions.push(`Base monthly spend: $${baseMonthlySpend.toLocaleString()}`);
  assumptions.push(`Scenario multiplier (${scenarioType}): ${scenarioMultiplier[scenarioType]}x`);

  // 6. Calculate risk level
  let riskLevel: RiskLevel;
  if (authorityGap > 30 || monthlySpendRequired > 500000) {
    riskLevel = "very_high";
  } else if (authorityGap > 20 || monthlySpendRequired > 200000) {
    riskLevel = "high";
  } else if (authorityGap > 10 || monthlySpendRequired > 50000) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }

  // 7. Calculate payback period
  // Heuristic: 1 month per $10k investment, adjusted by risk
  const riskMultiplier: Record<RiskLevel, number> = {
    low: 1.0,
    medium: 1.5,
    high: 2.0,
    very_high: 3.0
  };
  const paybackMonths = Math.round((monthlySpendRequired / 10000) * riskMultiplier[riskLevel]);

  // 8. Calculate break-even probability
  const breakEvenProbability = calculateBreakEvenProbability(
    riskLevel,
    clientCapabilities.brandMoat,
    authorityGap
  );

  // 9. Determine recommendation
  let recommendation: SimulationRecommendation;
  
  if (riskLevel === "very_high") {
    recommendation = "AVOID";
    trace.push({
      ruleId: "BUDGET_AVOID",
      ucrSection: "E",
      reason: "Risk level too high for direct competition",
      severity: "high",
      evidence: `Authority gap: ${authorityGap}, Monthly spend: $${monthlySpendRequired.toLocaleString()}`
    });
  } else if (riskLevel === "high" && clientCapabilities.brandMoat > 0.6) {
    recommendation = "DIFFERENTIATE";
    trace.push({
      ruleId: "BUDGET_DIFFERENTIATE",
      ucrSection: "E",
      reason: "High risk but strong brand moat suggests differentiation",
      severity: "medium",
      evidence: `Brand moat: ${clientCapabilities.brandMoat}`
    });
  } else if (breakEvenProbability > 0.6) {
    recommendation = "ATTACK";
    trace.push({
      ruleId: "BUDGET_ATTACK",
      ucrSection: "E",
      reason: "Favorable risk/reward ratio",
      severity: "low",
      evidence: `Break-even probability: ${(breakEvenProbability * 100).toFixed(0)}%`
    });
  } else {
    recommendation = "DEFEND";
    trace.push({
      ruleId: "BUDGET_DEFEND",
      ucrSection: "E",
      reason: "Moderate risk suggests defensive posture",
      severity: "medium"
    });
  }

  // 10. Calculate confidence
  const confidence = calculateSimulationConfidence(input);

  return {
    recommendation,
    confidence,
    monthlySpendRequired,
    paybackMonths,
    riskLevel,
    breakEvenProbability,
    assumptions,
    trace
  };
}

function calculateBreakEvenProbability(
  riskLevel: RiskLevel,
  brandMoat: number,
  authorityGap: number
): number {
  let probability = 0.5; // Base

  // Risk adjustment
  const riskAdjustment: Record<RiskLevel, number> = {
    low: 0.2,
    medium: 0.0,
    high: -0.15,
    very_high: -0.3
  };
  probability += riskAdjustment[riskLevel];

  // Brand moat boost
  probability += (brandMoat - 0.5) * 0.3;

  // Authority gap penalty
  probability -= (authorityGap / 100) * 0.2;

  return Math.max(0.1, Math.min(0.9, probability));
}

function calculateSimulationConfidence(input: SimulationModelInput): number {
  let confidence = 0.6; // Base

  // More data = higher confidence
  if (input.competitorIntel.domainAuthority > 0) confidence += 0.1;
  if (input.marketData.totalAddressableVolume > 0) confidence += 0.1;
  if (input.clientCapabilities.currentDomainAuthority > 0) confidence += 0.1;

  return Math.min(confidence, 0.9);
}

/**
 * Generate channel-by-channel breakdown
 */
function generateChannelBreakdown(
  totalSpend: number,
  marketData: MarketDataInput,
  competitorIntel: CompetitorIntelInput,
  clientCapabilities: ClientCapabilitiesInput
): ChannelBreakdown[] {
  const breakdown: ChannelBreakdown[] = [];

  // SEO (organic optimization)
  const seoPercent = 0.25;
  breakdown.push({
    channel: "seo",
    recommendedSpend: Math.round(totalSpend * seoPercent),
    percentOfTotal: seoPercent * 100,
    expectedImpact: "Improved rankings for target keywords",
    timeToImpact: "3-6 months",
    competitorAdvantage: calculateChannelAdvantage("seo", competitorIntel, clientCapabilities)
  });

  // Content
  const contentPercent = 0.30;
  breakdown.push({
    channel: "content",
    recommendedSpend: Math.round(totalSpend * contentPercent),
    percentOfTotal: contentPercent * 100,
    expectedImpact: "Increased topical authority and traffic",
    timeToImpact: "2-4 months",
    competitorAdvantage: calculateChannelAdvantage("content", competitorIntel, clientCapabilities)
  });

  // Link Building
  const linkPercent = 0.30;
  breakdown.push({
    channel: "link_building",
    recommendedSpend: Math.round(totalSpend * linkPercent),
    percentOfTotal: linkPercent * 100,
    expectedImpact: "Domain authority improvement",
    timeToImpact: "4-8 months",
    competitorAdvantage: calculateChannelAdvantage("link_building", competitorIntel, clientCapabilities)
  });

  // Paid Search (for quick wins)
  const paidPercent = 0.15;
  breakdown.push({
    channel: "paid_search",
    recommendedSpend: Math.round(totalSpend * paidPercent),
    percentOfTotal: paidPercent * 100,
    expectedImpact: "Immediate visibility while organic grows",
    timeToImpact: "Immediate",
    competitorAdvantage: 0 // Neutral - paid is level playing field
  });

  return breakdown;
}

function calculateChannelAdvantage(
  channel: string,
  competitor: CompetitorIntelInput,
  client: ClientCapabilitiesInput
): number {
  switch (channel) {
    case "seo":
      return (client.currentDomainAuthority - competitor.domainAuthority) / 100;
    case "content":
      return (client.contentCapacity - competitor.contentVelocity) / 20;
    case "link_building":
      return (client.currentDomainAuthority - competitor.domainAuthority) / 100;
    default:
      return 0;
  }
}

/**
 * Generate alternative strategies
 */
function generateAlternatives(
  simulation: SimulationModelOutput,
  config: Configuration,
  segment: string
): AlternativeStrategy[] {
  const alternatives: AlternativeStrategy[] = [];

  // Always include "Do Nothing" baseline
  alternatives.push({
    id: "do_nothing",
    strategy: "Maintain Current Position",
    description: "Continue current strategy without additional investment",
    estimatedSpend: 0,
    expectedOutcome: "Gradual share loss to competitor",
    riskLevel: simulation.riskLevel === "very_high" ? "medium" : "high",
    timeToResults: "N/A"
  });

  // Differentiation strategy
  if (simulation.recommendation !== "DIFFERENTIATE") {
    alternatives.push({
      id: "differentiate",
      strategy: "Narrative Differentiation",
      description: "Own a unique angle within the segment rather than compete head-on",
      estimatedSpend: Math.round(simulation.monthlySpendRequired * 0.4),
      expectedOutcome: "Carve out defensible niche position",
      riskLevel: "medium",
      timeToResults: "3-6 months"
    });
  }

  // Adjacent segment strategy
  alternatives.push({
    id: "adjacent",
    strategy: "Adjacent Segment Focus",
    description: "Target related segment with less competition",
    estimatedSpend: Math.round(simulation.monthlySpendRequired * 0.5),
    expectedOutcome: "Establish dominance in adjacent space",
    riskLevel: "low",
    timeToResults: "4-8 months"
  });

  // Partnership strategy
  alternatives.push({
    id: "partnership",
    strategy: "Strategic Partnership",
    description: "Partner with complementary brand to share costs and reach",
    estimatedSpend: Math.round(simulation.monthlySpendRequired * 0.3),
    expectedOutcome: "Shared market presence with reduced risk",
    riskLevel: "low",
    timeToResults: "2-4 months"
  });

  return alternatives;
}

/**
 * Generate executive framing
 */
function generateExecutiveFraming(
  simulation: SimulationModelOutput,
  alternatives: AlternativeStrategy[],
  competitor: string,
  segment: string
): { executiveSummary: string; keyInsight: string; recommendedNextStep: string } {
  const { recommendation, monthlySpendRequired, paybackMonths, riskLevel } = simulation;

  let executiveSummary: string;
  let keyInsight: string;
  let recommendedNextStep: string;

  switch (recommendation) {
    case "ATTACK":
      executiveSummary = `Competing against ${competitor} in ${segment} is feasible with $${monthlySpendRequired.toLocaleString()}/month investment. Expected payback in ${paybackMonths} months.`;
      keyInsight = `The authority gap is closeable and market conditions favor aggressive pursuit.`;
      recommendedNextStep = `Approve budget allocation and begin content + link building campaign.`;
      break;

    case "DEFEND":
      executiveSummary = `Direct competition with ${competitor} carries moderate risk. Recommend defensive investment of $${Math.round(monthlySpendRequired * 0.6).toLocaleString()}/month.`;
      keyInsight = `Focus on protecting current position rather than aggressive expansion.`;
      recommendedNextStep = `Prioritize retention of existing rankings while exploring differentiation.`;
      break;

    case "DIFFERENTIATE":
      executiveSummary = `Head-on competition with ${competitor} is not advisable. Strong brand moat suggests differentiation strategy.`;
      keyInsight = `Your unique positioning can create a defensible niche at 40% of the direct competition cost.`;
      recommendedNextStep = `Define unique narrative angle and allocate $${Math.round(monthlySpendRequired * 0.4).toLocaleString()}/month.`;
      break;

    case "AVOID":
      executiveSummary = `Competition with ${competitor} in ${segment} is not recommended. Risk level: ${riskLevel}. Required investment: $${monthlySpendRequired.toLocaleString()}/month.`;
      keyInsight = `The authority gap and required investment make this a losing proposition.`;
      recommendedNextStep = `Explore adjacent segments or partnership strategies instead.`;
      break;
  }

  return { executiveSummary, keyInsight, recommendedNextStep };
}
```

---

## Fase 4: API Routes

```typescript
// server/routes.ts - Agregar

import { runBudgetSimulation } from "./modules/competitive-budget-simulator";

// POST /api/budget-simulator/run
app.post("/api/budget-simulator/run", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { configurationId, segment, targetCompetitor, scenarioType } = req.body;

    if (!configurationId || !segment || !targetCompetitor) {
      return res.status(400).json({ 
        error: "Missing required fields: configurationId, segment, targetCompetitor" 
      });
    }

    const config = await storage.getConfigurationById(configurationId, userId);
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const result = await runBudgetSimulation(config, {
      configurationId,
      segment,
      targetCompetitor,
      scenarioType
    });

    res.json(result);
  } catch (error) {
    console.error("Error running budget simulation:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Simulation failed" 
    });
  }
});
```

---

## Testing Checklist

- [ ] Unit tests para simulation model
- [ ] Unit tests para channel breakdown calculation
- [ ] Integration tests con mock providers
- [ ] E2E tests para API endpoint
- [ ] Validation de assumptions output
