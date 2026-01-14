# Implementation Guide: Strategic Move Generator

> **Feature**: 4 of 5 Strategic Features  
> **Complexity**: Alta  
> **Timeline**: 6-8 semanas  
> **Dependencies**: Todas las funcionalidades anteriores

---

## Concepto

Motor de decisiones que genera movimientos estratégicos priorizados con análisis de second-order effects y probabilidad de éxito. Responde: "¿Qué haría un CMO top 1% en mi situación exacta?"

---

## Tipos de Movimientos

```typescript
// shared/types/strategic-moves.ts

export type StrategicMoveType = 
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

export type MoveCategory = "offensive" | "defensive" | "exploratory";

export interface SecondOrderEffect {
  effect: string;
  likelihood: "low" | "medium" | "high";
  impact: "positive" | "negative" | "neutral";
  timeframe: string;
}

export interface CompetitorResponse {
  likelyResponse: string;
  responseTime: string;
  counterStrategy: string;
  responseRisk: "low" | "medium" | "high";
}

export interface ExecutionMilestone {
  milestone: string;
  duration: string;
  dependencies: string[];
  successMetric: string;
}

export interface ExecutionRoadmap {
  phase: string;
  duration: string;
  keyMilestones: ExecutionMilestone[];
  resourcesRequired: string[];
  risks: string[];
}

export interface StrategicMove {
  id: string;
  type: StrategicMoveType;
  category: MoveCategory;
  
  // Core description
  title: string;
  description: string;
  strategicRationale: string;
  
  // Impact assessment
  expectedImpact: {
    revenueImpact: string;
    marketShareImpact: string;
    brandEquityImpact: string;
    timeToImpact: string;
  };
  
  // Feasibility
  feasibility: {
    score: number;
    resourcesRequired: string;
    capabilitiesRequired: string[];
    riskFactors: string[];
  };
  
  // Second-order effects
  secondOrderEffects: SecondOrderEffect[];
  
  // Competitive response
  competitorResponse: CompetitorResponse;
  
  // Execution roadmap
  executionRoadmap: ExecutionRoadmap[];
  
  // CMO-safe framing
  boardPitch: string;
  cmoDecision: string;
  
  // Priority
  priorityScore: number;
  priorityRationale: string;
  
  // Metadata
  generatedFrom: string[];
  trace: ItemTrace[];
}

export interface StrategicMoveGeneratorResult {
  moves: StrategicMove[];
  topRecommendation: StrategicMove;
  summary: {
    totalMovesGenerated: number;
    highPriorityCount: number;
    quickWinsCount: number;
    bigBetsCount: number;
    defensiveCount: number;
    offensiveCount: number;
  };
  situationAnalysis: {
    currentPosition: string;
    keyOpportunities: string[];
    keyThreats: string[];
    resourceConstraints: string[];
  };
  executedAt: string;
  trace: ItemTrace[];
}
```

---

## Module Contract

```typescript
// shared/module.contract.ts - Agregar

export const StrategicMoveGeneratorContract: ModuleContract = {
  moduleId: "strategic.move_generator.v1",
  name: "Strategic Move Generator",
  category: "Strategic Planning",
  layer: "Action",
  version: "contract.v1",

  description: 
    "Generates prioritized strategic moves based on current position, competitive context, " +
    "and available resources, with second-order effect analysis and competitor response prediction.",
  
  strategicQuestion: 
    "What strategic moves should we make now, and what are the likely consequences?",

  dataSources: ["Internal", "OpenAI"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "medium",
    inferenceType: "hybrid"
  },

  caching: {
    cadence: "weekly",
    ttlSeconds: 604800,
    bustOnChanges: ["competitor_set", "category_scope", "governance", "all"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: false,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B", "C", "E"],
    optionalSections: ["D", "F", "G", "H"],
    sectionUsage: {
      A: "Brand identity for move framing",
      B: "Category context for expansion opportunities",
      C: "Competitor set for attack/defense moves",
      D: "Demand themes for narrative opportunities",
      E: "Strategic posture for move prioritization",
      F: "Channel context for arbitrage opportunities",
      G: "Exclusions to filter invalid moves",
      H: "Capabilities for feasibility assessment"
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      {
        name: "max_moves",
        type: "number",
        required: false,
        default: 5,
        constraints: { min: 1, max: 10 }
      },
      {
        name: "focus_areas",
        type: "string[]",
        required: false,
        description: "Specific move types to prioritize"
      },
      {
        name: "risk_tolerance",
        type: "string",
        required: false,
        default: "moderate",
        constraints: { enum: ["conservative", "moderate", "aggressive"] }
      },
      {
        name: "time_horizon",
        type: "string",
        required: false,
        default: "6_months",
        constraints: { enum: ["3_months", "6_months", "12_months"] }
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
    itemTraceFields: ["ruleId", "ucrSection", "reason", "evidence", "severity"],
    runTraceFields: ["sectionsUsed", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "strategic_move",
    visuals: [
      { kind: "card", title: "Top Recommendation" },
      { kind: "matrix", title: "Move Priority Matrix" },
      { kind: "table", title: "All Moves" }
    ],
    summaryFields: [
      "total_moves",
      "top_recommendation",
      "quick_wins_count",
      "big_bets_count"
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

## Core Implementation

```typescript
// server/modules/strategic-move-generator.ts

