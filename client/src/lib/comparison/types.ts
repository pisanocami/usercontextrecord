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

// Field categories for smart filtering
export type FieldCategory = 
  | "always_unique"    // Brand name, domain - always different by design
  | "competitive"      // Competitors, keywords, geography - key for competitive analysis
  | "strategic"        // Goals, risk tolerance, channel strategy - strategic alignment
  | "metadata";        // Version, timestamps - not strategically relevant

// Comparison purpose - determines which fields are most relevant
export type ComparisonPurpose = 
  | "threat_analysis"      // Is this brand a threat to my market?
  | "expansion_research"   // Should I enter their market?
  | "benchmarking"         // What can I learn from their strategy?
  | "portfolio_analysis";  // How do my own brands relate?

// Comparison settings
export interface ComparisonSettings {
  mode: "full" | "section" | "diff-only";
  sections: SectionKey[];
  highlightMode: "all" | "differences" | "matches";
  showInsights: boolean;
  // New CMO-grade settings
  comparisonPurpose: ComparisonPurpose;
  showUniqueFields: boolean;
  fieldCategories: FieldCategory[];
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

// Insight strategic category
export type InsightCategory = "threat" | "opportunity" | "positioning" | "resource";

// Insight estimated impact
export type InsightImpact = "low" | "medium" | "high" | "critical";

// Strategic metric score with reasoning
export interface MetricScore {
  score: number;           // 0-100
  label: "Low" | "Medium" | "High" | "Critical";
  reasoning: string[];     // Bullet points explaining score
  keyFactors: string[];    // Main contributing factors
}

// Full strategic metrics result
export interface StrategicMetrics {
  competitiveIntensity: MetricScore;    // How much fighting for same customer
  strategicAlignment: MetricScore;       // How similar go-to-market approaches
  marketAdjacency: MetricScore;          // How close target markets are
  threatProbability: MetricScore;        // Likelihood of direct competition
}

// Comparison insight - CMO-grade with actionable items
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
  // CMO-grade additions
  category: InsightCategory;
  estimatedImpact: InsightImpact;
  actionItems: string[];
  forBrand?: string;  // Which brand this insight primarily applies to
  metric?: {
    value: number;
    label: string;
  };
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
  // CMO-grade strategic metrics
  strategicMetrics?: StrategicMetrics;
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
  category: FieldCategory;  // Field category for smart filtering
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
  // CMO-grade defaults
  comparisonPurpose: "threat_analysis",
  showUniqueFields: false,  // Hide unique fields by default
  fieldCategories: ["competitive", "strategic"],  // Show only strategic fields by default
};

// Section definitions with fields to compare (with CMO-grade categories)
export const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "brand",
    title: "Brand Context",
    icon: "Building2",
    fields: [
      { key: "name", label: "Name", category: "always_unique" },
      { key: "domain", label: "Domain", category: "always_unique" },
      { key: "industry", label: "Industry", category: "strategic" },
      { key: "business_model", label: "Business Model", category: "strategic" },
      { key: "target_market", label: "Target Market", category: "strategic" },
      { key: "primary_geography", label: "Primary Geography", isArray: true, category: "competitive" },
      { key: "revenue_band", label: "Revenue Band", category: "strategic" },
    ],
  },
  {
    key: "category_definition",
    title: "Category Definition",
    icon: "Layers",
    fields: [
      { key: "primary_category", label: "Primary Category", category: "competitive" },
      { key: "approved_categories", label: "Approved Categories", isArray: true, category: "competitive" },
      { key: "included", label: "Included", isArray: true, category: "competitive" },
      { key: "excluded", label: "Excluded", isArray: true, category: "competitive" },
      { key: "semantic_extensions", label: "Semantic Extensions", isArray: true, category: "competitive" },
    ],
  },
  {
    key: "competitors",
    title: "Competitive Set",
    icon: "Users",
    fields: [
      { key: "direct", label: "Direct Competitors", isArray: true, category: "competitive" },
      { key: "indirect", label: "Indirect Competitors", isArray: true, category: "competitive" },
      { key: "marketplaces", label: "Marketplaces", isArray: true, category: "competitive" },
      { key: "approved_count", label: "Approved Count", category: "metadata" },
      { key: "rejected_count", label: "Rejected Count", category: "metadata" },
    ],
  },
  {
    key: "demand_definition",
    title: "Demand Definition",
    icon: "Search",
    fields: [
      { key: "brand_keywords.seed_terms", label: "Brand Seed Terms", isNested: true, isArray: true, category: "always_unique" },
      { key: "brand_keywords.top_n", label: "Top N Brand", isNested: true, category: "strategic" },
      { key: "non_brand_keywords.category_terms", label: "Category Terms", isNested: true, isArray: true, category: "competitive" },
      { key: "non_brand_keywords.problem_terms", label: "Problem Terms", isNested: true, isArray: true, category: "competitive" },
      { key: "non_brand_keywords.top_n", label: "Top N Non-Brand", isNested: true, category: "strategic" },
    ],
  },
  {
    key: "strategic_intent",
    title: "Strategic Intent",
    icon: "Target",
    fields: [
      { key: "growth_priority", label: "Growth Priority", category: "strategic" },
      { key: "risk_tolerance", label: "Risk Tolerance", category: "strategic" },
      { key: "primary_goal", label: "Primary Goal", category: "strategic" },
      { key: "secondary_goals", label: "Secondary Goals", isArray: true, category: "strategic" },
      { key: "avoid", label: "Avoid", isArray: true, category: "strategic" },
      { key: "goal_type", label: "Goal Type", category: "strategic" },
      { key: "time_horizon", label: "Time Horizon", category: "strategic" },
    ],
  },
  {
    key: "channel_context",
    title: "Channel Context",
    icon: "Megaphone",
    fields: [
      { key: "paid_media_active", label: "Paid Media Active", category: "strategic" },
      { key: "seo_investment_level", label: "SEO Investment Level", category: "strategic" },
      { key: "marketplace_dependence", label: "Marketplace Dependence", category: "strategic" },
    ],
  },
  {
    key: "negative_scope",
    title: "Negative Scope",
    icon: "ShieldX",
    fields: [
      { key: "excluded_categories", label: "Excluded Categories", isArray: true, category: "competitive" },
      { key: "excluded_keywords", label: "Excluded Keywords", isArray: true, category: "competitive" },
      { key: "excluded_use_cases", label: "Excluded Use Cases", isArray: true, category: "competitive" },
      { key: "excluded_competitors", label: "Excluded Competitors", isArray: true, category: "competitive" },
    ],
  },
  {
    key: "governance",
    title: "Governance",
    icon: "FileCheck",
    fields: [
      { key: "cmo_safe", label: "CMO Safe", category: "strategic" },
      { key: "validation_status", label: "Validation Status", category: "metadata" },
      { key: "human_verified", label: "Human Verified", category: "metadata" },
      { key: "context_version", label: "Context Version", category: "metadata" },
      { key: "context_confidence.level", label: "Confidence Level", isNested: true, category: "strategic" },
      { key: "last_reviewed", label: "Last Reviewed", category: "metadata" },
      { key: "reviewed_by", label: "Reviewed By", category: "metadata" },
    ],
  },
];
