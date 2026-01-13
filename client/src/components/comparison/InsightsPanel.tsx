/**
 * InsightsPanel Component
 * 
 * Displays generated insights from the comparison.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import type { ComparisonInsight, InsightType, InsightPriority } from "@/lib/comparison/types";

interface InsightsPanelProps {
  insights: ComparisonInsight[];
  maxInsights?: number;
}

const insightIcons: Record<InsightType, React.ElementType> = {
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
  opportunity: Lightbulb,
};

const insightColors: Record<InsightType, string> = {
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-green-600 dark:text-green-400",
  info: "text-blue-600 dark:text-blue-400",
  opportunity: "text-purple-600 dark:text-purple-400",
};

const insightBgColors: Record<InsightType, string> = {
  warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  opportunity: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
};

const priorityLabels: Record<InsightPriority, string> = {
  high: "High Priority",
  medium: "Medium",
  low: "Low",
};

function InsightCard({ insight }: { insight: ComparisonInsight }) {
  const Icon = insightIcons[insight.type];

  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        insightBgColors[insight.type]
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5", insightColors[insight.type])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{insight.title}</h4>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                insight.priority === "high" && "border-red-300 text-red-700",
                insight.priority === "medium" && "border-yellow-300 text-yellow-700",
                insight.priority === "low" && "border-gray-300 text-gray-600"
              )}
            >
              {priorityLabels[insight.priority]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {insight.description}
          </p>
          {insight.suggestion && (
            <div className="flex items-start gap-2 mt-2 p-2 bg-background/50 rounded text-xs">
              <ChevronRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
              <span>{insight.suggestion}</span>
            </div>
          )}
          {insight.affectedContextNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {insight.affectedContextNames.map((name, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function InsightsPanel({ insights, maxInsights = 10 }: InsightsPanelProps) {
  const displayInsights = insights.slice(0, maxInsights);
  const hasMore = insights.length > maxInsights;

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparison Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No significant insights detected. The contexts appear to be well-aligned.
          </p>
        </CardContent>
      </Card>
    );
  }

  const warningCount = insights.filter((i) => i.type === "warning").length;
  const opportunityCount = insights.filter((i) => i.type === "opportunity").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Comparison Insights</span>
          <div className="flex gap-2">
            {warningCount > 0 && (
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                {warningCount} warning{warningCount > 1 ? "s" : ""}
              </Badge>
            )}
            {opportunityCount > 0 && (
              <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                {opportunityCount} opportunit{opportunityCount > 1 ? "ies" : "y"}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayInsights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
        {hasMore && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Showing {maxInsights} of {insights.length} insights
          </p>
        )}
      </CardContent>
    </Card>
  );
}
