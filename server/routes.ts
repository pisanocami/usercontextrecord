import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertConfigurationSchema, defaultConfiguration, bulkJobRequestSchema, type InsertConfiguration, type BulkBrandInput, type ContextQualityScore } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import pLimit from "p-limit";
import { getKeywordGap, applyUCRGuardrails, checkCredentialsConfigured, getRankedKeywords, type KeywordGapResult } from "./dataforseo";
import { computeKeywordGap, clearCache, getCacheStats, type KeywordGapResult as KeywordGapLiteResult } from "./keyword-gap-lite";
import { getProvider, getAllProviderStatuses, type ProviderType } from "./providers";
import { validateContext, type ContextValidationResult } from "./context-validator";
import { validateConfiguration as validateConfigurationFull, type FullValidationResult } from "@shared/validation";
import { getAllModules, getActiveModules, getModuleDefinition, canModuleExecute, UCR_SECTION_NAMES } from "@shared/module.contract";
import { validateModuleExecution } from "./execution-gateway";
import { validateModuleExecution as validateModulePreExecution, validateForecastPolicy, generateValidationTrace } from "./module-validation";
import { marketDemandAnalyzer } from "./market-demand-analyzer";
import { getAllTrendsProviderStatuses } from "./providers/trends-index";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
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

// Helper function to generate configuration name from domain
function generateNameFromDomain(domain: string): string {
  if (!domain) return "New Context";
  const cleanDomain = domain
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .replace(/\/$/, "")
    .split("/")[0];
  const name = cleanDomain
    .split(".")[0]
    .replace(/[-_]/g, " ")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return `${name} Context`;
}

interface CompetitorWithReason {
  name: string;
  domain: string;
  tier: "tier1" | "tier2" | "tier3";
  why: string;
}

interface CompetitorSearchResult {
  competitors_list: CompetitorWithReason[];
  direct: string[];
  indirect: string[];
  marketplaces: string[];
  search_sources?: string[];
}

async function searchCompetitorsWithGemini(
  domain: string,
  brandName: string | undefined,
  primaryCategory: string
): Promise<CompetitorSearchResult> {
  const cleanDomain = domain
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .replace(/\/$/, "");

  const prompt = `Research and identify the real competitors for this brand:

Brand: ${brandName || cleanDomain}
Domain: ${cleanDomain}
Category: ${primaryCategory}

Search the web to find:
1. Direct competitors (same product/service, same market)
2. Indirect competitors (similar products, adjacent markets)
3. Marketplace competitors (platforms where they compete)

For each competitor provide:
- Company name
- Domain (e.g., competitor.com)
- Tier: tier1 (direct), tier2 (indirect/adjacent), tier3 (aspirational/large players)
- Why they are a competitor (brief explanation based on your search findings)

Return ONLY valid JSON in this exact format:
{
  "competitors_list": [
    {"name": "Company Name", "domain": "company.com", "tier": "tier1", "why": "Reason from search"}
  ],
  "direct": ["competitor1.com", "competitor2.com"],
  "indirect": ["indirect1.com", "indirect2.com"],
  "marketplaces": ["amazon.com", "other-marketplace.com"]
}

IMPORTANT: 
- Use REAL competitor domains you find from searching, not made up ones
- Provide 4-6 competitors total across all tiers
- Be specific about WHY they compete based on search results`;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const content = response.text;
    if (!content) {
      throw new Error("No response from Gemini");
    }

    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const result = JSON.parse(jsonStr) as CompetitorSearchResult;

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      result.search_sources = groundingMetadata.groundingChunks
        .filter((chunk: any) => chunk.web?.uri)
        .map((chunk: any) => chunk.web.uri);
    }

    console.log(`[Gemini Search] Found ${result.competitors_list?.length || 0} competitors for ${cleanDomain}`);
    if (result.search_sources?.length) {
      console.log(`[Gemini Search] Sources used: ${result.search_sources.slice(0, 3).join(", ")}`);
    }

    return result;
  } catch (error) {
    console.error("[Gemini Search] Error searching competitors:", error);
    return {
      competitors_list: [],
      direct: [],
      indirect: [],
      marketplaces: [],
    };
  }
}

