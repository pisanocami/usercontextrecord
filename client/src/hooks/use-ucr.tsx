import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";

export interface SectionStatus {
  complete: boolean;
  warnings: string[];
  required: boolean;
}

export interface UCRStatus {
  isValid: boolean;
  isCMOSafe: boolean;
  isExpired: boolean;
  validationStatus: "valid" | "incomplete" | "blocked" | "expired" | "no_context";
  sectionStatus: {
    brand: SectionStatus;
    category_definition: SectionStatus;
    competitors: SectionStatus;
    demand_definition: SectionStatus;
    strategic_intent: SectionStatus;
    channel_context: SectionStatus;
    negative_scope: SectionStatus;
    governance: SectionStatus;
  };
  missingFields: string[];
  warnings: string[];
  blockedReasons: string[];
  contextAge: number;
  expiresInDays: number;
}

interface UCRGateResponse {
  allowed: boolean;
  reason: string;
  validation: UCRStatus | null;
}

interface UCRStatusResponse {
  hasContext: boolean;
  configurationId?: number;
  status: UCRStatus;
  snapshotHash?: string;
  snapshotAt?: string;
}

interface UCRContextType {
  status: UCRStatus | null;
  isLoading: boolean;
  isAllowed: boolean;
  blockReason: string | null;
  hasContext: boolean;
  configurationId: number | null;
  snapshotHash: string | null;
  refetch: () => void;
  getSectionStatus: (section: keyof UCRStatus["sectionStatus"]) => SectionStatus | null;
  getCompletionPercentage: () => number;
  getRequiredIncomplete: () => string[];
}

const UCRContext = createContext<UCRContextType | null>(null);

export function UCRProvider({ children }: { children: ReactNode }) {
  const { currentTenant } = useTenant();
  const [isAllowed, setIsAllowed] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);

  const { data: statusData, isLoading: statusLoading, refetch } = useQuery<UCRStatusResponse>({
    queryKey: ["/api/ucr/status"],
    enabled: !!currentTenant,
    refetchOnWindowFocus: false,
  });

  const { data: gateData, isLoading: gateLoading } = useQuery<UCRGateResponse>({
    queryKey: ["/api/ucr/gate"],
    enabled: !!currentTenant,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (gateData) {
      setIsAllowed(gateData.allowed);
      setBlockReason(gateData.allowed ? null : gateData.reason);
    }
  }, [gateData]);

  const getSectionStatus = (section: keyof UCRStatus["sectionStatus"]): SectionStatus | null => {
    if (!statusData?.status?.sectionStatus) return null;
    return statusData.status.sectionStatus[section];
  };

  const getCompletionPercentage = (): number => {
    if (!statusData?.status?.sectionStatus) return 0;
    const sections = statusData.status.sectionStatus;
    const requiredSections = Object.entries(sections).filter(([_, s]) => s.required);
    const completeSections = requiredSections.filter(([_, s]) => s.complete);
    return requiredSections.length > 0 
      ? Math.round((completeSections.length / requiredSections.length) * 100)
      : 0;
  };

  const getRequiredIncomplete = (): string[] => {
    if (!statusData?.status?.sectionStatus) return [];
    const sections = statusData.status.sectionStatus;
    return Object.entries(sections)
      .filter(([_, s]) => s.required && !s.complete)
      .map(([name]) => name);
  };

  return (
    <UCRContext.Provider
      value={{
        status: statusData?.status ?? null,
        isLoading: statusLoading || gateLoading,
        isAllowed,
        blockReason,
        hasContext: statusData?.hasContext ?? false,
        configurationId: statusData?.configurationId ?? null,
        snapshotHash: statusData?.snapshotHash ?? null,
        refetch,
        getSectionStatus,
        getCompletionPercentage,
        getRequiredIncomplete,
      }}
    >
      {children}
    </UCRContext.Provider>
  );
}

export function useUCR() {
  const context = useContext(UCRContext);
  if (!context) {
    throw new Error("useUCR must be used within a UCRProvider");
  }
  return context;
}

export function useUCRGate() {
  const { isAllowed, blockReason, isLoading, status } = useUCR();
  return {
    canExecuteModules: isAllowed && !isLoading,
    isBlocked: !isAllowed && !isLoading,
    reason: blockReason,
    isLoading,
    validationStatus: status?.validationStatus ?? "no_context",
  };
}
