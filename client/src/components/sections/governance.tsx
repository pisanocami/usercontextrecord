import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/tag-input";
import { Badge } from "@/components/ui/badge";
import { Shield, Info, Check, User, Calendar, AlertCircle } from "lucide-react";
import type { InsertConfiguration } from "@shared/schema";

const CONFIDENCE_LEVELS = [
  { value: "high", label: "High", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "low", label: "Low", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

export function GovernanceSection() {
  const form = useFormContext<InsertConfiguration>();
  const cmoSafe = form.watch("governance.cmo_safe");

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12">
          <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Governance, Confidence & Overrides</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Define human control and auditability. The model may suggest. Humans decide. The system remembers.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Model Configuration</CardTitle>
          <CardDescription>Control how model suggestions are handled</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="governance.model_suggested"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Model Suggestions Enabled</FormLabel>
                  <FormDescription>
                    Allow the model to provide suggestions for this configuration
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-model-suggested"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Human Overrides</CardTitle>
          <CardDescription>Explicit overrides that take precedence over model suggestions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="governance.human_overrides.competitors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Competitor Overrides</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add competitor override..."
                    testId="tag-override-competitors"
                  />
                </FormControl>
                <FormDescription>
                  Competitors explicitly added or removed by humans
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="governance.human_overrides.keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Keyword Overrides</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add keyword override..."
                    testId="tag-override-keywords"
                  />
                </FormControl>
                <FormDescription>
                  Keywords explicitly added or removed by humans
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="governance.human_overrides.categories"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Overrides</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add category override..."
                    testId="tag-override-categories"
                  />
                </FormControl>
                <FormDescription>
                  Categories explicitly added or removed by humans
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Context Confidence</CardTitle>
          <CardDescription>How confident are you in this configuration?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="governance.context_confidence.level"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Confidence Level *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid gap-3 md:grid-cols-3"
                  >
                    {CONFIDENCE_LEVELS.map((level) => (
                      <label
                        key={level.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover-elevate ${
                          field.value === level.value
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        data-testid={`radio-confidence-${level.value}`}
                      >
                        <RadioGroupItem value={level.value} />
                        <Badge variant="secondary" className={level.color}>
                          {level.label}
                        </Badge>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="governance.context_confidence.notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confidence Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Add any notes about confidence level or areas of uncertainty..."
                    className="resize-none"
                    rows={3}
                    data-testid="textarea-confidence-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Information</CardTitle>
          <CardDescription>Track when and by whom this configuration was reviewed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="governance.reviewed_by"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reviewed By *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="Reviewer name"
                        className="pl-9"
                        data-testid="input-reviewed-by"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="governance.last_reviewed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Reviewed *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        type="date"
                        className="pl-9"
                        data-testid="input-last-reviewed"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="governance.context_valid_until"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Context Valid Until *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type="date"
                      className="pl-9"
                      data-testid="input-valid-until"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  When this configuration should be reviewed again
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="governance.cmo_safe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-base">CMO Safe</FormLabel>
                    {cmoSafe && (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        Validated
                      </Badge>
                    )}
                  </div>
                  <FormDescription>
                    Mark this configuration as approved and safe for executive reporting
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-cmo-safe"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
        <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">Key Principle</p>
          <p className="mt-1 text-blue-700 dark:text-blue-300">
            The model may suggest. Humans decide. The system remembers. All overrides and approvals are tracked for auditability.
          </p>
        </div>
      </div>
    </div>
  );
}
