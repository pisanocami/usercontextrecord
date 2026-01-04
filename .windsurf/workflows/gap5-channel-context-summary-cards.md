---
description: Fix Gap 5 - Channel Context Summary Cards (Notion-like experience)
---

# Gap 5: Channel Context Summary Cards

## Problem
Honeywell reference shows "Marketplace Dependence" and "SEO Investment" as high-level summary cards in the main view (Notion-like experience). The implementation has the fields but lacks these summary cards.

## Affected Files
- `client/src/components/blocks/channel-context-block.tsx` - Channel context UI
- `client/src/components/notion/header-summary.tsx` - Header summary area

## Current State
- Schema has `paid_media_active`, `seo_investment_level`, `marketplace_dependence`
- UI shows dropdowns and switches but no summary cards
- No visual "at a glance" view of channel strategy

## Implementation Steps

### Step 1: Create ChannelSummaryCards Component
Add summary cards to show channel context at a glance:

```tsx
// client/src/components/blocks/channel-summary-cards.tsx
import { DollarSign, Search, ShoppingBag, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ChannelContext } from "@shared/schema";

interface ChannelSummaryCardsProps {
  channelContext: ChannelContext;
  className?: string;
}

function LevelIndicator({ level }: { level: "low" | "medium" | "high" }) {
  const config = {
    low: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" },
    medium: { icon: Minus, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
    high: { icon: TrendingUp, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
  };
  
  const { icon: Icon, color, bg } = config[level];
  
  return (
    <div className={cn("rounded-full p-1", bg)}>
      <Icon className={cn("h-3 w-3", color)} />
    </div>
  );
}

export function ChannelSummaryCards({ channelContext, className }: ChannelSummaryCardsProps) {
  const cards = [
    {
      id: "paid",
      label: "Paid Media",
      icon: DollarSign,
      value: channelContext.paid_media_active ? "Active" : "Inactive",
      level: channelContext.paid_media_active ? "high" : "low",
      description: channelContext.paid_media_active 
        ? "Running paid campaigns" 
        : "No active paid spend",
    },
    {
      id: "seo",
      label: "SEO Investment",
      icon: Search,
      value: channelContext.seo_investment_level.charAt(0).toUpperCase() + channelContext.seo_investment_level.slice(1),
      level: channelContext.seo_investment_level,
      description: {
        low: "Minimal SEO focus",
        medium: "Moderate SEO efforts",
        high: "Heavy SEO investment",
      }[channelContext.seo_investment_level],
    },
    {
      id: "marketplace",
      label: "Marketplace Dependence",
      icon: ShoppingBag,
      value: channelContext.marketplace_dependence.charAt(0).toUpperCase() + channelContext.marketplace_dependence.slice(1),
      level: channelContext.marketplace_dependence === "high" ? "low" : channelContext.marketplace_dependence === "low" ? "high" : "medium",
      // Note: For marketplace dependence, HIGH dependence is often a risk (inverted color)
      description: {
        low: "Direct sales focus",
        medium: "Mixed channel strategy",
        high: "Heavy marketplace reliance",
      }[channelContext.marketplace_dependence],
    },
  ];

  return (
    <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-muted p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="text-sm font-semibold">{card.value}</p>
                  </div>
                </div>
                <LevelIndicator level={card.level as "low" | "medium" | "high"} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

### Step 2: Add Summary Cards to ChannelContextBlock
Update `channel-context-block.tsx` to show cards at the top:

```tsx
import { ChannelSummaryCards } from "./channel-summary-cards";

// In the component, before the form fields:
<div className="space-y-4">
  {/* Summary Cards */}
  <ChannelSummaryCards 
    channelContext={{
      paid_media_active: paidMediaActive,
      seo_investment_level: seoLevel,
      marketplace_dependence: marketplaceDependence,
    }} 
  />
  
  <Separator />
  
  {/* Existing form fields */}
  <p className="text-sm text-muted-foreground">
    Configure your marketing channel investment levels...
  </p>
  // ... rest of form
</div>
```

### Step 3: Add Mini Summary to Header
In `header-summary.tsx`, add channel context indicators:

```tsx
// Add to the header summary section:
<div className="flex items-center gap-2">
  {channelContext.paid_media_active && (
    <Badge variant="outline" className="text-xs gap-1">
      <DollarSign className="h-3 w-3" />
      Paid Active
    </Badge>
  )}
  <Badge 
    variant="outline" 
    className={cn(
      "text-xs gap-1",
      channelContext.seo_investment_level === "high" && "border-green-500 text-green-600"
    )}
  >
    <Search className="h-3 w-3" />
    SEO: {channelContext.seo_investment_level}
  </Badge>
  {channelContext.marketplace_dependence === "high" && (
    <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-600">
      <ShoppingBag className="h-3 w-3" />
      Marketplace Heavy
    </Badge>
  )}
</div>
```

### Step 4: Create Compact Summary for Collapsed State
Add a one-line summary for when the block is collapsed:

```tsx
// In ChannelContextBlock, update the subtitle prop:
const getSummaryText = () => {
  const parts = [];
  if (paidMediaActive) parts.push("Paid ✓");
  parts.push(`SEO: ${seoLevel}`);
  parts.push(`Marketplace: ${marketplaceDependence}`);
  return parts.join(" • ");
};

<ContextBlock
  subtitle={getSummaryText()}
  // ... other props
>
```

## Required Imports
```tsx
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
```

## Testing
1. Verify summary cards display correctly with all three channels
2. Verify level indicators show correct colors
3. Verify descriptions update based on levels
4. Verify header badges appear for active channels
5. Verify collapsed state shows summary text

## Acceptance Criteria
- [ ] Three summary cards visible (Paid, SEO, Marketplace)
- [ ] Level indicators with color coding
- [ ] Descriptions explain current state
- [ ] Header shows channel badges
- [ ] Collapsed block shows one-line summary
