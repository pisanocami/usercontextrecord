import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { validateUCR, applyNegativeScope, createAuditEntry, type UCRValidationResult, type PreFilterResult } from "../ucr-enforcement";
import type { Configuration, NegativeScope } from "@shared/schema";

export interface UCRStatus {
  isValid: boolean;
  isCMOSafe: boolean;
  isExpired: boolean;
  validationStatus: "valid" | "incomplete" | "blocked" | "expired" | "no_context";
  sectionStatus: {
    brand: SectionStatus;
    category_definition: SectionStatus;
    competitors: SectionStatus;
    demand_definition: SectionStatus;
    strategic_intent: SectionStatus;
    channel_context: SectionStatus;
    negative_scope: SectionStatus;
    governance: SectionStatus;
  };
  missingFields: string[];
  warnings: string[];
  blockedReasons: string[];
  contextAge: number;
  expiresInDays: number;
}

export interface SectionStatus {
  complete: boolean;
  warnings: string[];
  required: boolean;
}

export interface UCRSnapshot {
  id: number;
  tenantId: number | null;
  brand: Configuration["brand"];
  category_definition: Configuration["category_definition"];
  competitors: Configuration["competitors"];
  demand_definition: Configuration["demand_definition"];
  strategic_intent: Configuration["strategic_intent"];
  channel_context: Configuration["channel_context"];
  negative_scope: Configuration["negative_scope"];
  governance: Configuration["governance"];
  validation: UCRStatus;
  snapshotHash: string;
  snapshotAt: string;
}

export interface UCRGateResult {
  allowed: boolean;
  reason: string;
  ucr: UCRSnapshot | null;
}

function validateBrandSection(brand: Configuration["brand"]): SectionStatus {
  const warnings: string[] = [];
  if (!brand?.name) warnings.push("Brand name is required");
  if (!brand?.domain) warnings.push("Brand domain is required");
  if (!brand?.industry) warnings.push("Brand industry is required");
  if (!brand?.target_market) warnings.push("Target market is recommended");
  
  return {
    complete: !!brand?.name && !!brand?.domain && !!brand?.industry,
    warnings,
    required: true,
  };
}

function validateCategorySection(categoryDef: Configuration["category_definition"]): SectionStatus {
  const warnings: string[] = [];
  if (!categoryDef?.primary_category) warnings.push("Primary category is required");
  if (!categoryDef?.included?.length) warnings.push("At least one included category recommended");
  
  return {
    complete: !!categoryDef?.primary_category,
    warnings,
    required: true,
  };
}

function validateCompetitorsSection(competitors: Configuration["competitors"]): SectionStatus {
  const warnings: string[] = [];
  const hasDirectCompetitors = competitors?.direct && competitors.direct.length > 0;
  const hasEnhancedCompetitors = competitors?.competitors && competitors.competitors.length > 0;
  
  if (!hasDirectCompetitors && !hasEnhancedCompetitors) {
    warnings.push("At least one competitor is required for analysis");
  }
  
  return {
    complete: hasDirectCompetitors || hasEnhancedCompetitors,
    warnings,
    required: true,
  };
}

function validateDemandSection(demandDef: Configuration["demand_definition"]): SectionStatus {
  const warnings: string[] = [];
  const hasBrandKeywords = demandDef?.brand_keywords?.seed_terms?.length > 0;
  const hasCategoryTerms = demandDef?.non_brand_keywords?.category_terms?.length > 0;
  
  if (!hasBrandKeywords) warnings.push("Brand keywords are required");
  if (!hasCategoryTerms) warnings.push("Category terms recommended for non-brand demand");
  
  return {
    complete: hasBrandKeywords,
    warnings,
    required: true,
  };
}

function validateStrategicSection(strategic: Configuration["strategic_intent"]): SectionStatus {
  const warnings: string[] = [];
  if (!strategic?.primary_goal) warnings.push("Primary goal is recommended");
  if (!strategic?.risk_tolerance) warnings.push("Risk tolerance should be defined");
  
  return {
    complete: true,
    warnings,
    required: false,
  };
}

function validateChannelSection(channel: Configuration["channel_context"]): SectionStatus {
  const warnings: string[] = [];
  if (channel?.seo_investment_level === undefined) warnings.push("SEO investment level should be defined");
  
  return {
    complete: true,
    warnings,
    required: false,
  };
}

function validateNegativeScopeSection(negScope: Configuration["negative_scope"]): SectionStatus {
  const warnings: string[] = [];
  const hasExclusions = (
    (negScope?.excluded_categories?.length || 0) > 0 ||
    (negScope?.excluded_keywords?.length || 0) > 0 ||
    (negScope?.excluded_use_cases?.length || 0) > 0 ||
    (negScope?.excluded_competitors?.length || 0) > 0
  );
  
  if (!hasExclusions) {
    warnings.push("At least one exclusion rule is required (fail-closed validation)");
  }
  
  if (!negScope?.enforcement_rules?.hard_exclusion) {
    warnings.push("Hard exclusion must be enabled for CMO-safe operation");
  }
  
  return {
    complete: hasExclusions && !!negScope?.enforcement_rules?.hard_exclusion,
    warnings,
    required: true,
  };
}

function validateGovernanceSection(governance: Configuration["governance"]): SectionStatus {
  const warnings: string[] = [];
  const now = new Date();
  
  if (!governance?.context_valid_until) {
    warnings.push("Context expiration date should be set");
  } else {
    const validUntil = new Date(governance.context_valid_until);
    if (validUntil < now) {
      warnings.push("Context has expired - review required");
    }
  }
  
  if (!governance?.human_verified) {
    warnings.push("Context has not been human verified");
  }
  
  return {
    complete: true,
    warnings,
    required: false,
  };
}

