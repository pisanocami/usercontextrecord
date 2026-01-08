/**
 * Module Pre-Execution Validation Gate
 * Context-First Architecture: UCR must exist and meet minimum status before module execution
 */

import type { Configuration } from "@shared/schema";

export interface ValidationResult {
  valid: boolean;
  canProceed: boolean;
  contextStatus: string;
  contextVersion: number;
  errors: string[];
  warnings: string[];
  sectionsValidated: string[];
  sectionsMissing: string[];
}

export interface SectionValidation {
  section: string;
  required: boolean;
  valid: boolean;
  message?: string;
}

/**
 * Minimum UCR status levels that allow module execution
 * Context-First: Modules require at least AI_READY status
 */
const MINIMUM_STATUS_FOR_EXECUTION = [
  "DRAFT_AI",
  "AI_READY",
  "AI_ANALYSIS_RUN",
  "HUMAN_CONFIRMED",
  "LOCKED",
];

/**
 * Market Demand module required sections (hard validation)
 */
const MARKET_DEMAND_REQUIRED_SECTIONS = ["D", "H"];

/**
 * Market Demand module optional sections (soft validation - warnings only)
 */
const MARKET_DEMAND_OPTIONAL_SECTIONS = ["A", "B", "E", "F", "G"];

/**
 * Validate UCR status for module execution
 */
export function validateUCRStatus(config: Configuration): {
  valid: boolean;
  status: string;
  message: string;
} {
  const status = config.governance?.context_status || "DRAFT_AI";

  if (MINIMUM_STATUS_FOR_EXECUTION.includes(status)) {
    return {
      valid: true,
      status,
      message: `UCR status "${status}" meets minimum requirements for module execution`,
    };
  }

  return {
    valid: false,
    status,
    message: `UCR status "${status}" does not meet minimum requirements. Module requires status: ${MINIMUM_STATUS_FOR_EXECUTION.join(" or ")}`,
  };
}

/**
 * Validate required sections exist and have content
 */
export function validateRequiredSections(
  config: Configuration,
  moduleId: string
): SectionValidation[] {
  const validations: SectionValidation[] = [];

  if (moduleId === "market_demand_seasonality") {
    // Section D: demand_definition (required)
    const hasDemandDefinition = !!(
      config.demand_definition &&
      (
        (config.demand_definition.demand_themes && config.demand_definition.demand_themes.length > 0) ||
        (config.demand_definition.non_brand_keywords?.category_terms?.length > 0) ||
        (config.demand_definition.brand_keywords?.seed_terms?.length > 0)
      )
    );

    validations.push({
      section: "D",
      required: true,
      valid: hasDemandDefinition,
      message: hasDemandDefinition
        ? "Section D (Demand Definition) validated"
        : "Section D (Demand Definition) missing or empty. Add demand_themes or category_terms.",
    });

    // Section H: governance with module_defaults (required)
    const hasGovernance = !!(
      config.governance &&
      config.governance.context_status
    );

    validations.push({
      section: "H",
      required: true,
      valid: hasGovernance,
      message: hasGovernance
        ? "Section H (Governance) validated"
        : "Section H (Governance) missing. UCR governance block required.",
    });
  }

  return validations;
}

/**
 * Validate optional sections (warnings only)
 */
