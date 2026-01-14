# Implementation Guide: UCR Health Score Dashboard

> **Quick Win #1**  
> **Complejidad**: Baja  
> **Timeline**: 3-5 días  
> **Dependencias**: UCR existente

---

## Concepto

Dashboard que mide la completitud, calidad y coherencia del User Context Record, mostrando un score de salud y guiando al usuario sobre qué completar.

---

## Types

```typescript
// shared/types/ucr-health.ts

export interface SectionHealth {
  sectionId: UCRSectionID;
  sectionName: string;
  score: number; // 0-100
  status: "complete" | "partial" | "empty";
  completedFields: number;
  totalFields: number;
  issues: HealthIssue[];
  suggestions: string[];
}

export interface HealthIssue {
  field: string;
  issue: string;
  severity: "info" | "warning" | "error";
  impact: string;
}

export interface ModuleReadiness {
  moduleId: string;
  moduleName: string;
  isReady: boolean;
  missingSections: UCRSectionID[];
  missingFields: string[];
}

export interface UCRHealthScore {
  configurationId: number;
  overall: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  sections: SectionHealth[];
  moduleReadiness: ModuleReadiness[];
  topPriority: string;
  estimatedTimeToComplete: string;
  lastUpdated: Date;
}
```

---

## Core Implementation

