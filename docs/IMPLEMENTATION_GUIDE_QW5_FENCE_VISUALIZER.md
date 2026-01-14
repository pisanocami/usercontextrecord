# Implementation Guide: Category Fence Visualizer

> **Quick Win #5**  
> **Complejidad**: Baja  
> **Timeline**: 2-3 días  
> **Dependencias**: UCR Category Definition

---

## Concepto

Visualización interactiva del "territorio" de la marca: qué está incluido, qué está excluido, y dónde están los límites.

---

## Types

```typescript
// shared/types/fence-visualizer.ts

export interface CategoryZone {
  name: string;
  type: "core" | "included" | "adjacent" | "excluded";
  keywords: string[];
  strength: number; // 0-100
}

export interface FenceGap {
  description: string;
  risk: string;
  suggestion: string;
}

export interface CategoryFenceView {
  core: {
    primaryCategory: string;
    description: string;
    keywords: string[];
    strength: number;
  };
  included: {
    categories: string[];
    totalKeywords: number;
  };
  adjacent: {
    categories: string[];
    expansionPotential: "low" | "medium" | "high";
    opportunities: string[];
  };
  excluded: {
    categories: string[];
    keywords: string[];
    reasons: string[];
  };
  fence: {
    overallStrength: number;
    mode: "hard" | "soft" | "none";
    gaps: FenceGap[];
  };
  zones: CategoryZone[];
}
```

---

## Core Implementation

