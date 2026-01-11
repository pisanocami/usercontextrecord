import { useFormContext } from "react-hook-form";
import { Shield, Hash, Clock, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { InsertConfiguration } from "@shared/schema";
import { format } from "date-fns";

interface GovernanceFooterProps {
  updatedAt?: string;
  updatedBy?: string;
}

export function GovernanceFooter({
  updatedAt,
  updatedBy,
}: GovernanceFooterProps) {
  const form = useFormContext<InsertConfiguration>();

  const qualityScore = form.watch("governance.quality_score");
  const aiBehavior = form.watch("governance.ai_behavior");
  const cmoSafe = form.watch("governance.cmo_safe");

  const completeness = qualityScore?.completeness || 0;
  const competitorConfidence = qualityScore?.competitor_confidence || 0;
  const negativeStrength = qualityScore?.negative_strength || 0;
  const evidenceCoverage = qualityScore?.evidence_coverage || 0;
  const overallScore = qualityScore?.overall || 0;
  const grade = qualityScore?.grade || "low";
  const used = aiBehavior?.regeneration_count || 0;
  const max = aiBehavior?.max_regenerations || 5;
  const remaining = max - used;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getGradeColor = (g: string) => {
    if (g === "high") return "text-green-600 dark:text-green-400";
    if (g === "medium") return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div 
      className="rounded-lg border bg-muted/30 p-4 space-y-4"
      data-testid="governance-footer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Governance & Metadata</span>
        </div>
        
        <div className="flex items-center gap-2">
          {cmoSafe ? (
            <Badge variant="default" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              CMO Safe
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Not CMO Safe
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Hash className="h-3.5 w-3.5" />
            <span>Overall Score</span>
          </div>
          <div className={cn("font-medium", getScoreColor(overallScore))}>
            {overallScore}% <span className={cn("text-xs", getGradeColor(grade))}>({grade})</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Last Updated</span>
          </div>
          <div className="text-xs">
            {updatedAt ? format(new Date(updatedAt), "MMM d, yyyy HH:mm") : "Not saved"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="text-xs">Regenerations</span>
            </div>
            <Badge 
              variant={remaining <= 0 ? "destructive" : remaining === 1 ? "outline" : "secondary"}
              className="text-xs"
            >
              {used} / {max}
            </Badge>
          </div>
          <Progress value={(used / max) * 100} className="h-1" />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Auto-approve Threshold</div>
          <div className="text-xs">
            {aiBehavior?.auto_approve_threshold || 80}%
          </div>
        </div>
      </div>

      <div className="border-t pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <span>Quality Breakdown:</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Completeness</span>
            <span className={cn("text-xs font-medium", getScoreColor(completeness))}>{completeness}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Competitor Conf.</span>
            <span className={cn("text-xs font-medium", getScoreColor(competitorConfidence))}>{competitorConfidence}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Negative Strength</span>
            <span className={cn("text-xs font-medium", getScoreColor(negativeStrength))}>{negativeStrength}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Evidence Coverage</span>
            <span className={cn("text-xs font-medium", getScoreColor(evidenceCoverage))}>{evidenceCoverage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