import type { Configuration } from "@shared/schema";
import type { 
  StrategicMove,
  StrategicMoveGeneratorResult,
  StrategicMoveType,
  MoveCategory,
  SecondOrderEffect,
  CompetitorResponse,
  ExecutionRoadmap
} from "@shared/types/strategic-moves";
import type { ItemTrace, UCRSectionID } from "@shared/module.contract";
import { validateModuleExecution } from "../execution-gateway";
import { StrategicMoveGeneratorContract } from "@shared/module.contract";
import { generateWithAI } from "../services/ai-service";
import { storage } from "../storage";

interface MoveGeneratorOptions {
  maxMoves?: number;
  focusAreas?: StrategicMoveType[];
  riskTolerance?: "conservative" | "moderate" | "aggressive";
  timeHorizon?: "3_months" | "6_months" | "12_months";
}

/**
 * Main entry point for Strategic Move Generator
 */
export async function generateStrategicMoves(
  config: Configuration,
  options: MoveGeneratorOptions = {}
): Promise<StrategicMoveGeneratorResult> {
  const {
    maxMoves = 5,
    focusAreas,
    riskTolerance = "moderate",
    timeHorizon = "6_months"
  } = options;

  // 1. Validate UCR
  const validation = validateModuleExecution(config, StrategicMoveGeneratorContract.moduleId);
  if (!validation.canExecute) {
    throw new Error(`Cannot execute: ${validation.errors.join(", ")}`);
  }

  // 2. Analyze current position
  const currentPosition = await analyzeCurrentPosition(config);

  // 3. Gather opportunities from existing analyses
  const opportunities = await gatherOpportunities(config);

  // 4. Generate candidate moves
  const candidateMoves = await generateCandidateMoves(
    currentPosition,
    opportunities,
    config,
    focusAreas
  );

  // 5. Score and prioritize moves
  const scoredMoves = candidateMoves.map(move => ({
    ...move,
    priorityScore: calculateMovePriority(move, config, riskTolerance, timeHorizon)
  }));

  // 6. Filter by risk tolerance
  const filteredMoves = filterByRiskTolerance(scoredMoves, riskTolerance);

  // 7. Select top moves
  const topMoves = filteredMoves
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, maxMoves);

  // 8. Enrich with second-order effects and competitor response
  const enrichedMoves = await Promise.all(
    topMoves.map(move => enrichMoveWithAnalysis(move, config))
  );

  // 9. Generate summary
  const summary = generateSummary(enrichedMoves, candidateMoves.length);

  return {
    moves: enrichedMoves,
    topRecommendation: enrichedMoves[0],
    summary,
    situationAnalysis: {
      currentPosition: currentPosition.summary,
      keyOpportunities: opportunities.slice(0, 3).map(o => o.description),
      keyThreats: currentPosition.threats.slice(0, 3),
      resourceConstraints: currentPosition.constraints
    },
    executedAt: new Date().toISOString(),
    trace: generateTrace(enrichedMoves, validation)
  };
}

/**
 * Analyze current strategic position
 */
interface CurrentPosition {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  threats: string[];
  opportunities: string[];
  constraints: string[];
  marketShare: number;
  competitiveAdvantage: string[];
}

