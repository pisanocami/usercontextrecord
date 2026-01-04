import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, Zap, Target, Lock } from "lucide-react";

interface Recommendation {
  id?: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  effort: 'low' | 'medium' | 'high';
  timeline?: string;
  withAccessCta?: string;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  className?: string;
}

export function RecommendationCard({ recommendation, className }: RecommendationCardProps) {
  const getPriorityConfig = () => {
    switch (recommendation.priority) {
      case 'high':
        return { 
          variant: 'destructive' as const,
          label: 'High Priority',
          bgColor: 'bg-red-50 dark:bg-red-900/10',
          borderColor: 'border-red-200 dark:border-red-900/30'
        };
      case 'medium':
        return { 
          variant: 'secondary' as const,
          label: 'Medium Priority',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/10',
          borderColor: 'border-yellow-200 dark:border-yellow-900/30'
        };
      case 'low':
      default:
        return { 
          variant: 'outline' as const,
          label: 'Low Priority',
          bgColor: 'bg-green-50 dark:bg-green-900/10',
          borderColor: 'border-green-200 dark:border-green-900/30'
        };
    }
  };

  const getEffortConfig = () => {
    switch (recommendation.effort) {
      case 'low':
        return { 
          variant: 'outline' as const,
          label: 'Low Effort',
          color: 'text-green-600 dark:text-green-400'
        };
      case 'medium':
        return { 
          variant: 'outline' as const,
          label: 'Medium Effort',
          color: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'high':
      default:
        return { 
          variant: 'outline' as const,
          label: 'High Effort',
          color: 'text-red-600 dark:text-red-400'
        };
    }
  };

  const priorityConfig = getPriorityConfig();
  const effortConfig = getEffortConfig();

  return (
    <Card 
      className={cn("p-4", priorityConfig.bgColor, priorityConfig.borderColor, className)} 
      data-testid={`recommendation-card-${recommendation.id || 'default'}`}
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge variant={priorityConfig.variant} data-testid="recommendation-priority">
          <Target className="h-3 w-3 mr-1" />
          {priorityConfig.label}
        </Badge>
        <Badge variant={effortConfig.variant} className={effortConfig.color} data-testid="recommendation-effort">
          <Zap className="h-3 w-3 mr-1" />
          {effortConfig.label}
        </Badge>
      </div>
      
      <h4 className="font-semibold text-foreground mb-3" data-testid="recommendation-action">
        {recommendation.action}
      </h4>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <span className="text-xs text-muted-foreground block mb-1">Expected Impact</span>
          <p className="text-sm font-medium" data-testid="recommendation-impact">
            {recommendation.estimatedImpact}
          </p>
        </div>
        {recommendation.timeline && (
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Timeline</span>
            <p className="text-sm font-medium flex items-center gap-1" data-testid="recommendation-timeline">
              <Clock className="h-3 w-3" />
              {recommendation.timeline}
            </p>
          </div>
        )}
      </div>
      
      {recommendation.withAccessCta && (
        <div 
          className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-md p-3 mt-3"
          data-testid="recommendation-cta"
        >
          <div className="flex items-center gap-1 mb-1">
            <Lock className="h-3 w-3 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
              With Full Access
            </span>
          </div>
          <p className="text-sm text-purple-800 dark:text-purple-200">
            {recommendation.withAccessCta}
          </p>
        </div>
      )}
    </Card>
  );
}
