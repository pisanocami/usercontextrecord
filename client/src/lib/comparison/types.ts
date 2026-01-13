/**
 * Context Comparison Tool - Type Definitions
 * 
 * Types for comparing multiple User Context Records side-by-side.
 */

import type { Configuration } from "../../../../shared/schema";

// Section keys that can be compared
export type SectionKey =
  | "brand"
  | "category_definition"
  | "competitors"
  | "demand_definition"
  | "strategic_intent"
  | "channel_context"
  | "negative_scope"
  | "governance";

// Match types for field comparison
export type MatchType = "full" | "partial" | "none" | "unique";

// Insight types
export type InsightType = "warning" | "success" | "info" | "opportunity";

// Insight priority
export type InsightPriority = "high" | "medium" | "low";

// Comparison settings
export interface ComparisonSettings {
  mode: "full" | "section" | "diff-only";
  sections: SectionKey[];
  highlightMode: "all" | "differences" | "matches";
  showInsights: boolean;
}

// Comparison session (for future persistence)
export interface ComparisonSession {
  id: string;
  contextIds: number[];
  createdAt: string;
  userId: string;
  settings: ComparisonSettings;
}

// Individual field comparison result
export interface FieldComparison {
  fieldName: string;
  fieldKey: string;
  values: ContextValue[];
  matchType: MatchType;
  isArray: boolean;
  isNested: boolean;
}

// Value from a specific context
export interface ContextValue {
  contextId: number;
  contextName: string;
  value: unknown;
  displayValue: string;
}

// Section comparison result
export interface SectionComparison {
  sectionKey: SectionKey;
  sectionTitle: string;
  fields: FieldComparison[];
  overallMatch: number; // 0-100 percentage
  matchingFieldsCount: number;
  totalFieldsCount: number;
}

// Comparison insight
export interface ComparisonInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  affectedContextIds: number[];
  affectedContextNames: string[];
  section: SectionKey | "global";
  priority: InsightPriority;
  actionable: boolean;
  suggestion?: string;
}

// Overlap metrics between contexts
export interface OverlapMetrics {
  competitorOverlap: number; // 0-100
  keywordOverlap: number; // 0-100
  categoryOverlap: number; // 0-100
  geographyOverlap: number; // 0-100
  overallSimilarity: number; // 0-100
  sharedCompetitors: string[];
  sharedKeywords: string[];
  sharedCategories: string[];
  sharedGeographies: string[];
}

// Competitor presence in overlap matrix
export interface CompetitorPresence {
  competitor: string;
  presentIn: number[]; // context IDs where this competitor appears
  tier: string;
}

// Full comparison result
export interface ComparisonResult {
  contexts: Configuration[];
  sections: Record<SectionKey, SectionComparison>;
  insights: ComparisonInsight[];
  overlapMetrics: OverlapMetrics;
  competitorMatrix: CompetitorPresence[];
  comparedAt: string;
}

// Section definition for UI rendering
export interface SectionDefinition {
  key: SectionKey;
  title: string;
  icon: string;
  fields: FieldDefinition[];
}

// Field definition
export interface FieldDefinition {
  key: string;
  label: string;
  isArray?: boolean;
  isNested?: boolean;
}

// Default comparison settings
export const DEFAULT_COMPARISON_SETTINGS: ComparisonSettings = {
  mode: "full",
  sections: [
    "brand",
    "category_definition",
    "competitors",
    "demand_definition",
    "strategic_intent",
    "channel_context",
    "negative_scope",
    "governance",
  ],
  highlightMode: "all",
  showInsights: true,
};

// Section definitions with fields to compare
export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "brand",
    title: "Brand Context",
    icon: "Building2",
    fields: [
      { key: "name", label: "Name" },
      { key: "domain", label: "Domain" },
      { key: "industry", label: "Industry" },
      { key: "business_model", label: "Business Model" },
      { key: "target_market", label: "Target Market" },
      { key: "primary_geography", label: "Primary Geography", isArray: true },
      { key: "revenue_band", label: "Revenue Band" },
    ],
  },
  {
    key: "category_definition",
    title: "Category Definition",
    icon: "Layers",
    fields: [
      { key: "primary_category", label: "Primary Category" },
      { key: "approved_categories", label: "Approved Categories", isArray: true },
      { key: "included", label: "Included", isArray: true },
      { key: "excluded", label: "Excluded", isArray: true },
      { key: "semantic_extensions", label: "Semantic Extensions", isArray: true },
    ],
  },
  {
    key: "competitors",
    title: "Competitive Set",
    icon: "Users",
    fields: [
      { key: "direct", label: "Direct Competitors", isArray: true },
      { key: "indirect", label: "Indirect Competitors", isArray: true },
      { key: "marketplaces", label: "Marketplaces", isArray: true },
      { key: "approved_count", label: "Approved Count" },
      { key: "rejected_count", label: "Rejected Count" },
    ],
  },
  {
    key: "demand_definition",
    title: "Demand Definition",
    icon: "Search",
    fields: [
      { key: "brand_keywords.seed_terms", label: "Brand Seed Terms", isNested: true, isArray: true },
      { key: "brand_keywords.top_n", label: "Top N Brand", isNested: true },
      { key: "non_brand_keywords.category_terms", label: "Category Terms", isNested: true, isArray: true },
      { key: "non_brand_keywords.problem_terms", label: "Problem Terms", isNested: true, isArray: true },
      { key: "non_brand_keywords.top_n", label: "Top N Non-Brand", isNested: true },
    ],
  },
  {
    key: "strategic_intent",
    title: "Strategic Intent",
    icon: "Target",
    fields: [
      { key: "growth_priority", label: "Growth Priority" },
      { key: "risk_tolerance", label: "Risk Tolerance" },
      { key: "primary_goal", label: "Primary Goal" },
      { key: "secondary_goals", label: "Secondary Goals", isArray: true },
      { key: "avoid", label: "Avoid", isArray: true },
      { key: "goal_type", label: "Goal Type" },
      { key: "time_horizon", label: "Time Horizon" },
    ],
  },
  {
    key: "channel_context",
    title: "Channel Context",
    icon: "Megaphone",
    fields: [
      { key: "paid_media_active", label: "Paid Media Active" },
      { key: "seo_investment_level", label: "SEO Investment Level" },
      { key: "marketplace_dependence", label: "Marketplace Dependence" },
    ],
  },
  {
    key: "negative_scope",
    title: "Negative Scope",
    icon: "ShieldX",
    fields: [
      { key: "excluded_categories", label: "Excluded Categories", isArray: true },
      { key: "excluded_keywords", label: "Excluded Keywords", isArray: true },
      { key: "excluded_use_cases", label: "Excluded Use Cases", isArray: true },
      { key: "excluded_competitors", label: "Excluded Competitors", isArray: true },
    ],
  },
  {
    key: "governance",
    title: "Governance",
    icon: "FileCheck",
    fields: [
      { key: "cmo_safe", label: "CMO Safe" },
      { key: "validation_status", label: "Validation Status" },
      { key: "human_verified", label: "Human Verified" },
      { key: "context_version", label: "Context Version" },
      { key: "context_confidence.level", label: "Confidence Level", isNested: true },
      { key: "last_reviewed", label: "Last Reviewed" },
      { key: "reviewed_by", label: "Reviewed By" },
    ],
  },
];
