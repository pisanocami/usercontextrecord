import { db } from "./db";
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import { configurations, bulkJobs, configurationVersions, auditLogs, brands, contexts, execReports } from "@shared/schema";
=======
import { configurations, bulkJobs, configurationVersions, auditLogs, execReports, masterReports } from "@shared/schema";
>>>>>>> Stashed changes
=======
import { configurations, bulkJobs, configurationVersions, auditLogs, execReports, masterReports } from "@shared/schema";
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
<<<<<<< Updated upstream
  BrandRecord,
  InsertBrand,
  ContextRecord,
  InsertContext,
  ExecReportRecord,
  InsertExecReport,
=======
  DbExecReport,
  DbMasterReport,
>>>>>>> Stashed changes
=======
  DbExecReport,
  DbMasterReport,
>>>>>>> Stashed changes
} from "@shared/schema";

// Import AuditLog type from schema
import type { AuditLog as SchemaAuditLog } from "@shared/schema";

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
  createAuditLog(log: Omit<AuditLog, "id" | "created_at">): Promise<AuditLog>;
  getAuditLogs(tenantId: number | null, configurationId?: number): Promise<AuditLog[]>;
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

// Use SchemaAuditLog for the AuditLog type
export type AuditLog = SchemaAuditLog;

// Re-export database types for use in other modules
export type { DbExecReport, DbMasterReport } from "@shared/schema";

