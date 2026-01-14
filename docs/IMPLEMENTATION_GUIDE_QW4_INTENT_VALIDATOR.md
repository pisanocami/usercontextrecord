# Implementation Guide: Strategic Intent Validator

> **Quick Win #4**  
> **Complejidad**: Baja  
> **Timeline**: 2-3 días  
> **Dependencias**: UCR completo

---

## Concepto

Valida que la configuración del UCR sea coherente con el intent estratégico declarado.

---

## Types

```typescript
// shared/types/intent-validator.ts

export type ValidationSeverity = "info" | "warning" | "error";

export interface IntentWarning {
  section: UCRSectionID;
  field: string;
  issue: string;
  suggestion: string;
  severity: ValidationSeverity;
}

export interface AlignmentCheck {
  name: string;
  isAligned: boolean;
  score: number;
  details: string;
}

export interface IntentValidation {
  isCoherent: boolean;
  coherenceScore: number; // 0-100
  warnings: IntentWarning[];
  alignmentMatrix: {
    goalVsCompetitors: AlignmentCheck;
    goalVsDemand: AlignmentCheck;
    goalVsChannels: AlignmentCheck;
    riskVsCapabilities: AlignmentCheck;
    timelineVsResources: AlignmentCheck;
  };
  recommendations: string[];
  validatedAt: Date;
}
```

---

## Core Implementation