```typescript
// server/modules/fence-visualizer.ts

import type { Configuration } from "@shared/schema";
import type { CategoryFenceView, CategoryZone, FenceGap } from "@shared/types/fence-visualizer";

/**
 * Generate category fence visualization data
 */
export function generateFenceVisualization(config: Configuration): CategoryFenceView {
  const categoryDef = config.category_definition;
  const negativeScope = config.negative_scope;
  const demandThemes = config.demand_definition?.demand_themes || [];

  // Core category
  const primaryCategory = categoryDef?.primary_category || "Not defined";
  const coreKeywords = extractCoreKeywords(demandThemes);
  const coreStrength = calculateCoreStrength(categoryDef, demandThemes);

  // Included categories
  const includedCategories = categoryDef?.included_categories || [];

  // Adjacent categories (inferred from themes)
  const adjacentCategories = inferAdjacentCategories(demandThemes, includedCategories);
  const expansionPotential = calculateExpansionPotential(adjacentCategories, config);

  // Excluded
  const excludedCategories = categoryDef?.excluded_categories || [];
  const excludedKeywords = negativeScope?.excluded_keywords || [];
  const excludedReasons = generateExclusionReasons(excludedCategories, excludedKeywords);

  // Fence analysis
  const fenceMode = categoryDef?.fence_mode || "soft";
  const gaps = identifyFenceGaps(config);
  const overallStrength = calculateFenceStrength(config, gaps);

  // Generate zones for visualization
  const zones = generateZones(config);

  return {
    core: {
      primaryCategory,
      description: categoryDef?.description || "",
      keywords: coreKeywords,
      strength: coreStrength
    },
    included: {
      categories: includedCategories,
      totalKeywords: countIncludedKeywords(demandThemes)
    },
    adjacent: {
      categories: adjacentCategories,
      expansionPotential,
      opportunities: generateOpportunities(adjacentCategories)
    },
    excluded: {
      categories: excludedCategories,
      keywords: excludedKeywords.slice(0, 20),
      reasons: excludedReasons
    },
    fence: {
      overallStrength,
      mode: fenceMode,
      gaps
    },
    zones
  };
}

function extractCoreKeywords(themes: any[]): string[] {
  const keywords: string[] = [];
  const highPriorityThemes = themes.filter(t => t.priority === "high");
  
  for (const theme of highPriorityThemes) {
    keywords.push(...(theme.keywords || []).slice(0, 5));
  }
  
  return [...new Set(keywords)].slice(0, 15);
}

function calculateCoreStrength(categoryDef: any, themes: any[]): number {
  let strength = 0;
  
  if (categoryDef?.primary_category) strength += 30;
  if (categoryDef?.description) strength += 10;
  if (categoryDef?.included_categories?.length > 0) strength += 20;
  if (themes.filter(t => t.priority === "high").length >= 2) strength += 20;
  if (categoryDef?.fence_mode === "hard") strength += 20;
  else if (categoryDef?.fence_mode === "soft") strength += 10;
  
  return Math.min(strength, 100);
}

function inferAdjacentCategories(themes: any[], included: string[]): string[] {
  const adjacent: string[] = [];
  
  // Look for themes that might suggest adjacent categories
  for (const theme of themes) {
    if (theme.priority === "low" && theme.name) {
      const isIncluded = included.some(inc => 
        theme.name.toLowerCase().includes(inc.toLowerCase())
      );
      if (!isIncluded) {
        adjacent.push(theme.name);
      }
    }
  }
  
  return [...new Set(adjacent)].slice(0, 5);
}

function calculateExpansionPotential(
  adjacent: string[],
  config: Configuration
): "low" | "medium" | "high" {
  const goalType = config.strategic_intent?.goal_type;
  const riskTolerance = config.strategic_intent?.risk_tolerance;
  
  if (goalType === "growth" && riskTolerance === "aggressive" && adjacent.length > 0) {
    return "high";
  }
  if (goalType === "growth" && adjacent.length > 2) {
    return "medium";
  }
  return "low";
}

function generateExclusionReasons(categories: string[], keywords: string[]): string[] {
  const reasons: string[] = [];
  
  if (categories.length > 0) {
    reasons.push(`${categories.length} categories explicitly excluded`);
  }
  if (keywords.length > 0) {
    reasons.push(`${keywords.length} keywords in negative scope`);
  }
  if (reasons.length === 0) {
    reasons.push("No explicit exclusions defined");
  }
  
  return reasons;
}

function identifyFenceGaps(config: Configuration): FenceGap[] {
  const gaps: FenceGap[] = [];
  const categoryDef = config.category_definition;
  const negativeScope = config.negative_scope;

  if (!categoryDef?.primary_category) {
    gaps.push({
      description: "No primary category defined",
      risk: "Analyses may include irrelevant keywords",
      suggestion: "Define a clear primary category"
    });
  }

  if (!categoryDef?.excluded_categories?.length && !negativeScope?.excluded_keywords?.length) {
    gaps.push({
      description: "No exclusions defined",
      risk: "May capture noise in analyses",
      suggestion: "Add excluded categories or keywords"
    });
  }

  if (categoryDef?.fence_mode === "none") {
    gaps.push({
      description: "Fence mode is disabled",
      risk: "No filtering applied to analyses",
      suggestion: "Consider enabling soft or hard fence mode"
    });
  }

  return gaps;
}

function calculateFenceStrength(config: Configuration, gaps: FenceGap[]): number {
  let strength = 70; // Base
  
  // Deduct for gaps
  strength -= gaps.length * 15;
  
  // Add for fence mode
  const fenceMode = config.category_definition?.fence_mode;
  if (fenceMode === "hard") strength += 20;
  else if (fenceMode === "soft") strength += 10;
  
  // Add for exclusions
  const excludedCount = (config.category_definition?.excluded_categories?.length || 0) +
                        (config.negative_scope?.excluded_keywords?.length || 0);
  if (excludedCount > 10) strength += 10;
  else if (excludedCount > 5) strength += 5;
  
  return Math.max(0, Math.min(100, strength));
}

function generateZones(config: Configuration): CategoryZone[] {
  const zones: CategoryZone[] = [];
  const themes = config.demand_definition?.demand_themes || [];

  // Core zone
  zones.push({
    name: config.category_definition?.primary_category || "Core",
    type: "core",
    keywords: extractCoreKeywords(themes),
    strength: 100
  });

  // Included zones
  for (const cat of config.category_definition?.included_categories || []) {
    zones.push({
      name: cat,
      type: "included",
      keywords: [],
      strength: 80
    });
  }

  // Excluded zones
  for (const cat of config.category_definition?.excluded_categories || []) {
    zones.push({
      name: cat,
      type: "excluded",
      keywords: [],
      strength: 0
    });
  }

  return zones;
}

function countIncludedKeywords(themes: any[]): number {
  return themes.reduce((sum, t) => sum + (t.keywords?.length || 0), 0);
}

function generateOpportunities(adjacent: string[]): string[] {
  return adjacent.map(cat => `Explore ${cat} for expansion`);
}
```

