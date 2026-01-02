import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertConfigurationSchema, defaultConfiguration } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

  return httpServer;
}
