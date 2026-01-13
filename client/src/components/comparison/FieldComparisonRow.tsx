/**
 * FieldComparisonRow Component
 * 
 * Displays a single field comparison across all contexts.
 */

import { cn } from "@/lib/utils";
import { DiffHighlight, MatchTypeBadge } from "./DiffHighlight";
import type { FieldComparison } from "@/lib/comparison/types";

interface FieldComparisonRowProps {
  field: FieldComparison;
  showMatchBadge?: boolean;
}

function renderValue(value: string, isArray: boolean): React.ReactNode {
  if (value === "-" || !value) {
    return <span className="text-muted-foreground italic">-</span>;
  }

  if (isArray && value.includes(", ")) {
    const items = value.split(", ");
    return (
      <ul className="space-y-0.5">
        {items.slice(0, 5).map((item, i) => (
          <li key={i} className="text-sm flex items-center gap-1">
            <span className="text-primary text-xs">•</span>
            <span className="truncate">{item}</span>
          </li>
        ))}
        {items.length > 5 && (
          <li className="text-xs text-muted-foreground">
            +{items.length - 5} more
          </li>
        )}
      </ul>
    );
  }

  return <span className="text-sm break-words">{value}</span>;
}

export function FieldComparisonRow({ field, showMatchBadge = true }: FieldComparisonRowProps) {
  const columnCount = field.values.length;

  return (
    <div className="border-b border-border/50 last:border-0 py-3">
      <div className="flex items-start gap-4 mb-2">
        <span className="text-sm font-medium text-muted-foreground min-w-[140px] shrink-0">
          {field.fieldName}
        </span>
        {showMatchBadge && (
          <MatchTypeBadge matchType={field.matchType} />
        )}
      </div>
      
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
      >
        {field.values.map((contextValue, idx) => (
          <div
            key={contextValue.contextId}
            className={cn(
              "p-2 rounded-md min-h-[40px]",
              field.matchType === "full" && "bg-green-50 dark:bg-green-900/20",
              field.matchType === "partial" && "bg-yellow-50 dark:bg-yellow-900/20",
              field.matchType === "none" && "bg-red-50 dark:bg-red-900/20",
              field.matchType === "unique" && "bg-blue-50 dark:bg-blue-900/20"
            )}
          >
            {renderValue(contextValue.displayValue, field.isArray)}
          </div>
        ))}
      </div>
    </div>
  );
}
