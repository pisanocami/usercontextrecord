import { Router, Request, Response } from "express";
import { tenantStorage } from "./tenant-storage";
import { insertTenantSchema, type InsertTenant, defaultConfiguration } from "@shared/schema";
import { isAuthenticated } from "./replit_integrations/auth";
import { storage } from "./storage";
import OpenAI from "openai";

const router = Router();

// Development mode: bypass auth when OIDC is not configured
const isDev = process.env.NODE_ENV === 'development' || !process.env.REPL_ID;
const DEV_USER_ID = 'dev-user-local';

// Initialize OpenAI for AI generation
let openai: OpenAI | null = null;
try {
  if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    });
  }
} catch (e) {
  console.warn("OpenAI not available for tenant AI generation");
}

// Async function to generate AI content for a new configuration
async function triggerAIGeneration(
  configId: number,
  tenantId: number,
  userId: string,
  brandName: string,
  domain: string
): Promise<void> {
  if (!openai) {
    console.log("⚠️ OpenAI not configured, skipping AI generation for tenant");
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("No AI response received");
      return;
    }

    const generated = JSON.parse(content);
    
    // Get current config and merge with AI-generated data
    const currentConfig = await storage.getConfigurationById(configId, tenantId, userId);
    if (!currentConfig) {
      console.error("Configuration not found for AI update");
      return;
    }

    const updatedConfig = {
      ...currentConfig,
      brand: {
        ...currentConfig.brand,
        industry: generated.brand?.industry || currentConfig.brand.industry,
        business_model: generated.brand?.business_model || currentConfig.brand.business_model,
        primary_geography: generated.brand?.primary_geography || currentConfig.brand.primary_geography,
        revenue_band: generated.brand?.revenue_band || currentConfig.brand.revenue_band,
        target_market: generated.brand?.target_market || currentConfig.brand.target_market,
      },
      category_definition: {
        ...currentConfig.category_definition,
        primary_category: generated.category_definition?.primary_category || "",
        included: generated.category_definition?.included || [],
        excluded: generated.category_definition?.excluded || [],
      },
      competitors: {
        ...currentConfig.competitors,
        direct: generated.competitors?.direct || [],
        indirect: generated.competitors?.indirect || [],
        marketplaces: generated.competitors?.marketplaces || [],
      },
      demand_definition: {
        brand_keywords: {
          seed_terms: generated.demand_definition?.brand_keywords?.seed_terms || [],
          top_n: 20,
        },
        non_brand_keywords: {
          category_terms: generated.demand_definition?.non_brand_keywords?.category_terms || [],
          problem_terms: generated.demand_definition?.non_brand_keywords?.problem_terms || [],
          top_n: 50,
        },
      },
      strategic_intent: {
        ...currentConfig.strategic_intent,
        growth_priority: generated.strategic_intent?.growth_priority || "",
        risk_tolerance: generated.strategic_intent?.risk_tolerance || "medium",
        primary_goal: generated.strategic_intent?.primary_goal || "",
        secondary_goals: generated.strategic_intent?.secondary_goals || [],
      },
      channel_context: {
        paid_media_active: generated.channel_context?.paid_media_active ?? false,
        seo_investment_level: generated.channel_context?.seo_investment_level || "medium",
        marketplace_dependence: generated.channel_context?.marketplace_dependence || "low",
      },
      negative_scope: {
        ...currentConfig.negative_scope,
        excluded_categories: generated.negative_scope?.excluded_categories || [],
        excluded_keywords: generated.negative_scope?.excluded_keywords || [],
      },
      governance: {
        ...currentConfig.governance,
        model_suggested: true,
      },
    };

    await storage.updateConfiguration(configId, tenantId, userId, updatedConfig, "AI auto-generation on tenant creation");
    console.log(`✅ AI generation completed for brand: ${brandName}`);
  } catch (error: unknown) {
    console.error("AI generation error:", error);
  }
}