---

## API Route

```typescript
// server/routes.ts - Agregar

import { generateFenceVisualization } from "./modules/fence-visualizer";

// GET /api/fence-visualization/:configurationId
app.get("/api/fence-visualization/:configurationId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const config = await storage.getConfigurationById(configurationId, userId);
    
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const visualization = generateFenceVisualization(config);
    res.json(visualization);
  } catch (error) {
    console.error("Error generating fence visualization:", error);
    res.status(500).json({ error: "Failed to generate visualization" });
  }
});
```

---

## UI Component

```tsx
// client/src/components/fence-visualizer/CategoryFenceVisualizer.tsx

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Target, Expand, Ban, AlertTriangle } from "lucide-react";

interface Props {
  configurationId: number;
}

export function CategoryFenceVisualizer({ configurationId }: Props) {
  const { data: fence, isLoading } = useQuery({
    queryKey: ["fence-visualization", configurationId],
    queryFn: async () => {
      const res = await fetch(`/api/fence-visualization/${configurationId}`);
      return res.json();
    }
  });

  if (isLoading) return <div>Loading...</div>;

  const potentialColors = {
    low: "text-gray-500",
    medium: "text-yellow-500",
    high: "text-green-500"
  };

  return (
    <div className="space-y-6">
      {/* Fence Strength */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Category Fence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span>Fence Strength</span>
            <span className="font-bold">{fence?.fence?.overallStrength}%</span>
          </div>
          <Progress value={fence?.fence?.overallStrength} />
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">Mode: {fence?.fence?.mode}</Badge>
          </div>
          
          {fence?.fence?.gaps?.length > 0 && (
            <div className="mt-4 space-y-2">
              {fence.fence.gaps.map((gap: any, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-yellow-50 rounded text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div>
                    <div className="font-medium">{gap.description}</div>
                    <div className="text-xs text-gray-600">{gap.suggestion}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zones Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Core */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              Core Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-lg">{fence?.core?.primaryCategory}</div>
            <div className="text-sm text-gray-600 mt-1">{fence?.core?.description}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {fence?.core?.keywords?.slice(0, 5).map((kw: string) => (
                <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Included */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Included ({fence?.included?.categories?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {fence?.included?.categories?.map((cat: string) => (
                <div key={cat} className="text-sm">{cat}</div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {fence?.included?.totalKeywords} keywords tracked
            </div>
          </CardContent>
        </Card>

        {/* Adjacent */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Expand className="h-4 w-4 text-yellow-600" />
              Adjacent Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {fence?.adjacent?.categories?.map((cat: string) => (
                <div key={cat} className="text-sm">{cat}</div>
              ))}
            </div>
            <div className={`text-xs mt-2 ${potentialColors[fence?.adjacent?.expansionPotential]}`}>
              Expansion potential: {fence?.adjacent?.expansionPotential}
            </div>
          </CardContent>
        </Card>

        {/* Excluded */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-600" />
              Excluded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {fence?.excluded?.categories?.map((cat: string) => (
                <div key={cat} className="text-sm line-through text-gray-500">{cat}</div>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {fence?.excluded?.keywords?.length || 0} keywords blocked
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Unit tests para calculateFenceStrength
- [ ] Unit tests para identifyFenceGaps
- [ ] Integration tests para API endpoint
