# Implementation Guide: Competitor Watch List

> **Quick Win #2**  
> **Complejidad**: Baja  
> **Timeline**: 3-5 días  
> **Dependencias**: UCR Competitors, Ahrefs Provider

---

## Concepto

Sistema de monitoreo que detecta cambios significativos en competidores y genera alertas simples.

---

## Types

```typescript
// shared/types/competitor-watch.ts

export type WatchAlertType = 
  | "da_change"        // Domain Authority cambió
  | "traffic_spike"    // Tráfico aumentó significativamente
  | "traffic_drop"     // Tráfico cayó significativamente
  | "backlink_surge"   // Aumento de backlinks
  | "ranking_change";  // Cambio en rankings clave

export type AlertSignificance = "low" | "medium" | "high";

export interface WatchAlert {
  id: string;
  competitor: string;
  competitorDomain: string;
  alertType: WatchAlertType;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  detectedAt: Date;
  significance: AlertSignificance;
  description: string;
  isRead: boolean;
}

export interface CompetitorSnapshot {
  domain: string;
  domainAuthority: number;
  organicTraffic: number;
  backlinks: number;
  referringDomains: number;
  snapshotDate: Date;
}

export interface WatchListSummary {
  totalAlerts: number;
  highSignificance: number;
  mediumSignificance: number;
  lowSignificance: number;
  competitorsMonitored: number;
  lastCheck: Date;
  alerts: WatchAlert[];
}
```

---

## Core Implementation

```typescript
// server/modules/competitor-watch.ts

import type { Configuration } from "@shared/schema";
import type { 
  WatchAlert, 
  WatchAlertType,
  AlertSignificance,
  CompetitorSnapshot,
  WatchListSummary 
} from "@shared/types/competitor-watch";
import { storage } from "../storage";

// Thresholds for alerts
const THRESHOLDS = {
  da_change: 5,           // DA change of 5+ points
  traffic_change: 20,     // Traffic change of 20%+
  backlink_surge: 30,     // Backlink increase of 30%+
};

/**
 * Check competitors for changes and generate alerts
 */
export async function checkCompetitorChanges(
  config: Configuration
): Promise<WatchListSummary> {
  const competitors = config.competitors?.competitors || [];
  const alerts: WatchAlert[] = [];

  for (const competitor of competitors) {
    try {
      // Get current metrics
      const currentSnapshot = await getCurrentSnapshot(competitor.domain);
      
      // Get previous snapshot (from storage)
      const previousSnapshot = await storage.getCompetitorSnapshot(
        config.id,
        competitor.domain,
        "watch_metrics",
        7 // Compare to 7 days ago
      );

      if (previousSnapshot) {
        const prev = previousSnapshot.snapshotData as CompetitorSnapshot;
        const newAlerts = detectChanges(competitor, prev, currentSnapshot);
        alerts.push(...newAlerts);
      }

      // Save current snapshot for future comparison
      await storage.saveCompetitorSnapshot(
        config.id,
        competitor.domain,
        "watch_metrics",
        currentSnapshot
      );

    } catch (error) {
      console.error(`Error checking ${competitor.domain}:`, error);
    }
  }

  // Sort by significance
  const sortedAlerts = alerts.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.significance] - order[b.significance];
  });

  return {
    totalAlerts: alerts.length,
    highSignificance: alerts.filter(a => a.significance === "high").length,
    mediumSignificance: alerts.filter(a => a.significance === "medium").length,
    lowSignificance: alerts.filter(a => a.significance === "low").length,
    competitorsMonitored: competitors.length,
    lastCheck: new Date(),
    alerts: sortedAlerts
  };
}

async function getCurrentSnapshot(domain: string): Promise<CompetitorSnapshot> {
  // Use Ahrefs provider (simplified)
  const ahrefsProvider = getProvider("ahrefs");
  
  const stats = await ahrefsProvider.getBacklinkStats(domain);
  const traffic = await ahrefsProvider.getOrganicTraffic(domain);

  return {
    domain,
    domainAuthority: stats.domain_rating || 0,
    organicTraffic: traffic.organicTraffic || 0,
    backlinks: stats.backlinks || 0,
    referringDomains: stats.refdomains || 0,
    snapshotDate: new Date()
  };
}

function detectChanges(
  competitor: { name?: string; domain: string; tier?: string },
  previous: CompetitorSnapshot,
  current: CompetitorSnapshot
): WatchAlert[] {
  const alerts: WatchAlert[] = [];
  const competitorName = competitor.name || competitor.domain;

  // Check DA change
  const daChange = current.domainAuthority - previous.domainAuthority;
  if (Math.abs(daChange) >= THRESHOLDS.da_change) {
    alerts.push(createAlert(
      competitorName,
      competitor.domain,
      "da_change",
      previous.domainAuthority,
      current.domainAuthority,
      daChange > 0 
        ? `Domain Authority increased by ${daChange} points`
        : `Domain Authority decreased by ${Math.abs(daChange)} points`
    ));
  }

  // Check traffic change
  if (previous.organicTraffic > 0) {
    const trafficChangePercent = ((current.organicTraffic - previous.organicTraffic) / previous.organicTraffic) * 100;
    
    if (trafficChangePercent >= THRESHOLDS.traffic_change) {
      alerts.push(createAlert(
        competitorName,
        competitor.domain,
        "traffic_spike",
        previous.organicTraffic,
        current.organicTraffic,
        `Organic traffic increased by ${trafficChangePercent.toFixed(0)}%`
      ));
    } else if (trafficChangePercent <= -THRESHOLDS.traffic_change) {
      alerts.push(createAlert(
        competitorName,
        competitor.domain,
        "traffic_drop",
        previous.organicTraffic,
        current.organicTraffic,
        `Organic traffic decreased by ${Math.abs(trafficChangePercent).toFixed(0)}%`
      ));
    }
  }

  // Check backlink surge
  if (previous.backlinks > 0) {
    const backlinkChangePercent = ((current.backlinks - previous.backlinks) / previous.backlinks) * 100;
    
    if (backlinkChangePercent >= THRESHOLDS.backlink_surge) {
      alerts.push(createAlert(
        competitorName,
        competitor.domain,
        "backlink_surge",
        previous.backlinks,
        current.backlinks,
        `Backlinks increased by ${backlinkChangePercent.toFixed(0)}%`
      ));
    }
  }

  return alerts;
}

function createAlert(
  competitor: string,
  domain: string,
  type: WatchAlertType,
  previousValue: number,
  currentValue: number,
  description: string
): WatchAlert {
  const changePercent = previousValue > 0 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : 100;

  return {
    id: `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    competitor,
    competitorDomain: domain,
    alertType: type,
    previousValue,
    currentValue,
    changePercent,
    detectedAt: new Date(),
    significance: calculateSignificance(type, changePercent),
    description,
    isRead: false
  };
}

