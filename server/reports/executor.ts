/**
 * ReportExecutor - Generates MasterReports from ExecReports
 * 
 * This module consolidates execution reports from multiple modules
 * into a comprehensive MasterReport with synthesized insights.
 */

import { storage, DbConfiguration } from "../storage";
import type { DbExecReport, DbMasterReport, Brand, StrategicIntent, NegativeScope } from "@shared/schema";

export interface ConsolidatedInsight {
  id: string;
  moduleId: string;
  type: 'opportunity' | 'risk' | 'trend' | 'gap';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  relatedKeywords?: string[];
  evidence?: string[];
}

export interface ConsolidatedRecommendation {
  id: string;
  moduleId: string;
  action: string;
  rationale: string;
  expectedImpact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  priority: number;
  dependencies?: string[];
}

export interface UCRSnapshot {
  brand: Brand;
  strategicIntent: StrategicIntent;
  negativeScope: NegativeScope;
}

export class ReportExecutor {
  /**
   * Generate a MasterReport from all ExecReports for a configuration
   */
  async generateMasterReport(configurationId: number, contextVersion: number): Promise<DbMasterReport> {
    // 1. Get configuration for UCR snapshot
    const config = await storage.getConfigurationById(configurationId, null);
    if (!config) {
      throw new Error(`Configuration ${configurationId} not found`);
    }

    // 2. Get all ExecReports for this context version
    const execReports = await storage.getExecReportsByConfiguration(configurationId, contextVersion);
    
    if (execReports.length === 0) {
      throw new Error(`No ExecReports found for configuration ${configurationId} version ${contextVersion}`);
    }

    // 3. Build UCR snapshot
    const ucrSnapshot: UCRSnapshot = {
      brand: config.brand,
      strategicIntent: config.strategic_intent,
      negativeScope: config.negative_scope,
    };

    // 4. Consolidate insights from all reports
    const consolidatedInsights = this.consolidateInsights(execReports);

    // 5. Consolidate recommendations
    const consolidatedRecommendations = this.consolidateRecommendations(execReports);

    // 6. Generate council synthesis
    const councilSynthesis = this.generateCouncilSynthesis(execReports, consolidatedInsights);

    // 7. Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(execReports);

    // 8. Determine data freshness
    const dataFreshness = this.determineDataFreshness(execReports);

    // 9. Create the MasterReport
    const masterReport = await storage.createMasterReport({
      id: `master-${configurationId}-${contextVersion}-${Date.now()}`,
      configurationId,
      contextVersion,
      contextHash: config.governance.context_hash || this.generateContextHash(config),
      ucrSnapshot,
<<<<<<< Updated upstream
      execReportIds: execReports.map((r: DbExecReport) => r.id),
      consolidatedInsights,
      consolidatedRecommendations,
      councilSynthesis,
      modulesIncluded: Array.from(new Set(execReports.map((r: DbExecReport) => r.moduleId))),
=======
      execReportIds: execReports.map(r => r.id),
      consolidatedInsights,
      consolidatedRecommendations,
      councilSynthesis,
      modulesIncluded: Array.from(new Set(execReports.map(r => r.moduleId))),
>>>>>>> Stashed changes
      overallConfidence,
      dataFreshness,
    });

    return masterReport;
  }

