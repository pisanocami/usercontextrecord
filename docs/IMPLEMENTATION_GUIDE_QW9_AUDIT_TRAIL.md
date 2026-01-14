# Implementation Guide: Governance Audit Trail

> **Quick Win #9**  
> **Complejidad**: Baja  
> **Timeline**: 2-3 días  
> **Dependencias**: UCR Governance

---

## Concepto

Historial completo de cambios en el UCR con quién, cuándo, qué cambió, y por qué. Esencial para accountability y aprendizaje.

---

## Types

```typescript
// shared/types/audit-trail.ts

export type AuditAction = "create" | "update" | "delete" | "lock" | "unlock";

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: AuditAction;
  section: UCRSectionID;
  field: string;
  previousValue: any;
  newValue: any;
  reason?: string;
  relatedAnalysisId?: number;
  impact: "low" | "medium" | "high";
}

export interface AuditSummary {
  totalChanges: number;
  changesBySection: Record<UCRSectionID, number>;
  changesByUser: Record<string, number>;
  changesByAction: Record<AuditAction, number>;
  lastModified: Date;
  mostActiveUser: string;
  mostChangedSection: UCRSectionID;
}

export interface AuditTrail {
  entries: AuditEntry[];
  summary: AuditSummary;
  filters: {
    dateRange: { start: Date; end: Date };
    sections: UCRSectionID[];
    users: string[];
    actions: AuditAction[];
  };
}
```

---

## Core Implementation

