import { db } from "./db";
import { configurations, bulkJobs, configurationVersions, brands } from "@shared/schema";
import { eq, and, desc, max } from "drizzle-orm";
import type {
  Brand,
  CategoryDefinition,
  Competitors,
  DemandDefinition,
  StrategicIntent,
  ChannelContext,
  NegativeScope,
  Governance,
  InsertConfiguration,
  BulkJob,
  BulkBrandInput,
  ConfigurationVersion,
  BrandEntity,
  InsertBrandEntity,
} from "@shared/schema";

// Database brand type (global brand entity)
export interface DbBrand {
  id: number;
  userId: string;
  domain: string;
  name: string;
  industry: string;
  business_model: string;
  primary_geography: string[];
  revenue_band: string;
  target_market: string;
  created_at: Date;
  updated_at: Date;
}

// Database configuration type (includes userId for security)
export interface DbConfiguration {
  id: number;
  userId: string;
  brandId?: number | null;
  name: string;
  brand: Brand;
  category_definition: CategoryDefinition;
  competitors: Competitors;
  demand_definition: DemandDefinition;
  strategic_intent: StrategicIntent;
  channel_context: ChannelContext;
  negative_scope: NegativeScope;
  governance: Governance;
  created_at: Date;
  updated_at: Date;
}

export interface IStorage {
  // Brand CRUD operations
  getBrands(userId: string): Promise<DbBrand[]>;
  getBrandById(id: number, userId: string): Promise<DbBrand | undefined>;
  getBrandByDomain(userId: string, domain: string): Promise<DbBrand | undefined>;
  createBrand(userId: string, brand: InsertBrandEntity): Promise<DbBrand>;
  updateBrand(id: number, userId: string, brand: Partial<InsertBrandEntity>): Promise<DbBrand>;
  deleteBrand(id: number, userId: string): Promise<void>;
  getConfigurationsByBrand(brandId: number, userId: string): Promise<DbConfiguration[]>;
  // Configuration operations
  getConfiguration(userId: string): Promise<DbConfiguration | undefined>;
  getConfigurationById(id: number, userId?: string): Promise<DbConfiguration | undefined>;
  getAllConfigurations(userId: string): Promise<DbConfiguration[]>;
  saveConfiguration(userId: string, config: InsertConfiguration): Promise<DbConfiguration>;
  createConfiguration(userId: string, config: InsertConfiguration): Promise<DbConfiguration>;
  updateConfiguration(id: number, userId: string, config: InsertConfiguration, editReason: string): Promise<DbConfiguration>;
  deleteConfiguration(id: number, userId: string): Promise<void>;
  createBulkJob(userId: string, primaryCategory: string, brands: BulkBrandInput[]): Promise<BulkJob>;
  getBulkJob(id: number): Promise<BulkJob | undefined>;
  getBulkJobs(userId: string): Promise<BulkJob[]>;
  updateBulkJob(id: number, updates: Partial<BulkJob>): Promise<BulkJob>;
  createConfigurationVersion(configId: number, userId: string, changeSummary: string): Promise<ConfigurationVersion>;
  getConfigurationVersions(configId: number, userId: string): Promise<ConfigurationVersion[]>;
  getConfigurationVersion(versionId: number, userId: string): Promise<ConfigurationVersion | undefined>;
  restoreConfigurationVersion(versionId: number, userId: string): Promise<DbConfiguration>;
}

export class DatabaseStorage implements IStorage {
  // ============ BRAND CRUD OPERATIONS ============
  
  async getBrands(userId: string): Promise<DbBrand[]> {
    const results = await db
      .select()
      .from(brands)
      .where(eq(brands.userId, userId))
      .orderBy(desc(brands.updated_at));
    
    return results.map(b => ({
      id: b.id,
      userId: b.userId,
      domain: b.domain,
      name: b.name || "",
      industry: b.industry || "",
      business_model: b.business_model || "B2B",
      primary_geography: (b.primary_geography as string[]) || [],
      revenue_band: b.revenue_band || "",
      target_market: b.target_market || "",
      created_at: b.created_at,
      updated_at: b.updated_at,
    }));
  }

