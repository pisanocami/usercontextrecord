import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  Play,
  Loader2,
  ChevronRight,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import type { Configuration } from "@shared/schema";

interface ContextReviewPanelProps {
  configuration: Configuration;
  onStatusChange?: () => void;
}

type SectionKey = 
  | "brand_identity" 
  | "category_definition" 
  | "competitive_set" 
  | "demand_definition" 
  | "strategic_intent" 
  | "channel_context" 
  | "negative_scope";

const SECTION_LABELS: Record<SectionKey, string> = {
  brand_identity: "Brand Identity",
  category_definition: "Category Definition",
  competitive_set: "Competitive Set",
  demand_definition: "Demand Definition",
  strategic_intent: "Strategic Intent",
  channel_context: "Channel Context",
  negative_scope: "Negative Scope",
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  needs_revision: AlertTriangle,
  ai_generated: Sparkles,
};

const STATUS_COLORS = {
  pending: "text-muted-foreground",
  approved: "text-green-600 dark:text-green-400",
  rejected: "text-red-600 dark:text-red-400",
  needs_revision: "text-amber-600 dark:text-amber-400",
  ai_generated: "text-blue-600 dark:text-blue-400",
};

const CONTEXT_STATUS_INFO: Record<string, { label: string; color: string; description: string }> = {
  DRAFT_AI: { 
    label: "Draft", 
    color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    description: "AI-generated draft, not ready for analysis"
  },
  AI_READY: { 
    label: "Ready for Analysis", 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    description: "Validation passed, can run AI analysis"
  },
  AI_ANALYSIS_RUN: { 
    label: "Analysis Complete", 
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    description: "Keyword Gap has been run, results are provisional"
  },
  HUMAN_CONFIRMED: { 
    label: "Confirmed", 
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    description: "Human has validated and adopted the analysis"
  },
  LOCKED: { 
    label: "Locked", 
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    description: "Context is locked, no further changes allowed"
  },
};

export function ContextReviewPanel({ configuration, onStatusChange }: ContextReviewPanelProps) {
  const queryClient = useQueryClient();
  const [rejectingSection, setRejectingSection] = useState<SectionKey | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const sectionApprovals = configuration.governance?.section_approvals || {};
  const currentStatus = configuration.governance?.context_status || "DRAFT_AI";

  const sections = Object.keys(SECTION_LABELS) as SectionKey[];
  const approvedCount = sections.filter(
    (s) => sectionApprovals[s]?.status === "approved"
  ).length;
  const progressPercent = (approvedCount / sections.length) * 100;

  const sectionApprovalMutation = useMutation({
    mutationFn: async ({ section, status, rejected_reason }: { section: string; status: string; rejected_reason?: string }) => {
      return apiRequest("PATCH", `/api/configurations/${configuration.id}/section-approval`, {
        section,
        status,
        rejected_reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configurations", configuration.id] });
      onStatusChange?.();
    },
  });

  const statusTransitionMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      return apiRequest("PATCH", `/api/configurations/${configuration.id}/status`, {
        status,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configurations", configuration.id] });
      onStatusChange?.();
    },
  });

  const handleApprove = (section: SectionKey) => {
    sectionApprovalMutation.mutate({ section, status: "approved" });
  };

  const handleReject = (section: SectionKey) => {
    setRejectingSection(section);
    setRejectionReason("");
  };

  const confirmReject = () => {
    if (rejectingSection && rejectionReason.trim().length >= 5) {
      sectionApprovalMutation.mutate({
        section: rejectingSection,
        status: "rejected",
        rejected_reason: rejectionReason.trim(),
      });
      setRejectingSection(null);
      setRejectionReason("");
    }
  };

  const handleStatusTransition = (newStatus: string) => {
    statusTransitionMutation.mutate({ status: newStatus });
  };

  const getNextAction = () => {
    switch (currentStatus) {
      case "DRAFT_AI":
        return { action: "AI_READY", label: "Mark Ready for Analysis", icon: Play };
      case "AI_READY":
        return { action: "AI_ANALYSIS_RUN", label: "Run Analysis", icon: Sparkles };
      case "AI_ANALYSIS_RUN":
        return { action: "HUMAN_CONFIRMED", label: "Confirm & Adopt", icon: User };
      case "HUMAN_CONFIRMED":
        return { action: "LOCKED", label: "Lock Context", icon: Lock };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();
  const canTransition = currentStatus !== "LOCKED";
  const allSectionsApproved = approvedCount === sections.length;

  return (
    <Card data-testid="context-review-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Context Review</CardTitle>
          </div>
          <Badge className={CONTEXT_STATUS_INFO[currentStatus]?.color || ""}>
            {currentStatus === "LOCKED" && <Lock className="h-3 w-3 mr-1" />}
            {CONTEXT_STATUS_INFO[currentStatus]?.label || currentStatus}
          </Badge>
        </div>
        <CardDescription>
          {CONTEXT_STATUS_INFO[currentStatus]?.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Section Approvals</span>
            <span className="font-medium">{approvedCount}/{sections.length}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="space-y-2">
          {sections.map((section) => {
            const approval = sectionApprovals[section] || { status: "pending" };
            const StatusIcon = STATUS_ICONS[approval.status as keyof typeof STATUS_ICONS] || Clock;
            const statusColor = STATUS_COLORS[approval.status as keyof typeof STATUS_COLORS] || "text-muted-foreground";

            return (
              <div
                key={section}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30"
                data-testid={`section-review-${section}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusColor}`} />
                  <span className="text-sm truncate">{SECTION_LABELS[section]}</span>
                </div>
                
                {currentStatus !== "LOCKED" && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {approval.status !== "approved" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleApprove(section)}
                            disabled={sectionApprovalMutation.isPending}
                            data-testid={`button-approve-${section}`}
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Approve section</TooltipContent>
                      </Tooltip>
                    )}
                    {approval.status !== "rejected" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleReject(section)}
                            disabled={sectionApprovalMutation.isPending}
                            data-testid={`button-reject-${section}`}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reject section</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {canTransition && nextAction && (
          <div className="pt-2 border-t">
            <Button
              className="w-full"
              onClick={() => handleStatusTransition(nextAction.action)}
              disabled={
                statusTransitionMutation.isPending ||
                (nextAction.action === "HUMAN_CONFIRMED" && !allSectionsApproved)
              }
              data-testid="button-transition-status"
            >
              {statusTransitionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <nextAction.icon className="h-4 w-4 mr-2" />
              )}
              {nextAction.label}
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
            {nextAction.action === "HUMAN_CONFIRMED" && !allSectionsApproved && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                All sections must be approved before confirming
              </p>
            )}
          </div>
        )}

        {currentStatus === "LOCKED" && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
              <Lock className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This context is locked and ready for production use.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!rejectingSection} onOpenChange={() => setRejectingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Section</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting{" "}
              {rejectingSection && SECTION_LABELS[rejectingSection]}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason (minimum 5 characters)..."
            className="min-h-[100px]"
            data-testid="input-rejection-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingSection(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectionReason.trim().length < 5}
              data-testid="button-confirm-reject"
            >
              Reject Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