export class DatabaseStorage implements IStorage {
  async getConfiguration(tenantId: number | null, userId: string): Promise<DbConfiguration | undefined> {
    const conditions = [eq(configurations.userId, userId)];
    if (tenantId !== null) {
      conditions.push(eq(configurations.tenantId, tenantId));
    } else {
      conditions.push(isNull(configurations.tenantId));
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
    } else {
      conditions.push(isNull(configurations.tenantId));
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
    } else {
      conditions.push(isNull(bulkJobs.tenantId));
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
    } else {
      conditions.push(isNull(bulkJobs.tenantId));
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
    } else {
      conditions.push(isNull(bulkJobs.tenantId));
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
      throw new Error("Configuration version not found");
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

  async createAuditLog(log: Omit<AuditLog, "id" | "created_at">): Promise<AuditLog> {
    const [created] = await db
      .insert(auditLogs)
      .values({
        tenantId: log.tenantId,
        userId: log.userId,
        configurationId: log.configurationId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        previousValue: log.previousValue,
        newValue: log.newValue,
        reason: log.reason,
        metadata: log.metadata,
      })
      .returning();
    
    return created as AuditLog;
  }

  async getAuditLogs(tenantId: number | null, configurationId?: number): Promise<AuditLog[]> {
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
      .orderBy(desc(auditLogs.created_at));

    return logs.map(log => ({
      id: log.id,
      tenantId: log.tenantId,
      userId: log.userId,
      configurationId: log.configurationId ?? null,
      action: log.action as AuditLog['action'],
      entityType: log.entityType as AuditLog['entityType'],
      entityId: log.entityId,
      previousValue: log.previousValue,
      newValue: log.newValue,
      reason: log.reason ?? undefined,
      metadata: log.metadata as Record<string, any> | undefined,
      created_at: log.created_at,
    }));
  }

<<<<<<< Updated upstream
<<<<<<< Updated upstream
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
=======
=======
>>>>>>> Stashed changes
  // ============================================
  // ExecReports CRUD Methods
  // ============================================

  async createExecReport(report: {
    id: string;
    configurationId: number;
    moduleId: string;
    contextVersion: number;
    contextHash: string;
    output: any;
    playbookResult?: any;
  }): Promise<DbExecReport> {
    const [created] = await db
      .insert(execReports)
      .values({
        id: report.id,
        configurationId: report.configurationId,
        moduleId: report.moduleId,
        contextVersion: report.contextVersion,
        contextHash: report.contextHash,
        output: report.output,
        playbookResult: report.playbookResult,
      })
      .returning();

    return {
      id: created.id,
      configurationId: created.configurationId,
      moduleId: created.moduleId,
      contextVersion: created.contextVersion,
      contextHash: created.contextHash,
      executedAt: created.executedAt,
      output: created.output,
      playbookResult: created.playbookResult as DbExecReport['playbookResult'],
      created_at: created.created_at,
    };
  }

  async getExecReportsByConfiguration(configurationId: number, contextVersion?: number): Promise<DbExecReport[]> {
    const conditions = [eq(execReports.configurationId, configurationId)];
    
    if (contextVersion !== undefined) {
      conditions.push(eq(execReports.contextVersion, contextVersion));
    }

    const reports = await db
      .select()
      .from(execReports)
      .where(and(...conditions))
      .orderBy(desc(execReports.executedAt));

    return reports.map(r => ({
      id: r.id,
      configurationId: r.configurationId,
      moduleId: r.moduleId,
      contextVersion: r.contextVersion,
      contextHash: r.contextHash,
      executedAt: r.executedAt,
      output: r.output,
      playbookResult: r.playbookResult as DbExecReport['playbookResult'],
      created_at: r.created_at,
    }));
  }

  async getExecReportById(id: string): Promise<DbExecReport | null> {
    const [report] = await db
      .select()
      .from(execReports)
      .where(eq(execReports.id, id))
      .limit(1);

    if (!report) return null;

    return {
      id: report.id,
      configurationId: report.configurationId,
      moduleId: report.moduleId,
      contextVersion: report.contextVersion,
      contextHash: report.contextHash,
      executedAt: report.executedAt,
      output: report.output,
      playbookResult: report.playbookResult as DbExecReport['playbookResult'],
      created_at: report.created_at,
    };
  }

  async getExecReportsByModule(configurationId: number, moduleId: string): Promise<DbExecReport[]> {
    const reports = await db
      .select()
      .from(execReports)
      .where(and(
        eq(execReports.configurationId, configurationId),
        eq(execReports.moduleId, moduleId)
      ))
      .orderBy(desc(execReports.executedAt));

    return reports.map(r => ({
      id: r.id,
      configurationId: r.configurationId,
      moduleId: r.moduleId,
      contextVersion: r.contextVersion,
      contextHash: r.contextHash,
      executedAt: r.executedAt,
      output: r.output,
      playbookResult: r.playbookResult as DbExecReport['playbookResult'],
      created_at: r.created_at,
    }));
  }

  // ============================================
  // MasterReports CRUD Methods
  // ============================================

  async createMasterReport(report: {
    id: string;
    configurationId: number;
    contextVersion: number;
    contextHash: string;
    ucrSnapshot: any;
    execReportIds: string[];
    consolidatedInsights: any[];
    consolidatedRecommendations: any[];
    councilSynthesis: {
      keyThemes: string[];
      crossModulePatterns: string[];
      prioritizedActions: string[];
    };
    modulesIncluded: string[];
    overallConfidence: number;
    dataFreshness: 'fresh' | 'moderate' | 'stale';
  }): Promise<DbMasterReport> {
    const [created] = await db
      .insert(masterReports)
      .values({
        id: report.id,
        configurationId: report.configurationId,
        contextVersion: report.contextVersion,
        contextHash: report.contextHash,
        ucrSnapshot: report.ucrSnapshot,
        execReportIds: report.execReportIds,
        consolidatedInsights: report.consolidatedInsights,
        consolidatedRecommendations: report.consolidatedRecommendations,
        councilSynthesis: report.councilSynthesis,
        modulesIncluded: report.modulesIncluded,
        overallConfidence: report.overallConfidence,
        dataFreshness: report.dataFreshness,
      })
      .returning();

    return {
      id: created.id,
      configurationId: created.configurationId,
      contextVersion: created.contextVersion,
      contextHash: created.contextHash,
      generatedAt: created.generatedAt,
      ucrSnapshot: created.ucrSnapshot,
      execReportIds: created.execReportIds as string[],
      consolidatedInsights: created.consolidatedInsights as any[],
      consolidatedRecommendations: created.consolidatedRecommendations as any[],
      councilSynthesis: created.councilSynthesis as DbMasterReport['councilSynthesis'],
      modulesIncluded: created.modulesIncluded as string[],
      overallConfidence: created.overallConfidence,
      dataFreshness: created.dataFreshness as DbMasterReport['dataFreshness'],
      created_at: created.created_at,
    };
  }

  async getMasterReportsByConfiguration(configurationId: number): Promise<DbMasterReport[]> {
    const reports = await db
      .select()
      .from(masterReports)
      .where(eq(masterReports.configurationId, configurationId))
      .orderBy(desc(masterReports.generatedAt));

    return reports.map(r => ({
      id: r.id,
      configurationId: r.configurationId,
      contextVersion: r.contextVersion,
      contextHash: r.contextHash,
      generatedAt: r.generatedAt,
      ucrSnapshot: r.ucrSnapshot,
      execReportIds: r.execReportIds as string[],
      consolidatedInsights: r.consolidatedInsights as any[],
      consolidatedRecommendations: r.consolidatedRecommendations as any[],
      councilSynthesis: r.councilSynthesis as DbMasterReport['councilSynthesis'],
      modulesIncluded: r.modulesIncluded as string[],
      overallConfidence: r.overallConfidence,
      dataFreshness: r.dataFreshness as DbMasterReport['dataFreshness'],
      created_at: r.created_at,
    }));
  }

  async getLatestMasterReport(configurationId: number): Promise<DbMasterReport | null> {
    const [report] = await db
      .select()
      .from(masterReports)
      .where(eq(masterReports.configurationId, configurationId))
      .orderBy(desc(masterReports.generatedAt))
      .limit(1);

    if (!report) return null;

    return {
      id: report.id,
      configurationId: report.configurationId,
      contextVersion: report.contextVersion,
      contextHash: report.contextHash,
      generatedAt: report.generatedAt,
      ucrSnapshot: report.ucrSnapshot,
      execReportIds: report.execReportIds as string[],
      consolidatedInsights: report.consolidatedInsights as any[],
      consolidatedRecommendations: report.consolidatedRecommendations as any[],
      councilSynthesis: report.councilSynthesis as DbMasterReport['councilSynthesis'],
      modulesIncluded: report.modulesIncluded as string[],
      overallConfidence: report.overallConfidence,
      dataFreshness: report.dataFreshness as DbMasterReport['dataFreshness'],
      created_at: report.created_at,
    };
  }

  async getMasterReportById(id: string): Promise<DbMasterReport | null> {
    const [report] = await db
      .select()
      .from(masterReports)
      .where(eq(masterReports.id, id))
      .limit(1);

    if (!report) return null;

    return {
      id: report.id,
      configurationId: report.configurationId,
      contextVersion: report.contextVersion,
      contextHash: report.contextHash,
      generatedAt: report.generatedAt,
      ucrSnapshot: report.ucrSnapshot,
      execReportIds: report.execReportIds as string[],
      consolidatedInsights: report.consolidatedInsights as any[],
      consolidatedRecommendations: report.consolidatedRecommendations as any[],
      councilSynthesis: report.councilSynthesis as DbMasterReport['councilSynthesis'],
      modulesIncluded: report.modulesIncluded as string[],
      overallConfidence: report.overallConfidence,
      dataFreshness: report.dataFreshness as DbMasterReport['dataFreshness'],
      created_at: report.created_at,
    };
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  }
}

export class MemStorage implements IStorage {
  private configurations: Map<number, DbConfiguration> = new Map();
  private bulkJobs: Map<number, BulkJob> = new Map();
  private configurationVersions: Map<number, ConfigurationVersion[]> = new Map();
  private auditLogs: AuditLog[] = [];
  private execReports: Map<string, DbExecReport> = new Map();
  private masterReports: Map<string, DbMasterReport> = new Map();
  private currentConfigId = 1;
  private currentBulkJobId = 1;
  private currentVersionId = 1;
  private currentAuditLogId = 1;

  async getConfiguration(tenantId: number | null, userId: string): Promise<DbConfiguration | undefined> {
    return Array.from(this.configurations.values()).find(
      c => c.userId === userId && (tenantId === null ? c.tenantId === null : c.tenantId === tenantId)
    );
  }

  async getConfigurationById(id: number, tenantId: number | null, userId?: string): Promise<DbConfiguration | undefined> {
    const config = this.configurations.get(id);
    if (!config) return undefined;
    if (userId && config.userId !== userId) return undefined;
    if (tenantId !== null && config.tenantId !== tenantId) return undefined;
    if (tenantId === null && config.tenantId !== null) return undefined;
    return config;
  }

  async getAllConfigurations(tenantId: number | null, userId: string): Promise<DbConfiguration[]> {
    return Array.from(this.configurations.values())
      .filter(c => c.userId === userId && (tenantId === null ? c.tenantId === null : c.tenantId === tenantId))
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  async saveConfiguration(tenantId: number | null, userId: string, config: InsertConfiguration): Promise<DbConfiguration> {
    const existing = await this.getConfiguration(tenantId, userId);
    if (existing) {
      const updated: DbConfiguration = {
        ...existing,
        ...config,
        updated_at: new Date()
      };
      this.configurations.set(existing.id, updated);
      return updated;
    }
    return this.createConfiguration(tenantId, userId, config);
  }

  async createConfiguration(tenantId: number | null, userId: string, insertConfig: InsertConfiguration): Promise<DbConfiguration> {
    const id = this.currentConfigId++;
    const config: DbConfiguration = {
      id,
      tenantId,
      userId,
      ...insertConfig,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.configurations.set(id, config);
    return config;
  }

  async updateConfiguration(id: number, tenantId: number | null, userId: string, insertConfig: InsertConfiguration, editReason: string): Promise<DbConfiguration> {
    const existing = await this.getConfigurationById(id, tenantId, userId);
    if (!existing) throw new Error("Configuration not found");

    const updated: DbConfiguration = {
      ...existing,
      ...insertConfig,
      updated_at: new Date(),
    };
    this.configurations.set(id, updated);
    return updated;
  }

  async deleteConfiguration(id: number, tenantId: number | null, userId: string): Promise<void> {
    this.configurations.delete(id);
  }

  async createBulkJob(tenantId: number | null, userId: string, primaryCategory: string, brands: BulkBrandInput[]): Promise<BulkJob> {
    const id = this.currentBulkJobId++;
    const job: BulkJob = {
      id,
      tenantId,
      userId,
      status: "pending",
      totalBrands: brands.length,
      completedBrands: 0,
      failedBrands: 0,
      primaryCategory,
      brands,
      results: [],
      errors: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.bulkJobs.set(id, job);
    return job;
  }

  async getBulkJob(id: number, tenantId: number | null): Promise<BulkJob | undefined> {
    return this.bulkJobs.get(id);
  }

  async getBulkJobs(tenantId: number | null, userId: string): Promise<BulkJob[]> {
    return Array.from(this.bulkJobs.values())
      .filter(j => j.userId === userId && (tenantId === null ? j.tenantId === null : j.tenantId === tenantId))
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async updateBulkJob(id: number, tenantId: number | null, updates: Partial<BulkJob>): Promise<BulkJob> {
    const existing = this.bulkJobs.get(id);
    if (!existing) throw new Error("Bulk job not found");
    const updated = { ...existing, ...updates, updated_at: new Date() };
    this.bulkJobs.set(id, updated);
    return updated;
  }

  async createConfigurationVersion(configId: number, tenantId: number | null, userId: string, changeSummary: string): Promise<ConfigurationVersion> {
    const config = await this.getConfigurationById(configId, tenantId, userId);
    if (!config) throw new Error("Configuration not found");

    const versions = this.configurationVersions.get(configId) || [];
    const versionNumber = versions.length + 1;
    const version: ConfigurationVersion = {
      ...config,
      id: this.currentVersionId++,
      configurationId: configId,
      versionNumber,
      change_summary: changeSummary,
      created_at: new Date(),
    };
    versions.push(version);
    this.configurationVersions.set(configId, versions);
    return version;
  }

  async getConfigurationVersions(configId: number, tenantId: number | null, userId: string): Promise<ConfigurationVersion[]> {
    return (this.configurationVersions.get(configId) || []).sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async getConfigurationVersion(versionId: number, tenantId: number | null, userId: string): Promise<ConfigurationVersion | undefined> {
    for (const versions of Array.from(this.configurationVersions.values())) {
      const v = versions.find((v: ConfigurationVersion) => v.id === versionId);
      if (v) return v;
    }
    return undefined;
  }

  async restoreConfigurationVersion(versionId: number, tenantId: number | null, userId: string): Promise<DbConfiguration> {
    const version = await this.getConfigurationVersion(versionId, tenantId, userId);
    if (!version) throw new Error("Version not found");
    const config: DbConfiguration = {
      ...version,
      id: version.configurationId,
      tenantId: tenantId, // Explicitly set tenantId
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.configurations.set(config.id, config);
    return config;
  }

  async createAuditLog(log: Omit<AuditLog, "id" | "created_at">): Promise<AuditLog> {
    const auditLog: AuditLog = {
      ...log,
      id: this.currentAuditLogId++,
      created_at: new Date(),
    };
    this.auditLogs.push(auditLog);
    return auditLog;
  }

  async getAuditLogs(tenantId: number | null, configurationId?: number): Promise<AuditLog[]> {
    return this.auditLogs
      .filter(l => (tenantId === null ? l.tenantId === null : l.tenantId === tenantId) && 
                  (!configurationId || l.configurationId === configurationId))
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  // ExecReports
  async createExecReport(report: any): Promise<DbExecReport> {
    const execReport: DbExecReport = {
      ...report,
      executedAt: new Date(),
      created_at: new Date(),
    };
    this.execReports.set(report.id, execReport);
    return execReport;
  }

  async getExecReportsByConfiguration(configurationId: number, contextVersion?: number): Promise<DbExecReport[]> {
    return Array.from(this.execReports.values())
      .filter(r => r.configurationId === configurationId && (contextVersion === undefined || r.contextVersion === contextVersion))
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }

  async getExecReportById(id: string): Promise<DbExecReport | null> {
    return this.execReports.get(id) || null;
  }

  async getExecReportsByModule(configurationId: number, moduleId: string): Promise<DbExecReport[]> {
    return Array.from(this.execReports.values())
      .filter(r => r.configurationId === configurationId && r.moduleId === moduleId)
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }

  // MasterReports
  async createMasterReport(report: any): Promise<DbMasterReport> {
    const masterReport: DbMasterReport = {
      ...report,
      generatedAt: new Date(),
      created_at: new Date(),
    };
    this.masterReports.set(report.id, masterReport);
    return masterReport;
  }

  async getMasterReportsByConfiguration(configurationId: number): Promise<DbMasterReport[]> {
    return Array.from(this.masterReports.values())
      .filter(r => r.configurationId === configurationId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  async getLatestMasterReport(configurationId: number): Promise<DbMasterReport | null> {
    const reports = await this.getMasterReportsByConfiguration(configurationId);
    return reports[0] || null;
  }

  async getMasterReportById(id: string): Promise<DbMasterReport | null> {
    return this.masterReports.get(id) || null;
  }
}

import { db as dbInstance } from "./db";
export const storage = dbInstance ? new DatabaseStorage() : new MemStorage();
