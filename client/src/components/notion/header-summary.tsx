import { Building2, Globe, Target, TrendingUp, Users, Calendar, Info, Shield, Megaphone, Clock, DollarSign, Search, ShoppingBag, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Brand, Governance, ChannelContext, StrategicIntent } from "@shared/schema";

interface HeaderSummaryProps {
  brand: Brand;
  governance: Governance;
  channelContext?: ChannelContext;
  strategicIntent?: StrategicIntent;
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

function ChannelSummaryCard({ channel }: { channel?: ChannelContext }) {
  if (!channel) return null;
  
  const getLevelLabel = (level: string): string => {
    const labels: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
    return labels[level] || level;
  };
  
  const getLevelBadge = (level: string) => {
    switch (level) {
      case "high": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      default: return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };
  
  const channelMix = channel.paid_media_active ? "Paid + Organic" : "Organic Only";
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-help" data-testid="summary-channel">
          <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <Badge className={cn("text-xs", channel.paid_media_active ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400")}>
              {channelMix}
            </Badge>
            <Badge className={cn("text-xs", getLevelBadge(channel.seo_investment_level))}>
              SEO {getLevelLabel(channel.seo_investment_level)}
            </Badge>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px]">
        <p className="text-xs font-medium mb-1">Channel Context</p>
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Paid Media: {channel.paid_media_active ? "Active" : "Inactive"}</div>
          <div className="flex items-center gap-1"><Search className="h-3 w-3" /> SEO Investment: {getLevelLabel(channel.seo_investment_level)}</div>
          <div className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" /> Marketplace Dependence: {getLevelLabel(channel.marketplace_dependence)}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function StrategicSummaryCard({ strategic }: { strategic?: StrategicIntent }) {
  if (!strategic) return null;
  
  const getRiskLabel = (risk: string): string => {
    const labels: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
    return labels[risk] || risk;
  };
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "medium": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
      default: return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    }
  };
  
  const getGoalLabel = (goal: string): string => {
    const labels: Record<string, string> = {
      roi: "ROI Focus",
      volume: "Volume Focus",
      authority: "Authority Focus",
      awareness: "Awareness Focus",
      retention: "Retention Focus",
    };
    return labels[goal] || goal;
  };
  
  const getHorizonLabel = (horizon: string): string => {
    const labels: Record<string, string> = {
      short: "Short-term (0-3 months)",
      medium: "Medium-term (3-12 months)",
      long: "Long-term (12+ months)",
    };
    return labels[horizon] || horizon;
  };
  
  const activeConstraints: string[] = [];
  if (strategic.constraint_flags?.budget_constrained) activeConstraints.push("Budget Constrained");
  if (strategic.constraint_flags?.resource_limited) activeConstraints.push("Resource Limited");
  if (strategic.constraint_flags?.regulatory_sensitive) activeConstraints.push("Regulatory Sensitive");
  if (strategic.constraint_flags?.brand_protection_priority) activeConstraints.push("Brand Protection");
  
  const constraintCount = activeConstraints.length;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-help" data-testid="summary-strategic">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <Badge className={cn("text-xs", getRiskColor(strategic.risk_tolerance))}>
              {getRiskLabel(strategic.risk_tolerance)} Risk
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {getGoalLabel(strategic.goal_type).replace(" Focus", "")}
            </Badge>
            {constraintCount > 0 && (
              <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600 gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                <span>{constraintCount}</span>
              </Badge>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[300px]">
        <p className="text-xs font-medium mb-1">Strategic Intent</p>
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><Target className="h-3 w-3" /> Goal: {getGoalLabel(strategic.goal_type)}</div>
          <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Horizon: {getHorizonLabel(strategic.time_horizon)}</div>
          {strategic.primary_goal && <div className="flex items-center gap-1">Primary: {strategic.primary_goal}</div>}
          {constraintCount > 0 && (
            <div className="pt-1 border-t mt-1">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="h-3 w-3" /> Active Constraints ({constraintCount}):
              </div>
              <ul className="list-disc list-inside pl-1 mt-0.5">
                {activeConstraints.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function HeaderSummary({
  brand,
  governance,
  channelContext,
  strategicIntent,
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

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-sm">
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
          
          <div className="flex items-center gap-2 flex-wrap">
            <ChannelSummaryCard channel={channelContext} />
            <StrategicSummaryCard strategic={strategicIntent} />
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
