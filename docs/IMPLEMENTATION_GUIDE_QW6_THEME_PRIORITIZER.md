# Implementation Guide: Demand Theme Prioritizer

> **Quick Win #6**  
> **Complejidad**: Baja  
> **Timeline**: 3-5 días  
> **Dependencias**: UCR Demand Themes

---

## Concepto

Analiza y prioriza los demand themes del UCR basándose en volumen, dificultad, alineación con capabilities y potencial.

---

## Types

```typescript
// shared/types/theme-prioritizer.ts

export type ThemeRecommendation = "focus" | "maintain" | "deprioritize" | "explore";

export interface ThemeScores {
  volume: number;        // 0-100 based on search volume
  difficulty: number;    // 0-100 (inverted - higher = easier)
  alignment: number;     // 0-100 alignment with capabilities
  competition: number;   // 0-100 (inverted - higher = less competition)
  conversion: number;    // 0-100 estimated conversion potential
}

export interface QuickWinKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  reason: string;
}

export interface ThemePriority {
  themeId: string;
  themeName: string;
  currentPriority: string;
  scores: ThemeScores;
  overallScore: number;
  recommendation: ThemeRecommendation;
  rationale: string;
  quickWinKeywords: QuickWinKeyword[];
  estimatedEffort: "low" | "medium" | "high";
  estimatedImpact: "low" | "medium" | "high";
}

export interface ThemePrioritizationResult {
  themes: ThemePriority[];
  summary: {
    focusCount: number;
    maintainCount: number;
    deprioritizeCount: number;
    exploreCount: number;
    topTheme: string;
    quickWinsTotal: number;
  };
  matrix: {
    highImpactLowEffort: string[];
    highImpactHighEffort: string[];
    lowImpactLowEffort: string[];
    lowImpactHighEffort: string[];
  };
}
```

---

## Core Implementation

