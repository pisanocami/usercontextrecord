import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, CheckCircle2, AlertCircle, AlertTriangle, XCircle } from "lucide-react";

interface FreshnessIndicatorProps {
  status: 'fresh' | 'moderate' | 'stale' | 'expired';
  ageDays?: number;
  warning?: string;
  className?: string;
  showLabel?: boolean;
}

export function FreshnessIndicator({ 
  status, 
  ageDays, 
  warning,
  className,
  showLabel = true
}: FreshnessIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'fresh':
        return { 
          icon: CheckCircle2,
          label: 'Fresh',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          description: 'Data is up to date'
        };
      case 'moderate':
        return { 
          icon: Clock,
          label: 'Recent',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          description: 'Data is relatively recent'
        };
      case 'stale':
        return { 
          icon: AlertTriangle,
          label: 'Stale',
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          description: 'Data may be outdated'
        };
      case 'expired':
      default:
        return { 
          icon: XCircle,
          label: 'Expired',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          description: 'Data needs refresh'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const content = (
    <div 
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        config.bgColor,
        config.color,
        className
      )}
      data-testid="freshness-indicator"
    >
      <Icon className="h-3.5 w-3.5" />
      {showLabel && (
        <span data-testid="freshness-label">{config.label}</span>
      )}
      {ageDays !== undefined && (
        <span className="opacity-75" data-testid="freshness-age">
          ({ageDays}d)
        </span>
      )}
      {warning && (
        <AlertCircle className="h-3 w-3 ml-0.5" />
      )}
    </div>
  );

  if (warning) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{warning}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
