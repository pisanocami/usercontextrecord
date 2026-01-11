// client/src/components/blocks/audit-log-panel.tsx
import { useState } from "react";
import { History, ChevronDown, ChevronRight, Plus, Minus, RefreshCw, X, Filter, Download } from "lucide-react";
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
      <div className="flex items-center justify-between p-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:bg-muted/50 transition-colors flex-1"
        >
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Audit Log</span>
          <Badge variant="secondary" className="text-xs">{auditLog.length}</Badge>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          )}
        </button>
        <Button variant="ghost" size="sm" onClick={handleExport} className="ml-2">
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>

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
