/**
 * CMODashboardView Component
 * 
 * CMO-grade dashboard view with strategic intelligence visualization.
 * Replaces detailed view for executive decision-making.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Target,
  Shield,
  TrendingUp,
  DollarSign,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Download,
} from "lucide-react";
import { StrategicScorecard } from "./StrategicScorecard";
import { CompetitiveBattlefieldMap } from "./CompetitiveBattlefieldMap";
import { KeywordBattleground } from "./KeywordBattleground";
import { StrategicRecommendations } from "./StrategicRecommendations";
import { InsightsPanel } from "./InsightsPanel";
import type { ComparisonResult, ComparisonSettings } from "@/lib/comparison/types";

interface CMODashboardViewProps {
  result: ComparisonResult;
  settings: ComparisonSettings;
  onSettingsChange: (settings: Partial<ComparisonSettings>) => void;
}

export function CMODashboardView({ result, settings, onSettingsChange }: CMODashboardViewProps) {
  const [viewMode, setViewMode] = useState<"dashboard" | "detailed">("dashboard");
  const [showInsights, setShowInsights] = useState(true);

  const toggleView = () => {
    setViewMode(viewMode === "dashboard" ? "detailed" : "dashboard");
  };

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium">View Mode:</Label>
          <div className="flex items-center gap-2 bg-background rounded-lg p-1">
            <Button
              variant={viewMode === "dashboard" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("dashboard")}
              className="px-3"
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              CMO Dashboard
            </Button>
            <Button
              variant={viewMode === "detailed" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("detailed")}
              className="px-3"
            >
              <List className="h-4 w-4 mr-1" />
              Detailed View
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-insights"
              checked={showInsights}
              onCheckedChange={setShowInsights}
            />
            <Label htmlFor="show-insights" className="text-sm cursor-pointer">
              {showInsights ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Insights Visible
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Insights Hidden
                </>
              )}
            </Label>
          </div>
        </div>
      </div>

      {viewMode === "dashboard" ? (
        /* CMO Dashboard View */
        <div className="space-y-6">
          {/* Strategic Scorecard */}
          {result.strategicMetrics && (
            <StrategicScorecard metrics={result.strategicMetrics} compact />
          )}

          {/* Strategic Intelligence Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Competitive Battlefield */}
            <CompetitiveBattlefieldMap
              contexts={result.contexts}
              competitorMatrix={result.competitorMatrix}
            />

            {/* Keyword Battleground */}
            <KeywordBattleground contexts={result.contexts} />
          </div>

          {/* Strategic Recommendations */}
          <StrategicRecommendations
            contexts={result.contexts}
            strategicMetrics={result.strategicMetrics!}
            insights={result.insights}
          />

          {/* Insights Panel */}
          {showInsights && (
            <InsightsPanel insights={result.insights} maxInsights={15} />
          )}
        </div>
      ) : (
        {/* Detailed View (existing functionality) */}
        <div className="space-y-6">
          {/* Strategic Scorecard */}
          {result.strategicMetrics && (
            <StrategicScorecard metrics={result.strategicMetrics} />
          )}

          {/* Existing Sections */}
          {Object.entries(result.sections).map(([sectionKey, section]) => (
            <Card key={sectionKey}>
              <CardHeader>
                <CardTitle className="text-base">{section.sectionTitle}</CardTitle>
                <Badge variant="outline">
                  {section.overallMatch}% match
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {section.fields.length} fields compared
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Existing Insights */}
          {showInsights && (
            <InsightsPanel insights={result.insights} />
          )}
        </div>
      )}
  );
}
