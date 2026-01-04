import { z } from "zod";
import { pgTable, serial, text, jsonb, timestamp, varchar, integer, boolean, real, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./models/auth";

// Re-export auth, chat and tenant models
export * from "./models/auth";
export * from "./models/chat";
export * from "./models/tenant";

// Helper for case-insensitive enums
const caseInsensitiveEnum = (values: [string, ...string[]]) => {
  const lowercaseValues = values.map(v => v.toLowerCase()) as [string, ...string[]];
  return z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() : val),
    z.enum(lowercaseValues)
  );
};

// ============================================================================
// BRANDS TABLE - Normalized brand identity data
// ============================================================================
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  domain: varchar("domain", { length: 255 }).notNull(),
  name: text("name").notNull(),
  industry: text("industry"),
  businessModel: varchar("business_model", { length: 50 }),
  primaryGeography: jsonb("primary_geography").default([]),
  revenueBand: text("revenue_band"),
  targetMarket: text("target_market"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_brands_user").on(table.userId),
  index("idx_brands_domain").on(table.domain),
]);

// ============================================================================
// CONTEXTS TABLE - UCR (User Context Record) with 8 canonical sections
// One context per brand (brand_id is FK)
// ============================================================================
export const contexts = pgTable("contexts", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id"),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull().default("Default Context"),
  // Section A: Brand (reference to brands table, but also JSONB for backward compat)
  brand: jsonb("brand").notNull().default({}),
  // Section B: Category Definition
  category_definition: jsonb("category_definition").notNull().default({}),
  // Section C: Competitors
  competitors: jsonb("competitors").notNull().default({}),
  // Section D: Demand Definition
  demand_definition: jsonb("demand_definition").notNull().default({}),
  // Section E: Strategic Intent
  strategic_intent: jsonb("strategic_intent").notNull().default({}),
  // Section F: Channel Context
  channel_context: jsonb("channel_context").notNull().default({}),
  // Section G: Negative Scope (guardrails)
  negative_scope: jsonb("negative_scope").notNull().default({}),
  // Section H: Governance
  governance: jsonb("governance").notNull().default({}),
  // UCR metadata
  snapshotHash: varchar("snapshot_hash", { length: 64 }),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_contexts_brand").on(table.brandId),
  index("idx_contexts_user").on(table.userId),
  index("idx_contexts_tenant").on(table.tenantId),
]);

// ============================================================================
// EXEC_REPORTS TABLE - Module execution results
// Each module execution creates one exec_report linked to a context
// ============================================================================
export const execReports = pgTable("exec_reports", {
  id: serial("id").primaryKey(),
  contextId: integer("context_id").notNull().references(() => contexts.id, { onDelete: "cascade" }),
  brandId: integer("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id"),
  userId: varchar("user_id").notNull().references(() => users.id),
  moduleId: varchar("module_id", { length: 100 }).notNull(),
  moduleName: text("module_name").notNull(),
  // Execution metadata
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  confidence: real("confidence").default(0),
  hasData: boolean("has_data").default(false),
  // Results
  insights: jsonb("insights").default([]),
  recommendations: jsonb("recommendations").default([]),
  rawOutput: jsonb("raw_output").default({}),
  // Council reasoning (if executed with council)
  councilPerspectives: jsonb("council_perspectives"),
  synthesis: jsonb("synthesis"),
  // Guardrails
  guardrailStatus: jsonb("guardrail_status"),
  // UCR snapshot at execution time
  ucrSnapshotHash: varchar("ucr_snapshot_hash", { length: 64 }),
  // Timestamps
  executedAt: timestamp("executed_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_exec_reports_context").on(table.contextId),
  index("idx_exec_reports_brand").on(table.brandId),
  index("idx_exec_reports_module").on(table.moduleId),
  index("idx_exec_reports_user").on(table.userId),
]);