```typescript
// server/modules/theme-prioritizer.ts

import type { Configuration } from "@shared/schema";
import type { 
  ThemePriority, 
  ThemePrioritizationResult,
  ThemeScores,
  ThemeRecommendation,
  QuickWinKeyword
} from "@shared/types/theme-prioritizer";

/**
 * Prioritize demand themes
 */
export async function prioritizeThemes(
  config: Configuration
): Promise<ThemePrioritizationResult> {
  const themes = config.demand_definition?.demand_themes || [];
  const capabilities = config.governance?.capability_model || {};
  const boosters = capabilities.boosters || [];
  
  if (themes.length === 0) {
    throw new Error("No demand themes defined in UCR");
  }

  const prioritizedThemes: ThemePriority[] = [];

  for (const theme of themes) {
    const scores = await calculateThemeScores(theme, config, boosters);
    const overallScore = calculateOverallScore(scores);
    const recommendation = determineRecommendation(overallScore, scores);
    const quickWins = identifyQuickWins(theme);
    const { effort, impact } = estimateEffortImpact(scores);

    prioritizedThemes.push({
      themeId: theme.id || theme.name,
      themeName: theme.name,
      currentPriority: theme.priority || "medium",
      scores,
      overallScore,
      recommendation,
      rationale: generateRationale(recommendation, scores),
      quickWinKeywords: quickWins,
      estimatedEffort: effort,
      estimatedImpact: impact
    });
  }

  // Sort by overall score
  prioritizedThemes.sort((a, b) => b.overallScore - a.overallScore);

  // Generate summary
  const summary = {
    focusCount: prioritizedThemes.filter(t => t.recommendation === "focus").length,
    maintainCount: prioritizedThemes.filter(t => t.recommendation === "maintain").length,
    deprioritizeCount: prioritizedThemes.filter(t => t.recommendation === "deprioritize").length,
    exploreCount: prioritizedThemes.filter(t => t.recommendation === "explore").length,
    topTheme: prioritizedThemes[0]?.themeName || "",
    quickWinsTotal: prioritizedThemes.reduce((sum, t) => sum + t.quickWinKeywords.length, 0)
  };

  // Generate effort/impact matrix
  const matrix = {
    highImpactLowEffort: prioritizedThemes
      .filter(t => t.estimatedImpact === "high" && t.estimatedEffort === "low")
      .map(t => t.themeName),
    highImpactHighEffort: prioritizedThemes
      .filter(t => t.estimatedImpact === "high" && t.estimatedEffort === "high")
      .map(t => t.themeName),
    lowImpactLowEffort: prioritizedThemes
      .filter(t => t.estimatedImpact === "low" && t.estimatedEffort === "low")
      .map(t => t.themeName),
    lowImpactHighEffort: prioritizedThemes
      .filter(t => t.estimatedImpact === "low" && t.estimatedEffort === "high")
      .map(t => t.themeName)
  };

  return { themes: prioritizedThemes, summary, matrix };
}

async function calculateThemeScores(
  theme: any,
  config: Configuration,
  boosters: any[]
): Promise<ThemeScores> {
  const keywords = theme.keywords || [];
  
  // Volume score (based on keyword count and estimated volume)
  const volumeScore = Math.min(100, keywords.length * 10 + (theme.estimatedVolume || 0) / 100);

  // Difficulty score (inverted - easier = higher score)
  const avgDifficulty = theme.avgDifficulty || 50;
  const difficultyScore = 100 - avgDifficulty;

  // Alignment score (check if theme aligns with boosters)
  const alignmentScore = calculateAlignmentScore(theme, boosters);

  // Competition score (inverted - less competition = higher)
  const competitionLevel = theme.competitionLevel || "medium";
  const competitionScore = competitionLevel === "low" ? 80 : 
                          competitionLevel === "medium" ? 50 : 20;

  // Conversion score (based on intent signals)
  const conversionScore = estimateConversionPotential(theme);

  return {
    volume: Math.round(volumeScore),
    difficulty: Math.round(difficultyScore),
    alignment: Math.round(alignmentScore),
    competition: Math.round(competitionScore),
    conversion: Math.round(conversionScore)
  };
}

function calculateAlignmentScore(theme: any, boosters: any[]): number {
  if (boosters.length === 0) return 50; // Neutral if no boosters defined

  const themeName = (theme.name || "").toLowerCase();
  const themeKeywords = (theme.keywords || []).map((k: string) => k.toLowerCase());

  let alignmentCount = 0;
  for (const booster of boosters) {
    const boosterTerm = (booster.term || "").toLowerCase();
    if (themeName.includes(boosterTerm) || 
        themeKeywords.some(k => k.includes(boosterTerm))) {
      alignmentCount++;
    }
  }

  return Math.min(100, 50 + (alignmentCount / boosters.length) * 50);
}

function estimateConversionPotential(theme: any): number {
  const keywords = theme.keywords || [];
  let conversionSignals = 0;

  const highIntentTerms = ["buy", "price", "cost", "best", "review", "vs", "compare", "how to"];
  
  for (const keyword of keywords) {
    const kwLower = keyword.toLowerCase();
    if (highIntentTerms.some(term => kwLower.includes(term))) {
      conversionSignals++;
    }
  }

  const ratio = keywords.length > 0 ? conversionSignals / keywords.length : 0;
  return Math.min(100, 30 + ratio * 70);
}

function calculateOverallScore(scores: ThemeScores): number {
  // Weighted average
  const weights = {
    volume: 0.25,
    difficulty: 0.20,
    alignment: 0.20,
    competition: 0.15,
    conversion: 0.20
  };

  return Math.round(
    scores.volume * weights.volume +
    scores.difficulty * weights.difficulty +
    scores.alignment * weights.alignment +
    scores.competition * weights.competition +
    scores.conversion * weights.conversion
  );
}

function determineRecommendation(
  overallScore: number,
  scores: ThemeScores
): ThemeRecommendation {
  // High score = focus
  if (overallScore >= 70) return "focus";
  
  // Medium score with good alignment = maintain
  if (overallScore >= 50 && scores.alignment >= 60) return "maintain";
  
  // Low score but high potential = explore
  if (overallScore < 50 && scores.volume >= 60) return "explore";
  
  // Low score = deprioritize
  return "deprioritize";
}

function generateRationale(
  recommendation: ThemeRecommendation,
  scores: ThemeScores
): string {
  switch (recommendation) {
    case "focus":
      return `High overall potential with strong ${getTopScore(scores)} score`;
    case "maintain":
      return `Solid alignment with capabilities; continue current investment`;
    case "explore":
      return `High volume potential but needs capability development`;
    case "deprioritize":
      return `Limited potential relative to effort; redirect resources`;
  }
}

function getTopScore(scores: ThemeScores): string {
  const entries = Object.entries(scores);
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function identifyQuickWins(theme: any): QuickWinKeyword[] {
  const keywords = theme.keywords || [];
  const quickWins: QuickWinKeyword[] = [];

  // Simplified - in production would check actual KD
  for (const keyword of keywords.slice(0, 10)) {
    // Heuristic: shorter keywords with high-intent terms are quick wins
    const isShort = keyword.split(" ").length <= 3;
    const hasIntent = /best|how|what|guide|tips/i.test(keyword);
    
    if (isShort && hasIntent) {
      quickWins.push({
        keyword,
        volume: 0, // Would fetch from provider
        difficulty: 30, // Estimated
        reason: "Low competition long-tail with intent"
      });
    }
  }

  return quickWins.slice(0, 3);
}

function estimateEffortImpact(scores: ThemeScores): {
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
} {
  // Effort is inverse of difficulty score (harder = more effort)
  const effort = scores.difficulty >= 60 ? "low" : 
                 scores.difficulty >= 40 ? "medium" : "high";

  // Impact is based on volume and conversion
  const impactScore = (scores.volume + scores.conversion) / 2;
  const impact = impactScore >= 60 ? "high" :
                 impactScore >= 40 ? "medium" : "low";

  return { effort, impact };
}
```

