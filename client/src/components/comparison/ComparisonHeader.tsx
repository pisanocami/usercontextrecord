/**
 * ComparisonHeader Component
 * 
 * Displays context cards in a row at the top of the comparison view.
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Building2, Globe, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import type { Configuration } from "@shared/schema";

interface ComparisonHeaderProps {
  contexts: Configuration[];
  onRemoveContext?: (contextId: number) => void;
}

function getValidationBadge(status: string | undefined) {
  switch (status) {
    case "complete":
      return (
        <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Validated
        </Badge>
      );
    case "needs_review":
      return (
        <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Needs Review
        </Badge>
      );
    case "blocked":
      return (
        <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    default:
      return null;
  }
}

export function ComparisonHeader({ contexts, onRemoveContext }: ComparisonHeaderProps) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${contexts.length}, 1fr)` }}>
      {contexts.map((ctx) => (
        <Card key={ctx.id} className="p-4 relative">
          {onRemoveContext && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => onRemoveContext(Number(ctx.id))}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <h3 className="font-semibold truncate">{ctx.name || ctx.brand?.domain}</h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <Badge variant="secondary" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  {ctx.brand?.domain || "No domain"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {ctx.brand?.industry || "No industry"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ctx.governance?.cmo_safe && (
                  <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    CMO Safe
                  </Badge>
                )}
                {getValidationBadge(ctx.governance?.validation_status)}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
