import { db } from "./db";
import { configurations, bulkJobs, configurationVersions, auditLogs, brands, contexts, execReports } from "@shared/schema";
import { eq, and, desc, max, isNull } from "drizzle-orm";
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
  BrandRecord,
  InsertBrand,
  ContextRecord,
  InsertContext,
  ExecReportRecord,
  InsertExecReport,
} from "@shared/schema";

// Database configuration type (includes userId and tenantId for security)
export interface DbConfiguration {
  id: number;
  tenantId: number | null;
  userId: string;
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
  getConfiguration(tenantId: number | null, userId: string): Promise<DbConfiguration | undefined>;
  getConfigurationById(id: number, tenantId: number | null, userId?: string): Promise<DbConfiguration | undefined>;
  getAllConfigurations(tenantId: number | null, userId: string): Promise<DbConfiguration[]>;
  saveConfiguration(tenantId: number | null, userId: string, config: InsertConfiguration): Promise<DbConfiguration>;
  createConfiguration(tenantId: number | null, userId: string, config: InsertConfiguration): Promise<DbConfiguration>;
  updateConfiguration(id: number, tenantId: number | null, userId: string, config: InsertConfiguration, editReason: string): Promise<DbConfiguration>;
  deleteConfiguration(id: number, tenantId: number | null, userId: string): Promise<void>;
  createBulkJob(tenantId: number | null, userId: string, primaryCategory: string, brands: BulkBrandInput[]): Promise<BulkJob>;
  getBulkJob(id: number, tenantId: number | null): Promise<BulkJob | undefined>;
  getBulkJobs(tenantId: number | null, userId: string): Promise<BulkJob[]>;
  updateBulkJob(id: number, tenantId: number | null, updates: Partial<BulkJob>): Promise<BulkJob>;
  createConfigurationVersion(configId: number, tenantId: number | null, userId: string, changeSummary: string): Promise<ConfigurationVersion>;
  getConfigurationVersions(configId: number, tenantId: number | null, userId: string): Promise<ConfigurationVersion[]>;
  getConfigurationVersion(versionId: number, tenantId: number | null, userId: string): Promise<ConfigurationVersion | undefined>;
  restoreConfigurationVersion(versionId: number, tenantId: number | null, userId: string): Promise<DbConfiguration>;
  createAuditLog(entry: AuditLogInsert): Promise<AuditLog>;
  getAuditLogs(tenantId: number | null, configurationId?: number, limit?: number): Promise<AuditLog[]>;
}

