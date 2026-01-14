# Implementation Guide: Positioning Stress Test™

> **Feature**: 3 of 5 Strategic Features  
> **Complexity**: Media  
> **Timeline**: 4-5 semanas  
> **Dependencies**: UCR completo, OpenAI/Gemini

---

## Concepto

War-gaming automatizado que simula ataques competitivos reales y mide la resiliencia de cada claim del posicionamiento.

---

## Escenarios de Ataque

```typescript
// shared/types/stress-test.ts

export type AttackVector = 
  | "copy_message"      // Competidor copia tu mensaje
  | "outspend"          // Competidor invierte 10x más
  | "new_entrant"       // Nuevo entrante con mejor storytelling
  | "price_war"         // Guerra de precios / recesión
  | "feature_parity"    // Competidor iguala features
  | "narrative_hijack"; // Competidor roba tu narrativa

export interface StressScenario {
  id: string;
  name: string;
  description: string;
  attackVector: AttackVector;
  severity: "mild" | "moderate" | "severe" | "existential";
  simulationPrompt: string; // Para AI analysis
}

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: "copy_message",
    name: "Message Copying",
    description: "A tier-1 competitor copies your exact messaging",
    attackVector: "copy_message",
    severity: "moderate",
    simulationPrompt: "Analyze if this positioning claim would remain defensible if a well-funded competitor started using identical messaging."
  },
  {
    id: "outspend_10x",
    name: "10x Budget Attack",
    description: "Competitor allocates 10x your budget to your category",
    attackVector: "outspend",
    severity: "severe",
    simulationPrompt: "Evaluate if this claim can maintain visibility when a competitor outspends by 10x in paid and organic channels."
  },
  {
    id: "new_entrant_vc",
    name: "VC-Backed New Entrant",
    description: "Well-funded startup enters with better storytelling",
    attackVector: "new_entrant",
    severity: "severe",
    simulationPrompt: "Assess vulnerability if a new entrant with superior storytelling and fresh brand enters the market."
  },
  {
    id: "recession",
    name: "Demand Contraction",
    description: "Category demand drops 30% due to economic conditions",
    attackVector: "price_war",
    severity: "existential",
    simulationPrompt: "Determine if this positioning holds value when category demand contracts significantly and price becomes primary decision factor."
  },
  {
    id: "feature_parity",
    name: "Feature Parity",
    description: "Competitor matches all product features",
    attackVector: "feature_parity",
    severity: "moderate",
    simulationPrompt: "Evaluate if this claim remains differentiated when competitors achieve feature parity."
  },
  {
    id: "narrative_hijack",
    name: "Narrative Hijacking",
    description: "Competitor claims ownership of your narrative with more resources",
    attackVector: "narrative_hijack",
    severity: "severe",
    simulationPrompt: "Analyze if this positioning can be defended if a larger competitor attempts to own the same narrative."
  }
];
```

---

## Types & Interfaces

```typescript
// shared/types/stress-test.ts (continuación)

export type VulnerabilityLevel = "low" | "medium" | "high" | "critical";
export type ClaimRecommendation = "KEEP" | "STRENGTHEN" | "REPLACE" | "ABANDON";

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  survives: boolean;
  survivalScore: number; // 0-100
  impactDescription: string;
  mitigationRequired: string;
  aiAnalysis: string;
}

export interface ClaimAnalysis {
  claim: string;
  source: "tagline" | "category_definition" | "demand_theme" | "brand_promise";
  
  // Vulnerability assessment
  vulnerabilityScore: number; // 0-100 (higher = more vulnerable)
  vulnerabilityLevel: VulnerabilityLevel;
  
  // Scenario results
  scenarioResults: ScenarioResult[];
  
  // Recommendations
  recommendation: ClaimRecommendation;
  suggestedAlternative?: string;
  proofRequired?: string[];
  
  // AI reasoning
  aiReasoning: string;
}

export interface DefensibleClaim {
  claim: string;
  whyDefensible: string;
  proofPoints: string[];
  moatStrength: number; // 0-100
}

export interface CriticalGap {
  gap: string;
  risk: string;
  urgency: "immediate" | "short_term" | "medium_term";
  suggestedAction: string;
  estimatedEffort: string;
}

export interface StressTestResult {
  // Overall resilience
  overallResilienceScore: number; // 0-100
  resilienceGrade: "A" | "B" | "C" | "D" | "F";
  
  // Per-claim analysis
  claimAnalysis: ClaimAnalysis[];
  
  // Defensible claims
  defensibleClaims: DefensibleClaim[];
  
  // Critical gaps
  criticalGaps: CriticalGap[];
  
  // Executive summary
  executiveSummary: string;
  topPriority: string;
  
  // Metadata
  scenariosRun: string[];
  executedAt: string;
  trace: ItemTrace[];
}
```

