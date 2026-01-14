# Implementation Guide: Board-Ready Strategy Brief Generator

> **Feature**: 5 of 5 Strategic Features  
> **Complexity**: Baja  
> **Timeline**: 2-3 semanas  
> **Dependencies**: Análisis existentes (Keyword Gap, Market Demand, etc.)

---

## Concepto

Convierte cualquier análisis en un brief listo para Board/CEO/Inversores con formato de decisión: contexto, opciones, recomendación y costo de inacción.

---

## Formato del Brief

```typescript
// shared/types/board-brief.ts

export type BriefAudience = "board" | "executive" | "cmo" | "investor";
export type BriefUrgency = "routine" | "important" | "critical";
export type OptionId = "A" | "B" | "C";

export interface ExecutiveSummary {
  situation: string;    // What's happening (1 sentence)
  challenge: string;    // What we need to solve (1 sentence)
  recommendation: string; // What we should do (1 sentence)
  impact: string;       // What we expect to achieve (1 sentence)
  timeline: string;     // When we need to act (1 sentence)
}

export interface BriefContext {
  marketContext: string;
  competitiveContext: string;
  internalContext: string;
}

export interface DecisionFrame {
  question: string;
  deadline: string;
  decisionMaker: string;
  stakeholders: string[];
}

export interface StrategicOption {
  id: OptionId;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  investment: string;
  expectedOutcome: string;
  riskLevel: "low" | "medium" | "high";
  probability: number;
}

export interface Recommendation {
  selectedOption: OptionId;
  rationale: string;
  keyAssumptions: string[];
  successMetrics: string[];
}

export interface Risk {
  risk: string;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigation: string;
}

export interface CostOfInaction {
  description: string;
  quantifiedImpact: string;
  timeframe: string;
}

export interface NextStep {
  step: string;
  owner: string;
  deadline: string;
}

export interface AppendixReference {
  title: string;
  type: "analysis" | "data" | "benchmark";
  link: string;
}

export interface BoardStrategyBrief {
  // Header
  id: string;
  title: string;
  preparedFor: string;
  preparedBy: string;
  date: string;
  confidentiality: "internal" | "board_only" | "public";
  
  // Core content
  executiveSummary: ExecutiveSummary;
  context: BriefContext;
  decision: DecisionFrame;
  options: StrategicOption[];
  recommendation: Recommendation;
  risks: Risk[];
  costOfInaction: CostOfInaction;
  nextSteps: NextStep[];
  
  // References
  appendixReferences: AppendixReference[];
  
  // Metadata
  sourceAnalyses: string[];
  generatedAt: string;
  version: string;
}

export interface BoardBriefRequest {
  configurationId: number;
  topic: string;
  analysisIds: number[];
  audience: BriefAudience;
  urgency: BriefUrgency;
}
```

---

## Module Contract

