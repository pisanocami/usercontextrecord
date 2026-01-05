import { UserContextRecord } from './ucr';

export type ModuleRunStatus = 'queued' | 'running' | 'success' | 'failed';
export type AnalysisState = 'AI_GENERATED' | 'HUMAN_CONFIRMED' | 'PROVISIONAL';

export interface ModuleRun {
  id: string; // UUID
  module: string; // e.g., 'keyword_gap_lite'
  ucrId: string; // Reference to UserContextRecord
  analysisState: AnalysisState;
  
  // Inputs and outputs
  inputs: Record<string, any>;
  gates: {
    passed: boolean;
    violations: string[];
  };
  violations: any[];
  proposals: any[];
  summary: Record<string, any>;
  
  // Execution metadata
  status: ModuleRunStatus;
  costUsd: number;
  runtimeMs: number;
  
  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateModuleRunRequest {
  module: string;
  ucrId: string;
  inputs: Record<string, any>;
}

export interface ModuleRunResult {
  run: ModuleRun;
  results?: any;
  relatedRuns?: ModuleRun[];
}