// ============================================================================
// LEGACY: Configurations table (kept for backward compatibility during migration)
// ============================================================================
export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  brand: jsonb("brand").notNull(),
  category_definition: jsonb("category_definition").notNull(),
  competitors: jsonb("competitors").notNull(),
  demand_definition: jsonb("demand_definition").notNull(),
  strategic_intent: jsonb("strategic_intent").notNull(),
  channel_context: jsonb("channel_context").notNull(),
  negative_scope: jsonb("negative_scope").notNull(),
  governance: jsonb("governance").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_configs_user").on(table.userId),
  index("idx_configs_tenant").on(table.tenantId),
]);

// Configuration versions table for version history
export const configurationVersions = pgTable("configuration_versions", {
  id: serial("id").primaryKey(),
  configurationId: integer("configuration_id").notNull().references(() => configurations.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id"),
  userId: varchar("user_id").notNull().references(() => users.id),
  versionNumber: integer("version_number").notNull(),
  name: text("name").notNull(),
  brand: jsonb("brand").notNull(),
  category_definition: jsonb("category_definition").notNull(),
  competitors: jsonb("competitors").notNull(),
  demand_definition: jsonb("demand_definition").notNull(),
  strategic_intent: jsonb("strategic_intent").notNull(),
  channel_context: jsonb("channel_context").notNull(),
  negative_scope: jsonb("negative_scope").notNull(),
  governance: jsonb("governance").notNull(),
  change_summary: text("change_summary").default(""),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_config_versions_config").on(table.configurationId),
  index("idx_config_versions_user").on(table.userId),
]);

// Audit log table for tracking human overrides and changes
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  userId: varchar("user_id").notNull().references(() => users.id),
  configurationId: integer("configuration_id"),
  action: varchar("action").notNull(), // create, update, override, approve, reject, expire
  entityType: varchar("entity_type").notNull(), // configuration, competitor, keyword, category, exclusion
  entityId: varchar("entity_id").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_logs_config").on(table.configurationId),
  index("idx_audit_logs_user").on(table.userId),
  index("idx_audit_logs_action").on(table.action),
]);

// Bulk generation jobs table
export const bulkJobs = pgTable("bulk_jobs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").notNull().default("pending"),
  totalBrands: integer("total_brands").notNull(),
  completedBrands: integer("completed_brands").notNull().default(0),
  failedBrands: integer("failed_brands").notNull().default(0),
  primaryCategory: text("primary_category").notNull(),
  brands: jsonb("brands").notNull(),
  results: jsonb("results").notNull().default([]),
  errors: jsonb("errors").notNull().default([]),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bulk_jobs_user").on(table.userId),
  index("idx_bulk_jobs_status").on(table.status),
]);

// Bulk brand input schema
export const bulkBrandInputSchema = z.object({
  domain: z.string().min(1),
  name: z.string().optional(),
});

// Bulk job request schema
export const bulkJobRequestSchema = z.object({
  primaryCategory: z.string().min(1, "Primary category is required"),
  brands: z.array(bulkBrandInputSchema).min(1).max(5000),
});

export type BulkBrandInput = z.infer<typeof bulkBrandInputSchema>;
export type BulkJobRequest = z.infer<typeof bulkJobRequestSchema>;

export interface BulkJob {
  id: number;
  tenantId: number | null;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalBrands: number;
  completedBrands: number;
  failedBrands: number;
  primaryCategory: string;
  brands: BulkBrandInput[];
  results: InsertConfiguration[];
  errors: { domain: string; error: string }[];
  created_at: Date;
  updated_at: Date;
}

// Brand Context Schema - validation is optional to allow partial saves
export const brandSchema = z.object({
  name: z.string().default(""),
  domain: z.string().default(""),
  industry: z.string().default(""),
  business_model: caseInsensitiveEnum(["b2b", "dtc", "marketplace", "hybrid"]),
  primary_geography: z.array(z.string()).default([]),
  revenue_band: z.string().default(""),
  target_market: z.string().default(""), // Country/market (US, EU, LATAM, etc.)
});

