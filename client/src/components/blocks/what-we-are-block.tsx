import { useFormContext } from "react-hook-form";
import { Building2, Target, MapPin, DollarSign } from "lucide-react";
import { ContextBlock, BlockStatus } from "@/components/context-block";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIGenerateButton } from "@/components/ai-generate-button";
import { useAIGenerate } from "@/hooks/use-ai-generate";
import { useToast } from "@/hooks/use-toast";
import type { InsertConfiguration } from "@shared/schema";

export function WhatWeAreBlock() {
  const form = useFormContext<InsertConfiguration>();
  const { toast } = useToast();
  const { generate, isGenerating } = useAIGenerate();

  const brandName = form.watch("brand.name");
  const industry = form.watch("brand.industry");
  const businessModel = form.watch("brand.business_model");
  const domain = form.watch("brand.domain");
  const primaryGeography = form.watch("brand.primary_geography") || [];
  const revenueBand = form.watch("brand.revenue_band");
  const targetMarket = form.watch("brand.target_market");

  const isComplete = Boolean(brandName && industry && businessModel);
  const status: BlockStatus = isComplete ? "complete" : "incomplete";

  const handleRegenerate = () => {
    generate(
      { 
        section: "brand", 
        context: { name: brandName, industry } 
      },
      {
        onSuccess: () => {
          toast({ title: "Brand context refreshed" });
        },
      }
    );
  };

  return (
    <ContextBlock
      id="what-we-are"
      title="What We Are"
      subtitle="Brand identity and market position"
      icon={<Building2 className="h-5 w-5" />}
      status={status}
      statusLabel={isComplete ? "Complete" : "Needs info"}
      defaultExpanded={true}
      onRegenerate={handleRegenerate}
      isRegenerating={isGenerating}
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="brand.name"
            render={({ field }) => (
              <FormItem>
                <label className="text-xs text-muted-foreground">Brand Name</label>
                <FormControl>
                  <Input 
                    {...field}
                    placeholder="e.g., Acme Corp" 
                    className="font-medium"
                    data-testid="input-brand-name"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brand.domain"
            render={({ field }) => (
              <FormItem>
                <label className="text-xs text-muted-foreground">Domain</label>
                <FormControl>
                  <Input 
                    {...field}
                    placeholder="e.g., acme.com" 
                    data-testid="input-brand-domain"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="brand.industry"
            render={({ field }) => (
              <FormItem>
                <label className="text-xs text-muted-foreground">Industry</label>
                <FormControl>
                  <Input 
                    {...field}
                    placeholder="e.g., SaaS, E-commerce" 
                    data-testid="input-brand-industry"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brand.business_model"
            render={({ field }) => (
              <FormItem>
                <label className="text-xs text-muted-foreground">Business Model</label>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-business-model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B2B">B2B</SelectItem>
                      <SelectItem value="DTC">DTC (Direct to Consumer)</SelectItem>
                      <SelectItem value="Marketplace">Marketplace</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="border-t pt-4 grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="brand.target_market"
            render={({ field }) => (
              <FormItem>
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Target Market
                </label>
                <FormControl>
                  <Input 
                    {...field}
                    placeholder="e.g., US, EU, LATAM" 
                    data-testid="input-target-market"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brand.revenue_band"
            render={({ field }) => (
              <FormItem>
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Revenue Band
                </label>
                <FormControl>
                  <Input 
                    {...field}
                    placeholder="e.g., $10M-$50M" 
                    data-testid="input-revenue-band"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {primaryGeography.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Primary Geography
            </h4>
            <div className="flex flex-wrap gap-2">
              {primaryGeography.map((geo, i) => (
                <Badge key={i} variant="secondary" data-testid={`badge-geo-${i}`}>
                  {geo}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </ContextBlock>
  );
}
