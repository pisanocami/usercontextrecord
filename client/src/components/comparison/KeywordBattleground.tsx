/**
 * KeywordBattleground Component
 * 
 * Visualizes keyword ownership and competition between brands.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Search,
  Shield,
  AlertTriangle,
  TrendingUp,
  Lock,
  Eye,
} from "lucide-react";
import type { Configuration } from "../../../../shared/schema";

interface KeywordBattlegroundProps {
  contexts: Configuration[];
}

interface KeywordData {
  keyword: string;
  owners: string[];  // Which brands have this keyword
  type: "owned" | "contested" | "opportunity";
  searchVolume?: number;
}

function KeywordCard({ keyword, compact = false }: { keyword: KeywordData; compact?: boolean }) {
  const getOwnershipColor = () => {
    if (keyword.type === "owned") {
      return keyword.owners[0] === keyword.owners[0] ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    }
    if (keyword.type === "contested") {
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    }
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  };

  const getIcon = () => {
    if (keyword.type === "owned") {
      return <Shield className="h-4 w-4" />;
    }
    if (keyword.type === "contested") {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <TrendingUp className="h-4 w-4" />;
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center justify-between p-2 rounded border",
        getOwnershipColor()
      )}>
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-sm font-medium truncate">{keyword.keyword}</span>
        </div>
        <div className="flex items-center gap-1">
          {keyword.owners.map((owner, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {owner}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      getOwnershipColor()
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h4 className="font-semibold">{keyword.keyword}</h4>
        </div>
        <div className="flex items-center gap-1">
          {keyword.owners.map((owner, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {owner}
            </Badge>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Status:</span>
          <span className="capitalize">
            {keyword.type === "owned" && "Owned"}
            {keyword.type === "contested" && "Contested"}
            {keyword.type === "opportunity" && "Opportunity"}
          </span>
        </div>
        
        {keyword.type === "contested" && (
          <div className="text-xs text-muted-foreground">
            ⚠️ Multiple brands competing - may increase CPC costs
          </div>
        )}
        
        {keyword.type === "opportunity" && (
          <div className="text-xs text-muted-foreground">
            💡 No brand owns this keyword - expansion opportunity
          </div>
        )}
        
        {keyword.searchVolume && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Search Volume</span>
              <span className="font-medium">{keyword.searchVolume.toLocaleString()}</span>
            </div>
            <Progress value={Math.min(100, keyword.searchVolume / 1000)} className="h-1" />
          </div>
        )}
      </div>
    </div>
  );
}

export function KeywordBattleground({ contexts }: KeywordBattlegroundProps) {
  // Extract keywords from all contexts
  const allKeywords = new Map<string, KeywordData>();
  
  contexts.forEach((ctx) => {
    const brandName = ctx.name || ctx.brand?.domain || "Unknown";
    
    // Brand keywords
    ctx.demand_definition?.brand_keywords?.seed_terms?.forEach(keyword => {
      const key = keyword.toLowerCase().trim();
      if (!allKeywords.has(key)) {
        allKeywords.set(key, {
          keyword,
          owners: [brandName],
          type: "owned",
        });
      } else {
        const existing = allKeywords.get(key)!;
        if (!existing.owners.includes(brandName)) {
          existing.owners.push(brandName);
          existing.type = existing.owners.length > 1 ? "contested" : "owned";
        }
      }
    });
    
    // Category terms
    ctx.demand_definition?.non_brand_keywords?.category_terms?.forEach(keyword => {
      const key = keyword.toLowerCase().trim();
      if (!allKeywords.has(key)) {
        allKeywords.set(key, {
          keyword,
          owners: [brandName],
          type: "owned",
        });
      } else {
        const existing = allKeywords.get(key)!;
        if (!existing.owners.includes(brandName)) {
          existing.owners.push(brandName);
          existing.type = existing.owners.length > 1 ? "contested" : "owned";
        }
      }
    });
  });

  // Convert to array and sort by type and importance
  const keywords = Array.from(allKeywords.values()).sort((a, b) => {
    // Priority: contested > owned > opportunity
    const typeOrder = { contested: 0, owned: 1, opportunity: 2 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return a.keyword.localeCompare(b.keyword);
  });

  const ownedKeywords = keywords.filter(k => k.type === "owned");
  const contestedKeywords = keywords.filter(k => k.type === "contested");
  const opportunityKeywords = keywords.filter(k => k.type === "opportunity");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-5 w-5" />
          Keyword Battleground
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {ownedKeywords.length}
            </div>
            <div className="text-xs text-muted-foreground">Owned Keywords</div>
          </div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {contestedKeywords.length}
            </div>
            <div className="text-xs text-muted-foreground">Contested</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {opportunityKeywords.length}
            </div>
            <div className="text-xs text-muted-foreground">Opportunities</div>
          </div>
        </div>

        {/* Keywords by Type */}
        {contestedKeywords.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Contested Keywords ({contestedKeywords.length})
            </h3>
            <div className="space-y-2">
              {contestedKeywords.slice(0, 5).map((keyword) => (
                <KeywordCard key={keyword.keyword} keyword={keyword} />
              ))}
              {contestedKeywords.length > 5 && (
                <div className="text-center text-sm text-muted-foreground p-2">
                  Showing 5 of {contestedKeywords.length} contested keywords
                </div>
              )}
            </div>
          </div>
        )}

        {opportunityKeywords.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Opportunity Keywords ({opportunityKeywords.length})
            </h3>
            <div className="space-y-2">
              {opportunityKeywords.slice(0, 5).map((keyword) => (
                <KeywordCard key={keyword.keyword} keyword={keyword} />
              ))}
              {opportunityKeywords.length > 5 && (
                <div className="text-center text-sm text-muted-foreground p-2">
                  Showing 5 of {opportunityKeywords.length} opportunities
                </div>
              )}
            </div>
          </div>
        )}

        {/* Strategic Recommendations */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">Strategic Recommendations</h3>
          <div className="text-sm space-y-1">
            {contestedKeywords.length > 0 && (
              <p>• Review {contestedKeywords.length} contested keywords for bidding conflicts</p>
            )}
            {opportunityKeywords.length > 0 && (
              <p>• {opportunityKeywords.length} opportunity keywords available for expansion</p>
            )}
            {ownedKeywords.length > 0 && (
              <p>• {ownedKeywords.length} keywords under brand control</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