// Category Alternative Schema (for AI-suggested alternatives with evidence)
export const categoryAlternativeSchema = z.object({
  category: z.string(),
  reason: z.string(), // Why AI suggests this
  evidence: z.array(z.string()).default([]), // SERP snippets, trends, keywords
  confidence: z.number().min(0).max(100).default(50),
});

// Category Definition Schema - allows partial saves
export const categoryDefinitionSchema = z.object({
  primary_category: z.string().default(""),
  included: z.array(z.string()).default([]),
  excluded: z.array(z.string()).default([]),
  approved_categories: z.array(z.string()).default([]), // Human-approved categories
  alternative_categories: z.array(categoryAlternativeSchema).default([]), // AI-suggested with evidence
});

// Phase 2: Enhanced Competitor Schema with tiering, scoring, and evidence
export const competitorEvidenceSchema = z.object({
  why_selected: z.string().default(""), // Reasoning for inclusion
  top_overlap_keywords: z.array(z.string()).default([]), // Shared SERP keywords
  serp_examples: z.array(z.string()).default([]), // URL examples from SERP overlap
});

export const competitorEntrySchema = z.object({
  name: z.string(),
  domain: z.string().default(""),
  tier: caseInsensitiveEnum(["tier1", "tier2", "tier3"]).default("tier1"), // tier1=direct, tier2=adjacent, tier3=aspirational
  status: caseInsensitiveEnum(["approved", "rejected", "pending_review"]).default("pending_review"),
  // Scoring metrics (0-100)
  similarity_score: z.number().min(0).max(100).default(50),
  serp_overlap: z.number().min(0).max(100).default(0), // % of shared keywords in SERPs
  size_proximity: z.number().min(0).max(100).default(50), // How close in company size
  // Company size guardrails
  revenue_range: z.string().default(""), // e.g., "10M-50M"
  employee_count: z.string().default(""), // e.g., "50-200"
  funding_stage: caseInsensitiveEnum(["bootstrap", "seed", "series_a", "series_b", "series_c_plus", "public", "unknown"]).default("unknown"),
  geo_overlap: z.array(z.string()).default([]), // Markets where they compete
  // Evidence pack
  evidence: competitorEvidenceSchema.default({}),
  // Metadata
  added_by: caseInsensitiveEnum(["ai", "human"]).default("ai"),
  added_at: z.string().default(""),
  rejected_reason: z.string().default(""), // If rejected, why
});

// Competitive Set Schema - Phase 2 enhanced
export const competitorsSchema = z.object({
  // Legacy arrays for backward compatibility
  direct: z.array(z.string()).default([]),
  indirect: z.array(z.string()).default([]),
  marketplaces: z.array(z.string()).default([]),
  // Phase 2: Enhanced competitor entries with full metadata
  competitors: z.array(competitorEntrySchema).default([]),
  // Aggregate tracking
  approved_count: z.number().default(0),
  rejected_count: z.number().default(0),
  pending_review_count: z.number().default(0),
});

// Demand Definition Schema
export const demandDefinitionSchema = z.object({
  brand_keywords: z.object({
    seed_terms: z.array(z.string()),
    top_n: z.number().min(1).max(100),
  }),
  non_brand_keywords: z.object({
    category_terms: z.array(z.string()),
    problem_terms: z.array(z.string()),
    top_n: z.number().min(1).max(200),
  }),
});

