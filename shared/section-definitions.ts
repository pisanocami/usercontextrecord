import type { LucideIcon } from "lucide-react";

export interface SectionField {
  label: string;
  key: string;
  isArray?: boolean;
  isNested?: boolean;
}

export interface SectionDefinition {
  key: string;
  title: string;
  titleEs: string;
  iconName: string;
  fields: SectionField[];
}

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
  brand: {
    key: "brand",
    title: "Brand Context",
    titleEs: "Contexto de Marca",
    iconName: "Building2",
    fields: [
      { label: "Name", key: "name" },
      { label: "Domain", key: "domain" },
      { label: "Industry", key: "industry" },
      { label: "Business Model", key: "business_model" },
      { label: "Target Market", key: "target_market" },
      { label: "Primary Geography", key: "primary_geography", isArray: true },
      { label: "Revenue Band", key: "revenue_band" },
    ],
  },
  category_definition: {
    key: "category_definition",
    title: "Category Definition",
    titleEs: "Definición de Categoría",
    iconName: "Layers",
    fields: [
      { label: "Primary Category", key: "primary_category" },
      { label: "Approved Categories", key: "approved_categories", isArray: true },
      { label: "Included", key: "included", isArray: true },
      { label: "Excluded", key: "excluded", isArray: true },
    ],
  },
  competitors: {
    key: "competitors",
    title: "Competitive Set",
    titleEs: "Set Competitivo",
    iconName: "Users",
    fields: [
      { label: "Direct Competitors", key: "direct", isArray: true },
      { label: "Indirect Competitors", key: "indirect", isArray: true },
      { label: "Marketplaces", key: "marketplaces", isArray: true },
    ],
  },
  demand_definition: {
    key: "demand_definition",
    title: "Demand Definition",
    titleEs: "Definición de Demanda",
    iconName: "Search",
    fields: [
      { label: "Brand Seed Terms", key: "brand_keywords.seed_terms", isNested: true, isArray: true },
      { label: "Top N Brand", key: "brand_keywords.top_n", isNested: true },
      { label: "Category Terms", key: "non_brand_keywords.category_terms", isNested: true, isArray: true },
      { label: "Problem Terms", key: "non_brand_keywords.problem_terms", isNested: true, isArray: true },
      { label: "Top N Non-Brand", key: "non_brand_keywords.top_n", isNested: true },
    ],
  },
  strategic_intent: {
    key: "strategic_intent",
    title: "Strategic Intent",
    titleEs: "Intención Estratégica",
    iconName: "Target",
    fields: [
      { label: "Growth Priority", key: "growth_priority" },
      { label: "Risk Tolerance", key: "risk_tolerance" },
      { label: "Primary Goal", key: "primary_goal" },
      { label: "Secondary Goals", key: "secondary_goals", isArray: true },
      { label: "Avoid", key: "avoid", isArray: true },
    ],
  },
  channel_context: {
    key: "channel_context",
    title: "Channel Context",
    titleEs: "Contexto de Canal",
    iconName: "Megaphone",
    fields: [
      { label: "Paid Media Active", key: "paid_media_active" },
      { label: "SEO Investment Level", key: "seo_investment_level" },
      { label: "Marketplace Dependence", key: "marketplace_dependence" },
    ],
  },
  negative_scope: {
    key: "negative_scope",
    title: "Negative Scope",
    titleEs: "Alcance Negativo",
    iconName: "ShieldX",
    fields: [
      { label: "Excluded Categories", key: "excluded_categories", isArray: true },
      { label: "Excluded Keywords", key: "excluded_keywords", isArray: true },
      { label: "Excluded Use Cases", key: "excluded_use_cases", isArray: true },
      { label: "Excluded Competitors", key: "excluded_competitors", isArray: true },
    ],
  },
  governance: {
    key: "governance",
    title: "Governance",
    titleEs: "Gobernanza",
    iconName: "FileCheck",
    fields: [
      { label: "Model Suggested", key: "model_suggested" },
      { label: "Last Reviewed", key: "last_reviewed" },
      { label: "Reviewed By", key: "reviewed_by" },
      { label: "Valid Until", key: "context_valid_until" },
      { label: "CMO Safe", key: "cmo_safe" },
      { label: "Confidence Level", key: "context_confidence.level", isNested: true },
      { label: "Validation Status", key: "validation_status" },
      { label: "Human Verified", key: "human_verified" },
      { label: "Context Version", key: "context_version" },
    ],
  },
};

export const SECTION_KEYS = Object.keys(SECTION_DEFINITIONS);

export function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}