async function analyzeCurrentPosition(config: Configuration): Promise<CurrentPosition> {
  const brandName = config.brand?.name || config.brand?.domain || "Brand";
  const category = config.category_definition?.primary_category || "category";
  
  // Extract strengths from capability model
  const strengths = (config.governance?.capability_model?.boosters || [])
    .map(b => b.term)
    .filter(Boolean);

  // Extract weaknesses from penalties
  const weaknesses = (config.governance?.capability_model?.penalties || [])
    .map(p => p.term)
    .filter(Boolean);

  // Extract threats from competitors
  const competitors = config.competitors?.competitors || [];
  const threats = competitors
    .filter(c => c.tier === "tier1")
    .map(c => `${c.name || c.domain} competing in ${category}`);

  // Extract opportunities from demand themes
  const opportunities = (config.demand_definition?.demand_themes || [])
    .filter(t => t.priority === "high")
    .map(t => `${t.name} demand opportunity`);

  // Extract constraints from channel context
  const constraints: string[] = [];
  const seoMaturity = config.channel_context?.seo_maturity;
  if (seoMaturity === "nascent") {
    constraints.push("Limited SEO capability");
  }

  return {
    summary: `${brandName} operates in ${category} with ${strengths.length} key strengths and faces ${threats.length} tier-1 competitors.`,
    strengths,
    weaknesses,
    threats,
    opportunities,
    constraints,
    marketShare: 0, // Would need external data
    competitiveAdvantage: strengths.slice(0, 3)
  };
}

/**
 * Gather opportunities from existing analyses
 */
interface Opportunity {
  type: string;
  description: string;
  source: string;
  priority: number;
}

