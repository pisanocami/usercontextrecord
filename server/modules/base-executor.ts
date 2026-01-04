import type { 
  ModuleInput, 
  ModuleOutput, 
  ModuleDefinition, 
  ModuleExecutor,
  Insight,
  Recommendation,
  ChartData,
  CouncilContext
} from './types';
import { applyTimeDecay, getModuleDecayConfig, calculateFreshnessStatus } from './time-decay';

export abstract class BaseModuleExecutor implements ModuleExecutor {
  abstract definition: ModuleDefinition;

  abstract execute(input: ModuleInput): Promise<ModuleOutput>;

  validate(input: ModuleInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const required of this.definition.requiredInputs) {
      const hasField = (required in input && input[required as keyof ModuleInput] !== undefined) || 
                       (input.customParams && required in input.customParams);
      if (!hasField) {
        errors.push(`${required} is required for ${this.definition.id}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  protected createEmptyOutput(): ModuleOutput {
    return {
      moduleId: this.definition.id,
      hasData: false,
      confidence: 0,
      dataSources: [],
      dataTimestamp: new Date(),
      rawData: {},
      insights: [],
      recommendations: [],
      chartsData: [],
      councilContext: {
        keyFindings: [],
        dataQuality: 'low',
        analysisDepth: 'limited'
      },
      freshnessStatus: { status: 'fresh', ageDays: 0 },
      errors: ['No data available']
    };
  }

  protected createInsight(params: {
    title: string;
    content: string;
    dataPoint: string;
    source: string;
    whyItMatters: string;
    severity?: 'high' | 'medium' | 'low';
    category?: 'opportunity' | 'risk' | 'observation';
  }): Insight {
    return {
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: params.title,
      content: params.content,
      dataPoint: params.dataPoint,
      source: params.source,
      whyItMatters: params.whyItMatters,
      severity: params.severity || 'medium',
      category: params.category || 'observation'
    };
  }

  protected createRecommendation(params: {
    action: string;
    priority?: 'high' | 'medium' | 'low';
    estimatedImpact: string;
    effort?: 'low' | 'medium' | 'high';
    timeline?: string;
    withAccessCta?: string;
  }): Recommendation {
    return {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action: params.action,
      priority: params.priority || 'medium',
      estimatedImpact: params.estimatedImpact,
      effort: params.effort || 'medium',
      timeline: params.timeline,
      withAccessCta: params.withAccessCta
    };
  }

  protected createChartData(params: {
    type: 'bar' | 'line' | 'pie' | 'radar' | 'table';
    title: string;
    data: unknown;
    config?: Record<string, unknown>;
  }): ChartData {
    return {
      type: params.type,
      title: params.title,
      data: params.data,
      config: params.config
    };
  }

  protected calculateConfidence(factors: {
    dataCompleteness: number;
    sourceCount: number;
    dataFreshness: number;
    insightQuality: number;
  }): number {
    const weights = {
      dataCompleteness: 0.3,
      sourceCount: 0.2,
      dataFreshness: 0.25,
      insightQuality: 0.25
    };

    const sourceScore = Math.min(factors.sourceCount / 2, 1);
    
    const baseConfidence = (
      factors.dataCompleteness * weights.dataCompleteness +
      sourceScore * weights.sourceCount +
      factors.dataFreshness * weights.dataFreshness +
      factors.insightQuality * weights.insightQuality
    );

    return isNaN(baseConfidence) ? 0 : baseConfidence;
  }

  protected getFreshnessStatus(dataTimestamp: Date): { status: 'fresh' | 'moderate' | 'stale' | 'expired'; ageDays: number; warning?: string } {
    const config = getModuleDecayConfig(this.definition.id);
    return calculateFreshnessStatus(dataTimestamp, config);
  }

  protected applyTimeDecayToConfidence(baseConfidence: number, dataTimestamp: Date): number {
    const config = getModuleDecayConfig(this.definition.id);
    return applyTimeDecay(baseConfidence, dataTimestamp, config);
  }
}