```typescript
// server/modules/audit-trail.ts

import type { Configuration } from "@shared/schema";
import type { 
  AuditEntry, 
  AuditTrail,
  AuditSummary,
  AuditAction 
} from "@shared/types/audit-trail";

/**
 * Generate audit trail for configuration
 */
export function generateAuditTrail(
  config: Configuration,
  filters?: Partial<AuditTrail['filters']>
): AuditTrail {
  // In production, this would query actual audit logs
  // For now, generate sample data based on configuration versions
  
  const entries = generateSampleEntries(config);
  
  // Apply filters
  const filteredEntries = applyFilters(entries, filters);
  
  // Generate summary
  const summary = generateSummary(filteredEntries);

  return {
    entries: filteredEntries,
    summary,
    filters: {
      dateRange: filters?.dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      },
      sections: filters?.sections || [],
      users: filters?.users || [],
      actions: filters?.actions || []
    }
  };
}

function generateSampleEntries(config: Configuration): AuditEntry[] {
  const entries: AuditEntry[] = [];
  const now = new Date();
  
  // Sample entries based on configuration state
  if (config.brand?.name) {
    entries.push({
      id: `audit_${Date.now()}_1`,
      timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      userId: "user1",
      userName: "John Doe",
      action: "update",
      section: "A",
      field: "name",
      previousValue: "Old Brand Name",
      newValue: config.brand.name,
      reason: "Brand rebranding initiative",
      impact: "high"
    });
  }

  if (config.competitors?.competitors?.length > 0) {
    entries.push({
      id: `audit_${Date.now()}_2`,
      timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      userId: "user2",
      userName: "Jane Smith",
      action: "update",
      section: "C",
      field: "competitors",
      previousValue: [],
      newValue: config.competitors.competitors,
      reason: "Added new competitor after market research",
      impact: "medium"
    });
  }

  if (config.demand_definition?.demand_themes?.length > 0) {
    entries.push({
      id: `audit_${Date.now()}_3`,
      timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      userId: "user1",
      userName: "John Doe",
      action: "update",
      section: "D",
      field: "demand_themes",
      previousValue: [],
      newValue: config.demand_definition.demand_themes,
      reason: "Defined core demand themes for Q1",
      impact: "high"
    });
  }

  // Add creation entry
  entries.push({
    id: `audit_${Date.now()}_0`,
    timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    userId: "user1",
    userName: "John Doe",
    action: "create",
    section: "A",
    field: "configuration",
    previousValue: null,
    newValue: "Initial configuration created",
    reason: "Project kickoff",
    impact: "high"
  });

  return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function applyFilters(
  entries: AuditEntry[],
  filters?: Partial<AuditTrail['filters']>
): AuditEntry[] {
  if (!filters) return entries;

  return entries.filter(entry => {
    // Date filter
    if (filters.dateRange) {
      if (entry.timestamp < filters.dateRange.start || 
          entry.timestamp > filters.dateRange.end) {
        return false;
      }
    }

    // Section filter
    if (filters.sections.length > 0) {
      if (!filters.sections.includes(entry.section)) {
        return false;
      }
    }

    // User filter
    if (filters.users.length > 0) {
      if (!filters.users.includes(entry.userId)) {
        return false;
      }
    }

    // Action filter
    if (filters.actions.length > 0) {
      if (!filters.actions.includes(entry.action)) {
        return false;
      }
    }

    return true;
  });
}

function generateSummary(entries: AuditEntry[]): AuditSummary {
  const changesBySection: Record<UCRSectionID, number> = {
    A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0
  };
  const changesByUser: Record<string, number> = {};
  const changesByAction: Record<AuditAction, number> = {
    create: 0, update: 0, delete: 0, lock: 0, unlock: 0
  };

  for (const entry of entries) {
    changesBySection[entry.section]++;
    changesByUser[entry.userId] = (changesByUser[entry.userId] || 0) + 1;
    changesByAction[entry.action]++;
  }

  const mostActiveUser = Object.entries(changesByUser)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  const mostChangedSection = Object.entries(changesBySection)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as UCRSectionID;

  return {
    totalChanges: entries.length,
    changesBySection,
    changesByUser,
    changesByAction,
    lastModified: entries[0]?.timestamp || new Date(),
    mostActiveUser,
    mostChangedSection
  };
}

/**
 * Log audit entry (would be called when UCR changes)
 */
export function logAuditEntry(
  configurationId: number,
  action: AuditAction,
  section: UCRSectionID,
  field: string,
  previousValue: any,
  newValue: any,
  userId: string,
  userName: string,
  reason?: string
): AuditEntry {
  const entry: AuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    userId,
    userName,
    action,
    section,
    field,
    previousValue,
    newValue,
    reason,
    impact: determineImpact(action, section, field, previousValue, newValue)
  };

  // In production, save to database
  console.log("Audit entry:", entry);

  return entry;
}

function determineImpact(
  action: AuditAction,
  section: UCRSectionID,
  field: string,
  previousValue: any,
  newValue: any
): "low" | "medium" | "high" {
  // High impact changes
  if (action === "create" || action === "delete") return "high";
  if (section === "A" && field === "name") return "high";
  if (section === "E" && field === "goal_type") return "high";
  if (section === "C" && field === "competitors") return "medium";
  if (section === "D" && field === "demand_themes") return "medium";

  return "low";
}
```

---

## API Routes

```typescript
// server/routes.ts - Agregar

import { generateAuditTrail, logAuditEntry } from "./modules/audit-trail";

// GET /api/audit-trail/:configurationId
app.get("/api/audit-trail/:configurationId", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const configurationId = Number(req.params.configurationId);
    const config = await storage.getConfigurationById(configurationId, userId);
    
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const filters = {
      dateRange: req.query.startDate && req.query.endDate ? {
        start: new Date(req.query.startDate as string),
        end: new Date(req.query.endDate as string)
      } : undefined,
      sections: req.query.sections ? (req.query.sections as string).split(",") : [],
      users: req.query.users ? (req.query.users as string).split(",") : [],
      actions: req.query.actions ? (req.query.actions as string).split(",") : []
    };

    const auditTrail = generateAuditTrail(config, filters);
    res.json(auditTrail);
  } catch (error) {
    console.error("Error generating audit trail:", error);
    res.status(500).json({ error: "Failed to generate audit trail" });
  }
});

// POST /api/audit-trail/:configurationId/log
app.post("/api/audit-trail/:configurationId/log", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { action, section, field, previousValue, newValue, reason } = req.body;
    
    const entry = logAuditEntry(
      Number(req.params.configurationId),
      action,
      section,
      field,
      previousValue,
      newValue,
      userId,
      req.user?.name || "Unknown",
      reason
    );

    res.json(entry);
  } catch (error) {
    console.error("Error logging audit entry:", error);
    res.status(500).json({ error: "Failed to log entry" });
  }
});
```

