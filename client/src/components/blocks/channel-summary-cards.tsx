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