export function validateOptionalSections(
  config: Configuration,
  moduleId: string
): SectionValidation[] {
  const validations: SectionValidation[] = [];

  if (moduleId === "market_demand_seasonality") {
    // Section A: brand_identity (optional but useful)
    const hasBrandIdentity = !!(
      config.brand?.name
    );
    validations.push({
      section: "A",
      required: false,
      valid: hasBrandIdentity,
      message: hasBrandIdentity ? undefined : "Section A (Brand Identity) incomplete - results may lack brand context",
    });

    // Section B: category_definition (optional)
    const hasCategoryDefinition = !!(
      config.category_definition?.primary_category
    );
    validations.push({
      section: "B",
      required: false,
      valid: hasCategoryDefinition,
      message: hasCategoryDefinition ? undefined : "Section B (Category Definition) incomplete",
    });

    // Section E: strategic_intent (optional for timing recommendations)
    const hasStrategicIntent = !!(
      config.strategic_intent?.risk_tolerance
    );
    validations.push({
      section: "E",
      required: false,
      valid: hasStrategicIntent,
      message: hasStrategicIntent ? undefined : "Section E (Strategic Intent) incomplete - timing recommendations may be less tailored",
    });

    // Section G: negative_scope (optional for filtering)
    const hasNegativeScope = !!(
      config.negative_scope?.excluded_keywords?.length ||
      config.negative_scope?.excluded_categories?.length
    );
    validations.push({
      section: "G",
      required: false,
      valid: hasNegativeScope,
      message: hasNegativeScope ? undefined : "Section G (Negative Scope) empty - no exclusion filters applied",
    });
  }

  return validations;
}

/**
 * Full pre-execution validation gate
 * Context-First: Blocks execution if UCR doesn't meet requirements
 */
export function validateModuleExecution(
  config: Configuration,
  moduleId: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sectionsValidated: string[] = [];
  const sectionsMissing: string[] = [];

  // Step 1: Validate UCR status
  const statusValidation = validateUCRStatus(config);
  if (!statusValidation.valid) {
    errors.push(statusValidation.message);
  }

  // Step 2: Validate required sections (hard fail)
  const requiredValidations = validateRequiredSections(config, moduleId);
  for (const validation of requiredValidations) {
    if (validation.valid) {
      sectionsValidated.push(validation.section);
    } else {
      sectionsMissing.push(validation.section);
      if (validation.message) {
        errors.push(validation.message);
      }
    }
  }

  // Step 3: Validate optional sections (warnings only)
  const optionalValidations = validateOptionalSections(config, moduleId);
  for (const validation of optionalValidations) {
    if (validation.valid) {
      sectionsValidated.push(validation.section);
    } else if (validation.message) {
      warnings.push(validation.message);
    }
  }

  // Step 4: Determine if execution can proceed
  const requiredSectionsMissing = requiredValidations.filter(v => !v.valid);
  const canProceed = statusValidation.valid && requiredSectionsMissing.length === 0;

  return {
    valid: canProceed,
    canProceed,
    contextStatus: statusValidation.status,
    contextVersion: config.governance?.context_version || 1,
    errors,
    warnings,
    sectionsValidated,
    sectionsMissing,
  };
}

/**
 * Check if forecast is allowed by policy
 */
export function validateForecastPolicy(config: Configuration): {
  allowed: boolean;
  policy: string;
  message: string;
} {
  const policy = config.governance?.module_defaults?.forecast_policy || "DISABLED";

  return {
    allowed: policy !== "DISABLED",
    policy,
    message: policy === "DISABLED"
      ? "Forecast disabled by governance policy (H.module_defaults.forecast_policy)"
      : `Forecast enabled with policy: ${policy}`,
  };
}

/**
 * Generate validation trace for audit
 */
export function generateValidationTrace(result: ValidationResult): {
  ruleId: string;
  ucrSection: string;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
}[] {
  const traces: {
    ruleId: string;
    ucrSection: string;
    reason: string;
    severity: "low" | "medium" | "high" | "critical";
  }[] = [];

  // Add error traces
  for (const error of result.errors) {
    traces.push({
      ruleId: "pre_execution_validation",
      ucrSection: "H",
      reason: error,
      severity: "critical",
    });
  }

  // Add warning traces
  for (const warning of result.warnings) {
    traces.push({
      ruleId: "pre_execution_validation",
      ucrSection: "optional",
      reason: warning,
      severity: "low",
    });
  }

  // Add success traces for validated sections
  for (const section of result.sectionsValidated) {
    traces.push({
      ruleId: "section_validation",
      ucrSection: section,
      reason: `Section ${section} validated successfully`,
      severity: "low",
    });
  }

  return traces;
}
