import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface BrandEntity {
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

export interface InsertBrandEntity {
  domain: string;
  name?: string;
  industry?: string;
  business_model?: string;
  primary_geography?: string[];
  revenue_band?: string;
  target_market?: string;
}

interface BrandContextType {
  brands: BrandEntity[];
  isLoading: boolean;
  selectedBrand: BrandEntity | null;
  selectBrand: (brand: BrandEntity | null) => void;
  selectBrandById: (id: number) => void;
  createBrand: (data: InsertBrandEntity) => Promise<BrandEntity>;
  updateBrand: (id: number, data: Partial<InsertBrandEntity>) => Promise<BrandEntity>;
  deleteBrand: (id: number) => Promise<void>;
  refetchBrands: () => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const SELECTED_BRAND_KEY = "selected-brand-id";

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedBrand, setSelectedBrand] = useState<BrandEntity | null>(null);

  const { data: brands = [], isLoading, refetch } = useQuery<BrandEntity[]>({
    queryKey: ["/api/brands"],
  });

  useEffect(() => {
    const savedId = localStorage.getItem(SELECTED_BRAND_KEY);
    if (savedId && brands.length > 0) {
      const brand = brands.find((b) => b.id === parseInt(savedId));
      if (brand) {
        setSelectedBrand(brand);
      }
    }
  }, [brands]);

  const selectBrand = useCallback((brand: BrandEntity | null) => {
    setSelectedBrand(brand);
    if (brand) {
      localStorage.setItem(SELECTED_BRAND_KEY, brand.id.toString());
    } else {
      localStorage.removeItem(SELECTED_BRAND_KEY);
    }
  }, []);

  const selectBrandById = useCallback(
    (id: number) => {
      const brand = brands.find((b) => b.id === id);
      if (brand) {
        selectBrand(brand);
      }
    },
    [brands, selectBrand]
  );

  const createBrandMutation = useMutation({
    mutationFn: async (data: InsertBrandEntity) => {
      const res = await apiRequest("POST", "/api/brands", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertBrandEntity> }) => {
      const res = await apiRequest("PUT", `/api/brands/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      if (selectedBrand && deleteBrandMutation.variables === selectedBrand.id) {
        selectBrand(null);
      }
    },
  });

  const createBrand = async (data: InsertBrandEntity): Promise<BrandEntity> => {
    return createBrandMutation.mutateAsync(data);
  };

  const updateBrand = async (id: number, data: Partial<InsertBrandEntity>): Promise<BrandEntity> => {
    return updateBrandMutation.mutateAsync({ id, data });
  };

  const deleteBrand = async (id: number): Promise<void> => {
    return deleteBrandMutation.mutateAsync(id);
  };

  return (
    <BrandContext.Provider
      value={{
        brands,
        isLoading,
        selectedBrand,
        selectBrand,
        selectBrandById,
        createBrand,
        updateBrand,
        deleteBrand,
        refetchBrands: refetch,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}
