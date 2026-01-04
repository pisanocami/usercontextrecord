export interface PlaybookConfig {
  moduleId: string;
  name: string;
  version: string;
  strategicRole: string;
  primaryQuestion: string;
  ownerCouncil: string;
  supportingCouncils: string[];
  processingSteps: ProcessingStep[];
  councilReasoningPrompt: string;
  confidenceFactors: ConfidenceFactor[];
  insightTemplates: InsightTemplate[];
  recommendationTemplates: RecommendationTemplate[];
  deprioritizationRules: DeprioritizationRule[];
}

export interface ProcessingStep {
  step: string;
  api?: string;
  params?: Record<string, unknown>;
  transform?: string;
}

export interface ConfidenceFactor {
  name: string;
  weight: number;
  calculation: string;
}

export interface InsightTemplate {
  id: string;
  condition: string;
  titleTemplate: string;
  contentTemplate: string;
  severity: 'high' | 'medium' | 'low';
  category: 'opportunity' | 'risk' | 'observation';
}

export interface RecommendationTemplate {
  id: string;
  condition: string;
  actionTemplate: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impactTemplate: string;
}

export interface DeprioritizationRule {
  condition: string;
  action: 'flag' | 'remove' | 'downgrade';
  reason: string;
}

export interface PlaybookExecution {
  playbookId: string;
  brandId: number;
  tenantId: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  output?: unknown;
  error?: string;
}
