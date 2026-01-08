/**
 * module.contract.ts
 * Force of Nature | Context-First OS
 *
 * Purpose:
 * - Make UCR the non-negotiable contract for all modules
 * - Enforce: required UCR sections, execution gate rules, dispositions, explainability
 * - Provide a portable, versioned module contract that can be used by:
 *   - backend execution gateway
 *   - UI rendering / one-pager
 *   - audit trail
 *
 * Notes:
 * - Keep this file dependency-light so it can be shared across server/client if desired.
 */

/* ---------------------------------- */
/* Core Types                         */
/* ---------------------------------- */

export type UCRSectionID = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export type UCRStatus =
  | "DRAFT_AI"
  | "AI_READY"
  | "AI_ANALYSIS_RUN"
  | "HUMAN_CONFIRMED"
  | "LOCKED";

export type Disposition = "PASS" | "REVIEW" | "OUT_OF_PLAY";

export type Severity = "low" | "medium" | "high" | "critical";

export type DataSource =
  | "DataForSEO"
  | "Ahrefs"
  | "GoogleTrends"
  | "SERPAPI"
  | "BrightData"
  | "OpenAI"
  | "Gemini"
  | "Internal"
  | "Other";

/**
 * Item-level trace for explainability
 * Each item (keyword, SKU, etc.) carries its own trace of rules applied
 */
export interface ItemTrace {
  ruleId: string;
  ucrSection: UCRSectionID;
  reason: string;
  severity: Severity;
  evidence?: string;
}

/**
 * Run-level trace for overall execution context
 */
export interface RunTrace {
  sectionsUsed: UCRSectionID[];
  sectionsMissing: UCRSectionID[];
  filtersApplied: string[];
  rulesTriggered: string[];
}

/**
 * Standard item output with disposition and trace
 */
export interface DispositionedItem<T = unknown> {
  data: T;
  disposition: Disposition;
  reasons: string[];
  trace: ItemTrace[];
}

/* ---------------------------------- */
/* Policy Interfaces                   */
/* ---------------------------------- */

export interface ExecutionGatePolicy {
  allowedStatuses: UCRStatus[];
  allowMissingOptionalSections?: boolean;
  requireAuditTrail?: boolean;
}

export interface ExplainabilityPolicy {
  required: boolean;
  itemTraceFields: Array<"ruleId" | "ucrSection" | "reason" | "evidence" | "severity">;
  runTraceFields: Array<"sectionsUsed" | "sectionsMissing" | "filtersApplied" | "rulesTriggered">;
}

export interface DispositionPolicy {
  required: boolean;
  allowed: Disposition[];
  hideOutOfPlayByDefault?: boolean;
}

export interface CachingPolicy {
  cadence: "none" | "hourly" | "daily" | "weekly" | "monthly";
  ttlSeconds?: number;
  bustOnChanges?: Array<
    "competitor_set" | "category_scope" | "negative_scope" | "governance" | "market" | "all"
  >;
}

export interface RiskProfile {
  confidence: "low" | "medium" | "high";
  riskIfWrong: "low" | "medium" | "high";
  inferenceType: "external" | "internal" | "hybrid";
}

/* ---------------------------------- */
/* Context Injection                   */
/* ---------------------------------- */

export interface ContextInjectionSpec {
  requiredSections: UCRSectionID[];
  optionalSections?: UCRSectionID[];
  sectionUsage: Partial<Record<UCRSectionID, string>>;
  gates: {
    fenceMode: "soft" | "hard" | "none";
    negativeScopeMode: "hard" | "none";
  };
}

export interface ModuleInputSpec {
  fields: Array<{
    name: string;
    type: "string" | "number" | "boolean" | "string[]" | "number[]" | "json";
    required?: boolean;
    description?: string;
    default?: unknown;
    constraints?: {
      min?: number;
      max?: number;
      enum?: unknown[];
      pattern?: string;
    };
  }>;
}

export interface ModuleOutputSpec {
  entityType: string;
  visuals?: Array<{
    kind: "line" | "bar" | "table" | "heatmap" | "matrix" | "card" | "other";
    title: string;
    description?: string;
  }>;
  summaryFields?: string[];
}

/* ---------------------------------- */
/* Council Rules Linkage               */
/* ---------------------------------- */

export interface CouncilRuleBinding {
  ownerCouncil: string;
  supportingCouncils?: string[];
  rulePacks: Array<{
    packId: string;
    version: string;
    appliesTo: "run" | "item" | "both";
  }>;
}