```typescript
// server/modules/intent-validator.ts

import type { Configuration } from "@shared/schema";
import type { 
  IntentValidation, 
  IntentWarning,
  AlignmentCheck,
  ValidationSeverity 
} from "@shared/types/intent-validator";

/**
 * Validate strategic intent coherence
 */
export function validateStrategicIntent(config: Configuration): IntentValidation {
  const warnings: IntentWarning[] = [];
  
  const intent = config.strategic_intent;
  const goalType = intent?.goal_type || "growth";
  const riskTolerance = intent?.risk_tolerance || "moderate";
  const timeHorizon = intent?.time_horizon || "12_months";

  // Run alignment checks
  const goalVsCompetitors = checkGoalVsCompetitors(goalType, config, warnings);
  const goalVsDemand = checkGoalVsDemand(goalType, config, warnings);
  const goalVsChannels = checkGoalVsChannels(goalType, config, warnings);
  const riskVsCapabilities = checkRiskVsCapabilities(riskTolerance, config, warnings);
  const timelineVsResources = checkTimelineVsResources(timeHorizon, config, warnings);

  // Calculate overall coherence
  const alignmentScores = [
    goalVsCompetitors.score,
    goalVsDemand.score,
    goalVsChannels.score,
    riskVsCapabilities.score,
    timelineVsResources.score
  ];
  
  const coherenceScore = Math.round(
    alignmentScores.reduce((a, b) => a + b, 0) / alignmentScores.length
  );

  const isCoherent = coherenceScore >= 70 && 
    !warnings.some(w => w.severity === "error");

  // Generate recommendations
  const recommendations = generateRecommendations(warnings, coherenceScore);

  return {
    isCoherent,
    coherenceScore,
    warnings,
    alignmentMatrix: {
      goalVsCompetitors,
      goalVsDemand,
      goalVsChannels,
      riskVsCapabilities,
      timelineVsResources
    },
    recommendations,
    validatedAt: new Date()
  };
}

function checkGoalVsCompetitors(
  goalType: string,
  config: Configuration,
  warnings: IntentWarning[]
): AlignmentCheck {
  const competitors = config.competitors?.competitors || [];
  const tier1Count = competitors.filter(c => c.tier === "tier1").length;
  const tier2Count = competitors.filter(c => c.tier === "tier2").length;

  let score = 50;
  let isAligned = true;
  let details = "";

  if (goalType === "growth") {
    // Growth goal needs clear competitors to attack
    if (tier1Count === 0) {
      warnings.push({
        section: "C",
        field: "competitors",
        issue: "Growth goal but no tier-1 competitors defined",
        suggestion: "Define tier-1 competitors to identify attack opportunities",
        severity: "warning"
      });
      score = 40;
      isAligned = false;
      details = "Growth strategy needs clear competitive targets";
    } else if (tier1Count >= 2) {
      score = 90;
      details = `${tier1Count} tier-1 competitors defined for growth targeting`;
    } else {
      score = 70;
      details = "Consider adding more tier-1 competitors for growth analysis";
    }
  } else if (goalType === "defend") {
    // Defend goal needs competitors to monitor
    if (competitors.length === 0) {
      warnings.push({
        section: "C",
        field: "competitors",
        issue: "Defend goal but no competitors to monitor",
        suggestion: "Add competitors to enable defensive monitoring",
        severity: "error"
      });
      score = 20;
      isAligned = false;
      details = "Cannot defend without knowing competitors";
    } else {
      score = 80;
      details = `${competitors.length} competitors defined for monitoring`;
    }
  }

  return { name: "Goal vs Competitors", isAligned, score, details };
}

function checkGoalVsDemand(
  goalType: string,
  config: Configuration,
  warnings: IntentWarning[]
): AlignmentCheck {
  const themes = config.demand_definition?.demand_themes || [];
  const highPriorityThemes = themes.filter(t => t.priority === "high");

  let score = 50;
  let isAligned = true;
  let details = "";

  if (goalType === "growth") {
    if (themes.length < 3) {
      warnings.push({
        section: "D",
        field: "demand_themes",
        issue: "Growth goal but few demand themes defined",
        suggestion: "Add more demand themes to identify expansion opportunities",
        severity: "warning"
      });
      score = 40;
      isAligned = false;
      details = "Growth needs diverse demand themes";
    } else if (highPriorityThemes.length >= 2) {
      score = 90;
      details = `${highPriorityThemes.length} high-priority themes for growth focus`;
    } else {
      score = 70;
      details = "Consider prioritizing more themes for growth";
    }
  } else if (goalType === "defend") {
    if (themes.length === 0) {
      warnings.push({
        section: "D",
        field: "demand_themes",
        issue: "No demand themes to defend",
        suggestion: "Define core demand themes to protect",
        severity: "error"
      });
      score = 20;
      isAligned = false;
      details = "Defense needs themes to protect";
    } else {
      score = 80;
      details = `${themes.length} themes defined for defense`;
    }
  }

  return { name: "Goal vs Demand", isAligned, score, details };
}

function checkGoalVsChannels(
  goalType: string,
  config: Configuration,
  warnings: IntentWarning[]
): AlignmentCheck {
  const channelMix = config.channel_context?.channel_mix || {};
  const seoMaturity = config.channel_context?.seo_maturity || "developing";
  const channelCount = Object.keys(channelMix).length;

  let score = 50;
  let isAligned = true;
  let details = "";

  if (goalType === "growth") {
    if (channelCount < 2) {
      warnings.push({
        section: "F",
        field: "channel_mix",
        issue: "Growth goal but limited channel diversification",
        suggestion: "Consider adding channels for growth reach",
        severity: "info"
      });
      score = 60;
      details = "Growth may benefit from more channels";
    } else {
      score = 85;
      details = `${channelCount} channels defined for growth`;
    }

    if (seoMaturity === "nascent") {
      warnings.push({
        section: "F",
        field: "seo_maturity",
        issue: "Growth goal with nascent SEO maturity",
        suggestion: "Consider SEO investment for sustainable growth",
        severity: "info"
      });
    }
  }

  return { name: "Goal vs Channels", isAligned, score, details };
}

function checkRiskVsCapabilities(
  riskTolerance: string,
  config: Configuration,
  warnings: IntentWarning[]
): AlignmentCheck {
  const capabilities = config.governance?.capability_model || {};
  const boosters = capabilities.boosters || [];
  const penalties = capabilities.penalties || [];

  let score = 50;
  let isAligned = true;
  let details = "";

  if (riskTolerance === "aggressive") {
    if (boosters.length < 2) {
      warnings.push({
        section: "H",
        field: "capability_model",
        issue: "Aggressive risk tolerance but few capability boosters",
        suggestion: "Define strengths to support aggressive strategy",
        severity: "warning"
      });
      score = 40;
      isAligned = false;
      details = "Aggressive strategy needs clear strengths";
    } else {
      score = 85;
      details = `${boosters.length} boosters support aggressive posture`;
    }
  } else if (riskTolerance === "conservative") {
    if (penalties.length > boosters.length) {
      score = 70;
      details = "Conservative approach aligns with capability gaps";
    } else {
      score = 80;
      details = "Conservative approach with solid capabilities";
    }
  }

  return { name: "Risk vs Capabilities", isAligned, score, details };
}

function checkTimelineVsResources(
  timeHorizon: string,
  config: Configuration,
  warnings: IntentWarning[]
): AlignmentCheck {
  const seoMaturity = config.channel_context?.seo_maturity || "developing";
  
  let score = 70;
  let isAligned = true;
  let details = "";

  if (timeHorizon === "3_months" && seoMaturity === "nascent") {
    warnings.push({
      section: "E",
      field: "time_horizon",
      issue: "Short timeline with nascent SEO maturity",
      suggestion: "SEO results typically take 6+ months; adjust expectations or invest in paid",
      severity: "warning"
    });
    score = 40;
    isAligned = false;
    details = "Short timeline may not be realistic for SEO";
  } else if (timeHorizon === "12_months") {
    score = 85;
    details = "12-month horizon allows for organic growth";
  }

  return { name: "Timeline vs Resources", isAligned, score, details };
}

function generateRecommendations(
  warnings: IntentWarning[],
  coherenceScore: number
): string[] {
  const recommendations: string[] = [];

  if (coherenceScore < 50) {
    recommendations.push("Review and align UCR sections with strategic intent");
  }

  const errorWarnings = warnings.filter(w => w.severity === "error");
  for (const warning of errorWarnings) {
    recommendations.push(warning.suggestion);
  }

  if (coherenceScore >= 80) {
    recommendations.push("UCR is well-aligned with strategic intent - proceed with analysis");
  }

  return recommendations.slice(0, 5);
}
```

