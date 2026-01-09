import {
  type ModuleContract,
  type PreflightEntityCheck,
  type PreflightCheckResult,
  type ModulePreflightResult,
  type UCRSectionID,
  UCR_SECTION_NAMES,
  CONTRACT_REGISTRY,
} from "@shared/module.contract";

function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function countApprovedCompetitors(competitors: any[]): number {
  if (!Array.isArray(competitors)) return 0;
  return competitors.filter((c) => c && c.status === "approved").length;
}

function runEntityCheck(
  config: any,
  check: PreflightEntityCheck
): PreflightCheckResult {
  const value = getNestedValue(config, check.fieldPath);
  let passed = false;
  let currentValue: number | boolean | string = 0;

  switch (check.checkType) {
    case "min_approved_competitors": {
      const count = countApprovedCompetitors(value);
      currentValue = count;
      passed = count >= (check.minCount ?? 1);
      break;
    }
    case "min_competitors": {
      const count = Array.isArray(value) ? value.length : 0;
      currentValue = count;
      passed = count >= (check.minCount ?? 1);
      break;
    }
    case "min_categories": {
      const count = Array.isArray(value) ? value.length : 0;
      currentValue = count;
      passed = count >= (check.minCount ?? 1);
      break;
    }
    case "min_brand_keywords": {
      const terms = value?.seed_terms;
      const count = Array.isArray(terms) ? terms.length : 0;
      currentValue = count;
      passed = count >= (check.minCount ?? 1);
      break;
    }
    case "min_category_terms": {
      const terms = getNestedValue(config, check.fieldPath);
      const count = Array.isArray(terms) ? terms.length : 0;
      currentValue = count;
      passed = count >= (check.minCount ?? 1);
      break;
    }
    case "has_domain": {
      const domain = typeof value === "string" ? value.trim() : "";
      currentValue = domain.length > 0;
      passed = domain.length > 0;
      break;
    }
    case "has_primary_category": {
      const category = typeof value === "string" ? value.trim() : "";
      currentValue = category.length > 0;
      passed = category.length > 0;
      break;
    }
  }

  return {
    checkType: check.checkType,
    passed,
    currentValue,
    requiredValue: check.minCount ?? true,
    description: check.description,
    actionLabel: check.actionLabel,
    actionPath: check.actionPath,
    ucrSection: check.ucrSection,
  };
}

function getSectionAvailability(
  config: any,
  section: UCRSectionID
): boolean {
  switch (section) {
    case "A":
      return !!(config.brand?.name || config.brand?.domain);
    case "B":
      return !!(
        config.category_definition?.primary_category ||
        (config.category_definition?.approved_categories?.length ?? 0) > 0
      );
    case "C":
      return (
        (config.competitors?.competitors?.length ?? 0) > 0 ||
        (config.competitors?.direct?.length ?? 0) > 0
      );
    case "D":
      return !!(
        (config.demand_definition?.brand_keywords?.seed_terms?.length ?? 0) >
          0 ||
        (config.demand_definition?.non_brand_keywords?.category_terms
          ?.length ?? 0) > 0
      );
    case "E":
      return !!config.strategic_intent?.primary_goal;
    case "F":
      return config.channel_context?.seo_investment_level !== undefined;
    case "G":
      return (
        (config.negative_scope?.excluded_keywords?.length ?? 0) > 0 ||
        (config.negative_scope?.excluded_categories?.length ?? 0) > 0 ||
        (config.negative_scope?.excluded_use_cases?.length ?? 0) > 0
      );
    case "H":
      return config.governance !== undefined;
    default:
      return false;
  }
}

export function runPreflight(
  moduleId: string,
  config: any
): ModulePreflightResult {
  const contract = CONTRACT_REGISTRY[moduleId];
  if (!contract) {
    return {
      moduleId,
      status: "error",
      sectionChecks: [],
      entityChecks: [],
      missingRequired: [],
      allRequirementsMet: false,
      summary: `Module "${moduleId}" not found in registry`,
    };
  }

  const requiredSections = contract.contextInjection.requiredSections;
  const optionalSections = contract.contextInjection.optionalSections || [];
  const allSections = [...requiredSections, ...optionalSections];

  const sectionChecks = allSections.map((section) => ({
    section,
    name: UCR_SECTION_NAMES[section],
    required: requiredSections.includes(section),
    available: getSectionAvailability(config, section),
  }));

  const missingRequired = sectionChecks
    .filter((s) => s.required && !s.available)
    .map((s) => s.section);

  const entityChecks: PreflightCheckResult[] = [];
  if (contract.preflight?.entityChecks) {
    for (const check of contract.preflight.entityChecks) {
      entityChecks.push(runEntityCheck(config, check));
    }
  }

  const failedEntityChecks = entityChecks.filter((c) => !c.passed);
  const allRequirementsMet =
    missingRequired.length === 0 && failedEntityChecks.length === 0;

  let summary: string;
  if (allRequirementsMet) {
    summary = "All requirements met. Ready to run.";
  } else {
    const issues: string[] = [];
    if (missingRequired.length > 0) {
      issues.push(
        `Missing sections: ${missingRequired.map((s) => UCR_SECTION_NAMES[s]).join(", ")}`
      );
    }
    for (const check of failedEntityChecks) {
      issues.push(check.description);
    }
    summary = issues.join("; ");
  }

  return {
    moduleId,
    status: allRequirementsMet ? "ready" : "missing_requirements",
    sectionChecks,
    entityChecks,
    missingRequired,
    allRequirementsMet,
    summary,
  };
}