/* ---------------------------------- */
/* Module Contract Definition          */
/* ---------------------------------- */

export interface ModuleContract {
  moduleId: string;
  name: string;
  category: string;
  layer: "Signal" | "Synthesis" | "Action";
  version: string;

  description: string;
  strategicQuestion: string;

  dataSources: DataSource[];

  riskProfile: RiskProfile;
  caching: CachingPolicy;

  executionGate: ExecutionGatePolicy;

  contextInjection: ContextInjectionSpec;
  inputs: ModuleInputSpec;

  disposition: DispositionPolicy;
  explainability: ExplainabilityPolicy;

  output: ModuleOutputSpec;

  councilRules?: CouncilRuleBinding;

  guardrails?: {
    neverPromiseRevenue?: boolean;
    neverDumpRawEntitiesWithoutFraming?: boolean;
    alwaysProvideNextStep?: boolean;
  };
}

/* ---------------------------------- */
/* UCR Section Names & Roles           */
/* ---------------------------------- */

export const UCR_SECTION_NAMES: Record<UCRSectionID, string> = {
  A: "Brand Context",
  B: "Category Definition",
  C: "Competitive Set",
  D: "Demand Definition",
  E: "Strategic Intent",
  F: "Channel Context",
  G: "Negative Scope",
  H: "Governance"
};

export const UCR_SECTION_ROLES: Record<UCRSectionID, string> = {
  A: "Defines brand entity, domain, geo, language",
  B: "Defines category fence and valid queries",
  C: "Defines competitor domains for comparison",
  D: "Groups queries into demand themes",
  E: "Sets strategic posture (aggressive vs conservative)",
  F: "Weights channels (SEO vs Paid vs Retail)",
  G: "Hard exclusions (categories, keywords, use cases)",
  H: "Scoring thresholds and capability model"
};

/* ---------------------------------- */
/* CMO-Safe Gate Order                 */
/* ---------------------------------- */

/**
 * The golden rule for CMO-safe execution:
 * G (Negative Scope) is always hard gate and runs first
 * B (Fence) is soft gate
 * H (Scoring) applies thresholds
 * E/F (prioritization / arbitration)
 */
export const GATE_EVALUATION_ORDER: UCRSectionID[] = ["G", "B", "H", "E", "F"];

export const GATE_TYPES: Record<UCRSectionID, "hard" | "soft" | "scoring" | "priority" | "none"> = {
  A: "none",
  B: "soft",
  C: "none",
  D: "none",
  E: "priority",
  F: "priority",
  G: "hard",
  H: "scoring"
};

/* ---------------------------------- */
/* Validation & Errors                 */
/* ---------------------------------- */

export class ContractError extends Error {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "ContractError";
  }
}

export interface ContractValidationResult {
  isValid: boolean;
  moduleId: string;
  ucrStatus: UCRStatus | null;
  statusAllowed: boolean;
  missingRequired: UCRSectionID[];
  missingOptional: UCRSectionID[];
  warnings: string[];
  errors: string[];
}

