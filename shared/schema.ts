import { z } from "zod";

// Brand Context Schema - validation is optional to allow partial saves
export const brandSchema = z.object({
  name: z.string().default(""),
  domain: z.string().default(""),
  industry: z.string().default(""),
  business_model: z.enum(["B2B", "DTC", "Marketplace", "Hybrid"]),
  primary_geography: z.array(z.string()).default([]),
  revenue_band: z.string().default(""),
});

// Category Definition Schema - allows partial saves
export const categoryDefinitionSchema = z.object({
  primary_category: z.string().default(""),
  included: z.array(z.string()).default([]),
  excluded: z.array(z.string()).default([]),
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
  },
  category_definition: {
    primary_category: "",
    included: [],
    excluded: [],
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
  },
};
