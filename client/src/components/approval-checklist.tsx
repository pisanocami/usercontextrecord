import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  label: string;
  complete: boolean;
  critical?: boolean;
}

interface ApprovalChecklistProps {
  items: ChecklistItem[];
  confidenceThreshold?: number;
  currentConfidence?: number;
}

export function ApprovalChecklist({ 
  items, 
  confidenceThreshold = 80,
  currentConfidence = 0
}: ApprovalChecklistProps) {
  const completedCount = items.filter(i => i.complete).length;
  const totalCount = items.length;
  const allComplete = completedCount === totalCount;
  const meetsConfidence = currentConfidence >= confidenceThreshold;
  const isReady = allComplete && meetsConfidence;

  return (
    <div 
      className={cn(
        "rounded-lg border p-4",
        isReady 
          ? "border-green-300 bg-green-50/50 dark:border-green-700 dark:bg-green-950/20"
          : "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20"
      )}
      data-testid="approval-checklist"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isReady ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          )}
          <h3 className={cn(
            "font-semibold",
            isReady 
              ? "text-green-800 dark:text-green-200" 
              : "text-amber-800 dark:text-amber-200"
          )}>
            {isReady ? "Ready to Lock" : "Approval Checklist"}
          </h3>
        </div>
        <span className={cn(
          "text-sm font-medium",
          isReady 
            ? "text-green-700 dark:text-green-300" 
            : "text-amber-700 dark:text-amber-300"
        )}>
          {completedCount}/{totalCount} complete
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div 
            key={item.id}
            className={cn(
              "flex items-center gap-2 text-sm",
              item.complete 
                ? "text-green-700 dark:text-green-300" 
                : item.critical
                ? "text-red-700 dark:text-red-300"
                : "text-muted-foreground"
            )}
            data-testid={`checklist-item-${item.id}`}
          >
            {item.complete ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 shrink-0" />
            )}
            <span className={cn(item.complete && "line-through opacity-70")}>
              {item.label}
            </span>
            {item.critical && !item.complete && (
              <span className="text-xs text-red-600 dark:text-red-400">(required)</span>
            )}
          </div>
        ))}
        
        <div 
          className={cn(
            "flex items-center gap-2 text-sm",
            meetsConfidence 
              ? "text-green-700 dark:text-green-300" 
              : "text-muted-foreground"
          )}
          data-testid="checklist-item-confidence"
        >
          {meetsConfidence ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <Circle className="h-4 w-4 shrink-0" />
          )}
          <span className={cn(meetsConfidence && "line-through opacity-70")}>
            Confidence ≥ {confidenceThreshold}%
          </span>
        </div>
      </div>
    </div>
  );
}
