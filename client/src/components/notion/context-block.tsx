import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Check, X, Sparkles, History, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { SectionApprovalStatus } from "@shared/schema";

interface ContextBlockProps {
  title: string;
  sectionKey: string;
  status: SectionApprovalStatus;
  chips?: string[];
  children: React.ReactNode;
  onApprove?: () => void;
  onReject?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onViewAudit?: () => void;
  isApproving?: boolean;
  isRegenerating?: boolean;
  defaultOpen?: boolean;
  testId?: string;
}

const statusConfig: Record<SectionApprovalStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-muted text-muted-foreground",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
  ai_generated: {
    label: "AI Generated",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
};

export function ContextBlock({
  title,
  sectionKey,
  status,
  chips = [],
  children,
  onApprove,
  onReject,
  onRegenerate,
  onEdit,
  onViewAudit,
  isApproving = false,
  isRegenerating = false,
  defaultOpen = true,
  testId,
}: ContextBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const statusInfo = statusConfig[status];

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="border-b last:border-b-0"
      data-testid={testId || `block-${sectionKey}`}
    >
      <div className="flex items-center justify-between gap-4 px-6 py-4 hover-elevate">
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
            data-testid={`trigger-${sectionKey}`}
          >
            <span className="text-muted-foreground">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            <h3 className="font-medium text-base">{title}</h3>
            <Badge
              variant="secondary"
              className={cn("text-xs shrink-0", statusInfo.className)}
              data-testid={`badge-status-${sectionKey}`}
            >
              {statusInfo.label}
            </Badge>
          </button>
        </CollapsibleTrigger>

        <div className="flex items-center gap-2 shrink-0">
          {chips.length > 0 && !isOpen && (
            <div className="hidden md:flex items-center gap-1.5 max-w-[200px] overflow-hidden">
              {chips.slice(0, 3).map((chip, idx) => (
                <Badge key={idx} variant="outline" className="text-xs truncate max-w-[80px]">
                  {chip}
                </Badge>
              ))}
              {chips.length > 3 && (
                <span className="text-xs text-muted-foreground">+{chips.length - 3}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1">
            {status !== "approved" && onApprove && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onApprove}
                disabled={isApproving}
                className="h-8 w-8"
                data-testid={`button-approve-${sectionKey}`}
              >
                {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-600" />}
              </Button>
            )}
            {status !== "approved" && onReject && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onReject}
                className="h-8 w-8"
                data-testid={`button-reject-${sectionKey}`}
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  data-testid={`button-more-${sectionKey}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit} data-testid={`menu-edit-${sectionKey}`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Section
                  </DropdownMenuItem>
                )}
                {onRegenerate && (
                  <DropdownMenuItem 
                    onClick={onRegenerate} 
                    disabled={isRegenerating}
                    data-testid={`menu-regenerate-${sectionKey}`}
                  >
                    {isRegenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Regenerate with AI
                  </DropdownMenuItem>
                )}
                {onViewAudit && (
                  <DropdownMenuItem onClick={onViewAudit} data-testid={`menu-audit-${sectionKey}`}>
                    <History className="h-4 w-4 mr-2" />
                    View History
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-6 pb-6 pt-2">
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {chips.map((chip, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {chip}
                </Badge>
              ))}
            </div>
          )}
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
