/**
 * OverlapMatrix Component
 * 
 * Matrix table showing competitor presence across contexts.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CompetitorPresence } from "@/lib/comparison/types";
import type { Configuration } from "@shared/schema";

interface OverlapMatrixProps {
  competitorMatrix: CompetitorPresence[];
  contexts: Configuration[];
  maxRows?: number;
}

export function OverlapMatrix({ competitorMatrix, contexts, maxRows = 15 }: OverlapMatrixProps) {
  const displayMatrix = competitorMatrix.slice(0, maxRows);
  const hasMore = competitorMatrix.length > maxRows;

  if (displayMatrix.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitor Overlap Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No competitors to compare.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Competitor Overlap Matrix</span>
          <Badge variant="secondary" className="text-xs">
            {competitorMatrix.length} competitors
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                  Competitor
                </th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                  Tier
                </th>
                {contexts.map((ctx) => (
                  <th
                    key={ctx.id}
                    className="text-center py-2 px-3 font-medium text-muted-foreground max-w-[120px] truncate"
                    title={ctx.name || ctx.brand?.domain}
                  >
                    {(ctx.name || ctx.brand?.domain || "").slice(0, 12)}
                    {(ctx.name || ctx.brand?.domain || "").length > 12 ? "..." : ""}
                  </th>
                ))}
                <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {displayMatrix.map((row) => (
                <tr key={row.competitor} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium capitalize">
                    {row.competitor}
                  </td>
                  <td className="py-2 px-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        row.tier === "direct" && "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300",
                        row.tier === "indirect" && "border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300",
                        row.tier === "marketplace" && "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                      )}
                    >
                      {row.tier}
                    </Badge>
                  </td>
                  {contexts.map((ctx) => {
                    const isPresent = row.presentIn.includes(Number(ctx.id));
                    return (
                      <td key={ctx.id} className="text-center py-2 px-3">
                        <span
                          className={cn(
                            "inline-block w-4 h-4 rounded-full",
                            isPresent
                              ? "bg-primary"
                              : "bg-muted border border-border"
                          )}
                          title={isPresent ? "Listed" : "Not listed"}
                        />
                      </td>
                    );
                  })}
                  <td className="text-center py-2 px-3">
                    <Badge variant="secondary" className="text-xs">
                      {row.presentIn.length}/{contexts.length}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Showing {maxRows} of {competitorMatrix.length} competitors
          </p>
        )}
        <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-primary" /> Listed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-muted border border-border" /> Not listed
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