```typescript
// shared/module.contract.ts - Agregar

export const BoardBriefGeneratorContract: ModuleContract = {
  moduleId: "strategic.board_brief_generator.v1",
  name: "Board-Ready Strategy Brief Generator",
  category: "Executive Communication",
  layer: "Action",
  version: "contract.v1",

  description: 
    "Synthesizes analyses into board-ready strategy briefs with clear decision framework, " +
    "options analysis, and actionable recommendations.",
  
  strategicQuestion: 
    "How do we present this analysis to the board in a way that drives a decision?",

  dataSources: ["Internal", "OpenAI"],

  riskProfile: {
    confidence: "high",
    riskIfWrong: "low",
    inferenceType: "internal"
  },

  caching: {
    cadence: "none",
    bustOnChanges: ["all"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED", "AI_ANALYSIS_RUN"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A"],
    optionalSections: ["B", "C", "D", "E"],
    sectionUsage: {
      A: "Brand context for brief framing",
      B: "Category context for market framing",
      C: "Competitive context for options",
      D: "Demand context for opportunity sizing",
      E: "Strategic posture for recommendation alignment"
    },
    gates: {
      fenceMode: "none",
      negativeScopeMode: "none"
    }
  },

  inputs: {
    fields: [
      {
        name: "topic",
        type: "string",
        required: true,
        description: "Topic for the strategy brief"
      },
      {
        name: "analysis_ids",
        type: "number[]",
        required: true,
        description: "IDs of analyses to synthesize"
      },
      {
        name: "audience",
        type: "string",
        required: false,
        default: "board",
        constraints: { enum: ["board", "executive", "cmo", "investor"] }
      },
      {
        name: "urgency",
        type: "string",
        required: false,
        default: "important",
        constraints: { enum: ["routine", "important", "critical"] }
      }
    ]
  },

  disposition: {
    required: false,
    allowed: ["PASS"],
    hideOutOfPlayByDefault: false
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason"],
    runTraceFields: ["sectionsUsed", "filtersApplied"]
  },

  output: {
    entityType: "board_brief",
    visuals: [
      { kind: "card", title: "Executive Summary" },
      { kind: "table", title: "Options Comparison" }
    ],
    summaryFields: [
      "recommendation",
      "investment_required",
      "expected_outcome"
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
// server/modules/board-brief-generator.ts

import type { Configuration } from "@shared/schema";
import type { 
  BoardStrategyBrief,
  BoardBriefRequest,
  ExecutiveSummary,
  BriefContext,
  DecisionFrame,
  StrategicOption,
  Recommendation,
  Risk,
  CostOfInaction,
  NextStep,
  AppendixReference,
  BriefAudience,
  BriefUrgency,
  OptionId
} from "@shared/types/board-brief";
import type { ItemTrace } from "@shared/module.contract";
import { validateModuleExecution } from "../execution-gateway";
import { BoardBriefGeneratorContract } from "@shared/module.contract";
import { generateWithAI } from "../services/ai-service";
import { storage } from "../storage";

/**
 * Main entry point for Board Brief Generator
 */
export async function generateBoardBrief(
  config: Configuration,
  request: BoardBriefRequest
): Promise<BoardStrategyBrief> {
  const { topic, analysisIds, audience = "board", urgency = "important" } = request;

  // 1. Validate UCR
  const validation = validateModuleExecution(config, BoardBriefGeneratorContract.moduleId);
  if (!validation.canExecute) {
    throw new Error(`Cannot execute: ${validation.errors.join(", ")}`);
  }

  // 2. Gather source analyses
  const analyses = await gatherSourceAnalyses(analysisIds);

  // 3. Extract key insights
  const insights = extractKeyInsights(analyses);

  // 4. Generate context
  const context = generateContext(insights, config);

  // 5. Generate options
  const options = await generateOptions(insights, config, topic);

  // 6. Analyze risks
  const risks = analyzeRisks(options, config);

  // 7. Calculate cost of inaction
  const costOfInaction = calculateCostOfInaction(insights, config);

  // 8. Generate recommendation
  const recommendation = generateRecommendation(options, risks, costOfInaction);

  // 9. Generate executive summary using AI
  const executiveSummary = await synthesizeExecutiveSummary(
    insights,
    options,
    recommendation,
    audience
  );

  // 10. Generate decision frame
  const decision = generateDecisionFrame(topic, recommendation, urgency);

  // 11. Generate next steps
  const nextSteps = generateNextSteps(recommendation, urgency);

  // 12. Generate appendix references
  const appendixReferences = analyses.map(a => ({
    title: a.name || `Analysis ${a.id}`,
    type: "analysis" as const,
    link: `/analysis/${a.id}`
  }));

  return {
    id: `brief_${Date.now()}`,
    title: `Strategic Brief: ${topic}`,
    preparedFor: audienceToLabel(audience),
    preparedBy: "Brand Intelligence Platform",
    date: new Date().toISOString().split("T")[0],
    confidentiality: audience === "board" ? "board_only" : "internal",
    
    executiveSummary,
    context,
    decision,
    options,
    recommendation,
    risks,
    costOfInaction,
    nextSteps,
    appendixReferences,
    
    sourceAnalyses: analysisIds.map(String),
    generatedAt: new Date().toISOString(),
    version: "1.0"
  };
}

/**
 * Gather source analyses from storage
 */
interface SourceAnalysis {
  id: number;
  type: string;
  name: string;
  data: any;
}

async function gatherSourceAnalyses(analysisIds: number[]): Promise<SourceAnalysis[]> {
  const analyses: SourceAnalysis[] = [];

  for (const id of analysisIds) {
    // Try keyword gap analyses
    try {
      const kgAnalysis = await storage.getKeywordGapAnalysisById(id, "");
      if (kgAnalysis) {
        analyses.push({
          id: kgAnalysis.id,
          type: "keyword_gap",
          name: kgAnalysis.configurationName,
          data: kgAnalysis
        });
        continue;
      }
    } catch {}

    // Try market demand analyses
    try {
      const mdAnalysis = await storage.getMarketDemandAnalysisById(id, "");
      if (mdAnalysis) {
        analyses.push({
          id: mdAnalysis.id,
          type: "market_demand",
          name: `Market Demand Analysis`,
          data: mdAnalysis
        });
        continue;
      }
    } catch {}
  }

  return analyses;
}

/**
 * Extract key insights from analyses
 */
interface Insight {
  headline: string;
  detail: string;
  source: string;
  importance: "high" | "medium" | "low";
  dataPoint?: string;
}

function extractKeyInsights(analyses: SourceAnalysis[]): Insight[] {
  const insights: Insight[] = [];

  for (const analysis of analyses) {
    switch (analysis.type) {
      case "keyword_gap":
        insights.push(...extractKeywordGapInsights(analysis.data));
        break;
      case "market_demand":
        insights.push(...extractMarketDemandInsights(analysis.data));
        break;
    }
  }

  return insights.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.importance] - order[b.importance];
  });
}

function extractKeywordGapInsights(data: any): Insight[] {
  const insights: Insight[] = [];

  if (data.totalKeywords > 0) {
    insights.push({
      headline: `${data.passCount} high-opportunity keywords identified`,
      detail: `Out of ${data.totalKeywords} gap keywords analyzed, ${data.passCount} passed capability filters`,
      source: "Keyword Gap Analysis",
      importance: "high",
      dataPoint: `${data.passCount}/${data.totalKeywords}`
    });
  }

  if (data.estimatedMissingValue > 0) {
    insights.push({
      headline: `$${(data.estimatedMissingValue / 1000).toFixed(0)}K estimated missing value`,
      detail: `Directional estimate of traffic value competitors capture that we don't`,
      source: "Keyword Gap Analysis",
      importance: "high",
      dataPoint: `$${data.estimatedMissingValue.toLocaleString()}`
    });
  }

  if (data.topThemes?.length > 0) {
    const topTheme = data.topThemes[0];
    insights.push({
      headline: `"${topTheme.theme}" is the largest opportunity cluster`,
      detail: `${topTheme.count} keywords with ${topTheme.totalVolume.toLocaleString()} monthly volume`,
      source: "Keyword Gap Analysis",
      importance: "medium",
      dataPoint: topTheme.theme
    });
  }

  return insights;
}

