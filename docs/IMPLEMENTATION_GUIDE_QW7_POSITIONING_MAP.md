# Implementation Guide: Competitive Positioning Map

> **Quick Win #7**  
> **Complejidad**: Baja  
> **Timeline**: 4-5 días  
> **Dependencias**: UCR Competitors

---

## Concepto

Mapa visual 2D que posiciona a la marca y competidores en ejes estratégicos configurables.

---

## Types

```typescript
// shared/types/positioning-map.ts

export interface MapAxis {
  id: string;
  label: string;
  lowLabel: string;
  highLabel: string;
}

export interface MapPosition {
  entity: string;
  entityType: "client" | "tier1" | "tier2" | "tier3";
  x: number; // -100 to 100
  y: number; // -100 to 100
  size: number; // Relative size (1-10)
  color?: string;
}

export interface WhiteSpace {
  x: number;
  y: number;
  radius: number;
  opportunity: string;
  attractiveness: "low" | "medium" | "high";
}

export interface PositioningMap {
  id: string;
  name: string;
  axes: {
    x: MapAxis;
    y: MapAxis;
  };
  positions: MapPosition[];
  whiteSpaces: WhiteSpace[];
  insights: string[];
  generatedAt: Date;
}

export interface MapPreset {
  id: string;
  name: string;
  description: string;
  xAxis: MapAxis;
  yAxis: MapAxis;
}
```

---

## Core Implementation

