import { Lock, Unlock, AlertCircle, CheckCircle2, Globe, Building2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ContextStatus = "draft" | "needs_review" | "locked";

interface ContextHeaderProps {
  brandName: string;
  domain: string;
  status: ContextStatus;
  confidenceScore: number;
  confidenceNotes?: string;
  canLock: boolean;
  onLock: () => void;
  onUnlock: () => void;
  isLocking?: boolean;
}

const statusConfig: Record<ContextStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  draft: {
    label: "Draft",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  needs_review: {
    label: "Needs Review",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  locked: {
    label: "Locked",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: <Lock className="h-3 w-3" />,
  },
};

function ConfidenceIndicator({ score, notes }: { score: number; notes?: string }) {
  const getColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getLabel = (score: number) => {
    if (score >= 80) return "High";
    if (score >= 50) return "Medium";
    return "Low";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-help">
          <div className={cn("flex items-center gap-1", getColor(score))}>
            <span className="text-sm font-medium">{score}%</span>
            <span className="text-xs">({getLabel(score)} Confidence)</span>
          </div>
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[300px]">
        <div className="space-y-1">
          <p className="font-medium">AI Confidence Score</p>
          <p className="text-xs text-muted-foreground">
            {notes || "Based on completeness of brand context, competitor validation, and negative scope coverage."}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function ContextHeader({
  brandName,
  domain,
  status,
  confidenceScore,
  confidenceNotes,
  canLock,
  onLock,
  onUnlock,
  isLocking = false,
}: ContextHeaderProps) {
  const statusInfo = statusConfig[status];

  return (
    <div 
      className="sticky top-0 z-20 flex flex-col gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6"
      data-testid="context-header"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold truncate" data-testid="text-brand-name">
              {brandName || "Untitled Brand"}
            </h1>
            <Badge 
              variant="outline" 
              className={cn("gap-1 text-xs", statusInfo.color, statusInfo.bgColor)}
              data-testid="badge-context-status"
            >
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {domain && (
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                {domain}
              </span>
            )}
            <ConfidenceIndicator score={confidenceScore} notes={confidenceNotes} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {status === "locked" ? (
          <Button
            variant="outline"
            onClick={onUnlock}
            disabled={isLocking}
            data-testid="button-unlock-context"
          >
            <Unlock className="h-4 w-4 mr-2" />
            Unlock Context
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={onLock}
                  disabled={!canLock || isLocking}
                  data-testid="button-lock-context"
                >
                  {isLocking ? (
                    <>
                      <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      Locking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve & Lock
                    </>
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            {!canLock && (
              <TooltipContent side="bottom">
                <p>Complete the checklist to lock this context</p>
              </TooltipContent>
            )}
          </Tooltip>
        )}
      </div>
    </div>
  );
}
