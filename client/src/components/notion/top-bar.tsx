import { ArrowLeft, Clock, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { ContextStatus } from "@shared/schema";

interface TopBarProps {
  brandName: string;
  contextStatus: ContextStatus;
  lastSaved?: Date | null;
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  onBack?: () => void;
  isEditMode?: boolean;
  editReason?: string | null;
}

const statusConfig: Record<ContextStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  DRAFT_AI: {
    label: "Draft",
    variant: "secondary",
    className: "bg-muted text-muted-foreground",
  },
  AI_READY: {
    label: "Ready for Analysis",
    variant: "outline",
    className: "border-amber-500/50 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20",
  },
  AI_ANALYSIS_RUN: {
    label: "Analysis Complete",
    variant: "outline",
    className: "border-blue-500/50 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20",
  },
  HUMAN_CONFIRMED: {
    label: "Confirmed",
    variant: "outline",
    className: "border-green-500/50 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20",
  },
  LOCKED: {
    label: "Locked",
    variant: "default",
    className: "bg-green-600 text-white dark:bg-green-700",
  },
};

export function TopBar({
  brandName,
  contextStatus,
  lastSaved,
  isDirty = false,
  isSaving = false,
  onSave,
  onBack,
  isEditMode = false,
  editReason,
}: TopBarProps) {
  const status = statusConfig[contextStatus];

  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-6 py-3"
      data-testid="notion-top-bar"
    >
      <div className="flex items-center gap-4 min-w-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Contexts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate max-w-[200px]">
                {brandName || "Untitled Context"}
              </BreadcrumbPage>
            </BreadcrumbItem>
            {isEditMode && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-muted-foreground">
                    Editing
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <Badge
          variant={status.variant}
          className={cn("shrink-0", status.className)}
          data-testid="badge-context-status"
        >
          {status.label}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        {lastSaved && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span data-testid="text-last-saved">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          </span>
        )}

        {isDirty && !isSaving && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Unsaved changes
          </span>
        )}

        {onSave && (
          <Button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            size="sm"
            data-testid="button-save"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