```typescript
// server/modules/positioning-map.ts

import type { Configuration } from "@shared/schema";
import type { 
  PositioningMap, 
  MapPosition, 
  WhiteSpace,
  MapAxis,
  MapPreset 
} from "@shared/types/positioning-map";

// Preset map configurations
export const MAP_PRESETS: MapPreset[] = [
  {
    id: "price_quality",
    name: "Price vs Quality",
    description: "Classic positioning on price and quality dimensions",
    xAxis: { id: "price", label: "Price", lowLabel: "Budget", highLabel: "Premium" },
    yAxis: { id: "quality", label: "Quality", lowLabel: "Basic", highLabel: "Best-in-class" }
  },
  {
    id: "specialist_generalist",
    name: "Specialist vs Generalist",
    description: "Focus vs breadth of offering",
    xAxis: { id: "focus", label: "Focus", lowLabel: "Generalist", highLabel: "Specialist" },
    yAxis: { id: "scale", label: "Scale", lowLabel: "Niche", highLabel: "Mass Market" }
  },
  {
    id: "innovation_trust",
    name: "Innovation vs Trust",
    description: "New vs established positioning",
    xAxis: { id: "innovation", label: "Innovation", lowLabel: "Traditional", highLabel: "Cutting-edge" },
    yAxis: { id: "trust", label: "Trust", lowLabel: "Emerging", highLabel: "Established" }
  },
  {
    id: "service_product",
    name: "Service vs Product Focus",
    description: "Service-led vs product-led positioning",
    xAxis: { id: "delivery", label: "Delivery", lowLabel: "Product-led", highLabel: "Service-led" },
    yAxis: { id: "customization", label: "Customization", lowLabel: "Standardized", highLabel: "Bespoke" }
  }
];

/**
 * Generate positioning map
 */
export function generatePositioningMap(
  config: Configuration,
  presetId: string = "price_quality"
): PositioningMap {
  const preset = MAP_PRESETS.find(p => p.id === presetId) || MAP_PRESETS[0];
  
  // Generate positions
  const positions = generatePositions(config, preset);
  
  // Identify white spaces
  const whiteSpaces = identifyWhiteSpaces(positions);
  
  // Generate insights
  const insights = generateInsights(positions, whiteSpaces, config);

  return {
    id: `map_${Date.now()}`,
    name: preset.name,
    axes: {
      x: preset.xAxis,
      y: preset.yAxis
    },
    positions,
    whiteSpaces,
    insights,
    generatedAt: new Date()
  };
}

function generatePositions(
  config: Configuration,
  preset: MapPreset
): MapPosition[] {
  const positions: MapPosition[] = [];
  const brandName = config.brand?.name || config.brand?.domain || "Your Brand";
  const competitors = config.competitors?.competitors || [];

  // Position client brand
  const clientPosition = estimatePosition(config, preset, "client");
  positions.push({
    entity: brandName,
    entityType: "client",
    x: clientPosition.x,
    y: clientPosition.y,
    size: 8,
    color: "#3B82F6" // Blue
  });

  // Position competitors
  for (const competitor of competitors) {
    const tierType = (competitor.tier || "tier2") as "tier1" | "tier2" | "tier3";
    const competitorPosition = estimateCompetitorPosition(competitor, preset);
    
    positions.push({
      entity: competitor.name || competitor.domain,
      entityType: tierType,
      x: competitorPosition.x,
      y: competitorPosition.y,
      size: tierType === "tier1" ? 7 : tierType === "tier2" ? 5 : 3,
      color: tierType === "tier1" ? "#EF4444" : tierType === "tier2" ? "#F59E0B" : "#9CA3AF"
    });
  }

  return positions;
}

function estimatePosition(
  config: Configuration,
  preset: MapPreset,
  type: "client"
): { x: number; y: number } {
  // Use UCR signals to estimate position
  const boosters = config.governance?.capability_model?.boosters || [];
  const tagline = config.brand?.tagline || "";
  
  let x = 0;
  let y = 0;

  // Heuristics based on preset
  switch (preset.id) {
    case "price_quality":
      // Check for premium signals
      if (/premium|luxury|best|top/i.test(tagline)) {
        x = 50; y = 60;
      } else if (/affordable|value|budget/i.test(tagline)) {
        x = -50; y = 20;
      } else {
        x = 20; y = 40; // Default mid-premium
      }
      break;

    case "specialist_generalist":
      // Check category breadth
      const includedCategories = config.category_definition?.included_categories?.length || 0;
      x = includedCategories > 3 ? -40 : 40; // More categories = generalist
      y = boosters.length > 2 ? 30 : -20;
      break;

    case "innovation_trust":
      // Check for innovation signals
      if (/innovat|new|first|pioneer/i.test(tagline)) {
        x = 60; y = -20;
      } else if (/trusted|established|proven/i.test(tagline)) {
        x = -30; y = 60;
      } else {
        x = 20; y = 30;
      }
      break;

    default:
      x = 30; y = 30;
  }

  // Add some randomness to avoid exact overlaps
  x += (Math.random() - 0.5) * 10;
  y += (Math.random() - 0.5) * 10;

  return { x: Math.round(x), y: Math.round(y) };
}

function estimateCompetitorPosition(
  competitor: any,
  preset: MapPreset
): { x: number; y: number } {
  // Without detailed competitor data, use tier as proxy
  const tier = competitor.tier || "tier2";
  
  let baseX = 0;
  let baseY = 0;

  switch (preset.id) {
    case "price_quality":
      if (tier === "tier1") {
        baseX = 40 + Math.random() * 30;
        baseY = 50 + Math.random() * 30;
      } else if (tier === "tier2") {
        baseX = -20 + Math.random() * 60;
        baseY = 20 + Math.random() * 40;
      } else {
        baseX = -40 + Math.random() * 40;
        baseY = -20 + Math.random() * 40;
      }
      break;

    default:
      baseX = (Math.random() - 0.5) * 80;
      baseY = (Math.random() - 0.5) * 80;
  }

  return { x: Math.round(baseX), y: Math.round(baseY) };
}

function identifyWhiteSpaces(positions: MapPosition[]): WhiteSpace[] {
  const whiteSpaces: WhiteSpace[] = [];
  
  // Check quadrants for emptiness
  const quadrants = [
    { x: 50, y: 50, label: "Premium/High Quality" },
    { x: -50, y: 50, label: "Value/High Quality" },
    { x: 50, y: -50, label: "Premium/Basic" },
    { x: -50, y: -50, label: "Value/Basic" }
  ];

  for (const quadrant of quadrants) {
    const nearbyPositions = positions.filter(p => 
      Math.abs(p.x - quadrant.x) < 40 && Math.abs(p.y - quadrant.y) < 40
    );

    if (nearbyPositions.length === 0) {
      whiteSpaces.push({
        x: quadrant.x,
        y: quadrant.y,
        radius: 30,
        opportunity: `Uncontested space in ${quadrant.label} quadrant`,
        attractiveness: quadrant.y > 0 ? "high" : "medium"
      });
    } else if (nearbyPositions.length === 1 && nearbyPositions[0].entityType !== "client") {
      whiteSpaces.push({
        x: quadrant.x,
        y: quadrant.y,
        radius: 20,
        opportunity: `Limited competition in ${quadrant.label}`,
        attractiveness: "medium"
      });
    }
  }

  return whiteSpaces;
}

function generateInsights(
  positions: MapPosition[],
  whiteSpaces: WhiteSpace[],
  config: Configuration
): string[] {
  const insights: string[] = [];
  const clientPos = positions.find(p => p.entityType === "client");
  const tier1Positions = positions.filter(p => p.entityType === "tier1");

  if (clientPos && tier1Positions.length > 0) {
    // Check proximity to tier1 competitors
    for (const t1 of tier1Positions) {
      const distance = Math.sqrt(
        Math.pow(clientPos.x - t1.x, 2) + Math.pow(clientPos.y - t1.y, 2)
      );
      
      if (distance < 30) {
        insights.push(`Positioned very close to ${t1.entity} - differentiation needed`);
      }
    }
  }

  // White space insights
  const highAttractive = whiteSpaces.filter(ws => ws.attractiveness === "high");
  if (highAttractive.length > 0) {
    insights.push(`${highAttractive.length} high-attractiveness white space(s) identified`);
  }

  // Crowding insight
  const crowdedArea = positions.filter(p => 
    Math.abs(p.x) < 30 && Math.abs(p.y) < 30
  ).length;
  if (crowdedArea > 3) {
    insights.push("Center of map is crowded - consider moving to edges for differentiation");
  }

  if (insights.length === 0) {
    insights.push("Positioning appears differentiated from key competitors");
  }

  return insights;
}

/**
 * Get available presets
 */
export function getMapPresets(): MapPreset[] {
  return MAP_PRESETS;
}
```

