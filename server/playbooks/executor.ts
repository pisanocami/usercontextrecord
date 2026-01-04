import type { PlaybookConfig, PlaybookExecution } from './types';
import type { ModuleInput, ModuleOutput, Insight, Recommendation } from '../modules/types';
import { playbookLoader } from './loader';

interface TemplateContext {
  [key: string]: unknown;
}

export class PlaybookExecutor {
  async execute(
    playbookId: string,
    input: ModuleInput,
    moduleOutput: ModuleOutput
  ): Promise<{
    insights: Insight[];
    recommendations: Recommendation[];
    deprioritized: string[];
    councilPrompt: string;
  }> {
    const playbook = playbookLoader.get(playbookId);
    
    if (!playbook) {
      return {
        insights: moduleOutput.insights,
        recommendations: moduleOutput.recommendations,
        deprioritized: [],
        councilPrompt: ''
      };
    }

    const context = this.buildContext(moduleOutput);
    
    const insights = this.applyInsightTemplates(playbook, context, moduleOutput.insights);
    const recommendations = this.applyRecommendationTemplates(playbook, context, moduleOutput.recommendations);
    const deprioritized = this.applyDeprioritizationRules(playbook, context, recommendations);

    return {
      insights,
      recommendations: recommendations.filter(r => !deprioritized.includes(r.id)),
      deprioritized,
      councilPrompt: this.renderTemplate(playbook.councilReasoningPrompt, context)
    };
  }

  private buildContext(output: ModuleOutput): TemplateContext {
    const context: TemplateContext = {
      hasData: output.hasData,
      confidence: output.confidence,
      dataSourceCount: output.dataSources.length,
      insightCount: output.insights.length,
      ...output.rawData,
      ...output.councilContext
    };

    for (const insight of output.insights) {
      context[`insight_${insight.id}`] = insight;
    }

    return context;
  }

  private applyInsightTemplates(
    playbook: PlaybookConfig,
    context: TemplateContext,
    existingInsights: Insight[]
  ): Insight[] {
    const insights = [...existingInsights];

    for (const template of playbook.insightTemplates) {
      if (this.evaluateCondition(template.condition, context)) {
        insights.push({
          id: `${template.id}-${Date.now()}`,
          title: this.renderTemplate(template.titleTemplate, context),
          content: this.renderTemplate(template.contentTemplate, context),
          dataPoint: String(context[template.id + '_datapoint'] || ''),
          source: playbook.name,
          whyItMatters: `Based on ${playbook.strategicRole}`,
          severity: template.severity,
          category: template.category
        });
      }
    }

    return insights;
  }

  private applyRecommendationTemplates(
    playbook: PlaybookConfig,
    context: TemplateContext,
    existingRecs: Recommendation[]
  ): Recommendation[] {
    const recommendations = [...existingRecs];

    for (const template of playbook.recommendationTemplates) {
      if (this.evaluateCondition(template.condition, context)) {
        recommendations.push({
          id: `${template.id}-${Date.now()}`,
          action: this.renderTemplate(template.actionTemplate, context),
          priority: template.priority,
          estimatedImpact: this.renderTemplate(template.impactTemplate, context),
          effort: template.effort
        });
      }
    }

    return recommendations;
  }

  private applyDeprioritizationRules(
    playbook: PlaybookConfig,
    context: TemplateContext,
    recommendations: Recommendation[]
  ): string[] {
    const deprioritized: string[] = [];

    for (const rule of playbook.deprioritizationRules) {
      if (this.evaluateCondition(rule.condition, context)) {
        for (const rec of recommendations) {
          if (rule.action === 'remove' || rule.action === 'flag') {
            deprioritized.push(rec.id);
          }
        }
      }
    }

    return deprioritized;
  }

  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    try {
      const safeEval = new Function(...Object.keys(context), `return ${condition}`);
      return Boolean(safeEval(...Object.values(context)));
    } catch {
      return false;
    }
  }

  private renderTemplate(template: string, context: TemplateContext): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = context[key];
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }
}

export const playbookExecutor = new PlaybookExecutor();
