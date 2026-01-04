import { z } from "zod";
import type { 
  Brand, 
  CategoryDefinition, 
  Competitors, 
  DemandDefinition, 
  StrategicIntent, 
  ChannelContext, 
  NegativeScope, 
  Governance 
} from "./schema";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export interface SectionValidation extends ValidationResult {
  section: string;
  required_fields_missing: string[];
  recommendation?: string;
}

export interface FullValidationResult {
  overall_valid: boolean;
  overall_score: number;
  sections: Record<string, SectionValidation>;
  integrity_hash: string;
  can_advance_to: string[];
  blocked_reasons: string[];
}

function createHash(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(12, '0');
}

export function validateBrandContext(brand: Brand): SectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const required_fields_missing: string[] = [];
  
  if (!brand.domain || brand.domain.trim() === "") {
    errors.push("Domain is required");
    required_fields_missing.push("domain");
  } else if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(brand.domain.replace(/^(https?:\/\/)?(www\.)?/, ""))) {
    warnings.push("Domain format may be invalid");
  }
  
  if (!brand.name || brand.name.trim() === "") {
    warnings.push("Brand name is recommended");
  }
  
  if (!brand.target_market || brand.target_market.trim() === "") {
    warnings.push("Target market description helps improve AI suggestions");
  }
  
  if (!brand.primary_geography || brand.primary_geography.length === 0) {
    warnings.push("At least one primary geography is recommended");
  }
  
  const score = Math.max(0, 100 - (errors.length * 30) - (warnings.length * 10) - (required_fields_missing.length * 20));
  
  return {
    section: "brand_identity",
    valid: errors.length === 0,
    errors,
    warnings,
    required_fields_missing,
    score,
    recommendation: errors.length > 0 
      ? "Complete required fields before proceeding"
      : warnings.length > 0 
        ? "Consider adding more details for better AI suggestions"
        : undefined
  };
}

export function validateCategoryDefinition(category: CategoryDefinition): SectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const required_fields_missing: string[] = [];
  
  if (!category.primary_category || category.primary_category.trim() === "") {
    errors.push("Primary category is required");
    required_fields_missing.push("primary_category");
  }
  
  if ((!category.included || category.included.length === 0) && 
      (!category.approved_categories || category.approved_categories.length === 0)) {
    warnings.push("No included categories defined - AI may suggest broader topics");
  }
  
  if (category.excluded && category.included) {
    const overlap = category.excluded.filter(e => category.included?.includes(e));
    if (overlap.length > 0) {
      errors.push(`Categories cannot be both included and excluded: ${overlap.join(", ")}`);
    }
  }
  
  const score = Math.max(0, 100 - (errors.length * 30) - (warnings.length * 10));
  
  return {
    section: "category_definition",
    valid: errors.length === 0,
    errors,
    warnings,
    required_fields_missing,
    score
  };
}

export function validateCompetitiveSet(competitors: Competitors): SectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const required_fields_missing: string[] = [];
  
  const allCompetitors = [
    ...(competitors.direct || []),
    ...(competitors.indirect || []),
    ...(competitors.competitors || [])
  ];
  
  if (allCompetitors.length === 0) {
    warnings.push("No competitors defined - consider adding at least 2-3 competitors");
  } else if (allCompetitors.length < 2) {
    warnings.push("Having only 1 competitor limits competitive analysis accuracy");
  }
  
  if (competitors.competitors && competitors.competitors.length > 0) {
    const withoutEvidence = competitors.competitors.filter(c => !c.evidence?.why_selected);
    if (withoutEvidence.length > 0) {
      warnings.push(`${withoutEvidence.length} competitor(s) missing 'why selected' reasoning`);
    }
    
    const pendingReview = competitors.competitors.filter(c => c.status === "pending_review");
    if (pendingReview.length > 0) {
      warnings.push(`${pendingReview.length} competitor(s) pending review`);
    }
  }
  
  const score = Math.max(0, 100 - (errors.length * 30) - (warnings.length * 10));
  
  return {
    section: "competitive_set",
    valid: errors.length === 0,
    errors,
    warnings,
    required_fields_missing,
    score
  };
}

export function validateDemandDefinition(demand: DemandDefinition): SectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const required_fields_missing: string[] = [];
  
  const brandSeeds = demand.brand_keywords?.seed_terms || [];
  const problemTerms = demand.non_brand_keywords?.problem_terms || [];
  const categoryTerms = demand.non_brand_keywords?.category_terms || [];
  
  if (brandSeeds.length === 0) {
    warnings.push("No brand seed terms defined");
  }
  
  if (problemTerms.length === 0 && categoryTerms.length === 0) {
    warnings.push("No problem or category terms defined - consider adding for better keyword analysis");
  }
  
  const score = Math.max(0, 100 - (errors.length * 30) - (warnings.length * 10));
  
  return {
    section: "demand_definition",
    valid: errors.length === 0,
    errors,
    warnings,
    required_fields_missing,
    score
  };
}

export function validateStrategicIntent(strategic: StrategicIntent): SectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const required_fields_missing: string[] = [];
  
  if (!strategic.primary_goal || strategic.primary_goal.trim() === "") {
    warnings.push("Primary goal helps focus AI recommendations");
  }
  
  if (!strategic.goal_type) {
    warnings.push("Goal type (growth/roi/awareness) not specified");
  }
  
  if (!strategic.risk_tolerance) {
    warnings.push("Risk tolerance not specified - defaults to medium");
  }
  
  const score = Math.max(0, 100 - (errors.length * 30) - (warnings.length * 10));
  
  return {
    section: "strategic_intent",
    valid: errors.length === 0,
    errors,
    warnings,
    required_fields_missing,
    score
  };
}

