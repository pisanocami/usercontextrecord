# Implementation Guide: Executive Snapshot Generator

> **Quick Win #10**  
> **Complejidad**: Baja  
> **Timeline**: 3-5 días  
> **Dependencias**: UCR completo

---

## Concepto

Genera un resumen ejecutivo de una página con los KPIs más importantes, estado actual, y próximos pasos.

---

## Types

```typescript
// shared/types/executive-snapshot.ts

export interface HealthIndicators {
  ucrCompleteness: number; // 0-100
  analysisRecency: string;
  alertsActive: number;
  lastUpdated: Date;
}

export interface KeyMetrics {
  estimatedMissingValue: number;
  keywordOpportunities: number;
  competitorThreats: number;
  topPriorityAction: string;
  strategicAlignment: number; // 0-100
}

export interface NextStep {
  action: string;
  owner: string;
  deadline: string;
  priority: "high" | "medium" | "low";
}

export interface ExecutiveSnapshot {
  generatedAt: Date;
  brandName: string;
  configurationId: number;
  
  healthIndicators: HealthIndicators;
  keyMetrics: KeyMetrics;
  
  recentWins: string[];
  activeRisks: string[];
  
  nextSteps: NextStep[];
  
  oneLineSummary: string;
  strategicFocus: string;
  
  recommendations: string[];
}

export interface SnapshotConfig {
  includeMetrics: boolean;
  includeRisks: boolean;
  includeNextSteps: boolean;
  timeframe: "week" | "month" | "quarter";
}
```

---

## Core Implementation