function extractMarketDemandInsights(data: any): Insight[] {
  const insights: Insight[] = [];

  // Extract relevant insights from market demand data
  if (data.trendDirection) {
    insights.push({
      headline: `Category demand is ${data.trendDirection}`,
      detail: `5-year trend analysis shows ${data.trendDirection} trajectory`,
      source: "Market Demand Analysis",
      importance: data.trendDirection === "declining" ? "high" : "medium"
    });
  }

  return insights;
}

/**
 * Generate context section
 */
function generateContext(insights: Insight[], config: Configuration): BriefContext {
  const brandName = config.brand?.name || config.brand?.domain || "the brand";
  const category = config.category_definition?.primary_category || "the category";
  const competitors = config.competitors?.competitors || [];
  const tier1Count = competitors.filter(c => c.tier === "tier1").length;

  return {
    marketContext: `${brandName} operates in ${category}, a market with ${insights.length > 0 ? "identified opportunities" : "evolving dynamics"}.`,
    competitiveContext: `${tier1Count} tier-1 competitors are actively competing for market share.`,
    internalContext: `Current analysis reveals ${insights.filter(i => i.importance === "high").length} high-priority findings requiring attention.`
  };
}

/**
 * Generate strategic options
 */
async function generateOptions(
  insights: Insight[],
  config: Configuration,
  topic: string
): Promise<StrategicOption[]> {
  const options: StrategicOption[] = [];

  // Option A: Aggressive pursuit
  options.push({
    id: "A",
    name: "Aggressive Pursuit",
    description: `Fully invest in capturing the identified opportunities in ${topic}`,
    pros: [
      "Maximum potential upside",
      "First-mover advantage",
      "Establishes market leadership"
    ],
    cons: [
      "Higher resource requirement",
      "Greater execution risk",
      "May trigger competitive response"
    ],
    investment: "High ($$$)",
    expectedOutcome: "Significant market share gain within 6-12 months",
    riskLevel: "high",
    probability: 0.6
  });

  // Option B: Measured approach
  options.push({
    id: "B",
    name: "Measured Approach",
    description: `Phased investment with validation gates before scaling`,
    pros: [
      "Lower initial risk",
      "Allows for learning and adjustment",
      "Preserves resources for other initiatives"
    ],
    cons: [
      "Slower time to impact",
      "Competitors may move faster",
      "May miss window of opportunity"
    ],
    investment: "Medium ($$)",
    expectedOutcome: "Steady progress with validated results in 9-15 months",
    riskLevel: "medium",
    probability: 0.75
  });

  // Option C: Defensive/Wait
  options.push({
    id: "C",
    name: "Monitor and Defend",
    description: `Maintain current position while gathering more data`,
    pros: [
      "Lowest resource commitment",
      "Preserves optionality",
      "Allows market to clarify"
    ],
    cons: [
      "Risk of falling behind",
      "Competitors gain ground",
      "May be harder to catch up later"
    ],
    investment: "Low ($)",
    expectedOutcome: "Maintained position with delayed opportunity capture",
    riskLevel: "low",
    probability: 0.9
  });

  return options;
}

