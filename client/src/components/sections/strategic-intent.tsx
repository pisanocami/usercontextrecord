import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TagInput } from "@/components/tag-input";
import { Target, Info, TrendingUp, ShieldAlert, Goal, Ban } from "lucide-react";
import type { InsertConfiguration } from "@shared/schema";

const RISK_LEVELS = [
  { value: "low", label: "Low", description: "Conservative approach, minimize risk" },
  { value: "medium", label: "Medium", description: "Balanced risk-reward trade-offs" },
  { value: "high", label: "High", description: "Aggressive growth, accept higher risk" },
] as const;

export function StrategicIntentSection() {
  const form = useFormContext<InsertConfiguration>();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Target className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Strategic Intent & Guardrails</h2>
          <p className="text-muted-foreground">
            Define how aggressive or conservative the system should be. This is operator intent, not data.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Growth Strategy</CardTitle>
          <CardDescription>Define your primary growth focus and priorities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="strategic_intent.growth_priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Growth Priority *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Market share expansion, Customer retention, New market entry"
                    data-testid="input-growth-priority"
                  />
                </FormControl>
                <FormDescription>
                  Your primary strategic focus for growth
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strategic_intent.risk_tolerance"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Risk Tolerance *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid gap-3 md:grid-cols-3"
                  >
                    {RISK_LEVELS.map((level) => (
                      <label
                        key={level.value}
                        className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors hover-elevate ${
                          field.value === level.value
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        data-testid={`radio-risk-${level.value}`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={level.value} />
                          <span className="font-medium">{level.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {level.description}
                        </span>
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Goal className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Goals</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="strategic_intent.primary_goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Goal *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Increase organic traffic by 50%"
                      data-testid="input-primary-goal"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="strategic_intent.secondary_goals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Goals</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add secondary goal..."
                      testId="tag-secondary-goals"
                    />
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Avoid</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="strategic_intent.avoid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Things to Avoid</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add constraint (e.g., price wars, aggressive discounting)"
                      testId="tag-avoid"
                    />
                  </FormControl>
                  <FormDescription>
                    Strategic actions or outcomes to explicitly avoid
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950/50">
        <Info className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
        <div className="text-sm text-purple-800 dark:text-purple-200">
          <p className="font-medium">Operator Intent</p>
          <p className="mt-1 text-purple-700 dark:text-purple-300">
            This is operator intent, not data. These settings guide how the system interprets signals and makes recommendations.
          </p>
        </div>
      </div>
    </div>
  );
}