---

## Module Contract

```typescript
// shared/module.contract.ts - Agregar

export const PositioningStressTestContract: ModuleContract = {
  moduleId: "strategic.positioning_stress_test.v1",
  name: "Positioning Stress Test",
  category: "Strategic Intelligence",
  layer: "Synthesis",
  version: "contract.v1",

  description: 
    "War-gaming system that simulates competitive attacks on positioning claims " +
    "and measures resilience, identifying vulnerabilities before competitors exploit them.",
  
  strategicQuestion: 
    "Which of our positioning claims would survive a real competitive attack?",

  dataSources: ["OpenAI", "Internal"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "low",
    inferenceType: "internal"
  },

  caching: {
    cadence: "monthly",
    ttlSeconds: 2592000,
    bustOnChanges: ["category_scope", "governance"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B"],
    optionalSections: ["C", "D", "E", "H"],
    sectionUsage: {
      A: "Brand identity and tagline for claim extraction",
      B: "Category definition for positioning context",
      C: "Competitor context for realistic attack simulation",
      D: "Demand themes as additional claims to test",
      E: "Strategic posture for severity weighting",
      H: "Capability model for defensibility assessment"
    },
    gates: {
      fenceMode: "none",
      negativeScopeMode: "none"
    }
  },

  inputs: {
    fields: [
      {
        name: "scenarios",
        type: "string[]",
        required: false,
        default: ["copy_message", "outspend_10x", "new_entrant_vc", "recession"],
        description: "Specific scenarios to run"
      },
      {
        name: "include_competitor_benchmark",
        type: "boolean",
        required: false,
        default: true,
        description: "Compare against competitor positioning"
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
    entityType: "stress_test_result",
    visuals: [
      { kind: "card", title: "Resilience Score" },
      { kind: "heatmap", title: "Claim Vulnerability Matrix" },
      { kind: "table", title: "Claim Analysis" },
      { kind: "table", title: "Critical Gaps" }
    ],
    summaryFields: [
      "resilience_score",
      "resilience_grade",
      "critical_gaps_count",
      "top_priority"
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

## Core Module Implementation

```typescript
// server/modules/positioning-stress-test.ts

import type { Configuration } from "@shared/schema";
import type { 
  StressTestResult,
  ClaimAnalysis,
  ScenarioResult,
  DefensibleClaim,
  CriticalGap,
  VulnerabilityLevel,
  ClaimRecommendation,
  StressScenario
} from "@shared/types/stress-test";
import { STRESS_SCENARIOS } from "@shared/types/stress-test";
import type { ItemTrace, UCRSectionID } from "@shared/module.contract";
import { validateModuleExecution } from "../execution-gateway";
import { PositioningStressTestContract } from "@shared/module.contract";
import { generateWithAI } from "../services/ai-service";

interface StressTestOptions {
  scenarios?: string[];
  includeCompetitorBenchmark?: boolean;
}

/**
 * Main entry point for Positioning Stress Test
 */