// Strategic Intent Schema - Phase 3 enhanced
export const strategicIntentSchema = z.object({
  growth_priority: z.string().default(""),
  risk_tolerance: caseInsensitiveEnum(["low", "medium", "high"]),
  primary_goal: z.string().default(""),
  secondary_goals: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  // Phase 3: Enhanced strategic fields
  goal_type: caseInsensitiveEnum(["roi", "volume", "authority", "awareness", "retention"]).default("roi"),
  time_horizon: caseInsensitiveEnum(["short", "medium", "long"]).default("medium"), // short=0-3mo, medium=3-12mo, long=12mo+
  constraint_flags: z.object({
    budget_constrained: z.boolean().default(false),
    resource_limited: z.boolean().default(false),
    regulatory_sensitive: z.boolean().default(false),
    brand_protection_priority: z.boolean().default(false),
  }).default({
    budget_constrained: false,
    resource_limited: false,
    regulatory_sensitive: false,
    brand_protection_priority: false,
  }),
});

// Channel Context Schema
export const channelContextSchema = z.object({
  paid_media_active: z.boolean(),
  seo_investment_level: caseInsensitiveEnum(["low", "medium", "high"]),
  marketplace_dependence: caseInsensitiveEnum(["low", "medium", "high"]),
});

// Phase 3: Enhanced exclusion entry with match type and TTL
export const exclusionEntrySchema = z.object({
  value: z.string(),
  match_type: caseInsensitiveEnum(["exact", "semantic"]).default("exact"),
  semantic_sensitivity: caseInsensitiveEnum(["low", "medium", "high"]).default("medium"), // Only for semantic match
  expires_at: z.string().optional(), // ISO date for TTL, undefined = permanent
  added_by: caseInsensitiveEnum(["ai", "human"]).default("human"),
  added_at: z.string().default(""),
  reason: z.string().default(""),
});

// Audit log entry for applied exclusions
export const exclusionAuditEntrySchema = z.object({
  timestamp: z.string(),
  action: caseInsensitiveEnum(["applied", "overridden", "expired", "removed"]),
  exclusion_value: z.string(),
  exclusion_type: caseInsensitiveEnum(["category", "keyword", "use_case", "competitor"]),
  context: z.string().default(""), // What triggered it
  user_id: z.string().default(""),
});

// Negative Scope Schema - Phase 3 enhanced
export const negativeScopeSchema = z.object({
  // Legacy arrays for backward compatibility
  excluded_categories: z.array(z.string()).default([]),
  excluded_keywords: z.array(z.string()).default([]),
  excluded_use_cases: z.array(z.string()).default([]),
  excluded_competitors: z.array(z.string()).default([]),
  // Phase 3: Enhanced exclusion entries with match type and TTL
  category_exclusions: z.array(exclusionEntrySchema).default([]),
  keyword_exclusions: z.array(exclusionEntrySchema).default([]),
  use_case_exclusions: z.array(exclusionEntrySchema).default([]),
  competitor_exclusions: z.array(exclusionEntrySchema).default([]),
  // Enforcement rules
  enforcement_rules: z.object({
    hard_exclusion: z.boolean(),
    allow_model_suggestion: z.boolean(),
    require_human_override_for_expansion: z.boolean(),
  }),
  // Audit log for applied exclusions
  audit_log: z.array(exclusionAuditEntrySchema).default([]),
});

// Phase 4: Context Quality Score Schema
export const contextQualityScoreSchema = z.object({
  // Individual dimension scores (0-100)
  completeness: z.number().min(0).max(100).default(0), // % of required fields filled
  competitor_confidence: z.number().min(0).max(100).default(0), // Avg evidence strength across competitors
  negative_strength: z.number().min(0).max(100).default(0), // Coverage of exclusions
  evidence_coverage: z.number().min(0).max(100).default(0), // % of competitors with evidence packs
  // Composite score
  overall: z.number().min(0).max(100).default(0),
  grade: caseInsensitiveEnum(["high", "medium", "low"]).default("low"),
  // Breakdown notes for transparency
  breakdown: z.object({
    completeness_details: z.string().default(""),
    competitor_details: z.string().default(""),
    negative_details: z.string().default(""),
    evidence_details: z.string().default(""),
  }).default({
    completeness_details: "",
    competitor_details: "",
    negative_details: "",
    evidence_details: "",
  }),
  // Timestamp
  calculated_at: z.string().default(""),
});

