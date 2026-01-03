import { Building2, Globe, Target, TrendingUp, Users, Calendar, Info, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Brand, Governance } from "@shared/schema";

interface HeaderSummaryProps {
  brand: Brand;
  governance: Governance;
  onRunAnalysis?: () => void;
  onAdoptAnalysis?: () => void;
  isRunningAnalysis?: boolean;
  canRunAnalysis?: boolean;
  canAdopt?: boolean;
}

function ConfidenceScore({ score, grade }: { score: number; grade: string }) {
  const getColor = () => {
    if (grade === "high" || score >= 80) return "text-green-600 dark:text-green-400";
    if (grade === "medium" || score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-help">
          <span className={cn("text-lg font-semibold", getColor())}>{score}%</span>
          <span className="text-xs text-muted-foreground capitalize">({grade})</span>
          <Info className="h-3 w-3 text-muted-foreground" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px]">
        <p className="text-xs">
          Quality score based on completeness, competitor confidence, negative scope strength, and evidence coverage.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function MetadataChip({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span>{value}</span>
    </div>
  );
}

export function HeaderSummary({
  brand,
  governance,
  onRunAnalysis,
  onAdoptAnalysis,
  isRunningAnalysis = false,
  canRunAnalysis = false,
  canAdopt = false,
}: HeaderSummaryProps) {
  const qualityScore = governance.quality_score;
  const contextStatus = governance.context_status;

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-card/30" data-testid="header-summary">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate" data-testid="text-brand-name">
                {brand.name || "Untitled Brand"}
              </h1>
              <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 flex-wrap text-xs sm:text-sm">
                <MetadataChip icon={Globe} label="Domain" value={brand.domain} />
                <MetadataChip icon={Target} label="Industry" value={brand.industry} />
                <div className="hidden sm:block"><MetadataChip icon={Users} label="Market" value={brand.target_market} /></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Version:</span>
              <Badge variant="outline" className="text-xs" data-testid="badge-version">
                v{governance.context_version}
              </Badge>
            </div>
            {governance.context_valid_until && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Valid until: {new Date(governance.context_valid_until).toLocaleDateString()}</span>
              </div>
            )}
            {governance.cmo_safe && (
              <Badge variant="outline" className="gap-1 text-green-700 dark:text-green-300 border-green-500/50 bg-green-50 dark:bg-green-900/20">
                <Shield className="h-3 w-3" />
                CMO Safe
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Quality Score</span>
            <ConfidenceScore 
              score={qualityScore?.overall ?? 0} 
              grade={qualityScore?.grade ?? "low"} 
            />
          </div>

          <div className="flex items-center gap-2">
            {contextStatus === "AI_READY" && onRunAnalysis && (
              <Button
                onClick={onRunAnalysis}
                disabled={!canRunAnalysis || isRunningAnalysis}
                size="sm"
                data-testid="button-run-analysis"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {isRunningAnalysis ? "Running..." : "Run Analysis"}
              </Button>
            )}

            {contextStatus === "AI_ANALYSIS_RUN" && onAdoptAnalysis && (
              <Button
                onClick={onAdoptAnalysis}
                disabled={!canAdopt}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-adopt-analysis"
              >
                <Shield className="h-4 w-4 mr-2" />
                Adopt Analysis
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
