import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { TagInput } from "@/components/tag-input";
import { AIGenerateButton } from "@/components/ai-generate-button";
import { useAIGenerate } from "@/hooks/use-ai-generate";
import { useToast } from "@/hooks/use-toast";
import { Users, Info, Target, TrendingUp, Store } from "lucide-react";
import type { InsertConfiguration } from "@shared/schema";

export function CompetitiveSetSection() {
  const form = useFormContext<InsertConfiguration>();
  const { toast } = useToast();
  const { generate, isGenerating } = useAIGenerate();

  const handleGenerate = () => {
    const brand = form.getValues("brand");
    generate(
      {
        section: "competitors",
        context: { name: brand.name, industry: brand.industry, business_model: brand.business_model },
      },
      {
        onSuccess: (data) => {
          const suggestions = data.suggestions as Record<string, unknown>;
          if (suggestions.direct) form.setValue("competitors.direct", suggestions.direct as string[], { shouldDirty: true });
          if (suggestions.indirect) form.setValue("competitors.indirect", suggestions.indirect as string[], { shouldDirty: true });
          if (suggestions.marketplaces) form.setValue("competitors.marketplaces", suggestions.marketplaces as string[], { shouldDirty: true });
          toast({
            title: "AI suggestions applied",
            description: "Review and adjust the generated competitors as needed.",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Competitive Set</h2>
            <p className="text-muted-foreground">
              Define who you compare against. Direct vs indirect must be distinguished.
            </p>
          </div>
        </div>
        <AIGenerateButton
          onClick={handleGenerate}
          isGenerating={isGenerating}
          disabled={!form.getValues("brand.name")}
        />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <Target className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Direct Competitors</CardTitle>
                <CardDescription>Brands offering the same core product or service</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="competitors.direct"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add domain (e.g., competitor.com)"
                      testId="tag-direct-competitors"
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Indirect Competitors</CardTitle>
                <CardDescription>Brands solving the same problem differently</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="competitors.indirect"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add domain (e.g., alternative.com)"
                      testId="tag-indirect-competitors"
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Store className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Marketplaces</CardTitle>
                <CardDescription>Platforms where your products may be listed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="competitors.marketplaces"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add marketplace (e.g., amazon.com)"
                      testId="tag-marketplaces"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
        <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Approval Required</p>
          <p className="mt-1 text-amber-700 dark:text-amber-300">
            The model may suggest competitors based on market analysis. However, humans must approve or override all competitor selections before they are used in analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