// Phase 4: AI Behavior Contract Schema
export const aiBehaviorContractSchema = z.object({
  // Auto-regeneration tracking
  regeneration_count: z.number().default(0), // How many times AI has regenerated
  max_regenerations: z.number().default(1), // Max allowed auto-regenerations
  last_regeneration_at: z.string().optional(),
  regeneration_reason: z.string().optional(),
  // Redaction tracking
  redacted_fields: z.array(z.object({
    field_path: z.string(),
    original_value: z.string(),
    redacted_at: z.string(),
    reason: z.string(),
  })).default([]),
  // Confidence thresholds for auto-approval
  auto_approve_threshold: z.number().min(0).max(100).default(80), // Score above which auto-approve
  require_human_below: z.number().min(0).max(100).default(50), // Score below which force human review
  // Flags
  requires_human_review: z.boolean().default(false),
  auto_approved: z.boolean().default(false),
  violation_detected: z.boolean().default(false),
  violation_details: z.string().optional(),
});

// Governance Schema
export const governanceSchema = z.object({
  model_suggested: z.boolean(),
  human_overrides: z.object({
    competitors: z.array(z.string()),
    keywords: z.array(z.string()),
    categories: z.array(z.string()),
  }),
  context_confidence: z.object({
    level: caseInsensitiveEnum(["high", "medium", "low"]),
    notes: z.string(),
  }),
  last_reviewed: z.string(),
  reviewed_by: z.string(),
  context_valid_until: z.string(),
  cmo_safe: z.boolean(),
  // Phase 1: Validation & Versioning
  context_hash: z.string().default(""), // Deterministic fingerprint for reproducibility
  context_version: z.number().default(1), // Incrementing version number
  validation_status: caseInsensitiveEnum(["complete", "incomplete", "blocked", "needs_review"]).default("incomplete"),
  human_verified: z.boolean().default(false),
  human_verified_at: z.string().optional(), // ISO date when human verified
  blocked_reasons: z.array(z.string()).default([]), // Why validation is blocked
  // Phase 4: Quality Score & AI Behavior
  quality_score: contextQualityScoreSchema.default({
    completeness: 0,
    competitor_confidence: 0,
    negative_strength: 0,
    evidence_coverage: 0,
    overall: 0,
    grade: "low",
    breakdown: {
      completeness_details: "",
      competitor_details: "",
      negative_details: "",
      evidence_details: "",
    },
    calculated_at: "",
  }),
  ai_behavior: aiBehaviorContractSchema.default({
    regeneration_count: 0,
    max_regenerations: 1,
    redacted_fields: [],
    auto_approve_threshold: 80,
    require_human_below: 50,
    requires_human_review: false,
    auto_approved: false,
    violation_detected: false,
  }),
});

// Full Configuration Schema
export const configurationSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Configuration name is required"),
  brand: brandSchema,
  category_definition: categoryDefinitionSchema,
  competitors: competitorsSchema,
  demand_definition: demandDefinitionSchema,
  strategic_intent: strategicIntentSchema,
  channel_context: channelContextSchema,
  negative_scope: negativeScopeSchema,
  governance: governanceSchema,
  created_at: z.date(),
  updated_at: z.date(),
});

