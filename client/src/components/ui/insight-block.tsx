import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, Eye, Info } from "lucide-react";

interface Insight {
  id?: string;
  title: string;
  content: string;
  dataPoint: string;
  source: string;
  whyItMatters: string;
  severity?: 'high' | 'medium' | 'low';
  category?: 'opportunity' | 'risk' | 'observation';
}

interface InsightBlockProps {
  insight: Insight;
  className?: string;
}

export function InsightBlock({ insight, className }: InsightBlockProps) {
  const getSeverityConfig = () => {
    switch (insight.severity) {
      case 'high':
        return { 
          variant: 'destructive' as const, 
          label: 'High',
          icon: AlertTriangle
        };
      case 'medium':
        return { 
          variant: 'secondary' as const, 
          label: 'Medium',
          icon: Info
        };
      case 'low':
      default:
        return { 
          variant: 'outline' as const, 
          label: 'Low',
          icon: Info
        };
    }
  };

  const getCategoryConfig = () => {
    switch (insight.category) {
      case 'opportunity':
        return { 
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          icon: TrendingUp,
          label: 'Opportunity'
        };
      case 'risk':
        return { 
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          icon: AlertTriangle,
          label: 'Risk'
        };
      case 'observation':
      default:
        return { 
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          icon: Eye,
          label: 'Observation'
        };
    }
  };

  const severityConfig = getSeverityConfig();
  const categoryConfig = getCategoryConfig();
  const SeverityIcon = severityConfig.icon;
  const CategoryIcon = categoryConfig.icon;

  return (
    <Card className={cn("p-4", className)} data-testid={`insight-block-${insight.id || 'default'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CategoryIcon className={cn("h-4 w-4", categoryConfig.color)} />
          <h4 className="font-semibold text-foreground" data-testid="insight-title">
            {insight.title}
          </h4>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={severityConfig.variant} className="text-xs">
            <SeverityIcon className="h-3 w-3 mr-1" />
            {severityConfig.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {categoryConfig.label}
          </Badge>
        </div>
      </div>
      
      <p className="text-muted-foreground mb-4" data-testid="insight-content">
        {insight.content}
      </p>
      
      <div className={cn("rounded-md p-3 mb-4", categoryConfig.bgColor)} data-testid="insight-data-point">
        <span className={cn("text-xs font-medium uppercase tracking-wide", categoryConfig.color)}>
          Data Point
        </span>
        <p className="text-sm font-mono mt-1">
          {insight.dataPoint}
        </p>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="secondary" className="text-xs" data-testid="insight-source">
          {insight.source}
        </Badge>
      </div>
      
      <div className="border-l-2 border-purple-500 pl-3" data-testid="insight-why-it-matters">
        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
          Why It Matters
        </span>
        <p className="text-sm text-muted-foreground mt-1">
          {insight.whyItMatters}
        </p>
      </div>
    </Card>
  );
}