  /**
   * Consolidate insights from multiple ExecReports
   */
  private consolidateInsights(execReports: DbExecReport[]): ConsolidatedInsight[] {
    const allInsights: ConsolidatedInsight[] = [];

    for (const report of execReports) {
      if (report.playbookResult?.insights) {
        for (const insight of report.playbookResult.insights) {
          allInsights.push({
            id: `insight-${report.moduleId}-${allInsights.length}`,
            moduleId: report.moduleId,
            type: insight.type || 'opportunity',
            title: insight.title || insight.message || 'Untitled Insight',
            description: insight.description || insight.details || '',
            confidence: insight.confidence || 50,
            priority: insight.priority || 'medium',
            relatedKeywords: insight.keywords || [],
            evidence: insight.evidence || [],
          });
        }
      }

      // Also extract insights from module output if available
      if (report.output?.insights) {
        for (const insight of report.output.insights) {
          allInsights.push({
            id: `output-insight-${report.moduleId}-${allInsights.length}`,
            moduleId: report.moduleId,
            type: insight.type || 'opportunity',
            title: insight.title || insight.message || 'Untitled Insight',
            description: insight.description || insight.details || '',
            confidence: insight.confidence || 50,
            priority: insight.priority || 'medium',
            relatedKeywords: insight.keywords || [],
            evidence: insight.evidence || [],
          });
        }
      }
    }

    // Sort by priority and confidence
    return allInsights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Consolidate recommendations from multiple ExecReports
   */
  private consolidateRecommendations(execReports: DbExecReport[]): ConsolidatedRecommendation[] {
    const allRecommendations: ConsolidatedRecommendation[] = [];
    let priorityCounter = 1;

    for (const report of execReports) {
      if (report.playbookResult?.recommendations) {
        for (const rec of report.playbookResult.recommendations) {
          allRecommendations.push({
            id: `rec-${report.moduleId}-${allRecommendations.length}`,
            moduleId: report.moduleId,
            action: rec.action || rec.title || 'Unnamed Action',
            rationale: rec.rationale || rec.reason || '',
            expectedImpact: rec.impact || 'medium',
            effort: rec.effort || 'medium',
            priority: priorityCounter++,
            dependencies: rec.dependencies || [],
          });
        }
      }

      // Also extract recommendations from module output
      if (report.output?.recommendations) {
        for (const rec of report.output.recommendations) {
          allRecommendations.push({
            id: `output-rec-${report.moduleId}-${allRecommendations.length}`,
            moduleId: report.moduleId,
            action: rec.action || rec.title || 'Unnamed Action',
            rationale: rec.rationale || rec.reason || '',
            expectedImpact: rec.impact || 'medium',
            effort: rec.effort || 'medium',
            priority: priorityCounter++,
            dependencies: rec.dependencies || [],
          });
        }
      }
    }

    // Sort by impact (high first) and effort (low first)
    return allRecommendations.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      const effortOrder = { low: 0, medium: 1, high: 2 };
      const impactDiff = impactOrder[a.expectedImpact] - impactOrder[b.expectedImpact];
      if (impactDiff !== 0) return impactDiff;
      return effortOrder[a.effort] - effortOrder[b.effort];
    });
  }

  /**
   * Generate council synthesis from all reports
   */
  private generateCouncilSynthesis(
    execReports: DbExecReport[],
    insights: ConsolidatedInsight[]
  ): { keyThemes: string[]; crossModulePatterns: string[]; prioritizedActions: string[] } {
    // Extract key themes from insights
    const keyThemes: string[] = [];
    const themeMap = new Map<string, number>();

    for (const insight of insights) {
      if (insight.relatedKeywords) {
        for (const keyword of insight.relatedKeywords) {
          themeMap.set(keyword, (themeMap.get(keyword) || 0) + 1);
        }
      }
    }

    // Get top themes by frequency
    const sortedThemes = Array.from(themeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);
    
    keyThemes.push(...sortedThemes);

    // Identify cross-module patterns
    const crossModulePatterns: string[] = [];
    const moduleInsights = new Map<string, string[]>();

    for (const insight of insights) {
      const types = moduleInsights.get(insight.moduleId) || [];
      types.push(insight.type);
      moduleInsights.set(insight.moduleId, types);
    }

    if (moduleInsights.size > 1) {
      // Find common insight types across modules
      const allTypes = Array.from(moduleInsights.values()).flat();
      const typeCount = new Map<string, number>();
      for (const type of allTypes) {
        typeCount.set(type, (typeCount.get(type) || 0) + 1);
      }

      for (const [type, count] of Array.from(typeCount.entries())) {
        if (count >= moduleInsights.size * 0.5) {
          crossModulePatterns.push(`${type} identified across multiple modules`);
        }
      }
    }

    // Extract prioritized actions from council prompts
    const prioritizedActions: string[] = [];
    for (const report of execReports) {
      if (report.playbookResult?.councilPrompt) {
        // Extract action items from council prompt
        const prompt = report.playbookResult.councilPrompt;
        const actionMatches = prompt.match(/(?:action|recommend|suggest|prioritize)[^.]*\./gi);
        if (actionMatches) {
          prioritizedActions.push(...actionMatches.slice(0, 2));
        }
      }
    }

    // If no actions found, generate from high-priority insights
    if (prioritizedActions.length === 0) {
      const highPriorityInsights = insights.filter(i => i.priority === 'high').slice(0, 3);
      for (const insight of highPriorityInsights) {
        prioritizedActions.push(`Address ${insight.type}: ${insight.title}`);
      }
    }

    return {
      keyThemes: keyThemes.length > 0 ? keyThemes : ['No themes identified'],
      crossModulePatterns: crossModulePatterns.length > 0 ? crossModulePatterns : ['Single module analysis'],
      prioritizedActions: prioritizedActions.length > 0 ? prioritizedActions : ['Review module outputs'],
    };
  }

  /**
   * Calculate overall confidence score from all reports
   */
  private calculateOverallConfidence(execReports: DbExecReport[]): number {
    if (execReports.length === 0) return 0;

    let totalConfidence = 0;
    let count = 0;

    for (const report of execReports) {
      // Get confidence from output
      if (report.output?.confidence !== undefined) {
        totalConfidence += report.output.confidence;
        count++;
      }

      // Get confidence from playbook insights
      if (report.playbookResult?.insights) {
        for (const insight of report.playbookResult.insights) {
          if (insight.confidence !== undefined) {
            totalConfidence += insight.confidence;
            count++;
          }
        }
      }
    }

    return count > 0 ? Math.round(totalConfidence / count) : 50;
  }

  /**
   * Determine data freshness based on execution times
   */
  private determineDataFreshness(execReports: DbExecReport[]): 'fresh' | 'moderate' | 'stale' {
    if (execReports.length === 0) return 'stale';

    const now = new Date();
    const oldestReport = execReports.reduce((oldest, report) => {
      return report.executedAt < oldest.executedAt ? report : oldest;
    });

    const ageInHours = (now.getTime() - oldestReport.executedAt.getTime()) / (1000 * 60 * 60);

    if (ageInHours < 24) return 'fresh';
    if (ageInHours < 168) return 'moderate'; // 7 days
    return 'stale';
  }

  /**
   * Generate a context hash for the configuration
   */
  private generateContextHash(config: DbConfiguration): string {
    const hashInput = JSON.stringify({
      brand: config.brand,
      strategic_intent: config.strategic_intent,
      negative_scope: config.negative_scope,
      competitors: config.competitors,
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `ctx-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Get the latest MasterReport for a configuration
   */
  async getLatestReport(configurationId: number): Promise<DbMasterReport | null> {
    return storage.getLatestMasterReport(configurationId);
  }

  /**
   * Get all MasterReports for a configuration
   */
  async getReportHistory(configurationId: number): Promise<DbMasterReport[]> {
    return storage.getMasterReportsByConfiguration(configurationId);
  }

  /**
   * Get a specific MasterReport by ID
   */
  async getReportById(id: string): Promise<DbMasterReport | null> {
    return storage.getMasterReportById(id);
  }
}

export const reportExecutor = new ReportExecutor();