router.get("/tenants", async (req: Request, res: Response) => {
  try {
    let userId: string;
    
    if (isDev) {
      userId = DEV_USER_ID;
    } else {
      const user = req.user as any;
      userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    
    const userTenants = await tenantStorage.getUserTenants(userId);
    res.json(userTenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

router.get("/tenants/default", async (req: Request, res: Response) => {
  try {
    let userId: string;
    
    if (isDev) {
      userId = DEV_USER_ID;
    } else {
      const user = req.user as any;
      userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    
    const defaultTenant = await tenantStorage.getDefaultTenant(userId);
    if (!defaultTenant) {
      return res.status(404).json({ error: "No default tenant found" });
    }
    
    res.json(defaultTenant);
  } catch (error) {
    console.error("Error fetching default tenant:", error);
    res.status(500).json({ error: "Failed to fetch default tenant" });
  }
});

router.post("/tenants", async (req: Request, res: Response) => {
  try {
    let userId: string;
    
    if (isDev) {
      userId = DEV_USER_ID;
    } else {
      const user = req.user as any;
      userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    
    const parsed = insertTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }
    
    const existing = await tenantStorage.getTenantBySlug(parsed.data.slug);
    if (existing) {
      return res.status(400).json({ error: "A tenant with this slug already exists" });
    }
    
    const tenant = await tenantStorage.createTenant(parsed.data);
    
    await tenantStorage.addUserToTenant({
      userId,
      tenantId: tenant.id,
      role: "owner",
      isDefault: true,
    });
    
    // Create a default configuration for this tenant with brand data
    const domain = parsed.data.slug + ".com";
    const configData = {
      ...defaultConfiguration,
      name: parsed.data.name,
      brand: {
        ...defaultConfiguration.brand,
        name: parsed.data.name,
        domain: domain,
      },
    };
    
    const configuration = await storage.saveConfiguration(tenant.id, userId, configData);
    
    // Respond immediately, then trigger AI generation in background
    res.status(201).json({ ...tenant, configuration, aiGenerationPending: true });
    
    // Trigger AI generation asynchronously (don't await)
    triggerAIGeneration(configuration.id, tenant.id, userId, parsed.data.name, domain).catch(err => {
      console.error("Background AI generation failed:", err);
    });
  } catch (error) {
    console.error("Error creating tenant:", error);
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

router.get("/tenants/:id", async (req: Request, res: Response) => {
  try {
    let userId: string;
    const tenantId = parseInt(req.params.id);
    
    if (isDev) {
      userId = DEV_USER_ID;
    } else {
      const user = req.user as any;
      userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    
    if (isNaN(tenantId)) {
      return res.status(400).json({ error: "Invalid tenant ID" });
    }
    
    const isUserInTenant = await tenantStorage.isUserInTenant(userId, tenantId);
    if (!isUserInTenant) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const tenant = await tenantStorage.getTenantById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    
    res.json(tenant);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ error: "Failed to fetch tenant" });
  }
});

router.patch("/tenants/:id", async (req: Request, res: Response) => {
  try {
    let userId: string;
    const tenantId = parseInt(req.params.id);
    
    if (isDev) {
      userId = DEV_USER_ID;
    } else {
      const user = req.user as any;
      userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    
    if (isNaN(tenantId)) {
      return res.status(400).json({ error: "Invalid tenant ID" });
    }
    
    const isUserInTenant = await tenantStorage.isUserInTenant(userId, tenantId);
    if (!isUserInTenant) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const updateData: Partial<InsertTenant> = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.logoUrl !== undefined) updateData.logoUrl = req.body.logoUrl;
    if (req.body.primaryColor) updateData.primaryColor = req.body.primaryColor;
    
    const tenant = await tenantStorage.updateTenant(tenantId, updateData);
    res.json(tenant);
  } catch (error) {
    console.error("Error updating tenant:", error);
    res.status(500).json({ error: "Failed to update tenant" });
  }
});

router.post("/tenants/:id/set-default", async (req: Request, res: Response) => {
  try {
    let userId: string;
    const tenantId = parseInt(req.params.id);
    
    if (isDev) {
      userId = DEV_USER_ID;
    } else {
      const user = req.user as any;
      userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    
    if (isNaN(tenantId)) {
      return res.status(400).json({ error: "Invalid tenant ID" });
    }
    
    const isUserInTenant = await tenantStorage.isUserInTenant(userId, tenantId);
    if (!isUserInTenant) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await tenantStorage.setDefaultTenant(userId, tenantId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error setting default tenant:", error);
    res.status(500).json({ error: "Failed to set default tenant" });
  }
});

router.delete("/tenants/:id", async (req: Request, res: Response) => {
  try {
    let userId: string;
    const tenantId = parseInt(req.params.id);
    
    if (isDev) {
      userId = DEV_USER_ID;
    } else {
      const user = req.user as any;
      userId = user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }
    
    if (isNaN(tenantId)) {
      return res.status(400).json({ error: "Invalid tenant ID" });
    }
    
    const userTenants = await tenantStorage.getUserTenants(userId);
    const userTenant = userTenants.find(ut => ut.tenantId === tenantId);
    
    if (!userTenant || userTenant.role !== "owner") {
      return res.status(403).json({ error: "Only owners can delete tenants" });
    }
    
    await tenantStorage.deleteTenant(tenantId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    res.status(500).json({ error: "Failed to delete tenant" });
  }
});

export function registerTenantRoutes(app: Router) {
  app.use("/api", router);
}
