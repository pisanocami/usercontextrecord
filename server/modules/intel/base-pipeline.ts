import type { Configuration } from "@shared/schema";
import type { ItemTrace, UCRSectionID, ModuleRunResult, ModuleRunEnvelope } from "@shared/module.contract";
import type { 
  IntelligencePipelineContext, 
  IntelligenceModuleResult, 
  DecisionObject, 
  DataSourceStatus 
} from "./types";
import crypto from "crypto";

export abstract class BaseIntelligencePipeline {
  protected moduleId: string;
  protected context: IntelligencePipelineContext;
  protected startTime: number;

  constructor(moduleId: string, config: Configuration) {
    this.moduleId = moduleId;
    this.startTime = Date.now();
    this.context = {
      config,
      sectionsUsed: [],
      dataSources: {},
      warnings: [],
      traces: []
    };
  }

  protected generateRunId(): string {
    return `run_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  }

  protected markSectionUsed(section: UCRSectionID): void {
    if (!this.context.sectionsUsed.includes(section)) {
      this.context.sectionsUsed.push(section);
    }
  }

  protected addWarning(code: string, message: string): void {
    this.context.warnings.push({ code, message });
  }

  protected addTrace(trace: ItemTrace): void {
    this.context.traces.push(trace);
  }

  protected markDataSource(name: string, status: DataSourceStatus): void {
    this.context.dataSources[name] = status;
  }

  protected createEnvelope(): ModuleRunEnvelope {
    return {
      moduleId: this.moduleId,
      runId: this.generateRunId(),
      generatedAt: new Date().toISOString(),
      contextVersion: this.context.config.governance?.context_version || 1,
      contextStatus: this.context.config.governance?.context_status || "DRAFT_AI",
      ucrSectionsUsed: this.context.sectionsUsed,
      filtersApplied: this.context.traces
        .filter(t => t.ruleId.startsWith("filter_"))
        .map(t => ({ ruleId: t.ruleId, ucrSection: t.ucrSection, details: t.reason })),
      warnings: this.context.warnings
    };
  }

  protected createSummary(result: IntelligenceModuleResult): Record<string, unknown> {
    const available = Object.entries(this.context.dataSources)
      .filter(([_, s]) => s.available)
      .map(([name]) => name);
    const missing = Object.entries(this.context.dataSources)
      .filter(([_, s]) => !s.available)
      .map(([name]) => name);

    return {
      ...result.summary,
      dataSourcesUsed: available,
      dataSourcesMissing: missing,
      partialData: missing.length > 0,
      executionTimeMs: Date.now() - this.startTime
    };
  }

  // Template method pattern
  async execute(inputs: Record<string, unknown>): Promise<ModuleRunResult> {
    try {
      // 1. Extract - gather data from sources
      await this.extract(inputs);
      
      // 2. Transform - normalize and enrich data
      await this.transform();
      
      // 3. Correlate - find patterns across sources
      await this.correlate();
      
      // 4. Score - apply UCR-based scoring
      await this.score();
      
      // 5. Disposition - classify results
      const result = await this.disposition();
      
      return {
        envelope: this.createEnvelope(),
        items: result.items,
        summary: this.createSummary(result)
      };
    } catch (error) {
      this.addWarning("EXECUTION_ERROR", String(error));
      return {
        envelope: this.createEnvelope(),
        items: [],
        summary: {
          error: String(error),
          partialData: true,
          executionTimeMs: Date.now() - this.startTime
        }
      };
    }
  }

  // Abstract methods to be implemented by subclasses
  protected abstract extract(inputs: Record<string, unknown>): Promise<void>;
  protected abstract transform(): Promise<void>;
  protected abstract correlate(): Promise<void>;
  protected abstract score(): Promise<void>;
  protected abstract disposition(): Promise<IntelligenceModuleResult>;
}