```typescript
// server/modules/executive-snapshot.ts

import type { Configuration } from "@shared/schema";
import type { 
  ExecutiveSnapshot,
  HealthIndicators,
  KeyMetrics,
  NextStep,
  SnapshotConfig 
} from "@shared/types/executive-snapshot";

/**
 * Generate executive snapshot
 */
export function generateExecutiveSnapshot(
  config: Configuration,
  snapshotConfig: Partial<SnapshotConfig> = {}
): ExecutiveSnapshot {
  const brandName = config.brand?.name || config.brand?.domain || "Unknown Brand";
  
  // Generate health indicators
  const healthIndicators = generateHealthIndicators(config);
  
  // Generate key metrics
  const keyMetrics = generateKeyMetrics(config);
  
  // Generate recent wins and risks
  const { recentWins, activeRisks } = generateWinsAndRisks(config);
  
  // Generate next steps
  const nextSteps = generateNextSteps(config, healthIndicators);
  
  // Generate one-line summary
  const oneLineSummary = generateOneLineSummary(healthIndicators, keyMetrics);
  
  // Generate strategic focus
  const strategicFocus = generateStrategicFocus(config, keyMetrics);
  
  // Generate recommendations
  const recommendations = generateRecommendations(healthIndicators, keyMetrics, activeRisks);

  return {
    generatedAt: new Date(),
    brandName,
    configurationId: config.id,
    healthIndicators,
    keyMetrics,
    recentWins,
    activeRisks,
    nextSteps,
    oneLineSummary,
    strategicFocus,
    recommendations
  };
}

function generateHealthIndicators(config: Configuration): HealthIndicators {
  // Calculate UCR completeness
  const sections = [
    config.brand,
    config.category_definition,
    config.competitors,
    config.demand_definition,
    config.strategic_intent,
    config.channel_context,
    config.negative_scope,
    config.governance
  ];
  
  const completedSections = sections.filter(s => s && Object.keys(s).length > 0).length;
  const ucrCompleteness = Math.round((completedSections / sections.length) * 100);
  
  // Determine analysis recency
  const lastAnalysis = config.updatedAt || config.createdAt || new Date();
  const daysSinceAnalysis = Math.floor((Date.now() - lastAnalysis.getTime()) / (1000 * 60 * 60 * 24));
  
  let analysisRecency: string;
  if (daysSinceAnalysis === 0) analysisRecency = "Today";
  else if (daysSinceAnalysis <= 7) analysisRecency = `${daysSinceAnalysis} days ago`;
  else if (daysSinceAnalysis <= 30) analysisRecency = `${Math.floor(daysSinceAnalysis / 7)} weeks ago`;
  else analysisRecency = `${Math.floor(daysSinceAnalysis / 30)} months ago`;
  
  // Count active alerts (simplified)
  const alertsActive = Math.floor(Math.random() * 5); // Would fetch from actual alerts
  
  return {
    ucrCompleteness,
    analysisRecency,
    alertsActive,
    lastUpdated: lastAnalysis
  };
}

function generateKeyMetrics(config: Configuration): KeyMetrics {
  // Estimate missing value (simplified calculation)
  const competitorsCount = config.competitors?.competitors?.length || 0;
  const themesCount = config.demand_definition?.demand_themes?.length || 0;
  const estimatedMissingValue = (competitorsCount * 10000) + (themesCount * 5000);
  
  // Count keyword opportunities
  const keywordOpportunities = themesCount * 10; // Estimated 10 opportunities per theme
  
  // Count competitor threats
  const competitorThreats = competitorsCount * 2; // Estimated 2 threats per competitor
  
  // Determine top priority action
  const topPriorityAction = determineTopPriority(config);
  
  // Calculate strategic alignment
  const strategicAlignment = calculateStrategicAlignment(config);

  return {
    estimatedMissingValue,
    keywordOpportunities,
    competitorThreats,
    topPriorityAction,
    strategicAlignment
  };
}

function generateWinsAndRisks(config: Configuration): {
  recentWins: string[];
  activeRisks: string[];
} {
  const recentWins: string[] = [];
  const activeRisks: string[] = [];

  // Generate wins based on configuration state
  if (config.brand?.name) {
    recentWins.push("Brand identity defined and documented");
  }
  
  if (config.competitors?.competitors?.length >= 3) {
    recentWins.push(`${config.competitors.competitors.length} competitors identified and tracked`);
  }
  
  if (config.demand_definition?.demand_themes?.length >= 3) {
    recentWins.push(`${config.demand_definition.demand_themes.length} demand themes established`);
  }

  // Generate risks
  if (!config.strategic_intent?.goal_type) {
    activeRisks.push("Strategic goal not defined - unclear direction");
  }
  
  if (!config.channel_context?.seo_maturity) {
    activeRisks.push("SEO maturity unknown - may affect strategy");
  }
  
  if (config.competitors?.competitors?.length === 0) {
    activeRisks.push("No competitors defined - missing competitive context");
  }

  return { recentWins, activeRisks };
}

function generateNextSteps(
  config: Configuration,
  healthIndicators: HealthIndicators
): NextStep[] {
  const nextSteps: NextStep[] = [];

  // Based on UCR completeness
  if (healthIndicators.ucrCompleteness < 100) {
    const missingSections = [];
    if (!config.brand) missingSections.push("Brand");
    if (!config.competitors) missingSections.push("Competitors");
    if (!config.demand_definition) missingSections.push("Demand Themes");
    
    nextSteps.push({
      action: `Complete missing UCR sections: ${missingSections.join(", ")}`,
      owner: "Strategy Team",
      deadline: "Next week",
      priority: "high"
    });
  }

  // Based on strategic intent
  if (!config.strategic_intent?.goal_type) {
    nextSteps.push({
      action: "Define strategic intent and goals",
      owner: "CMO",
      deadline: "This week",
      priority: "high"
    });
  }

  // Based on analysis recency
  if (healthIndicators.analysisRecency.includes("months")) {
    nextSteps.push({
      action: "Refresh competitive analysis",
      owner: "Marketing Ops",
      deadline: "Next month",
      priority: "medium"
    });
  }

  // Default next step
  if (nextSteps.length === 0) {
    nextSteps.push({
      action: "Review and optimize current strategy",
      owner: "Strategy Team",
      deadline: "Next quarter",
      priority: "medium"
    });
  }

  return nextSteps;
}

function generateOneLineSummary(
  healthIndicators: HealthIndicators,
  keyMetrics: KeyMetrics
): string {
  const health = healthIndicators.ucrCompleteness >= 80 ? "healthy" : "developing";
  const opportunities = keyMetrics.keywordOpportunities > 10 ? "significant" : "moderate";
  
  return `Brand is ${health} with ${opportunities} growth opportunities and ${keyMetrics.competitorThreats} competitive threats to monitor`;
}

function generateStrategicFocus(config: Configuration, keyMetrics: KeyMetrics): string {
  const goalType = config.strategic_intent?.goal_type || "growth";
  
  if (goalType === "growth") {
    return `Capture ${keyMetrics.keywordOpportunities} keyword opportunities while monitoring ${keyMetrics.competitorThreats} competitive threats`;
  } else if (goalType === "defend") {
    return `Protect current position against ${keyMetrics.competitorThreats} competitive threats`;
  } else {
    return "Build brand awareness and establish market presence";
  }
}

function calculateStrategicAlignment(config: Configuration): number {
  let score = 50; // Base score
  
  // Check for strategic coherence
  if (config.strategic_intent?.goal_type) score += 20;
  if (config.competitors?.competitors?.length > 0) score += 15;
  if (config.demand_definition?.demand_themes?.length > 0) score += 15;
  
  return Math.min(100, score);
}

function determineTopPriority(config: Configuration): string {
  if (!config.strategic_intent?.goal_type) return "Define strategic goals";
  if (!config.competitors?.competitors?.length) return "Identify key competitors";
  if (!config.demand_definition?.demand_themes?.length) return "Establish demand themes";
  return "Optimize keyword targeting";
}

function generateRecommendations(
  healthIndicators: HealthIndicators,
  keyMetrics: KeyMetrics,
  activeRisks: string[]
): string[] {
  const recommendations: string[] = [];

  if (healthIndicators.ucrCompleteness < 80) {
    recommendations.push("Complete UCR to improve analysis accuracy");
  }

  if (keyMetrics.estimatedMissingValue > 50000) {
    recommendations.push("Focus on high-value keyword opportunities");
  }

  if (activeRisks.length > 2) {
    recommendations.push("Address identified strategic risks");
  }

  if (keyMetrics.strategicAlignment < 70) {
    recommendations.push("Improve strategic alignment across all sections");
  }

  if (recommendations.length === 0) {
    recommendations.push("Continue current strategy and monitor performance");
  }

  return recommendations;
}
```