export async function runPositioningStressTest(
  config: Configuration,
  options: StressTestOptions = {}
): Promise<StressTestResult> {
  const { 
    scenarios = ["copy_message", "outspend_10x", "new_entrant_vc", "recession"],
    includeCompetitorBenchmark = true 
  } = options;

  // 1. Validate UCR
  const validation = validateModuleExecution(config, PositioningStressTestContract.moduleId);
  if (!validation.canExecute) {
    throw new Error(`Cannot execute: ${validation.errors.join(", ")}`);
  }

  // 2. Extract positioning claims from UCR
  const claims = extractPositioningClaims(config);
  if (claims.length === 0) {
    throw new Error("No positioning claims found in UCR. Add tagline, category definition, or demand themes.");
  }

  // 3. Get competitor context if requested
  const competitorContext = includeCompetitorBenchmark 
    ? extractCompetitorContext(config)
    : null;

  // 4. Filter scenarios to run
  const scenariosToRun = STRESS_SCENARIOS.filter(s => scenarios.includes(s.id));

  // 5. Run stress test on each claim
  const claimAnalysis: ClaimAnalysis[] = [];
  
  for (const claim of claims) {
    const analysis = await stressTestClaim(claim, scenariosToRun, config, competitorContext);
    claimAnalysis.push(analysis);
  }

  // 6. Calculate overall resilience score
  const overallScore = calculateOverallResilience(claimAnalysis);
  const grade = scoreToGrade(overallScore);

  // 7. Identify defensible claims
  const defensibleClaims = claimAnalysis
    .filter(c => c.vulnerabilityLevel === "low" || c.vulnerabilityLevel === "medium")
    .map(c => ({
      claim: c.claim,
      whyDefensible: c.aiReasoning,
      proofPoints: c.proofRequired || [],
      moatStrength: 100 - c.vulnerabilityScore
    }));

  // 8. Identify critical gaps
  const criticalGaps = claimAnalysis
    .filter(c => c.vulnerabilityLevel === "critical" || c.vulnerabilityLevel === "high")
    .map(c => ({
      gap: c.claim,
      risk: `Vulnerable to ${c.scenarioResults.filter(s => !s.survives).length} of ${c.scenarioResults.length} attack scenarios`,
      urgency: c.vulnerabilityLevel === "critical" ? "immediate" as const : "short_term" as const,
      suggestedAction: c.suggestedAlternative || "Develop proof points or reposition",
      estimatedEffort: c.vulnerabilityLevel === "critical" ? "High" : "Medium"
    }));

  // 9. Generate executive summary
  const executiveSummary = generateExecutiveSummary(overallScore, grade, claimAnalysis, criticalGaps);
  const topPriority = criticalGaps[0]?.suggestedAction || "Maintain current positioning";

  return {
    overallResilienceScore: overallScore,
    resilienceGrade: grade,
    claimAnalysis,
    defensibleClaims,
    criticalGaps,
    executiveSummary,
    topPriority,
    scenariosRun: scenariosToRun.map(s => s.id),
    executedAt: new Date().toISOString(),
    trace: generateTrace(claimAnalysis, validation)
  };
}

/**
 * Extract positioning claims from UCR
 */
interface PositioningClaim {
  text: string;
  source: "tagline" | "category_definition" | "demand_theme" | "brand_promise";
}

function extractPositioningClaims(config: Configuration): PositioningClaim[] {
  const claims: PositioningClaim[] = [];

  // From brand tagline
  if (config.brand?.tagline) {
    claims.push({
      text: config.brand.tagline,
      source: "tagline"
    });
  }

  // From category definition
  if (config.category_definition?.primary_category) {
    claims.push({
      text: `Leader in ${config.category_definition.primary_category}`,
      source: "category_definition"
    });
  }

  // From demand themes (high priority only)
  const themes = config.demand_definition?.demand_themes || [];
  for (const theme of themes) {
    if (theme.priority === "high" && theme.name) {
      claims.push({
        text: `${theme.name} authority`,
        source: "demand_theme"
      });
    }
  }

  // From capability boosters (as implicit claims)
  const boosters = config.governance?.capability_model?.boosters || [];
  for (const booster of boosters.slice(0, 2)) { // Top 2 only
    if (booster.term) {
      claims.push({
        text: `Best-in-class ${booster.term}`,
        source: "brand_promise"
      });
    }
  }

  return claims;
}

/**
 * Extract competitor context for benchmark
 */
interface CompetitorContext {
  competitors: Array<{
    name: string;
    domain: string;
    tier: string;
  }>;
  competitorClaims: string[];
}

function extractCompetitorContext(config: Configuration): CompetitorContext {
  const competitors = config.competitors?.competitors || [];
  
  // Extract any known competitor claims (would need to be stored or inferred)
  const competitorClaims: string[] = [];
  
  return {
    competitors: competitors.map(c => ({
      name: c.name || c.domain,
      domain: c.domain,
      tier: c.tier || "tier2"
    })),
    competitorClaims
  };
}