/**
 * Analyze risks
 */
function analyzeRisks(options: StrategicOption[], config: Configuration): Risk[] {
  const risks: Risk[] = [];

  // Execution risk
  risks.push({
    risk: "Execution complexity exceeds internal capability",
    likelihood: "medium",
    impact: "high",
    mitigation: "Phase implementation and consider external support"
  });

  // Competitive response risk
  const competitors = config.competitors?.competitors || [];
  if (competitors.filter(c => c.tier === "tier1").length > 0) {
    risks.push({
      risk: "Tier-1 competitors respond aggressively",
      likelihood: "high",
      impact: "medium",
      mitigation: "Build defensible differentiation before scaling"
    });
  }

  // Market risk
  risks.push({
    risk: "Market conditions change during execution",
    likelihood: "low",
    impact: "high",
    mitigation: "Build in quarterly review gates with pivot options"
  });

  // Resource risk
  risks.push({
    risk: "Resource constraints delay or limit execution",
    likelihood: "medium",
    impact: "medium",
    mitigation: "Prioritize initiatives and secure budget commitment upfront"
  });

  return risks;
}

/**
 * Calculate cost of inaction
 */
function calculateCostOfInaction(insights: Insight[], config: Configuration): CostOfInaction {
  // Find the highest-value insight
  const highValueInsight = insights.find(i => i.importance === "high" && i.dataPoint);
  
  if (highValueInsight?.dataPoint?.includes("$")) {
    return {
      description: `Continued loss of market opportunity to competitors`,
      quantifiedImpact: `${highValueInsight.dataPoint} in missed value per year`,
      timeframe: "Ongoing, compounding quarterly"
    };
  }

  return {
    description: "Gradual erosion of competitive position",
    quantifiedImpact: "Estimated 5-10% share loss over 12 months",
    timeframe: "Progressive over next 4 quarters"
  };
}

/**
 * Generate recommendation
 */
function generateRecommendation(
  options: StrategicOption[],
  risks: Risk[],
  costOfInaction: CostOfInaction
): Recommendation {
  // Default to Option B (measured approach) as balanced recommendation
  const selectedOption: OptionId = "B";
  const selected = options.find(o => o.id === selectedOption)!;

  return {
    selectedOption,
    rationale: `Option ${selectedOption} (${selected.name}) balances opportunity capture with risk management. It provides ${selected.probability * 100}% probability of success while allowing for course correction.`,
    keyAssumptions: [
      "Market conditions remain stable",
      "Resources are allocated as planned",
      "Competitive response is manageable",
      "Internal capabilities are sufficient"
    ],
    successMetrics: [
      "Keyword ranking improvements within 90 days",
      "Traffic growth of 15-25% within 6 months",
      "Positive ROI indication by month 9"
    ]
  };
}

/**
 * Synthesize executive summary using AI
 */