  async getBrandById(id: number, userId: string): Promise<DbBrand | undefined> {
    const [brand] = await db
      .select()
      .from(brands)
      .where(and(eq(brands.id, id), eq(brands.userId, userId)))
      .limit(1);
    
    if (!brand) return undefined;
    
    return {
      id: brand.id,
      userId: brand.userId,
      domain: brand.domain,
      name: brand.name || "",
      industry: brand.industry || "",
      business_model: brand.business_model || "B2B",
      primary_geography: (brand.primary_geography as string[]) || [],
      revenue_band: brand.revenue_band || "",
      target_market: brand.target_market || "",
      created_at: brand.created_at,
      updated_at: brand.updated_at,
    };
  }

  async getBrandByDomain(userId: string, domain: string): Promise<DbBrand | undefined> {
    const normalizedDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
    
    // Get all brands for user and find matching domain (case-insensitive, normalized)
    const allBrands = await db
      .select()
      .from(brands)
      .where(eq(brands.userId, userId));
    
    const found = allBrands.find(b => {
      const bDomain = b.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
      return bDomain === normalizedDomain;
    });
    
    if (!found) return undefined;
    
    return {
      id: found.id,
      userId: found.userId,
      domain: found.domain,
      name: found.name || "",
      industry: found.industry || "",
      business_model: found.business_model || "B2B",
      primary_geography: (found.primary_geography as string[]) || [],
      revenue_band: found.revenue_band || "",
      target_market: found.target_market || "",
      created_at: found.created_at,
      updated_at: found.updated_at,
    };
  }

