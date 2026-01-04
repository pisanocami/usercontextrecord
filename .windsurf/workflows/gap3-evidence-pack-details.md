---
description: Fix Gap 3 - Evidence Pack Details (SERP%, Size% granular data points)
---

# Gap 3: Evidence Pack Details - Granular Data Points

## Problem
While the schema has Evidence Coverage, the actual Competitor blocks show limited evidence beyond a "Reason" text. Honeywell reference shows deeper stats like "SERP 50%" and "Size 60%" as individual data points with visual indicators.

## Affected Files
- `client/src/components/blocks/competitor-set-block.tsx` - CompetitorRow component
- `shared/schema.ts` - competitorEvidenceSchema

## Current State
- Schema has `competitorEvidenceSchema` with `why_selected`, `top_overlap_keywords`, `serp_examples`
- UI shows ScoreBar for similarity, serp_overlap, size_proximity
- Missing: granular evidence breakdown, SERP examples as clickable links, evidence strength indicator

## Implementation Steps

### Step 1: Create EvidencePackCard Component
Add a new component to display detailed evidence:

```tsx
function EvidencePackCard({ 
  competitor 
}: { 
  competitor: CompetitorEntry 
}) {
  const evidence = competitor.evidence;
  const hasEvidence = evidence?.why_selected || 
    (evidence?.top_overlap_keywords?.length > 0) || 
    (evidence?.serp_examples?.length > 0);
  
  if (!hasEvidence) {
    return (
      <div className="rounded-md border border-dashed border-amber-300 dark:border-amber-700 p-3 bg-amber-50/50 dark:bg-amber-950/20">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs font-medium">No evidence collected</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Run AI analysis to gather SERP overlap and competitive evidence.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Evidence Pack</span>
        <Badge variant="outline" className="text-xs">
          {getEvidenceStrength(competitor)}% strength
        </Badge>
      </div>
      
      {/* Granular Score Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded bg-background">
          <div className="text-lg font-bold text-blue-600">{competitor.serp_overlap}%</div>
          <div className="text-[10px] text-muted-foreground">SERP Overlap</div>
        </div>
        <div className="text-center p-2 rounded bg-background">
          <div className="text-lg font-bold text-green-600">{competitor.size_proximity}%</div>
          <div className="text-[10px] text-muted-foreground">Size Match</div>
        </div>
        <div className="text-center p-2 rounded bg-background">
          <div className="text-lg font-bold text-purple-600">{competitor.similarity_score}%</div>
          <div className="text-[10px] text-muted-foreground">Similarity</div>
        </div>
      </div>
      
      {/* Why Selected */}
      {evidence.why_selected && (
        <div>
          <span className="text-xs font-medium">Reason</span>
          <p className="text-xs text-muted-foreground mt-0.5">{evidence.why_selected}</p>
        </div>
      )}
      
      {/* SERP Examples as Links */}
      {evidence.serp_examples?.length > 0 && (
        <div>
          <span className="text-xs font-medium">SERP Examples</span>
          <div className="flex flex-col gap-1 mt-1">
            {evidence.serp_examples.slice(0, 3).map((url, i) => (
              <a 
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {new URL(url).hostname}
              </a>
            ))}
          </div>
        </div>
      )}
      
      {/* Overlap Keywords */}
      {evidence.top_overlap_keywords?.length > 0 && (
        <div>
          <span className="text-xs font-medium">Keyword Overlap ({evidence.top_overlap_keywords.length})</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {evidence.top_overlap_keywords.slice(0, 8).map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{kw}</Badge>
            ))}
            {evidence.top_overlap_keywords.length > 8 && (
              <Badge variant="outline" className="text-[10px]">
                +{evidence.top_overlap_keywords.length - 8} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getEvidenceStrength(competitor: CompetitorEntry): number {
  let score = 0;
  const evidence = competitor.evidence;
  
  if (evidence?.why_selected) score += 25;
  if (evidence?.top_overlap_keywords?.length > 0) score += 25;
  if (evidence?.serp_examples?.length > 0) score += 25;
  if (competitor.serp_overlap > 0) score += 25;
  
  return score;
}
```

### Step 2: Update CompetitorRow to Use EvidencePackCard
Replace the simple evidence display in the expanded section:

```tsx
{isExpanded && (
  <div className="mt-3 pl-6 space-y-3">
    {/* Keep the score bars for quick view */}
    <div className="grid grid-cols-3 gap-3">
      <ScoreBar score={competitor.similarity_score} label="Similarity" />
      <ScoreBar score={competitor.serp_overlap} label="SERP" />
      <ScoreBar score={competitor.size_proximity} label="Size" />
    </div>
    
    {/* Company Info */}
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {competitor.domain && (
        <span className="flex items-center gap-1">
          <Globe className="h-3 w-3" /> {competitor.domain}
        </span>
      )}
      {competitor.revenue_range && (
        <span className="flex items-center gap-1">
          <Building2 className="h-3 w-3" /> {competitor.revenue_range}
        </span>
      )}
      {competitor.employee_count && (
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {competitor.employee_count}
        </span>
      )}
    </div>
    
    {/* NEW: Evidence Pack Card */}
    <EvidencePackCard competitor={competitor} />
  </div>
)}
```

### Step 3: Add Evidence Strength to Competitor Header
Show evidence strength indicator in the collapsed row:

```tsx
// In CompetitorRow, after the status badges:
{competitor.status === "approved" && (
  <Badge 
    variant="outline" 
    className={cn(
      "text-xs",
      getEvidenceStrength(competitor) >= 75 ? "text-green-600 border-green-300" :
      getEvidenceStrength(competitor) >= 50 ? "text-amber-600 border-amber-300" :
      "text-red-600 border-red-300"
    )}
  >
    {getEvidenceStrength(competitor)}% evidence
  </Badge>
)}
```

### Step 4: Add Required Imports

```tsx
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
```

## Testing
1. Expand a competitor with full evidence data
2. Verify granular score cards display (SERP%, Size%, Similarity%)
3. Verify SERP examples show as clickable links
4. Verify evidence strength badge appears on approved competitors
5. Verify "No evidence" state displays correctly

## Acceptance Criteria
- [ ] Granular score breakdown visible (SERP%, Size%, Similarity% as cards)
- [ ] SERP examples displayed as clickable external links
- [ ] Evidence strength percentage calculated and displayed
- [ ] "No evidence" warning state for competitors lacking data
- [ ] Keyword overlap shows count and expandable list