export interface AuditLogInsert {
  tenantId: number | null;
  userId: string;
  configurationId?: number;
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AuditLog extends AuditLogInsert {
  id: number;
  created_at: Date;
}

export class DatabaseStorage implements IStorage {
  async getConfiguration(tenantId: number | null, userId: string): Promise<DbConfiguration | undefined> {
    const conditions = [eq(configurations.userId, userId)];
    if (tenantId !== null) {
      conditions.push(eq(configurations.tenantId, tenantId));
    }
    const [config] = await db
      .select()
      .from(configurations)
      .where(and(...conditions))
      .limit(1);
    
    if (!config) return undefined;
    
    return {
      id: config.id,
      tenantId: config.tenantId,
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

  async saveConfiguration(tenantId: number | null, userId: string, insertConfig: InsertConfiguration): Promise<DbConfiguration> {
    const existing = await this.getConfiguration(tenantId, userId);
    
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
        tenantId: updated.tenantId,
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
        tenantId,
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
      tenantId: created.tenantId,
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

  async getConfigurationById(id: number, tenantId: number | null, userId?: string): Promise<DbConfiguration | undefined> {
    const conditions = [eq(configurations.id, id)];
    
    if (tenantId !== null) {
      conditions.push(eq(configurations.tenantId, tenantId));
    } else {
      conditions.push(isNull(configurations.tenantId));
    }
    
    if (userId) {
      conditions.push(eq(configurations.userId, userId));
    }
    
    const [config] = await db
      .select()
      .from(configurations)
      .where(and(...conditions))
      .limit(1);
    
    if (!config) return undefined;
    
    return {
      id: config.id,
      tenantId: config.tenantId,
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

  async getAllConfigurations(tenantId: number | null, userId: string): Promise<DbConfiguration[]> {
    const conditions = [eq(configurations.userId, userId)];
    if (tenantId !== null) {
      conditions.push(eq(configurations.tenantId, tenantId));
    }
    const configs = await db
      .select()
      .from(configurations)
      .where(and(...conditions))
      .orderBy(desc(configurations.updated_at));
    
    return configs.map(config => ({
      id: config.id,
      tenantId: config.tenantId,
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

  async createConfiguration(tenantId: number | null, userId: string, insertConfig: InsertConfiguration): Promise<DbConfiguration> {
    const [created] = await db
      .insert(configurations)
      .values({
        tenantId,
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
      tenantId: created.tenantId,
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

  async updateConfiguration(id: number, tenantId: number | null, userId: string, insertConfig: InsertConfiguration, editReason: string): Promise<DbConfiguration> {
    const existing = await this.getConfigurationById(id, tenantId, userId);
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

    const conditions = [eq(configurations.id, id)];
    if (tenantId !== null) {
      conditions.push(eq(configurations.tenantId, tenantId));
    } else {
      conditions.push(isNull(configurations.tenantId));
    }
    
    if (userId) {
      conditions.push(eq(configurations.userId, userId));
    }

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
      .where(and(...conditions))
      .returning();
    
    return {
      id: updated.id,
      tenantId: updated.tenantId,
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

  async deleteConfiguration(id: number, tenantId: number | null, userId: string): Promise<void> {
    const conditions = [eq(configurations.id, id), eq(configurations.userId, userId)];
    if (tenantId !== null) {
      conditions.push(eq(configurations.tenantId, tenantId));
    } else {
      conditions.push(isNull(configurations.tenantId));
    }
    await db.delete(configurations).where(and(...conditions));
  }

  async createBulkJob(tenantId: number | null, userId: string, primaryCategory: string, brands: BulkBrandInput[]): Promise<BulkJob> {
    const [job] = await db
      .insert(bulkJobs)
      .values({
        tenantId,
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
      tenantId: job.tenantId,
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

  async getBulkJob(id: number, tenantId: number | null): Promise<BulkJob | undefined> {
    const conditions = [eq(bulkJobs.id, id)];
    if (tenantId !== null) {
      conditions.push(eq(bulkJobs.tenantId, tenantId));
    }
    const [job] = await db
      .select()
      .from(bulkJobs)
      .where(and(...conditions))
      .limit(1);
    
    if (!job) return undefined;
    
    return {
      id: job.id,
      tenantId: job.tenantId,
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

  async getBulkJobs(tenantId: number | null, userId: string): Promise<BulkJob[]> {
    const conditions = [eq(bulkJobs.userId, userId)];
    if (tenantId !== null) {
      conditions.push(eq(bulkJobs.tenantId, tenantId));
    }
    const jobs = await db
      .select()
      .from(bulkJobs)
      .where(and(...conditions))
      .orderBy(desc(bulkJobs.created_at));
    
    return jobs.map(job => ({
      id: job.id,
      tenantId: job.tenantId,
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

  async updateBulkJob(id: number, tenantId: number | null, updates: Partial<BulkJob>): Promise<BulkJob> {
    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };
    
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.completedBrands !== undefined) updateData.completedBrands = updates.completedBrands;
    if (updates.failedBrands !== undefined) updateData.failedBrands = updates.failedBrands;
    if (updates.results !== undefined) updateData.results = updates.results;
    if (updates.errors !== undefined) updateData.errors = updates.errors;
    
    const conditions = [eq(bulkJobs.id, id)];
    if (tenantId !== null) {
      conditions.push(eq(bulkJobs.tenantId, tenantId));
    }
    const [updated] = await db
      .update(bulkJobs)
      .set(updateData)
      .where(and(...conditions))
      .returning();
    
    return {
      id: updated.id,
      tenantId: updated.tenantId,
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

  async createConfigurationVersion(configId: number, tenantId: number | null, userId: string, changeSummary: string): Promise<ConfigurationVersion> {
    const config = await this.getConfigurationById(configId, tenantId, userId);
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
        tenantId,
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

  async getConfigurationVersions(configId: number, tenantId: number | null, userId: string): Promise<ConfigurationVersion[]> {
    const config = await this.getConfigurationById(configId, tenantId, userId);
    if (!config) {
      throw new Error("Configuration not found");
    }

    const conditions = [
      eq(configurationVersions.configurationId, configId),
      eq(configurationVersions.userId, userId)
    ];
    
    if (tenantId !== null) {
      conditions.push(eq(configurationVersions.tenantId, tenantId));
    } else {
      conditions.push(isNull(configurationVersions.tenantId));
    }

    const versions = await db
      .select()
      .from(configurationVersions)
      .where(and(...conditions))
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

  async getConfigurationVersion(versionId: number, tenantId: number | null, userId: string): Promise<ConfigurationVersion | undefined> {
    const conditions = [
      eq(configurationVersions.id, versionId),
      eq(configurationVersions.userId, userId)
    ];
    
    if (tenantId !== null) {
      conditions.push(eq(configurationVersions.tenantId, tenantId));
    } else {
      conditions.push(isNull(configurationVersions.tenantId));
    }

    const [version] = await db
      .select()
      .from(configurationVersions)
      .where(and(...conditions))
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

  async restoreConfigurationVersion(versionId: number, tenantId: number | null, userId: string): Promise<DbConfiguration> {
    const version = await this.getConfigurationVersion(versionId, tenantId, userId);
    if (!version) {
      throw new Error("Version not found");
    }

    const config = await this.getConfigurationById(version.configurationId, tenantId, userId);
    if (!config) {
      throw new Error("Configuration not found");
    }

    await this.createConfigurationVersion(
      config.id,
      tenantId,
      userId,
      `Auto-saved before restoring to version ${version.versionNumber}`
    );

    const conditions = [
      eq(configurations.id, version.configurationId),
      eq(configurations.userId, userId)
    ];
    
    if (tenantId !== null) {
      conditions.push(eq(configurations.tenantId, tenantId));
    } else {
      conditions.push(isNull(configurations.tenantId));
    }

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
      .where(and(...conditions))
      .returning();

    return {
      id: updated.id,
      tenantId: updated.tenantId,
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

  async createAuditLog(entry: AuditLogInsert): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values({
        tenantId: entry.tenantId,
        userId: entry.userId,
        configurationId: entry.configurationId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        reason: entry.reason,
        metadata: entry.metadata,
      })
      .returning();

    return {
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      configurationId: log.configurationId ?? undefined,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      previousValue: log.previousValue,
      newValue: log.newValue,
      reason: log.reason ?? undefined,
      metadata: log.metadata as Record<string, any> | undefined,
      created_at: log.created_at,
    };
  }

  async getAuditLogs(tenantId: number | null, configurationId?: number, limit: number = 50): Promise<AuditLog[]> {
    const conditions = [];
    
    if (tenantId !== null) {
      conditions.push(eq(auditLogs.tenantId, tenantId));
    } else {
      conditions.push(isNull(auditLogs.tenantId));
    }
    
    if (configurationId) {
      conditions.push(eq(auditLogs.configurationId, configurationId));
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.created_at))
      .limit(limit);

    return logs.map(log => ({
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      configurationId: log.configurationId ?? undefined,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      previousValue: log.previousValue,
      newValue: log.newValue,
      reason: log.reason ?? undefined,
      metadata: log.metadata as Record<string, any> | undefined,
      created_at: log.created_at,
    }));
  }

  // ============================================================================
  // BRANDS CRUD
  // ============================================================================
  async createBrand(userId: string, brand: Omit<InsertBrand, 'userId'>): Promise<BrandRecord> {
    const [created] = await db
      .insert(brands)
      .values({ ...brand, userId })
      .returning();
    return created;
  }

  async getBrand(brandId: number, userId: string): Promise<BrandRecord | undefined> {
    const [brand] = await db
      .select()
      .from(brands)
      .where(and(eq(brands.id, brandId), eq(brands.userId, userId)))
      .limit(1);
    return brand;
  }

  async getBrandByDomain(domain: string, userId: string): Promise<BrandRecord | undefined> {
    const [brand] = await db
      .select()
      .from(brands)
      .where(and(eq(brands.domain, domain), eq(brands.userId, userId)))
      .limit(1);
    return brand;
  }

  async getAllBrands(userId: string): Promise<BrandRecord[]> {
    return db
      .select()
      .from(brands)
      .where(eq(brands.userId, userId))
      .orderBy(desc(brands.created_at));
  }

  async updateBrand(brandId: number, userId: string, updates: Partial<InsertBrand>): Promise<BrandRecord> {
    const [updated] = await db
      .update(brands)
      .set({ ...updates, updated_at: new Date() })
      .where(and(eq(brands.id, brandId), eq(brands.userId, userId)))
      .returning();
    return updated;
  }

  async deleteBrand(brandId: number, userId: string): Promise<void> {
    await db
      .delete(brands)
      .where(and(eq(brands.id, brandId), eq(brands.userId, userId)));
  }

  // ============================================================================
  // CONTEXTS (UCR) CRUD
  // ============================================================================
  async createContext(context: InsertContext): Promise<ContextRecord> {
    const [created] = await db
      .insert(contexts)
      .values(context)
      .returning();
    return created;
  }

  async getContext(contextId: number, userId: string): Promise<ContextRecord | undefined> {
    const [ctx] = await db
      .select()
      .from(contexts)
      .where(and(eq(contexts.id, contextId), eq(contexts.userId, userId)))
      .limit(1);
    return ctx;
  }

  async getContextByBrand(brandId: number, userId: string): Promise<ContextRecord | undefined> {
    const [ctx] = await db
      .select()
      .from(contexts)
      .where(and(eq(contexts.brandId, brandId), eq(contexts.userId, userId)))
      .orderBy(desc(contexts.updated_at))
      .limit(1);
    return ctx;
  }

  async getAllContexts(userId: string): Promise<ContextRecord[]> {
    return db
      .select()
      .from(contexts)
      .where(eq(contexts.userId, userId))
      .orderBy(desc(contexts.updated_at));
  }

  async updateContext(contextId: number, userId: string, updates: Partial<InsertContext>): Promise<ContextRecord> {
    const [updated] = await db
      .update(contexts)
      .set({ ...updates, updated_at: new Date() })
      .where(and(eq(contexts.id, contextId), eq(contexts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteContext(contextId: number, userId: string): Promise<void> {
    await db
      .delete(contexts)
      .where(and(eq(contexts.id, contextId), eq(contexts.userId, userId)));
  }

  // ============================================================================
  // EXEC_REPORTS CRUD
  // ============================================================================
  async createExecReport(report: InsertExecReport): Promise<ExecReportRecord> {
    const [created] = await db
      .insert(execReports)
      .values(report)
      .returning();
    return created;
  }

  async getExecReport(reportId: number, userId: string): Promise<ExecReportRecord | undefined> {
    const [report] = await db
      .select()
      .from(execReports)
      .where(and(eq(execReports.id, reportId), eq(execReports.userId, userId)))
      .limit(1);
    return report;
  }

  async getExecReportsByContext(contextId: number, userId: string): Promise<ExecReportRecord[]> {
    return db
      .select()
      .from(execReports)
      .where(and(eq(execReports.contextId, contextId), eq(execReports.userId, userId)))
      .orderBy(desc(execReports.executedAt));
  }

  async getExecReportsByBrand(brandId: number, userId: string): Promise<ExecReportRecord[]> {
    return db
      .select()
      .from(execReports)
      .where(and(eq(execReports.brandId, brandId), eq(execReports.userId, userId)))
      .orderBy(desc(execReports.executedAt));
  }

  async getLatestExecReportByModule(contextId: number, moduleId: string, userId: string): Promise<ExecReportRecord | undefined> {
    const [report] = await db
      .select()
      .from(execReports)
      .where(and(
        eq(execReports.contextId, contextId),
        eq(execReports.moduleId, moduleId),
        eq(execReports.userId, userId)
      ))
      .orderBy(desc(execReports.executedAt))
      .limit(1);
    return report;
  }

  async updateExecReport(reportId: number, userId: string, updates: Partial<InsertExecReport>): Promise<ExecReportRecord> {
    const [updated] = await db
      .update(execReports)
      .set(updates)
      .where(and(eq(execReports.id, reportId), eq(execReports.userId, userId)))
      .returning();
    return updated;
  }

  async deleteExecReport(reportId: number, userId: string): Promise<void> {
    await db
      .delete(execReports)
      .where(and(eq(execReports.id, reportId), eq(execReports.userId, userId)));
  }

  // Get all exec reports for master report aggregation
  async getMasterReportData(contextId: number, userId: string): Promise<{
    context: ContextRecord | undefined;
    brand: BrandRecord | undefined;
    reports: ExecReportRecord[];
  }> {
    const ctx = await this.getContext(contextId, userId);
    if (!ctx) {
      return { context: undefined, brand: undefined, reports: [] };
    }
    
    const brand = await this.getBrand(ctx.brandId, userId);
    const reports = await this.getExecReportsByContext(contextId, userId);
    
    return { context: ctx, brand, reports };
  }
}

export const storage = new DatabaseStorage();
