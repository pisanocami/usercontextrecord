import { cn } from "@/lib/utils";

interface ConfidenceBarProps {
  score: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConfidenceBar({
  score,
  label = 'Confidence',
  showPercentage = true,
  size = 'md',
  className
}: ConfidenceBarProps) {
  const normalizedScore = isNaN(score) ? 0 : Math.max(0, Math.min(1, score));
  const percentage = Math.round(normalizedScore * 100);
  
  const getColor = () => {
    if (normalizedScore >= 0.8) return 'bg-green-500';
    if (normalizedScore >= 0.6) return 'bg-yellow-500';
    if (normalizedScore >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const getStatusLabel = () => {
    if (normalizedScore >= 0.8) return 'High Confidence';
    if (normalizedScore >= 0.6) return 'Moderate Confidence';
    if (normalizedScore >= 0.4) return 'Low Confidence';
    return 'Insufficient Data';
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn("flex items-center gap-3", className)} data-testid="confidence-bar">
      {label && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>
      )}
      <div className={cn(
        "flex-1 bg-muted rounded-full overflow-hidden",
        sizeClasses[size]
      )}>
        <div 
          className={cn("h-full transition-all duration-500 rounded-full", getColor())}
          style={{ width: `${percentage}%` }}
          data-testid="confidence-bar-fill"
        />
      </div>
      {showPercentage && (
        <span className="text-sm font-medium tabular-nums" data-testid="confidence-percentage">
          {percentage}%
        </span>
      )}
      <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid="confidence-status">
        {getStatusLabel()}
      </span>
    </div>
  );
}
