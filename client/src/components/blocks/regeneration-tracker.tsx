// client/src/components/blocks/regeneration-tracker.tsx
import { RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { AIBehaviorContract } from "@shared/schema";

interface RegenerationTrackerProps {
  aiBehavior: AIBehaviorContract;
  className?: string;
}

export function RegenerationTracker({ aiBehavior, className }: RegenerationTrackerProps) {
  const used = aiBehavior?.regeneration_count || 0;
  const max = aiBehavior?.max_regenerations || 1;
  const remaining = max - used;
  const percentage = (used / max) * 100;
  const lastRegen = aiBehavior?.last_regeneration_at;
  const reason = aiBehavior?.regeneration_reason;

  const isExhausted = remaining <= 0;
  const isWarning = remaining === 1 && max > 1;

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className={cn(
            "h-4 w-4",
            isExhausted ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground"
          )} />
          <span className="text-sm font-medium">AI Regenerations</span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isExhausted ? "destructive" : isWarning ? "outline" : "secondary"}
              className={cn(
                "text-xs",
                isWarning && "border-amber-500 text-amber-600"
              )}
            >
              {used} / {max} used
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {isExhausted
              ? "No regenerations remaining. Manual edits only."
              : `${remaining} regeneration${remaining !== 1 ? 's' : ''} remaining`
            }
          </TooltipContent>
        </Tooltip>
      </div>

      <Progress
        value={percentage}
        className={cn(
          "h-1.5",
          isExhausted && "[&>div]:bg-red-500",
          isWarning && "[&>div]:bg-amber-500"
        )}
      />

      {lastRegen && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Last: {format(new Date(lastRegen), "MMM d, yyyy HH:mm")}</span>
        </div>
      )}

      {reason && (
        <p className="text-xs text-muted-foreground italic">
          "{reason}"
        </p>
      )}

      {isExhausted && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          <span>Regeneration limit reached</span>
        </div>
      )}
    </div>
  );
}
