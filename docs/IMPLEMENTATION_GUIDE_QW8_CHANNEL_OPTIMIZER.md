# Implementation Guide: Channel Mix Optimizer

> **Quick Win #8**  
> **Complejidad**: Baja  
> **Timeline**: 3-5 días  
> **Dependencias**: UCR Channel Context

---

## Concepto

Sugiere la distribución óptima de esfuerzo/presupuesto entre canales basándose en el UCR y benchmarks.

---

## Types

```typescript
// shared/types/channel-optimizer.ts

export type ChannelId = "seo" | "paid_search" | "social" | "email" | "content" | "pr" | "affiliate";

export interface ChannelAllocation {
  channel: ChannelId;
  channelName: string;
  currentPercent: number;
  recommendedPercent: number;
  delta: number;
  rationale: string;
  priority: "high" | "medium" | "low";
  expectedImpact: string;
}

export interface ChannelMixRecommendation {
  current: Record<ChannelId, number>;
  recommended: Record<ChannelId, number>;
  allocations: ChannelAllocation[];
  totalDelta: number;
  summary: {
    increaseChannels: string[];
    decreaseChannels: string[];
    maintainChannels: string[];
  };
  expectedOverallImpact: string;
  implementationOrder: string[];
  assumptions: string[];
}
```

---

## Core Implementation

