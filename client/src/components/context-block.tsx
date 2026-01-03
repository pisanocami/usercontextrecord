import { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight, RefreshCw, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BlockStatus = "complete" | "incomplete" | "warning" | "critical";

interface ContextBlockProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  status?: BlockStatus;
  statusLabel?: string;
  defaultExpanded?: boolean;
  forceExpanded?: boolean;
  variant?: "default" | "warning" | "critical";
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  children: ReactNode;
}

const statusConfig: Record<BlockStatus, { icon: ReactNode; color: string; bgColor: string }> = {
  complete: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  incomplete: {
    icon: <Circle className="h-3.5 w-3.5" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
  warning: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  critical: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

const variantStyles = {
  default: "border-border",
  warning: "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20",
  critical: "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20",
};

export function ContextBlock({
  id,
  title,
  subtitle,
  icon,
  status = "incomplete",
  statusLabel,
  defaultExpanded = false,
  forceExpanded = false,
  variant = "default",
  onRegenerate,
  isRegenerating = false,
  children,
}: ContextBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || forceExpanded);
  const statusInfo = statusConfig[status];

  const handleToggle = () => {
    if (!forceExpanded) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        variantStyles[variant]
      )}
      data-testid={`context-block-${id}`}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 p-4 cursor-pointer hover-elevate rounded-t-lg",
          !isExpanded && "rounded-b-lg"
        )}
        onClick={handleToggle}
        data-testid={`context-block-header-${id}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            variant === "critical" 
              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              : variant === "warning"
              ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-primary/10 text-primary"
          )}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base">{title}</h3>
              {status && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs gap-1", statusInfo.color, statusInfo.bgColor)}
                >
                  {statusInfo.icon}
                  {statusLabel || status}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRegenerate && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              disabled={isRegenerating}
              data-testid={`context-block-regenerate-${id}`}
            >
              <RefreshCw className={cn("h-4 w-4", isRegenerating && "animate-spin")} />
            </Button>
          )}
          {!forceExpanded && (
            <div className="text-muted-foreground">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0" data-testid={`context-block-content-${id}`}>
          <div className="border-t pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
