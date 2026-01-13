/**
 * useComparison Hook
 * 
 * Custom hook for fetching and comparing multiple contexts.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { compareContexts } from "@/lib/comparison";
import type { ComparisonResult } from "@/lib/comparison/types";
import type { Configuration } from "@shared/schema";

interface UseComparisonOptions {
  enabled?: boolean;
}

interface UseComparisonResult {
  result: ComparisonResult | null;
  contexts: Configuration[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useComparison(
  contextIds: number[],
  options: UseComparisonOptions = {}
): UseComparisonResult {
  const { enabled = true } = options;

  // Fetch all configurations
  const {
    data: allConfigurations,
    isLoading,
    error,
    refetch,
  } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
    enabled: enabled && contextIds.length >= 2,
  });

  // Filter to only the selected contexts
  const contexts = useMemo(() => {
    if (!allConfigurations) return [];
    return allConfigurations.filter((config) =>
      contextIds.includes(Number(config.id))
    );
  }, [allConfigurations, contextIds]);

  // Run comparison algorithm
  const result = useMemo(() => {
    if (contexts.length < 2) return null;
    try {
      return compareContexts(contexts);
    } catch (err) {
      console.error("Comparison error:", err);
      return null;
    }
  }, [contexts]);

  return {
    result,
    contexts,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Parse context IDs from URL search params
 */
export function parseContextIdsFromUrl(searchParams: URLSearchParams): number[] {
  const idsParam = searchParams.get("ids");
  if (!idsParam) return [];

  return idsParam
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id) && id > 0);
}

/**
 * Build URL with context IDs
 */
export function buildCompareUrl(contextIds: number[]): string {
  if (contextIds.length === 0) return "/compare";
  return `/compare?ids=${contextIds.join(",")}`;
}
