import type { ItemTrace, UCRSectionID, EntityItemResult, ClusterItemResult, KeywordItemResult } from "@shared/module.contract";
import type { Configuration } from "@shared/schema";

// Intelligence module entity types
export type IntelEntityType = 
  | "trend_signal"
  | "messaging_insight"
  | "keyword_roi"
  | "demand_forecast"
  | "positioning_opportunity";

// Decision Object - atomic decision with evidence
export interface DecisionObject {
  decisionId: string;
  signal: string;
  confidence: "low" | "medium" | "high";
  source: string;
  evidence: string[];
  actionType: "monitor" | "investigate" | "act_now" | "deprioritize";
  ucrAlignment: UCRSectionID[];
}

// Opportunity Scorecard - keyword-level opportunity
export interface OpportunityScorecard {
  keyword: string;
  searchVolume: number;
  capabilityScore: number;
  opportunityScore: number;
  effort: "low" | "medium" | "high";
  priorityTier: 1 | 2 | 3;
  signals: DecisionObject[];
}

// Data source availability tracking
export interface DataSourceStatus {
  available: boolean;
  error?: string;
  lastChecked: Date;
}

export interface IntelligencePipelineContext {
  config: Configuration;
  sectionsUsed: UCRSectionID[];
  dataSources: Record<string, DataSourceStatus>;
  warnings: Array<{ code: string; message: string }>;
  traces: ItemTrace[];
}

// Intelligence module result structure
export interface IntelligenceModuleResult {
  decisions: DecisionObject[];
  opportunities?: OpportunityScorecard[];
  items: (EntityItemResult | ClusterItemResult | KeywordItemResult)[];
  summary: {
    totalSignals: number;
    actionableCount: number;
    dataSourcesUsed: string[];
    dataSourcesMissing: string[];
    partialData: boolean;
  };
  meta: {
    executedAt: string;
    durationMs: number;
    cacheHits: string[];
  };
}