async function synthesizeExecutiveSummary(
  insights: Insight[],
  options: StrategicOption[],
  recommendation: Recommendation,
  audience: BriefAudience
): Promise<ExecutiveSummary> {
  const selectedOption = options.find(o => o.id === recommendation.selectedOption)!;

  const prompt = `
You are a McKinsey-trained strategy consultant preparing a board brief.

Audience: ${audienceToLabel(audience)}

Key Insights:
${insights.slice(0, 5).map(i => `- ${i.headline}: ${i.detail}`).join("\n")}

Options:
${options.map(o => `- Option ${o.id}: ${o.name} - ${o.description}`).join("\n")}

Recommendation: Option ${recommendation.selectedOption} (${selectedOption.name})

Generate a 5-bullet executive summary with:
1. situation: What's happening (1 sentence, max 20 words)
2. challenge: What we need to solve (1 sentence, max 20 words)
3. recommendation: What we should do (1 sentence, max 20 words)
4. impact: What we expect to achieve (1 sentence, max 20 words)
5. timeline: When we need to act (1 sentence, max 20 words)

Use active voice. Be specific. No jargon.

Respond in JSON format:
{
  "situation": "...",
  "challenge": "...",
  "recommendation": "...",
  "impact": "...",
  "timeline": "..."
}
`;

  try {
    const response = await generateWithAI(prompt, { temperature: 0.3 });
    return JSON.parse(response);
  } catch {
    // Fallback to template-based summary
    return {
      situation: `Analysis reveals ${insights.length} key findings requiring strategic decision.`,
      challenge: `Determine optimal investment level to capture identified opportunities.`,
      recommendation: `Pursue ${selectedOption.name} with ${selectedOption.investment} investment.`,
      impact: `Expected outcome: ${selectedOption.expectedOutcome}.`,
      timeline: `Decision required within 2 weeks to maintain competitive timing.`
    };
  }
}

/**
 * Generate decision frame
 */
function generateDecisionFrame(
  topic: string,
  recommendation: Recommendation,
  urgency: BriefUrgency
): DecisionFrame {
  const deadlineMap: Record<BriefUrgency, string> = {
    routine: "End of quarter",
    important: "Within 2 weeks",
    critical: "Within 48 hours"
  };

  return {
    question: `Should we invest in ${topic} using the ${recommendation.selectedOption === "A" ? "aggressive" : recommendation.selectedOption === "B" ? "measured" : "defensive"} approach?`,
    deadline: deadlineMap[urgency],
    decisionMaker: "CMO / Executive Team",
    stakeholders: ["Marketing", "Finance", "Product", "Sales"]
  };
}

/**
 * Generate next steps
 */
function generateNextSteps(
  recommendation: Recommendation,
  urgency: BriefUrgency
): NextStep[] {
  const steps: NextStep[] = [];

  const urgencyOffset: Record<BriefUrgency, number> = {
    routine: 14,
    important: 7,
    critical: 2
  };
  const offset = urgencyOffset[urgency];

  steps.push({
    step: "Review and approve strategic recommendation",
    owner: "Executive Team",
    deadline: `+${offset} days`
  });

  steps.push({
    step: "Allocate budget and resources",
    owner: "Finance / CMO",
    deadline: `+${offset + 7} days`
  });

  steps.push({
    step: "Develop detailed execution plan",
    owner: "Marketing Lead",
    deadline: `+${offset + 14} days`
  });

  steps.push({
    step: "Begin Phase 1 implementation",
    owner: "Project Team",
    deadline: `+${offset + 21} days`
  });

  return steps;
}

/**
 * Convert audience to label
 */
function audienceToLabel(audience: BriefAudience): string {
  const labels: Record<BriefAudience, string> = {
    board: "Board of Directors",
    executive: "Executive Team",
    cmo: "Chief Marketing Officer",
    investor: "Investors"
  };
  return labels[audience];
}
```

---

## API Routes

```typescript
// server/routes.ts - Agregar

import { generateBoardBrief } from "./modules/board-brief-generator";

// POST /api/board-brief/generate
app.post("/api/board-brief/generate", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { configurationId, topic, analysisIds, audience, urgency } = req.body;

    if (!configurationId || !topic || !analysisIds?.length) {
      return res.status(400).json({ 
        error: "Missing required fields: configurationId, topic, analysisIds" 
      });
    }

    const config = await storage.getConfigurationById(configurationId, userId);
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const brief = await generateBoardBrief(config, {
      configurationId,
      topic,
      analysisIds,
      audience,
      urgency
    });

    res.json(brief);
  } catch (error) {
    console.error("Error generating board brief:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Brief generation failed" 
    });
  }
});