```typescript
// server/modules/ucr-health-score.ts

import type { Configuration } from "@shared/schema";
import type { 
  UCRHealthScore, 
  SectionHealth, 
  HealthIssue,
  ModuleReadiness 
} from "@shared/types/ucr-health";
import { UCR_SECTION_NAMES, MODULE_CONTRACTS } from "@shared/module.contract";

/**
 * Calculate UCR Health Score
 */
export function calculateUCRHealth(config: Configuration): UCRHealthScore {
  const sections = [
    calculateSectionHealth("A", config.brand, getBrandFieldSpec()),
    calculateSectionHealth("B", config.category_definition, getCategoryFieldSpec()),
    calculateSectionHealth("C", config.competitors, getCompetitorsFieldSpec()),
    calculateSectionHealth("D", config.demand_definition, getDemandFieldSpec()),
    calculateSectionHealth("E", config.strategic_intent, getIntentFieldSpec()),
    calculateSectionHealth("F", config.channel_context, getChannelFieldSpec()),
    calculateSectionHealth("G", config.negative_scope, getNegativeFieldSpec()),
    calculateSectionHealth("H", config.governance, getGovernanceFieldSpec()),
  ];

  const overall = Math.round(
    sections.reduce((sum, s) => sum + s.score, 0) / sections.length
  );

  const moduleReadiness = MODULE_CONTRACTS.map(contract => 
    checkModuleReadiness(contract, config, sections)
  );

  const topPriority = findTopPriority(sections);
  const estimatedTime = estimateTimeToComplete(sections);

  return {
    configurationId: config.id,
    overall,
    grade: scoreToGrade(overall),
    sections,
    moduleReadiness,
    topPriority,
    estimatedTimeToComplete: estimatedTime,
    lastUpdated: new Date()
  };
}

interface FieldSpec {
  name: string;
  required: boolean;
  weight: number;
  validator?: (value: any) => HealthIssue | null;
}

function calculateSectionHealth(
  sectionId: UCRSectionID,
  data: any,
  fieldSpecs: FieldSpec[]
): SectionHealth {
  if (!data) {
    return {
      sectionId,
      sectionName: UCR_SECTION_NAMES[sectionId],
      score: 0,
      status: "empty",
      completedFields: 0,
      totalFields: fieldSpecs.length,
      issues: [{
        field: "all",
        issue: "Section is empty",
        severity: "error",
        impact: "Modules requiring this section cannot run"
      }],
      suggestions: [`Complete ${UCR_SECTION_NAMES[sectionId]} to enable analysis`]
    };
  }

  const issues: HealthIssue[] = [];
  let completedFields = 0;
  let weightedScore = 0;
  let totalWeight = 0;

  for (const spec of fieldSpecs) {
    totalWeight += spec.weight;
    const value = data[spec.name];
    
    if (hasValue(value)) {
      completedFields++;
      weightedScore += spec.weight;
      
      // Run validator if exists
      if (spec.validator) {
        const issue = spec.validator(value);
        if (issue) issues.push(issue);
      }
    } else if (spec.required) {
      issues.push({
        field: spec.name,
        issue: `Required field "${spec.name}" is missing`,
        severity: "error",
        impact: "May limit analysis accuracy"
      });
    }
  }

  const score = Math.round((weightedScore / totalWeight) * 100);
  const status = score === 100 ? "complete" : score > 0 ? "partial" : "empty";

  return {
    sectionId,
    sectionName: UCR_SECTION_NAMES[sectionId],
    score,
    status,
    completedFields,
    totalFields: fieldSpecs.length,
    issues,
    suggestions: generateSuggestions(sectionId, issues)
  };
}

function hasValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === "object" && Object.keys(value).length === 0) return false;
  return true;
}

// Field specifications for each section
function getBrandFieldSpec(): FieldSpec[] {
  return [
    { name: "name", required: true, weight: 3 },
    { name: "domain", required: true, weight: 3 },
    { name: "tagline", required: false, weight: 2 },
    { name: "description", required: false, weight: 1 },
  ];
}

function getCategoryFieldSpec(): FieldSpec[] {
  return [
    { name: "primary_category", required: true, weight: 3 },
    { name: "included_categories", required: false, weight: 2 },
    { name: "excluded_categories", required: false, weight: 1 },
    { name: "fence_mode", required: false, weight: 1 },
  ];
}

function getCompetitorsFieldSpec(): FieldSpec[] {
  return [
    { 
      name: "competitors", 
      required: true, 
      weight: 3,
      validator: (value) => {
        if (Array.isArray(value) && value.length < 2) {
          return {
            field: "competitors",
            issue: "Less than 2 competitors defined",
            severity: "warning",
            impact: "Limited competitive analysis"
          };
        }
        return null;
      }
    },
  ];
}

function getDemandFieldSpec(): FieldSpec[] {
  return [
    { 
      name: "demand_themes", 
      required: true, 
      weight: 3,
      validator: (value) => {
        if (Array.isArray(value) && value.length < 3) {
          return {
            field: "demand_themes",
            issue: "Less than 3 demand themes defined",
            severity: "info",
            impact: "May miss keyword opportunities"
          };
        }
        return null;
      }
    },
  ];
}

function getIntentFieldSpec(): FieldSpec[] {
  return [
    { name: "goal_type", required: true, weight: 3 },
    { name: "risk_tolerance", required: false, weight: 2 },
    { name: "time_horizon", required: false, weight: 1 },
  ];
}

function getChannelFieldSpec(): FieldSpec[] {
  return [
    { name: "seo_maturity", required: false, weight: 2 },
    { name: "channel_mix", required: false, weight: 2 },
    { name: "primary_channel", required: false, weight: 1 },
  ];
}

function getNegativeFieldSpec(): FieldSpec[] {
  return [
    { name: "excluded_keywords", required: false, weight: 2 },
    { name: "excluded_topics", required: false, weight: 2 },
    { name: "excluded_intents", required: false, weight: 1 },
  ];
}

function getGovernanceFieldSpec(): FieldSpec[] {
  return [
    { name: "capability_model", required: false, weight: 2 },
    { name: "approval_workflow", required: false, weight: 1 },
    { name: "update_frequency", required: false, weight: 1 },
  ];
}

function checkModuleReadiness(
  contract: ModuleContract,
  config: Configuration,
  sections: SectionHealth[]
): ModuleReadiness {
  const requiredSections = contract.contextInjection.requiredSections;
  const missingSections: UCRSectionID[] = [];
  const missingFields: string[] = [];

  for (const sectionId of requiredSections) {
    const section = sections.find(s => s.sectionId === sectionId);
    if (!section || section.status === "empty") {
      missingSections.push(sectionId);
    } else if (section.issues.some(i => i.severity === "error")) {
      missingFields.push(...section.issues.filter(i => i.severity === "error").map(i => i.field));
    }
  }

  return {
    moduleId: contract.moduleId,
    moduleName: contract.name,
    isReady: missingSections.length === 0 && missingFields.length === 0,
    missingSections,
    missingFields
  };
}

function findTopPriority(sections: SectionHealth[]): string {
  // Find section with lowest score that has required fields missing
  const critical = sections
    .filter(s => s.issues.some(i => i.severity === "error"))
    .sort((a, b) => a.score - b.score);

  if (critical.length > 0) {
    return `Complete ${critical[0].sectionName} (${critical[0].issues[0].issue})`;
  }

  const incomplete = sections.filter(s => s.status !== "complete").sort((a, b) => a.score - b.score);
  if (incomplete.length > 0) {
    return `Improve ${incomplete[0].sectionName} (currently ${incomplete[0].score}%)`;
  }

  return "UCR is complete!";
}

function estimateTimeToComplete(sections: SectionHealth[]): string {
  const emptyCount = sections.filter(s => s.status === "empty").length;
  const partialCount = sections.filter(s => s.status === "partial").length;

  const minutes = emptyCount * 15 + partialCount * 5;

  if (minutes === 0) return "Complete";
  if (minutes < 60) return `~${minutes} minutes`;
  return `~${Math.round(minutes / 60)} hours`;
}

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function generateSuggestions(sectionId: UCRSectionID, issues: HealthIssue[]): string[] {
  const suggestions: string[] = [];

  for (const issue of issues.slice(0, 3)) {
    switch (issue.severity) {
      case "error":
        suggestions.push(`Add ${issue.field} to enable full analysis`);
        break;
      case "warning":
        suggestions.push(`Consider expanding ${issue.field} for better results`);
        break;
      case "info":
        suggestions.push(`Optional: ${issue.issue}`);
        break;
    }
  }

  return suggestions;
}
```

