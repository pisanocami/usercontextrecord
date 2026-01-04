import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";

interface UserTenantWithTenant {
  id: number;
  userId: string;
  tenantId: number;
  role: string;
  isDefault: boolean;
  createdAt: string;
  tenant: Tenant;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: UserTenantWithTenant[];
  isLoading: boolean;
  error: Error | null;
  switchTenant: (tenantId: number) => Promise<void>;
  createTenant: (data: { name: string; slug: string; description?: string }) => Promise<Tenant>;
  refetchTenants: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenantId, setCurrentTenantId] = useState<number | null>(() => {
    const stored = localStorage.getItem("currentTenantId");
    return stored ? parseInt(stored, 10) : null;
  });

  const { data: userTenants = [], isLoading: tenantsLoading, error: tenantsError, refetch } = useQuery<UserTenantWithTenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: defaultTenant, isLoading: defaultLoading } = useQuery<UserTenantWithTenant>({
    queryKey: ["/api/tenants/default"],
    enabled: !currentTenantId && userTenants.length > 0,
  });

  useEffect(() => {
    if (!currentTenantId && defaultTenant) {
      setCurrentTenantId(defaultTenant.tenantId);
      localStorage.setItem("currentTenantId", defaultTenant.tenantId.toString());
    }
  }, [currentTenantId, defaultTenant]);

  useEffect(() => {
    if (!currentTenantId && userTenants.length > 0) {
      const firstTenant = userTenants[0];
      setCurrentTenantId(firstTenant.tenantId);
      localStorage.setItem("currentTenantId", firstTenant.tenantId.toString());
    }
  }, [currentTenantId, userTenants]);

  const currentTenant = userTenants.find(ut => ut.tenantId === currentTenantId)?.tenant || null;

  const setDefaultMutation = useMutation({
    mutationFn: async (tenantId: number) => {
      await apiRequest("POST", `/api/tenants/${tenantId}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/default"] });
    },
  });

  const switchTenant = useCallback(async (tenantId: number) => {
    setCurrentTenantId(tenantId);
    localStorage.setItem("currentTenantId", tenantId.toString());
    await setDefaultMutation.mutateAsync(tenantId);
    queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bulk-jobs"] });
  }, [setDefaultMutation]);

  const createTenantMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; description?: string }) => {
      const response = await apiRequest("POST", "/api/tenants", data);
      return response.json() as Promise<Tenant>;
    },
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setCurrentTenantId(tenant.id);
      localStorage.setItem("currentTenantId", tenant.id.toString());
    },
  });

  const createTenant = useCallback(async (data: { name: string; slug: string; description?: string }) => {
    return createTenantMutation.mutateAsync(data);
  }, [createTenantMutation]);

  const refetchTenants = useCallback(() => {
    refetch();
  }, [refetch]);

  const isLoading = tenantsLoading || defaultLoading;
  const error = tenantsError as Error | null;

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        userTenants,
        isLoading,
        error,
        switchTenant,
        createTenant,
        refetchTenants,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export function useTenantId(): number | null {
  const { currentTenant } = useTenant();
  return currentTenant?.id || null;
}