---

## API Routes

```typescript
// server/routes.ts - Agregar

import { generatePositioningMap, getMapPresets } from "./modules/positioning-map";

// GET /api/positioning-map/presets
app.get("/api/positioning-map/presets", requireAuth, (req, res) => {
  res.json(getMapPresets());
});

// GET /api/positioning-map/:configurationId
app.get("/api/positioning-map/:configurationId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const presetId = req.query.preset as string || "price_quality";
    
    const config = await storage.getConfigurationById(configurationId, userId);
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const map = generatePositioningMap(config, presetId);
    res.json(map);
  } catch (error) {
    console.error("Error generating positioning map:", error);
    res.status(500).json({ error: "Failed to generate map" });
  }
});
```

---

## UI Component

```tsx
// client/src/components/positioning-map/PositioningMapView.tsx

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Map, Lightbulb } from "lucide-react";

interface Props {
  configurationId: number;
}

export function PositioningMapView({ configurationId }: Props) {
  const [preset, setPreset] = useState("price_quality");

  const { data: presets } = useQuery({
    queryKey: ["positioning-map-presets"],
    queryFn: async () => {
      const res = await fetch("/api/positioning-map/presets");
      return res.json();
    }
  });

  const { data: map, isLoading } = useQuery({
    queryKey: ["positioning-map", configurationId, preset],
    queryFn: async () => {
      const res = await fetch(`/api/positioning-map/${configurationId}?preset=${preset}`);
      return res.json();
    }
  });

  if (isLoading) return <div>Generating map...</div>;

  // Convert position to SVG coordinates (center at 200,200, scale 2)
  const toSvg = (val: number) => 200 + val * 1.8;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Competitive Positioning Map
          </CardTitle>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presets?.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {/* SVG Map */}
          <div className="relative bg-gray-50 rounded-lg p-4">
            <svg viewBox="0 0 400 400" className="w-full h-96">
              {/* Grid lines */}
              <line x1="200" y1="0" x2="200" y2="400" stroke="#E5E7EB" strokeWidth="1" />
              <line x1="0" y1="200" x2="400" y2="200" stroke="#E5E7EB" strokeWidth="1" />
              
              {/* Axis labels */}
              <text x="390" y="210" fontSize="10" fill="#6B7280">{map?.axes?.x?.highLabel}</text>
              <text x="10" y="210" fontSize="10" fill="#6B7280">{map?.axes?.x?.lowLabel}</text>
              <text x="205" y="15" fontSize="10" fill="#6B7280">{map?.axes?.y?.highLabel}</text>
              <text x="205" y="395" fontSize="10" fill="#6B7280">{map?.axes?.y?.lowLabel}</text>

              {/* White spaces */}
              {map?.whiteSpaces?.map((ws: any, i: number) => (
                <circle
                  key={i}
                  cx={toSvg(ws.x)}
                  cy={toSvg(-ws.y)} // Invert Y for SVG
                  r={ws.radius}
                  fill="#10B981"
                  fillOpacity="0.1"
                  stroke="#10B981"
                  strokeDasharray="4"
                />
              ))}

              {/* Positions */}
              {map?.positions?.map((pos: any, i: number) => (
                <g key={i}>
                  <circle
                    cx={toSvg(pos.x)}
                    cy={toSvg(-pos.y)}
                    r={pos.size * 3}
                    fill={pos.color}
                    fillOpacity="0.8"
                  />
                  <text
                    x={toSvg(pos.x)}
                    y={toSvg(-pos.y) + pos.size * 3 + 12}
                    fontSize="9"
                    textAnchor="middle"
                    fill="#374151"
                  >
                    {pos.entity.length > 15 ? pos.entity.slice(0, 12) + "..." : pos.entity}
                  </text>
                </g>
              ))}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-2 left-2 flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>You</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Tier 1</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Tier 2</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full border-2 border-green-500 border-dashed" />
                <span>White Space</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {map?.insights?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {map.insights.map((insight: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* White Spaces */}
      {map?.whiteSpaces?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">White Space Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {map.whiteSpaces.map((ws: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm">{ws.opportunity}</span>
                  <Badge variant={ws.attractiveness === "high" ? "default" : "secondary"}>
                    {ws.attractiveness}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Unit tests para generatePositions
- [ ] Unit tests para identifyWhiteSpaces
- [ ] Integration tests para API endpoints
- [ ] Visual testing para SVG rendering
