import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertConfigurationSchema, defaultConfiguration, bulkJobRequestSchema, type InsertConfiguration, type BulkBrandInput, type ContextQualityScore } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { registerTenantRoutes } from "./tenant-routes";
import { tenantStorage } from "./tenant-storage";
import OpenAI from "openai";
import pLimit from "p-limit";
import { getKeywordGap, applyUCRGuardrails, checkCredentialsConfigured, getRankedKeywords, type KeywordGapResult } from "./dataforseo";
import { computeKeywordGap, clearCache, getCacheStats, type KeywordGapResult as KeywordGapLiteResult } from "./keyword-gap-lite";
import moduleRoutes from "./modules/routes";
import councilRoutes from "./councils/routes";

function getTenantId(req: Request): number | null {
  const tenantHeader = req.headers["x-tenant-id"];
  if (tenantHeader && typeof tenantHeader === "string") {
    const parsed = parseInt(tenantHeader, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

async function validateTenantAccess(req: Request, res: Response): Promise<number | null> {
  return 1; // Temporarily bypass for all users
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface ValidationResult {
  status: "complete" | "needs_review" | "blocked" | "incomplete";
  blockedReasons: string[];
  isValid: boolean;
}

function generateContextHash(config: InsertConfiguration): string {
  const safetyFields = {
    name: config.name,
    brand_name: config.brand?.name,
    brand_domain: config.brand?.domain,
    target_market: config.brand?.target_market,
    primary_category: config.category_definition?.primary_category,
    approved_categories: config.category_definition?.approved_categories || [],
    excluded_categories: config.negative_scope?.excluded_categories || [],
    excluded_keywords: config.negative_scope?.excluded_keywords || [],
    excluded_use_cases: config.negative_scope?.excluded_use_cases || [],
    excluded_competitors: config.negative_scope?.excluded_competitors || [],
    direct_competitors: config.competitors?.direct || [],
    enforcement_rules: config.negative_scope?.enforcement_rules,
    hard_exclusion: config.negative_scope?.enforcement_rules?.hard_exclusion,
    context_valid_until: config.governance?.context_valid_until,
  };
  const canonicalJson = JSON.stringify(safetyFields, Object.keys(safetyFields).sort());
  return Buffer.from(canonicalJson).toString('base64').slice(0, 32);
}

function validateConfiguration(config: InsertConfiguration): ValidationResult {
  const blockedReasons: string[] = [];
  const warnings: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    blockedReasons.push("Configuration name is required");
  }

  if (!config.brand?.name || config.brand.name.trim().length === 0) {
    blockedReasons.push("Brand name is required");
  }

  if (!config.category_definition?.primary_category || config.category_definition.primary_category.trim().length === 0) {
    blockedReasons.push("Primary category is required for fail-closed validation");
  }

  const negativeScope = config.negative_scope;
  const hasNegativeScope = negativeScope && (
    (negativeScope.excluded_categories && negativeScope.excluded_categories.length > 0) ||
    (negativeScope.excluded_keywords && negativeScope.excluded_keywords.length > 0) ||
    (negativeScope.excluded_use_cases && negativeScope.excluded_use_cases.length > 0)
  );

  if (!hasNegativeScope) {
    blockedReasons.push("Negative scope must have at least one exclusion rule for fail-closed validation");
  }

  if (!negativeScope?.enforcement_rules?.hard_exclusion) {
    blockedReasons.push("Enforcement rules must have hard_exclusion enabled");
  }

  if (!config.governance?.context_valid_until) {
    warnings.push("Missing context expiration date");
  }

  if (blockedReasons.length > 0) {
    return {
      status: "blocked",
      blockedReasons,
      isValid: false,
    };
  }

  if (!config.competitors?.direct || config.competitors.direct.length === 0) {
    warnings.push("No direct competitors defined");
  }

  if (!config.brand?.target_market) {
    warnings.push("Target market not specified");
  }

  if (!config.strategic_intent?.primary_goal) {
    warnings.push("Primary strategic goal not defined");
  }

  if (warnings.length > 0) {
    return {
      status: "incomplete",
      blockedReasons: warnings,
      isValid: true,
    };
  }

  if (!config.governance?.human_verified) {
    return {
      status: "needs_review",
      blockedReasons: [],
      isValid: true,
    };
  }

  return {
    status: "complete",
    blockedReasons: [],
    isValid: true,
  };
}

function calculateQualityScore(config: InsertConfiguration): ContextQualityScore {
  const breakdown = {
    completeness_details: "",
    competitor_details: "",
    negative_details: "",
    evidence_details: "",
  };

  // 1. Completeness Score (0-100)
  // Check required fields
  const requiredFields = [
    { name: "name", value: config.name },
    { name: "brand.name", value: config.brand?.name },
    { name: "brand.domain", value: config.brand?.domain },
    { name: "brand.industry", value: config.brand?.industry },
    { name: "brand.target_market", value: config.brand?.target_market },
    { name: "primary_category", value: config.category_definition?.primary_category },
    { name: "primary_goal", value: config.strategic_intent?.primary_goal },
    { name: "growth_priority", value: config.strategic_intent?.growth_priority },
  ];
  
  const filledRequired = requiredFields.filter(f => f.value && String(f.value).trim().length > 0);
  const missingFields = requiredFields.filter(f => !f.value || String(f.value).trim().length === 0).map(f => f.name);
  const completeness = Math.round((filledRequired.length / requiredFields.length) * 100);
  breakdown.completeness_details = missingFields.length > 0 
    ? `Missing: ${missingFields.join(", ")}` 
    : "All required fields complete";

  // 2. Competitor Confidence Score (0-100)
  // Based on number of competitors and evidence
  const competitors = config.competitors?.competitors || [];
  const directCount = config.competitors?.direct?.length || 0;
  const totalCompetitors = competitors.length + directCount;
  
  let competitorScore = 0;
  if (totalCompetitors >= 5) {
    competitorScore = 80;
  } else if (totalCompetitors >= 3) {
    competitorScore = 60;
  } else if (totalCompetitors >= 1) {
    competitorScore = 40;
  }

  // Bonus for competitors with evidence packs
  const competitorsWithEvidence = competitors.filter(c => c.evidence && c.evidence.why_selected).length;
  if (competitorsWithEvidence > 0 && competitors.length > 0) {
    const evidenceBonus = Math.round((competitorsWithEvidence / competitors.length) * 20);
    competitorScore = Math.min(100, competitorScore + evidenceBonus);
  }
  
  breakdown.competitor_details = `${totalCompetitors} competitors defined, ${competitorsWithEvidence} with evidence packs`;

  // 3. Negative Strength Score (0-100)
  // Based on coverage of exclusion types
  const neg = config.negative_scope;
  const exclusionCounts = {
    categories: (neg?.excluded_categories?.length || 0) + (neg?.category_exclusions?.length || 0),
    keywords: (neg?.excluded_keywords?.length || 0) + (neg?.keyword_exclusions?.length || 0),
    use_cases: (neg?.excluded_use_cases?.length || 0) + (neg?.use_case_exclusions?.length || 0),
    competitors: (neg?.excluded_competitors?.length || 0) + (neg?.competitor_exclusions?.length || 0),
  };

  const totalExclusions = Object.values(exclusionCounts).reduce((a, b) => a + b, 0);
  const exclusionTypesUsed = Object.values(exclusionCounts).filter(c => c > 0).length;
  
  let negativeScore = 0;
  if (exclusionTypesUsed >= 3) {
    negativeScore = 80;
  } else if (exclusionTypesUsed >= 2) {
    negativeScore = 60;
  } else if (exclusionTypesUsed >= 1) {
    negativeScore = 40;
  }

  // Bonus for hard exclusion enabled
  if (neg?.enforcement_rules?.hard_exclusion) {
    negativeScore = Math.min(100, negativeScore + 10);
  }
  
  // Bonus for depth
  if (totalExclusions >= 10) {
    negativeScore = Math.min(100, negativeScore + 10);
  }
  
  breakdown.negative_details = `${totalExclusions} exclusions across ${exclusionTypesUsed} types`;

  // 4. Evidence Coverage Score (0-100)
  // Based on how well competitors are documented
  let evidenceScore = 0;
  if (competitors.length > 0) {
    const withEvidence = competitors.filter(c => c.evidence?.why_selected).length;
    const withKeywords = competitors.filter(c => c.evidence?.top_overlap_keywords?.length > 0).length;
    const withExamples = competitors.filter(c => c.evidence?.serp_examples?.length > 0).length;
    
    evidenceScore = Math.round(((withEvidence + withKeywords + withExamples) / (competitors.length * 3)) * 100);
    breakdown.evidence_details = `Evidence: ${withEvidence}/${competitors.length}, Keywords: ${withKeywords}/${competitors.length}, Examples: ${withExamples}/${competitors.length}`;
  } else if (directCount > 0) {
    evidenceScore = 30; // Legacy format without detailed evidence
    breakdown.evidence_details = "Using legacy competitor format (no detailed evidence)";
  } else {
    breakdown.evidence_details = "No competitors defined";
  }

  // Calculate overall score (weighted average)
  const weights = {
    completeness: 0.25,
    competitor_confidence: 0.25,
    negative_strength: 0.30,
    evidence_coverage: 0.20,
  };

  const overall = Math.round(
    completeness * weights.completeness +
    competitorScore * weights.competitor_confidence +
    negativeScore * weights.negative_strength +
    evidenceScore * weights.evidence_coverage
  );

  // Determine grade
  let grade: "high" | "medium" | "low" = "low";
  if (overall >= 75) {
    grade = "high";
  } else if (overall >= 50) {
    grade = "medium";
  }

  return {
    completeness,
    competitor_confidence: competitorScore,
    negative_strength: negativeScore,
    evidence_coverage: evidenceScore,
    overall,
    grade,
    breakdown,
    calculated_at: new Date().toISOString(),
  };
}

async function generateCompleteConfiguration(
  domain: string,
  brandName: string | undefined,
  primaryCategory: string
): Promise<InsertConfiguration> {
  const systemPrompt = `You are an expert marketing intelligence consultant. Given a brand domain and category, generate a complete brand intelligence configuration using web search to gather real information about the brand.

You must respond with a complete JSON configuration object that includes ALL the following sections filled with real, researched data:

1. brand: name, domain, industry, business_model (B2B/DTC/Marketplace/Hybrid), primary_geography (array of country codes), revenue_band
2. category_definition: primary_category, included (subcategories array), excluded (categories array)
3. competitors: direct (array), indirect (array), marketplaces (array)
4. demand_definition: brand_keywords.seed_terms, brand_keywords.top_n, non_brand_keywords.category_terms, non_brand_keywords.problem_terms, non_brand_keywords.top_n
5. strategic_intent: growth_priority, risk_tolerance (low/medium/high), primary_goal, secondary_goals (array), avoid (array)
6. channel_context: paid_media_active (boolean), seo_investment_level (low/medium/high), marketplace_dependence (low/medium/high)
7. negative_scope: excluded_categories, excluded_keywords, excluded_use_cases, excluded_competitors, enforcement_rules
8. governance: model_suggested (true), human_overrides, context_confidence, last_reviewed, reviewed_by, context_valid_until, cmo_safe

Be specific and data-driven. Use real competitor names, real industry terms, and realistic business context.`;

  const userPrompt = `Research and generate a complete brand intelligence configuration for:
- Domain: ${domain}
- Brand Name: ${brandName || "Unknown (infer from domain)"}
- Primary Category: ${primaryCategory}

Use your knowledge to identify:
- The actual company and what they do
- Their real competitors in the ${primaryCategory} space
- Relevant keywords for their industry
- Strategic recommendations based on their market position

Return a complete JSON object with ALL sections filled.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const generated = JSON.parse(content);
  
  const today = new Date().toISOString().split("T")[0];
  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Generate context hash for determinism
  const configData = JSON.stringify({
    domain, brandName, primaryCategory, generated
  });
  const contextHash = Buffer.from(configData).toString('base64').slice(0, 32);

  return {
    name: generated.brand?.name || brandName || domain,
    brand: {
      name: generated.brand?.name || brandName || domain,
      domain: domain,
      industry: generated.brand?.industry || primaryCategory,
      business_model: generated.brand?.business_model || "B2B",
      primary_geography: generated.brand?.primary_geography || ["US"],
      revenue_band: generated.brand?.revenue_band || "Unknown",
      target_market: generated.brand?.target_market || "US",
    },
    category_definition: {
      primary_category: generated.category_definition?.primary_category || generated.brand?.industry || primaryCategory,
      included: generated.category_definition?.included || [],
      excluded: generated.category_definition?.excluded || [],
      approved_categories: [generated.category_definition?.primary_category || generated.brand?.industry || primaryCategory],
      alternative_categories: generated.category_definition?.alternative_categories || [],
    },
    competitors: {
      direct: generated.competitors?.direct || [],
      indirect: generated.competitors?.indirect || [],
      marketplaces: generated.competitors?.marketplaces || [],
      competitors: [],
      approved_count: 0,
      rejected_count: 0,
      pending_review_count: 0,
    },
    demand_definition: {
      brand_keywords: {
        seed_terms: generated.demand_definition?.brand_keywords?.seed_terms || [],
        top_n: generated.demand_definition?.brand_keywords?.top_n || 20,
      },
      non_brand_keywords: {
        category_terms: generated.demand_definition?.non_brand_keywords?.category_terms || [],
        problem_terms: generated.demand_definition?.non_brand_keywords?.problem_terms || [],
        top_n: generated.demand_definition?.non_brand_keywords?.top_n || 50,
      },
    },
    strategic_intent: {
      growth_priority: generated.strategic_intent?.growth_priority || "Market expansion",
      risk_tolerance: generated.strategic_intent?.risk_tolerance || "medium",
      primary_goal: generated.strategic_intent?.primary_goal || "Increase market share",
      secondary_goals: generated.strategic_intent?.secondary_goals || [],
      avoid: generated.strategic_intent?.avoid || [],
      goal_type: generated.strategic_intent?.goal_type || "roi",
      time_horizon: generated.strategic_intent?.time_horizon || "medium",
      constraint_flags: generated.strategic_intent?.constraint_flags || {
        budget_constrained: false,
        resource_limited: false,
        regulatory_sensitive: false,
        brand_protection_priority: false,
      },
    },
    channel_context: {
      paid_media_active: generated.channel_context?.paid_media_active ?? true,
      seo_investment_level: generated.channel_context?.seo_investment_level || "medium",
      marketplace_dependence: generated.channel_context?.marketplace_dependence || "low",
    },
    negative_scope: {
      excluded_categories: generated.negative_scope?.excluded_categories || [],
      excluded_keywords: generated.negative_scope?.excluded_keywords || [],
      excluded_use_cases: generated.negative_scope?.excluded_use_cases || [],
      excluded_competitors: generated.negative_scope?.excluded_competitors || [],
      category_exclusions: [],
      keyword_exclusions: [],
      use_case_exclusions: [],
      competitor_exclusions: [],
      enforcement_rules: {
        hard_exclusion: true,
        allow_model_suggestion: true,
        require_human_override_for_expansion: true,
      },
      audit_log: [],
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
        notes: "Auto-generated configuration - review recommended",
      },
      last_reviewed: today,
      reviewed_by: "AI Generator",
      context_valid_until: validUntil,
      cmo_safe: false,
      context_hash: contextHash,
      context_version: 1,
      validation_status: "needs_review" as const,
      human_verified: false,
      blocked_reasons: [],
      quality_score: {
        completeness: 0,
        competitor_confidence: 0,
        negative_strength: 0,
        evidence_coverage: 0,
        overall: 0,
        grade: "low",
        breakdown: {
          completeness_details: "",
          competitor_details: "",
          negative_details: "",
          evidence_details: "",
        },
        calculated_at: "",
      },
      ai_behavior: {
        regeneration_count: 0,
        max_regenerations: 1,
        redacted_fields: [],
        auto_approve_threshold: 80,
        require_human_below: 50,
        requires_human_review: false,
        auto_approved: false,
        violation_detected: false,
      },
    },
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication FIRST
  await setupAuth(app);
  registerAuthRoutes(app);
  registerTenantRoutes(app);
  
  // FON Architecture Routes
  app.use('/api/fon', moduleRoutes);
  app.use('/api/fon', councilRoutes);
  
  // Get current configuration (bypass auth)
  app.get("/api/configuration", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      
      let config = await storage.getConfiguration(tenantId, userId);
      
      // If no configuration exists, create a default one
      if (!config) {
        config = await storage.saveConfiguration(tenantId, userId, defaultConfiguration);
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching configuration:", error);
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  // Save configuration (bypass auth)
  app.post("/api/configuration", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      
      const result = insertConfigurationSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const config = await storage.saveConfiguration(tenantId, userId, result.data);
      res.json(config);
    } catch (error) {
      console.error("Error saving configuration:", error);
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  // Get all configurations for user
  app.get("/api/configurations", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const configs = await storage.getAllConfigurations(tenantId, userId);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching configurations:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });

  // Get single configuration by ID
  app.get("/api/configurations/:id", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const config = await storage.getConfigurationById(id, tenantId, userId);
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching configuration:", error);
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  // Create new configuration
  app.post("/api/configurations", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      
      const result = insertConfigurationSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const validation = validateConfiguration(result.data);
      
      if (!validation.isValid) {
        return res.status(422).json({ 
          error: "Fail-closed validation failed", 
          blockedReasons: validation.blockedReasons, 
          status: validation.status 
        });
      }
      
      const contextHash = generateContextHash(result.data);
      const qualityScore = calculateQualityScore(result.data);
      
      // Determine if human review is required based on quality score
      const aiBehavior = result.data.governance?.ai_behavior || defaultConfiguration.governance.ai_behavior;
      const requiresHumanReview = qualityScore.overall < (aiBehavior?.require_human_below || 50);
      const autoApproved = qualityScore.overall >= (aiBehavior?.auto_approve_threshold || 80);
      
      const configWithValidation = {
        ...result.data,
        governance: {
          ...result.data.governance,
          validation_status: validation.status,
          blocked_reasons: validation.blockedReasons,
          context_hash: contextHash,
          context_version: 1,
          quality_score: qualityScore,
          ai_behavior: {
            ...(result.data.governance?.ai_behavior || defaultConfiguration.governance.ai_behavior),
            requires_human_review: requiresHumanReview,
            auto_approved: autoApproved,
          },
        },
      };
      
      const config = await storage.createConfiguration(tenantId, userId, configWithValidation);
      res.json(config);
    } catch (error) {
      console.error("Error creating configuration:", error);
      res.status(500).json({ error: "Failed to create configuration" });
    }
  });

  // Update configuration with edit reason
  app.put("/api/configurations/:id", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const { editReason, ...configData } = req.body;
      
      if (!editReason || typeof editReason !== "string" || editReason.trim().length < 5) {
        return res.status(400).json({ error: "Edit reason is required (minimum 5 characters)" });
      }
      
      const result = insertConfigurationSchema.safeParse(configData);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const validation = validateConfiguration(result.data);
      
      if (!validation.isValid) {
        return res.status(422).json({ 
          error: "Fail-closed validation failed", 
          blockedReasons: validation.blockedReasons, 
          status: validation.status 
        });
      }
      
      const existingConfig = await storage.getConfigurationById(id, tenantId, userId);
      if (!existingConfig) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      const contextHash = generateContextHash(result.data);
      const qualityScore = calculateQualityScore(result.data);

      const aiBehavior = result.data.governance?.ai_behavior || defaultConfiguration.governance.ai_behavior;
      const requiresHumanReview = qualityScore.overall < (aiBehavior?.require_human_below || 50);
      const autoApproved = qualityScore.overall >= (aiBehavior?.auto_approve_threshold || 80);

      const configWithValidation = {
        ...result.data,
        governance: {
          ...result.data.governance,
          validation_status: validation.status,
          blocked_reasons: validation.blockedReasons,
          context_hash: contextHash,
          context_version: (existingConfig.governance?.context_version || 1) + 1,
          quality_score: qualityScore,
          ai_behavior: {
            ...(result.data.governance?.ai_behavior || defaultConfiguration.governance.ai_behavior),
            requires_human_review: requiresHumanReview,
            auto_approved: autoApproved,
          },
        },
      };

      const config = await storage.updateConfiguration(id, tenantId, userId, configWithValidation, editReason.trim());
      res.json(config);
    } catch (error) {
      console.error("Error updating configuration:", error);
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  // Delete configuration
  app.delete("/api/configurations/:id", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      await storage.deleteConfiguration(id, tenantId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting configuration:", error);
      res.status(500).json({ error: "Failed to delete configuration" });
    }
  });

  // Get configuration version history
  app.get("/api/configurations/:id/versions", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const versions = await storage.getConfigurationVersions(id, tenantId, userId);
      res.json(versions);
    } catch (error: any) {
      console.error("Error fetching versions:", error);
      if (error.message === "Configuration not found") {
        return res.status(404).json({ error: "Configuration not found" });
      }
      res.status(500).json({ error: error.message || "Failed to fetch versions" });
    }
  });

  // Get a specific version
  app.get("/api/versions/:versionId", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const versionId = parseInt(req.params.versionId);
      if (isNaN(versionId)) {
        return res.status(400).json({ error: "Invalid version ID" });
      }
      
      const version = await storage.getConfigurationVersion(versionId, tenantId, userId);
      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }
      res.json(version);
    } catch (error: any) {
      console.error("Error fetching version:", error);
      res.status(500).json({ error: error.message || "Failed to fetch version" });
    }
  });

  // Create a version snapshot manually
  app.post("/api/configurations/:id/versions", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const { changeSummary } = req.body;
      const version = await storage.createConfigurationVersion(
        id,
        tenantId,
        userId, 
        changeSummary || "Manual snapshot"
      );
      res.json(version);
    } catch (error: any) {
      console.error("Error creating version:", error);
      if (error.message === "Configuration not found") {
        return res.status(404).json({ error: "Configuration not found" });
      }
      res.status(500).json({ error: error.message || "Failed to create version" });
    }
  });

  // Restore a version
  app.post("/api/versions/:versionId/restore", async (req: any, res) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const versionId = parseInt(req.params.versionId);
      if (isNaN(versionId)) {
        return res.status(400).json({ error: "Invalid version ID" });
      }
      
      const restored = await storage.restoreConfigurationVersion(versionId, tenantId, userId);
      res.json(restored);
    } catch (error: any) {
      console.error("Error restoring version:", error);
      if (error.message === "Version not found" || error.message === "Configuration not found") {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || "Failed to restore version" });
    }
  });

  // AI-powered generation endpoint (bypass auth)
  app.post("/api/ai/generate", async (req: any, res: Response) => {
    try {
      const { section, context, currentData } = req.body;
      
      if (!section) {
        return res.status(400).json({ error: "Section is required" });
      }

      const systemPrompt = `You are an expert marketing intelligence consultant helping configure a Brand Intelligence Platform. 
Your role is to analyze brand context and generate intelligent suggestions for marketing configuration.
Always respond with valid JSON that matches the expected schema for the section.
Be specific, actionable, and data-driven in your suggestions.`;

      const prompts: Record<string, string> = {
        brand: `Based on the domain "${context?.domain || 'unknown'}" and brand name "${context?.name || 'unknown'}", suggest:
- Industry classification
- Business model (B2B, DTC, Marketplace, or Hybrid)
- Primary geographies (as array of country codes)
- Revenue band estimate
Return JSON with keys: industry, business_model, primary_geography, revenue_band`,
        
        category: `For a brand in the "${context?.industry || 'unknown'}" industry with business model "${context?.business_model || 'B2B'}":
Suggest category definitions including:
- Primary category
- Included subcategories (array)
- Excluded categories (array)
Return JSON with keys: primary_category, included, excluded`,
        
        competitors: `For a brand named "${context?.name || 'unknown'}" in the "${context?.industry || 'unknown'}" industry:
Identify potential competitors in three tiers:
- Direct competitors (array of company names)
- Indirect competitors (array of company names)
- Marketplace competitors (array of platform names)
Return JSON with keys: direct, indirect, marketplaces`,
        
        demand: `For a "${context?.business_model || 'B2B'}" brand in "${context?.industry || 'unknown'}":
Suggest keyword strategies:
- Brand keywords seed terms (array)
- Category terms for non-brand keywords (array)
- Problem terms that customers search for (array)
Return JSON with keys: brand_keywords.seed_terms, non_brand_keywords.category_terms, non_brand_keywords.problem_terms`,
        
        strategic: `For a brand with the following context:
- Industry: ${context?.industry || 'unknown'}
- Business Model: ${context?.business_model || 'B2B'}
- Revenue Band: ${context?.revenue_band || 'unknown'}
Suggest strategic intent:
- Growth priority focus area
- Risk tolerance recommendation (low, medium, high)
- Primary business goal
- Secondary goals (array)
- Things to avoid (array)
Return JSON with keys: growth_priority, risk_tolerance, primary_goal, secondary_goals, avoid`,
        
        channel: `Based on the business model "${context?.business_model || 'B2B'}" and industry "${context?.industry || 'unknown'}":
Recommend channel context settings:
- Should paid media be active? (boolean)
- SEO investment level (low, medium, high)
- Marketplace dependence level (low, medium, high)
Return JSON with keys: paid_media_active, seo_investment_level, marketplace_dependence`,
        
        negative: `For a "${context?.business_model || 'B2B'}" company in "${context?.industry || 'unknown'}":
Suggest negative scope exclusions:
- Categories to exclude (array)
- Keywords to exclude (array)
- Use cases to exclude (array)
- Competitor-related exclusions (array)
Return JSON with keys: excluded_categories, excluded_keywords, excluded_use_cases, excluded_competitors`,
      };

      const userPrompt = prompts[section] || `Generate configuration suggestions for the ${section} section.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "No response from AI" });
      }

      const suggestions = JSON.parse(content);
      res.json({ suggestions, model_suggested: true });
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // Generate complete configuration from domain and category
  app.post("/api/ai/generate-complete", async (req: any, res: Response) => {
    try {
      const { domain, name, primaryCategory } = req.body;
      
      if (!domain || !primaryCategory) {
        return res.status(400).json({ error: "Domain and primary category are required" });
      }

      const config = await generateCompleteConfiguration(domain, name, primaryCategory);
      res.json({ configuration: config, model_suggested: true });
    } catch (error) {
      console.error("Error generating complete configuration:", error);
      res.status(500).json({ error: "Failed to generate configuration" });
    }
  });

  // Create bulk generation job
  app.post("/api/bulk/jobs", async (req: any, res: Response) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const result = bulkJobRequestSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ error: validationError.message });
      }

      const job = await storage.createBulkJob(
        tenantId,
        userId,
        result.data.primaryCategory,
        result.data.brands
      );

      processBulkJob(job.id, tenantId, result.data.primaryCategory, result.data.brands);

      res.json(job);
    } catch (error) {
      console.error("Error creating bulk job:", error);
      res.status(500).json({ error: "Failed to create bulk job" });
    }
  });

  // Get all bulk jobs for user
  app.get("/api/bulk/jobs", async (req: any, res: Response) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const jobs = await storage.getBulkJobs(tenantId, userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching bulk jobs:", error);
      res.status(500).json({ error: "Failed to fetch bulk jobs" });
    }
  });

  // Get specific bulk job
  app.get("/api/bulk/jobs/:id", async (req: any, res: Response) => {
    try {
      const tenantId = 1; // Default tenant
      const userId = "anonymous-user";
      const jobId = parseInt(req.params.id);
      const job = await storage.getBulkJob(jobId, tenantId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error("Error fetching bulk job:", error);
      res.status(500).json({ error: "Failed to fetch bulk job" });
    }
  });

  app.get("/api/keyword-gap/status", async (req, res) => {
    try {
      const configured = checkCredentialsConfigured();
      res.json({ configured });
    } catch (error) {
      res.status(500).json({ error: "Failed to check DataForSEO status" });
    }
  });

  app.post("/api/keyword-gap/analyze", isAuthenticated, async (req, res) => {
    try {
      if (!checkCredentialsConfigured()) {
        return res.status(503).json({ 
          error: "DataForSEO credentials not configured. Please set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD." 
        });
      }

      const { configurationId, competitorDomain, locationCode = 2840, languageName = "English", limit = 100 } = req.body;

      if (!configurationId || !competitorDomain) {
        return res.status(400).json({ error: "configurationId and competitorDomain are required" });
      }

      const tenantId = 1; // Default tenant
      const userId = (req.user as any)?.id || "anonymous-user";
      const config = await storage.getConfigurationById(configurationId, tenantId, userId);

      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      const brandDomain = config.brand?.domain;
      if (!brandDomain) {
        return res.status(400).json({ error: "Configuration has no brand domain defined" });
      }

      let result: KeywordGapResult = await getKeywordGap(
        brandDomain,
        competitorDomain,
        locationCode,
        languageName,
        limit
      );

      if (config.negative_scope) {
        result = applyUCRGuardrails(
          result,
          {
            excluded_topics: config.negative_scope?.excluded_use_cases,
            excluded_keywords: config.negative_scope?.excluded_keywords,
            excluded_categories: config.negative_scope?.excluded_categories,
          }
        );
      }

      res.json({
        ...result,
        ucr_guardrails_applied: true,
        configuration_name: config.name,
      });
    } catch (error: any) {
      console.error("Error analyzing keyword gap:", error);
      res.status(500).json({ error: error.message || "Failed to analyze keyword gap" });
    }
  });

  app.post("/api/keyword-gap/compare-all", isAuthenticated, async (req, res) => {
    try {
      if (!checkCredentialsConfigured()) {
        return res.status(503).json({ 
          error: "DataForSEO credentials not configured." 
        });
      }

      const { configurationId, locationCode = 2840, languageName = "English", limit = 50 } = req.body;

      if (!configurationId) {
        return res.status(400).json({ error: "configurationId is required" });
      }

      const tenantId = 1; // Default tenant
      const userId = (req.user as any)?.id || "anonymous-user";
      const config = await storage.getConfigurationById(configurationId, tenantId, userId);

      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      const brandDomain = config.brand?.domain;
      if (!brandDomain) {
        return res.status(400).json({ error: "Configuration has no brand domain defined" });
      }

      const competitors = [
        ...(config.competitors?.direct || []),
        ...(config.competitors?.indirect || []),
      ].slice(0, 5);

      if (competitors.length === 0) {
        return res.status(400).json({ error: "No competitors defined in configuration" });
      }

      const results = await Promise.all(
        competitors.map(async (competitor) => {
          try {
            let result = await getKeywordGap(
              brandDomain,
              competitor,
              locationCode,
              languageName,
              Math.min(limit, 50)
            );

            if (config.negative_scope) {
              result = applyUCRGuardrails(
                result,
                {
                  excluded_topics: config.negative_scope?.excluded_use_cases,
                  excluded_keywords: config.negative_scope?.excluded_keywords,
                  excluded_categories: config.negative_scope?.excluded_categories,
                }
              );
            }

            return { competitor, success: true, result };
          } catch (error: any) {
            return { competitor, success: false, error: error.message };
          }
        })
      );

      const aggregatedGapKeywords = new Map<string, { keyword: string; count: number; totalVolume: number }>();
      
      results.forEach((r) => {
        if (r.success && r.result) {
          r.result.gap_keywords.forEach((kw) => {
            const existing = aggregatedGapKeywords.get(kw.keyword.toLowerCase());
            if (existing) {
              existing.count++;
              existing.totalVolume += kw.search_volume || 0;
            } else {
              aggregatedGapKeywords.set(kw.keyword.toLowerCase(), {
                keyword: kw.keyword,
                count: 1,
                totalVolume: kw.search_volume || 0,
              });
            }
          });
        }
      });

      const prioritizedGaps = Array.from(aggregatedGapKeywords.values())
        .sort((a, b) => b.count - a.count || b.totalVolume - a.totalVolume)
        .slice(0, 50);

      res.json({
        configuration_name: config.name,
        brand_domain: brandDomain,
        competitors_analyzed: results.length,
        individual_results: results,
        prioritized_gap_keywords: prioritizedGaps,
        ucr_guardrails_applied: true,
      });
    } catch (error: any) {
      console.error("Error comparing all competitors:", error);
      res.status(500).json({ error: error.message || "Failed to compare competitors" });
    }
  });

  app.post("/api/keyword-gap-lite/run", async (req: any, res) => {
    try {
      if (!checkCredentialsConfigured()) {
        return res.status(503).json({ 
          error: "DataForSEO credentials not configured.",
          configured: false,
        });
      }

      const { 
        configurationId, 
        limitPerDomain = 200, 
        locationCode = 2840, 
        languageCode = "en",
        maxCompetitors = 5,
      } = req.body;

      if (!configurationId) {
        return res.status(400).json({ error: "configurationId is required" });
      }

      const tenantId = 1; // Default tenant
      const userId = (req.user as any)?.id || "anonymous-user";
      const config = await storage.getConfigurationById(configurationId, tenantId, userId);

      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      const brandDomain = config.brand?.domain;
      if (!brandDomain) {
        return res.status(400).json({ error: "Configuration has no brand domain defined" });
      }

      const competitors = config.competitors?.direct || [];
      if (competitors.length === 0) {
        return res.status(400).json({ error: "No direct competitors defined in configuration" });
      }

      const dataforseoClient = {
        getRankedKeywords: async (domain: string, locCode?: number, langCode?: string, limit?: number) => {
          const result = await getRankedKeywords(
            domain,
            locCode || locationCode,
            langCode === "en" ? "English" : langCode || "English",
            limit || limitPerDomain
          );
          return result.items.map(item => ({
            keyword: item.keyword,
            position: item.position || 0,
            searchVolume: item.search_volume || 0,
            url: "",
            trafficShare: 0,
          }));
        },
      };

      const result = await computeKeywordGap(config as any, dataforseoClient, {
        limitPerDomain,
        locationCode,
        languageCode,
        maxCompetitors,
        ucrId: config.id,
        ucrHash: config.governance?.context_hash,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error running keyword gap lite:", error);
      res.status(500).json({ error: error.message || "Failed to run keyword gap analysis" });
    }
  });

  app.get("/api/keyword-gap-lite/cache", async (req, res) => {
    const stats = getCacheStats();
    res.json(stats);
  });

  app.delete("/api/keyword-gap-lite/cache", async (req, res) => {
    clearCache();
    res.json({ message: "Cache cleared" });
  });

  return httpServer;
}

async function processBulkJob(
  jobId: number,
  tenantId: number,
  primaryCategory: string,
  brands: BulkBrandInput[]
) {
  const limitConcurrency = pLimit(3);
  const results: InsertConfiguration[] = [];
  const errors: { domain: string; error: string }[] = [];
  let completed = 0;
  let failed = 0;

  await storage.updateBulkJob(jobId, tenantId, { status: "processing" });

  const tasks = brands.map((brand) =>
    limitConcurrency(async () => {
      try {
        const config = await generateCompleteConfiguration(
          brand.domain,
          brand.name,
          primaryCategory
        );
        results.push(config);
        completed++;
        
        await storage.updateBulkJob(jobId, tenantId, {
          completedBrands: completed,
          results: results,
        });
      } catch (error: any) {
        failed++;
        errors.push({
          domain: brand.domain,
          error: error.message || "Unknown error",
        });
        
        await storage.updateBulkJob(jobId, tenantId, {
          failedBrands: failed,
          errors: errors,
        });
      }
    })
  );

  await Promise.all(tasks);

  await storage.updateBulkJob(jobId, tenantId, {
    status: "completed",
    completedBrands: completed,
    failedBrands: failed,
    results: results,
    errors: errors,
  });
}