  async createBrand(userId: string, brandData: InsertBrandEntity): Promise<DbBrand> {
    const [created] = await db
      .insert(brands)
      .values({
        userId,
        domain: brandData.domain,
        name: brandData.name || "",
        industry: brandData.industry || "",
        business_model: brandData.business_model || "B2B",
        primary_geography: brandData.primary_geography || [],
        revenue_band: brandData.revenue_band || "",
        target_market: brandData.target_market || "",
      })
      .returning();
    
    return {
      id: created.id,
      userId: created.userId,
      domain: created.domain,
      name: created.name || "",
      industry: created.industry || "",
      business_model: created.business_model || "B2B",
      primary_geography: (created.primary_geography as string[]) || [],
      revenue_band: created.revenue_band || "",
      target_market: created.target_market || "",
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  async updateBrand(id: number, userId: string, brandData: Partial<InsertBrandEntity>): Promise<DbBrand> {
    const [updated] = await db
      .update(brands)
      .set({
        ...brandData,
        updated_at: new Date(),
      })
      .where(and(eq(brands.id, id), eq(brands.userId, userId)))
      .returning();
    
    if (!updated) {
      throw new Error("Brand not found or access denied");
    }
    
    return {
      id: updated.id,
      userId: updated.userId,
      domain: updated.domain,
      name: updated.name || "",
      industry: updated.industry || "",
      business_model: updated.business_model || "B2B",
      primary_geography: (updated.primary_geography as string[]) || [],
      revenue_band: updated.revenue_band || "",
      target_market: updated.target_market || "",
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async deleteBrand(id: number, userId: string): Promise<void> {
    await db.delete(brands).where(and(eq(brands.id, id), eq(brands.userId, userId)));
  }

  async getConfigurationsByBrand(brandId: number, userId: string): Promise<DbConfiguration[]> {
    const results = await db
      .select()
      .from(configurations)
      .where(and(eq(configurations.brandId, brandId), eq(configurations.userId, userId)))
      .orderBy(desc(configurations.updated_at));
    
    return results.map(config => ({
      id: config.id,
      userId: config.userId,
      brandId: config.brandId,
      name: config.name,
      brand: config.brand as Brand,
      category_definition: config.category_definition as CategoryDefinition,
      competitors: config.competitors as Competitors,
      demand_definition: config.demand_definition as DemandDefinition,
      strategic_intent: config.strategic_intent as StrategicIntent,
      channel_context: config.channel_context as ChannelContext,
      negative_scope: config.negative_scope as NegativeScope,
      governance: config.governance as Governance,
      created_at: config.created_at,
      updated_at: config.updated_at,
    }));
  }

  // ============ CONFIGURATION OPERATIONS ============
  
  async getConfiguration(userId: string): Promise<DbConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(configurations)
      .where(eq(configurations.userId, userId))
      .limit(1);
    
    if (!config) return undefined;
    
    return {
      id: config.id,
      userId: config.userId,
      name: config.name,
      brand: config.brand as Brand,
      category_definition: config.category_definition as CategoryDefinition,
      competitors: config.competitors as Competitors,
      demand_definition: config.demand_definition as DemandDefinition,
      strategic_intent: config.strategic_intent as StrategicIntent,
      channel_context: config.channel_context as ChannelContext,
      negative_scope: config.negative_scope as NegativeScope,
      governance: config.governance as Governance,
      created_at: config.created_at,
      updated_at: config.updated_at,
    };
  }

  async saveConfiguration(userId: string, insertConfig: InsertConfiguration): Promise<DbConfiguration> {
    const existing = await this.getConfiguration(userId);
    
    if (existing) {
      const [updated] = await db
        .update(configurations)
        .set({
          name: insertConfig.name,
          brand: insertConfig.brand,
          category_definition: insertConfig.category_definition,
          competitors: insertConfig.competitors,
          demand_definition: insertConfig.demand_definition,
          strategic_intent: insertConfig.strategic_intent,
          channel_context: insertConfig.channel_context,
          negative_scope: insertConfig.negative_scope,
          governance: insertConfig.governance,
          updated_at: new Date(),
        })
        .where(eq(configurations.id, existing.id))
        .returning();
      
      return {
        id: updated.id,
        userId: updated.userId,
        name: updated.name,
        brand: updated.brand as Brand,
        category_definition: updated.category_definition as CategoryDefinition,
        competitors: updated.competitors as Competitors,
        demand_definition: updated.demand_definition as DemandDefinition,
        strategic_intent: updated.strategic_intent as StrategicIntent,
        channel_context: updated.channel_context as ChannelContext,
        negative_scope: updated.negative_scope as NegativeScope,
        governance: updated.governance as Governance,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      };
    }
    
    const [created] = await db
      .insert(configurations)
      .values({
        userId,
        name: insertConfig.name,
        brand: insertConfig.brand,
        category_definition: insertConfig.category_definition,
        competitors: insertConfig.competitors,
        demand_definition: insertConfig.demand_definition,
        strategic_intent: insertConfig.strategic_intent,
        channel_context: insertConfig.channel_context,
        negative_scope: insertConfig.negative_scope,
        governance: insertConfig.governance,
      })
      .returning();
    
    return {
      id: created.id,
      userId: created.userId,
      name: created.name,
      brand: created.brand as Brand,
      category_definition: created.category_definition as CategoryDefinition,
      competitors: created.competitors as Competitors,
      demand_definition: created.demand_definition as DemandDefinition,
      strategic_intent: created.strategic_intent as StrategicIntent,
      channel_context: created.channel_context as ChannelContext,
      negative_scope: created.negative_scope as NegativeScope,
      governance: created.governance as Governance,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  async getConfigurationById(id: number, userId?: string): Promise<DbConfiguration | undefined> {
    const conditions = userId 
      ? and(eq(configurations.id, id), eq(configurations.userId, userId))
      : eq(configurations.id, id);
    
    const [config] = await db
      .select()
      .from(configurations)
      .where(conditions)
      .limit(1);
    
    if (!config) return undefined;
    
    return {
      id: config.id,
      userId: config.userId,
      name: config.name,
      brand: config.brand as Brand,
      category_definition: config.category_definition as CategoryDefinition,
      competitors: config.competitors as Competitors,
      demand_definition: config.demand_definition as DemandDefinition,
      strategic_intent: config.strategic_intent as StrategicIntent,
      channel_context: config.channel_context as ChannelContext,
      negative_scope: config.negative_scope as NegativeScope,
      governance: config.governance as Governance,
      created_at: config.created_at,
      updated_at: config.updated_at,
    };
  }

  async getAllConfigurations(userId: string): Promise<DbConfiguration[]> {
    const configs = await db
      .select()
      .from(configurations)
      .where(eq(configurations.userId, userId))
      .orderBy(desc(configurations.updated_at));
    
    return configs.map(config => ({
      id: config.id,
      userId: config.userId,
      name: config.name,
      brand: config.brand as Brand,
      category_definition: config.category_definition as CategoryDefinition,
      competitors: config.competitors as Competitors,
      demand_definition: config.demand_definition as DemandDefinition,
      strategic_intent: config.strategic_intent as StrategicIntent,
      channel_context: config.channel_context as ChannelContext,
      negative_scope: config.negative_scope as NegativeScope,
      governance: config.governance as Governance,
      created_at: config.created_at,
      updated_at: config.updated_at,
    }));
  }

  async createConfiguration(userId: string, insertConfig: InsertConfiguration): Promise<DbConfiguration> {
    const [created] = await db
      .insert(configurations)
      .values({
        userId,
        name: insertConfig.name,
        brand: insertConfig.brand,
        category_definition: insertConfig.category_definition,
        competitors: insertConfig.competitors,
        demand_definition: insertConfig.demand_definition,
        strategic_intent: insertConfig.strategic_intent,
        channel_context: insertConfig.channel_context,
        negative_scope: insertConfig.negative_scope,
        governance: insertConfig.governance,
      })
      .returning();
    
    return {
      id: created.id,
      userId: created.userId,
      name: created.name,
      brand: created.brand as Brand,
      category_definition: created.category_definition as CategoryDefinition,
      competitors: created.competitors as Competitors,
      demand_definition: created.demand_definition as DemandDefinition,
      strategic_intent: created.strategic_intent as StrategicIntent,
      channel_context: created.channel_context as ChannelContext,
      negative_scope: created.negative_scope as NegativeScope,
      governance: created.governance as Governance,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  async updateConfiguration(id: number, userId: string, insertConfig: InsertConfiguration, editReason: string): Promise<DbConfiguration> {
    const existing = await this.getConfigurationById(id, userId);
    if (!existing) {
      throw new Error("Configuration not found");
    }

    const updatedGovernance = {
      ...insertConfig.governance,
      human_overrides: {
        ...insertConfig.governance.human_overrides,
      },
      context_confidence: {
        ...insertConfig.governance.context_confidence,
        notes: editReason + (insertConfig.governance.context_confidence.notes ? `\n\n${insertConfig.governance.context_confidence.notes}` : ""),
      },
      last_reviewed: new Date().toISOString().split("T")[0],
    };

    const [updated] = await db
      .update(configurations)
      .set({
        name: insertConfig.name,
        brand: insertConfig.brand,
        category_definition: insertConfig.category_definition,
        competitors: insertConfig.competitors,
        demand_definition: insertConfig.demand_definition,
        strategic_intent: insertConfig.strategic_intent,
        channel_context: insertConfig.channel_context,
        negative_scope: insertConfig.negative_scope,
        governance: updatedGovernance,
        updated_at: new Date(),
      })
      .where(and(eq(configurations.id, id), eq(configurations.userId, userId)))
      .returning();
    
    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      brand: updated.brand as Brand,
      category_definition: updated.category_definition as CategoryDefinition,
      competitors: updated.competitors as Competitors,
      demand_definition: updated.demand_definition as DemandDefinition,
      strategic_intent: updated.strategic_intent as StrategicIntent,
      channel_context: updated.channel_context as ChannelContext,
      negative_scope: updated.negative_scope as NegativeScope,
      governance: updated.governance as Governance,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async deleteConfiguration(id: number, userId: string): Promise<void> {
    await db.delete(configurations).where(
      and(eq(configurations.id, id), eq(configurations.userId, userId))
    );
  }

  async createBulkJob(userId: string, primaryCategory: string, brands: BulkBrandInput[]): Promise<BulkJob> {
    const [job] = await db
      .insert(bulkJobs)
      .values({
        userId,
        primaryCategory,
        totalBrands: brands.length,
        brands: brands,
        status: "pending",
        completedBrands: 0,
        failedBrands: 0,
        results: [],
        errors: [],
      })
      .returning();
    
    return {
      id: job.id,
      userId: job.userId,
      status: job.status as BulkJob["status"],
      totalBrands: job.totalBrands,
      completedBrands: job.completedBrands,
      failedBrands: job.failedBrands,
      primaryCategory: job.primaryCategory,
      brands: job.brands as BulkBrandInput[],
      results: job.results as InsertConfiguration[],
      errors: job.errors as { domain: string; error: string }[],
      created_at: job.created_at,
      updated_at: job.updated_at,
    };
  }

  async getBulkJob(id: number): Promise<BulkJob | undefined> {
    const [job] = await db
      .select()
      .from(bulkJobs)
      .where(eq(bulkJobs.id, id))
      .limit(1);
    
    if (!job) return undefined;
    
    return {
      id: job.id,
      userId: job.userId,
      status: job.status as BulkJob["status"],
      totalBrands: job.totalBrands,
      completedBrands: job.completedBrands,
      failedBrands: job.failedBrands,
      primaryCategory: job.primaryCategory,
      brands: job.brands as BulkBrandInput[],
      results: job.results as InsertConfiguration[],
      errors: job.errors as { domain: string; error: string }[],
      created_at: job.created_at,
      updated_at: job.updated_at,
    };
  }

  async getBulkJobs(userId: string): Promise<BulkJob[]> {
    const jobs = await db
      .select()
      .from(bulkJobs)
      .where(eq(bulkJobs.userId, userId))
      .orderBy(desc(bulkJobs.created_at));
    
    return jobs.map(job => ({
      id: job.id,
      userId: job.userId,
      status: job.status as BulkJob["status"],
      totalBrands: job.totalBrands,
      completedBrands: job.completedBrands,
      failedBrands: job.failedBrands,
      primaryCategory: job.primaryCategory,
      brands: job.brands as BulkBrandInput[],
      results: job.results as InsertConfiguration[],
      errors: job.errors as { domain: string; error: string }[],
      created_at: job.created_at,
      updated_at: job.updated_at,
    }));
  }

  async updateBulkJob(id: number, updates: Partial<BulkJob>): Promise<BulkJob> {
    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };
    
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.completedBrands !== undefined) updateData.completedBrands = updates.completedBrands;
    if (updates.failedBrands !== undefined) updateData.failedBrands = updates.failedBrands;
    if (updates.results !== undefined) updateData.results = updates.results;
    if (updates.errors !== undefined) updateData.errors = updates.errors;
    
    const [updated] = await db
      .update(bulkJobs)
      .set(updateData)
      .where(eq(bulkJobs.id, id))
      .returning();
    
    return {
      id: updated.id,
      userId: updated.userId,
      status: updated.status as BulkJob["status"],
      totalBrands: updated.totalBrands,
      completedBrands: updated.completedBrands,
      failedBrands: updated.failedBrands,
      primaryCategory: updated.primaryCategory,
      brands: updated.brands as BulkBrandInput[],
      results: updated.results as InsertConfiguration[],
      errors: updated.errors as { domain: string; error: string }[],
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }

  async createConfigurationVersion(configId: number, userId: string, changeSummary: string): Promise<ConfigurationVersion> {
    const config = await this.getConfigurationById(configId, userId);
    if (!config) {
      throw new Error("Configuration not found");
    }

    const [latestVersion] = await db
      .select({ maxVersion: max(configurationVersions.versionNumber) })
      .from(configurationVersions)
      .where(eq(configurationVersions.configurationId, configId));

    const nextVersionNumber = (latestVersion?.maxVersion || 0) + 1;

    const [created] = await db
      .insert(configurationVersions)
      .values({
        configurationId: configId,
        userId,
        versionNumber: nextVersionNumber,
        name: config.name,
        brand: config.brand,
        category_definition: config.category_definition,
        competitors: config.competitors,
        demand_definition: config.demand_definition,
        strategic_intent: config.strategic_intent,
        channel_context: config.channel_context,
        negative_scope: config.negative_scope,
        governance: config.governance,
        change_summary: changeSummary,
      })
      .returning();

    return {
      id: created.id,
      configurationId: created.configurationId,
      userId: created.userId,
      versionNumber: created.versionNumber,
      name: created.name,
      brand: created.brand as Brand,
      category_definition: created.category_definition as CategoryDefinition,
      competitors: created.competitors as Competitors,
      demand_definition: created.demand_definition as DemandDefinition,
      strategic_intent: created.strategic_intent as StrategicIntent,
      channel_context: created.channel_context as ChannelContext,
      negative_scope: created.negative_scope as NegativeScope,
      governance: created.governance as Governance,
      change_summary: created.change_summary || "",
      created_at: created.created_at,
    };
  }

  async getConfigurationVersions(configId: number, userId: string): Promise<ConfigurationVersion[]> {
    const config = await this.getConfigurationById(configId, userId);
    if (!config) {
      throw new Error("Configuration not found");
    }

    const versions = await db
      .select()
      .from(configurationVersions)
      .where(and(
        eq(configurationVersions.configurationId, configId),
        eq(configurationVersions.userId, userId)
      ))
      .orderBy(desc(configurationVersions.versionNumber));

    return versions.map(v => ({
      id: v.id,
      configurationId: v.configurationId,
      userId: v.userId,
      versionNumber: v.versionNumber,
      name: v.name,
      brand: v.brand as Brand,
      category_definition: v.category_definition as CategoryDefinition,
      competitors: v.competitors as Competitors,
      demand_definition: v.demand_definition as DemandDefinition,
      strategic_intent: v.strategic_intent as StrategicIntent,
      channel_context: v.channel_context as ChannelContext,
      negative_scope: v.negative_scope as NegativeScope,
      governance: v.governance as Governance,
      change_summary: v.change_summary || "",
      created_at: v.created_at,
    }));
  }

  async getConfigurationVersion(versionId: number, userId: string): Promise<ConfigurationVersion | undefined> {
    const [version] = await db
      .select()
      .from(configurationVersions)
      .where(and(
        eq(configurationVersions.id, versionId),
        eq(configurationVersions.userId, userId)
      ))
      .limit(1);

    if (!version) return undefined;

    return {
      id: version.id,
      configurationId: version.configurationId,
      userId: version.userId,
      versionNumber: version.versionNumber,
      name: version.name,
      brand: version.brand as Brand,
      category_definition: version.category_definition as CategoryDefinition,
      competitors: version.competitors as Competitors,
      demand_definition: version.demand_definition as DemandDefinition,
      strategic_intent: version.strategic_intent as StrategicIntent,
      channel_context: version.channel_context as ChannelContext,
      negative_scope: version.negative_scope as NegativeScope,
      governance: version.governance as Governance,
      change_summary: version.change_summary || "",
      created_at: version.created_at,
    };
  }

  async restoreConfigurationVersion(versionId: number, userId: string): Promise<DbConfiguration> {
    const version = await this.getConfigurationVersion(versionId, userId);
    if (!version) {
      throw new Error("Version not found");
    }

    const config = await this.getConfigurationById(version.configurationId, userId);
    if (!config) {
      throw new Error("Configuration not found");
    }

    await this.createConfigurationVersion(
      config.id,
      userId,
      `Auto-saved before restoring to version ${version.versionNumber}`
    );

    const [updated] = await db
      .update(configurations)
      .set({
        name: version.name,
        brand: version.brand,
        category_definition: version.category_definition,
        competitors: version.competitors,
        demand_definition: version.demand_definition,
        strategic_intent: version.strategic_intent,
        channel_context: version.channel_context,
        negative_scope: version.negative_scope,
        governance: version.governance,
        updated_at: new Date(),
      })
      .where(and(eq(configurations.id, version.configurationId), eq(configurations.userId, userId)))
      .returning();

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      brand: updated.brand as Brand,
      category_definition: updated.category_definition as CategoryDefinition,
      competitors: updated.competitors as Competitors,
      demand_definition: updated.demand_definition as DemandDefinition,
      strategic_intent: updated.strategic_intent as StrategicIntent,
      channel_context: updated.channel_context as ChannelContext,
      negative_scope: updated.negative_scope as NegativeScope,
      governance: updated.governance as Governance,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
    };
  }
}

export const storage = new DatabaseStorage();
