import { CheckCircle2, AlertCircle, Circle, Lock, Shield, Clock, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { SectionApprovals, Governance, ContextStatus } from "@shared/schema";
import { Link } from "wouter";
import { RegenerationTracker } from "@/components/blocks/regeneration-tracker";

interface QualityGate {
  id: string;
  label: string;
  description: string;
  status: "passed" | "failed" | "pending";
}

interface GovernanceRailProps {
  governance: Governance;
  sectionApprovals?: SectionApprovals;
  configurationId?: number;
  qualityGates?: QualityGate[];
  onLockContext?: () => void;
  isLocking?: boolean;
  canLock?: boolean;
}

const sectionLabels: Record<keyof SectionApprovals, string> = {
  brand_identity: "Brand Identity",
  category_definition: "Category Definition",
  competitive_set: "Competitive Set",
  demand_definition: "Demand Definition",
  strategic_intent: "Strategic Intent",
  channel_context: "Channel Context",
  negative_scope: "Negative Scope",
};

function SectionApprovalItem({
  section,
  label,
  status,
}: {
  section: string;
  label: string;
  status: "pending" | "approved" | "rejected" | "ai_generated";
}) {
  const getIcon = () => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "ai_generated":
        return <Circle className="h-4 w-4 text-amber-500 fill-amber-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-center justify-between py-1.5" data-testid={`approval-item-${section}`}>
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground capitalize">{status.replace("_", " ")}</span>
    </div>
  );
}

function QualityGateItem({ gate }: { gate: QualityGate }) {
  const getIcon = () => {
    switch (gate.status) {
      case "passed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-start gap-2 py-1.5" data-testid={`gate-${gate.id}`}>
      <span className="mt-0.5">{getIcon()}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm">{gate.label}</span>
        <p className="text-xs text-muted-foreground">{gate.description}</p>
      </div>
    </div>
  );
}

export function GovernanceRail({
  governance,
  sectionApprovals,
  configurationId,
  qualityGates = [],
  onLockContext,
  isLocking = false,
  canLock = false,
}: GovernanceRailProps) {
  const approvals = sectionApprovals || governance.section_approvals;
  const approvedCount = approvals
    ? Object.values(approvals).filter((a) => a?.status === "approved").length
    : 0;
  const totalSections = 7;
  const approvalProgress = (approvedCount / totalSections) * 100;

  const qualityScore = governance.quality_score;
  const contextStatus = governance.context_status;

  return (
    <div
      className="sticky top-[65px] h-fit space-y-4 overflow-y-auto"
      data-testid="governance-rail"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Governance Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Section Approvals</span>
              <span className="font-medium">{approvedCount}/{totalSections}</span>
            </div>
            <Progress value={approvalProgress} className="h-2" />
          </div>

          <Separator />

          <div className="space-y-1">
            {approvals &&
              Object.entries(approvals).map(([key, approval]) => (
                <SectionApprovalItem
                  key={key}
                  section={key}
                  label={sectionLabels[key as keyof SectionApprovals]}
                  status={approval?.status || "pending"}
                />
              ))}
          </div>

          {onLockContext && (
            <>
              <Separator />
              <Button
                onClick={onLockContext}
                disabled={!canLock || isLocking}
                className="w-full"
                data-testid="button-lock-context"
              >
                <Lock className="h-4 w-4 mr-2" />
                {isLocking ? "Locking..." : "Lock Context"}
              </Button>
              {!canLock && (
                <p className="text-xs text-muted-foreground text-center">
                  Approve all critical sections to lock
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-2xl font-bold",
                qualityScore?.overall >= 80 ? "text-green-600" :
                qualityScore?.overall >= 50 ? "text-amber-600" : "text-red-600"
              )}
            >
              {qualityScore?.overall ?? 0}%
            </span>
            <Badge
              variant="outline"
              className={cn(
                "capitalize",
                qualityScore?.grade === "high" ? "border-green-500/50 text-green-700 dark:text-green-300" :
                qualityScore?.grade === "medium" ? "border-amber-500/50 text-amber-700 dark:text-amber-300" :
                "border-red-500/50 text-red-700 dark:text-red-300"
              )}
            >
              {qualityScore?.grade ?? "low"}
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completeness</span>
              <span>{qualityScore?.completeness ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Competitor Confidence</span>
              <span>{qualityScore?.competitor_confidence ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Negative Strength</span>
              <span>{qualityScore?.negative_strength ?? 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Evidence Coverage</span>
              <span>{qualityScore?.evidence_coverage ?? 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {governance.ai_behavior && (
        <RegenerationTracker aiBehavior={governance.ai_behavior} />
      )}

      {qualityGates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quality Gates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {qualityGates.map((gate) => (
              <QualityGateItem key={gate.id} gate={gate} />
            ))}
          </CardContent>
        </Card>
      )}

      {configurationId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <Link href={`/one-pager/${configurationId}`}>
                <FileText className="h-4 w-4 mr-2" />
                View One Pager
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <Link href={`/keyword-gap/${configurationId}`}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Keyword Gap Analysis
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground space-y-1 px-1">
        {governance.last_reviewed && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Last reviewed: {new Date(governance.last_reviewed).toLocaleDateString()}</span>
          </div>
        )}
        {governance.reviewed_by && (
          <div>By: {governance.reviewed_by}</div>
        )}
      </div>
    </div>
  );
}