// Insert schema (without auto-generated fields)
export const insertConfigurationSchema = configurationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Types
export type Brand = z.infer<typeof brandSchema>;
export type CategoryDefinition = z.infer<typeof categoryDefinitionSchema>;
export type CompetitorEvidence = z.infer<typeof competitorEvidenceSchema>;
export type CompetitorEntry = z.infer<typeof competitorEntrySchema>;
export type Competitors = z.infer<typeof competitorsSchema>;
export type DemandDefinition = z.infer<typeof demandDefinitionSchema>;
export type StrategicIntent = z.infer<typeof strategicIntentSchema>;
export type ChannelContext = z.infer<typeof channelContextSchema>;
export type ExclusionEntry = z.infer<typeof exclusionEntrySchema>;
export type ExclusionAuditEntry = z.infer<typeof exclusionAuditEntrySchema>;
export type NegativeScope = z.infer<typeof negativeScopeSchema>;
export type ContextQualityScore = z.infer<typeof contextQualityScoreSchema>;
export type AIBehaviorContract = z.infer<typeof aiBehaviorContractSchema>;
export type Governance = z.infer<typeof governanceSchema>;
export type Configuration = z.infer<typeof configurationSchema>;
export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;

// Configuration version type
export interface ConfigurationVersion {
  id: number;
  configurationId: number;
  userId: string;
  versionNumber: number;
  name: string;
  brand: Brand;
  category_definition: CategoryDefinition;
  competitors: Competitors;
  demand_definition: DemandDefinition;
  strategic_intent: StrategicIntent;
  channel_context: ChannelContext;
  negative_scope: NegativeScope;
  governance: Governance;
  change_summary: string;
  created_at: Date;
}

// Category Alternative type export
export type CategoryAlternative = z.infer<typeof categoryAlternativeSchema>;

// Audit log type
export interface AuditLog {
  id: number;
  tenantId: number | null;
  userId: string;
  configurationId: number | null;
  action: "create" | "update" | "override" | "approve" | "reject" | "expire";
  entityType: "configuration" | "competitor" | "keyword" | "category" | "exclusion";
  entityId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

// ============================================
// ExecReports & MasterReports - Phase 5
// ============================================

// ExecReport - resultado de ejecución de un módulo específico
export const execReportSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  configurationId: z.number(),
  contextVersion: z.number(),
  contextHash: z.string(),
  executedAt: z.date(),
  output: z.any(), // ModuleOutput
  playbookResult: z.object({
    insights: z.array(z.any()),
    recommendations: z.array(z.any()),
    deprioritized: z.array(z.string()),
    councilPrompt: z.string(),
  }).optional(),
});

// MasterReport - consolidación de contexto + todos los exec reports
export const masterReportSchema = z.object({
  id: z.string(),
  configurationId: z.number(),
  contextVersion: z.number(),
  contextHash: z.string(),
  generatedAt: z.date(),
  ucrSnapshot: z.any(), // Partial UCR snapshot
  execReports: z.array(execReportSchema),
  consolidatedInsights: z.array(z.any()),
  consolidatedRecommendations: z.array(z.any()),
  councilSynthesis: z.object({
    keyThemes: z.array(z.string()),
    crossModulePatterns: z.array(z.string()),
    prioritizedActions: z.array(z.string()),
  }),
  modulesIncluded: z.array(z.string()),
  overallConfidence: z.number(),
  dataFreshness: caseInsensitiveEnum(['fresh', 'moderate', 'stale']),
});

// Database row types
export interface DbExecReport {
  id: number;
  contextId: number;
  brandId: number;
  tenantId: number | null;
  userId: string;
  moduleId: string;
  moduleName: string;
  status: string;
  confidence: number | null;
  hasData: boolean | null;
  insights: any;
  recommendations: any;
  rawOutput: any;
  councilPerspectives: any;
  synthesis: any;
  guardrailStatus: any;
  ucrSnapshotHash: string | null;
  executedAt: Date;
  expiresAt: Date | null;
  created_at: Date;
}

export interface DbMasterReport {
  id: string;
  configurationId: number;
  contextVersion: number;
  contextHash: string;
  generatedAt: Date;
  ucrSnapshot: any;
  execReportIds: string[];
  consolidatedInsights: any[];
  consolidatedRecommendations: any[];
  councilSynthesis: {
    keyThemes: string[];
    crossModulePatterns: string[];
    prioritizedActions: string[];
  };
  modulesIncluded: string[];
  overallConfidence: number;
  dataFreshness: 'fresh' | 'moderate' | 'stale';
  created_at: Date;
}