export function validateChannelContext(channel: ChannelContext): SectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const required_fields_missing: string[] = [];
  
  if (!channel.seo_investment_level) {
    warnings.push("SEO investment level not specified");
  }
  
  if (channel.paid_media_active === undefined) {
    warnings.push("Paid media status not specified");
  }
  
  const score = Math.max(0, 100 - (errors.length * 30) - (warnings.length * 10));
  
  return {
    section: "channel_context",
    valid: errors.length === 0,
    errors,
    warnings,
    required_fields_missing,
    score
  };
}

export function validateNegativeScope(negative: NegativeScope): SectionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const required_fields_missing: string[] = [];
  
  const totalExclusions = 
    (negative.excluded_categories?.length || 0) +
    (negative.excluded_keywords?.length || 0) +
    (negative.excluded_use_cases?.length || 0) +
    (negative.excluded_competitors?.length || 0);
  
  if (totalExclusions === 0) {
    warnings.push("No exclusions defined - all topics will be considered in scope");
  }
  
  if (!negative.enforcement_rules?.hard_exclusion) {
    warnings.push("Hard exclusion not enabled - excluded items may still appear in suggestions");
  }
  
  const score = Math.max(0, 100 - (errors.length * 30) - (warnings.length * 10));
  
  return {
    section: "negative_scope",
    valid: errors.length === 0,
    errors,
    warnings,
    required_fields_missing,
    score
  };
}

export interface ConfigurationData {
  brand: Brand;
  category_definition: CategoryDefinition;
  competitors: Competitors;
  demand_definition: DemandDefinition;
  strategic_intent: StrategicIntent;
  channel_context: ChannelContext;
  negative_scope: NegativeScope;
  governance: Governance;
}

export function validateConfiguration(config: ConfigurationData): FullValidationResult {
  const sections: Record<string, SectionValidation> = {
    brand_identity: validateBrandContext(config.brand),
    category_definition: validateCategoryDefinition(config.category_definition),
    competitive_set: validateCompetitiveSet(config.competitors),
    demand_definition: validateDemandDefinition(config.demand_definition),
    strategic_intent: validateStrategicIntent(config.strategic_intent),
    channel_context: validateChannelContext(config.channel_context),
    negative_scope: validateNegativeScope(config.negative_scope),
  };
  
  const sectionScores = Object.values(sections).map(s => s.score);
  const overall_score = Math.round(sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length);
  const overall_valid = Object.values(sections).every(s => s.valid);
  
  const integrity_hash = createHash({
    brand: config.brand,
    category_definition: config.category_definition,
    competitors: config.competitors,
    demand_definition: config.demand_definition,
    strategic_intent: config.strategic_intent,
    channel_context: config.channel_context,
    negative_scope: config.negative_scope,
  });
  
  const sectionApprovals = config.governance?.section_approvals || {};
  const allApproved = Object.keys(sections).every(
    key => sectionApprovals[key as keyof typeof sectionApprovals]?.status === "approved"
  );
  const anyRejected = Object.keys(sections).some(
    key => sectionApprovals[key as keyof typeof sectionApprovals]?.status === "rejected"
  );
  
  const currentStatus = config.governance?.context_status || "DRAFT_AI";
  const can_advance_to: string[] = [];
  const blocked_reasons: string[] = [];
  
  if (currentStatus === "DRAFT_AI") {
    if (overall_valid && !anyRejected) {
      can_advance_to.push("AI_READY");
    } else {
      blocked_reasons.push("All sections must pass validation to advance");
    }
  }
  
  if (currentStatus === "AI_READY") {
    can_advance_to.push("AI_ANALYSIS_RUN");
  }
  
  if (currentStatus === "AI_ANALYSIS_RUN") {
    if (allApproved) {
      can_advance_to.push("HUMAN_CONFIRMED");
    } else {
      blocked_reasons.push("All sections must be approved before confirming");
    }
  }
  
  if (currentStatus === "HUMAN_CONFIRMED") {
    can_advance_to.push("LOCKED");
  }
  
  return {
    overall_valid,
    overall_score,
    sections,
    integrity_hash,
    can_advance_to,
    blocked_reasons,
  };
}

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT_AI: ["AI_READY"],
  AI_READY: ["AI_ANALYSIS_RUN", "DRAFT_AI"],
  AI_ANALYSIS_RUN: ["HUMAN_CONFIRMED", "AI_READY"],
  HUMAN_CONFIRMED: ["LOCKED", "AI_ANALYSIS_RUN"],
  LOCKED: [],
};

export function canTransition(from: string, to: string): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) || false;
}

export function getBlockedReasonForTransition(
  from: string, 
  to: string, 
  validationResult: FullValidationResult
): string | null {
  if (!canTransition(from, to)) {
    return `Cannot transition from ${from} to ${to}`;
  }
  
  if (from === "DRAFT_AI" && to === "AI_READY") {
    if (!validationResult.overall_valid) {
      return "All sections must pass validation before advancing";
    }
  }
  
  if (from === "AI_ANALYSIS_RUN" && to === "HUMAN_CONFIRMED") {
    const approvedSections = Object.values(validationResult.sections).filter(
      (s, i) => {
        const key = Object.keys(validationResult.sections)[i];
        return s.valid;
      }
    );
    if (approvedSections.length < Object.keys(validationResult.sections).length) {
      return "All sections must be approved before confirming";
    }
  }
  
  return null;
}
