/**
 * CompetitiveBattlefieldMap Component
 * 
 * Visualizes the competitive landscape as a battlefield with territories,
 * contested areas, and strategic positioning.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Shield,
  Sword,
  Flag,
  AlertTriangle,
  TrendingUp,
  Target,
} from "lucide-react";
import type { Configuration, CompetitorPresence } from "@/lib/comparison/types";

interface CompetitiveBattlefieldMapProps {
  contexts: Configuration[];
  competitorMatrix: CompetitorPresence[];
}

interface Territory {
  brand: string;
  brandId: number;
  strengths: string[];
  uniqueCompetitors: string[];
  color: string;
}

interface ContestedArea {
  competitors: string[];
  brands: string[];
  type: "shared_competitors" | "category_overlap" | "geography_overlap";
}

function TerritoryCard({ territory }: { territory: Territory }) {
  return (
    <div className={cn(
      "p-4 rounded-lg border-2",
      territory.color === "blue" && "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
      territory.color === "green" && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Flag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h4 className="font-semibold">{territory.brand}</h4>
      </div>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Unique Strengths:</span>
          <div className="mt-1 space-y-1">
            {territory.strengths.slice(0, 3).map((strength, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Sword className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span>{strength}</span>
              </div>
            ))}
          </div>
        </div>
        
        {territory.uniqueCompetitors.length > 0 && (
          <div>
            <span className="font-medium text-muted-foreground">Defended Against:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {territory.uniqueCompetitors.slice(0, 3).map((comp, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {comp}
                </Badge>
              ))}
              {territory.uniqueCompetitors.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{territory.uniqueCompetitors.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContestedAreaCard({ contested }: { contested: ContestedArea }) {
  const getIcon = () => {
    switch (contested.type) {
      case "shared_competitors":
        return <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case "category_overlap":
        return <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case "geography_overlap":
        return <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getTypeLabel = () => {
    switch (contested.type) {
      case "shared_competitors":
        return "Shared Competitors";
      case "category_overlap":
        return "Category Overlap";
      case "geography_overlap":
        return "Geographic Overlap";
      default:
        return "Contested Area";
    }
  };

  return (
    <div className="p-4 rounded-lg border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <div className="flex items-center gap-2 mb-3">
        {getIcon()}
        <h4 className="font-semibold">{getTypeLabel()}</h4>
      </div>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Competitors:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {contested.competitors.map((comp, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {comp}
              </Badge>
            ))}
          </div>
        </div>
        
        <div>
          <span className="font-medium text-muted-foreground">Brands Involved:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {contested.brands.map((brand, idx) => (
              <Badge key={idx} className="text-xs bg-primary/10 text-primary">
                {brand}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompetitiveBattlefieldMap({
  contexts,
  competitorMatrix,
}: CompetitiveBattlefieldMapProps) {
  // Analyze territories and contested areas
  const territories: Territory[] = contexts.map((ctx, idx) => {
    const brandCompetitors = competitorMatrix
      .filter(comp => comp.presentIn.includes(Number(ctx.id)))
      .map(comp => comp.competitor);

    // Find unique competitors (only this brand has)
    const uniqueCompetitors = brandCompetitors.filter(comp => {
      const otherBrandsHaveIt = contexts
        .filter((_, otherIdx) => otherIdx !== idx)
        .some(otherCtx => competitorMatrix
          .filter(c => c.presentIn.includes(Number(otherCtx.id)))
          .some(c => c.competitor === comp)
        );
      return !otherBrandsHaveIt;
    });

    // Extract strengths from strategic intent and other areas
    const strengths: string[] = [];
    if (ctx.strategic_intent?.primary_goal) {
      strengths.push(ctx.strategic_intent.primary_goal);
    }
    if (ctx.strategic_intent?.growth_priority) {
      strengths.push(`Growth: ${ctx.strategic_intent.growth_priority}`);
    }
    if (ctx.channel_context?.paid_media_active) {
      strengths.push("Paid Media Active");
    }

    return {
      brand: ctx.name || ctx.brand?.domain || "Unknown",
      brandId: Number(ctx.id),
      strengths,
      uniqueCompetitors: uniqueCompetitors.map(c => c.competitor),
      color: idx === 0 ? "blue" : "green",
    };
  });

  // Find contested areas (shared competitors)
  const contestedAreas: ContestedArea[] = [];
  const sharedCompetitors = competitorMatrix.filter(comp => comp.presentIn.length === contexts.length);
  
  if (sharedCompetitors.length > 0) {
    contestedAreas.push({
      competitors: sharedCompetitors.map(c => c.competitor),
      brands: contexts.map(c => c.name || c.brand?.domain || "Unknown"),
      type: "shared_competitors",
    });
  }

  // Check for category overlap
  const categories = contexts.map(c => c.category_definition?.primary_category).filter(Boolean);
  const uniqueCategories = new Set(categories);
  if (uniqueCategories.size === 1 && categories.length === contexts.length) {
    contestedAreas.push({
      competitors: [],
      brands: contexts.map(c => c.name || c.brand?.domain || "Unknown"),
      type: "category_overlap",
    });
  }

  // Check for geography overlap
  const geographies = contexts.map(c => c.brand?.primary_geography || []).flat();
  const sharedGeographies = geographies.filter((geo, idx) => 
    geographies.some((g, i) => i !== idx && g === geo)
  );
  if (sharedGeographies.length > 0) {
    contestedAreas.push({
      competitors: [],
      brands: contexts.map(c => c.name || c.brand?.domain || "Unknown"),
      type: "geography_overlap",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Competitive Battlefield Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Territories */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Brand Territories</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {territories.map((territory) => (
                <TerritoryCard key={territory.brandId} territory={territory} />
              ))}
            </div>
          </div>

          {/* Contested Areas */}
          {contestedAreas.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Contested Areas</h3>
              <div className="space-y-3">
                {contestedAreas.map((contested, idx) => (
                  <ContestedAreaCard key={idx} contested={contested} />
                ))}
              </div>
            </div>
          )}

          {/* Strategic Summary */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">Strategic Assessment</h3>
            <div className="text-sm space-y-1">
              {sharedCompetitors.length > 0 && (
                <p>• {sharedCompetitors.length} shared competitors create direct competition</p>
              )}
              {contestedAreas.length > 1 && (
                <p>• Multiple overlap areas suggest complex competitive dynamics</p>
              )}
              {territories.every(t => t.uniqueCompetitors.length > 0) && (
                <p>• Each brand has unique competitive positioning</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
