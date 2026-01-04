import { db } from "./db";
import { tenants, userTenants, type Tenant, type InsertTenant, type UserTenant, type InsertUserTenant } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface ITenantStorage {
  createTenant(data: InsertTenant): Promise<Tenant>;
  getTenantById(id: number): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  updateTenant(id: number, data: Partial<InsertTenant>): Promise<Tenant>;
  deleteTenant(id: number): Promise<void>;
  getUserTenants(userId: string): Promise<(UserTenant & { tenant: Tenant })[]>;
  addUserToTenant(data: InsertUserTenant): Promise<UserTenant>;
  removeUserFromTenant(userId: string, tenantId: number): Promise<void>;
  updateUserTenantRole(userId: string, tenantId: number, role: string): Promise<UserTenant>;
  setDefaultTenant(userId: string, tenantId: number): Promise<void>;
  getDefaultTenant(userId: string): Promise<(UserTenant & { tenant: Tenant }) | undefined>;
  isUserInTenant(userId: string, tenantId: number): Promise<boolean>;
}

export class TenantStorage implements ITenantStorage {
  async createTenant(data: InsertTenant): Promise<Tenant> {
    const [created] = await db.insert(tenants).values(data).returning();
    return created;
  }

  async getTenantById(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return tenant;
  }

  async updateTenant(id: number, data: Partial<InsertTenant>): Promise<Tenant> {
    const [updated] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated;
  }

  async deleteTenant(id: number): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  async getUserTenants(userId: string): Promise<(UserTenant & { tenant: Tenant })[]> {
    const results = await db
      .select({
        id: userTenants.id,
        userId: userTenants.userId,
        tenantId: userTenants.tenantId,
        role: userTenants.role,
        isDefault: userTenants.isDefault,
        createdAt: userTenants.createdAt,
        tenant: tenants,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .where(and(eq(userTenants.userId, userId), eq(tenants.isActive, true)))
      .orderBy(desc(userTenants.isDefault), tenants.name);

    return results;
  }

  async addUserToTenant(data: InsertUserTenant): Promise<UserTenant> {
    const existingTenants = await this.getUserTenants(data.userId);
    const isDefault = existingTenants.length === 0 || data.isDefault === true;

    if (isDefault) {
      await db
        .update(userTenants)
        .set({ isDefault: false })
        .where(eq(userTenants.userId, data.userId));
    }

    const [created] = await db
      .insert(userTenants)
      .values({ ...data, isDefault })
      .returning();
    return created;
  }

  async removeUserFromTenant(userId: string, tenantId: number): Promise<void> {
    await db.delete(userTenants).where(
      and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId))
    );
  }

  async updateUserTenantRole(userId: string, tenantId: number, role: string): Promise<UserTenant> {
    const [updated] = await db
      .update(userTenants)
      .set({ role })
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async setDefaultTenant(userId: string, tenantId: number): Promise<void> {
    await db
      .update(userTenants)
      .set({ isDefault: false })
      .where(eq(userTenants.userId, userId));

    await db
      .update(userTenants)
      .set({ isDefault: true })
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
  }

  async getDefaultTenant(userId: string): Promise<(UserTenant & { tenant: Tenant }) | undefined> {
    const [result] = await db
      .select({
        id: userTenants.id,
        userId: userTenants.userId,
        tenantId: userTenants.tenantId,
        role: userTenants.role,
        isDefault: userTenants.isDefault,
        createdAt: userTenants.createdAt,
        tenant: tenants,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .where(and(eq(userTenants.userId, userId), eq(userTenants.isDefault, true)))
      .limit(1);

    if (result) return result;

    const userTenantsList = await this.getUserTenants(userId);
    return userTenantsList[0];
  }

  async isUserInTenant(userId: string, tenantId: number): Promise<boolean> {
    const [result] = await db
      .select()
      .from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
      .limit(1);
    return !!result;
  }
}

export const tenantStorage = new TenantStorage();
