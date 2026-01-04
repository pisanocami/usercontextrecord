import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenant } from "./use-tenant";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Configuration } from "@shared/schema";

interface BrandContextType {
  activeBrand: Configuration | null;
  activeBrandId: number | null;
  brands: Configuration[];
  isLoading: boolean;
  setActiveBrand: (brandId: number | null) => void;
  createBrand: (brandName: string, domain: string) => Promise<Configuration>;
  isCreating: boolean;
  refreshBrands: () => void;
}

const BrandContext = createContext<BrandContextType | null>(null);

const BRAND_STORAGE_KEY = "brand-intel-active-brand";

function getStoredBrandId(tenantId: string): number | null {
  try {
    const stored = localStorage.getItem(`${BRAND_STORAGE_KEY}-${tenantId}`);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

function setStoredBrandId(tenantId: string, brandId: number | null) {
  try {
    if (brandId === null) {
      localStorage.removeItem(`${BRAND_STORAGE_KEY}-${tenantId}`);
    } else {
      localStorage.setItem(`${BRAND_STORAGE_KEY}-${tenantId}`, brandId.toString());
    }
  } catch {
  }
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { currentTenant } = useTenant();
  const [activeBrandId, setActiveBrandIdState] = useState<number | null>(null);

  const { data: brandsData, isLoading, refetch } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
    enabled: !!currentTenant,
  });

  const brands = Array.isArray(brandsData) ? brandsData : [];

  useEffect(() => {
    if (currentTenant && brands.length > 0 && activeBrandId === null) {
      const storedId = getStoredBrandId(String(currentTenant.id));
      const exists = brands.some(b => b.id === storedId);
      if (storedId && exists) {
        setActiveBrandIdState(storedId);
      } else if (brands.length > 0) {
        setActiveBrandIdState(brands[0].id);
        setStoredBrandId(String(currentTenant.id), brands[0].id);
      }
    }
  }, [currentTenant, brands, activeBrandId]);

  useEffect(() => {
    if (!currentTenant) {
      setActiveBrandIdState(null);
    }
  }, [currentTenant]);

  const setActiveBrand = useCallback((brandId: number | null) => {
    setActiveBrandIdState(brandId);
    if (currentTenant) {
      setStoredBrandId(String(currentTenant.id), brandId);
    }
    queryClient.invalidateQueries({ queryKey: ["/api/configuration"] });
  }, [currentTenant]);

  const createBrandMutation = useMutation({
    mutationFn: async ({ brandName, domain }: { brandName: string; domain: string }) => {
      const newConfig = {
        name: brandName,
        brand: {
          name: brandName,
          domain: domain,
          industry: "",
          business_model: "B2B" as const,
          primary_geography: [],
          revenue_band: "",
          target_market: "",
        },
        category_definition: {
          primary_category: "",
          included: [],
          excluded: [],
          approved_categories: [],
          alternative_categories: [],
        },
        competitors: {
          direct: [],
          indirect: [],
          marketplaces: [],
          competitors: [],
          approved_count: 0,
          rejected_count: 0,
          pending_review_count: 0,
        },
        demand_definition: {
          brand_keywords: { seed_terms: [], top_n: 10 },
          non_brand_keywords: { category_terms: [], problem_terms: [], top_n: 50 },
        },
        strategic_intent: {
          growth_priority: "",
          risk_tolerance: "medium" as const,
          primary_goal: "",
          secondary_goals: [],
          avoid: [],
          goal_type: "roi" as const,
          time_horizon: "medium" as const,
          constraint_flags: {
            budget_constrained: false,
            resource_limited: false,
            regulatory_sensitive: false,
            brand_protection_priority: false,
          },
        },
        channel_context: {
          paid_media_active: false,
          seo_investment_level: "medium" as const,
          marketplace_dependence: "low" as const,
        },
        negative_scope: {
          excluded_categories: [],
          excluded_keywords: [],
          excluded_use_cases: [],
          excluded_competitors: [],
          category_exclusions: [],
          keyword_exclusions: [],
          use_case_exclusions: [],
          competitor_exclusions: [],
          enforcement_rules: {
            hard_exclusion: true,
            allow_model_suggestion: true,
            require_human_override_for_expansion: true,
          },
          audit_log: [],
        },
        governance: {
          model_suggested: false,
          human_overrides: { competitors: [], keywords: [], categories: [] },
          context_confidence: { level: "low" as const, notes: "" },
          last_reviewed: new Date().toISOString().split('T')[0],
          reviewed_by: "",
          context_valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cmo_safe: false,
          context_hash: "",
          context_version: 1,
          validation_status: "incomplete" as const,
          human_verified: false,
          blocked_reasons: [],
          quality_score: {
            completeness: 0,
            competitor_confidence: 0,
            negative_strength: 0,
            evidence_coverage: 0,
            overall: 0,
            grade: "low" as const,
            breakdown: {
              completeness_details: "",
              competitor_details: "",
              negative_details: "",
              evidence_details: "",
            },
            calculated_at: "",
          },
          ai_behavior: {
            regeneration_count: 0,
            max_regenerations: 1,
            redacted_fields: [],
            auto_approve_threshold: 80,
            require_human_below: 50,
            requires_human_review: false,
            auto_approved: false,
            violation_detected: false,
          },
        },
      };

      const response = await apiRequest("POST", "/api/configuration", newConfig);
      return response.json();
    },
    onSuccess: async (data) => {
      await refetch();
      if (data.id) {
        setActiveBrand(data.id);
        autoGenerateContext(data.id);
      }
    },
  });

  const autoGenerateContext = async (configId: number) => {
    const sections = [
      "brand",
      "category_definition", 
      "competitors",
      "demand_definition",
      "strategic_intent",
      "channel_context",
      "negative_scope",
      "governance",
    ];

    for (const section of sections) {
      try {
        await apiRequest("POST", "/api/ai/generate", { section, configId });
      } catch (error) {
        console.error(`Failed to generate ${section}:`, error);
      }
    }
    
    await refetch();
  };

  const createBrand = useCallback(async (brandName: string, domain: string) => {
    return createBrandMutation.mutateAsync({ brandName, domain });
  }, [createBrandMutation]);

  const activeBrand = brands.find(b => b.id === activeBrandId) || null;

  return (
    <BrandContext.Provider
      value={{
        activeBrand,
        activeBrandId,
        brands,
        isLoading,
        setActiveBrand,
        createBrand,
        isCreating: createBrandMutation.isPending,
        refreshBrands: refetch,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}