/**
 * Run stress test on a single claim
 */
async function stressTestClaim(
  claim: PositioningClaim,
  scenarios: StressScenario[],
  config: Configuration,
  competitorContext: CompetitorContext | null
): Promise<ClaimAnalysis> {
  const scenarioResults: ScenarioResult[] = [];

  // Run each scenario
  for (const scenario of scenarios) {
    const result = await simulateScenario(claim, scenario, config, competitorContext);
    scenarioResults.push(result);
  }

  // Calculate vulnerability score
  const failedScenarios = scenarioResults.filter(r => !r.survives).length;
  const avgSurvivalScore = scenarioResults.reduce((sum, r) => sum + r.survivalScore, 0) / scenarioResults.length;
  const vulnerabilityScore = 100 - avgSurvivalScore;

  // Determine vulnerability level
  const vulnerabilityLevel = scoreToVulnerabilityLevel(vulnerabilityScore);

  // Get recommendation
  const recommendation = getClaimRecommendation(vulnerabilityScore, failedScenarios, scenarios.length);

  // Generate alternative if needed
  const suggestedAlternative = vulnerabilityScore > 60 
    ? await generateAlternativeClaim(claim, config, scenarioResults)
    : undefined;

  // Generate proof requirements
  const proofRequired = vulnerabilityScore > 40
    ? generateProofRequirements(claim, scenarioResults)
    : undefined;

  // Generate AI reasoning
  const aiReasoning = await generateClaimReasoning(claim, scenarioResults, vulnerabilityLevel);

  return {
    claim: claim.text,
    source: claim.source,
    vulnerabilityScore,
    vulnerabilityLevel,
    scenarioResults,
    recommendation,
    suggestedAlternative,
    proofRequired,
    aiReasoning
  };
}

/**
 * Simulate a single attack scenario on a claim
 */
async function simulateScenario(
  claim: PositioningClaim,
  scenario: StressScenario,
  config: Configuration,
  competitorContext: CompetitorContext | null
): Promise<ScenarioResult> {
  const brandName = config.brand?.name || config.brand?.domain || "the brand";
  const category = config.category_definition?.primary_category || "the category";
  
  const competitorInfo = competitorContext?.competitors
    .map(c => `${c.name} (${c.tier})`)
    .join(", ") || "major competitors";

  // Build AI prompt for scenario simulation
  const prompt = `
You are a strategic brand consultant analyzing positioning resilience.

BRAND: ${brandName}
CATEGORY: ${category}
COMPETITORS: ${competitorInfo}

POSITIONING CLAIM BEING TESTED:
"${claim.text}"

ATTACK SCENARIO:
Name: ${scenario.name}
Description: ${scenario.description}
Severity: ${scenario.severity}

ANALYSIS TASK:
${scenario.simulationPrompt}

Provide your analysis in the following JSON format:
{
  "survives": boolean (true if the claim would remain effective after this attack),
  "survivalScore": number (0-100, where 100 = completely unaffected),
  "impactDescription": string (1-2 sentences on how the attack would affect the claim),
  "mitigationRequired": string (1-2 sentences on what would be needed to defend against this attack)
}

Be realistic and critical. Consider:
1. Is this claim unique or easily copied?
2. Does it require proof that competitors could also provide?
3. Is it tied to a defensible capability or just messaging?
4. Would customers still believe it after the attack?

Respond ONLY with the JSON object.
`;

  try {
    const response = await generateWithAI(prompt, { temperature: 0.3 });
    const parsed = JSON.parse(response);

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      survives: parsed.survives,
      survivalScore: parsed.survivalScore,
      impactDescription: parsed.impactDescription,
      mitigationRequired: parsed.mitigationRequired,
      aiAnalysis: response
    };
  } catch (error) {
    // Fallback to heuristic-based analysis
    return heuristicScenarioAnalysis(claim, scenario);
  }
}

/**
 * Fallback heuristic analysis if AI fails
 */
