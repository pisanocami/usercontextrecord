import { Router, Request, Response } from "express";
import { tenantStorage } from "./tenant-storage";
import { insertTenantSchema, type InsertTenant } from "@shared/schema";
import { isAuthenticated } from "./replit_integrations/auth";

const router = Router();

router.get("/tenants", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const userTenants = await tenantStorage.getUserTenants(userId);
    res.json(userTenants);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

router.get("/tenants/default", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
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

router.post("/tenants", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
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
    
    res.status(201).json(tenant);
  } catch (error) {
    console.error("Error creating tenant:", error);
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

router.get("/tenants/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user.claims?.sub;
    const tenantId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
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

router.patch("/tenants/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user.claims?.sub;
    const tenantId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
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

router.post("/tenants/:id/set-default", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user.claims?.sub;
    const tenantId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
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

router.delete("/tenants/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user.claims?.sub;
    const tenantId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
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