export function computeUCRStatus(config: Configuration | null): UCRStatus {
  if (!config) {
    return {
      isValid: false,
      isCMOSafe: false,
      isExpired: false,
      validationStatus: "no_context",
      sectionStatus: {
        brand: { complete: false, warnings: ["No configuration loaded"], required: true },
        category_definition: { complete: false, warnings: [], required: true },
        competitors: { complete: false, warnings: [], required: true },
        demand_definition: { complete: false, warnings: [], required: true },
        strategic_intent: { complete: false, warnings: [], required: false },
        channel_context: { complete: false, warnings: [], required: false },
        negative_scope: { complete: false, warnings: [], required: true },
        governance: { complete: false, warnings: [], required: false },
      },
      missingFields: [],
      warnings: ["No UCR configuration found"],
      blockedReasons: ["No context defined - analysis blocked"],
      contextAge: 0,
      expiresInDays: 0,
    };
  }

  const sectionStatus = {
    brand: validateBrandSection(config.brand),
    category_definition: validateCategorySection(config.category_definition),
    competitors: validateCompetitorsSection(config.competitors),
    demand_definition: validateDemandSection(config.demand_definition),
    strategic_intent: validateStrategicSection(config.strategic_intent),
    channel_context: validateChannelSection(config.channel_context),
    negative_scope: validateNegativeScopeSection(config.negative_scope),
    governance: validateGovernanceSection(config.governance),
  };

  const ucrValidation = validateUCR(config);
  
  const requiredSections = Object.entries(sectionStatus)
    .filter(([_, status]) => status.required);
  const allRequiredComplete = requiredSections.every(([_, status]) => status.complete);
  
  const blockedReasons: string[] = [];
  for (const [name, status] of requiredSections) {
    if (!status.complete) {
      blockedReasons.push(`Section ${name} is incomplete`);
    }
  }

  let validationStatus: UCRStatus["validationStatus"];
  if (ucrValidation.isExpired) {
    validationStatus = "expired";
  } else if (!allRequiredComplete) {
    validationStatus = "incomplete";
  } else if (blockedReasons.length > 0) {
    validationStatus = "blocked";
  } else {
    validationStatus = "valid";
  }

  return {
    isValid: validationStatus === "valid",
    isCMOSafe: ucrValidation.isCMOSafe,
    isExpired: ucrValidation.isExpired,
    validationStatus,
    sectionStatus,
    missingFields: ucrValidation.missingFields,
    warnings: ucrValidation.warnings,
    blockedReasons,
    contextAge: ucrValidation.contextAge,
    expiresInDays: ucrValidation.expiresInDays,
  };
}

function generateSnapshotHash(config: Configuration): string {
  const safetyFields = {
    brand_domain: config.brand?.domain,
    primary_category: config.category_definition?.primary_category,
    competitors: config.competitors?.direct || [],
    excluded_categories: config.negative_scope?.excluded_categories || [],
    excluded_keywords: config.negative_scope?.excluded_keywords || [],
    hard_exclusion: config.negative_scope?.enforcement_rules?.hard_exclusion,
  };
  const canonicalJson = JSON.stringify(safetyFields, Object.keys(safetyFields).sort());
  return Buffer.from(canonicalJson).toString('base64').slice(0, 32);
}

export function createUCRSnapshot(config: Configuration & { tenantId?: number | null }): UCRSnapshot {
  const validation = computeUCRStatus(config);
  
  return {
    id: config.id,
    tenantId: (config as any).tenantId ?? null,
    brand: config.brand,
    category_definition: config.category_definition,
    competitors: config.competitors,
    demand_definition: config.demand_definition,
    strategic_intent: config.strategic_intent,
    channel_context: config.channel_context,
    negative_scope: config.negative_scope,
    governance: config.governance,
    validation,
    snapshotHash: generateSnapshotHash(config),
    snapshotAt: new Date().toISOString(),
  };
}

export async function getActiveUCR(tenantId: number, userId: string): Promise<UCRSnapshot | null> {
  const configs = await storage.getAllConfigurations(tenantId, userId);
  if (!configs || configs.length === 0) {
    return null;
  }
  const activeConfig = configs[0];
  return createUCRSnapshot(activeConfig as Configuration);
}

export async function validateAndGateUCR(tenantId: number, userId: string): Promise<UCRGateResult> {
  const ucr = await getActiveUCR(tenantId, userId);
  
  if (!ucr) {
    return {
      allowed: false,
      reason: "No UCR context found. Configure your brand context before running analysis.",
      ucr: null,
    };
  }
  
  if (!ucr.validation.isValid) {
    const reasons = ucr.validation.blockedReasons.join("; ");
    return {
      allowed: false,
      reason: `UCR incomplete: ${reasons}`,
      ucr,
    };
  }
  
  if (ucr.validation.isExpired) {
    return {
      allowed: false,
      reason: "UCR context has expired. Please review and update your brand context.",
      ucr,
    };
  }
  
  return {
    allowed: true,
    reason: "UCR valid",
    ucr,
  };
}

export function requireValidUCR() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = parseInt(req.headers["x-tenant-id"] as string, 10) || 1;
    const userId = (req as any).user?.id || "anonymous-user";
    
    const gateResult = await validateAndGateUCR(tenantId, userId);
    
    if (!gateResult.allowed) {
      return res.status(403).json({
        error: "UCR_BLOCKED",
        message: gateResult.reason,
        validation: gateResult.ucr?.validation || null,
      });
    }
    
    (req as any).ucr = gateResult.ucr;
    next();
  };
}

export function applyHardPreFilter(
  items: string[],
  negativeScope: NegativeScope,
  type: "category" | "keyword" | "use_case" | "competitor"
): PreFilterResult {
  return applyNegativeScope(items, negativeScope, type);
}
