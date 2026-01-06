/**
 * FON Execution Gateway
 * 
 * Validates UCR completeness before module execution.
 * Injects only required sections into module context.
 * Ensures auditability and reproducibility.
 */

import { 
  UCR_SECTION_NAMES,
  getModuleDefinition,
  canModuleExecute,
  type UCRSection
} from '@shared/module.contract';
import type { Configuration } from '@shared/schema';

export type { UCRSection };

export interface UCRValidationResult {
  isValid: boolean;
  moduleId: string;
  moduleName: string;
  availableSections: UCRSection[];
  missingSections: UCRSection[];
  missingDetails: Array<{ section: UCRSection; name: string; role: string }>;
  warnings: string[];
  ucrVersion: string;
}

export interface ModuleExecutionContext {
  moduleId: string;
  ucrVersion: string;
  sectionsUsed: UCRSection[];
  rulesTriggered: string[];
  startedAt: Date;
}

export interface ModuleOutputWrapper<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  context: {
    ucr_version: string;
    sections_used: UCRSection[];
    rules_triggered: string[];
    executed_at: string;
    module_id: string;
  };
}

/**
 * Maps configuration fields to UCR sections
 */
function getAvailableSections(config: Configuration): UCRSection[] {
  const sections: UCRSection[] = [];
  
  // A - Brand Context (domain is required minimum)
  if (config.brand?.domain) {
    sections.push('A');
  }
  
  // B - Category Definition
  if (config.category_definition?.primary_category) {
    sections.push('B');
  }
  
  // C - Competitive Set
  const competitors = config.competitors?.competitors;
  if (competitors && Array.isArray(competitors) && competitors.length > 0) {
    sections.push('C');
  }
  
  // D - Demand Definition (has brand_keywords or non_brand_keywords defined)
  const demand = config.demand_definition;
  if (
    (demand?.brand_keywords?.seed_terms && demand.brand_keywords.seed_terms.length > 0) ||
    (demand?.non_brand_keywords?.category_terms && demand.non_brand_keywords.category_terms.length > 0)
  ) {
    sections.push('D');
  }
  
  // E - Strategic Intent (has growth_priority, risk_tolerance, or primary_goal)
  const strategic = config.strategic_intent;
  if (strategic?.growth_priority || strategic?.risk_tolerance || strategic?.primary_goal) {
    sections.push('E');
  }
  
  // F - Channel Context (has paid_media_active, seo_investment_level, or marketplace_dependence)
  const channels = config.channel_context;
  if (channels?.seo_investment_level || channels?.marketplace_dependence || channels?.paid_media_active !== undefined) {
    sections.push('F');
  }
  
  // G - Negative Scope
  const negative = config.negative_scope;
  if (
    (negative?.excluded_categories && negative.excluded_categories.length > 0) ||
    (negative?.excluded_keywords && negative.excluded_keywords.length > 0) ||
    (negative?.excluded_use_cases && negative.excluded_use_cases.length > 0)
  ) {
    sections.push('G');
  }
  
  // H - Governance (check governance fields + top-level scoring_config/capability_model)
  const governance = config.governance;
  const hasGovernanceConfig = 
    governance?.context_confidence ||
    governance?.cmo_safe !== undefined ||
    config.scoring_config ||
    config.capability_model;
  if (hasGovernanceConfig) {
    sections.push('H');
  }
  
  return sections;
}

/**
 * Generates a UCR version string from configuration
 */
function generateUCRVersion(config: Configuration): string {
  const timestamp = config.updated_at 
    ? new Date(config.updated_at).getTime() 
    : Date.now();
  return `v${config.id}-${timestamp.toString(36)}`;
}

/**
 * Validates if a module can execute with the given configuration
 */
export function validateModuleExecution(
  moduleId: string,
  config: Configuration
): UCRValidationResult {
  const module = getModuleDefinition(moduleId);
  
  if (!module) {
    return {
      isValid: false,
      moduleId,
      moduleName: 'Unknown',
      availableSections: [],
      missingSections: [],
      missingDetails: [],
      warnings: [`Module "${moduleId}" not found in registry`],
      ucrVersion: ''
    };
  }
  
  const availableSections = getAvailableSections(config);
  const { canExecute, missingSections, warnings } = canModuleExecute(moduleId, availableSections);
  
  const missingDetails = missingSections.map(section => ({
    section,
    name: UCR_SECTION_NAMES[section],
    role: getSectionRole(section)
  }));
  
  return {
    isValid: canExecute,
    moduleId,
    moduleName: module.name,
    availableSections,
    missingSections,
    missingDetails,
    warnings,
    ucrVersion: generateUCRVersion(config)
  };
}

function getSectionRole(section: UCRSection): string {
  const roles: Record<UCRSection, string> = {
    'A': 'Define your brand domain and market (geo, language)',
    'B': 'Set your category fence to filter relevant keywords',
    'C': 'Add competitors for gap comparison',
    'D': 'Group keywords into demand themes',
    'E': 'Set strategic posture (aggressive vs conservative)',
    'F': 'Configure channel weights (SEO vs Paid)',
    'G': 'Define exclusions (categories, keywords, use cases)',
    'H': 'Configure scoring thresholds and capability model'
  };
  return roles[section];
}

/**
 * Creates an execution context for a module run
 */
export function createExecutionContext(
  moduleId: string,
  config: Configuration,
  sectionsUsed: UCRSection[]
): ModuleExecutionContext {
  return {
    moduleId,
    ucrVersion: generateUCRVersion(config),
    sectionsUsed,
    rulesTriggered: [],
    startedAt: new Date()
  };
}

/**
 * Wraps module output with UCR traceability
 */
export function wrapModuleOutput<T>(
  data: T | null,
  context: ModuleExecutionContext,
  error: string | null = null
): ModuleOutputWrapper<T> {
  return {
    success: error === null && data !== null,
    data,
    error,
    context: {
      ucr_version: context.ucrVersion,
      sections_used: context.sectionsUsed,
      rules_triggered: context.rulesTriggered,
      executed_at: new Date().toISOString(),
      module_id: context.moduleId
    }
  };
}

/**
 * Adds a triggered rule to the execution context
 */
export function addTriggeredRule(
  context: ModuleExecutionContext,
  rule: string
): void {
  if (!context.rulesTriggered.includes(rule)) {
    context.rulesTriggered.push(rule);
  }
}

/**
 * Common rule identifiers for tracking
 */
export const RULES = {
  NEGATIVE_SCOPE_MATCH: 'negative_scope.match',
  OUTSIDE_CATEGORY_FENCE: 'outside_category_fence',
  COMPETITOR_BRAND_DETECTED: 'competitor_brand.detected',
  SIZE_VARIANT_DETECTED: 'size_variant.detected',
  LOW_CAPABILITY_SCORE: 'low_capability.score',
  GOVERNANCE_THRESHOLD: 'governance.threshold_applied',
  STRATEGIC_AGGRESSIVE: 'strategic.aggressive_posture',
  STRATEGIC_CONSERVATIVE: 'strategic.conservative_posture',
  CHANNEL_SEO_WEIGHTED: 'channel.seo_weighted',
  IRRELEVANT_ENTITY: 'irrelevant_entity.detected'
} as const;
