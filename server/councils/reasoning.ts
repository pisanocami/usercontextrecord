import OpenAI from 'openai';
import type { CouncilPerspective, CouncilSynthesis } from './types';
import { COUNCIL_DEFINITIONS } from './definitions';
import { MODULE_COUNCIL_MAP, SUPPORTING_COUNCILS } from './types';
import { 
  checkRecommendationGuardrails, 
  filterRecommendationsWithGuardrails, 
  createCouncilGuardrails,
  summarizeGuardrailViolations,
  type CouncilGuardrails,
  type GuardrailCheckResult,
  type GuardrailViolation
} from './guardrails';
import type { NegativeScope, StrategicIntent } from '@shared/schema';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return openaiClient;
}

export class CouncilReasoning {
  async getCouncilPerspective(
    councilId: string,
    moduleData: Record<string, unknown>,
    brandContext?: string
  ): Promise<CouncilPerspective | null> {
    const council = COUNCIL_DEFINITIONS[councilId];
    
    if (!council || !council.isActive) {
      return null;
    }

    try {
      const prompt = `${council.reasoningPrompt}

Brand Context: ${brandContext || 'Not provided'}

Module Data:
${JSON.stringify(moduleData, null, 2)}

Provide your analysis as the ${council.name}.`;

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert council member providing strategic analysis. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return null;
      }

      const parsed = JSON.parse(content);
      
      return {
        councilId,
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || [],
        recommendations: parsed.recommendations || [],
        concerns: parsed.concerns || [],
        confidenceLevel: parsed.confidenceLevel || 0.5,
        reasoning: content
      };
    } catch (error) {
      console.error(`Council ${councilId} reasoning failed:`, error);
      return null;
    }
  }

  async getModulePerspectives(
    moduleId: string,
    moduleData: Record<string, unknown>,
    brandContext?: string
  ): Promise<Map<string, CouncilPerspective>> {
    const perspectives = new Map<string, CouncilPerspective>();
    
    const ownerCouncilId = MODULE_COUNCIL_MAP[moduleId];
    const supportingCouncilIds = SUPPORTING_COUNCILS[moduleId] || [];
    
    const councilIds = ownerCouncilId 
      ? [ownerCouncilId, ...supportingCouncilIds]
      : supportingCouncilIds;

    const results = await Promise.all(
      councilIds.map(id => this.getCouncilPerspective(id, moduleData, brandContext))
    );

    for (let i = 0; i < councilIds.length; i++) {
      const perspective = results[i];
      if (perspective) {
        perspectives.set(councilIds[i], perspective);
      }
    }

    return perspectives;
  }

  async synthesizePerspectives(
    perspectives: Map<string, CouncilPerspective>
  ): Promise<CouncilSynthesis> {
    if (perspectives.size === 0) {
      return this.createEmptySynthesis();
    }

    const perspectivesArray = Array.from(perspectives.values());
    const councilIds = Array.from(perspectives.keys());

    const allRecommendations = perspectivesArray.flatMap(p => p.recommendations);
    const allConcerns = perspectivesArray.flatMap(p => p.concerns);
    const avgConfidence = perspectivesArray.reduce((sum, p) => sum + p.confidenceLevel, 0) / perspectivesArray.length;

    try {
      const synthesisPrompt = `You are the Master Synthesis Council. Synthesize these perspectives into unified recommendations.

Perspectives:
${JSON.stringify(perspectivesArray, null, 2)}

Create a unified synthesis that:
1. Identifies the primary action to take
2. Lists supporting actions
3. Notes where councils agree and disagree
4. Resolves any conflicts with clear rationale

Respond as JSON with:
{
  "primaryAction": string,
  "supportingActions": string[],
  "timing": string,
  "expectedImpact": string,
  "agreements": [{ "topic": string, "councils": string[], "strength": "strong"|"moderate"|"weak" }],
  "conflicts": [{ "topic": string, "councilA": string, "positionA": string, "councilB": string, "positionB": string, "resolution": string, "rationale": string }]
}`;

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are the Master Synthesis Council. Provide unified strategic guidance.' },
          { role: 'user', content: synthesisPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.createFallbackSynthesis(perspectivesArray, councilIds, avgConfidence);
      }

      const parsed = JSON.parse(content);

      return {
        unifiedRecommendation: {
          primaryAction: parsed.primaryAction || allRecommendations[0] || 'Review data and define strategy',
          supportingActions: parsed.supportingActions || [],
          timing: parsed.timing || 'To be determined',
          expectedImpact: parsed.expectedImpact || 'Medium',
          confidence: avgConfidence
        },
        consensusLevel: this.calculateConsensus(parsed.agreements?.length || 0, parsed.conflicts?.length || 0),
        keyAgreements: parsed.agreements || [],
        keyConflicts: parsed.conflicts || [],
        contributingCouncils: councilIds
      };
    } catch (error) {
      console.error('Synthesis failed:', error);
      return this.createFallbackSynthesis(perspectivesArray, councilIds, avgConfidence);
    }
  }

  private createEmptySynthesis(): CouncilSynthesis {
    return {
      unifiedRecommendation: {
        primaryAction: 'Insufficient data for recommendations',
        supportingActions: [],
        timing: 'N/A',
        expectedImpact: 'Unknown',
        confidence: 0
      },
      consensusLevel: 0,
      keyAgreements: [],
      keyConflicts: [],
      contributingCouncils: []
    };
  }

  private createFallbackSynthesis(
    perspectives: CouncilPerspective[],
    councilIds: string[],
    avgConfidence: number
  ): CouncilSynthesis {
    const allRecs = perspectives.flatMap(p => p.recommendations);
    
    return {
      unifiedRecommendation: {
        primaryAction: allRecs[0] || 'Review available data',
        supportingActions: allRecs.slice(1, 4),
        timing: 'As resources allow',
        expectedImpact: 'To be validated',
        confidence: avgConfidence
      },
      consensusLevel: avgConfidence,
      keyAgreements: [],
      keyConflicts: [],
      contributingCouncils: councilIds
    };
  }

  private calculateConsensus(agreements: number, conflicts: number): number {
    const total = agreements + conflicts;
    if (total === 0) return 0.5;
    return agreements / total;
  }

  applyGuardrailsToSynthesis(
    synthesis: CouncilSynthesis,
    negativeScope: NegativeScope,
    strategicIntent?: StrategicIntent
  ): CouncilSynthesis & { guardrailEnforcement: GuardrailEnforcement } {
    const guardrails = createCouncilGuardrails(negativeScope, strategicIntent);
    
    const primaryCheck = checkRecommendationGuardrails(
      synthesis.unifiedRecommendation.primaryAction,
      guardrails
    );

    const supportingFiltered = filterRecommendationsWithGuardrails(
      synthesis.unifiedRecommendation.supportingActions,
      guardrails
    );

    const allViolations: GuardrailViolation[] = [
      ...primaryCheck.violations,
      ...Array.from(supportingFiltered.violations.values()).flat(),
    ];

    const enforcement: GuardrailEnforcement = {
      passed: primaryCheck.passed && supportingFiltered.blocked.length === 0,
      primaryActionBlocked: !primaryCheck.passed,
      blockedActions: supportingFiltered.blocked,
      allowedActions: supportingFiltered.allowed,
      violations: allViolations,
      summary: summarizeGuardrailViolations(allViolations),
      enforcementLevel: guardrails.enforcementRules.hardExclusion ? "strict" : "moderate",
    };

    let adjustedPrimaryAction = synthesis.unifiedRecommendation.primaryAction;
    if (!primaryCheck.passed) {
      adjustedPrimaryAction = `[BLOCKED BY GUARDRAILS] ${synthesis.unifiedRecommendation.primaryAction}`;
    }

    return {
      ...synthesis,
      unifiedRecommendation: {
        ...synthesis.unifiedRecommendation,
        primaryAction: adjustedPrimaryAction,
        supportingActions: supportingFiltered.allowed,
        confidence: enforcement.passed 
          ? synthesis.unifiedRecommendation.confidence 
          : Math.min(synthesis.unifiedRecommendation.confidence, 0.5),
      },
      guardrailEnforcement: enforcement,
    };
  }
}

export interface GuardrailEnforcement {
  passed: boolean;
  primaryActionBlocked: boolean;
  blockedActions: string[];
  allowedActions: string[];
  violations: GuardrailViolation[];
  summary: string;
  enforcementLevel: "strict" | "moderate" | "permissive";
}

export const councilReasoning = new CouncilReasoning();
