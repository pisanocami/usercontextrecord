export interface ModuleInput {
  brandId?: number;
  tenantId?: number;
  periodStart?: Date;
  periodEnd?: Date;
  keywords?: string[];
  competitors?: string[];
  domain?: string;
  products?: string[];
  dateRange?: { start: Date; end: Date };
  attributionModel?: string;
  customParams?: Record<string, unknown>;
}

export interface Insight {
  id: string;
  title: string;
  content: string;
  dataPoint: string;
  source: string;
  whyItMatters: string;
  severity: 'high' | 'medium' | 'low';
  category: 'opportunity' | 'risk' | 'observation';
}

export interface Recommendation {
  id: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  effort: 'low' | 'medium' | 'high';
  timeline?: string;
  withAccessCta?: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'radar' | 'table';
  title: string;
  data: unknown;
  config?: Record<string, unknown>;
}

export interface CouncilContext {
  keyFindings: string[];
  dataQuality: 'high' | 'medium' | 'low';
  analysisDepth: 'comprehensive' | 'standard' | 'limited';
  additionalContext?: Record<string, unknown>;
}

export interface FreshnessInfo {
  status: 'fresh' | 'moderate' | 'stale' | 'expired';
  ageDays: number;
  warning?: string;
}

export interface ModuleOutput {
  moduleId: string;
  hasData: boolean;
  confidence: number;
  dataSources: string[];
  dataTimestamp: Date;
  rawData: Record<string, unknown>;
  insights: Insight[];
  recommendations: Recommendation[];
  chartsData: ChartData[];
  councilContext: CouncilContext;
  freshnessStatus: FreshnessInfo;
  errors?: string[];
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: 'demand' | 'visibility' | 'competitive' | 'strategy' | 'performance';
  ownerCouncil: string;
  supportingCouncils: string[];
  requiredInputs: string[];
  optionalInputs: string[];
  dataSources: string[];
}

export interface ModuleExecutor {
  definition: ModuleDefinition;
  execute(input: ModuleInput): Promise<ModuleOutput>;
  validate(input: ModuleInput): { valid: boolean; errors: string[] };
}