```typescript
// server/modules/channel-optimizer.ts

import type { Configuration } from "@shared/schema";
import type { 
  ChannelMixRecommendation, 
  ChannelAllocation,
  ChannelId 
} from "@shared/types/channel-optimizer";

const CHANNEL_NAMES: Record<ChannelId, string> = {
  seo: "SEO / Organic",
  paid_search: "Paid Search",
  social: "Social Media",
  email: "Email Marketing",
  content: "Content Marketing",
  pr: "PR / Communications",
  affiliate: "Affiliate / Partners"
};

// Industry benchmarks by goal type
const BENCHMARKS: Record<string, Record<ChannelId, number>> = {
  growth: {
    seo: 25,
    paid_search: 30,
    social: 15,
    email: 10,
    content: 15,
    pr: 3,
    affiliate: 2
  },
  defend: {
    seo: 35,
    paid_search: 20,
    social: 10,
    email: 15,
    content: 15,
    pr: 3,
    affiliate: 2
  },
  awareness: {
    seo: 20,
    paid_search: 25,
    social: 25,
    email: 5,
    content: 10,
    pr: 10,
    affiliate: 5
  }
};

/**
 * Optimize channel mix
 */
export function optimizeChannelMix(config: Configuration): ChannelMixRecommendation {
  const goalType = config.strategic_intent?.goal_type || "growth";
  const seoMaturity = config.channel_context?.seo_maturity || "developing";
  const currentMix = normalizeCurrentMix(config.channel_context?.channel_mix || {});
  
  // Get benchmark for goal type
  const benchmark = BENCHMARKS[goalType] || BENCHMARKS.growth;
  
  // Adjust benchmark based on SEO maturity
  const adjustedBenchmark = adjustForMaturity(benchmark, seoMaturity);
  
  // Generate allocations
  const allocations = generateAllocations(currentMix, adjustedBenchmark, config);
  
  // Calculate summary
  const increaseChannels = allocations.filter(a => a.delta > 5).map(a => a.channelName);
  const decreaseChannels = allocations.filter(a => a.delta < -5).map(a => a.channelName);
  const maintainChannels = allocations.filter(a => Math.abs(a.delta) <= 5).map(a => a.channelName);
  
  // Calculate total delta (sum of absolute changes)
  const totalDelta = allocations.reduce((sum, a) => sum + Math.abs(a.delta), 0);
  
  // Generate implementation order
  const implementationOrder = allocations
    .filter(a => a.delta > 0)
    .sort((a, b) => b.priority === "high" ? 1 : -1)
    .map(a => a.channelName);

  return {
    current: currentMix,
    recommended: adjustedBenchmark,
    allocations,
    totalDelta,
    summary: {
      increaseChannels,
      decreaseChannels,
      maintainChannels
    },
    expectedOverallImpact: generateOverallImpact(totalDelta, goalType),
    implementationOrder,
    assumptions: generateAssumptions(config)
  };
}

function normalizeCurrentMix(mix: Record<string, number>): Record<ChannelId, number> {
  const normalized: Record<ChannelId, number> = {
    seo: 0,
    paid_search: 0,
    social: 0,
    email: 0,
    content: 0,
    pr: 0,
    affiliate: 0
  };

  // Map input to standard channels
  for (const [key, value] of Object.entries(mix)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, "_") as ChannelId;
    if (normalizedKey in normalized) {
      normalized[normalizedKey] = value;
    }
  }

  // If no mix defined, use equal distribution
  const total = Object.values(normalized).reduce((a, b) => a + b, 0);
  if (total === 0) {
    const channels = Object.keys(normalized) as ChannelId[];
    const equalShare = Math.round(100 / channels.length);
    for (const channel of channels) {
      normalized[channel] = equalShare;
    }
  }

  return normalized;
}

function adjustForMaturity(
  benchmark: Record<ChannelId, number>,
  maturity: string
): Record<ChannelId, number> {
  const adjusted = { ...benchmark };

  if (maturity === "nascent") {
    // Reduce SEO, increase paid for quick results
    adjusted.seo = Math.max(10, adjusted.seo - 10);
    adjusted.paid_search = Math.min(40, adjusted.paid_search + 10);
  } else if (maturity === "advanced") {
    // Increase SEO, reduce paid
    adjusted.seo = Math.min(40, adjusted.seo + 5);
    adjusted.paid_search = Math.max(15, adjusted.paid_search - 5);
  }

  // Normalize to 100%
  const total = Object.values(adjusted).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(adjusted) as ChannelId[]) {
    adjusted[key] = Math.round((adjusted[key] / total) * 100);
  }

  return adjusted;
}

function generateAllocations(
  current: Record<ChannelId, number>,
  recommended: Record<ChannelId, number>,
  config: Configuration
): ChannelAllocation[] {
  const allocations: ChannelAllocation[] = [];

  for (const channel of Object.keys(CHANNEL_NAMES) as ChannelId[]) {
    const currentPercent = current[channel] || 0;
    const recommendedPercent = recommended[channel] || 0;
    const delta = recommendedPercent - currentPercent;

    allocations.push({
      channel,
      channelName: CHANNEL_NAMES[channel],
      currentPercent,
      recommendedPercent,
      delta,
      rationale: generateChannelRationale(channel, delta, config),
      priority: determinePriority(channel, delta, config),
      expectedImpact: generateExpectedImpact(channel, delta)
    });
  }

  // Sort by absolute delta (biggest changes first)
  return allocations.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function generateChannelRationale(
  channel: ChannelId,
  delta: number,
  config: Configuration
): string {
  const goalType = config.strategic_intent?.goal_type || "growth";
  const maturity = config.channel_context?.seo_maturity || "developing";

  if (Math.abs(delta) <= 5) {
    return "Current allocation aligns with benchmark";
  }

  if (delta > 0) {
    switch (channel) {
      case "seo":
        return maturity === "advanced" 
          ? "Leverage strong SEO foundation for sustainable growth"
          : "Build organic foundation for long-term results";
      case "paid_search":
        return goalType === "growth"
          ? "Accelerate growth with targeted paid campaigns"
          : "Maintain visibility while organic builds";
      case "content":
        return "Content supports both SEO and brand authority";
      case "social":
        return "Increase brand awareness and engagement";
      case "email":
        return "Improve retention and customer lifetime value";
      default:
        return "Increase investment to align with strategic goals";
    }
  } else {
    return "Reallocate to higher-impact channels";
  }
}

function determinePriority(
  channel: ChannelId,
  delta: number,
  config: Configuration
): "high" | "medium" | "low" {
  const goalType = config.strategic_intent?.goal_type;

  if (Math.abs(delta) < 5) return "low";

  // High priority channels by goal
  if (goalType === "growth" && (channel === "paid_search" || channel === "seo")) {
    return delta > 0 ? "high" : "medium";
  }
  if (goalType === "defend" && channel === "seo") {
    return delta > 0 ? "high" : "medium";
  }
  if (goalType === "awareness" && (channel === "social" || channel === "pr")) {
    return delta > 0 ? "high" : "medium";
  }

  return Math.abs(delta) > 10 ? "high" : "medium";
}

function generateExpectedImpact(channel: ChannelId, delta: number): string {
  if (Math.abs(delta) <= 5) return "Minimal change expected";

  const direction = delta > 0 ? "increase" : "decrease";
  const magnitude = Math.abs(delta) > 15 ? "significant" : "moderate";

  const impacts: Record<ChannelId, string> = {
    seo: `${magnitude} organic traffic ${direction}`,
    paid_search: `${magnitude} paid visibility ${direction}`,
    social: `${magnitude} engagement ${direction}`,
    email: `${magnitude} retention ${direction}`,
    content: `${magnitude} authority ${direction}`,
    pr: `${magnitude} brand awareness ${direction}`,
    affiliate: `${magnitude} partner revenue ${direction}`
  };

  return impacts[channel];
}

function generateOverallImpact(totalDelta: number, goalType: string): string {
  if (totalDelta < 20) {
    return "Minor optimization - current mix is close to optimal";
  }
  if (totalDelta < 50) {
    return `Moderate rebalancing recommended for ${goalType} objectives`;
  }
  return `Significant reallocation needed to align with ${goalType} strategy`;
}

function generateAssumptions(config: Configuration): string[] {
  const assumptions: string[] = [];
  
  assumptions.push("Benchmarks based on B2B SaaS industry averages");
  
  if (!config.channel_context?.channel_mix) {
    assumptions.push("Current mix estimated from default distribution");
  }
  
  assumptions.push(`SEO maturity: ${config.channel_context?.seo_maturity || "developing"}`);
  assumptions.push(`Strategic goal: ${config.strategic_intent?.goal_type || "growth"}`);
  
  return assumptions;
}
```

