import { db } from "./db";
import { tenants, userTenants, type Tenant, type InsertTenant, type UserTenant, type InsertUserTenant } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

// In-memory fallback for development when no database is available
const inMemoryTenants: Map<number, Tenant> = new Map();
const inMemoryUserTenants: Map<string, (UserTenant & { tenant: Tenant })[]> = new Map();
let tenantIdCounter = 1;
let userTenantIdCounter = 1;

// Check if database is available
const useInMemory = !db;

if (useInMemory) {
  console.log("📦 Using in-memory tenant storage for development");
}

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
    if (useInMemory) {
      const tenant: Tenant = {
        id: tenantIdCounter++,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        logoUrl: data.logoUrl || null,
        primaryColor: data.primaryColor || '#3B82F6',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryTenants.set(tenant.id, tenant);
      return tenant;
    }
    const [created] = await db.insert(tenants).values(data).returning();
    return created;
  }

  async getTenantById(id: number): Promise<Tenant | undefined> {
    if (useInMemory) {
      return inMemoryTenants.get(id);
    }
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    if (useInMemory) {
      return Array.from(inMemoryTenants.values()).find(t => t.slug === slug);
    }
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return tenant;
  }

  async updateTenant(id: number, data: Partial<InsertTenant>): Promise<Tenant> {
    if (useInMemory) {
      const tenant = inMemoryTenants.get(id);
      if (!tenant) throw new Error('Tenant not found');
      const updated = { ...tenant, ...data, updatedAt: new Date() };
      inMemoryTenants.set(id, updated);
      return updated;
    }
    const [updated] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated;
  }

  async deleteTenant(id: number): Promise<void> {
    if (useInMemory) {
      inMemoryTenants.delete(id);
      // Also remove user-tenant associations
      const entries = Array.from(inMemoryUserTenants.entries());
      for (const entry of entries) {
        const [userId, userTenantList] = entry;
        inMemoryUserTenants.set(userId, userTenantList.filter((ut: UserTenant & { tenant: Tenant }) => ut.tenantId !== id));
      }
      return;
    }
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  async getUserTenants(userId: string): Promise<(UserTenant & { tenant: Tenant })[]> {
    if (useInMemory) {
      return inMemoryUserTenants.get(userId) || [];
    }
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

    if (useInMemory) {
      const tenant = inMemoryTenants.get(data.tenantId);
      if (!tenant) throw new Error('Tenant not found');
      
      // Set all existing to non-default if this is default
      if (isDefault) {
        const userList = inMemoryUserTenants.get(data.userId) || [];
        userList.forEach(ut => ut.isDefault = false);
      }
      
      const userTenant: UserTenant & { tenant: Tenant } = {
        id: userTenantIdCounter++,
        userId: data.userId,
        tenantId: data.tenantId,
        role: data.role || 'member',
        isDefault: isDefault,
        createdAt: new Date(),
        tenant: tenant,
      };
      
      const userList = inMemoryUserTenants.get(data.userId) || [];
      userList.push(userTenant);
      inMemoryUserTenants.set(data.userId, userList);
      
      return userTenant;
    }

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
    if (useInMemory) {
      const userList = inMemoryUserTenants.get(userId) || [];
      inMemoryUserTenants.set(userId, userList.filter(ut => ut.tenantId !== tenantId));
      return;
    }
    await db.delete(userTenants).where(
      and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId))
    );
  }

  async updateUserTenantRole(userId: string, tenantId: number, role: string): Promise<UserTenant> {
    if (useInMemory) {
      const userList = inMemoryUserTenants.get(userId) || [];
      const ut = userList.find(u => u.tenantId === tenantId);
      if (!ut) throw new Error('User tenant not found');
      ut.role = role;
      return ut;
    }
    const [updated] = await db
      .update(userTenants)
      .set({ role })
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async setDefaultTenant(userId: string, tenantId: number): Promise<void> {
    if (useInMemory) {
      const userList = inMemoryUserTenants.get(userId) || [];
      userList.forEach(ut => {
        ut.isDefault = ut.tenantId === tenantId;
      });
      return;
    }
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
    if (useInMemory) {
      const userList = inMemoryUserTenants.get(userId) || [];
      const defaultTenant = userList.find(ut => ut.isDefault);
      return defaultTenant || userList[0];
    }
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
    if (useInMemory) {
      const userList = inMemoryUserTenants.get(userId) || [];
      return userList.some(ut => ut.tenantId === tenantId);
    }
    const [result] = await db
      .select()
      .from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
      .limit(1);
    return !!result;
  }
}

export const tenantStorage = new TenantStorage();