async function gatherOpportunities(config: Configuration): Promise<Opportunity[]> {
  const opportunities: Opportunity[] = [];
  const userId = ""; // Would come from context

  // Get recent keyword gap analyses
  try {
    const keywordGapAnalyses = await storage.getKeywordGapAnalyses(userId);
    const recentAnalysis = keywordGapAnalyses
      .filter(a => a.configurationId === config.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    if (recentAnalysis) {
      // Extract top opportunities from keyword gap
      const topThemes = recentAnalysis.topThemes || [];
      for (const theme of topThemes.slice(0, 3)) {
        opportunities.push({
          type: "keyword_gap",
          description: `Capture ${theme.theme} keywords (${theme.totalVolume} monthly volume)`,
          source: "Keyword Gap Analysis",
          priority: theme.totalVolume
        });
      }
    }
  } catch (error) {
    // Continue without keyword gap data
  }

  // Add opportunities from demand themes
  const themes = config.demand_definition?.demand_themes || [];
  for (const theme of themes) {
    if (theme.priority === "high") {
      opportunities.push({
        type: "demand_theme",
        description: `Expand ${theme.name} positioning`,
        source: "UCR Demand Definition",
        priority: 80
      });
    }
  }

  // Add category expansion opportunities
  const includedCategories = config.category_definition?.included_categories || [];
  for (const cat of includedCategories.slice(0, 2)) {
    opportunities.push({
      type: "category_expansion",
      description: `Strengthen presence in ${cat}`,
      source: "UCR Category Definition",
      priority: 60
    });
  }

  return opportunities.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate candidate strategic moves
 */
async function generateCandidateMoves(
  position: CurrentPosition,
  opportunities: Opportunity[],
  config: Configuration,
  focusAreas?: StrategicMoveType[]
): Promise<StrategicMove[]> {
  const moves: StrategicMove[] = [];
  const brandName = config.brand?.name || config.brand?.domain || "Brand";
  const category = config.category_definition?.primary_category || "category";

  // 1. Category Defense moves (if threats exist)
  if (position.threats.length > 0 && (!focusAreas || focusAreas.includes("category_defense"))) {
    moves.push(createMove({
      type: "category_defense",
      category: "defensive",
      title: `Defend ${category} Leadership`,
      description: `Lock down core ${category} positioning before competitor encroachment`,
      strategicRationale: `${position.threats.length} tier-1 competitors showing intent signals`,
      expectedImpact: {
        revenueImpact: "Protect existing revenue base",
        marketShareImpact: "Maintain current share",
        brandEquityImpact: "Reinforce category authority",
        timeToImpact: "3-6 months"
      },
      feasibility: {
        score: 75,
        resourcesRequired: "Medium",
        capabilitiesRequired: ["Content creation", "SEO optimization"],
        riskFactors: ["Competitor response", "Resource allocation"]
      },
      generatedFrom: ["position.threats"]
    }));
  }

  // 2. Category Expansion moves (from opportunities)
  const expansionOpps = opportunities.filter(o => o.type === "category_expansion");
  for (const opp of expansionOpps.slice(0, 2)) {
    if (!focusAreas || focusAreas.includes("category_expansion")) {
      moves.push(createMove({
        type: "category_expansion",
        category: "offensive",
        title: `Expand into ${opp.description.replace("Strengthen presence in ", "")}`,
        description: `Leverage existing authority to capture adjacent category demand`,
        strategicRationale: `Adjacent category with existing brand relevance`,
        expectedImpact: {
          revenueImpact: "New revenue stream potential",
          marketShareImpact: "+5-10% addressable market",
          brandEquityImpact: "Broader category authority",
          timeToImpact: "6-12 months"
        },
        feasibility: {
          score: 60,
          resourcesRequired: "High",
          capabilitiesRequired: ["Product development", "Content creation", "Market research"],
          riskFactors: ["Category fit", "Resource stretch", "Competitor response"]
        },
        generatedFrom: ["opportunities.category_expansion"]
      }));
    }
  }

  // 3. Narrative Ownership moves (from demand themes)
  const narrativeOpps = opportunities.filter(o => o.type === "demand_theme");
  for (const opp of narrativeOpps.slice(0, 2)) {
    if (!focusAreas || focusAreas.includes("narrative_ownership")) {
      const themeName = opp.description.replace("Expand ", "").replace(" positioning", "");
      moves.push(createMove({
        type: "narrative_ownership",
        category: "offensive",
        title: `Own "${themeName}" Narrative`,
        description: `Become the definitive voice for ${themeName} in ${category}`,
        strategicRationale: `High-priority demand theme with ownership opportunity`,
        expectedImpact: {
          revenueImpact: "Premium positioning enables pricing power",
          marketShareImpact: "Capture intent-stage demand",
          brandEquityImpact: "Thought leadership position",
          timeToImpact: "4-8 months"
        },
        feasibility: {
          score: 70,
          resourcesRequired: "Medium",
          capabilitiesRequired: ["Content strategy", "PR/Communications", "SEO"],
          riskFactors: ["Competitor counter-narrative", "Execution consistency"]
        },
        generatedFrom: ["opportunities.demand_theme"]
      }));
    }
  }

  // 4. Competitor Attack moves (if weaknesses identified)
  const competitors = config.competitors?.competitors || [];
  const tier1Competitors = competitors.filter(c => c.tier === "tier1");
  if (tier1Competitors.length > 0 && (!focusAreas || focusAreas.includes("competitor_attack"))) {
    const targetCompetitor = tier1Competitors[0];
    moves.push(createMove({
      type: "competitor_attack",
      category: "offensive",
      title: `Attack ${targetCompetitor.name || targetCompetitor.domain} Weakness`,
      description: `Target competitor's vulnerable segments with focused campaign`,
      strategicRationale: `Identified gaps in competitor's positioning or capability`,
      expectedImpact: {
        revenueImpact: "Capture competitor's at-risk customers",
        marketShareImpact: "+2-5% share from competitor",
        brandEquityImpact: "Competitive differentiation",
        timeToImpact: "3-6 months"
      },
      feasibility: {
        score: 55,
        resourcesRequired: "High",
        capabilitiesRequired: ["Competitive intelligence", "Targeted marketing", "Sales enablement"],
        riskFactors: ["Competitor retaliation", "Price war risk", "Brand perception"]
      },
      generatedFrom: ["config.competitors"]
    }));
  }

  // 5. Channel Arbitrage moves (from channel context)
  const channelMix = config.channel_context?.channel_mix || {};
  const underutilizedChannels = Object.entries(channelMix)
    .filter(([_, weight]) => (weight as number) < 20)
    .map(([channel]) => channel);
  
  if (underutilizedChannels.length > 0 && (!focusAreas || focusAreas.includes("channel_arbitrage"))) {
    moves.push(createMove({
      type: "channel_arbitrage",
      category: "exploratory",
      title: `Exploit ${underutilizedChannels[0]} Channel Opportunity`,
      description: `Increase investment in underutilized channel with lower competition`,
      strategicRationale: `Channel currently under-indexed relative to opportunity`,
      expectedImpact: {
        revenueImpact: "New customer acquisition channel",
        marketShareImpact: "Diversified reach",
        brandEquityImpact: "Multi-channel presence",
        timeToImpact: "2-4 months"
      },
      feasibility: {
        score: 80,
        resourcesRequired: "Low-Medium",
        capabilitiesRequired: ["Channel expertise", "Content adaptation"],
        riskFactors: ["Learning curve", "Channel fit"]
      },
      generatedFrom: ["config.channel_context"]
    }));
  }

  // 6. Partnership Play (always consider)
  if (!focusAreas || focusAreas.includes("partnership_play")) {
    moves.push(createMove({
      type: "partnership_play",
      category: "exploratory",
      title: "Strategic Partnership for Market Access",
      description: `Partner with complementary brand to accelerate market penetration`,
      strategicRationale: `Leverage partner's distribution or audience for faster growth`,
      expectedImpact: {
        revenueImpact: "Shared revenue opportunity",
        marketShareImpact: "Access to partner's market",
        brandEquityImpact: "Association with established brand",
        timeToImpact: "3-6 months"
      },
      feasibility: {
        score: 50,
        resourcesRequired: "Medium",
        capabilitiesRequired: ["Business development", "Partnership management"],
        riskFactors: ["Partner alignment", "Revenue share", "Brand dilution"]
      },
      generatedFrom: ["strategic_option"]
    }));
  }

  return moves;
}

/**
 * Helper to create move with defaults
 */
function createMove(partial: Partial<StrategicMove>): StrategicMove {
  return {
    id: `move_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: partial.type || "category_defense",
    category: partial.category || "defensive",
    title: partial.title || "Strategic Move",
    description: partial.description || "",
    strategicRationale: partial.strategicRationale || "",
    expectedImpact: partial.expectedImpact || {
      revenueImpact: "TBD",
      marketShareImpact: "TBD",
      brandEquityImpact: "TBD",
      timeToImpact: "TBD"
    },
    feasibility: partial.feasibility || {
      score: 50,
      resourcesRequired: "Medium",
      capabilitiesRequired: [],
      riskFactors: []
    },
    secondOrderEffects: [],
    competitorResponse: {
      likelyResponse: "TBD",
      responseTime: "TBD",
      counterStrategy: "TBD",
      responseRisk: "medium"
    },
    executionRoadmap: [],
    boardPitch: "",
    cmoDecision: "",
    priorityScore: 0,
    priorityRationale: "",
    generatedFrom: partial.generatedFrom || [],
    trace: []
  };
}

/**
 * Calculate move priority score
 */
function calculateMovePriority(
  move: StrategicMove,
  config: Configuration,
  riskTolerance: string,
  timeHorizon: string
): number {
  let score = 50; // Base

  // Feasibility weight
  score += (move.feasibility.score - 50) * 0.3;

  // Risk tolerance adjustment
  if (riskTolerance === "aggressive") {
    if (move.category === "offensive") score += 15;
    if (move.category === "exploratory") score += 10;
  } else if (riskTolerance === "conservative") {
    if (move.category === "defensive") score += 15;
    if (move.category === "offensive") score -= 10;
  }

  // Time horizon adjustment
  const timeToImpact = move.expectedImpact.timeToImpact;
  if (timeHorizon === "3_months") {
    if (timeToImpact.includes("2-4") || timeToImpact.includes("3-6")) score += 10;
    if (timeToImpact.includes("12")) score -= 15;
  } else if (timeHorizon === "12_months") {
    if (timeToImpact.includes("6-12") || timeToImpact.includes("12")) score += 5;
  }

  // Strategic intent alignment
  const goalType = config.strategic_intent?.goal_type;
  if (goalType === "growth" && move.category === "offensive") score += 10;
  if (goalType === "defend" && move.category === "defensive") score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Filter moves by risk tolerance
 */
function filterByRiskTolerance(
  moves: StrategicMove[],
  riskTolerance: string
): StrategicMove[] {
  if (riskTolerance === "conservative") {
    return moves.filter(m => m.feasibility.score >= 60);
  }
  if (riskTolerance === "aggressive") {
    return moves; // No filtering
  }
  return moves.filter(m => m.feasibility.score >= 40);
}

/**
 * Enrich move with second-order effects and competitor response
 */
async function enrichMoveWithAnalysis(
  move: StrategicMove,
  config: Configuration
): Promise<StrategicMove> {
  // Generate second-order effects using AI
  const secondOrderEffects = await generateSecondOrderEffects(move, config);
  
  // Generate competitor response prediction
  const competitorResponse = await predictCompetitorResponse(move, config);
  
  // Generate execution roadmap
  const executionRoadmap = generateExecutionRoadmap(move);
  
  // Generate board pitch
  const boardPitch = generateBoardPitch(move);
  
  // Generate CMO decision
  const cmoDecision = generateCMODecision(move);
  
  // Generate priority rationale
  const priorityRationale = generatePriorityRationale(move);

  return {
    ...move,
    secondOrderEffects,
    competitorResponse,
    executionRoadmap,
    boardPitch,
    cmoDecision,
    priorityRationale
  };
}

/**
 * Generate second-order effects using AI
 */
async function generateSecondOrderEffects(
  move: StrategicMove,
  config: Configuration
): Promise<SecondOrderEffect[]> {
  const prompt = `
Analyze the second-order effects of this strategic move:

Move: ${move.title}
Description: ${move.description}
Type: ${move.type}

Brand context: ${config.brand?.name || config.brand?.domain}
Category: ${config.category_definition?.primary_category}

List 3-4 second-order effects (consequences that result from the primary action).
For each effect, specify:
- effect: What happens
- likelihood: low/medium/high
- impact: positive/negative/neutral
- timeframe: When it would occur

Respond in JSON array format.
`;

  try {
    const response = await generateWithAI(prompt, { temperature: 0.4 });
    return JSON.parse(response);
  } catch {
    // Fallback effects based on move type
    return getDefaultSecondOrderEffects(move.type);
  }
}

function getDefaultSecondOrderEffects(moveType: StrategicMoveType): SecondOrderEffect[] {
  const defaults: Record<StrategicMoveType, SecondOrderEffect[]> = {
    category_defense: [
      { effect: "Competitor may accelerate their own defense", likelihood: "medium", impact: "negative", timeframe: "3-6 months" },
      { effect: "Team gains experience in defensive strategy", likelihood: "high", impact: "positive", timeframe: "Immediate" }
    ],
    category_expansion: [
      { effect: "Resources diverted from core category", likelihood: "high", impact: "negative", timeframe: "Immediate" },
      { effect: "New customer segments discovered", likelihood: "medium", impact: "positive", timeframe: "6-12 months" }
    ],
    competitor_attack: [
      { effect: "Competitor retaliates with counter-attack", likelihood: "high", impact: "negative", timeframe: "1-3 months" },
      { effect: "Market perceives brand as aggressive", likelihood: "medium", impact: "neutral", timeframe: "Immediate" }
    ],
    narrative_ownership: [
      { effect: "Attracts talent aligned with narrative", likelihood: "medium", impact: "positive", timeframe: "6-12 months" },
      { effect: "Competitors attempt to copy narrative", likelihood: "high", impact: "negative", timeframe: "3-6 months" }
    ],
    channel_arbitrage: [
      { effect: "Competitors follow into channel", likelihood: "medium", impact: "negative", timeframe: "6-12 months" },
      { effect: "Discover new customer insights", likelihood: "high", impact: "positive", timeframe: "3-6 months" }
    ],
    partnership_play: [
      { effect: "Partner relationship requires ongoing management", likelihood: "high", impact: "neutral", timeframe: "Ongoing" },
      { effect: "Opens doors to additional partnerships", likelihood: "medium", impact: "positive", timeframe: "6-12 months" }
    ],
    product_moat: [
      { effect: "Increased R&D costs", likelihood: "high", impact: "negative", timeframe: "Immediate" },
      { effect: "Creates defensible competitive advantage", likelihood: "medium", impact: "positive", timeframe: "12+ months" }
    ],
    audience_expansion: [
      { effect: "Brand message may become diluted", likelihood: "medium", impact: "negative", timeframe: "6-12 months" },
      { effect: "Larger addressable market", likelihood: "high", impact: "positive", timeframe: "3-6 months" }
    ],
    geographic_expansion: [
      { effect: "Operational complexity increases", likelihood: "high", impact: "negative", timeframe: "Immediate" },
      { effect: "Revenue diversification", likelihood: "medium", impact: "positive", timeframe: "12+ months" }
    ],
    pricing_play: [
      { effect: "Competitor price response", likelihood: "high", impact: "negative", timeframe: "1-3 months" },
      { effect: "Customer perception shift", likelihood: "medium", impact: "neutral", timeframe: "3-6 months" }
    ]
  };

  return defaults[moveType] || [];
}

/**
 * Predict competitor response
 */
async function predictCompetitorResponse(
  move: StrategicMove,
  config: Configuration
): Promise<CompetitorResponse> {
  const competitors = config.competitors?.competitors || [];
  const tier1 = competitors.filter(c => c.tier === "tier1");

  if (tier1.length === 0) {
    return {
      likelyResponse: "No tier-1 competitors identified",
      responseTime: "N/A",
      counterStrategy: "Monitor for new entrants",
      responseRisk: "low"
    };
  }

  // Heuristic-based response prediction
  const responseMap: Record<StrategicMoveType, CompetitorResponse> = {
    category_defense: {
      likelyResponse: "Accelerate own category investment",
      responseTime: "1-3 months",
      counterStrategy: "Maintain defensive posture, monitor closely",
      responseRisk: "medium"
    },
    competitor_attack: {
      likelyResponse: "Counter-attack on your weak segments",
      responseTime: "2-4 weeks",
      counterStrategy: "Prepare defensive content, shore up weaknesses",
      responseRisk: "high"
    },
    narrative_ownership: {
      likelyResponse: "Attempt to co-opt or counter narrative",
      responseTime: "2-4 months",
      counterStrategy: "Accelerate proof point development",
      responseRisk: "medium"
    },
    category_expansion: {
      likelyResponse: "May ignore if outside their focus",
      responseTime: "3-6 months",
      counterStrategy: "Move quickly to establish position",
      responseRisk: "low"
    },
    channel_arbitrage: {
      likelyResponse: "Follow into channel if successful",
      responseTime: "6-12 months",
      counterStrategy: "Build first-mover advantage quickly",
      responseRisk: "low"
    },
    partnership_play: {
      likelyResponse: "Seek competing partnerships",
      responseTime: "3-6 months",
      counterStrategy: "Lock in exclusivity where possible",
      responseRisk: "medium"
    },
    product_moat: {
      likelyResponse: "Attempt to match or leapfrog",
      responseTime: "12+ months",
      counterStrategy: "Continuous innovation pipeline",
      responseRisk: "medium"
    },
    audience_expansion: {
      likelyResponse: "May target same audience",
      responseTime: "3-6 months",
      counterStrategy: "Establish audience relationship quickly",
      responseRisk: "medium"
    },
    geographic_expansion: {
      likelyResponse: "Defend home market, may follow",
      responseTime: "6-12 months",
      counterStrategy: "Build local partnerships",
      responseRisk: "low"
    },
    pricing_play: {
      likelyResponse: "Match or undercut pricing",
      responseTime: "1-4 weeks",
      counterStrategy: "Emphasize value beyond price",
      responseRisk: "high"
    }
  };

  return responseMap[move.type] || {
    likelyResponse: "Monitor and respond",
    responseTime: "1-3 months",
    counterStrategy: "Maintain flexibility",
    responseRisk: "medium"
  };
}

/**
 * Generate execution roadmap
 */
function generateExecutionRoadmap(move: StrategicMove): ExecutionRoadmap[] {
  // Generic 3-phase roadmap
  return [
    {
      phase: "Phase 1: Foundation",
      duration: "Weeks 1-4",
      keyMilestones: [
        { milestone: "Strategy alignment", duration: "1 week", dependencies: [], successMetric: "Stakeholder sign-off" },
        { milestone: "Resource allocation", duration: "1 week", dependencies: ["Strategy alignment"], successMetric: "Team assigned" },
        { milestone: "Initial planning", duration: "2 weeks", dependencies: ["Resource allocation"], successMetric: "Detailed plan approved" }
      ],
      resourcesRequired: ["Strategy lead", "Project manager"],
      risks: ["Stakeholder misalignment", "Resource constraints"]
    },
    {
      phase: "Phase 2: Execution",
      duration: "Weeks 5-12",
      keyMilestones: [
        { milestone: "Launch core initiatives", duration: "4 weeks", dependencies: ["Initial planning"], successMetric: "Initiatives live" },
        { milestone: "Monitor and optimize", duration: "4 weeks", dependencies: ["Launch core initiatives"], successMetric: "KPIs on track" }
      ],
      resourcesRequired: move.feasibility.capabilitiesRequired,
      risks: move.feasibility.riskFactors
    },
    {
      phase: "Phase 3: Scale",
      duration: "Weeks 13-24",
      keyMilestones: [
        { milestone: "Evaluate results", duration: "2 weeks", dependencies: ["Monitor and optimize"], successMetric: "ROI assessment complete" },
        { milestone: "Scale successful tactics", duration: "10 weeks", dependencies: ["Evaluate results"], successMetric: "Scaled impact achieved" }
      ],
      resourcesRequired: ["Increased budget", "Additional team members"],
      risks: ["Competitor response", "Market changes"]
    }
  ];
}

/**
 * Generate board pitch
 */
function generateBoardPitch(move: StrategicMove): string {
  return `${move.title}: ${move.expectedImpact.marketShareImpact} impact with ${move.feasibility.resourcesRequired.toLowerCase()} investment, ${move.expectedImpact.timeToImpact} to results.`;
}

/**
 * Generate CMO decision
 */
function generateCMODecision(move: StrategicMove): string {
  return `Approve ${move.feasibility.resourcesRequired.toLowerCase()} resource allocation for ${move.type.replace(/_/g, " ")} initiative targeting ${move.expectedImpact.timeToImpact} impact.`;
}

/**
 * Generate priority rationale
 */
function generatePriorityRationale(move: StrategicMove): string {
  const factors = [];
  if (move.feasibility.score >= 70) factors.push("high feasibility");
  if (move.category === "defensive") factors.push("protects current position");
  if (move.category === "offensive") factors.push("growth opportunity");
  if (move.expectedImpact.timeToImpact.includes("3-6")) factors.push("near-term impact");
  
  return `Priority score ${move.priorityScore}/100 based on ${factors.join(", ") || "balanced assessment"}.`;
}

/**
 * Generate summary
 */
function generateSummary(moves: StrategicMove[], totalGenerated: number) {
  return {
    totalMovesGenerated: totalGenerated,
    highPriorityCount: moves.filter(m => m.priorityScore >= 70).length,
    quickWinsCount: moves.filter(m => m.feasibility.score >= 70 && m.expectedImpact.timeToImpact.includes("3")).length,
    bigBetsCount: moves.filter(m => m.feasibility.score < 60 && m.priorityScore >= 60).length,
    defensiveCount: moves.filter(m => m.category === "defensive").length,
    offensiveCount: moves.filter(m => m.category === "offensive").length
  };
}

/**
 * Generate trace
 */
function generateTrace(moves: StrategicMove[], validation: any): ItemTrace[] {
  return moves.map(move => ({
    ruleId: `MOVE_${move.type.toUpperCase()}`,
    ucrSection: "E" as UCRSectionID,
    reason: `Generated ${move.type} move: ${move.title}`,
    severity: move.priorityScore >= 70 ? "high" : "medium",
    evidence: `Priority: ${move.priorityScore}, Feasibility: ${move.feasibility.score}`
  }));
}
```

---

## API Routes

```typescript
// server/routes.ts - Agregar

import { generateStrategicMoves } from "./modules/strategic-move-generator";

// POST /api/strategic-moves/generate
app.post("/api/strategic-moves/generate", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { configurationId, maxMoves, focusAreas, riskTolerance, timeHorizon } = req.body;

    const config = await storage.getConfigurationById(configurationId, userId);
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const result = await generateStrategicMoves(config, {
      maxMoves,
      focusAreas,
      riskTolerance,
      timeHorizon
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating strategic moves:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Move generation failed" 
    });
  }
});

// GET /api/strategic-moves/types
app.get("/api/strategic-moves/types", requireAuth, (req, res) => {
  const moveTypes = [
    { id: "category_defense", name: "Category Defense", category: "defensive" },
    { id: "category_expansion", name: "Category Expansion", category: "offensive" },
    { id: "competitor_attack", name: "Competitor Attack", category: "offensive" },
    { id: "narrative_ownership", name: "Narrative Ownership", category: "offensive" },
    { id: "channel_arbitrage", name: "Channel Arbitrage", category: "exploratory" },
    { id: "partnership_play", name: "Partnership Play", category: "exploratory" },
    { id: "product_moat", name: "Product Moat", category: "defensive" },
    { id: "audience_expansion", name: "Audience Expansion", category: "offensive" },
    { id: "geographic_expansion", name: "Geographic Expansion", category: "exploratory" },
    { id: "pricing_play", name: "Pricing Play", category: "offensive" }
  ];
  res.json(moveTypes);
});
```

---

## Testing Checklist

- [ ] Unit tests para position analysis
- [ ] Unit tests para move generation
- [ ] Unit tests para priority scoring
- [ ] Integration tests con mock AI
- [ ] E2E tests para API endpoint
