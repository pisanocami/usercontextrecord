/**
 * SelectionCounter Component
 * 
 * Visual indicator showing current/max selection count.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SelectionCounterProps {
  selected: number;
  max: number;
  className?: string;
  showLabel?: boolean;
}

export function SelectionCounter({
  selected,
  max,
  className,
  showLabel = true,
}: SelectionCounterProps) {
  const percentage = (selected / max) * 100;
  const isFull = selected >= max;
  const isEmpty = selected === 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Progress bar */}
      <div className="relative w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 rounded-full",
            isFull ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Counter */}
      <span
        className={cn(
          "text-sm font-medium tabular-nums",
          isFull && "text-destructive",
          isEmpty && "text-muted-foreground"
        )}
      >
        {selected}/{max}
      </span>

      {/* Status badge */}
      {showLabel && (
        <>
          {isFull && (
            <Badge variant="destructive" className="text-xs">
              Max
            </Badge>
          )}
          {isEmpty && (
            <Badge variant="outline" className="text-xs">
              Select contexts
            </Badge>
          )}
        </>
      )}
    </div>
  );
}

/**
 * CompactSelectionCounter - Smaller version for tight spaces
 */
export function CompactSelectionCounter({
  selected,
  max,
  className,
}: {
  selected: number;
  max: number;
  className?: string;
}) {
  const isFull = selected >= max;

  return (
    <Badge
      variant={isFull ? "destructive" : "secondary"}
      className={cn("text-xs tabular-nums", className)}
    >
      {selected}/{max}
    </Badge>
  );
}
