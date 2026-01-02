import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertConfigurationSchema, defaultConfiguration, bulkJobRequestSchema, type InsertConfiguration, type BulkBrandInput } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import OpenAI from "openai";
import pLimit from "p-limit";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

  return {
    name: generated.brand?.name || brandName || domain,
    brand: {
      name: generated.brand?.name || brandName || domain,
      domain: domain,
      industry: generated.brand?.industry || primaryCategory,
      business_model: generated.brand?.business_model || "B2B",
      primary_geography: generated.brand?.primary_geography || ["US"],
      revenue_band: generated.brand?.revenue_band || "Unknown",
    },
    category_definition: {
      primary_category: primaryCategory,
      included: generated.category_definition?.included || [],
      excluded: generated.category_definition?.excluded || [],
    },
    competitors: {
      direct: generated.competitors?.direct || [],
      indirect: generated.competitors?.indirect || [],
      marketplaces: generated.competitors?.marketplaces || [],
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
      enforcement_rules: {
        hard_exclusion: true,
        allow_model_suggestion: true,
        require_human_override_for_expansion: true,
      },
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

  // Create new configuration
  app.post("/api/configurations", async (req: any, res) => {
    try {
      const userId = "anonymous-user";
      
      const result = insertConfigurationSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ error: validationError.message });
      }
      
      const config = await storage.createConfiguration(userId, result.data);
      res.json(config);
    } catch (error) {
      console.error("Error creating configuration:", error);
      res.status(500).json({ error: "Failed to create configuration" });
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
      
      const config = await storage.updateConfiguration(id, userId, result.data, editReason.trim());
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
