import { Router, Request, Response } from "express";
import { tenantStorage } from "./tenant-storage";
import { insertTenantSchema, type InsertTenant, defaultConfiguration } from "@shared/schema";
import { isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

// Development mode: bypass auth when OIDC is not configured
const isDev = process.env.NODE_ENV === 'development' || !process.env.REPL_ID;
const DEV_USER_ID = 'dev-user-local';

// Initialize AI clients (OpenAI and Gemini)
let openai: OpenAI | null = null;
let gemini: GoogleGenerativeAI | null = null;

try {
  // Try to initialize OpenAI first
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    });
  }
  
  // Try to initialize Gemini if OpenAI is not available
  if (!openai && process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  
  if (!openai && !gemini) {
    console.log("⚠️ No AI API Key found for tenant AI generation. Please set either OPENAI_API_KEY or GEMINI_API_KEY in .env");
  }
} catch (e) {
  console.warn("AI not available for tenant AI generation");
}

// Helper function to generate AI responses using either OpenAI or Gemini
async function generateAIResponse(systemPrompt: string, userPrompt: string, maxTokens: number = 1000): Promise<string> {
  // Try OpenAI first
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: maxTokens,
      });
      
      const content = response.choices[0]?.message?.content;
      if (content) {
        return content;
      }
    } catch (error) {
      console.error("OpenAI generation error:", error);
    }
  }
  
  // Fallback to Gemini
  if (gemini) {
    try {
      const model = gemini.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const result = await model.generateContent([
        systemPrompt,
        userPrompt
      ]);
      
      const response = await result.response;
      const text = response.text();
      
      if (text) {
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[^]*\}/);
        if (jsonMatch) {
          return jsonMatch[0];
        }
        return text;
      }
    } catch (error) {
      console.error("Gemini generation error:", error);
    }
  }
  
  throw new Error("No AI provider available or all providers failed");
}

// Async function to generate AI content for a new configuration
async function triggerAIGeneration(
  configId: number,
  tenantId: number,
  userId: string,
  brandName: string,
  domain: string
): Promise<void> {
  if (!openai && !gemini) {
    console.log("⚠️ No AI API Key found, skipping AI generation for tenant");
    return;
  }

  console.log(`🤖 Starting AI generation for brand: ${brandName} (${domain})`);

  try {
    const systemPrompt = `You are an expert marketing intelligence consultant. Generate a complete brand intelligence configuration for the given brand. Return a JSON object with these sections:
1. brand: industry, business_model (B2B/DTC/Marketplace/Hybrid), primary_geography (array), revenue_band, target_market
2. category_definition: primary_category, included (array), excluded (array)
3. competitors: direct (array of company names), indirect (array), marketplaces (array)
4. demand_definition: brand_keywords.seed_terms (array), non_brand_keywords.category_terms (array), non_brand_keywords.problem_terms (array)
5. strategic_intent: growth_priority, risk_tolerance (low/medium/high), primary_goal, secondary_goals (array)
6. channel_context: paid_media_active (boolean), seo_investment_level (low/medium/high), marketplace_dependence (low/medium/high)
7. negative_scope: excluded_categories (array), excluded_keywords (array)`;

    const userPrompt = `Generate a complete brand intelligence configuration for:
- Brand Name: ${brandName}
- Domain: ${domain}

Research this brand and provide realistic, data-driven information.`;

    const content = await generateAIResponse(systemPrompt, userPrompt, 3000);
    
    if (!content) {
      console.error("No AI response received");
      return;
    }

    const generated = JSON.parse(content);
    
    // Get current config and merge with AI-generated data
    const currentConfig = await storage.getConfigurationById(configId, tenantId, userId);
    if (!currentConfig) {
      console.error("Configuration not found");
      return;
    }

    // Update configuration with AI-generated data
    const updatedConfig = {
      ...currentConfig,
      brand: {
        ...currentConfig.brand,
        ...generated.brand,
      },
      category_definition: {
        ...currentConfig.category_definition,
        ...generated.category_definition,
      },
      competitors: {
        ...currentConfig.competitors,
        ...generated.competitors,
      },
      demand_definition: {
        ...currentConfig.demand_definition,
        ...generated.demand_definition,
      },
      strategic_intent: {
        ...currentConfig.strategic_intent,
        ...generated.strategic_intent,
      },
      channel_context: {
        ...currentConfig.channel_context,
        ...generated.channel_context,
      },
      negative_scope: {
        ...currentConfig.negative_scope,
        ...generated.negative_scope,
      },
      governance: {
        ...currentConfig.governance,
        model_suggested: true,
        last_reviewed: new Date().toISOString().split('T')[0],
        reviewed_by: "AI Generator",
      },
    };

    // Save updated configuration
    await storage.updateConfiguration(configId, tenantId, userId, updatedConfig, "AI-generated updates");
    
    console.log(`✅ AI generation completed for config ${configId}`);
  } catch (error) {
    console.error("AI generation failed:", error);
  }
}

