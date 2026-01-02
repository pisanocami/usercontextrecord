import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/tag-input";
import { Ban, Info, Lock, Layers, Tag, Users, ShieldAlert } from "lucide-react";
import type { InsertConfiguration } from "@shared/schema";

export function NegativeScopeSection() {
  const form = useFormContext<InsertConfiguration>();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 sm:h-12 sm:w-12">
          <Ban className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Negative Scope & Exclusions</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Define explicit "NOT THIS" boundaries. If excluded here, it never enters the system.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Excluded Categories</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="negative_scope.excluded_categories"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add category to exclude..."
                      testId="tag-excluded-categories"
                    />
                  </FormControl>
                  <FormDescription>
                    Adjacent but non-core categories
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Excluded Keywords</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="negative_scope.excluded_keywords"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add keyword to exclude..."
                      testId="tag-excluded-keywords"
                    />
                  </FormControl>
                  <FormDescription>
                    Keywords signaling different intent
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Excluded Use Cases</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="negative_scope.excluded_use_cases"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add use case to exclude..."
                      testId="tag-excluded-use-cases"
                    />
                  </FormControl>
                  <FormDescription>
                    Use cases outside your value proposition
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Excluded Competitors</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="negative_scope.excluded_competitors"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add competitor to exclude..."
                      testId="tag-excluded-competitors"
                    />
                  </FormControl>
                  <FormDescription>
                    Brands in adjacent but irrelevant markets
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Enforcement Rules</CardTitle>
          </div>
          <CardDescription>
            Control how strictly exclusions are enforced
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="negative_scope.enforcement_rules.hard_exclusion"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Hard Exclusion</FormLabel>
                  <FormDescription>
                    Excluded items are completely blocked from all analysis
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-hard-exclusion"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="negative_scope.enforcement_rules.allow_model_suggestion"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Allow Model Suggestions</FormLabel>
                  <FormDescription>
                    Allow the model to suggest expanding the negative scope
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-model-suggestion"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="negative_scope.enforcement_rules.require_human_override_for_expansion"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Require Human Override</FormLabel>
                  <FormDescription>
                    Any scope expansion requires human approval
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-human-override"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
        <Info className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <div className="text-sm text-red-800 dark:text-red-200">
          <p className="font-medium">Hard Pre-Filter</p>
          <p className="mt-1 text-red-700 dark:text-red-300">
            Before any analysis - keyword expansion, competitor suggestion, SERP scraping, or trend analysis - excluded items are rejected. If excluded here, it never enters the system.
          </p>
        </div>
      </div>
    </div>
  );
}