---

## UI Component

```tsx
// client/src/components/audit-trail/AuditTrailViewer.tsx

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, User, Calendar, Filter, FileText, Edit, Trash2, Lock } from "lucide-react";

interface Props {
  configurationId: number;
}

export function AuditTrailViewer({ configurationId }: Props) {
  const [filters, setFilters] = useState({
    sections: "",
    users: "",
    actions: "",
    startDate: "",
    endDate: ""
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-trail", configurationId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.sections) params.append("sections", filters.sections);
      if (filters.users) params.append("users", filters.users);
      if (filters.actions) params.append("actions", filters.actions);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/audit-trail/${configurationId}?${params}`);
      return res.json();
    }
  });

  const actionIcons = {
    create: <FileText className="h-4 w-4 text-green-500" />,
    update: <Edit className="h-4 w-4 text-blue-500" />,
    delete: <Trash2 className="h-4 w-4 text-red-500" />,
    lock: <Lock className="h-4 w-4 text-yellow-500" />,
    unlock: <Lock className="h-4 w-4 text-gray-500" />
  };

  const impactColors = {
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
            <History className="h-5 w-5" />
            Audit Trail Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold">{data?.summary?.totalChanges || 0}</div>
              <div className="text-xs text-gray-500">Total Changes</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold">{data?.summary?.mostActiveUser || "N/A"}</div>
              <div className="text-xs text-gray-500">Most Active</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold">{data?.summary?.mostChangedSection || "N/A"}</div>
              <div className="text-xs text-gray-500">Most Changed</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold">
                {data?.summary?.lastModified ? new Date(data.summary.lastModified).toLocaleDateString() : "N/A"}
              </div>
              <div className="text-xs text-gray-500">Last Modified</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              placeholder="Sections (comma separated)"
              value={filters.sections}
              onChange={(e) => setFilters({...filters, sections: e.target.value})}
            />
            <Input
              placeholder="Users (comma separated)"
              value={filters.users}
              onChange={(e) => setFilters({...filters, users: e.target.value})}
            />
            <Input
              placeholder="Actions (comma separated)"
              value={filters.actions}
              onChange={(e) => setFilters({...filters, actions: e.target.value})}
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              />
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.entries?.map((entry: any) => (
              <div key={entry.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {actionIcons[entry.action]}
                    <span className="font-medium">{entry.action}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-sm">Section {entry.section}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-sm">{entry.field}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={impactColors[entry.impact]}>
                      {entry.impact}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                  <User className="h-3 w-3" />
                  <span>{entry.userName}</span>
                </div>

                <div className="text-sm">
                  {entry.previousValue && (
                    <div className="text-gray-500 line-through">
                      {JSON.stringify(entry.previousValue)}
                    </div>
                  )}
                  {entry.newValue && (
                    <div className="text-green-600">
                      {typeof entry.newValue === 'string' 
                        ? entry.newValue 
                        : JSON.stringify(entry.newValue)}
                    </div>
                  )}
                </div>

                {entry.reason && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <span className="font-medium">Reason:</span> {entry.reason}
                  </div>
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

- [ ] Unit tests para generateSummary
- [ ] Unit tests para applyFilters
- [ ] Unit tests para determineImpact
- [ ] Integration tests para API endpoints
