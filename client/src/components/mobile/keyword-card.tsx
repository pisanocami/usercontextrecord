import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KeywordCardProps {
  keyword: string;
  searchVolume: number;
  brandPosition: number | null;
  bestCompetitorPosition: number | null;
  competitorDomain?: string;
  opportunity: "high" | "medium" | "low";
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export function KeywordCard({
  keyword,
  searchVolume,
  brandPosition,
  bestCompetitorPosition,
  competitorDomain,
  opportunity,
}: KeywordCardProps) {
  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toString();
  };

  const getPositionBadge = (pos: number | null) => {
    if (!pos) return <Badge variant="secondary" className="text-xs">N/R</Badge>;
    if (pos <= 3) return <Badge className="bg-green-600 text-white text-xs">{pos}</Badge>;
    if (pos <= 10) return <Badge className="bg-blue-600 text-white text-xs">{pos}</Badge>;
    if (pos <= 20) return <Badge variant="secondary" className="text-xs">{pos}</Badge>;
    return <Badge variant="outline" className="text-xs">{pos}</Badge>;
  };

  const getTrendIcon = () => {
    if (!brandPosition && bestCompetitorPosition) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    if (brandPosition && bestCompetitorPosition) {
      if (brandPosition < bestCompetitorPosition) {
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      }
      if (brandPosition > bestCompetitorPosition) {
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      }
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="p-4 hover-elevate" data-testid={`keyword-card-${keyword.replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{keyword}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">Vol: {formatVolume(searchVolume)}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                opportunity === "high" && "border-red-500/50 text-red-700 dark:text-red-300",
                opportunity === "medium" && "border-amber-500/50 text-amber-700 dark:text-amber-300",
                opportunity === "low" && "border-green-500/50 text-green-700 dark:text-green-300"
              )}
            >
              {opportunity} priority
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">You:</span>
              {getPositionBadge(brandPosition)}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                {competitorDomain?.split(".")[0] || "Comp"}:
              </span>
              {getPositionBadge(bestCompetitorPosition)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface KeywordCardListProps {
  keywords: Array<{
    keyword: string;
    searchVolume: number;
    brandPosition: number | null;
    competitorPositions: Array<{ domain: string; position: number | null }>;
    opportunity: string;
  }>;
}

export function KeywordCardList({ keywords }: KeywordCardListProps) {
  return (
    <div className="space-y-2 mobile-card-list" data-testid="keyword-card-list">
      {keywords.map((kw, idx) => {
        const bestComp = kw.competitorPositions
          .filter((p) => p.position !== null)
          .sort((a, b) => (a.position || 999) - (b.position || 999))[0];

        return (
          <KeywordCard
            key={idx}
            keyword={kw.keyword}
            searchVolume={kw.searchVolume}
            brandPosition={kw.brandPosition}
            bestCompetitorPosition={bestComp?.position || null}
            competitorDomain={bestComp?.domain}
            opportunity={kw.opportunity as "high" | "medium" | "low"}
          />
        );
      })}
    </div>
  );
}
