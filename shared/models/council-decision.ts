export type DecisionType = 'ADOPT' | 'REJECT' | 'REQUEST_OVERRIDE';

export interface CouncilDecision {
  id: string; // UUID
  runId: string; // Reference to ModuleRun
  decision: DecisionType;
  notes?: string;
  decidedBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDecisionRequest {
  runId: string;
  decision: DecisionType;
  notes?: string;
}

export interface OverrideEvent {
  id: string; // UUID
  ucrId: string; // Reference to UserContextRecord
  fromVersion: number;
  toVersion: number;
  changes: any; // Diff or patch
  reason: string;
  createdBy: string; // User ID
  createdAt: Date;
}
