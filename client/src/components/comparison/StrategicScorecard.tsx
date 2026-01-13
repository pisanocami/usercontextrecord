/**
 * StrategicScorecard Component
 * 
 * CMO-grade strategic metrics visualization replacing generic similarity scores.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Shield,
  Target,
  TrendingUp,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { StrategicMetrics, MetricScore } from "@/lib/comparison/types";

interface StrategicScorecardProps {
  metrics: StrategicMetrics;
  compact?: boolean;
}

const metricConfig = {
  competitiveIntensity: {
    label: "Competitive Intensity",
    description: "How much these brands fight for the same customer",
    icon: Shield,
    color: {
      low: "bg-green-500",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      critical: "bg-red-500",
    },
  },
  strategicAlignment: {
    label: "Strategic Alignment",
    description: "How similar their go-to-market approaches are",
    icon: Target,
    color: {
      low: "bg-blue-500",
      medium: "bg-indigo-500",
      high: "bg-purple-500",
      critical: "bg-pink-500",
    },
  },
  marketAdjacency: {
    label: "Market Adjacency",
    description: "How close their target markets are",
    icon: TrendingUp,
    color: {
      low: "bg-teal-500",
      medium: "bg-cyan-500",
      high: "bg-sky-500",
      critical: "bg-blue-500",
    },
  },
  threatProbability: {
    label: "Threat Probability",
    description: "Likelihood of direct competition in 12-24 months",
    icon: AlertTriangle,
    color: {
      low: "bg-green-500",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      critical: "bg-red-500",
    },
  },
};

function MetricCard({ 
  metric, 
  config, 
  compact = false 
}: { 
  metric: MetricScore; 
  config: typeof metricConfig.competitiveIntensity; 
  compact?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = config.icon;
  const colorClass = config.color[metric.label];

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
        <div className={cn("h-2 w-2 rounded-full", colorClass)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{config.label}</span>
            <Badge className={cn("text-xs", colorClass.replace("bg-", "bg-").replace("500", "100"))}>
              {metric.label}
            </Badge>
          </div>
          <Progress value={metric.score} className="h-1.5 mt-1" />
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colorClass)}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{config.label}</h3>
                  <Badge className={cn("text-xs", colorClass.replace("bg-", "bg-").replace("500", "100"))}>
                    {metric.label}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Progress value={metric.score} className="h-2" />
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>
              <div className="shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t">
            <div className="mt-4 space-y-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Key Factors
                </h4>
                <ul className="space-y-1">
                  {metric.keyFactors.map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Info className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Analysis
                </h4>
                <ul className="space-y-1">
                  {metric.reasoning.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function StrategicScorecard({ metrics, compact = false }: StrategicScorecardProps) {
  if (compact) {
    return (
      <div className="space-y-3">
        <MetricCard metric={metrics.competitiveIntensity} config={metricConfig.competitiveIntensity} compact />
        <MetricCard metric={metrics.strategicAlignment} config={metricConfig.strategicAlignment} compact />
        <MetricCard metric={metrics.marketAdjacency} config={metricConfig.marketAdjacency} compact />
        <MetricCard metric={metrics.threatProbability} config={metricConfig.threatProbability} compact />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5" />
          Strategic Metrics Scorecard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard metric={metrics.competitiveIntensity} config={metricConfig.competitiveIntensity} />
          <MetricCard metric={metrics.strategicAlignment} config={metricConfig.strategicAlignment} />
          <MetricCard metric={metrics.marketAdjacency} config={metricConfig.marketAdjacency} />
          <MetricCard metric={metrics.threatProbability} config={metricConfig.threatProbability} />
        </div>
        
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Strategic Summary</span>
            <Badge variant="outline">
              {metrics.threatProbability.label === "Critical" && "🚨 High Alert"}
              {metrics.threatProbability.label === "High" && "⚠️ Monitor Closely"}
              {metrics.threatProbability.label === "Medium" && "📊 Track Changes"}
              {metrics.threatProbability.label === "Low" && "✅ Stable"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.threatProbability.label === "Critical" && 
              "Direct competition likely. Review defensive strategies immediately."
            }
            {metrics.threatProbability.label === "High" && 
              "Elevated competition probability. Monitor market moves closely."
            }
            {metrics.threatProbability.label === "Medium" && 
              "Moderate competition risk. Track strategic developments."
            }
            {metrics.threatProbability.label === "Low" && 
              "Low competition risk. Focus on growth opportunities."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