// Default configuration for new configurations
export const defaultConfiguration: InsertConfiguration = {
  name: "New Configuration",
  brand: {
    name: "",
    domain: "",
    industry: "",
    business_model: "B2B",
    primary_geography: [],
    revenue_band: "",
    target_market: "",
  },
  category_definition: {
    primary_category: "",
    included: [],
    excluded: [],
    approved_categories: [],
    alternative_categories: [],
  },
  competitors: {
    direct: [],
    indirect: [],
    marketplaces: [],
    competitors: [],
    approved_count: 0,
    rejected_count: 0,
    pending_review_count: 0,
  },
  demand_definition: {
    brand_keywords: {
      seed_terms: [],
      top_n: 20,
    },
    non_brand_keywords: {
      category_terms: [],
      problem_terms: [],
      top_n: 50,
    },
  },
  strategic_intent: {
    growth_priority: "",
    risk_tolerance: "medium",
    primary_goal: "",
    secondary_goals: [],
    avoid: [],
    goal_type: "roi",
    time_horizon: "medium",
    constraint_flags: {
      budget_constrained: false,
      resource_limited: false,
      regulatory_sensitive: false,
      brand_protection_priority: false,
    },
  },
  channel_context: {
    paid_media_active: false,
    seo_investment_level: "medium",
    marketplace_dependence: "low",
  },
  negative_scope: {
    excluded_categories: [],
    excluded_keywords: [],
    excluded_use_cases: [],
    excluded_competitors: [],
    category_exclusions: [],
    keyword_exclusions: [],
    use_case_exclusions: [],
    competitor_exclusions: [],
    enforcement_rules: {
      hard_exclusion: true,
      allow_model_suggestion: false,
      require_human_override_for_expansion: true,
    },
    audit_log: [],
  },
  governance: {
    model_suggested: true,
    human_overrides: {
      competitors: [],
      keywords: [],
      categories: [],
    },
    context_confidence: {
      level: "medium",
      notes: "",
    },
    last_reviewed: new Date().toISOString().split("T")[0],
    reviewed_by: "",
    context_valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    cmo_safe: false,
    context_hash: "",
    context_version: 1,
    validation_status: "incomplete",
    human_verified: false,
    blocked_reasons: [],
    quality_score: {
      completeness: 0,
      competitor_confidence: 0,
      negative_strength: 0,
      evidence_coverage: 0,
      overall: 0,
      grade: "low",
      breakdown: {
        completeness_details: "",
        competitor_details: "",
        negative_details: "",
        evidence_details: "",
      },
      calculated_at: "",
    },
    ai_behavior: {
      regeneration_count: 0,
      max_regenerations: 1,
      redacted_fields: [],
      auto_approve_threshold: 80,
      require_human_below: 50,
      requires_human_review: false,
      auto_approved: false,
      violation_detected: false,
    },
  },
};

// ============================================================================
// BRANDS TYPES
// ============================================================================
export type BrandRecord = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

// ============================================================================
// CONTEXTS TYPES (UCR)
// ============================================================================
export type ContextRecord = typeof contexts.$inferSelect;
export type InsertContext = typeof contexts.$inferInsert;

// ============================================================================
// EXEC_REPORTS TYPES
// ============================================================================
export type ExecReportRecord = typeof execReports.$inferSelect;

// Exec report status enum
export const execReportStatuses = ["pending", "running", "completed", "failed", "expired"] as const;
export type ExecReportStatus = typeof execReportStatuses[number];

// Master report is the aggregation of all exec_reports for a context
export interface MasterReport {
  contextId: number;
  brandId: number;
  context: ContextRecord;
  brand: BrandRecord;
  execReports: ExecReportRecord[];
  aggregatedInsights: any[];
  aggregatedRecommendations: any[];
  overallConfidence: number;
  generatedAt: string;
}
