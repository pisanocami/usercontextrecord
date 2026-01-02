import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { TagInput } from "@/components/tag-input";
import { Search, Info, Tag, HelpCircle } from "lucide-react";
import type { InsertConfiguration } from "@shared/schema";

export function DemandDefinitionSection() {
  const form = useFormContext<InsertConfiguration>();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Search className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Demand Definition</h2>
          <p className="text-muted-foreground">
            Define what demand you care about. This anchors brand vs non-brand logic.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Brand Keywords</CardTitle>
              <CardDescription>Keywords directly associated with your brand</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="demand_definition.brand_keywords.seed_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seed Terms</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add brand term (e.g., brand name, product names)"
                    testId="tag-brand-seeds"
                  />
                </FormControl>
                <FormDescription>
                  Core brand terms used to identify branded searches
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="demand_definition.brand_keywords.top_n"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Top N Keywords</FormLabel>
                  <span className="text-sm font-medium tabular-nums">{field.value}</span>
                </div>
                <FormControl>
                  <Slider
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    min={5}
                    max={100}
                    step={5}
                    className="py-2"
                    data-testid="slider-brand-top-n"
                  />
                </FormControl>
                <FormDescription>
                  Number of top brand keywords to track
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <HelpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Non-Brand Keywords</CardTitle>
              <CardDescription>Category and problem-related search terms</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="demand_definition.non_brand_keywords.category_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Terms</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add category term (e.g., product type, service category)"
                    testId="tag-category-terms"
                  />
                </FormControl>
                <FormDescription>
                  Generic terms for your product category
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="demand_definition.non_brand_keywords.problem_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Problem Terms</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add problem term (e.g., pain points, needs)"
                    testId="tag-problem-terms"
                  />
                </FormControl>
                <FormDescription>
                  Terms describing problems your product solves
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="demand_definition.non_brand_keywords.top_n"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Top N Keywords</FormLabel>
                  <span className="text-sm font-medium tabular-nums">{field.value}</span>
                </div>
                <FormControl>
                  <Slider
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    min={10}
                    max={200}
                    step={10}
                    className="py-2"
                    data-testid="slider-nonbrand-top-n"
                  />
                </FormControl>
                <FormDescription>
                  Number of top non-brand keywords to track
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
        <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">Why this matters</p>
          <p className="mt-1 text-blue-700 dark:text-blue-300">
            Demand definition anchors brand vs non-brand logic, prevents keyword noise, and governs SEO, demand, and cannibalization modules.
          </p>
        </div>
      </div>
    </div>
  );
}
