export interface CouncilDefinition {
  id: string;
  name: string;
  description: string;
  expertise: string[];
  decisionAuthority: number;
  isActive: boolean;
  reasoningPrompt: string;
}

export interface CouncilPerspective {
  councilId: string;
  summary: string;
  keyPoints: string[];
  recommendations: string[];
  concerns: string[];
  confidenceLevel: number;
  reasoning: string;
}

export interface CouncilSynthesis {
  unifiedRecommendation: {
    primaryAction: string;
    supportingActions: string[];
    timing: string;
    expectedImpact: string;
    confidence: number;
  };
  consensusLevel: number;
  keyAgreements: Array<{
    topic: string;
    councils: string[];
    strength: 'strong' | 'moderate' | 'weak';
  }>;
  keyConflicts: Array<{
    topic: string;
    councilA: string;
    positionA: string;
    councilB: string;
    positionB: string;
    resolution: string;
    rationale: string;
  }>;
  contributingCouncils: string[];
}

export const MODULE_COUNCIL_MAP: Record<string, string> = {
  'market-demand': 'strategic_intelligence',
  'breakout-terms': 'strategic_intelligence',
  'category-visibility': 'strategic_intelligence',
  'emerging-competitor': 'strategic_intelligence',
  'market-momentum': 'strategic_intelligence',
  'keyword-gap': 'seo_visibility_demand',
  'share-of-voice': 'seo_visibility_demand',
  'link-authority': 'seo_visibility_demand',
  'branded-demand': 'performance_media_messaging',
  'paid-organic-overlap': 'performance_media_messaging',
  'competitor-ads': 'performance_media_messaging',
  'strategic-summary': 'growth_strategy_planning',
  'priority-scoring': 'growth_strategy_planning',
  'deprioritization': 'growth_strategy_planning',
  'os-drop': 'growth_strategy_planning'
};

export const SUPPORTING_COUNCILS: Record<string, string[]> = {
  'competitor-ads': ['creative_funnel'],
  'paid-organic-overlap': ['ops_attribution'],
  'deprioritization': ['ops_attribution'],
  'strategic-summary': ['ops_attribution', 'product_gtm_alignment']
};
