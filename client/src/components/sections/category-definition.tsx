import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TagInput } from "@/components/tag-input";
import { Layers, Info, Check, X } from "lucide-react";
import type { InsertConfiguration } from "@shared/schema";

export function CategoryDefinitionSection() {
  const form = useFormContext<InsertConfiguration>();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Layers className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Category Definition</h2>
          <p className="text-muted-foreground">
            Create a semantic fence to define what category you are operating in.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Primary Category</CardTitle>
          <CardDescription>The main market category your brand operates in</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="category_definition.primary_category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Enterprise SaaS, Athletic Footwear, Organic Skincare"
                    data-testid="input-primary-category"
                  />
                </FormControl>
                <FormDescription>
                  Define the primary market category that best describes your product or service
                </FormDescription>
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
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg">Included</CardTitle>
            </div>
            <CardDescription>Products or services within your category scope</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="category_definition.included"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add included type..."
                      testId="tag-included"
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
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-lg">Excluded</CardTitle>
            </div>
            <CardDescription>Explicitly out-of-scope categories</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="category_definition.excluded"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add excluded type..."
                      testId="tag-excluded"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
        <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">Semantic Fence</p>
          <p className="mt-1 text-blue-700 dark:text-blue-300">
            This creates a semantic fence for your category, not just keyword filtering. Items excluded here will never appear in downstream analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
