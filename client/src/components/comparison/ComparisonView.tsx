/**
 * ComparisonView Component
 * 
 * Main container component that orchestrates the comparison UI.
 */

import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { ComparisonHeader } from "./ComparisonHeader";
import { ComparisonToolbar } from "./ComparisonToolbar";
import { SectionComparisonCard } from "./SectionComparisonCard";
import { OverlapMatrix } from "./OverlapMatrix";
import { InsightsPanel } from "./InsightsPanel";
import type { ComparisonResult, ComparisonSettings, SectionKey } from "@/lib/comparison/types";
import { DEFAULT_COMPARISON_SETTINGS, SECTION_DEFINITIONS } from "@/lib/comparison/types";

interface ComparisonViewProps {
  result: ComparisonResult | null;
  isLoading: boolean;
  error: Error | null;
  onRemoveContext?: (contextId: number) => void;
}

export function ComparisonView({
  result,
  isLoading,
  error,
  onRemoveContext,
}: ComparisonViewProps) {
  const [settings, setSettings] = useState<ComparisonSettings>(DEFAULT_COMPARISON_SETTINGS);

  const handleSettingsChange = (partial: Partial<ComparisonSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const filteredSections = useMemo(() => {
    if (!result) return [];

    return SECTION_DEFINITIONS.filter((def) => {
      // Filter by selected sections
      if (!settings.sections.includes(def.key)) return false;

      const section = result.sections[def.key];
      if (!section) return false;

      // Filter by highlight mode
      if (settings.highlightMode === "differences") {
        return section.overallMatch < 100;
      }
      if (settings.highlightMode === "matches") {
        return section.overallMatch === 100;
      }

      return true;
    }).map((def) => result.sections[def.key]);
  }, [result, settings.sections, settings.highlightMode]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-16" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load comparison: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!result || result.contexts.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="max-w-md text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          
          {/* Title */}
          <div>
            <h2 className="text-xl font-semibold">Select Contexts to Compare</h2>
            <p className="text-muted-foreground mt-2">
              Choose 2-4 contexts from your list to see detailed side-by-side comparisons
            </p>
          </div>
          
          {/* Steps */}
          <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
            <h3 className="font-medium text-sm">How to compare contexts:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-medium text-primary">1.</span>
                <span>Go to <strong>"My Contexts"</strong> from the sidebar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-primary">2.</span>
                <span>Click the <strong>GitCompare</strong> icon on each context you want to compare</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-primary">3.</span>
                <span>Use the floating bar at the bottom to start comparing</span>
              </li>
            </ol>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-3 justify-center">
            <a href="/" className="inline-flex">
              <Button variant="outline">
                Go to My Contexts
              </Button>
            </a>
            {result && result.contexts.length === 1 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onRemoveContext?.(Number(result.contexts[0].id))}
              >
                Clear Selection
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Context Header Cards */}
        <ComparisonHeader
          contexts={result.contexts}
          onRemoveContext={onRemoveContext}
        />

        {/* Toolbar */}
        <div className="mt-6">
          <ComparisonToolbar
            settings={settings}
            onSettingsChange={handleSettingsChange}
            overallSimilarity={result.overlapMetrics.overallSimilarity}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column: Section Comparisons */}
          <div className="lg:col-span-2 space-y-4">
            {filteredSections.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No sections match the current filter criteria.
                </AlertDescription>
              </Alert>
            ) : (
              filteredSections.map((section) => (
                <SectionComparisonCard
                  key={section.sectionKey}
                  section={section}
                  defaultOpen={filteredSections.length <= 3}
                />
              ))
            )}

            {/* Competitor Overlap Matrix */}
            <OverlapMatrix
              competitorMatrix={result.competitorMatrix}
              contexts={result.contexts}
            />
          </div>

          {/* Right Column: Insights */}
          {settings.showInsights && (
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <InsightsPanel insights={result.insights} />

                {/* Overlap Metrics Summary */}
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-sm mb-3">Overlap Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Competitors</span>
                      <span className="font-medium">{result.overlapMetrics.competitorOverlap}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Keywords</span>
                      <span className="font-medium">{result.overlapMetrics.keywordOverlap}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categories</span>
                      <span className="font-medium">{result.overlapMetrics.categoryOverlap}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Geography</span>
                      <span className="font-medium">{result.overlapMetrics.geographyOverlap}%</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                      <span>Overall Similarity</span>
                      <span>{result.overlapMetrics.overallSimilarity}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Comparison Timestamp */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Comparison generated at {new Date(result.comparedAt).toLocaleString()}
        </div>
      </div>
    </ScrollArea>
  );
}
