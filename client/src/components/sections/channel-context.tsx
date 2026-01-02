import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Radio, Info, DollarSign, Search, Store } from "lucide-react";
import type { InsertConfiguration } from "@shared/schema";

const INVESTMENT_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export function ChannelContextSection() {
  const form = useFormContext<InsertConfiguration>();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12">
          <Radio className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Channel Context</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Provide high-level marketing channel reality. Qualitative only, never quantitative.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Paid Media</CardTitle>
              <CardDescription>Status of your paid advertising efforts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="channel_context.paid_media_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Paid Media Active</FormLabel>
                  <FormDescription>
                    Is your brand currently running paid media campaigns?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-paid-media"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">SEO Investment</CardTitle>
              <CardDescription>Current level of SEO investment and focus</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="channel_context.seo_investment_level"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid gap-3 md:grid-cols-3"
                  >
                    {INVESTMENT_LEVELS.map((level) => (
                      <label
                        key={level.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover-elevate ${
                          field.value === level.value
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        data-testid={`radio-seo-${level.value}`}
                      >
                        <RadioGroupItem value={level.value} />
                        <span className="font-medium">{level.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Store className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Marketplace Dependence</CardTitle>
              <CardDescription>How much your business relies on marketplaces</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="channel_context.marketplace_dependence"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid gap-3 md:grid-cols-3"
                  >
                    {INVESTMENT_LEVELS.map((level) => (
                      <label
                        key={level.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover-elevate ${
                          field.value === level.value
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        data-testid={`radio-marketplace-${level.value}`}
                      >
                        <RadioGroupItem value={level.value} />
                        <span className="font-medium">{level.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
        <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Qualitative Only</p>
          <p className="mt-1 text-amber-700 dark:text-amber-300">
            Channel Context is qualitative only - never quantitative. This provides high-level reality without requiring internal data access.
          </p>
        </div>
      </div>
    </div>
  );
}
