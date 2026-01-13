/**
 * DiffHighlight Component
 * 
 * Color-coded highlighting for comparison values based on match type.
 */

import { cn } from "@/lib/utils";
import type { MatchType } from "@/lib/comparison/types";

interface DiffHighlightProps {
  matchType: MatchType;
  children: React.ReactNode;
  className?: string;
}

const matchTypeStyles: Record<MatchType, string> = {
  full: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
  partial: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
  none: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200",
  unique: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
};

const matchTypeLabels: Record<MatchType, string> = {
  full: "Match",
  partial: "Partial",
  none: "Different",
  unique: "Unique",
};

export function DiffHighlight({ matchType, children, className }: DiffHighlightProps) {
  return (
    <span
      className={cn(
        "px-2 py-1 rounded text-sm",
        matchTypeStyles[matchType],
        className
      )}
    >
      {children}
    </span>
  );
}

export function MatchTypeBadge({ matchType }: { matchType: MatchType }) {
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-xs font-medium",
        matchTypeStyles[matchType]
      )}
    >
      {matchTypeLabels[matchType]}
    </span>
  );
}
