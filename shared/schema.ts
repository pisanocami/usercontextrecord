import { z } from "zod";
import { pgTable, serial, text, jsonb, timestamp, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Re-export auth and chat models
export * from "./models/auth";
export * from "./models/chat";

// Brands table - first-class entity that owns configurations
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  domain: varchar("domain").notNull(), // unique per user
  name: text("name").default(""),
  industry: text("industry").default(""),
  business_model: varchar("business_model").default("B2B"),
  primary_geography: jsonb("primary_geography").default([]),
  revenue_band: text("revenue_band").default(""),
  target_market: text("target_market").default(""),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Configurations table for persistent storage
export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  brandId: integer("brand_id"), // FK to brands table (nullable for migration)
  name: text("name").notNull(),
  brand: jsonb("brand").notNull(), // Kept for backward compatibility / snapshots
  category_definition: jsonb("category_definition").notNull(),
  competitors: jsonb("competitors").notNull(),
  demand_definition: jsonb("demand_definition").notNull(),
  strategic_intent: jsonb("strategic_intent").notNull(),
  channel_context: jsonb("channel_context").notNull(),
  negative_scope: jsonb("negative_scope").notNull(),
  governance: jsonb("governance").notNull(),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Configuration versions table for version history
export const configurationVersions = pgTable("configuration_versions", {
  id: serial("id").primaryKey(),
  configurationId: integer("configuration_id").notNull(),
  userId: varchar("user_id").notNull(),
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
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Bulk generation jobs table
export const bulkJobs = pgTable("bulk_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  status: varchar("status").notNull().default("pending"),
  totalBrands: integer("total_brands").notNull(),
  completedBrands: integer("completed_brands").notNull().default(0),
  failedBrands: integer("failed_brands").notNull().default(0),
  primaryCategory: text("primary_category").notNull(),
  brands: jsonb("brands").notNull(),
  results: jsonb("results").notNull().default([]),
  errors: jsonb("errors").notNull().default([]),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Keyword Gap Analyses table - stores completed analysis runs
export const keywordGapAnalyses = pgTable("keyword_gap_analyses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  configurationId: integer("configuration_id").notNull(), // FK to configurations
  configurationName: text("configuration_name").notNull(),
  domain: varchar("domain").notNull(),
  provider: varchar("provider").notNull(), // "dataforseo" | "ahrefs"
  status: varchar("status").notNull().default("completed"), // "running" | "completed" | "failed"
  // Summary metrics
  totalKeywords: integer("total_keywords").notNull().default(0),
  passCount: integer("pass_count").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  outOfPlayCount: integer("out_of_play_count").notNull().default(0),
  estimatedMissingValue: integer("estimated_missing_value").notNull().default(0),
  // Top themes for quick display
  topThemes: jsonb("top_themes").default([]), // Array of {theme, count, totalVolume}
  // Full results stored as JSONB
  results: jsonb("results").notNull(), // Full KeywordGapLiteResult object
  // Parameters used for the run
  parameters: jsonb("parameters").notNull(), // {limitPerDomain, locationCode, languageCode, maxCompetitors}
  // Timestamps
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

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

// Keyword Gap Analysis types
export interface KeywordGapAnalysisTheme {
  theme: string;
  count: number;
  totalVolume: number;
}

export interface KeywordGapAnalysisParameters {
  limitPerDomain: number;
  locationCode: number;
  languageCode: string;
  maxCompetitors: number;
  provider: string;
}

export interface KeywordGapAnalysis {
  id: number;
  userId: string;
  configurationId: number;
  configurationName: string;
  domain: string;
  provider: string;
  status: "running" | "completed" | "failed";
  totalKeywords: number;
  passCount: number;
  reviewCount: number;
  outOfPlayCount: number;
  estimatedMissingValue: number;
  topThemes: KeywordGapAnalysisTheme[];
  results: any; // Full KeywordGapLiteResult - complex nested type
  parameters: KeywordGapAnalysisParameters;
  created_at: Date;
}

export type InsertKeywordGapAnalysis = Omit<KeywordGapAnalysis, "id" | "created_at">;

// Brand Context Schema - only domain is required, rest is optional for AI auto-generation
export const brandSchema = z.object({
  name: z.string().default(""),
  domain: z.string().min(1, "Domain is required"),
  industry: z.string().default(""),
  business_model: z.enum(["B2B", "DTC", "Marketplace", "Hybrid"]),
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

// Category Definition Schema - primary_category is required, rest is optional for AI auto-generation
export const categoryDefinitionSchema = z.object({
  primary_category: z.string().min(1, "Primary category is required"),
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
  tier: z.enum(["tier1", "tier2", "tier3"]).default("tier1"), // tier1=direct, tier2=adjacent, tier3=aspirational
  status: z.enum(["approved", "rejected", "pending_review"]).default("pending_review"),
  // Scoring metrics (0-100)
  similarity_score: z.number().min(0).max(100).default(50),
  serp_overlap: z.number().min(0).max(100).default(0), // % of shared keywords in SERPs
  size_proximity: z.number().min(0).max(100).default(50), // How close in company size
  // Company size guardrails
  revenue_range: z.string().default(""), // e.g., "10M-50M"
  employee_count: z.string().default(""), // e.g., "50-200"
  funding_stage: z.enum(["bootstrap", "seed", "series_a", "series_b", "series_c_plus", "public", "unknown"]).default("unknown"),
  geo_overlap: z.array(z.string()).default([]), // Markets where they compete
  // Evidence pack
  evidence: competitorEvidenceSchema.default({}),
  // Metadata
  added_by: z.enum(["ai", "human"]).default("ai"),
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

// Helper to normalize enum values to lowercase
const lowercaseEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (val) => (typeof val === "string" ? val.toLowerCase() : val),
    z.enum(values)
  );

// Strategic Intent Schema - Phase 3 enhanced
export const strategicIntentSchema = z.object({
  growth_priority: z.string().default(""),
  risk_tolerance: lowercaseEnum(["low", "medium", "high"] as const),
  primary_goal: z.string().default(""),
  secondary_goals: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  // Phase 3: Enhanced strategic fields
  goal_type: lowercaseEnum(["roi", "volume", "authority", "awareness", "retention"] as const).default("roi"),
  time_horizon: lowercaseEnum(["short", "medium", "long"] as const).default("medium"), // short=0-3mo, medium=3-12mo, long=12mo+
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
  seo_investment_level: lowercaseEnum(["low", "medium", "high"] as const),
  marketplace_dependence: lowercaseEnum(["low", "medium", "high"] as const),
});

// Capability Model Schema - configurable boosters/penalties for keyword scoring
export const capabilityPatternSchema = z.object({
  pattern: z.string(), // Regex pattern or keyword to match
  weight: z.number().min(-1).max(1), // Weight adjustment (-1 to +1)
  label: z.string().default(""), // Human-readable label for UI
});

export const capabilityModelSchema = z.object({
  // Boosters increase capability score (positive weights)
  boosters: z.array(capabilityPatternSchema).default([]),
  // Penalties decrease capability score (negative weights)
  penalties: z.array(capabilityPatternSchema).default([]),
  // Base score for all keywords (default 0.5)
  base_score: z.number().min(0).max(1).default(0.5),
  // Common competitor brands to auto-detect (beyond UCR competitors)
  common_brands: z.array(z.string()).default([]),
});

// Scoring Config Schema - configurable thresholds and weights
export const scoringConfigSchema = z.object({
  // Thresholds for pass/review/out_of_play
  pass_threshold: z.number().min(0).max(1).default(0.60), // DTC: 0.55, Retail: 0.65
  review_threshold: z.number().min(0).max(1).default(0.30), // Below this = out_of_play
  // Difficulty weighting (0 = ignore KD, 1 = full weight)
  difficulty_weight: z.number().min(0).max(1).default(0.5),
  // Position weighting (0 = ignore position, 1 = full weight)
  position_weight: z.number().min(0).max(1).default(0.5),
  // Vertical preset name (for display)
  vertical_preset: z.string().default("custom"),
});

// Phase 3: Enhanced exclusion entry with match type and TTL
export const exclusionEntrySchema = z.object({
  value: z.string(),
  match_type: lowercaseEnum(["exact", "semantic"] as const).default("exact"),
  semantic_sensitivity: lowercaseEnum(["low", "medium", "high"] as const).default("medium"), // Only for semantic match
  expires_at: z.string().optional(), // ISO date for TTL, undefined = permanent
  added_by: z.enum(["ai", "human"]).default("human"),
  added_at: z.string().default(""),
  reason: z.string().default(""),
});

// Audit log entry for applied exclusions
export const exclusionAuditEntrySchema = z.object({
  timestamp: z.string(),
  action: z.enum(["applied", "overridden", "expired", "removed"]),
  exclusion_value: z.string(),
  exclusion_type: z.enum(["category", "keyword", "use_case", "competitor"]),
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
  grade: z.enum(["high", "medium", "low"]).default("low"),
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

// Context Status enum - workflow states for AI-First vs Human-Confirmed modes
export const contextStatusEnum = z.enum([
  "DRAFT_AI",           // Initial AI-generated draft, not ready for analysis
  "AI_READY",           // Auto-checks passed, can run AI analysis
  "AI_ANALYSIS_RUN",    // Keyword Gap has been run, results are provisional
  "HUMAN_CONFIRMED",    // Human has validated and adopted the analysis
  "LOCKED",             // Context is locked, no further changes allowed
]);

export type ContextStatus = z.infer<typeof contextStatusEnum>;

// Section Approval Status enum
export const sectionApprovalStatusEnum = z.enum([
  "pending",    // Not yet reviewed
  "approved",   // Human approved
  "rejected",   // Human rejected, needs changes
  "ai_generated", // AI generated, awaiting review
]);

export type SectionApprovalStatus = z.infer<typeof sectionApprovalStatusEnum>;

// Individual section approval tracking
export const sectionApprovalSchema = z.object({
  status: sectionApprovalStatusEnum.default("pending"),
  approved_at: z.string().optional(),
  approved_by: z.string().optional(),
  rejected_reason: z.string().optional(),
  last_edited_at: z.string().optional(),
  last_edited_by: z.string().optional(),
});

// Section Approvals - tracks approval status for each section
export const sectionApprovalsSchema = z.object({
  brand_identity: sectionApprovalSchema.default({ status: "pending" }),
  category_definition: sectionApprovalSchema.default({ status: "pending" }),
  competitive_set: sectionApprovalSchema.default({ status: "pending" }),
  demand_definition: sectionApprovalSchema.default({ status: "pending" }),
  strategic_intent: sectionApprovalSchema.default({ status: "pending" }),
  channel_context: sectionApprovalSchema.default({ status: "pending" }),
  negative_scope: sectionApprovalSchema.default({ status: "pending" }),
});

export type SectionApproval = z.infer<typeof sectionApprovalSchema>;
export type SectionApprovals = z.infer<typeof sectionApprovalsSchema>;

// Governance Schema
export const governanceSchema = z.object({
  model_suggested: z.boolean(),
  human_overrides: z.object({
    competitors: z.array(z.string()),
    keywords: z.array(z.string()),
    categories: z.array(z.string()),
  }),
  context_confidence: z.object({
    level: z.enum(["high", "medium", "low"]),
    notes: z.string(),
  }),
  last_reviewed: z.string(),
  reviewed_by: z.string(),
  context_valid_until: z.string(),
  cmo_safe: z.boolean(),
  // Phase 1: Validation & Versioning
  context_hash: z.string().default(""), // Deterministic fingerprint for reproducibility
  context_version: z.number().default(1), // Incrementing version number
  validation_status: z.enum(["complete", "incomplete", "blocked", "needs_review"]).default("incomplete"),
  human_verified: z.boolean().default(false),
  human_verified_at: z.string().optional(), // ISO date when human verified
  blocked_reasons: z.array(z.string()).default([]), // Why validation is blocked
  // Context Status - AI-First workflow states
  context_status: contextStatusEnum.default("DRAFT_AI"),
  context_status_updated_at: z.string().optional(), // ISO date when status changed
  analysis_run_at: z.string().optional(), // ISO date when AI analysis was run
  adopted_at: z.string().optional(), // ISO date when analysis was adopted
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
  // Section-level approvals for Notion-like workflow
  section_approvals: sectionApprovalsSchema.default({
    brand_identity: { status: "pending" },
    category_definition: { status: "pending" },
    competitive_set: { status: "pending" },
    demand_definition: { status: "pending" },
    strategic_intent: { status: "pending" },
    channel_context: { status: "pending" },
    negative_scope: { status: "pending" },
  }),
});

// Full Configuration Schema - name is optional (auto-generated from domain if empty)
export const configurationSchema = z.object({
  id: z.string(),
  name: z.string().default(""), // Auto-generated from domain if not provided
  brand: brandSchema,
  category_definition: categoryDefinitionSchema,
  competitors: competitorsSchema,
  demand_definition: demandDefinitionSchema,
  strategic_intent: strategicIntentSchema,
  channel_context: channelContextSchema,
  negative_scope: negativeScopeSchema,
  governance: governanceSchema,
  // v3.1: Configurable capability model and scoring
  capability_model: capabilityModelSchema.optional(),
  scoring_config: scoringConfigSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Insert schema (without auto-generated fields)
export const insertConfigurationSchema = configurationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Brand Entity Schema (for brands table - global brand that owns contexts)
export const brandEntitySchema = z.object({
  id: z.number(),
  userId: z.string(),
  domain: z.string().min(1, "Domain is required"),
  name: z.string().default(""),
  industry: z.string().default(""),
  business_model: z.string().default("B2B"),
  primary_geography: z.array(z.string()).default([]),
  revenue_band: z.string().default(""),
  target_market: z.string().default(""),
  created_at: z.date(),
  updated_at: z.date(),
});

// Insert schema for brands (without auto-generated fields)
export const insertBrandEntitySchema = brandEntitySchema.omit({
  id: true,
  userId: true,
  created_at: true,
  updated_at: true,
});

// Types
export type BrandEntity = z.infer<typeof brandEntitySchema>;
export type InsertBrandEntity = z.infer<typeof insertBrandEntitySchema>;
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
export type CapabilityPattern = z.infer<typeof capabilityPatternSchema>;
export type CapabilityModel = z.infer<typeof capabilityModelSchema>;
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;
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

// Default configuration for new configurations - minimal required fields
export const defaultConfiguration: InsertConfiguration = {
  name: "", // Auto-generated from domain
  brand: {
    name: "",
    domain: "", // REQUIRED
    industry: "",
    business_model: "B2B",
    primary_geography: [],
    revenue_band: "",
    target_market: "",
  },
  category_definition: {
    primary_category: "", // REQUIRED
    included: [], // AI will populate based on category
    excluded: [], // AI will populate based on category
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
    context_status: "DRAFT_AI" as const,
    context_status_updated_at: new Date().toISOString(),
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
    section_approvals: {
      brand_identity: { status: "pending" as const },
      category_definition: { status: "pending" as const },
      competitive_set: { status: "pending" as const },
      demand_definition: { status: "pending" as const },
      strategic_intent: { status: "pending" as const },
      channel_context: { status: "pending" as const },
      negative_scope: { status: "pending" as const },
    },
  },
};
