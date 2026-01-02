import { z } from "zod";
import { pgTable, serial, text, jsonb, timestamp, varchar, integer, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Re-export auth and chat models
export * from "./models/auth";
export * from "./models/chat";

// Configurations table for persistent storage
export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  brand: jsonb("brand").notNull(),
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

// Brand Context Schema - validation is optional to allow partial saves
export const brandSchema = z.object({
  name: z.string().default(""),
  domain: z.string().default(""),
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

// Category Definition Schema - allows partial saves
export const categoryDefinitionSchema = z.object({
  primary_category: z.string().default(""),
  included: z.array(z.string()).default([]),
  excluded: z.array(z.string()).default([]),
  approved_categories: z.array(z.string()).default([]), // Human-approved categories
  alternative_categories: z.array(categoryAlternativeSchema).default([]), // AI-suggested with evidence
});

// Competitive Set Schema
export const competitorsSchema = z.object({
  direct: z.array(z.string()),
  indirect: z.array(z.string()),
  marketplaces: z.array(z.string()),
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

// Strategic Intent Schema - allows partial saves
export const strategicIntentSchema = z.object({
  growth_priority: z.string().default(""),
  risk_tolerance: z.enum(["low", "medium", "high"]),
  primary_goal: z.string().default(""),
  secondary_goals: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
});

// Channel Context Schema
export const channelContextSchema = z.object({
  paid_media_active: z.boolean(),
  seo_investment_level: z.enum(["low", "medium", "high"]),
  marketplace_dependence: z.enum(["low", "medium", "high"]),
});

// Negative Scope Schema
export const negativeScopeSchema = z.object({
  excluded_categories: z.array(z.string()),
  excluded_keywords: z.array(z.string()),
  excluded_use_cases: z.array(z.string()),
  excluded_competitors: z.array(z.string()),
  enforcement_rules: z.object({
    hard_exclusion: z.boolean(),
    allow_model_suggestion: z.boolean(),
    require_human_override_for_expansion: z.boolean(),
  }),
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
});

// Full Configuration Schema
export const configurationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Configuration name is required"),
  brand: brandSchema,
  category_definition: categoryDefinitionSchema,
  competitors: competitorsSchema,
  demand_definition: demandDefinitionSchema,
  strategic_intent: strategicIntentSchema,
  channel_context: channelContextSchema,
  negative_scope: negativeScopeSchema,
  governance: governanceSchema,
  created_at: z.string(),
  updated_at: z.string(),
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
export type Competitors = z.infer<typeof competitorsSchema>;
export type DemandDefinition = z.infer<typeof demandDefinitionSchema>;
export type StrategicIntent = z.infer<typeof strategicIntentSchema>;
export type ChannelContext = z.infer<typeof channelContextSchema>;
export type NegativeScope = z.infer<typeof negativeScopeSchema>;
export type Governance = z.infer<typeof governanceSchema>;
export type Configuration = z.infer<typeof configurationSchema>;
export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;

// Category Alternative type export
export type CategoryAlternative = z.infer<typeof categoryAlternativeSchema>;

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
    enforcement_rules: {
      hard_exclusion: true,
      allow_model_suggestion: false,
      require_human_override_for_expansion: true,
    },
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
  },
};