export function validateContractExecution(
  ucrStatus: UCRStatus | null,
  availableSections: UCRSectionID[],
  contract: ModuleContract
): ContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const statusAllowed = ucrStatus !== null && 
    contract.executionGate.allowedStatuses.includes(ucrStatus);
  
  if (!statusAllowed) {
    errors.push(
      `UCR status "${ucrStatus}" not allowed. Required: ${contract.executionGate.allowedStatuses.join(" or ")}`
    );
  }

  const missingRequired = contract.contextInjection.requiredSections.filter(
    (s) => !availableSections.includes(s)
  );
  
  if (missingRequired.length > 0) {
    errors.push(
      `Missing required UCR sections: ${missingRequired.map(s => `${s} (${UCR_SECTION_NAMES[s]})`).join(", ")}`
    );
  }

  const optionalSections = contract.contextInjection.optionalSections ?? [];
  const missingOptional = optionalSections.filter(
    (s) => !availableSections.includes(s)
  );
  
  if (missingOptional.length > 0) {
    if (contract.executionGate.allowMissingOptionalSections === false) {
      errors.push(
        `Missing optional sections (not allowed by policy): ${missingOptional.join(", ")}`
      );
    } else {
      warnings.push(
        `Missing optional sections: ${missingOptional.map(s => `${s} (${UCR_SECTION_NAMES[s]})`).join(", ")}. Results may be less accurate.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    moduleId: contract.moduleId,
    ucrStatus,
    statusAllowed,
    missingRequired,
    missingOptional,
    warnings,
    errors
  };
}

/* ---------------------------------- */
/* Contract Registry                   */
/* ---------------------------------- */

export type ContractRegistry = Record<string, ModuleContract>;

export function createContractRegistry(contracts: ModuleContract[]): ContractRegistry {
  const registry: ContractRegistry = {};
  for (const c of contracts) {
    if (registry[c.moduleId]) {
      throw new ContractError("Duplicate moduleId in registry", { moduleId: c.moduleId });
    }
    registry[c.moduleId] = c;
  }
  return registry;
}

export function getContractById(registry: ContractRegistry, moduleId: string): ModuleContract | undefined {
  return registry[moduleId];
}

/* ---------------------------------- */
/* Example Contracts                   */
/* ---------------------------------- */

export const KeywordGapVisibilityContract: ModuleContract = {
  moduleId: "seo.keyword_gap_visibility.v1",
  name: "Keyword Gap & Visibility",
  category: "SEO Signal",
  layer: "Signal",
  version: "contract.v1",

  description:
    "Identifies commercially meaningful search demand competitors capture that the client does not, translating gaps into directional missed value.",
  strategicQuestion:
    "What high-intent demand are competitors capturing today that we are structurally positioned to pursue?",

  dataSources: ["DataForSEO", "Ahrefs", "Internal"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "medium",
    inferenceType: "external"
  },

  caching: {
    cadence: "weekly",
    bustOnChanges: ["competitor_set", "category_scope", "negative_scope", "governance"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B", "C"],
    optionalSections: ["D", "E", "F", "G", "H"],
    sectionUsage: {
      A: "Defines client domain and brand baseline.",
      B: "Soft fence: keywords outside category marked REVIEW (outside_fence).",
      C: "Defines competitor domains (max 5) for gap comparison.",
      D: "Maps keywords into demand themes for exec framing.",
      E: "Adjusts thresholds for PASS/REVIEW (aggressive vs conservative).",
      F: "Weights recommendations (SEO vs Paid arbitration).",
      G: "Hard gate: any keyword matching negative scope => OUT_OF_PLAY.",
      H: "Capability / right-to-win scoring and thresholds."
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      {
        name: "min_search_volume",
        type: "number",
        required: false,
        default: 500,
        description: "Remove long-tail noise.",
        constraints: { min: 0, max: 1000000 }
      },
      {
        name: "positions_to_include",
        type: "number[]",
        required: false,
        default: [1, 20],
        description: "Count competitor visibility only within a position band."
      },
      {
        name: "ctr_assumption",
        type: "number",
        required: false,
        default: 0.1,
        description: "Directional scenario input (never treated as truth).",
        constraints: { min: 0, max: 1 }
      }
    ]
  },

  disposition: {
    required: true,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"],
    hideOutOfPlayByDefault: true
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "evidence", "severity"],
    runTraceFields: ["sectionsUsed", "sectionsMissing", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "keyword_opportunity",
    visuals: [
      { kind: "bar", title: "Missed Traffic Value by Competitor" },
      { kind: "table", title: "Top Keyword Opportunities" }
    ],
    summaryFields: ["total_missed_keywords", "total_missed_value_usd", "top_clusters", "primary_next_step"]
  },

  councilRules: {
    ownerCouncil: "SEO Visibility & Demand",
    supportingCouncils: ["Strategic Intelligence", "Performance Media & Messaging"],
    rulePacks: [
      { packId: "seo_visibility.keyword_gap.core", version: "v1", appliesTo: "both" },
      { packId: "strategic_intel.serp_constraints", version: "v1", appliesTo: "item" }
    ]
  },

  guardrails: {
    neverPromiseRevenue: true,
    neverDumpRawEntitiesWithoutFraming: true,
    alwaysProvideNextStep: true
  }
};

export const CategoryDemandTrendContract: ModuleContract = {
  moduleId: "market.category_demand_trend.v1",
  name: "Category Demand Trend (5-Year)",
  category: "Market Trends",
  layer: "Signal",
  version: "contract.v1",

  description: "Shows how consumer interest in a category evolved over 5 years; detects growth vs stagnation vs decline.",
  strategicQuestion: "Is this a category worth being in, and is demand expanding or contracting?",

  dataSources: ["GoogleTrends", "SERPAPI"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "medium",
    inferenceType: "external"
  },

  caching: {
    cadence: "weekly",
    bustOnChanges: ["category_scope", "market"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B"],
    optionalSections: ["C", "D", "E", "F", "G", "H"],
    sectionUsage: {
      A: "Default geo/market assumptions; brand baseline for narrative.",
      B: "Defines category queries (canonical query set).",
      C: "Optional: competitor categories to compare macro demand shifts.",
      D: "Maps category queries into themes.",
      E: "Adjusts growth classification thresholds (aggressive vs conservative).",
      F: "Weights implications by channel focus.",
      G: "Hard exclusions: remove prohibited subcategories/queries.",
      H: "Defines thresholds for CAGR/slope classification and investment signal."
    },
    gates: {
      fenceMode: "hard",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      { name: "queries", type: "string[]", required: true, description: "Category query set (usually derived from UCR.B)." },
      { name: "country", type: "string", required: false, default: "US" },
      { name: "time_range", type: "string", required: false, default: "today 5-y" },
      { name: "interval", type: "string", required: false, default: "weekly" }
    ]
  },

  disposition: {
    required: false,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "evidence", "severity"],
    runTraceFields: ["sectionsUsed", "sectionsMissing", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "category_demand_signal",
    visuals: [
      { kind: "line", title: "5-Year Demand Trendline" },
      { kind: "heatmap", title: "Seasonality Heatmap" },
      { kind: "card", title: "Investment Signal" }
    ],
    summaryFields: ["cagr_5y", "trend_direction", "peak_months", "timing_recommendation"]
  },

  councilRules: {
    ownerCouncil: "Market Trends & Forecasting Council",
    rulePacks: [{ packId: "market_trends.demand.classification", version: "v1", appliesTo: "run" }]
  },

  guardrails: {
    neverPromiseRevenue: true,
    alwaysProvideNextStep: true
  }
};

export const BrandAttentionContract: ModuleContract = {
  moduleId: "brand.attention_share.v1",
  name: "Brand Attention & Share of Search",
  category: "Brand Signal",
  layer: "Signal",
  version: "contract.v1",

  description: "Measures brand share of search and attention metrics relative to competitors.",
  strategicQuestion: "What part of the market's mind is ours?",

  dataSources: ["GoogleTrends", "Internal"],

  riskProfile: {
    confidence: "medium",
    riskIfWrong: "medium",
    inferenceType: "external"
  },

  caching: {
    cadence: "weekly",
    bustOnChanges: ["competitor_set", "category_scope"]
  },

  executionGate: {
    allowedStatuses: ["LOCKED", "HUMAN_CONFIRMED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    requiredSections: ["A", "B", "C"],
    optionalSections: ["E", "H"],
    sectionUsage: {
      A: "Defines brand entity for share calculation.",
      B: "Defines category for share context.",
      C: "Defines competitors for relative share.",
      E: "Adjusts competitive emphasis.",
      H: "Sets thresholds for share classification."
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "none"
    }
  },

  inputs: {
    fields: [
      { name: "time_range", type: "string", required: false, default: "today 12-m" },
      { name: "granularity", type: "string", required: false, default: "monthly" }
    ]
  },

  disposition: {
    required: false,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "severity"],
    runTraceFields: ["sectionsUsed", "sectionsMissing", "rulesTriggered"]
  },

  output: {
    entityType: "brand_share_signal",
    visuals: [
      { kind: "line", title: "Share of Search Over Time" },
      { kind: "bar", title: "Competitive Share Breakdown" }
    ],
    summaryFields: ["current_share", "share_trend", "top_competitor", "gap_to_leader"]
  },

  councilRules: {
    ownerCouncil: "Brand Strategy Council",
    rulePacks: []
  },

  guardrails: {
    neverPromiseRevenue: true,
    alwaysProvideNextStep: true
  }
};

export const MarketDemandSeasonalityContract: ModuleContract = {
  moduleId: "market.demand_seasonality.v1",
  name: "Market Demand & Seasonality",
  category: "Market Intelligence",
  layer: "Signal",
  version: "contract.v2",

  description: "Surfaces historical and near-term demand cycles using Google Trends data for timing decisions. Answers WHEN to act, not HOW MUCH to spend. Context-First: Demand clusters derived from UCR.D.demand_themes.",
  strategicQuestion: "When does our market actually wake up — and when should we act?",

  dataSources: ["DataForSEO", "GoogleTrends"],

  riskProfile: {
    confidence: "high",
    riskIfWrong: "medium",
    inferenceType: "external"
  },

  caching: {
    cadence: "monthly",
    ttlSeconds: 2592000,
    bustOnChanges: ["category_scope", "market", "governance"]
  },

  executionGate: {
    // Context-First: Require AI_READY or higher
    allowedStatuses: ["AI_READY", "AI_ANALYSIS_RUN", "HUMAN_CONFIRMED", "LOCKED"],
    allowMissingOptionalSections: true,
    requireAuditTrail: true
  },

  contextInjection: {
    // Context-First: D (demand themes) and H (governance) are required
    requiredSections: ["D", "H"],
    optionalSections: ["A", "B", "C", "E", "F", "G"],
    sectionUsage: {
      A: "Optional: brand domain and geo for market context.",
      B: "Optional: category fence for query validation.",
      C: "Optional: competitor brands for trend comparison.",
      D: "REQUIRED: demand_themes provide query clusters for analysis.",
      E: "Optional: risk_tolerance adjusts timing sensitivity.",
      F: "Optional: channel context for recommendation framing.",
      G: "Hard exclusions for prohibited categories/keywords.",
      H: "REQUIRED: module_defaults.forecast_policy controls forecast behavior."
    },
    gates: {
      fenceMode: "soft",
      negativeScopeMode: "hard"
    }
  },

  inputs: {
    fields: [
      {
        name: "demand_theme_clusters",
        type: "json",
        required: false,
        description: "Derived from UCR.D.demand_themes - not user-provided"
      },
      {
        name: "country_code",
        type: "string",
        required: false,
        default: "US",
        description: "Defaults to H.module_defaults.default_geo"
      },
      {
        name: "time_range",
        type: "string",
        required: false,
        default: "today 5-y",
        description: "Defaults to H.module_defaults.default_time_range"
      },
      {
        name: "interval",
        type: "string",
        required: false,
        default: "weekly",
        description: "Defaults to H.module_defaults.default_interval",
        constraints: { enum: ["daily", "weekly", "monthly"] }
      }
      // NOTE: forecast_enabled removed - controlled by H.module_defaults.forecast_policy
    ]
  },

  disposition: {
    required: false,
    allowed: ["PASS", "REVIEW", "OUT_OF_PLAY"]
  },

  explainability: {
    required: true,
    itemTraceFields: ["ruleId", "ucrSection", "reason", "severity"],
    runTraceFields: ["sectionsUsed", "sectionsMissing", "filtersApplied", "rulesTriggered"]
  },

  output: {
    entityType: "demand_timing_signal",
    visuals: [
      { kind: "line", title: "5-Year Demand Curve", description: "Historical weekly demand" },
      { kind: "heatmap", title: "Seasonality Heatmap", description: "Monthly average patterns" },
      { kind: "card", title: "Timing Recommendation", description: "When to act" }
    ],
    summaryFields: [
      "peak_months",
      "inflection_point",
      "yoy_consistency",
      "timing_recommendation",
      "confidence_level"
    ]
  },

  councilRules: {
    ownerCouncil: "Strategic Intelligence",
    supportingCouncils: ["Growth Strategy & Planning", "Performance Media & Messaging"],
    rulePacks: [
      { packId: "strategic_intel.timing", version: "v1", appliesTo: "run" }
    ]
  },

  guardrails: {
    neverPromiseRevenue: true,
    neverDumpRawEntitiesWithoutFraming: true,
    alwaysProvideNextStep: true
  }
};

/* ---------------------------------- */
/* Default Registry                    */
/* ---------------------------------- */

export const CONTRACT_REGISTRY = createContractRegistry([
  KeywordGapVisibilityContract,
  CategoryDemandTrendContract,
  BrandAttentionContract,
  MarketDemandSeasonalityContract
]);

export function getAllContracts(): ModuleContract[] {
  return Object.values(CONTRACT_REGISTRY);
}

export function getActiveContracts(): ModuleContract[] {
  return Object.values(CONTRACT_REGISTRY);
}

/* ---------------------------------- */
/* Legacy Module Definitions           */
/* (Consolidated from module-registry) */
/* ---------------------------------- */

export type UCRSection = UCRSectionID;

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  question: string;
  requiredSections: UCRSectionID[];
  optionalSections: UCRSectionID[];
  outputType: 'keywords' | 'signal' | 'share' | 'levers' | 'capture' | 'pricing';
  status: 'active' | 'planned' | 'deprecated';
}

export const CATEGORY_DEMAND_SIGNAL: ModuleDefinition = {
  id: 'category_demand_signal',
  name: 'Category Demand Signal',
  description: 'Market demand trends and seasonality analysis',
  question: 'Is this category worth investing in and when?',
  requiredSections: ['A', 'B'],
  optionalSections: ['D', 'E', 'G', 'H'],
  outputType: 'signal',
  status: 'planned'
};

export const BRAND_ATTENTION: ModuleDefinition = {
  id: 'brand_attention',
  name: 'Brand Attention & Share of Search',
  description: 'Brand share of search and attention metrics',
  question: 'What part of the market mind is ours?',
  requiredSections: ['A', 'B', 'C'],
  optionalSections: ['E', 'H'],
  outputType: 'share',
  status: 'planned'
};

export const SEO_VISIBILITY_GAP: ModuleDefinition = {
  id: 'seo_visibility_gap',
  name: 'SEO Visibility & Gap Mapping',
  description: 'Keyword gap analysis with 3-tier classification',
  question: 'Where are we missing organic opportunity?',
  requiredSections: ['A', 'B', 'C'],
  optionalSections: ['D', 'E', 'F', 'G', 'H'],
  outputType: 'keywords',
  status: 'active'
};

export const RETAIL_PRICING: ModuleDefinition = {
  id: 'retail_pricing',
  name: 'Retail Availability & Pricing Intelligence',
  description: 'Retail shelf presence and pricing analysis',
  question: 'Where are we losing shelf and margin?',
  requiredSections: ['A', 'C'],
  optionalSections: ['E', 'F', 'G', 'H'],
  outputType: 'pricing',
  status: 'planned'
};

export const DEMAND_CAPTURE: ModuleDefinition = {
  id: 'demand_capture',
  name: 'Demand Capture & Efficiency',
  description: 'Branded vs non-branded demand capture analysis',
  question: 'Are we capturing demand or just defending?',
  requiredSections: ['A', 'B'],
  optionalSections: ['D', 'E', 'F', 'H'],
  outputType: 'capture',
  status: 'planned'
};

export const STRATEGIC_LEVERS: ModuleDefinition = {
  id: 'strategic_levers',
  name: 'Strategic Levers & AI-Augmented Moves',
  description: 'Orchestrates recommendations from all modules',
  question: 'What should we do next?',
  requiredSections: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  optionalSections: [],
  outputType: 'levers',
  status: 'planned'
};

export const MARKET_DEMAND_SEASONALITY: ModuleDefinition = {
  id: 'market_demand_seasonality',
  name: 'Market Demand & Seasonality',
  description: 'Timing signals from demand cycles - when to act, not how much to spend',
  question: 'When does our market wake up and when should we act?',
  requiredSections: ['A', 'B'],
  optionalSections: ['C', 'D', 'E', 'G', 'H'],
  outputType: 'signal',
  status: 'active'
};

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  'category_demand_signal': CATEGORY_DEMAND_SIGNAL,
  'brand_attention': BRAND_ATTENTION,
  'seo_visibility_gap': SEO_VISIBILITY_GAP,
  'retail_pricing': RETAIL_PRICING,
  'demand_capture': DEMAND_CAPTURE,
  'strategic_levers': STRATEGIC_LEVERS,
  'market_demand_seasonality': MARKET_DEMAND_SEASONALITY
};

export function getModuleDefinition(moduleId: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY[moduleId];
}

export function getActiveModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
}

export function getAllModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY);
}

export function canModuleExecute(
  moduleId: string, 
  availableSections: UCRSectionID[]
): { canExecute: boolean; missingSections: UCRSectionID[]; warnings: string[] } {
  const module = getModuleDefinition(moduleId);
  if (!module) {
    return { canExecute: false, missingSections: [], warnings: ['Module not found'] };
  }

  const missingSections = module.requiredSections.filter(
    section => !availableSections.includes(section)
  );

  const missingOptional = module.optionalSections.filter(
    section => !availableSections.includes(section)
  );

  const warnings: string[] = [];
  if (missingOptional.length > 0) {
    warnings.push(
      `Missing optional sections: ${missingOptional.map(s => `${s} (${UCR_SECTION_NAMES[s]})`).join(', ')}. Results may be less accurate.`
    );
  }

  return {
    canExecute: missingSections.length === 0,
    missingSections,
    warnings
  };
}
