/**
 * Context Comparison Page
 * 
 * Full page for comparing multiple contexts side-by-side.
 */

import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ComparisonView } from "@/components/comparison";
import { ContextSelector } from "@/components/comparison/ContextSelector";
import { useComparison, parseContextIdsFromUrl, buildCompareUrl } from "@/hooks/use-comparison";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { SelectionCounter } from "@/components/ui/selection-counter";
import type { Configuration } from "@shared/schema";

export default function ContextComparisonPage() {
  const [location, setLocation] = useLocation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Parse IDs from URL on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const ids = parseContextIdsFromUrl(searchParams);
    if (ids.length > 0) {
      setSelectedIds(ids);
    }
  }, []);

  // Fetch all configurations for the selector
  const { 
    data: allConfigurations, 
    isLoading: isLoadingConfigs,
    error: configsError,
    refetch: refetchConfigs
  } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Run comparison
  const { result, isLoading, error } = useComparison(selectedIds);

  // Update URL when selection changes
  useEffect(() => {
    const newUrl = buildCompareUrl(selectedIds);
    if (location !== newUrl) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [selectedIds, location]);

  const handleAddContext = (id: number) => {
    if (!selectedIds.includes(id) && selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleRemoveContext = (id: number) => {
    setSelectedIds(selectedIds.filter((i) => i !== id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Contexts
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Context Comparison</h1>
              <p className="text-sm text-muted-foreground">
                {selectedIds.length === 0 
                  ? "Select contexts to compare side-by-side"
                  : `Compare ${selectedIds.length} context${selectedIds.length !== 1 ? "s" : ""} side-by-side`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SelectionCounter selected={selectedIds.length} max={4} />
          </div>
        </div>

        {/* Context Selector */}
        <div className="mt-4">
          {isLoadingConfigs ? (
            <LoadingState message="Loading contexts..." size="sm" />
          ) : configsError ? (
            <ErrorState
              error={configsError as Error}
              title="Failed to load contexts"
              onRetry={() => refetchConfigs()}
            />
          ) : allConfigurations ? (
            <ContextSelector
              configurations={allConfigurations}
              selectedIds={selectedIds}
              onSelect={handleAddContext}
              onRemove={handleRemoveContext}
              maxSelections={4}
              isLoading={isLoadingConfigs}
            />
          ) : null}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ComparisonView
          result={result}
          isLoading={isLoading}
          error={error}
          onRemoveContext={handleRemoveContext}
        />
      </div>
    </div>
  );
}
