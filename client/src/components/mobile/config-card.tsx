import { Building2, Globe, ChevronRight, FileText, BarChart3, MoreHorizontal, Pencil, Trash2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import type { Configuration, ContextStatus } from "@shared/schema";

interface ConfigCardProps {
  config: Configuration;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const statusConfig: Record<ContextStatus, { label: string; className: string }> = {
  DRAFT_AI: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
  },
  AI_READY: {
    label: "Ready",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  AI_ANALYSIS_RUN: {
    label: "Analyzed",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  HUMAN_CONFIRMED: {
    label: "Confirmed",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  LOCKED: {
    label: "Locked",
    className: "bg-green-600 text-white",
  },
};

export function ConfigCard({ config, onEdit, onDelete }: ConfigCardProps) {
  const status = config.governance?.context_status || "DRAFT_AI";
  const statusInfo = statusConfig[status];
  const qualityScore = config.governance?.quality_score?.overall ?? 0;
  const approvedCompetitors = (config.competitors?.competitors || [])
    .filter((c) => c.status === "approved").length;

  return (
    <Card className="p-4 hover-elevate active-elevate-2" data-testid={`config-card-${config.id}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-medium text-base truncate">{config.brand?.name || config.name}</h3>
            <Badge variant="secondary" className={cn("text-[11px] shrink-0", statusInfo.className)}>
              {statusInfo.label}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            {config.brand?.domain && (
              <span className="flex items-center gap-1.5 truncate">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                {config.brand.domain}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <span className={cn(
              "font-medium",
              qualityScore >= 80 ? "text-green-600 dark:text-green-400" :
              qualityScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
            )}>
              {qualityScore}% quality
            </span>
            <span className="text-muted-foreground">
              {approvedCompetitors} competitors
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" asChild aria-label="View one pager">
            <Link href={`/one-pager/${config.id}`}>
              <FileText className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="View keyword gap analysis">
            <Link href={`/keyword-gap/${config.id}`}>
              <BarChart3 className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex" asChild aria-label="Create content brief">
            <Link href={`/content-brief/${config.id}`}>
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem asChild className="sm:hidden">
                <Link href={`/content-brief/${config.id}`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Content Brief
                </Link>
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(Number(config.id))}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(Number(config.id))}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="ghost" size="icon" asChild aria-label="View details">
            <Link href={`/brand-context?editId=${config.id}&reason=Review`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface ConfigCardListProps {
  configs: Configuration[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function ConfigCardList({ configs, onEdit, onDelete }: ConfigCardListProps) {
  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg mb-1">No configurations yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first brand context to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 mobile-card-list" data-testid="config-card-list">
      {configs.map((config) => (
        <ConfigCard 
          key={config.id} 
          config={config} 
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