function heuristicScenarioAnalysis(
  claim: PositioningClaim,
  scenario: StressScenario
): ScenarioResult {
  // Simple heuristics based on claim type and scenario
  let survivalScore = 50; // Base

  // Taglines are more vulnerable to copying
  if (claim.source === "tagline" && scenario.attackVector === "copy_message") {
    survivalScore -= 20;
  }

  // Category leadership claims are vulnerable to outspending
  if (claim.source === "category_definition" && scenario.attackVector === "outspend") {
    survivalScore -= 25;
  }

  // Demand theme claims are moderately defensible
  if (claim.source === "demand_theme") {
    survivalScore += 10;
  }

  // Existential scenarios are always severe
  if (scenario.severity === "existential") {
    survivalScore -= 30;
  }

  survivalScore = Math.max(0, Math.min(100, survivalScore));

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    survives: survivalScore >= 50,
    survivalScore,
    impactDescription: `${scenario.name} would ${survivalScore >= 50 ? "moderately" : "significantly"} impact this claim.`,
    mitigationRequired: survivalScore < 50 
      ? "Develop unique proof points or reposition to defensible ground."
      : "Monitor competitor activity and maintain differentiation.",
    aiAnalysis: "Heuristic analysis (AI unavailable)"
  };
}

/**
 * Generate alternative claim suggestion
 */