// Register tenant routes
export function registerTenantRoutes(app: Router) {
  // Create tenant
  app.post("/api/tenants", async (req: Request, res: Response) => {
    try {
      const userId = isDev ? DEV_USER_ID : (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const result = insertTenantSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const tenant = await tenantStorage.createTenant(userId, result.data);
      
      // Create default configuration for new tenant
      const config = await storage.createConfiguration(
        tenant.id,
        userId,
        defaultConfiguration
      );
      
      // Trigger AI generation for new tenant
      if (result.data.name && result.data.slug) {
        triggerAIGeneration(
          config.id,
          tenant.id,
          userId,
          result.data.name,
          `${result.data.slug}.com`
        ).catch(console.error);
      }
      
      res.status(201).json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  // Get all tenants for user
  app.get("/api/tenants", async (req: Request, res: Response) => {
    try {
      const userId = isDev ? DEV_USER_ID : (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const tenants = await tenantStorage.getTenantsForUser(userId);
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  // Get tenant by ID
  app.get("/api/tenants/:id", async (req: Request, res: Response) => {
    try {
      const userId = isDev ? DEV_USER_ID : (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid tenant ID" });
      }

      const tenant = await tenantStorage.getTenantById(id, userId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  // Update tenant
  app.put("/api/tenants/:id", async (req: Request, res: Response) => {
    try {
      const userId = isDev ? DEV_USER_ID : (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid tenant ID" });
      }

      const result = insertTenantSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.message });
      }

      const tenant = await tenantStorage.updateTenant(id, userId, result.data);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  // Delete tenant
  app.delete("/api/tenants/:id", async (req: Request, res: Response) => {
    try {
      const userId = isDev ? DEV_USER_ID : (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid tenant ID" });
      }

      await tenantStorage.deleteTenant(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  });

  // Set default tenant
  app.post("/api/tenants/:id/set-default", async (req: Request, res: Response) => {
    try {
      const userId = isDev ? DEV_USER_ID : (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid tenant ID" });
      }

      await tenantStorage.setDefaultTenant(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting default tenant:", error);
      res.status(500).json({ error: "Failed to set default tenant" });
    }
  });

  // Get tenant status
  app.get("/api/tenants/:id/status", async (req: Request, res: Response) => {
    try {
      const userId = isDev ? DEV_USER_ID : (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid tenant ID" });
      }

      const tenant = await tenantStorage.getTenantById(id, userId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Get configuration status
      const configs = await storage.getAllConfigurations(id, userId);
      const hasConfig = configs.length > 0;
      const hasCompleteConfig = configs.some(config => 
        config.governance?.validation_status === "complete" || 
        config.governance?.validation_status === "needs_review"
      );

      res.json({
        tenant,
        hasConfig,
        hasCompleteConfig,
        configCount: configs.length,
      });
    } catch (error) {
      console.error("Error fetching tenant status:", error);
      res.status(500).json({ error: "Failed to fetch tenant status" });
    }
  });
}

export default router;
