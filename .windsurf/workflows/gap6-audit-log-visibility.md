---
description: Fix Gap 6 - Audit Log Visibility (exclusion history for users)
---

# Gap 6: Audit Log Visibility

## Problem
The Negative Scope schema has an `audit_log`, but it's not rendered for the user to see history of applied vs overridden exclusions. Users cannot track when exclusions were added, removed, or overridden.

## Affected Files
- `client/src/components/blocks/fence-block.tsx` - Fence/Negative Scope UI
- `shared/schema.ts` - Has `exclusionAuditEntrySchema` and `audit_log` array

## Current State
- Schema has `exclusionAuditEntrySchema` with `timestamp`, `action`, `exclusion_value`, `exclusion_type`, `context`, `user_id`
- Schema has `audit_log: z.array(exclusionAuditEntrySchema).default([])`
- UI does NOT display audit log anywhere
- No way to see history of exclusion changes

## Implementation Steps

### Step 1: Create AuditLogPanel Component

```tsx
// client/src/components/blocks/audit-log-panel.tsx
import { useState } from "react";
import { History, ChevronDown, ChevronRight, Plus, Minus, RefreshCw, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ExclusionAuditEntry } from "@shared/schema";

interface AuditLogPanelProps {
  auditLog: ExclusionAuditEntry[];
  className?: string;
}

const ACTION_CONFIG = {
  applied: { 
    icon: Plus, 
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    label: "Applied"
  },
  overridden: { 
    icon: RefreshCw, 
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    label: "Overridden"
  },
  expired: { 
    icon: History, 
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Expired"
  },
  removed: { 
    icon: X, 
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
    label: "Removed"
  },
};

const TYPE_LABELS = {
  category: "Category",
  keyword: "Keyword",
  use_case: "Use Case",
  competitor: "Competitor",
};

function AuditLogEntry({ entry }: { entry: ExclusionAuditEntry }) {
  const config = ACTION_CONFIG[entry.action];
  const Icon = config.icon;
  
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <div className={cn("rounded-full p-1.5 mt-0.5", config.bg)}>
        <Icon className={cn("h-3 w-3", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{entry.exclusion_value}</span>
          <Badge variant="outline" className="text-[10px]">
            {TYPE_LABELS[entry.exclusion_type]}
          </Badge>
          <Badge variant="secondary" className={cn("text-[10px]", config.color)}>
            {config.label}
          </Badge>
        </div>
        {entry.context && (
          <p className="text-xs text-muted-foreground mt-0.5">{entry.context}</p>
        )}
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
          <span>{format(new Date(entry.timestamp), "MMM d, yyyy HH:mm")}</span>
          {entry.user_id && <span>by {entry.user_id}</span>}
        </div>
      </div>
    </div>
  );
}

export function AuditLogPanel({ auditLog, className }: AuditLogPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  
  const filteredLog = auditLog.filter(entry => {
    if (filterType !== "all" && entry.exclusion_type !== filterType) return false;
    if (filterAction !== "all" && entry.action !== filterAction) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (auditLog.length === 0) {
    return (
      <div className={cn("rounded-lg border border-dashed p-4 text-center", className)}>
        <History className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No audit history yet</p>
        <p className="text-xs text-muted-foreground">Changes to exclusions will be logged here</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border", className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Audit Log</span>
          <Badge variant="secondary" className="text-xs">{auditLog.length}</Badge>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="border-t">
          {/* Filters */}
          <div className="flex items-center gap-2 p-2 bg-muted/30">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="keyword">Keyword</SelectItem>
                <SelectItem value="use_case">Use Case</SelectItem>
                <SelectItem value="competitor">Competitor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="overridden">Overridden</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="removed">Removed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredLog.length} entries
            </span>
          </div>
          
          {/* Log Entries */}
          <ScrollArea className="h-64">
            <div className="p-3">
              {filteredLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No entries match filters
                </p>
              ) : (
                filteredLog.map((entry, i) => (
                  <AuditLogEntry key={`${entry.timestamp}-${i}`} entry={entry} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
```