---

## API Route

```typescript
// server/routes.ts - Agregar

import { validateStrategicIntent } from "./modules/intent-validator";

// GET /api/intent-validation/:configurationId
app.get("/api/intent-validation/:configurationId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const config = await storage.getConfigurationById(configurationId, userId);
    
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const validation = validateStrategicIntent(config);
    res.json(validation);
  } catch (error) {
    console.error("Error validating intent:", error);
    res.status(500).json({ error: "Validation failed" });
  }
});
```

---

## UI Component

```tsx
// client/src/components/intent-validator/IntentValidatorCard.tsx

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Target } from "lucide-react";

interface Props {
  configurationId: number;
}

export function IntentValidatorCard({ configurationId }: Props) {
  const { data: validation, isLoading } = useQuery({
    queryKey: ["intent-validation", configurationId],
    queryFn: async () => {
      const res = await fetch(`/api/intent-validation/${configurationId}`);
      return res.json();
    }
  });

  if (isLoading) return <div>Validating...</div>;

  const severityIcons = {
    info: <CheckCircle className="h-4 w-4 text-blue-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    error: <XCircle className="h-4 w-4 text-red-500" />
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Strategic Intent Validation
          </span>
          <Badge variant={validation?.isCoherent ? "default" : "destructive"}>
            {validation?.coherenceScore}% Coherent
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Alignment Matrix */}
        <div className="space-y-2 mb-4">
          {Object.values(validation?.alignmentMatrix || {}).map((check: any) => (
            <div key={check.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">{check.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{check.details}</span>
                <Badge variant={check.isAligned ? "outline" : "secondary"}>
                  {check.score}%
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {validation?.warnings?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Issues Found</h4>
            {validation.warnings.map((warning: any, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2 border rounded">
                {severityIcons[warning.severity]}
                <div>
                  <div className="text-sm">{warning.issue}</div>
                  <div className="text-xs text-gray-500">{warning.suggestion}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {validation?.recommendations?.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Recommendations</h4>
            <ul className="text-sm space-y-1">
              {validation.recommendations.map((rec: string, i: number) => (
                <li key={i}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Testing Checklist

- [ ] Unit tests para cada alignment check
- [ ] Unit tests para generateRecommendations
- [ ] Integration tests para API endpoint
