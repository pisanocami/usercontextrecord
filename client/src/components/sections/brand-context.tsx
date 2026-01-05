import { useFormContext } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagInput } from "@/components/tag-input";
import { AIGenerateButton } from "@/components/ai-generate-button";
import { useAIGenerate } from "@/hooks/use-ai-generate";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, Info, Sparkles, Loader2 } from "lucide-react";
import type { InsertConfiguration } from "@shared/schema";

const BUSINESS_MODELS = ["B2B", "DTC", "Marketplace", "Hybrid"] as const;

const REVENUE_BANDS = [
  "Pre-revenue",
  "$0 - $1M",
  "$1M - $10M",
  "$10M - $50M",
  "$50M - $100M",
  "$100M - $500M",
  "$500M+",
];

const TARGET_MARKETS = [
  "US",
  "UK",
  "EU",
  "APAC",
  "LATAM",
  "Global",
  "North America",
  "EMEA",
  "ANZ",
];

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Retail & E-commerce",
  "Manufacturing",
  "Media & Entertainment",
  "Travel & Hospitality",
  "Education",
  "Real Estate",
  "Professional Services",
  "Consumer Goods",
  "Automotive",
  "Energy",
  "Telecommunications",
  "Other",
];

export function BrandContextSection() {
  const form = useFormContext<InsertConfiguration>();
  const { toast } = useToast();
  const { generate, isGenerating, generateAsync } = useAIGenerate();

  // Fortune 500 brand generation mutation
  const fortune500Mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/generate-fortune500", {});
      return res.json();
    },
    onSuccess: (data) => {
      const brand = data.brand;
      
      // Update brand fields
      form.setValue("brand.name", brand.name, { shouldDirty: true });
      form.setValue("brand.domain", brand.domain, { shouldDirty: true });
      form.setValue("brand.industry", brand.industry, { shouldDirty: true });
      form.setValue("brand.business_model", brand.business_model as "B2B" | "DTC" | "Marketplace" | "Hybrid", { shouldDirty: true });
      form.setValue("brand.primary_geography", brand.primary_geography || [], { shouldDirty: true });
      form.setValue("brand.revenue_band", brand.revenue_band, { shouldDirty: true });
      form.setValue("brand.target_market", brand.target_market, { shouldDirty: true });
      form.setValue("name", brand.name, { shouldDirty: true });

      // Update category definition
      form.setValue("category_definition.primary_category", brand.industry, { shouldDirty: true });
      
      // Update competitors
      if (brand.competitors && Array.isArray(brand.competitors)) {
        const competitorEntries = brand.competitors.map((c: { name: string; domain?: string; tier?: string; revenue_range?: string; why?: string }) => ({
          name: c.name,
          domain: c.domain || "",
          tier: (c.tier as "tier1" | "tier2" | "tier3") || "tier1",
          status: "approved" as const,
          similarity_score: 70,
          serp_overlap: 50,
          size_proximity: 60,
          revenue_range: c.revenue_range || "",
          employee_count: "",
          funding_stage: "public" as const,
          geo_overlap: [],
          evidence: {
            why_selected: c.why || "",
            top_overlap_keywords: [],
            serp_examples: [],
          },
          added_by: "ai" as const,
          added_at: new Date().toISOString(),
          rejected_reason: "",
        }));
        
        form.setValue("competitors.competitors", competitorEntries, { shouldDirty: true });
        form.setValue("competitors.approved_count", competitorEntries.length, { shouldDirty: true });
        form.setValue("competitors.pending_review_count", 0, { shouldDirty: true });
        
        const directCompetitors = competitorEntries.filter((c: { tier: string }) => c.tier === "tier1").map((c: { name: string }) => c.name);
        const indirectCompetitors = competitorEntries.filter((c: { tier: string }) => c.tier !== "tier1").map((c: { name: string }) => c.name);
        form.setValue("competitors.direct", directCompetitors, { shouldDirty: true });
        form.setValue("competitors.indirect", indirectCompetitors, { shouldDirty: true });
      }
      
      // Update demand keywords
      if (brand.demand_keywords) {
        form.setValue("demand_definition.brand_keywords.seed_terms", brand.demand_keywords.seed_terms || [], { shouldDirty: true });
        form.setValue("demand_definition.non_brand_keywords.category_terms", brand.demand_keywords.category_terms || [], { shouldDirty: true });
        form.setValue("demand_definition.non_brand_keywords.problem_terms", brand.demand_keywords.problem_terms || [], { shouldDirty: true });
      }
      
      // Update strategic context
      if (brand.strategic_context) {
        form.setValue("strategic_intent.primary_goal", brand.strategic_context.primary_goal || "", { shouldDirty: true });
        form.setValue("strategic_intent.growth_priority", brand.strategic_context.growth_priority || "", { shouldDirty: true });
        form.setValue("strategic_intent.risk_tolerance", brand.strategic_context.risk_tolerance || "medium", { shouldDirty: true });
      }
      
      // Update channel context
      if (brand.channel_context) {
        form.setValue("channel_context.paid_media_active", brand.channel_context.paid_media_active ?? false, { shouldDirty: true });
        form.setValue("channel_context.seo_investment_level", brand.channel_context.seo_investment_level || "medium", { shouldDirty: true });
        form.setValue("channel_context.marketplace_dependence", brand.channel_context.marketplace_dependence || "low", { shouldDirty: true });
      }
      
      // Update exclusions (negative scope)
      if (brand.exclusions) {
        form.setValue("negative_scope.excluded_categories", brand.exclusions.excluded_categories || [], { shouldDirty: true });
        form.setValue("negative_scope.excluded_keywords", brand.exclusions.excluded_keywords || [], { shouldDirty: true });
        form.setValue("negative_scope.excluded_use_cases", brand.exclusions.excluded_use_cases || [], { shouldDirty: true });
      }

      // Update governance
      form.setValue("governance.model_suggested", true, { shouldDirty: true });
      form.setValue("governance.last_reviewed", new Date().toISOString().split("T")[0], { shouldDirty: true });
      
      toast({
        title: "Fortune 500 brand generated",
        description: `Loaded real data for ${brand.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error generating brand",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateAll = async (brandData: any) => {
    const sections = [
      "category",
      "competitors",
      "demand",
      "strategic",
      "channels",
      "negative",
      "governance",
    ];

    toast({
      title: "Generating full profile",
      description: "AI is crafting all context sections. This will take a moment...",
    });

    for (const section of sections) {
      try {
        const data = await generateAsync({
          section,
          context: {
            name: brandData.name,
            domain: brandData.domain,
            industry: brandData.industry,
            business_model: brandData.business_model,
            revenue_band: brandData.revenue_band,
          },
        });

        const suggestions = data.suggestions as Record<string, any>;
        
        if (section === "category") {
          if (suggestions.primary_category) form.setValue("category_definition.primary_category", suggestions.primary_category, { shouldDirty: true });
          if (suggestions.included) form.setValue("category_definition.included", suggestions.included, { shouldDirty: true });
          if (suggestions.excluded) form.setValue("category_definition.excluded", suggestions.excluded, { shouldDirty: true });
        } else if (section === "competitors") {
          if (suggestions.direct) {
            const directNames = (suggestions.direct as Array<string | { name: string }>).map(
              (item) => typeof item === "string" ? item : item.name
            );
            form.setValue("competitors.direct", directNames, { shouldDirty: true });
          }
          if (suggestions.indirect) {
            const indirectNames = (suggestions.indirect as Array<string | { name: string }>).map(
              (item) => typeof item === "string" ? item : item.name
            );
            form.setValue("competitors.indirect", indirectNames, { shouldDirty: true });
          }
          if (suggestions.marketplaces) {
            const marketplaceNames = (suggestions.marketplaces as Array<string | { name: string }>).map(
              (item) => typeof item === "string" ? item : item.name
            );
            form.setValue("competitors.marketplaces", marketplaceNames, { shouldDirty: true });
          }
        } else if (section === "demand") {
          if (suggestions.brand_keywords?.seed_terms) form.setValue("demand_definition.brand_keywords.seed_terms", suggestions.brand_keywords.seed_terms, { shouldDirty: true });
          if (suggestions.non_brand_keywords?.category_terms) form.setValue("demand_definition.non_brand_keywords.category_terms", suggestions.non_brand_keywords.category_terms, { shouldDirty: true });
          if (suggestions.non_brand_keywords?.problem_terms) form.setValue("demand_definition.non_brand_keywords.problem_terms", suggestions.non_brand_keywords.problem_terms, { shouldDirty: true });
        } else if (section === "strategic") {
          if (suggestions.growth_priority) form.setValue("strategic_intent.growth_priority", suggestions.growth_priority, { shouldDirty: true });
          if (suggestions.risk_tolerance) form.setValue("strategic_intent.risk_tolerance", suggestions.risk_tolerance, { shouldDirty: true });
          if (suggestions.primary_goal) form.setValue("strategic_intent.primary_goal", suggestions.primary_goal, { shouldDirty: true });
          if (suggestions.secondary_goals) form.setValue("strategic_intent.secondary_goals", suggestions.secondary_goals, { shouldDirty: true });
          if (suggestions.avoid) form.setValue("strategic_intent.avoid", suggestions.avoid, { shouldDirty: true });
        } else if (section === "channels") {
          if (suggestions.paid_media_active !== undefined) form.setValue("channel_context.paid_media_active", suggestions.paid_media_active, { shouldDirty: true });
          if (suggestions.seo_investment_level) form.setValue("channel_context.seo_investment_level", suggestions.seo_investment_level, { shouldDirty: true });
          if (suggestions.marketplace_dependence) form.setValue("channel_context.marketplace_dependence", suggestions.marketplace_dependence, { shouldDirty: true });
        } else if (section === "negative") {
          if (suggestions.excluded_categories) form.setValue("negative_scope.excluded_categories", suggestions.excluded_categories, { shouldDirty: true });
          if (suggestions.excluded_keywords) form.setValue("negative_scope.excluded_keywords", suggestions.excluded_keywords, { shouldDirty: true });
          if (suggestions.excluded_use_cases) form.setValue("negative_scope.excluded_use_cases", suggestions.excluded_use_cases, { shouldDirty: true });
          if (suggestions.excluded_competitors) form.setValue("negative_scope.excluded_competitors", suggestions.excluded_competitors, { shouldDirty: true });
        } else if (section === "governance") {
          if (suggestions.context_confidence?.level) form.setValue("governance.context_confidence.level", suggestions.context_confidence.level, { shouldDirty: true });
          if (suggestions.context_confidence?.notes) form.setValue("governance.context_confidence.notes", suggestions.context_confidence.notes, { shouldDirty: true });
          if (suggestions.cmo_safe !== undefined) form.setValue("governance.cmo_safe", suggestions.cmo_safe, { shouldDirty: true });
        }
      } catch (err) {
        console.error(`Error generating section ${section}:`, err);
      }
    }

    toast({
      title: "Profile generation complete",
      description: "All 8 sections have been configured by AI. Please review the tabs.",
    });
  };

  const handleGenerate = () => {
    const brand = form.getValues("brand");
    generate(
      {
        section: "brand",
        context: { name: brand.name, domain: brand.domain },
      },
      {
        onSuccess: (data) => {
          const suggestions = data.suggestions as Record<string, unknown>;
          if (suggestions.industry) form.setValue("brand.industry", suggestions.industry as string, { shouldDirty: true });
          if (suggestions.business_model) form.setValue("brand.business_model", suggestions.business_model as "B2B" | "DTC" | "Marketplace" | "Hybrid", { shouldDirty: true });
          if (suggestions.primary_geography) form.setValue("brand.primary_geography", suggestions.primary_geography as string[], { shouldDirty: true });
          if (suggestions.revenue_band) form.setValue("brand.revenue_band", suggestions.revenue_band as string, { shouldDirty: true });
          
          toast({
            title: "Brand context generated",
            description: "Initiating full profile generation based on this context...",
          });

          handleGenerateAll({
            ...brand,
            ...suggestions
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Brand Context</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Define your brand identity and market positioning to inform confidence thresholds and seasonality interpretation.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => fortune500Mutation.mutate()}
            disabled={fortune500Mutation.isPending}
            data-testid="button-generate-fortune500"
          >
            {fortune500Mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Fortune 500
          </Button>
          <AIGenerateButton
            onClick={handleGenerate}
            isGenerating={isGenerating}
            disabled={!form.getValues("brand.name") && !form.getValues("brand.domain")}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company Information</CardTitle>
          <CardDescription>Enter your domain manually or generate a Fortune 500 brand for testing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="brand.domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="acme.com"
                      data-testid="input-brand-domain"
                    />
                  </FormControl>
                  <FormDescription>Required - Your brand's website domain</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Acme Corporation (auto-generated from domain)"
                      data-testid="input-brand-name"
                    />
                  </FormControl>
                  <FormDescription>Optional - AI can infer from domain</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="brand.industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-brand-industry">
                        <SelectValue placeholder="Select industry (AI will suggest)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Optional - AI can infer from domain</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand.business_model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Model</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-business-model">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BUSINESS_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Optional - Default is B2B</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="brand.revenue_band"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue Band</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-revenue-band">
                        <SelectValue placeholder="Select revenue range (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REVENUE_BANDS.map((band) => (
                        <SelectItem key={band} value={band}>
                          {band}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Optional - Helps with competitor sizing</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand.target_market"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Market</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-target-market">
                        <SelectValue placeholder="Select target market" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TARGET_MARKETS.map((market) => (
                        <SelectItem key={market} value={market}>
                          {market}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Primary geographic market for fail-closed validation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="brand.primary_geography"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Geography</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add region (e.g., North America, EMEA)"
                    testId="tag-geography"
                  />
                </FormControl>
                <FormDescription>
                  Optional - Enter the primary regions where your brand operates
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
            Brand context informs confidence thresholds, shapes seasonality interpretation, and prevents one-size-fits-all logic in downstream analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