function calculateSignificance(type: WatchAlertType, changePercent: number): AlertSignificance {
  const absChange = Math.abs(changePercent);
  
  if (type === "da_change" && absChange >= 10) return "high";
  if (type === "traffic_spike" && absChange >= 50) return "high";
  if (type === "backlink_surge" && absChange >= 50) return "high";
  
  if (absChange >= 30) return "medium";
  
  return "low";
}

/**
 * Get watch list for a configuration
 */
export async function getWatchList(
  configurationId: number,
  userId: string
): Promise<WatchListSummary> {
  const config = await storage.getConfigurationById(configurationId, userId);
  if (!config) throw new Error("Configuration not found");

  return checkCompetitorChanges(config);
}
```

---

## API Routes

```typescript
// server/routes.ts - Agregar

import { getWatchList, checkCompetitorChanges } from "./modules/competitor-watch";

// GET /api/competitor-watch/:configurationId
app.get("/api/competitor-watch/:configurationId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const watchList = await getWatchList(configurationId, userId);
    
    res.json(watchList);
  } catch (error) {
    console.error("Error getting watch list:", error);
    res.status(500).json({ error: "Failed to get watch list" });
  }
});

// POST /api/competitor-watch/:configurationId/refresh
app.post("/api/competitor-watch/:configurationId/refresh", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const config = await storage.getConfigurationById(configurationId, userId);
    
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const watchList = await checkCompetitorChanges(config);
    res.json(watchList);
  } catch (error) {
    console.error("Error refreshing watch list:", error);
    res.status(500).json({ error: "Failed to refresh" });
  }
});
```

---

## UI Component

```tsx
// client/src/components/competitor-watch/WatchListPanel.tsx

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, Link, Activity } from "lucide-react";

interface Props {
  configurationId: number;
}

export function WatchListPanel({ configurationId }: Props) {
  const queryClient = useQueryClient();

  const { data: watchList, isLoading } = useQuery({
    queryKey: ["competitor-watch", configurationId],
    queryFn: async () => {
      const res = await fetch(`/api/competitor-watch/${configurationId}`);
      return res.json();
    }
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/competitor-watch/${configurationId}/refresh`, {
        method: "POST"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitor-watch", configurationId] });
    }
  });

  if (isLoading) return <div>Loading...</div>;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "da_change": return <Activity className="h-4 w-4" />;
      case "traffic_spike": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "traffic_drop": return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "backlink_surge": return <Link className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const significanceColors = {
    high: "bg-red-100 text-red-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-gray-100 text-gray-800"
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Competitor Watch
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">{watchList?.competitorsMonitored || 0}</div>
            <div className="text-xs text-gray-500">Monitored</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{watchList?.highSignificance || 0}</div>
            <div className="text-xs text-gray-500">High</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{watchList?.mediumSignificance || 0}</div>
            <div className="text-xs text-gray-500">Medium</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{watchList?.lowSignificance || 0}</div>
            <div className="text-xs text-gray-500">Low</div>
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-3">
          {watchList?.alerts?.length === 0 && (
            <p className="text-center text-gray-500 py-4">No changes detected</p>
          )}
          
          {watchList?.alerts?.map((alert: any) => (
            <div 
              key={alert.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {getAlertIcon(alert.alertType)}
                <div>
                  <div className="font-medium">{alert.competitor}</div>
                  <div className="text-sm text-gray-600">{alert.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={significanceColors[alert.significance]}>
                  {alert.significance}
                </Badge>
                <span className="text-xs text-gray-400">
                  {new Date(alert.detectedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Testing Checklist

- [ ] Unit tests para detectChanges
- [ ] Unit tests para calculateSignificance
- [ ] Integration tests para API endpoints
- [ ] Mock provider responses