---

## API Routes

```typescript
// server/routes.ts - Agregar

import { generateExecutiveSnapshot } from "./modules/executive-snapshot";

// GET /api/executive-snapshot/:configurationId
app.get("/api/executive-snapshot/:configurationId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const config = await storage.getConfigurationById(configurationId, userId);
    
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const snapshotConfig = {
      includeMetrics: req.query.includeMetrics !== "false",
      includeRisks: req.query.includeRisks !== "false",
      includeNextSteps: req.query.includeNextSteps !== "false",
      timeframe: req.query.timeframe || "month"
    };

    const snapshot = generateExecutiveSnapshot(config, snapshotConfig);
    res.json(snapshot);
  } catch (error) {
    console.error("Error generating executive snapshot:", error);
    res.status(500).json({ error: "Failed to generate snapshot" });
  }
});
```

---

## UI Component

```tsx
// client/src/components/executive-snapshot/ExecutiveSnapshot.tsx

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target, 
  Calendar,
  Download,
  RefreshCw
} from "lucide-react";

interface Props {
  configurationId: number;
}

export function ExecutiveSnapshot({ configurationId }: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["executive-snapshot", configurationId],
    queryFn: async () => {
      const res = await fetch(`/api/executive-snapshot/${configurationId}`);
      return res.json();
    }
  });

  if (isLoading) return <div>Generating snapshot...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Executive Snapshot - {data?.brandName}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-lg font-medium">{data?.oneLineSummary}</p>
            <p className="text-sm text-gray-600 mt-1">
              Generated: {new Date(data?.generatedAt).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">UCR Completeness</span>
                <span className="text-sm font-bold">{data?.healthIndicators?.ucrCompleteness}%</span>
              </div>
              <Progress value={data?.healthIndicators?.ucrCompleteness} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Strategic Alignment</span>
                <span className="text-sm font-bold">{data?.keyMetrics?.strategicAlignment}%</span>
              </div>
              <Progress value={data?.keyMetrics?.strategicAlignment} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Active Alerts</span>
                <span className="text-sm font-bold">{data?.healthIndicators?.alertsActive}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded">
                <div 
                  className="h-2 bg-red-500 rounded"
                  style={{ width: `${Math.min(data?.healthIndicators?.alertsActive * 20, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Last analysis: {data?.healthIndicators?.analysisRecency}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ${data?.keyMetrics?.estimatedMissingValue?.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Missing Value</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {data?.keyMetrics?.keywordOpportunities}
              </div>
              <div className="text-xs text-gray-500">Opportunities</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {data?.keyMetrics?.competitorThreats}
              </div>
              <div className="text-xs text-gray-500">Threats</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {data?.keyMetrics?.topPriorityAction}
              </div>
              <div className="text-xs text-gray-500">Top Priority</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Focus */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Strategic Focus</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{data?.strategicFocus}</p>
        </CardContent>
      </Card>

      {/* Wins and Risks */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Recent Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {data?.recentWins?.map((win: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  {win}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Active Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {data?.activeRisks?.map((risk: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  {risk}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data?.nextSteps?.map((step: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Badge variant={step.priority === "high" ? "destructive" : "secondary"}>
                    {step.priority}
                  </Badge>
                  <span className="text-sm">{step.action}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {step.owner} • {step.deadline}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {data?.recommendations?.map((rec: string, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <TrendingUp className="h-3 w-3 text-blue-500 mt-0.5" />
                {rec}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Unit tests para generateHealthIndicators
- [ ] Unit tests para generateKeyMetrics
- [ ] Unit tests para generateOneLineSummary
- [ ] Integration tests para API endpoint
- [ ] UI rendering tests