async function generateAlternativeClaim(
  claim: PositioningClaim,
  config: Configuration,
  scenarioResults: ScenarioResult[]
): Promise<string> {
  const failedScenarios = scenarioResults.filter(r => !r.survives);
  
  const prompt = `
The positioning claim "${claim.text}" failed these attack scenarios:
${failedScenarios.map(s => `- ${s.scenarioName}: ${s.impactDescription}`).join("\n")}

Brand context:
- Category: ${config.category_definition?.primary_category || "Unknown"}
- Key strengths: ${config.governance?.capability_model?.boosters?.map(b => b.term).join(", ") || "Unknown"}

Suggest ONE alternative positioning claim that would be more defensible against these attacks.
The claim should be:
1. Specific and provable
2. Tied to a unique capability
3. Difficult for competitors to copy

Respond with just the claim text, no explanation.
`;

  try {
    const response = await generateWithAI(prompt, { temperature: 0.5 });
    return response.trim().replace(/^["']|["']$/g, "");
  } catch {
    return "Consider a more specific, proof-based positioning claim.";
  }
}

/**
 * Generate proof requirements for a claim
 */
function generateProofRequirements(
  claim: PositioningClaim,
  scenarioResults: ScenarioResult[]
): string[] {
  const proofs: string[] = [];

  // Based on failed scenarios, suggest proof types
  const failedScenarios = scenarioResults.filter(r => !r.survives);

  for (const scenario of failedScenarios) {
    switch (scenario.scenarioId) {
      case "copy_message":
        proofs.push("Third-party validation or certification");
        proofs.push("Quantifiable metrics unique to your brand");
        break;
      case "outspend_10x":
        proofs.push("Customer testimonials and case studies");
        proofs.push("Industry awards or recognition");
        break;
      case "new_entrant_vc":
        proofs.push("Heritage and track record documentation");
        proofs.push("Proprietary technology or process");
        break;
      case "recession":
        proofs.push("Value proposition with clear ROI");
        proofs.push("Essential (not nice-to-have) positioning");
        break;
    }
  }

  return [...new Set(proofs)].slice(0, 4);
}

/**
 * Generate AI reasoning for claim analysis
 */
async function generateClaimReasoning(
  claim: PositioningClaim,
  scenarioResults: ScenarioResult[],
  vulnerabilityLevel: VulnerabilityLevel
): Promise<string> {
  const survivedCount = scenarioResults.filter(r => r.survives).length;
  const totalCount = scenarioResults.length;

  const prompt = `
Summarize in 2-3 sentences why the positioning claim "${claim.text}" has ${vulnerabilityLevel} vulnerability.
It survived ${survivedCount} of ${totalCount} attack scenarios.

Key findings:
${scenarioResults.map(s => `- ${s.scenarioName}: ${s.survives ? "Survived" : "Failed"}`).join("\n")}

Be concise and actionable.
`;

  try {
    const response = await generateWithAI(prompt, { temperature: 0.3 });
    return response.trim();
  } catch {
    return `This claim has ${vulnerabilityLevel} vulnerability, surviving ${survivedCount} of ${totalCount} attack scenarios.`;
  }
}

/**
 * Calculate overall resilience score
 */
function calculateOverallResilience(claimAnalysis: ClaimAnalysis[]): number {
  if (claimAnalysis.length === 0) return 0;

  // Weight by claim source (tagline is most important)
  const weights: Record<string, number> = {
    tagline: 2.0,
    category_definition: 1.5,
    demand_theme: 1.0,
    brand_promise: 0.8
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const claim of claimAnalysis) {
    const weight = weights[claim.source] || 1.0;
    const resilience = 100 - claim.vulnerabilityScore;
    weightedSum += resilience * weight;
    totalWeight += weight;
  }

  return Math.round(weightedSum / totalWeight);
}

/**
 * Convert score to grade
 */
function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

/**
 * Convert score to vulnerability level
 */
function scoreToVulnerabilityLevel(score: number): VulnerabilityLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

/**
 * Get recommendation based on vulnerability
 */
function getClaimRecommendation(
  vulnerabilityScore: number,
  failedScenarios: number,
  totalScenarios: number
): ClaimRecommendation {
  if (vulnerabilityScore >= 75 || failedScenarios >= totalScenarios * 0.75) {
    return "ABANDON";
  }
  if (vulnerabilityScore >= 50 || failedScenarios >= totalScenarios * 0.5) {
    return "REPLACE";
  }
  if (vulnerabilityScore >= 25) {
    return "STRENGTHEN";
  }
  return "KEEP";
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(
  score: number,
  grade: string,
  claimAnalysis: ClaimAnalysis[],
  criticalGaps: CriticalGap[]
): string {
  const totalClaims = claimAnalysis.length;
  const vulnerableClaims = claimAnalysis.filter(c => c.vulnerabilityLevel === "high" || c.vulnerabilityLevel === "critical").length;

  if (grade === "A" || grade === "B") {
    return `Positioning resilience is ${grade === "A" ? "strong" : "good"} (${score}/100). ${totalClaims - vulnerableClaims} of ${totalClaims} claims are defensible. Continue monitoring and strengthen proof points.`;
  }
  
  if (grade === "C") {
    return `Positioning resilience is moderate (${score}/100). ${vulnerableClaims} of ${totalClaims} claims are vulnerable to competitive attack. Prioritize strengthening or replacing weak claims.`;
  }

  return `Positioning resilience is weak (${score}/100). ${vulnerableClaims} of ${totalClaims} claims are highly vulnerable. Immediate repositioning recommended to avoid competitive erosion.`;
}

/**
 * Generate trace for explainability
 */
function generateTrace(
  claimAnalysis: ClaimAnalysis[],
  validation: any
): ItemTrace[] {
  const traces: ItemTrace[] = [];

  for (const claim of claimAnalysis) {
    traces.push({
      ruleId: `STRESS_${claim.recommendation}`,
      ucrSection: claim.source === "tagline" ? "A" : claim.source === "category_definition" ? "B" : "D",
      reason: `Claim "${claim.claim}" - ${claim.recommendation}`,
      severity: claim.vulnerabilityLevel === "critical" ? "critical" : 
               claim.vulnerabilityLevel === "high" ? "high" : "medium",
      evidence: `Vulnerability: ${claim.vulnerabilityScore}%, Failed ${claim.scenarioResults.filter(s => !s.survives).length} scenarios`
    });
  }

  return traces;
}
```

---

## API Routes

```typescript
// server/routes.ts - Agregar

import { runPositioningStressTest } from "./modules/positioning-stress-test";

// POST /api/stress-test/run
app.post("/api/stress-test/run", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { configurationId, scenarios, includeCompetitorBenchmark } = req.body;

    const config = await storage.getConfigurationById(configurationId, userId);
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const result = await runPositioningStressTest(config, {
      scenarios,
      includeCompetitorBenchmark
    });

    res.json(result);
  } catch (error) {
    console.error("Error running stress test:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Stress test failed" 
    });
  }
});

// GET /api/stress-test/scenarios
app.get("/api/stress-test/scenarios", requireAuth, (req, res) => {
  res.json(STRESS_SCENARIOS.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    severity: s.severity
  })));
});
```

---

## Testing Checklist

- [ ] Unit tests para claim extraction
- [ ] Unit tests para scenario simulation
- [ ] Unit tests para scoring calculations
- [ ] Integration tests con mock AI
- [ ] E2E tests para API endpoint
