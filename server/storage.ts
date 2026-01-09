import { db } from "./db";
import { configurations, bulkJobs, configurationVersions, brands, keywordGapAnalyses, marketDemandAnalyses, moduleRuns, alerts, alertPreferences } from "@shared/schema";
import { eq, and, desc, max, sql } from "drizzle-orm";
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
  KeywordGapAnalysis,
  InsertKeywordGapAnalysis,
  KeywordGapAnalysisTheme,
  KeywordGapAnalysisParameters,
  MarketDemandAnalysis,
  InsertMarketDemandAnalysis,
  ModuleRun,
  InsertModuleRun,
  Alert,
  InsertAlert,
  AlertPreference,
  AlertType,
  AlertSeverity,
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
  getConfigurationByDomain(userId: string, domain: string): Promise<DbConfiguration | undefined>;
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
  // Keyword Gap Analysis operations
  createKeywordGapAnalysis(analysis: InsertKeywordGapAnalysis): Promise<KeywordGapAnalysis>;
  getKeywordGapAnalyses(userId: string): Promise<KeywordGapAnalysis[]>;
  getKeywordGapAnalysisById(id: number, userId: string): Promise<KeywordGapAnalysis | undefined>;
  deleteKeywordGapAnalysis(id: number, userId: string): Promise<void>;
  // Market Demand Analysis operations
  createMarketDemandAnalysis(analysis: InsertMarketDemandAnalysis): Promise<MarketDemandAnalysis>;
  getMarketDemandAnalyses(userId: string): Promise<MarketDemandAnalysis[]>;
  getMarketDemandAnalysisById(id: number, userId: string): Promise<MarketDemandAnalysis | undefined>;
  deleteMarketDemandAnalysis(id: number, userId: string): Promise<void>;
  // Module Run operations
  createModuleRun(run: InsertModuleRun): Promise<ModuleRun>;
  getModuleRuns(userId: string, configId?: number, moduleId?: string): Promise<ModuleRun[]>;
  getModuleRunById(id: number, userId: string): Promise<ModuleRun | undefined>;
  getModuleRunsByConfig(configId: number, userId: string): Promise<ModuleRun[]>;
  // Alert operations
  createAlert(alert: InsertAlert): Promise<Alert>;
  getAlerts(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Alert[]>;
  getAlertById(id: number, userId: string): Promise<Alert | undefined>;
  markAlertAsRead(id: number, userId: string): Promise<Alert | undefined>;
  markAllAlertsAsRead(userId: string): Promise<void>;
  dismissAlert(id: number, userId: string): Promise<void>;
  getUnreadAlertCount(userId: string): Promise<number>;
  // Alert preferences operations
  getAlertPreferences(userId: string): Promise<AlertPreference>;
  updateAlertPreferences(userId: string, prefs: Partial<Omit<AlertPreference, "id" | "userId" | "updated_at">>): Promise<AlertPreference>;
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

  async getConfigurationByDomain(userId: string, domain: string): Promise<DbConfiguration | undefined> {
    const normalizedDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
    
    const allConfigs = await db
      .select()
      .from(configurations)
      .where(eq(configurations.userId, userId));
    
    const found = allConfigs.find(c => {
      const configBrand = c.brand as Brand;
      if (!configBrand?.domain) return false;
      const cDomain = configBrand.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
      return cDomain === normalizedDomain;
    });
    
    if (!found) return undefined;
    
    return {
      id: found.id,
      userId: found.userId,
      name: found.name,
      brand: found.brand as Brand,
      category_definition: found.category_definition as CategoryDefinition,
      competitors: found.competitors as Competitors,
      demand_definition: found.demand_definition as DemandDefinition,
      strategic_intent: found.strategic_intent as StrategicIntent,
      channel_context: found.channel_context as ChannelContext,
      negative_scope: found.negative_scope as NegativeScope,
      governance: found.governance as Governance,
      created_at: found.created_at,
      updated_at: found.updated_at,
    };
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

  // ============ KEYWORD GAP ANALYSIS OPERATIONS ============

  async createKeywordGapAnalysis(analysis: InsertKeywordGapAnalysis): Promise<KeywordGapAnalysis> {
    const [result] = await db
      .insert(keywordGapAnalyses)
      .values({
        userId: analysis.userId,
        configurationId: analysis.configurationId,
        configurationName: analysis.configurationName,
        domain: analysis.domain,
        provider: analysis.provider,
        status: analysis.status,
        totalKeywords: analysis.totalKeywords,
        passCount: analysis.passCount,
        reviewCount: analysis.reviewCount,
        outOfPlayCount: analysis.outOfPlayCount,
        estimatedMissingValue: analysis.estimatedMissingValue,
        topThemes: analysis.topThemes,
        results: analysis.results,
        parameters: analysis.parameters,
      })
      .returning();

    return {
      id: result.id,
      userId: result.userId,
      configurationId: result.configurationId,
      configurationName: result.configurationName,
      domain: result.domain,
      provider: result.provider,
      status: result.status as "running" | "completed" | "failed",
      totalKeywords: result.totalKeywords,
      passCount: result.passCount,
      reviewCount: result.reviewCount,
      outOfPlayCount: result.outOfPlayCount,
      estimatedMissingValue: result.estimatedMissingValue,
      topThemes: (result.topThemes as KeywordGapAnalysisTheme[]) || [],
      results: result.results,
      parameters: result.parameters as KeywordGapAnalysisParameters,
      created_at: result.created_at,
    };
  }

  async getKeywordGapAnalyses(userId: string): Promise<KeywordGapAnalysis[]> {
    const results = await db
      .select()
      .from(keywordGapAnalyses)
      .where(eq(keywordGapAnalyses.userId, userId))
      .orderBy(desc(keywordGapAnalyses.created_at));

    return results.map(r => ({
      id: r.id,
      userId: r.userId,
      configurationId: r.configurationId,
      configurationName: r.configurationName,
      domain: r.domain,
      provider: r.provider,
      status: r.status as "running" | "completed" | "failed",
      totalKeywords: r.totalKeywords,
      passCount: r.passCount,
      reviewCount: r.reviewCount,
      outOfPlayCount: r.outOfPlayCount,
      estimatedMissingValue: r.estimatedMissingValue,
      topThemes: (r.topThemes as KeywordGapAnalysisTheme[]) || [],
      results: r.results,
      parameters: r.parameters as KeywordGapAnalysisParameters,
      created_at: r.created_at,
    }));
  }

  async getKeywordGapAnalysisById(id: number, userId: string): Promise<KeywordGapAnalysis | undefined> {
    const [result] = await db
      .select()
      .from(keywordGapAnalyses)
      .where(and(eq(keywordGapAnalyses.id, id), eq(keywordGapAnalyses.userId, userId)))
      .limit(1);

    if (!result) return undefined;

    return {
      id: result.id,
      userId: result.userId,
      configurationId: result.configurationId,
      configurationName: result.configurationName,
      domain: result.domain,
      provider: result.provider,
      status: result.status as "running" | "completed" | "failed",
      totalKeywords: result.totalKeywords,
      passCount: result.passCount,
      reviewCount: result.reviewCount,
      outOfPlayCount: result.outOfPlayCount,
      estimatedMissingValue: result.estimatedMissingValue,
      topThemes: (result.topThemes as KeywordGapAnalysisTheme[]) || [],
      results: result.results,
      parameters: result.parameters as KeywordGapAnalysisParameters,
      created_at: result.created_at,
    };
  }

  async deleteKeywordGapAnalysis(id: number, userId: string): Promise<void> {
    await db
      .delete(keywordGapAnalyses)
      .where(and(eq(keywordGapAnalyses.id, id), eq(keywordGapAnalyses.userId, userId)));
  }

  // ============ MARKET DEMAND ANALYSIS OPERATIONS ============

  async createMarketDemandAnalysis(analysis: InsertMarketDemandAnalysis): Promise<MarketDemandAnalysis> {
    const [result] = await db
      .insert(marketDemandAnalyses)
      .values({
        userId: analysis.userId,
        configurationId: analysis.configurationId,
        configurationName: analysis.configurationName,
        status: analysis.status,
        peakMonth: analysis.peakMonth,
        lowMonth: analysis.lowMonth,
        seasonalityType: analysis.seasonalityType,
        yoyTrend: analysis.yoyTrend,
        totalKeywords: analysis.totalKeywords,
        results: analysis.results,
        parameters: analysis.parameters,
      })
      .returning();

    return {
      id: result.id,
      userId: result.userId,
      configurationId: result.configurationId,
      configurationName: result.configurationName,
      status: result.status,
      peakMonth: result.peakMonth,
      lowMonth: result.lowMonth,
      seasonalityType: result.seasonalityType,
      yoyTrend: result.yoyTrend,
      totalKeywords: result.totalKeywords,
      results: result.results as any,
      parameters: result.parameters as any,
      created_at: result.created_at,
    };
  }

  async getMarketDemandAnalyses(userId: string): Promise<MarketDemandAnalysis[]> {
    const results = await db
      .select()
      .from(marketDemandAnalyses)
      .where(eq(marketDemandAnalyses.userId, userId))
      .orderBy(desc(marketDemandAnalyses.created_at));

    return results.map(r => ({
      id: r.id,
      userId: r.userId,
      configurationId: r.configurationId,
      configurationName: r.configurationName,
      status: r.status,
      peakMonth: r.peakMonth,
      lowMonth: r.lowMonth,
      seasonalityType: r.seasonalityType,
      yoyTrend: r.yoyTrend,
      totalKeywords: r.totalKeywords,
      results: r.results as any,
      parameters: r.parameters as any,
      created_at: r.created_at,
    }));
  }

  async getMarketDemandAnalysisById(id: number, userId: string): Promise<MarketDemandAnalysis | undefined> {
    const [result] = await db
      .select()
      .from(marketDemandAnalyses)
      .where(and(eq(marketDemandAnalyses.id, id), eq(marketDemandAnalyses.userId, userId)))
      .limit(1);

    if (!result) return undefined;

    return {
      id: result.id,
      userId: result.userId,
      configurationId: result.configurationId,
      configurationName: result.configurationName,
      status: result.status,
      peakMonth: result.peakMonth,
      lowMonth: result.lowMonth,
      seasonalityType: result.seasonalityType,
      yoyTrend: result.yoyTrend,
      totalKeywords: result.totalKeywords,
      results: result.results as any,
      parameters: result.parameters as any,
      created_at: result.created_at,
    };
  }

  async deleteMarketDemandAnalysis(id: number, userId: string): Promise<void> {
    await db
      .delete(marketDemandAnalyses)
      .where(and(eq(marketDemandAnalyses.id, id), eq(marketDemandAnalyses.userId, userId)));
  }

  // ============ MODULE RUN OPERATIONS ============

  async createModuleRun(run: InsertModuleRun): Promise<ModuleRun> {
    const [result] = await db
      .insert(moduleRuns)
      .values({
        userId: run.userId,
        configurationId: run.configurationId,
        moduleId: run.moduleId,
        moduleName: run.moduleName,
        status: run.status,
        ucrVersion: run.ucrVersion,
        sectionsUsed: run.sectionsUsed,
        inputs: run.inputs,
        results: run.results,
        error: run.error,
        executionTimeMs: run.executionTimeMs,
        rulesTriggered: run.rulesTriggered,
      })
      .returning();

    return {
      id: result.id,
      userId: result.userId,
      configurationId: result.configurationId,
      moduleId: result.moduleId,
      moduleName: result.moduleName,
      status: result.status as "running" | "completed" | "failed",
      ucrVersion: result.ucrVersion,
      sectionsUsed: (result.sectionsUsed as string[]) || [],
      inputs: (result.inputs as Record<string, any>) || {},
      results: result.results as Record<string, any> | null,
      error: result.error,
      executionTimeMs: result.executionTimeMs,
      rulesTriggered: (result.rulesTriggered as any[]) || [],
      created_at: result.created_at,
    };
  }

  async getModuleRuns(userId: string, configId?: number, moduleId?: string): Promise<ModuleRun[]> {
    let query = db.select().from(moduleRuns).where(eq(moduleRuns.userId, userId));
    
    const results = await db
      .select()
      .from(moduleRuns)
      .where(eq(moduleRuns.userId, userId))
      .orderBy(desc(moduleRuns.created_at))
      .limit(100);

    return results
      .filter(r => {
        if (configId && r.configurationId !== configId) return false;
        if (moduleId && r.moduleId !== moduleId) return false;
        return true;
      })
      .map(r => ({
        id: r.id,
        userId: r.userId,
        configurationId: r.configurationId,
        moduleId: r.moduleId,
        moduleName: r.moduleName,
        status: r.status as "running" | "completed" | "failed",
        ucrVersion: r.ucrVersion,
        sectionsUsed: (r.sectionsUsed as string[]) || [],
        inputs: (r.inputs as Record<string, any>) || {},
        results: r.results as Record<string, any> | null,
        error: r.error,
        executionTimeMs: r.executionTimeMs,
        rulesTriggered: (r.rulesTriggered as any[]) || [],
        created_at: r.created_at,
      }));
  }

  async getModuleRunById(id: number, userId: string): Promise<ModuleRun | undefined> {
    const [result] = await db
      .select()
      .from(moduleRuns)
      .where(and(eq(moduleRuns.id, id), eq(moduleRuns.userId, userId)))
      .limit(1);

    if (!result) return undefined;

    return {
      id: result.id,
      userId: result.userId,
      configurationId: result.configurationId,
      moduleId: result.moduleId,
      moduleName: result.moduleName,
      status: result.status as "running" | "completed" | "failed",
      ucrVersion: result.ucrVersion,
      sectionsUsed: (result.sectionsUsed as string[]) || [],
      inputs: (result.inputs as Record<string, any>) || {},
      results: result.results as Record<string, any> | null,
      error: result.error,
      executionTimeMs: result.executionTimeMs,
      rulesTriggered: (result.rulesTriggered as any[]) || [],
      created_at: result.created_at,
    };
  }

  async getModuleRunsByConfig(configId: number, userId: string): Promise<ModuleRun[]> {
    const results = await db
      .select()
      .from(moduleRuns)
      .where(and(eq(moduleRuns.configurationId, configId), eq(moduleRuns.userId, userId)))
      .orderBy(desc(moduleRuns.created_at));

    return results.map(r => ({
      id: r.id,
      userId: r.userId,
      configurationId: r.configurationId,
      moduleId: r.moduleId,
      moduleName: r.moduleName,
      status: r.status as "running" | "completed" | "failed",
      ucrVersion: r.ucrVersion,
      sectionsUsed: (r.sectionsUsed as string[]) || [],
      inputs: (r.inputs as Record<string, any>) || {},
      results: r.results as Record<string, any> | null,
      error: r.error,
      executionTimeMs: r.executionTimeMs,
      rulesTriggered: (r.rulesTriggered as any[]) || [],
      created_at: r.created_at,
    }));
  }

  // ============ ALERT OPERATIONS ============

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [result] = await db
      .insert(alerts)
      .values({
        userId: alert.userId,
        configurationId: alert.configurationId,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metadata: alert.metadata || {},
      })
      .returning();

    return {
      id: result.id,
      userId: result.userId,
      configurationId: result.configurationId,
      type: result.type as AlertType,
      severity: result.severity as AlertSeverity,
      title: result.title,
      message: result.message,
      metadata: (result.metadata as Record<string, any>) || {},
      read: result.read,
      dismissed: result.dismissed,
      created_at: result.created_at,
    };
  }

  async getAlerts(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Alert[]> {
    const conditions = [eq(alerts.userId, userId), eq(alerts.dismissed, false)];
    
    if (options?.unreadOnly) {
      conditions.push(eq(alerts.read, false));
    }

    let query = db
      .select()
      .from(alerts)
      .where(and(...conditions))
      .orderBy(desc(alerts.created_at));

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    const results = await query;

    return results.map(r => ({
      id: r.id,
      userId: r.userId,
      configurationId: r.configurationId,
      type: r.type as AlertType,
      severity: r.severity as AlertSeverity,
      title: r.title,
      message: r.message,
      metadata: (r.metadata as Record<string, any>) || {},
      read: r.read,
      dismissed: r.dismissed,
      created_at: r.created_at,
    }));
  }

  async getAlertById(id: number, userId: string): Promise<Alert | undefined> {
    const [result] = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .limit(1);

    if (!result) return undefined;

    return {
      id: result.id,
      userId: result.userId,
      configurationId: result.configurationId,
      type: result.type as AlertType,
      severity: result.severity as AlertSeverity,
      title: result.title,
      message: result.message,
      metadata: (result.metadata as Record<string, any>) || {},
      read: result.read,
      dismissed: result.dismissed,
      created_at: result.created_at,
    };
  }

  async markAlertAsRead(id: number, userId: string): Promise<Alert | undefined> {
    const [result] = await db
      .update(alerts)
      .set({ read: true })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)))
      .returning();

    if (!result) return undefined;

    return {
      id: result.id,
      userId: result.userId,
      configurationId: result.configurationId,
      type: result.type as AlertType,
      severity: result.severity as AlertSeverity,
      title: result.title,
      message: result.message,
      metadata: (result.metadata as Record<string, any>) || {},
      read: result.read,
      dismissed: result.dismissed,
      created_at: result.created_at,
    };
  }

  async markAllAlertsAsRead(userId: string): Promise<void> {
    await db
      .update(alerts)
      .set({ read: true })
      .where(and(eq(alerts.userId, userId), eq(alerts.read, false)));
  }

  async dismissAlert(id: number, userId: string): Promise<void> {
    await db
      .update(alerts)
      .set({ dismissed: true })
      .where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
  }

  async getUnreadAlertCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(and(eq(alerts.userId, userId), eq(alerts.read, false), eq(alerts.dismissed, false)));

    return Number(result[0]?.count) || 0;
  }

  // ============ ALERT PREFERENCES OPERATIONS ============

  async getAlertPreferences(userId: string): Promise<AlertPreference> {
    const [existing] = await db
      .select()
      .from(alertPreferences)
      .where(eq(alertPreferences.userId, userId))
      .limit(1);

    if (existing) {
      return {
        id: existing.id,
        userId: existing.userId,
        qualityDropEnabled: existing.qualityDropEnabled,
        competitorChangeEnabled: existing.competitorChangeEnabled,
        guardrailViolationEnabled: existing.guardrailViolationEnabled,
        expirationWarningEnabled: existing.expirationWarningEnabled,
        analysisCompleteEnabled: existing.analysisCompleteEnabled,
        emailNotifications: existing.emailNotifications,
        updated_at: existing.updated_at,
      };
    }

    const [created] = await db
      .insert(alertPreferences)
      .values({
        userId,
        qualityDropEnabled: true,
        competitorChangeEnabled: true,
        guardrailViolationEnabled: true,
        expirationWarningEnabled: true,
        analysisCompleteEnabled: true,
        emailNotifications: false,
      })
      .returning();

    return {
      id: created.id,
      userId: created.userId,
      qualityDropEnabled: created.qualityDropEnabled,
      competitorChangeEnabled: created.competitorChangeEnabled,
      guardrailViolationEnabled: created.guardrailViolationEnabled,
      expirationWarningEnabled: created.expirationWarningEnabled,
      analysisCompleteEnabled: created.analysisCompleteEnabled,
      emailNotifications: created.emailNotifications,
      updated_at: created.updated_at,
    };
  }

  async updateAlertPreferences(userId: string, prefs: Partial<Omit<AlertPreference, "id" | "userId" | "updated_at">>): Promise<AlertPreference> {
    await this.getAlertPreferences(userId);

    const [updated] = await db
      .update(alertPreferences)
      .set({
        ...prefs,
        updated_at: new Date(),
      })
      .where(eq(alertPreferences.userId, userId))
      .returning();

    return {
      id: updated.id,
      userId: updated.userId,
      qualityDropEnabled: updated.qualityDropEnabled,
      competitorChangeEnabled: updated.competitorChangeEnabled,
      guardrailViolationEnabled: updated.guardrailViolationEnabled,
      expirationWarningEnabled: updated.expirationWarningEnabled,
      analysisCompleteEnabled: updated.analysisCompleteEnabled,
      emailNotifications: updated.emailNotifications,
      updated_at: updated.updated_at,
    };
  }
}

export const storage = new DatabaseStorage();