---

## API Route

```typescript
// server/routes.ts - Agregar

import { prioritizeThemes } from "./modules/theme-prioritizer";

// GET /api/theme-prioritization/:configurationId
app.get("/api/theme-prioritization/:configurationId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const config = await storage.getConfigurationById(configurationId, userId);
    
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const result = await prioritizeThemes(config);
    res.json(result);
  } catch (error) {
    console.error("Error prioritizing themes:", error);
    res.status(500).json({ error: "Failed to prioritize themes" });
  }
});
```

---

## UI Component

```tsx
// client/src/components/theme-prioritizer/ThemePrioritizer.tsx

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, Pause, Search, Zap } from "lucide-react";

interface Props {
  configurationId: number;
}

export function ThemePrioritizer({ configurationId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["theme-prioritization", configurationId],
    queryFn: async () => {
      const res = await fetch(`/api/theme-prioritization/${configurationId}`);
      return res.json();
    }
  });

  if (isLoading) return <div>Analyzing themes...</div>;

  const recommendationConfig = {
    focus: { icon: Target, color: "bg-green-100 text-green-800", label: "Focus" },
    maintain: { icon: TrendingUp, color: "bg-blue-100 text-blue-800", label: "Maintain" },
    deprioritize: { icon: Pause, color: "bg-gray-100 text-gray-800", label: "Deprioritize" },
    explore: { icon: Search, color: "bg-yellow-100 text-yellow-800", label: "Explore" }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Theme Prioritization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{data?.summary?.focusCount}</div>
              <div className="text-xs">Focus</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{data?.summary?.maintainCount}</div>
              <div className="text-xs">Maintain</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{data?.summary?.exploreCount}</div>
              <div className="text-xs">Explore</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{data?.summary?.deprioritizeCount}</div>
              <div className="text-xs">Deprioritize</div>
            </div>
          </div>

          {data?.summary?.quickWinsTotal > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="text-sm">
                <strong>{data.summary.quickWinsTotal}</strong> quick win keywords identified
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Theme List */}
      <Card>
        <CardHeader>
          <CardTitle>Themes by Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.themes?.map((theme: any) => {
              const config = recommendationConfig[theme.recommendation];
              const Icon = config.icon;
              
              return (
                <div key={theme.themeId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{theme.themeName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={config.color}>{config.label}</Badge>
                      <span className="text-sm font-bold">{theme.overallScore}%</span>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {Object.entries(theme.scores).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-xs text-gray-500 capitalize">{key}</div>
                        <Progress value={value as number} className="h-1 mt-1" />
                        <div className="text-xs font-medium">{value as number}</div>
                      </div>
                    ))}
                  </div>

                  <div className="text-sm text-gray-600">{theme.rationale}</div>

                  {/* Quick wins */}
                  {theme.quickWinKeywords?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs font-medium mb-1">Quick Wins:</div>
                      <div className="flex flex-wrap gap-1">
                        {theme.quickWinKeywords.map((qw: any) => (
                          <Badge key={qw.keyword} variant="outline" className="text-xs">
                            {qw.keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Effort/Impact Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Effort vs Impact Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-medium text-sm text-green-800">High Impact, Low Effort</div>
              <div className="text-xs text-gray-600 mt-1">
                {data?.matrix?.highImpactLowEffort?.join(", ") || "None"}
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="font-medium text-sm text-blue-800">High Impact, High Effort</div>
              <div className="text-xs text-gray-600 mt-1">
                {data?.matrix?.highImpactHighEffort?.join(", ") || "None"}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm text-gray-800">Low Impact, Low Effort</div>
              <div className="text-xs text-gray-600 mt-1">
                {data?.matrix?.lowImpactLowEffort?.join(", ") || "None"}
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="font-medium text-sm text-red-800">Low Impact, High Effort</div>
              <div className="text-xs text-gray-600 mt-1">
                {data?.matrix?.lowImpactHighEffort?.join(", ") || "None"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Unit tests para calculateThemeScores
- [ ] Unit tests para determineRecommendation
- [ ] Unit tests para identifyQuickWins
- [ ] Integration tests para API endpoint