### Step 2: Add AuditLogPanel to FenceBlock
Update `fence-block.tsx` to include the audit log:

```tsx
import { AuditLogPanel } from "./audit-log-panel";

// In FenceBlock component, add watch for audit_log:
const auditLog = form.watch("negative_scope.audit_log") || [];

// At the end of the ContextBlock content, add:
<div className="border-t pt-4 mt-4">
  <AuditLogPanel auditLog={auditLog} />
</div>
```

### Step 3: Create Helper to Add Audit Entries
Add a utility function to create audit entries:

```tsx
// client/src/lib/audit-utils.ts
import type { ExclusionAuditEntry } from "@shared/schema";

export function createAuditEntry(
  action: "applied" | "overridden" | "expired" | "removed",
  exclusionValue: string,
  exclusionType: "category" | "keyword" | "use_case" | "competitor",
  context?: string,
  userId?: string
): ExclusionAuditEntry {
  return {
    timestamp: new Date().toISOString(),
    action,
    exclusion_value: exclusionValue,
    exclusion_type: exclusionType,
    context: context || "",
    user_id: userId || "",
  };
}
```

### Step 4: Update ExclusionSection to Log Changes
Modify the add/remove handlers to create audit entries:

```tsx
// In ExclusionSection component:
import { createAuditEntry } from "@/lib/audit-utils";

const handleAdd = () => {
  if (!newValue.trim()) return;
  
  const newEntry: ExclusionEntry = {
    value: newValue.trim(),
    match_type: "exact",
    semantic_sensitivity: "medium",
    added_by: "human",
    added_at: new Date().toISOString(),
    reason: "",
  };
  
  append(newEntry);
  
  // Add audit entry
  const currentAuditLog = form.getValues("negative_scope.audit_log") || [];
  const auditEntry = createAuditEntry(
    "applied",
    newValue.trim(),
    getExclusionType(enhancedFieldName), // helper to map field to type
    "Manually added by user"
  );
  form.setValue("negative_scope.audit_log", [...currentAuditLog, auditEntry], { shouldDirty: true });
  
  setNewValue("");
};

const handleRemove = (entry: ExclusionEntry, index: number) => {
  remove(index);
  
  // Add audit entry
  const currentAuditLog = form.getValues("negative_scope.audit_log") || [];
  const auditEntry = createAuditEntry(
    "removed",
    entry.value,
    getExclusionType(enhancedFieldName),
    "Removed by user"
  );
  form.setValue("negative_scope.audit_log", [...currentAuditLog, auditEntry], { shouldDirty: true });
};

function getExclusionType(fieldName: string): "category" | "keyword" | "use_case" | "competitor" {
  if (fieldName.includes("category")) return "category";
  if (fieldName.includes("keyword")) return "keyword";
  if (fieldName.includes("use_case")) return "use_case";
  return "competitor";
}
```

### Step 5: Add Export Audit Log Feature (Optional)

```tsx
// In AuditLogPanel, add export button:
const handleExport = () => {
  const csv = [
    "Timestamp,Action,Value,Type,Context,User",
    ...auditLog.map(e => 
      `"${e.timestamp}","${e.action}","${e.exclusion_value}","${e.exclusion_type}","${e.context}","${e.user_id}"`
    )
  ].join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
};

// Add button in header:
<Button variant="ghost" size="sm" onClick={handleExport}>
  <Download className="h-3 w-3 mr-1" />
  Export
</Button>
```

## Required Imports
```tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
```

## Testing
1. Add an exclusion and verify audit entry created
2. Remove an exclusion and verify audit entry created
3. Verify audit log panel expands/collapses
4. Verify filters work correctly
5. Verify entries sorted by timestamp (newest first)
6. Verify export generates valid CSV

## Acceptance Criteria
- [ ] Audit log panel visible in Fence block
- [ ] Entries show action, value, type, timestamp
- [ ] Filters by type and action work
- [ ] Adding exclusions creates "applied" entry
- [ ] Removing exclusions creates "removed" entry
- [ ] Empty state shows helpful message
- [ ] Export to CSV works (optional)
