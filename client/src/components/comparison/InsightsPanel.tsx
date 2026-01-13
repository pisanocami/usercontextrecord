/**
 * InsightsPanel Component
 * 
 * CMO-grade insights panel with actionable recommendations.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Target,
  TrendingUp,
  Shield,
  DollarSign,
  CheckSquare,
} from "lucide-react";
import type { ComparisonInsight, InsightType, InsightPriority, InsightCategory, InsightImpact } from "@/lib/comparison/types";

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

const categoryIcons: Record<InsightCategory, React.ElementType> = {
  threat: Shield,
  opportunity: TrendingUp,
  positioning: Target,
  resource: DollarSign,
};

const categoryLabels: Record<InsightCategory, string> = {
  threat: "Threat",
  opportunity: "Opportunity",
  positioning: "Positioning",
  resource: "Resource",
};

const impactColors: Record<InsightImpact, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function InsightCard({ insight }: { insight: ComparisonInsight }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = insightIcons[insight.type];
  const CategoryIcon = insight.category ? categoryIcons[insight.category] : null;
  const hasActionItems = insight.actionItems && insight.actionItems.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden",
        insightBgColors[insight.type]
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5", insightColors[insight.type])}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  {insight.category && (
                    <Badge variant="outline" className="text-xs gap-1">
                      {CategoryIcon && <CategoryIcon className="h-3 w-3" />}
                      {categoryLabels[insight.category]}
                    </Badge>
                  )}
                  {insight.estimatedImpact && (
                    <Badge className={cn("text-xs", impactColors[insight.estimatedImpact])}>
                      {insight.estimatedImpact.charAt(0).toUpperCase() + insight.estimatedImpact.slice(1)} Impact
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {insight.description}
                </p>
                {insight.metric && (
                  <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-background/50 rounded text-xs">
                    <span className="font-medium">{insight.metric.label}:</span>
                    <span className="font-bold text-primary">{insight.metric.value}</span>
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {hasActionItems && (
                  isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        {hasActionItems && (
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 border-t border-current/10">
              <div className="mt-3">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Action Items
                </h5>
                <ul className="space-y-1.5">
                  {insight.actionItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {insight.affectedContextNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-current/10">
                  <span className="text-xs text-muted-foreground mr-1">Affects:</span>
                  {insight.affectedContextNames.map((name, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
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
