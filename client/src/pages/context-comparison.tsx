/**
 * Context Comparison Page
 * 
 * Full page for comparing multiple contexts side-by-side.
 */

import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ComparisonView } from "@/components/comparison";
import { useComparison, parseContextIdsFromUrl, buildCompareUrl } from "@/hooks/use-comparison";
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
  const { data: allConfigurations } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
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

  const handleAddContext = (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (!isNaN(id) && !selectedIds.includes(id) && selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleRemoveContext = (id: number) => {
    setSelectedIds(selectedIds.filter((i) => i !== id));
  };

  const availableContexts = allConfigurations?.filter(
    (c) => !selectedIds.includes(Number(c.id))
  );

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
            {/* Context Selector - Show when no contexts selected */}
            {selectedIds.length === 0 && allConfigurations && allConfigurations.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {allConfigurations.length} contexts available
              </div>
            )}
            
            {/* Context Selector - Show when contexts exist to add */}
            {selectedIds.length > 0 && selectedIds.length < 4 && availableContexts && availableContexts.length > 0 && (
              <Select onValueChange={handleAddContext}>
                <SelectTrigger className="w-[200px]">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <SelectValue placeholder="Add context..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableContexts.map((ctx) => (
                    <SelectItem key={ctx.id} value={String(ctx.id)}>
                      {ctx.name || ctx.brand?.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Selected contexts badges */}
            <div className="flex items-center gap-2">
              {selectedIds.map((id) => {
                const ctx = allConfigurations?.find((c) => Number(c.id) === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span className="max-w-[100px] truncate">
                      {ctx?.name || ctx?.brand?.domain || `ID: ${id}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleRemoveContext(id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </div>
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