---

## API Route

```typescript
// server/routes.ts - Agregar

import { calculateUCRHealth } from "./modules/ucr-health-score";

// GET /api/ucr-health/:configurationId
app.get("/api/ucr-health/:configurationId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const config = await storage.getConfigurationById(configurationId, userId);
    
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const health = calculateUCRHealth(config);
    res.json(health);
  } catch (error) {
    console.error("Error calculating UCR health:", error);
    res.status(500).json({ error: "Failed to calculate health score" });
  }
});
```

---

## UI Component

```tsx
// client/src/components/ucr-health/UCRHealthDashboard.tsx

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";

interface Props {
  configurationId: number;
}

export function UCRHealthDashboard({ configurationId }: Props) {
  const { data: health, isLoading } = useQuery({
    queryKey: ["ucr-health", configurationId],
    queryFn: async () => {
      const res = await fetch(`/api/ucr-health/${configurationId}`);
      return res.json();
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (!health) return null;

  const gradeColors = {
    A: "bg-green-500",
    B: "bg-blue-500",
    C: "bg-yellow-500",
    D: "bg-orange-500",
    F: "bg-red-500"
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>UCR Health Score</span>
            <div className={`${gradeColors[health.grade]} text-white px-4 py-2 rounded-lg text-2xl font-bold`}>
              {health.grade}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Completeness</span>
                <span className="text-sm font-medium">{health.overall}%</span>
              </div>
              <Progress value={health.overall} />
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-medium">Top Priority</p>
              <p className="text-sm text-gray-600">{health.topPriority}</p>
              <p className="text-xs text-gray-500 mt-1">
                Estimated time to complete: {health.estimatedTimeToComplete}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Section Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {health.sections.map((section: any) => (
              <div key={section.sectionId} className="border-b pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {section.status === "complete" && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {section.status === "partial" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    {section.status === "empty" && <AlertCircle className="h-4 w-4 text-red-500" />}
                    <span className="font-medium">{section.sectionName}</span>
                  </div>
                  <Badge variant={section.status === "complete" ? "default" : "secondary"}>
                    {section.score}%
                  </Badge>
                </div>
                <Progress value={section.score} className="h-2" />
                
                {section.issues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {section.issues.slice(0, 2).map((issue: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        {issue.severity === "error" && <AlertCircle className="h-3 w-3 text-red-500" />}
                        {issue.severity === "warning" && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                        {issue.severity === "info" && <Info className="h-3 w-3 text-blue-500" />}
                        <span>{issue.issue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Readiness */}
      <Card>
        <CardHeader>
          <CardTitle>Module Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {health.moduleReadiness.map((module: any) => (
              <div 
                key={module.moduleId}
                className={`p-3 rounded-lg border ${module.isReady ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}
              >
                <div className="flex items-center gap-2">
                  {module.isReady ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">{module.moduleName}</span>
                </div>
                {!module.isReady && module.missingSections.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Missing: {module.missingSections.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Unit tests para calculateSectionHealth
- [ ] Unit tests para checkModuleReadiness
- [ ] Integration tests para API endpoint
- [ ] UI component rendering tests
