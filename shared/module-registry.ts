/**
 * FON Module Registry
 * 
 * Defines the formal contract between modules and UCR sections.
 * Each module declares which UCR sections it requires and optionally uses.
 * 
 * UCR Sections:
 * A - Brand Context
 * B - Category Definition  
 * C - Competitive Set
 * D - Demand Definition
 * E - Strategic Intent
 * F - Channel Context
 * G - Negative Scope
 * H - Governance
 */

export type UCRSection = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  question: string;
  requiredSections: UCRSection[];
  optionalSections: UCRSection[];
  outputType: 'keywords' | 'signal' | 'share' | 'levers' | 'capture' | 'pricing';
  status: 'active' | 'planned' | 'deprecated';
}

export const UCR_SECTION_NAMES: Record<UCRSection, string> = {
  'A': 'Brand Context',
  'B': 'Category Definition',
  'C': 'Competitive Set',
  'D': 'Demand Definition',
  'E': 'Strategic Intent',
  'F': 'Channel Context',
  'G': 'Negative Scope',
  'H': 'Governance'
};

export const UCR_SECTION_ROLES: Record<UCRSection, string> = {
  'A': 'Defines brand entity, domain, geo, language',
  'B': 'Defines category fence and valid queries',
  'C': 'Defines competitor domains for comparison',
  'D': 'Groups queries into demand themes',
  'E': 'Sets strategic posture (aggressive vs conservative)',
  'F': 'Weights channels (SEO vs Paid vs Retail)',
  'G': 'Hard exclusions (categories, keywords, use cases)',
  'H': 'Scoring thresholds and capability model'
};

/**
 * Module 01: Category Demand Signal
 * Question: "Is this category worth investing in and when?"
 */
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

/**
 * Module 02: Brand Attention & Share of Search
 * Question: "What part of the market's mind is ours?"
 */
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

/**
 * Module 03: SEO Visibility & Gap Mapping (Keyword Gap Lite)
 * Question: "Where are we missing organic opportunity?"
 * This is the most UCR-dependent module.
 */
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

/**
 * Module 04: Retail Availability & Pricing Intelligence
 * Question: "Where are we losing shelf and margin?"
 */
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

/**
 * Module 05: Demand Capture & Efficiency
 * Question: "Are we capturing demand or just defending?"
 */
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

/**
 * Module 06: Strategic Levers & AI-Augmented Moves
 * This module has no data of its own - it orchestrates.
 * Question: "What should we do next?"
 */
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

/**
 * Complete module registry
 */
export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  'category_demand_signal': CATEGORY_DEMAND_SIGNAL,
  'brand_attention': BRAND_ATTENTION,
  'seo_visibility_gap': SEO_VISIBILITY_GAP,
  'retail_pricing': RETAIL_PRICING,
  'demand_capture': DEMAND_CAPTURE,
  'strategic_levers': STRATEGIC_LEVERS
};

/**
 * Get module by ID
 */
export function getModuleDefinition(moduleId: string): ModuleDefinition | undefined {
  return MODULE_REGISTRY[moduleId];
}

/**
 * Get all active modules
 */
export function getActiveModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter(m => m.status === 'active');
}

/**
 * Get all modules (including planned)
 */
export function getAllModules(): ModuleDefinition[] {
  return Object.values(MODULE_REGISTRY);
}

/**
 * Check if a module can execute given available UCR sections
 */
export function canModuleExecute(
  moduleId: string, 
  availableSections: UCRSection[]
): { canExecute: boolean; missingSections: UCRSection[]; warnings: string[] } {
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
