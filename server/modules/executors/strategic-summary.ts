import { BaseModuleExecutor } from '../base-executor';
import type { ModuleInput, ModuleOutput, ModuleDefinition, Insight, Recommendation } from '../types';

export class StrategicSummaryExecutor extends BaseModuleExecutor {
  definition: ModuleDefinition = {
    id: 'strategic-summary',
    name: 'Strategic Summary',
    description: 'Synthesizes insights from all modules into executive-level recommendations',
    category: 'strategy',
    ownerCouncil: 'growth_strategy_planning',
    supportingCouncils: ['ops_attribution', 'product_gtm_alignment'],
    requiredInputs: [],
    optionalInputs: ['moduleOutputs'],
    dataSources: ['Internal Synthesis']
  };

  async execute(input: ModuleInput): Promise<ModuleOutput> {
    const moduleOutputs = (input.customParams?.moduleOutputs as ModuleOutput[]) || [];

    if (moduleOutputs.length === 0) {
      return {
        ...this.createEmptyOutput(),
        errors: ['No module outputs provided for synthesis']
      };
    }

    try {
      const allInsights = this.aggregateInsights(moduleOutputs);
      const allRecommendations = this.aggregateRecommendations(moduleOutputs);
      const prioritizedActions = this.prioritizeActions(allRecommendations);
      const executiveSummary = this.generateExecutiveSummary(allInsights, prioritizedActions);

      const avgConfidence = moduleOutputs.reduce((sum, m) => sum + m.confidence, 0) / moduleOutputs.length;
      const dataTimestamp = new Date();

      return {
        moduleId: this.definition.id,
        hasData: true,
        confidence: avgConfidence,
        dataSources: ['Internal Synthesis', ...new Set(moduleOutputs.flatMap(m => m.dataSources))],
        dataTimestamp,
        rawData: {
          moduleCount: moduleOutputs.length,
          totalInsights: allInsights.length,
          totalRecommendations: allRecommendations.length
        },
        insights: [
          this.createInsight({
            title: 'Strategic Overview',
            content: executiveSummary.narrative,
            dataPoint: `Based on ${moduleOutputs.length} module analyses`,
            source: 'Cross-Module Synthesis',
            whyItMatters: 'Unified view enables coherent strategy execution',
            severity: 'high',
            category: 'observation'
          }),
          ...executiveSummary.keyThemes.map(theme => this.createInsight({
            title: theme.title,
            content: theme.description,
            dataPoint: theme.dataPoint,
            source: 'Strategic Analysis',
            whyItMatters: theme.implication,
            severity: theme.severity as 'high' | 'medium' | 'low',
            category: theme.category as 'opportunity' | 'risk' | 'observation'
          }))
        ],
        recommendations: prioritizedActions.slice(0, 5).map((action, idx) => this.createRecommendation({
          action: action.action,
          priority: idx < 2 ? 'high' : idx < 4 ? 'medium' : 'low',
          estimatedImpact: action.estimatedImpact,
          effort: action.effort,
          timeline: action.timeline
        })),
        chartsData: [
          this.createChartData({
            type: 'radar',
            title: 'Module Coverage',
            data: this.generateCoverageData(moduleOutputs)
          }),
          this.createChartData({
            type: 'table',
            title: 'Priority Actions',
            data: prioritizedActions.slice(0, 10)
          })
        ],
        councilContext: {
          keyFindings: executiveSummary.keyFindings,
          dataQuality: avgConfidence > 0.7 ? 'high' : avgConfidence > 0.4 ? 'medium' : 'low',
          analysisDepth: moduleOutputs.length > 4 ? 'comprehensive' : 'standard'
        },
        freshnessStatus: this.getFreshnessStatus(dataTimestamp)
      };
    } catch (error) {
      return {
        ...this.createEmptyOutput(),
        errors: [`Strategic synthesis failed: ${error}`]
      };
    }
  }

  private aggregateInsights(outputs: ModuleOutput[]): Insight[] {
    return outputs.flatMap(o => o.insights).sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private aggregateRecommendations(outputs: ModuleOutput[]): Recommendation[] {
    return outputs.flatMap(o => o.recommendations);
  }

  private prioritizeActions(recommendations: Recommendation[]): Array<Recommendation & { score: number }> {
    const priorityScore = { high: 3, medium: 2, low: 1 };
    const effortScore = { low: 3, medium: 2, high: 1 };

    return recommendations
      .map(rec => ({
        ...rec,
        score: priorityScore[rec.priority] * 0.6 + effortScore[rec.effort] * 0.4
      }))
      .sort((a, b) => b.score - a.score);
  }

  private generateExecutiveSummary(insights: Insight[], prioritizedActions: Recommendation[]): {
    narrative: string;
    keyThemes: Array<{
      title: string;
      description: string;
      dataPoint: string;
      implication: string;
      severity: string;
      category: string;
    }>;
    keyFindings: string[];
  } {
    const opportunities = insights.filter(i => i.category === 'opportunity');
    const risks = insights.filter(i => i.category === 'risk');
    
    const narrative = `Analysis of ${insights.length} insights reveals ${opportunities.length} opportunities and ${risks.length} risks. ` +
      `${prioritizedActions.length > 0 ? `Top priority: ${prioritizedActions[0]?.action || 'Review findings'}` : 'Further analysis needed.'}`;

    const keyThemes = [];
    
    if (opportunities.length > risks.length * 2) {
      keyThemes.push({
        title: 'Growth Opportunity Window',
        description: 'Data shows significantly more opportunities than risks',
        dataPoint: `${opportunities.length} opportunities vs ${risks.length} risks`,
        implication: 'Favorable conditions for aggressive growth moves',
        severity: 'high',
        category: 'opportunity'
      });
    }

    if (risks.filter(r => r.severity === 'high').length > 2) {
      keyThemes.push({
        title: 'Critical Risks Require Attention',
        description: 'Multiple high-severity risks identified',
        dataPoint: `${risks.filter(r => r.severity === 'high').length} high-severity risks`,
        implication: 'Address risks before pursuing growth initiatives',
        severity: 'high',
        category: 'risk'
      });
    }

    return {
      narrative,
      keyThemes,
      keyFindings: [
        `${insights.length} insights aggregated from multiple sources`,
        `${opportunities.length} growth opportunities identified`,
        `${risks.length} risks flagged for attention`,
        `${prioritizedActions.length} actionable recommendations`
      ]
    };
  }

  private generateCoverageData(outputs: ModuleOutput[]): Record<string, number> {
    const coverage: Record<string, number> = {};
    
    for (const output of outputs) {
      coverage[output.moduleId] = output.confidence * 100;
    }
    
    return coverage;
  }
}

export const strategicSummaryExecutor = new StrategicSummaryExecutor();