function validateConfiguration(config: InsertConfiguration): ValidationResult {
  const blockedReasons: string[] = [];
  const warnings: string[] = [];

  // REQUIRED: Domain is the only strictly required brand field
  if (!config.brand?.domain || config.brand.domain.trim().length === 0) {
    blockedReasons.push("Domain is required");
  }

  // REQUIRED: Primary category is required for fail-closed validation
  if (!config.category_definition?.primary_category || config.category_definition.primary_category.trim().length === 0) {
    blockedReasons.push("Primary category is required");
  }

  if (blockedReasons.length > 0) {
    return {
      status: "blocked",
      blockedReasons,
      isValid: false,
    };
  }

  // WARNINGS: Optional fields that improve context quality
  if (!config.brand?.name || config.brand.name.trim().length === 0) {
    warnings.push("Brand name not specified (will be auto-generated)");
  }

  if (!config.name || config.name.trim().length === 0) {
    warnings.push("Configuration name not specified (will be auto-generated from domain)");
  }

  const negativeScope = config.negative_scope;
  const hasNegativeScope = negativeScope && (
    (negativeScope.excluded_categories && negativeScope.excluded_categories.length > 0) ||
    (negativeScope.excluded_keywords && negativeScope.excluded_keywords.length > 0) ||
    (negativeScope.excluded_use_cases && negativeScope.excluded_use_cases.length > 0)
  );

  if (!hasNegativeScope) {
    warnings.push("Negative scope has no exclusion rules (recommended for fail-closed validation)");
  }

  if (!negativeScope?.enforcement_rules?.hard_exclusion) {
    warnings.push("Enforcement rules: hard_exclusion not enabled");
  }

  if (!config.governance?.context_valid_until) {
    warnings.push("Missing context expiration date");
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
  
  // Category fence is critical for analysis readiness
  const categoryIncluded = config.category_definition?.included?.length || 0;
  const categoryExcluded = config.category_definition?.excluded?.length || 0;
  const hasCategoryFence = categoryIncluded > 0 && categoryExcluded > 0;
  
  const filledRequired = requiredFields.filter(f => f.value && String(f.value).trim().length > 0);
  const missingFields = requiredFields.filter(f => !f.value || String(f.value).trim().length === 0).map(f => f.name);
  
  // Base completeness from required fields
  let completeness = Math.round((filledRequired.length / requiredFields.length) * 100);
  
  // Category fence bonus (critical for Keyword Gap)
  if (hasCategoryFence) {
    completeness = Math.min(100, completeness + 15);
  }
  
  breakdown.completeness_details = missingFields.length > 0 
    ? `Missing: ${missingFields.join(", ")}${!hasCategoryFence ? "; Category fence incomplete" : ""}` 
    : hasCategoryFence ? "All required fields complete, category fence defined" : "All required fields complete, category fence incomplete";

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

function normalizeDomain(input: string): string {
  if (!input) return "";
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, "");
  domain = domain.replace(/\/.*$/, "");
  if (!domain.includes(".")) {
    domain = domain.replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") + ".com";
  }
  return domain;
}

async function generateCompleteConfiguration(
  domain: string,
  brandName: string | undefined,
  primaryCategory: string
): Promise<InsertConfiguration> {
  const systemPrompt = `You are an expert marketing intelligence consultant. Given a brand domain and category, generate a complete brand intelligence configuration using web search to gather real information about the brand.

You must respond with a complete JSON configuration object that includes ALL the following sections filled with real, researched data:

1. brand: name, domain, industry, business_model (B2B/DTC/Marketplace/Hybrid), primary_geography (array of country codes), revenue_band, target_market
2. category_definition: primary_category, included (subcategories array), excluded (categories array)
3. competitors: For each competitor, provide BOTH name AND domain:
   - competitors_list: array of {name, domain, tier, why}
   - direct: array of DOMAIN NAMES (e.g., "nike.com", "adidas.com")
   - indirect: array of DOMAIN NAMES
   - marketplaces: array of DOMAIN NAMES
   
   IMPORTANT: Competitor "direct", "indirect", "marketplaces" arrays MUST contain domain names (e.g., "hoka.com"), NOT company names (e.g., "Hoka One One").
   
4. demand_definition: brand_keywords.seed_terms, brand_keywords.top_n, non_brand_keywords.category_terms, non_brand_keywords.problem_terms, non_brand_keywords.top_n
5. strategic_intent: growth_priority, risk_tolerance (low/medium/high), primary_goal, secondary_goals (array), avoid (array), goal_type (roi/volume/authority/awareness/retention), time_horizon (short/medium/long)
6. channel_context: paid_media_active (boolean), seo_investment_level (low/medium/high), marketplace_dependence (low/medium/high)
7. negative_scope: excluded_categories, excluded_keywords, excluded_use_cases, excluded_competitors, enforcement_rules
8. governance: model_suggested (true), human_overrides, context_confidence, last_reviewed, reviewed_by, context_valid_until, cmo_safe

Be specific and data-driven. Use real competitor DOMAINS, real industry terms, and realistic business context.`;

  const userPrompt = `Research and generate a complete brand intelligence configuration for:
- Domain: ${domain}
- Brand Name: ${brandName || "Unknown (infer from domain)"}
- Primary Category: ${primaryCategory}

Use your knowledge to identify:
- The actual company and what they do
- Their real competitors in the ${primaryCategory} space - provide DOMAIN NAMES (e.g., competitor.com), not company names
- Relevant keywords for their industry
- Strategic recommendations based on their market position

CRITICAL: For competitors arrays (direct, indirect, marketplaces), use DOMAIN NAMES like "hoka.com", "crocs.com", NOT company names like "Hoka One One", "Crocs".

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
  
  // Use Gemini with Google Search grounding to find REAL competitors
  console.log(`[Config Gen] Searching real competitors for ${domain} with Gemini + Google Search...`);
  const geminiCompetitors = await searchCompetitorsWithGemini(domain, brandName, primaryCategory);
  
  // Merge Gemini's search results with GPT-4o's suggestions, preferring Gemini
  const hasGeminiResults = geminiCompetitors.competitors_list.length > 0;
  const competitorData = hasGeminiResults ? geminiCompetitors : generated.competitors;
  
  if (hasGeminiResults) {
    console.log(`[Config Gen] Using ${geminiCompetitors.competitors_list.length} competitors from Gemini web search`);
  } else {
    console.log(`[Config Gen] Gemini search returned no results, falling back to GPT-4o suggestions`);
  }
  
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
      direct: (competitorData?.direct || []).map((d: string) => normalizeDomain(d)),
      indirect: (competitorData?.indirect || []).map((d: string) => normalizeDomain(d)),
      marketplaces: (competitorData?.marketplaces || []).map((d: string) => normalizeDomain(d)),
      competitors: (competitorData?.competitors_list || []).map((c: any) => ({
        name: c.name || "",
        domain: normalizeDomain(c.domain || ""),
        tier: c.tier || "tier1",
        status: "pending_review" as const,
        similarity_score: 50,
        serp_overlap: 0,
        size_proximity: 50,
        revenue_range: "",
        employee_count: "",
        funding_stage: "unknown" as const,
        geo_overlap: [],
        evidence: {
          why_selected: c.why || (hasGeminiResults ? "[Grounded with Google Search]" : ""),
          top_overlap_keywords: [],
          serp_examples: [],
        },
        added_by: "ai" as const,
        added_at: today,
        rejected_reason: "",
      })),
      approved_count: 0,
      rejected_count: 0,
      pending_review_count: (competitorData?.competitors_list || []).length || (competitorData?.direct || []).length,
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
      constraint_flags: {
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
      context_status: "DRAFT_AI" as const,
      quality_score: {
        completeness: 0,
        competitor_confidence: 0,
        negative_strength: 0,
        evidence_coverage: 0,
        overall: 0,
        grade: "low" as const,
        breakdown: {
          completeness_details: "",
          competitor_details: "",
          negative_details: "",
          evidence_details: "",
        },
        calculated_at: today,
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
      section_approvals: {
        brand_identity: { status: "ai_generated" as const },
        category_definition: { status: "ai_generated" as const },
        competitive_set: { status: "ai_generated" as const },
        demand_definition: { status: "ai_generated" as const },
        strategic_intent: { status: "ai_generated" as const },
        channel_context: { status: "ai_generated" as const },
        negative_scope: { status: "ai_generated" as const },
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

  // ============ BRAND API ROUTES ============
  
  // Get all brands for user
  app.get("/api/brands", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const brandsList = await storage.getBrands(userId);
      res.json(brandsList);
    } catch (error) {
      console.error("Error fetching brands:", error);
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  // Get single brand by ID
  app.get("/api/brands/:id", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid brand ID" });
      }
      
      const brand = await storage.getBrandById(id, userId);
      if (!brand) {
        return res.status(404).json({ error: "Brand not found" });
      }
      
      res.json(brand);
    } catch (error) {
      console.error("Error fetching brand:", error);
      res.status(500).json({ error: "Failed to fetch brand" });
    }
  });

  // Create or update brand (upsert by domain)
  app.post("/api/brands", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const { domain, name, industry, business_model, primary_geography, revenue_band, target_market } = req.body;
      
      if (!domain || typeof domain !== "string" || domain.trim().length === 0) {
        return res.status(400).json({ error: "Domain is required" });
      }
      
      const normalizedDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
      
      // Check if brand with this domain already exists - if so, update it
      const existing = await storage.getBrandByDomain(userId, normalizedDomain);
      if (existing) {
        const updated = await storage.updateBrand(existing.id, userId, {
          domain: normalizedDomain,
          name: name || existing.name,
          industry: industry || existing.industry,
          business_model: business_model || existing.business_model,
          primary_geography: primary_geography || existing.primary_geography,
          revenue_band: revenue_band || existing.revenue_band,
          target_market: target_market || existing.target_market,
        });
        return res.status(200).json({ ...updated, updated: true });
      }
      
      const brand = await storage.createBrand(userId, {
        domain: normalizedDomain,
        name: name || "",
        industry: industry || "",
        business_model: business_model || "B2B",
        primary_geography: primary_geography || [],
        revenue_band: revenue_band || "",
        target_market: target_market || "",
      });
      
      res.status(201).json(brand);
    } catch (error) {
      console.error("Error creating/updating brand:", error);
      res.status(500).json({ error: "Failed to create/update brand" });
    }
  });

  // Update brand
  app.put("/api/brands/:id", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid brand ID" });
      }
      
      const brand = await storage.updateBrand(id, userId, req.body);
      res.json(brand);
    } catch (error) {
      console.error("Error updating brand:", error);
      res.status(500).json({ error: "Failed to update brand" });
    }
  });

  // Delete brand
  app.delete("/api/brands/:id", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid brand ID" });
      }
      
      await storage.deleteBrand(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting brand:", error);
      res.status(500).json({ error: "Failed to delete brand" });
    }
  });

  // Get configurations for a specific brand
  app.get("/api/brands/:id/configurations", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const brandId = parseInt(req.params.id);
      if (isNaN(brandId)) {
        return res.status(400).json({ error: "Invalid brand ID" });
      }
      
      const configs = await storage.getConfigurationsByBrand(brandId, userId);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching brand configurations:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });

  // ============ CONFIGURATION API ROUTES ============
  
  // Get current configuration (bypass auth)
  app.get("/api/configuration", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      
      let config = await storage.getConfiguration(userId);
      
      // If no configuration exists, create a default one
      if (!config) {
        config = await storage.saveConfiguration(userId, defaultConfiguration);
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
      const userId = "anonymous-user";
      
      const result = insertConfigurationSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const config = await storage.saveConfiguration(userId, result.data);
      res.json(config);
    } catch (error) {
      console.error("Error saving configuration:", error);
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  // Get all configurations for user
  app.get("/api/configurations", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const configs = await storage.getAllConfigurations(userId);
      res.json(configs);
    } catch (error) {
      console.error("Error fetching configurations:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });

  // Get single configuration by ID
  app.get("/api/configurations/:id", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const config = await storage.getConfigurationById(id, userId);
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching configuration:", error);
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  // Create or update configuration (upsert by domain)
  app.post("/api/configurations", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      
      const result = insertConfigurationSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      // Auto-generate name from domain if not provided
      const configData = {
        ...result.data,
        name: result.data.name?.trim() || generateNameFromDomain(result.data.brand?.domain || ""),
      };
      
      const validation = validateConfiguration(configData);
      
      if (!validation.isValid) {
        return res.status(422).json({ 
          error: "Fail-closed validation failed", 
          blockedReasons: validation.blockedReasons,
          status: validation.status 
        });
      }
      
      const contextHash = generateContextHash(configData);
      const qualityScore = calculateQualityScore(configData);
      
      // Determine if human review is required based on quality score
      const aiBehavior = configData.governance?.ai_behavior || defaultConfiguration.governance.ai_behavior;
      const requiresHumanReview = qualityScore.overall < (aiBehavior?.require_human_below || 50);
      const autoApproved = qualityScore.overall >= (aiBehavior?.auto_approve_threshold || 80);
      
      // Check if a configuration with this domain already exists
      const domain = configData.brand?.domain;
      const existingConfig = domain ? await storage.getConfigurationByDomain(userId, domain) : null;
      
      if (existingConfig) {
        // Update existing configuration - increment context version
        const existingVersion = (existingConfig.governance?.context_version as number) || 1;
        const configWithValidation = {
          ...configData,
          governance: {
            ...configData.governance,
            validation_status: validation.status,
            blocked_reasons: validation.blockedReasons,
            context_hash: contextHash,
            context_version: existingVersion + 1,
            quality_score: qualityScore,
            ai_behavior: {
              ...(configData.governance?.ai_behavior || defaultConfiguration.governance.ai_behavior),
              requires_human_review: requiresHumanReview,
              auto_approved: autoApproved,
            },
          },
        };
        
        const updated = await storage.updateConfiguration(
          existingConfig.id, 
          userId, 
          configWithValidation, 
          "Auto-update via context generation"
        );
        return res.json({ ...updated, updated: true });
      }
      
      const configWithValidation = {
        ...configData,
        governance: {
          ...configData.governance,
          validation_status: validation.status,
          blocked_reasons: validation.blockedReasons,
          context_hash: contextHash,
          context_version: 1,
          quality_score: qualityScore,
          ai_behavior: {
            ...(configData.governance?.ai_behavior || defaultConfiguration.governance.ai_behavior),
            requires_human_review: requiresHumanReview,
            auto_approved: autoApproved,
          },
        },
      };
      
      const config = await storage.createConfiguration(userId, configWithValidation);
      res.json(config);
    } catch (error) {
      console.error("Error creating/updating configuration:", error);
      res.status(500).json({ error: "Failed to create/update configuration" });
    }
  });

  // Update configuration with edit reason
  app.put("/api/configurations/:id", async (req: any, res) => {
    try {
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
      
      const existingConfig = await storage.getConfigurationById(id, userId);
      if (!existingConfig) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      await storage.createConfigurationVersion(id, userId, editReason.trim());
      
      const currentVersion = existingConfig?.governance?.context_version || 0;
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
          context_version: currentVersion + 1,
          quality_score: qualityScore,
          ai_behavior: {
            ...(result.data.governance?.ai_behavior || defaultConfiguration.governance.ai_behavior),
            requires_human_review: requiresHumanReview,
            auto_approved: autoApproved,
          },
        },
      };
      
      const config = await storage.updateConfiguration(id, userId, configWithValidation, editReason.trim());
      res.json(config);
    } catch (error) {
      console.error("Error updating configuration:", error);
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  // Delete configuration
  app.delete("/api/configurations/:id", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      await storage.deleteConfiguration(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting configuration:", error);
      res.status(500).json({ error: "Failed to delete configuration" });
    }
  });

  // Update section approval status
  app.patch("/api/configurations/:id/section-approval", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const { section, status, rejected_reason } = req.body;
      
      const validSections = [
        "brand_identity", "category_definition", "competitive_set",
        "demand_definition", "strategic_intent", "channel_context", "negative_scope"
      ];
      
      if (!section || !validSections.includes(section)) {
        return res.status(400).json({ error: `Invalid section. Must be one of: ${validSections.join(", ")}` });
      }
      
      const validStatuses = ["pending", "approved", "rejected", "ai_generated"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }
      
      if (status === "rejected" && (!rejected_reason || rejected_reason.trim().length < 5)) {
        return res.status(400).json({ error: "Rejection reason is required (minimum 5 characters)" });
      }
      
      const existingConfig = await storage.getConfigurationById(id, userId);
      if (!existingConfig) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      const now = new Date().toISOString();
      const sectionApprovals = existingConfig.governance?.section_approvals || {};
      
      const updatedApproval = {
        status,
        ...(status === "approved" ? { approved_at: now, approved_by: userId } : {}),
        ...(status === "rejected" ? { rejected_reason: rejected_reason?.trim() } : {}),
        last_edited_at: now,
        last_edited_by: userId,
      };
      
      const updatedSectionApprovals = {
        ...sectionApprovals,
        [section]: updatedApproval,
      };
      
      const updatedGovernance = {
        ...existingConfig.governance,
        section_approvals: updatedSectionApprovals,
      };
      
      const { id: _, created_at, updated_at, ...configWithoutMeta } = existingConfig as any;
      const updatedConfig = await storage.updateConfiguration(
        id, 
        userId, 
        { ...configWithoutMeta, governance: updatedGovernance },
        `Section approval: ${section} set to ${status}`
      );
      
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating section approval:", error);
      res.status(500).json({ error: "Failed to update section approval" });
    }
  });

  // Context status transition endpoint
  app.patch("/api/configurations/:id/status", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const { status, reason } = req.body;
      
      const validStatuses = ["DRAFT_AI", "AI_READY", "AI_ANALYSIS_RUN", "HUMAN_CONFIRMED", "LOCKED"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }
      
      const existingConfig = await storage.getConfigurationById(id, userId);
      if (!existingConfig) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      const currentStatus = existingConfig.governance?.context_status || "DRAFT_AI";
      
      // Define valid state transitions
      const validTransitions: Record<string, string[]> = {
        "DRAFT_AI": ["AI_READY"],
        "AI_READY": ["DRAFT_AI", "AI_ANALYSIS_RUN"],
        "AI_ANALYSIS_RUN": ["AI_READY", "HUMAN_CONFIRMED"],
        "HUMAN_CONFIRMED": ["AI_ANALYSIS_RUN", "LOCKED"],
        "LOCKED": [], // LOCKED is terminal, cannot transition
      };
      
      if (currentStatus === "LOCKED") {
        return res.status(400).json({ 
          error: "Context is LOCKED and cannot be modified. Create a new version to make changes." 
        });
      }
      
      if (!validTransitions[currentStatus]?.includes(status)) {
        return res.status(400).json({ 
          error: `Invalid transition: ${currentStatus} → ${status}. Valid transitions: ${validTransitions[currentStatus]?.join(", ") || "none"}` 
        });
      }
      
      // Validate requirements for certain transitions
      if (status === "AI_READY") {
        const validation = validateConfiguration(existingConfig as any);
        if (!validation.isValid) {
          return res.status(400).json({ 
            error: "Cannot transition to AI_READY: validation failed", 
            blockedReasons: validation.blockedReasons 
          });
        }
      }
      
      if (status === "HUMAN_CONFIRMED") {
        // Check if all sections are approved
        const sectionApprovals = existingConfig.governance?.section_approvals || {};
        const pendingSections = Object.entries(sectionApprovals)
          .filter(([_, approval]: [string, any]) => approval.status !== "approved")
          .map(([section]) => section);
        
        if (pendingSections.length > 0) {
          return res.status(400).json({ 
            error: `Cannot confirm: sections not approved: ${pendingSections.join(", ")}` 
          });
        }
      }
      
      const now = new Date().toISOString();
      const updatedGovernance = {
        ...existingConfig.governance,
        context_status: status,
        context_status_updated_at: now,
        ...(status === "HUMAN_CONFIRMED" ? { human_verified: true, adopted_at: now } : {}),
        ...(status === "AI_ANALYSIS_RUN" ? { analysis_run_at: now } : {}),
      };
      
      const { id: _, created_at, updated_at, ...configWithoutMeta } = existingConfig as any;
      const updatedConfig = await storage.updateConfiguration(
        id, 
        userId, 
        { ...configWithoutMeta, governance: updatedGovernance },
        reason || `Status transition: ${currentStatus} → ${status}`
      );
      
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating context status:", error);
      res.status(500).json({ error: "Failed to update context status" });
    }
  });

  // DEV OVERRIDE: Approve all sections and set status to HUMAN_CONFIRMED
  // This endpoint is for development purposes only to bypass the approval workflow
  app.post("/api/configurations/:id/dev-override", async (req: any, res) => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "Dev override is not available in production" });
      }
      
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const existingConfig = await storage.getConfigurationById(id, userId);
      if (!existingConfig) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      const now = new Date().toISOString();
      
      // Approve all sections
      const allSectionsApproved = {
        brand_identity: { status: "approved", approved_at: now, approved_by: "dev-override" },
        category_definition: { status: "approved", approved_at: now, approved_by: "dev-override" },
        competitive_set: { status: "approved", approved_at: now, approved_by: "dev-override" },
        demand_definition: { status: "approved", approved_at: now, approved_by: "dev-override" },
        strategic_intent: { status: "approved", approved_at: now, approved_by: "dev-override" },
        channel_context: { status: "approved", approved_at: now, approved_by: "dev-override" },
        negative_scope: { status: "approved", approved_at: now, approved_by: "dev-override" },
      };
      
      const updatedGovernance = {
        ...existingConfig.governance,
        section_approvals: allSectionsApproved,
        context_status: "HUMAN_CONFIRMED",
        context_status_updated_at: now,
        human_verified: true,
        adopted_at: now,
        cmo_safe: true,
        last_reviewed: now,
        reviewed_by: "dev-override",
      };
      
      const { id: _, created_at, updated_at, ...configWithoutMeta } = existingConfig as any;
      const updatedConfig = await storage.updateConfiguration(
        id, 
        userId, 
        { ...configWithoutMeta, governance: updatedGovernance },
        "DEV OVERRIDE: Auto-approved all sections and set to HUMAN_CONFIRMED"
      );
      
      console.log(`[DEV OVERRIDE] Configuration ${id} auto-approved and set to HUMAN_CONFIRMED`);
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error applying dev override:", error);
      res.status(500).json({ error: "Failed to apply dev override" });
    }
  });

  // Full validation endpoint - returns detailed section-by-section validation
  app.get("/api/configurations/:id/validate", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const existingConfig = await storage.getConfigurationById(id, userId);
      if (!existingConfig) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      const validationResult = validateConfigurationFull({
        brand: existingConfig.brand,
        category_definition: existingConfig.category_definition,
        competitors: existingConfig.competitors,
        demand_definition: existingConfig.demand_definition,
        strategic_intent: existingConfig.strategic_intent,
        channel_context: existingConfig.channel_context,
        negative_scope: existingConfig.negative_scope,
        governance: existingConfig.governance,
      });
      
      res.json({
        configuration_id: id,
        current_status: existingConfig.governance?.context_status || "DRAFT_AI",
        validation: validationResult,
      });
    } catch (error) {
      console.error("Error validating configuration:", error);
      res.status(500).json({ error: "Failed to validate configuration" });
    }
  });

  // Get configuration version history
  app.get("/api/configurations/:id/versions", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const versions = await storage.getConfigurationVersions(id, userId);
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
      const userId = "anonymous-user";
      const versionId = parseInt(req.params.versionId);
      if (isNaN(versionId)) {
        return res.status(400).json({ error: "Invalid version ID" });
      }
      
      const version = await storage.getConfigurationVersion(versionId, userId);
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
      const userId = "anonymous-user";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid configuration ID" });
      }
      
      const { changeSummary } = req.body;
      const version = await storage.createConfigurationVersion(
        id, 
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
      const userId = "anonymous-user";
      const versionId = parseInt(req.params.versionId);
      if (isNaN(versionId)) {
        return res.status(400).json({ error: "Invalid version ID" });
      }
      
      const restored = await storage.restoreConfigurationVersion(versionId, userId);
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
Identify potential competitors in three tiers with reasons:
- Direct competitors (array of objects with "name", "domain", and "why" - explain why they are a competitor)
- Indirect competitors (array of objects with "name", "domain", and "why")
- Marketplace competitors (array of objects with "name", "domain", and "why")
Return JSON with keys: direct, indirect, marketplaces. Each entry must have "name", "domain" (e.g. "competitor.com"), and "why" (brief explanation of competitive relationship).`,
        
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
        
        channels: `Based on the business model "${context?.business_model || 'B2B'}" and industry "${context?.industry || 'unknown'}":
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

      // Clean up potential JSON issues from AI response
      let cleanedContent = content.trim();
      // Remove markdown code blocks if present
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.slice(7);
      }
      if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();

      try {
        const suggestions = JSON.parse(cleanedContent);
        res.json({ suggestions, model_suggested: true });
      } catch (parseError) {
        console.error("JSON parse error, raw content:", content.substring(0, 500));
        // Return partial suggestions if possible
        res.status(500).json({ 
          error: "AI returned invalid JSON format", 
          partial_content: content.substring(0, 200) 
        });
      }
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

  // Generate random Fortune 500 brand data using Gemini
  app.post("/api/ai/generate-fortune500", async (req: any, res: Response) => {
    try {
      const prompt = `You are a business intelligence expert. Generate data for ONE randomly selected Fortune 500 company.
Pick a real company from the Fortune 500 list (like Apple, Microsoft, Amazon, Walmart, ExxonMobil, UnitedHealth, CVS Health, Berkshire Hathaway, Alphabet, McKesson, etc.).
Make sure to pick a DIFFERENT company each time - be creative and pick from various industries.

Return a JSON object with the following structure:
{
  "name": "Company Name",
  "domain": "company.com",
  "industry": "Industry category",
  "business_model": "B2B" or "DTC" or "Marketplace" or "Hybrid",
  "primary_geography": ["US", "EU", "APAC"],
  "revenue_band": "$XXB - $XXXB",
  "target_market": "Primary market description",
  "competitors": [
    {
      "name": "Competitor Name",
      "domain": "competitor.com",
      "tier": "tier1",
      "revenue_range": "$XXB - $XXXB",
      "why": "Brief reason why this is a competitor"
    }
  ],
  "demand_keywords": {
    "seed_terms": ["brand term 1", "brand term 2", "brand term 3"],
    "category_terms": ["category 1", "category 2"],
    "problem_terms": ["problem 1", "problem 2"]
  },
  "strategic_context": {
    "primary_goal": "Main business objective",
    "growth_priority": "Key growth area",
    "risk_tolerance": "low" or "medium" or "high"
  },
  "channel_context": {
    "paid_media_active": true or false,
    "seo_investment_level": "low" or "medium" or "high",
    "marketplace_dependence": "low" or "medium" or "high"
  },
  "exclusions": {
    "excluded_categories": ["category to exclude 1"],
    "excluded_keywords": ["keyword to exclude 1"],
    "excluded_use_cases": ["use case to exclude"]
  }
}

IMPORTANT: 
- Use REAL, accurate data for the company. The domain, industry, revenue, and competitors should be factual.
- Generate 4-6 real competitors with tier1 being direct competitors, tier2 being adjacent, tier3 being aspirational.
- Include the "why" field explaining why each company is a competitor.
- Generate 2-3 exclusions for categories/keywords/use cases the company would NOT want to be associated with.
- Only return the JSON object, no additional text.`;

      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const content = response.text;
      if (!content) {
        return res.status(500).json({ error: "No response from Gemini" });
      }

      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const brandData = JSON.parse(jsonStr);
      res.json({ brand: brandData, model_suggested: true, provider: "gemini" });
    } catch (error) {
      console.error("Error generating Fortune 500 brand:", error);
      res.status(500).json({ error: "Failed to generate Fortune 500 brand data" });
    }
  });

  // Create bulk generation job
  app.post("/api/bulk/jobs", async (req: any, res: Response) => {
    try {
      const userId = "anonymous-user";
      const result = bulkJobRequestSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ error: validationError.message });
      }

      const job = await storage.createBulkJob(
        userId,
        result.data.primaryCategory,
        result.data.brands
      );

      processBulkJob(job.id, result.data.primaryCategory, result.data.brands);

      res.json(job);
    } catch (error) {
      console.error("Error creating bulk job:", error);
      res.status(500).json({ error: "Failed to create bulk job" });
    }
  });

  // Get all bulk jobs for user
  app.get("/api/bulk/jobs", async (req: any, res: Response) => {
    try {
      const userId = "anonymous-user";
      const jobs = await storage.getBulkJobs(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching bulk jobs:", error);
      res.status(500).json({ error: "Failed to fetch bulk jobs" });
    }
  });

  // Get specific bulk job
  app.get("/api/bulk/jobs/:id", async (req: any, res: Response) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.getBulkJob(jobId);
      
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error("Error fetching bulk job:", error);
      res.status(500).json({ error: "Failed to fetch bulk job" });
    }
  });

  // Context Validation Council endpoint
  app.post("/api/context/validate", async (req: any, res) => {
    try {
      const { configurationId } = req.body;

      if (!configurationId) {
        return res.status(400).json({ error: "configurationId is required" });
      }

      const userId = (req.user as any)?.id || "anonymous-user";
      const config = await storage.getConfigurationById(configurationId, userId);

      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      const versions = await storage.getConfigurationVersions(configurationId, userId);
      const contextVersion = versions?.length || 1;

      // Convert DbConfiguration to Configuration type for validation
      const configForValidation = {
        ...config,
        id: String(config.id),
        created_at: config.created_at.toISOString(),
        updated_at: config.updated_at.toISOString(),
      };
      const validationResult = validateContext(configForValidation, contextVersion);

      res.json(validationResult);
    } catch (error: any) {
      console.error("Error validating context:", error);
      res.status(500).json({ error: error.message || "Failed to validate context" });
    }
  });

  // Approve context (mark as human-approved)
  app.post("/api/context/approve", async (req: any, res) => {
    try {
      const { configurationId } = req.body;

      if (!configurationId) {
        return res.status(400).json({ error: "configurationId is required" });
      }

      const userId = (req.user as any)?.id || "anonymous-user";
      const config = await storage.getConfigurationById(configurationId, userId);

      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      // Update governance with approval timestamp
      const updatedGovernance = {
        ...config.governance,
        context_approved_at: new Date().toISOString(),
        context_approved_by: userId,
        context_approval_status: "approved" as const,
      };

      await storage.updateConfiguration(configurationId, userId, {
        ...config,
        governance: updatedGovernance,
      } as any, "Context approved by user");

      // Create a version snapshot for audit trail
      await storage.createConfigurationVersion(
        configurationId,
        userId,
        "Context approved by user"
      );

      res.json({ 
        success: true, 
        approved_at: updatedGovernance.context_approved_at,
        message: "Context approved successfully"
      });
    } catch (error: any) {
      console.error("Error approving context:", error);
      res.status(500).json({ error: error.message || "Failed to approve context" });
    }
  });

  // FON Module Registry endpoints
  app.get("/api/modules", async (req, res) => {
    try {
      const includeAll = req.query.all === 'true';
      const modules = includeAll ? getAllModules() : getActiveModules();
      res.json({ 
        modules: modules.map(m => ({
          ...m,
          requiredSectionNames: m.requiredSections.map(s => ({ section: s, name: UCR_SECTION_NAMES[s] })),
          optionalSectionNames: m.optionalSections.map(s => ({ section: s, name: UCR_SECTION_NAMES[s] })),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get modules" });
    }
  });

  app.get("/api/modules/:moduleId/validate/:configId", async (req: any, res) => {
    try {
      const { moduleId, configId } = req.params;
      const userId = (req.user as any)?.id || null;
      
      const config = await storage.getConfigurationById(parseInt(configId, 10), userId);
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }
      
      const validation = validateModuleExecution(moduleId, config as any);
      res.json(validation);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to validate module" });
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

  app.post("/api/keyword-gap/analyze", async (req: any, res) => {
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

      const userId = (req.user as any)?.id || null;
      const config = await storage.getConfigurationById(configurationId, userId);

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

  app.post("/api/keyword-gap/compare-all", async (req: any, res) => {
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

      const userId = (req.user as any)?.id || null;
      const config = await storage.getConfigurationById(configurationId, userId);

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

  app.get("/api/keyword-gap-lite/providers", async (req, res) => {
    const statuses = getAllProviderStatuses();
    res.json({ providers: statuses });
  });

  app.post("/api/keyword-gap-lite/run", async (req: any, res) => {
    try {
      const { 
        configurationId, 
        limitPerDomain = 200, 
        locationCode = 2840, 
        languageCode = "en",
        maxCompetitors = 5,
        provider = "dataforseo" as ProviderType,
        forceRefresh = false,
      } = req.body;

      const selectedProvider = getProvider(provider);
      
      if (!selectedProvider.isConfigured()) {
        return res.status(503).json({ 
          error: `${selectedProvider.displayName} credentials not configured.`,
          configured: false,
          provider: provider,
        });
      }

      if (!configurationId) {
        return res.status(400).json({ error: "configurationId is required" });
      }

      const userId = (req.user as any)?.id || "anonymous-user";
      const config = await storage.getConfigurationById(configurationId, userId);

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

      // Convert DbConfiguration to Configuration type for keyword gap analysis
      const configForAnalysis = {
        ...config,
        id: String(config.id),
        created_at: config.created_at.toISOString(),
        updated_at: config.updated_at.toISOString(),
      };
      
      const result = await computeKeywordGap(configForAnalysis, {
        limitPerDomain,
        locationCode,
        languageCode: languageCode === "en" ? "English" : languageCode,
        maxCompetitors,
        provider,
        forceRefresh,
      });

      // Persist the analysis results to database
      // KeywordGapResult has topOpportunities (pass), needsReview, outOfPlay arrays
      const passKeywords = result.topOpportunities || [];
      const reviewKeywords = result.needsReview || [];
      const outOfPlayKeywords = result.outOfPlay || [];

      // Extract top themes from pass keywords (grouped by theme) for summary
      const themeMap = new Map<string, { count: number; totalVolume: number }>();
      passKeywords.forEach((kw: any) => {
        const theme = kw.theme || "other";
        const existing = themeMap.get(theme);
        if (existing) {
          existing.count++;
          existing.totalVolume += kw.volume || 0;
        } else {
          themeMap.set(theme, { count: 1, totalVolume: kw.volume || 0 });
        }
      });
      const topThemes = Array.from(themeMap.entries())
        .map(([theme, data]) => ({ theme, count: data.count, totalVolume: data.totalVolume }))
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, 5);

      // Calculate estimated missing value from stats (if available)
      // Sum volume from pass keywords as proxy for missing value
      const estimatedMissingValue = passKeywords.reduce((sum: number, kw: any) => sum + (kw.volume || 0), 0);

      const savedAnalysis = await storage.createKeywordGapAnalysis({
        userId,
        configurationId: config.id,
        configurationName: config.name,
        domain: brandDomain,
        provider: provider,
        status: "completed",
        totalKeywords: result.totalGapKeywords || 0,
        passCount: passKeywords.length,
        reviewCount: reviewKeywords.length,
        outOfPlayCount: outOfPlayKeywords.length,
        estimatedMissingValue,
        topThemes,
        results: result,
        parameters: {
          limitPerDomain,
          locationCode,
          languageCode,
          maxCompetitors,
          provider,
        },
      });

      // Return results with saved analysis ID
      res.json({
        ...result,
        analysisId: savedAnalysis.id,
        savedAt: savedAnalysis.created_at,
      });
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

  // ============ KEYWORD GAP ANALYSES PERSISTENCE ============

  // Get all saved keyword gap analyses for user
  app.get("/api/keyword-gap-analyses", async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id || "anonymous-user";
      const analyses = await storage.getKeywordGapAnalyses(userId);
      res.json(analyses);
    } catch (error: any) {
      console.error("Error fetching keyword gap analyses:", error);
      res.status(500).json({ error: error.message || "Failed to fetch analyses" });
    }
  });

  // Get single keyword gap analysis by ID
  app.get("/api/keyword-gap-analyses/:id", async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id || "anonymous-user";
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getKeywordGapAnalysisById(id, userId);
      
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error: any) {
      console.error("Error fetching keyword gap analysis:", error);
      res.status(500).json({ error: error.message || "Failed to fetch analysis" });
    }
  });

  // Delete a keyword gap analysis
  app.delete("/api/keyword-gap-analyses/:id", async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id || "anonymous-user";
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      await storage.deleteKeywordGapAnalysis(id, userId);
      res.json({ message: "Analysis deleted" });
    } catch (error: any) {
      console.error("Error deleting keyword gap analysis:", error);
      res.status(500).json({ error: error.message || "Failed to delete analysis" });
    }
  });

  app.post("/api/visibility-report", async (req: any, res) => {
    try {
      if (!checkCredentialsConfigured()) {
        return res.status(503).json({ 
          error: "DataForSEO credentials not configured.",
          configured: false,
        });
      }

      const { 
        configurationId, 
        limitPerDomain = 100, 
        locationCode = 2840,
      } = req.body;

      if (!configurationId) {
        return res.status(400).json({ error: "configurationId is required" });
      }

      const userId = (req.user as any)?.id || "anonymous-user";
      const config = await storage.getConfigurationById(configurationId, userId);

      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      const brandDomain = config.brand?.domain;
      if (!brandDomain) {
        return res.status(400).json({ error: "Configuration has no brand domain defined" });
      }

      const approvedCompetitors = (config.competitors?.competitors || [])
        .filter((c: any) => c.status === "approved")
        .slice(0, 5);

      if (approvedCompetitors.length === 0) {
        return res.status(400).json({ error: "No approved competitors in configuration" });
      }

      const brandKeywords = await getRankedKeywords(brandDomain, locationCode, "English", limitPerDomain);

      const calculateVisibilityMetrics = (keywords: typeof brandKeywords.items) => {
        const top3 = keywords.filter(k => k.position && k.position <= 3).length;
        const top10 = keywords.filter(k => k.position && k.position <= 10).length;
        const top20 = keywords.filter(k => k.position && k.position <= 20).length;
        const top100 = keywords.filter(k => k.position && k.position <= 100).length;
        const notRanking = keywords.filter(k => !k.position || k.position > 100).length;
        
        const rankedKeywords = keywords.filter(k => k.position && k.position <= 100);
        const avgPosition = rankedKeywords.length > 0 
          ? rankedKeywords.reduce((sum, k) => sum + (k.position || 0), 0) / rankedKeywords.length 
          : 0;
        
        const visibilityScore = Math.round(
          ((top3 * 100) + (top10 * 50) + (top20 * 20) + (top100 * 5)) / Math.max(keywords.length, 1)
        );

        return { top3, top10, top20, top100, notRanking, avgPosition: Math.round(avgPosition * 10) / 10, visibilityScore };
      };

      const brandMetrics = calculateVisibilityMetrics(brandKeywords.items);

      const competitorResults = await Promise.all(
        approvedCompetitors.map(async (comp: any) => {
          try {
            const compKeywords = await getRankedKeywords(comp.domain, locationCode, "English", limitPerDomain);
            const metrics = calculateVisibilityMetrics(compKeywords.items);
            return {
              domain: comp.domain,
              name: comp.name,
              totalKeywords: compKeywords.items.length,
              ...metrics,
              success: true,
            };
          } catch (error: any) {
            return {
              domain: comp.domain,
              name: comp.name,
              totalKeywords: 0,
              top3: 0, top10: 0, top20: 0, top100: 0, notRanking: 0,
              avgPosition: 0,
              visibilityScore: 0,
              success: false,
              error: error.message,
            };
          }
        })
      );

      const allKeywords = new Map<string, { 
        keyword: string; 
        searchVolume: number;
        brandPosition: number | null;
        competitorPositions: { domain: string; position: number | null }[];
      }>();

      brandKeywords.items.forEach(k => {
        allKeywords.set(k.keyword.toLowerCase(), {
          keyword: k.keyword,
          searchVolume: k.search_volume || 0,
          brandPosition: k.position || null,
          competitorPositions: [],
        });
      });

      for (const comp of approvedCompetitors) {
        try {
          const compKeywords = await getRankedKeywords(comp.domain, locationCode, "English", limitPerDomain);
          compKeywords.items.forEach(k => {
            const existing = allKeywords.get(k.keyword.toLowerCase());
            if (existing) {
              existing.competitorPositions.push({ domain: comp.domain, position: k.position || null });
            } else {
              allKeywords.set(k.keyword.toLowerCase(), {
                keyword: k.keyword,
                searchVolume: k.search_volume || 0,
                brandPosition: null,
                competitorPositions: [{ domain: comp.domain, position: k.position || null }],
              });
            }
          });
        } catch (error) {
          console.error(`Error fetching keywords for competitor ${comp.domain}:`, error);
        }
      }

      const keywordAnalysis = Array.from(allKeywords.values())
        .map(k => {
          let opportunity: "high" | "medium" | "low" = "low";
          let opportunityReason = "";

          const bestCompPos = Math.min(
            ...k.competitorPositions.filter(p => p.position !== null).map(p => p.position!)
          );

          if (k.brandPosition === null || k.brandPosition > 50) {
            if (bestCompPos <= 10) {
              opportunity = "high";
              opportunityReason = "Competitor ranks top 10, brand missing or weak";
            } else if (bestCompPos <= 30) {
              opportunity = "medium";
              opportunityReason = "Competitor ranks top 30, room to compete";
            }
          } else if (k.brandPosition > 10 && bestCompPos <= 5) {
            opportunity = "medium";
            opportunityReason = "Competitor outranks brand significantly";
          }

          return {
            ...k,
            difficulty: Math.min(100, Math.round((k.searchVolume / 1000) * 10 + Math.random() * 30)),
            opportunity,
            opportunityReason,
          };
        })
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 200);

      const brandAdvantage = keywordAnalysis.filter(k => {
        if (!k.brandPosition) return false;
        const bestComp = Math.min(...k.competitorPositions.filter(p => p.position !== null).map(p => p.position!));
        return k.brandPosition < bestComp;
      }).length;

      const competitorAdvantage = keywordAnalysis.filter(k => {
        if (!k.brandPosition) return true;
        const bestComp = Math.min(...k.competitorPositions.filter(p => p.position !== null).map(p => p.position!));
        return bestComp < k.brandPosition;
      }).length;

      res.json({
        brand: {
          domain: brandDomain,
          name: config.brand?.name || brandDomain,
          totalKeywords: brandKeywords.items.length,
          ...brandMetrics,
        },
        competitors: competitorResults.filter(c => c.success),
        keywordAnalysis,
        summary: {
          totalKeywordsAnalyzed: keywordAnalysis.length,
          brandAdvantage,
          competitorAdvantage,
          sharedKeywords: keywordAnalysis.filter(k => 
            k.brandPosition !== null && k.competitorPositions.some(p => p.position !== null)
          ).length,
          uniqueOpportunities: keywordAnalysis.filter(k => k.opportunity === "high").length,
        },
        contextStatus: config.governance?.context_status || "DRAFT_AI",
        configurationName: config.name,
      });
    } catch (error: any) {
      console.error("Error generating visibility report:", error);
      res.status(500).json({ error: error.message || "Failed to generate visibility report" });
    }
  });

  // ==================== MARKET DEMAND & SEASONALITY ENDPOINTS ====================

  app.get("/api/market-demand/status", async (req: any, res) => {
    try {
      const providers = getAllTrendsProviderStatuses();
      const hasDataForSEOCreds = !!(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
      console.log(`[Market Demand Status] DataForSEO creds present: ${hasDataForSEOCreds}, Providers:`, JSON.stringify(providers));
      res.json({
        available: providers.some(p => p.configured),
        providers,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get market demand status" });
    }
  });

  // Per-category market demand analysis (v2 - Context-First with validation gate)
  app.post("/api/market-demand/analyze-by-category", async (req: any, res) => {
    const userId = (req.user as any)?.id || "anonymous-user";
    const { configurationId, timeRange, countryCode } = req.body;

    if (!configurationId) {
      return res.status(400).json({ error: "configurationId is required" });
    }

    try {
      const config = await storage.getConfigurationById(parseInt(configurationId, 10), userId);
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      const configForAnalyzer = {
        ...config,
        id: String(config.id),
        created_at: config.created_at.toISOString(),
        updated_at: config.updated_at.toISOString(),
      } as any;

      // Context-First: Pre-execution validation gate (always enforced)
      const validationResult = validateModulePreExecution(configForAnalyzer, "market_demand_seasonality");
      
      if (!validationResult.canProceed) {
        console.log("[Market Demand] Validation gate blocked execution:", validationResult.errors);
        return res.status(400).json({
          error: "UCR validation failed",
          validationResult: {
            valid: validationResult.valid,
            contextStatus: validationResult.contextStatus,
            contextVersion: validationResult.contextVersion,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            sectionsValidated: validationResult.sectionsValidated,
            sectionsMissing: validationResult.sectionsMissing,
          },
          trace: generateValidationTrace(validationResult),
        });
      }

      // Log warnings but proceed
      if (validationResult.warnings.length > 0) {
        console.log("[Market Demand] Validation warnings:", validationResult.warnings);
      }

      // Get module defaults from governance
      const moduleDefaults = configForAnalyzer.governance?.module_defaults;
      const effectiveTimeRange = timeRange || moduleDefaults?.default_time_range || "today 5-y";
      const effectiveCountryCode = countryCode || moduleDefaults?.default_geo || "US";
      const effectiveInterval = moduleDefaults?.default_interval || "weekly";

      const result = await marketDemandAnalyzer.analyzeByCategory(configForAnalyzer, {
        timeRange: effectiveTimeRange,
        countryCode: effectiveCountryCode,
        interval: effectiveInterval,
      });

      // Enhance result with Context-First envelope
      const forecastPolicy = validateForecastPolicy(configForAnalyzer);
      const enhancedResult = {
        ...result,
        contextStatus: configForAnalyzer.governance?.context_status || "DRAFT_AI",
        contextVersion: configForAnalyzer.governance?.context_version || 1,
        forecastPolicy: forecastPolicy.policy,
        warnings: result.warnings || [],
      };

      res.json(enhancedResult);
    } catch (error: any) {
      console.error("Error analyzing market demand by category:", error);
      res.status(500).json({ error: error.message || "Failed to analyze market demand" });
    }
  });

  // Legacy aggregated analysis (deprecated - use analyze-by-category instead)
  app.post("/api/market-demand/analyze", async (req: any, res) => {
    const userId = "anonymous-user";
    const { configurationId, timeRange, countryCode, queryGroups, forecastEnabled } = req.body;

    if (!configurationId) {
      return res.status(400).json({ error: "configurationId is required" });
    }

    try {
      const config = await storage.getConfigurationById(parseInt(configurationId, 10), userId);
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      const configForAnalyzer = {
        ...config,
        id: String(config.id),
        created_at: config.created_at.toISOString(),
        updated_at: config.updated_at.toISOString(),
      } as any;

      const result = await marketDemandAnalyzer.analyze(configForAnalyzer, {
        timeRange: timeRange || "today 5-y",
        countryCode: countryCode,
        queryGroups: queryGroups,
        forecastEnabled: forecastEnabled || false,
        interval: "weekly",
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error analyzing market demand:", error);
      res.status(500).json({ error: error.message || "Failed to analyze market demand" });
    }
  });

  app.get("/api/market-demand/:configurationId", async (req: any, res) => {
    const userId = "anonymous-user";
    const configurationId = parseInt(req.params.configurationId, 10);
    if (isNaN(configurationId)) {
      return res.status(400).json({ error: "Invalid configuration ID" });
    }

    try {
      const config = await storage.getConfigurationById(configurationId, userId);
      if (!config) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      const configForAnalyzer = {
        ...config,
        id: String(config.id),
        created_at: config.created_at.toISOString(),
        updated_at: config.updated_at.toISOString(),
      } as any;

      const result = await marketDemandAnalyzer.analyze(configForAnalyzer, {
        timeRange: "today 5-y",
        interval: "weekly",
        forecastEnabled: false,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error getting market demand analysis:", error);
      res.status(500).json({ error: error.message || "Failed to get market demand analysis" });
    }
  });

  // ==================== MARKET DEMAND ANALYSIS SAVED RUNS ====================

  // Save a market demand analysis (supports both v1 legacy and v2 by-category formats)
  app.post("/api/market-demand-analyses", async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id || "anonymous-user";
      const { configurationId, configurationName, results, parameters } = req.body;

      if (!configurationId || !results || !parameters) {
        return res.status(400).json({ error: "configurationId, results, and parameters are required" });
      }

      // Detect if this is a v2 by-category result
      const isByCategoryResult = Array.isArray(results.byCategory) && results.byCategory.length > 0;

      let peakMonth: string | null = null;
      let lowMonth: string | null = null;
      let seasonalityType: string | null = null;
      let yoyTrend: string | null = null;
      let totalKeywords = 0;

      if (isByCategoryResult) {
        // v2 by-category format - use first category's data for summary, count all queries
        const firstSlice = results.byCategory[0];
        peakMonth = firstSlice.peakMonth || null;
        lowMonth = firstSlice.lowMonth || null;
        seasonalityType = firstSlice.consistencyLabel || null;
        yoyTrend = firstSlice.consistencyLabel || null;
        totalKeywords = results.byCategory.reduce((sum: number, cat: any) => sum + (cat.queries?.length || 0), 0);
      } else {
        // v1 legacy format
        const normalizeMonth = (monthStr: string | null | undefined): string | null => {
          if (!monthStr) return null;
          const monthMap: Record<string, string> = {
            'january': 'Jan', 'february': 'Feb', 'march': 'Mar', 'april': 'Apr',
            'may': 'May', 'june': 'Jun', 'july': 'Jul', 'august': 'Aug',
            'september': 'Sep', 'october': 'Oct', 'november': 'Nov', 'december': 'Dec'
          };
          const lower = monthStr.toLowerCase();
          if (monthMap[lower]) return monthMap[lower];
          if (monthStr.length <= 3) return monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase();
          return monthStr;
        };

        const rawPeakMonth = results.seasonality?.peakWindow?.months?.[0] || null;
        peakMonth = normalizeMonth(rawPeakMonth);
        
        if (results.seasonality?.declinePhase?.start) {
          try {
            const declineDate = new Date(results.seasonality.declinePhase.start);
            if (!isNaN(declineDate.getTime())) {
              lowMonth = declineDate.toLocaleString('en-US', { month: 'short' });
            }
          } catch {
            lowMonth = null;
          }
        }
        
        seasonalityType = results.seasonality?.yoyConsistency || null;
        yoyTrend = results.yoyAnalysis?.consistency || null;
        totalKeywords = results.demandCurves?.length || 0;
      }

      const analysis = await storage.createMarketDemandAnalysis({
        userId,
        configurationId,
        configurationName: configurationName || `Analysis ${configurationId}`,
        status: "completed",
        peakMonth,
        lowMonth,
        seasonalityType,
        yoyTrend,
        totalKeywords,
        results,
        parameters,
      });

      res.json(analysis);
    } catch (error: any) {
      console.error("Error saving market demand analysis:", error);
      res.status(500).json({ error: error.message || "Failed to save analysis" });
    }
  });

  // Get all saved market demand analyses for user
  app.get("/api/market-demand-analyses", async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id || "anonymous-user";
      const analyses = await storage.getMarketDemandAnalyses(userId);
      res.json(analyses);
    } catch (error: any) {
      console.error("Error fetching market demand analyses:", error);
      res.status(500).json({ error: error.message || "Failed to fetch analyses" });
    }
  });

  // Get single market demand analysis by ID
  app.get("/api/market-demand-analyses/:id", async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id || "anonymous-user";
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getMarketDemandAnalysisById(id, userId);
      
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error: any) {
      console.error("Error fetching market demand analysis:", error);
      res.status(500).json({ error: error.message || "Failed to fetch analysis" });
    }
  });

  // Delete a market demand analysis
  app.delete("/api/market-demand-analyses/:id", async (req: any, res) => {
    try {
      const userId = (req.user as any)?.id || "anonymous-user";
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      await storage.deleteMarketDemandAnalysis(id, userId);
      res.json({ message: "Analysis deleted" });
    } catch (error: any) {
      console.error("Error deleting market demand analysis:", error);
      res.status(500).json({ error: error.message || "Failed to delete analysis" });
    }
  });

  return httpServer;
}

async function processBulkJob(
  jobId: number,
  primaryCategory: string,
  brands: BulkBrandInput[]
) {
  const limit = pLimit(3);
  const results: InsertConfiguration[] = [];
  const errors: { domain: string; error: string }[] = [];
  let completed = 0;
  let failed = 0;

  await storage.updateBulkJob(jobId, { status: "processing" });

  const tasks = brands.map((brand) =>
    limit(async () => {
      try {
        const config = await generateCompleteConfiguration(
          brand.domain,
          brand.name,
          primaryCategory
        );
        results.push(config);
        completed++;
        
        await storage.updateBulkJob(jobId, {
          completedBrands: completed,
          results: results,
        });
      } catch (error: any) {
        failed++;
        errors.push({
          domain: brand.domain,
          error: error.message || "Unknown error",
        });
        
        await storage.updateBulkJob(jobId, {
          failedBrands: failed,
          errors: errors,
        });
      }
    })
  );

  await Promise.all(tasks);

  await storage.updateBulkJob(jobId, {
    status: "completed",
    completedBrands: completed,
    failedBrands: failed,
    results: results,
    errors: errors,
  });
}
