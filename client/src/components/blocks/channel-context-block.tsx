import { useFormContext } from "react-hook-form";
import { Megaphone, DollarSign, Search, ShoppingBag } from "lucide-react";
import { ContextBlock, BlockStatus } from "@/components/context-block";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InsertConfiguration } from "@shared/schema";

export function ChannelContextBlock() {
  const form = useFormContext<InsertConfiguration>();

  const paidMediaActive = form.watch("channel_context.paid_media_active");
  const seoLevel = form.watch("channel_context.seo_investment_level");
  const marketplaceDependence = form.watch("channel_context.marketplace_dependence");

  const status: BlockStatus = paidMediaActive || seoLevel !== "low" || marketplaceDependence !== "low" 
    ? "complete" 
    : "incomplete";

  const getLevelColor = (level: string) => {
    switch (level) {
      case "high": return "text-green-600 dark:text-green-400";
      case "medium": return "text-amber-600 dark:text-amber-400";
      default: return "text-muted-foreground";
    }
  };

  return (
    <ContextBlock
      id="channel-context"
      title="Channel Context"
      subtitle="Marketing investment levels"
      icon={<Megaphone className="h-5 w-5" />}
      status={status}
      statusLabel={paidMediaActive ? "Paid active" : "Organic focus"}
      defaultExpanded={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure your marketing channel investment levels to help AI understand your strategy context.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Paid Media
            </label>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Active</span>
              <Switch
                checked={paidMediaActive}
                onCheckedChange={(v) => form.setValue("channel_context.paid_media_active", v, { shouldDirty: true })}
                data-testid="switch-paid-media"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4 text-muted-foreground" />
              SEO Investment
            </label>
            <Select
              value={seoLevel}
              onValueChange={(v: "low" | "medium" | "high") => form.setValue("channel_context.seo_investment_level", v, { shouldDirty: true })}
            >
              <SelectTrigger data-testid="select-seo-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              Marketplace Dependence
            </label>
            <Select
              value={marketplaceDependence}
              onValueChange={(v: "low" | "medium" | "high") => form.setValue("channel_context.marketplace_dependence", v, { shouldDirty: true })}
            >
              <SelectTrigger data-testid="select-marketplace-dependence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Current settings:</span>
          <Badge variant={paidMediaActive ? "default" : "secondary"} className="text-xs">
            Paid: {paidMediaActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="secondary" className={cn("text-xs", getLevelColor(seoLevel))}>
            SEO: {seoLevel}
          </Badge>
          <Badge variant="secondary" className={cn("text-xs", getLevelColor(marketplaceDependence))}>
            Marketplace: {marketplaceDependence}
          </Badge>
        </div>
      </div>
    </ContextBlock>
  );
}
