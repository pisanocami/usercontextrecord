---
description: Fix Gap 4 - Regeneration History UI (tracking display in block UI)
---

# Gap 4: Regeneration History UI

## Problem
"Regenerations 0 / 1" tracking is in the schema/governance but not prominently displayed in the block UI. Users cannot see how many AI regenerations have been used or when they occurred.

## Affected Files
- `client/src/components/blocks/governance-footer.tsx` - Shows regeneration count but minimal
- `client/src/components/notion/governance-rail.tsx` - Side rail governance display
- `client/src/components/context-block.tsx` - Base block component with regenerate button

## Current State
- Schema has `aiBehaviorContractSchema` with `regeneration_count`, `max_regenerations`, `last_regeneration_at`, `regeneration_reason`
- `governance-footer.tsx` shows "Regenerations X / Y" but very small
- No history of regenerations visible
- No warning when approaching max regenerations

## Implementation Steps

### Step 1: Create RegenerationTracker Component
Add a new component to display regeneration status prominently:

```tsx
// client/src/components/blocks/regeneration-tracker.tsx
import { RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { AIBehaviorContract } from "@shared/schema";

interface RegenerationTrackerProps {
  aiBehavior: AIBehaviorContract;
  className?: string;
}

export function RegenerationTracker({ aiBehavior, className }: RegenerationTrackerProps) {
  const used = aiBehavior?.regeneration_count || 0;
  const max = aiBehavior?.max_regenerations || 1;
  const remaining = max - used;
  const percentage = (used / max) * 100;
  const lastRegen = aiBehavior?.last_regeneration_at;
  const reason = aiBehavior?.regeneration_reason;
  
  const isExhausted = remaining <= 0;
  const isWarning = remaining === 1 && max > 1;
  
  return (
    <div className={cn("rounded-lg border p-3 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className={cn(
            "h-4 w-4",
            isExhausted ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground"
          )} />
          <span className="text-sm font-medium">AI Regenerations</span>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isExhausted ? "destructive" : isWarning ? "outline" : "secondary"}
              className={cn(
                "text-xs",
                isWarning && "border-amber-500 text-amber-600"
              )}
            >
              {used} / {max} used
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {isExhausted 
              ? "No regenerations remaining. Manual edits only." 
              : `${remaining} regeneration${remaining !== 1 ? 's' : ''} remaining`
            }
          </TooltipContent>
        </Tooltip>
      </div>
      
      <Progress 
        value={percentage} 
        className={cn(
          "h-1.5",
          isExhausted && "[&>div]:bg-red-500",
          isWarning && "[&>div]:bg-amber-500"
        )} 
      />
      
      {lastRegen && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Last: {format(new Date(lastRegen), "MMM d, yyyy HH:mm")}</span>
        </div>
      )}
      
      {reason && (
        <p className="text-xs text-muted-foreground italic">
          "{reason}"
        </p>
      )}
      
      {isExhausted && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          <span>Regeneration limit reached</span>
        </div>
      )}
    </div>
  );
}
```

### Step 2: Add RegenerationTracker to GovernanceRail
Update `governance-rail.tsx` to include the tracker:

```tsx
// After the Quality Score card, add:
import { RegenerationTracker } from "@/components/blocks/regeneration-tracker";

// In the component:
{governance.ai_behavior && (
  <RegenerationTracker aiBehavior={governance.ai_behavior} />
)}
```

### Step 3: Update ContextBlock to Show Regeneration Warning
In `context-block.tsx`, disable regenerate button when exhausted:

```tsx
// Add prop to ContextBlock
interface ContextBlockProps {
  // ... existing props
  regenerationsRemaining?: number;
}

// In the regenerate button:
<Button
  variant="ghost"
  size="sm"
  onClick={onRegenerate}
  disabled={isRegenerating || regenerationsRemaining === 0}
  className={cn(
    regenerationsRemaining === 0 && "opacity-50 cursor-not-allowed"
  )}
>
  <RefreshCw className={cn("h-4 w-4", isRegenerating && "animate-spin")} />
  {regenerationsRemaining === 0 ? "Limit reached" : "Regenerate"}
</Button>
```

### Step 4: Update GovernanceFooter with Better Visibility
In `governance-footer.tsx`, make regeneration more prominent:

```tsx
// Replace the simple text display with:
<div className="space-y-1">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <RefreshCw className="h-3.5 w-3.5" />
      <span className="text-xs">Regenerations</span>
    </div>
    <Badge 
      variant={remaining <= 0 ? "destructive" : remaining === 1 ? "outline" : "secondary"}
      className="text-xs"
    >
      {used} / {max}
    </Badge>
  </div>
  <Progress value={(used / max) * 100} className="h-1" />
</div>
```

### Step 5: Track Regeneration History (Schema Enhancement)
If needed, extend schema to track history:

```typescript
// In schema.ts, add to aiBehaviorContractSchema:
regeneration_history: z.array(z.object({
  timestamp: z.string(),
  section: z.string(),
  reason: z.string().optional(),
  triggered_by: z.enum(["user", "auto"]).default("user"),
})).default([]),
```

## Testing
1. Verify regeneration count displays in GovernanceRail
2. Verify progress bar shows correct percentage
3. Verify warning state when 1 regeneration remaining
4. Verify exhausted state disables regenerate buttons
5. Verify last regeneration timestamp displays correctly

## Acceptance Criteria
- [ ] Regeneration tracker visible in governance rail
- [ ] Progress bar shows usage visually
- [ ] Warning state at 1 remaining
- [ ] Exhausted state disables regeneration
- [ ] Last regeneration timestamp visible
- [ ] Regenerate buttons respect limit