// GET /api/board-brief/templates
app.get("/api/board-brief/templates", requireAuth, (req, res) => {
  const templates = [
    { id: "market_opportunity", name: "Market Opportunity Assessment" },
    { id: "competitive_response", name: "Competitive Response Strategy" },
    { id: "investment_decision", name: "Investment Decision" },
    { id: "quarterly_review", name: "Quarterly Strategic Review" }
  ];
  res.json(templates);
});
```

---

## UI Component (Simplified)

```tsx
// client/src/pages/board-brief.tsx

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Share } from "lucide-react";

export default function BoardBriefPage() {
  const [topic, setTopic] = useState("");
  const [selectedAnalyses, setSelectedAnalyses] = useState<number[]>([]);
  const [audience, setAudience] = useState<string>("board");
  const [urgency, setUrgency] = useState<string>("important");
  const [generatedBrief, setGeneratedBrief] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/board-brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configurationId: 1, // From context
          topic,
          analysisIds: selectedAnalyses,
          audience,
          urgency
        })
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedBrief(data);
    }
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Board-Ready Strategy Brief</h1>
      </div>

      {/* Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Brief Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Topic</label>
            <Input 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Recovery Footwear Market Expansion"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Audience</label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board">Board of Directors</SelectItem>
                  <SelectItem value="executive">Executive Team</SelectItem>
                  <SelectItem value="cmo">CMO</SelectItem>
                  <SelectItem value="investor">Investors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Urgency</label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={() => generateMutation.mutate()}
            disabled={!topic || generateMutation.isPending}
          >
            {generateMutation.isPending ? "Generating..." : "Generate Brief"}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Brief */}
      {generatedBrief && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{generatedBrief.title}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Executive Summary */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Executive Summary</h3>
              <ul className="space-y-1 text-sm">
                <li><strong>Situation:</strong> {generatedBrief.executiveSummary.situation}</li>
                <li><strong>Challenge:</strong> {generatedBrief.executiveSummary.challenge}</li>
                <li><strong>Recommendation:</strong> {generatedBrief.executiveSummary.recommendation}</li>
                <li><strong>Impact:</strong> {generatedBrief.executiveSummary.impact}</li>
                <li><strong>Timeline:</strong> {generatedBrief.executiveSummary.timeline}</li>
              </ul>
            </div>

            {/* Options Table */}
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Strategic Options</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Option</th>
                    <th className="text-left py-2">Investment</th>
                    <th className="text-left py-2">Risk</th>
                    <th className="text-left py-2">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedBrief.options.map((opt: any) => (
                    <tr key={opt.id} className={`border-b ${opt.id === generatedBrief.recommendation.selectedOption ? "bg-blue-50" : ""}`}>
                      <td className="py-2 font-medium">
                        {opt.id}: {opt.name}
                        {opt.id === generatedBrief.recommendation.selectedOption && (
                          <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Recommended</span>
                        )}
                      </td>
                      <td className="py-2">{opt.investment}</td>
                      <td className="py-2 capitalize">{opt.riskLevel}</td>
                      <td className="py-2">{opt.expectedOutcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Decision Required */}
            <div className="bg-amber-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">Decision Required</h3>
              <p className="text-sm mb-2">{generatedBrief.decision.question}</p>
              <p className="text-xs text-gray-600">
                <strong>Deadline:</strong> {generatedBrief.decision.deadline} | 
                <strong> Decision Maker:</strong> {generatedBrief.decision.decisionMaker}
              </p>
            </div>

            {/* Cost of Inaction */}
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Cost of Inaction</h3>
              <p className="text-sm">{generatedBrief.costOfInaction.description}</p>
              <p className="text-sm font-medium mt-1">{generatedBrief.costOfInaction.quantifiedImpact}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Unit tests para insight extraction
- [ ] Unit tests para options generation
- [ ] Unit tests para recommendation logic
- [ ] Integration tests con mock AI
- [ ] E2E tests para API endpoint
- [ ] PDF export functionality

---

## Rollout Plan

1. **Week 1**: Implement core module + API
2. **Week 2**: Build UI component
3. **Week 3**: Add PDF export, testing, polish