---

## API Route

```typescript
// server/routes.ts - Agregar

import { optimizeChannelMix } from "./modules/channel-optimizer";

// GET /api/channel-optimization/:configurationId
app.get("/api/channel-optimization/:configurationId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const config = await storage.getConfigurationById(configurationId, userId);
    
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const optimization = optimizeChannelMix(config);
    res.json(optimization);
  } catch (error) {
    console.error("Error optimizing channel mix:", error);
    res.status(500).json({ error: "Failed to optimize" });
  }
});
```

---

## UI Component

```tsx
// client/src/components/channel-optimizer/ChannelMixOptimizer.tsx

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUp, ArrowDown, Minus, BarChart3 } from "lucide-react";

interface Props {
  configurationId: number;
}

export function ChannelMixOptimizer({ configurationId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["channel-optimization", configurationId],
    queryFn: async () => {
      const res = await fetch(`/api/channel-optimization/${configurationId}`);
      return res.json();
    }
  });

  if (isLoading) return <div>Analyzing channel mix...</div>;

  const getDeltaIcon = (delta: number) => {
    if (delta > 5) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (delta < -5) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const priorityColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Channel Mix Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">{data?.expectedOverallImpact}</p>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="font-medium text-green-800">Increase</div>
              <div className="text-sm text-gray-600">
                {data?.summary?.increaseChannels?.join(", ") || "None"}
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="font-medium text-red-800">Decrease</div>
              <div className="text-sm text-gray-600">
                {data?.summary?.decreaseChannels?.join(", ") || "None"}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-800">Maintain</div>
              <div className="text-sm text-gray-600">
                {data?.summary?.maintainChannels?.join(", ") || "None"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel Allocations */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.allocations?.map((alloc: any) => (
              <div key={alloc.channel} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getDeltaIcon(alloc.delta)}
                    <span className="font-medium">{alloc.channelName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={priorityColors[alloc.priority]}>
                      {alloc.priority}
                    </Badge>
                    <span className={`text-sm font-bold ${
                      alloc.delta > 0 ? "text-green-600" : 
                      alloc.delta < 0 ? "text-red-600" : "text-gray-600"
                    }`}>
                      {alloc.delta > 0 ? "+" : ""}{alloc.delta}%
                    </span>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Current: {alloc.currentPercent}%</div>
                    <Progress value={alloc.currentPercent} className="h-2" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Recommended: {alloc.recommendedPercent}%</div>
                    <Progress value={alloc.recommendedPercent} className="h-2 bg-blue-100" />
                  </div>
                </div>

                <div className="text-sm text-gray-600">{alloc.rationale}</div>
                <div className="text-xs text-gray-500 mt-1">Expected: {alloc.expectedImpact}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Order */}
      {data?.implementationOrder?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Implementation Order</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {data.implementationOrder.map((channel: string, i: number) => (
                <li key={i}>{channel}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-1">
            {data?.assumptions?.map((assumption: string, i: number) => (
              <li key={i}>• {assumption}</li>
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

- [ ] Unit tests para normalizeCurrentMix
- [ ] Unit tests para adjustForMaturity
- [ ] Unit tests para generateAllocations
- [ ] Integration tests para API endpoint
