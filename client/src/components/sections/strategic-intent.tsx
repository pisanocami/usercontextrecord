import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/tag-input";
import { Target, Info, TrendingUp, ShieldAlert, Goal, Ban, Clock, DollarSign, Users, Scale, Lock } from "lucide-react";
import type { InsertConfiguration } from "@shared/schema";

const RISK_LEVELS = [
  { value: "low", label: "Low", description: "Conservative approach, minimize risk" },
  { value: "medium", label: "Medium", description: "Balanced risk-reward trade-offs" },
  { value: "high", label: "High", description: "Aggressive growth, accept higher risk" },
] as const;

const GOAL_TYPES = [
  { value: "roi", label: "ROI Focus", icon: DollarSign, description: "Maximize return on investment" },
  { value: "volume", label: "Volume Focus", icon: TrendingUp, description: "Maximize reach and traffic" },
  { value: "authority", label: "Authority Focus", icon: Scale, description: "Build domain authority and trust" },
  { value: "awareness", label: "Awareness Focus", icon: Users, description: "Increase brand visibility" },
  { value: "retention", label: "Retention Focus", icon: Lock, description: "Maximize customer retention" },
] as const;

const TIME_HORIZONS = [
  { value: "short", label: "Short (0-3 months)", description: "Quick wins and immediate impact" },
  { value: "medium", label: "Medium (3-12 months)", description: "Balanced planning horizon" },
  { value: "long", label: "Long (12+ months)", description: "Long-term strategic investments" },
] as const;

export function StrategicIntentSection() {
  const form = useFormContext<InsertConfiguration>();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12">
          <Target className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Strategic Intent & Guardrails</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Goal Type & Time Horizon</CardTitle>
          </div>
          <CardDescription>Define what you're optimizing for and when you expect results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="strategic_intent.goal_type"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Primary Goal Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {GOAL_TYPES.map((goal) => {
                      const Icon = goal.icon;
                      return (
                        <label
                          key={goal.value}
                          className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors hover-elevate ${
                            field.value === goal.value
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                          data-testid={`radio-goal-${goal.value}`}
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={goal.value} />
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{goal.label}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {goal.description}
                          </span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strategic_intent.time_horizon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time Horizon</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-time-horizon">
                      <SelectValue placeholder="Select time horizon" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIME_HORIZONS.map((horizon) => (
                      <SelectItem key={horizon.value} value={horizon.value}>
                        {horizon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  How far ahead are you planning for this context?
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Constraint Flags</CardTitle>
          </div>
          <CardDescription>Operational constraints that affect strategy execution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="strategic_intent.constraint_flags.budget_constrained"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Budget Constrained</FormLabel>
                  <FormDescription>
                    Limited budget requires prioritizing high-ROI activities
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-budget-constrained"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strategic_intent.constraint_flags.resource_limited"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Resource Limited</FormLabel>
                  <FormDescription>
                    Limited team capacity affects execution speed
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-resource-limited"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strategic_intent.constraint_flags.regulatory_sensitive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Regulatory Sensitive</FormLabel>
                  <FormDescription>
                    Industry requires careful compliance considerations
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-regulatory-sensitive"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="strategic_intent.constraint_flags.brand_protection_priority"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Brand Protection Priority</FormLabel>
                  <FormDescription>
                    Brand safety takes precedence over aggressive growth
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-brand-protection"
                  />
                </FormControl>
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
