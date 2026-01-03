import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save, Clock, AlertCircle, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useSearch } from "wouter";

import { ContextHeader, ContextStatus } from "@/components/context-header";
import { ApprovalChecklist, ChecklistItem } from "@/components/approval-checklist";
import { WhatWeAreBlock } from "@/components/blocks/what-we-are-block";
import { FenceBlock } from "@/components/blocks/fence-block";
import { CompetitorSetBlock } from "@/components/blocks/competitor-set-block";
import { DemandDefinitionBlock } from "@/components/blocks/demand-definition-block";
import { ChannelContextBlock } from "@/components/blocks/channel-context-block";
import { GovernanceFooter } from "@/components/blocks/governance-footer";

import {
  insertConfigurationSchema,
  defaultConfiguration,
  type InsertConfiguration,
  type Configuration,
} from "@shared/schema";

export function BrandContextPage() {
  const { toast } = useToast();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const searchString = useSearch();

  const { editId, editReason } = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return {
      editId: params.get("editId") ? parseInt(params.get("editId")!) : null,
      editReason: params.get("reason") || null,
    };
  }, [searchString]);

  const isEditMode = editId !== null;

  const { data: existingConfig, isLoading: isLoadingExisting } = useQuery<Configuration>({
    queryKey: ["/api/configurations", editId],
    enabled: isEditMode,
  });

  const { data: configuration, isLoading } = useQuery<Configuration>({
    queryKey: ["/api/configuration"],
    enabled: !isEditMode,
  });

  const form = useForm<InsertConfiguration>({
    resolver: zodResolver(insertConfigurationSchema),
    defaultValues: defaultConfiguration,
    mode: "onChange",
  });

  const isDirty = form.formState.isDirty;

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
      
      // Update competitors
      if (brand.competitors) {
        form.setValue("competitors.direct", brand.competitors.direct || [], { shouldDirty: true });
        form.setValue("competitors.indirect", brand.competitors.indirect || [], { shouldDirty: true });
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

  useEffect(() => {
    const configToLoad = isEditMode ? existingConfig : configuration;
    if (configToLoad) {
      form.reset({
        name: configToLoad.name,
        brand: { ...defaultConfiguration.brand, ...configToLoad.brand },
        category_definition: { ...defaultConfiguration.category_definition, ...configToLoad.category_definition },
        competitors: { ...defaultConfiguration.competitors, ...configToLoad.competitors },
        demand_definition: { ...defaultConfiguration.demand_definition, ...configToLoad.demand_definition },
        strategic_intent: {
          ...defaultConfiguration.strategic_intent,
          ...configToLoad.strategic_intent,
          constraint_flags: {
            ...defaultConfiguration.strategic_intent.constraint_flags,
            ...(configToLoad.strategic_intent?.constraint_flags || {}),
          },
        },
        channel_context: { ...defaultConfiguration.channel_context, ...configToLoad.channel_context },
        negative_scope: { ...defaultConfiguration.negative_scope, ...configToLoad.negative_scope },
        governance: {
          ...defaultConfiguration.governance,
          ...configToLoad.governance,
          quality_score: {
            ...defaultConfiguration.governance.quality_score,
            ...(configToLoad.governance?.quality_score || {}),
          },
          ai_behavior: {
            ...defaultConfiguration.governance.ai_behavior,
            ...(configToLoad.governance?.ai_behavior || {}),
          },
        },
      });
      setLastSaved(new Date(configToLoad.updated_at));
    }
  }, [configuration, existingConfig, form, isEditMode]);

  const saveMutation = useMutation({
    mutationFn: async (data: InsertConfiguration) => {
      if (isEditMode && editId) {
        const res = await apiRequest("PUT", `/api/configurations/${editId}`, {
          ...data,
          editReason: editReason || "Update via brand context editor",
        });
        return res.json() as Promise<Configuration>;
      } else {
        const res = await apiRequest("POST", "/api/configurations", data);
        return res.json() as Promise<Configuration>;
      }
    },
    onSuccess: (savedConfig: Configuration) => {
      queryClient.invalidateQueries({ queryKey: ["/api/configuration"] });
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
      setLastSaved(new Date());
      form.reset({
        name: savedConfig.name,
        brand: { ...defaultConfiguration.brand, ...savedConfig.brand },
        category_definition: { ...defaultConfiguration.category_definition, ...savedConfig.category_definition },
        competitors: { ...defaultConfiguration.competitors, ...savedConfig.competitors },
        demand_definition: { ...defaultConfiguration.demand_definition, ...savedConfig.demand_definition },
        strategic_intent: {
          ...defaultConfiguration.strategic_intent,
          ...savedConfig.strategic_intent,
          constraint_flags: {
            ...defaultConfiguration.strategic_intent.constraint_flags,
            ...(savedConfig.strategic_intent?.constraint_flags || {}),
          },
        },
        channel_context: { ...defaultConfiguration.channel_context, ...savedConfig.channel_context },
        negative_scope: { ...defaultConfiguration.negative_scope, ...savedConfig.negative_scope },
        governance: {
          ...defaultConfiguration.governance,
          ...savedConfig.governance,
          quality_score: {
            ...defaultConfiguration.governance.quality_score,
            ...(savedConfig.governance?.quality_score || {}),
          },
          ai_behavior: {
            ...defaultConfiguration.governance.ai_behavior,
            ...(savedConfig.governance?.ai_behavior || {}),
          },
        },
      });
      toast({
        title: isEditMode ? "Configuration updated" : "Configuration saved",
        description: isEditMode
          ? "Your changes have been saved with the provided reason."
          : "Your configuration has been saved successfully.",
      });
      if (isEditMode) {
        window.location.href = "/";
      }
    },
    onError: (error) => {
      toast({
        title: "Error saving configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = form.handleSubmit((data) => {
    saveMutation.mutate(data);
  });

  const brandName = form.watch("brand.name");
  const brandDomain = form.watch("brand.domain");
  const cmoSafe = form.watch("governance.cmo_safe");
  const competitors = form.watch("competitors.competitors") || [];
  const seedTerms = form.watch("demand_definition.brand_keywords.seed_terms") || [];
  const categoryExclusions = form.watch("negative_scope.category_exclusions") || [];
  const legacyCategories = form.watch("negative_scope.excluded_categories") || [];

  const qualityScore = form.watch("governance.quality_score");
  const overallScore = qualityScore?.overall || 0;

  const contextStatus: ContextStatus = cmoSafe
    ? "locked"
    : overallScore >= 60
    ? "needs_review"
    : "draft";

  const approvedCompetitors = competitors.filter((c) => c.status === "approved").length;
  const pendingCompetitors = competitors.filter((c) => c.status === "pending_review").length;

  const checklistItems: ChecklistItem[] = [
    { id: "brand-name", label: "Brand name set", complete: Boolean(brandName), critical: true },
    { id: "competitors", label: "Competitors approved", complete: approvedCompetitors > 0 && pendingCompetitors === 0 },
    { id: "keywords", label: "Seed terms defined", complete: seedTerms.length > 0 },
    { id: "exclusions", label: "Exclusions defined", complete: categoryExclusions.length > 0 || legacyCategories.length > 0 },
  ];

  const allChecklistComplete = checklistItems.every((item) => item.complete);
  const canLock = allChecklistComplete && overallScore >= 80;

  const handleLock = () => {
    form.setValue("governance.cmo_safe", true, { shouldDirty: true });
    toast({ title: "Context locked", description: "Configuration marked as CMO Safe." });
  };

  const handleUnlock = () => {
    form.setValue("governance.cmo_safe", false, { shouldDirty: true });
    toast({ title: "Context unlocked", description: "Configuration is now editable." });
  };

  if (isLoading || isLoadingExisting) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading brand context...</p>
        </div>
      </div>
    );
  }

  const configData = isEditMode ? existingConfig : configuration;

  return (
    <FormProvider {...form}>
      <div className="flex h-full flex-col">
        {isEditMode && editReason && (
          <div className="flex items-center gap-3 border-b bg-amber-50 px-4 py-2 dark:bg-amber-950/30">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-medium">Editing with reason:</span> {editReason}
            </p>
            <Link href="/" className="ml-auto">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </Link>
          </div>
        )}

        <ContextHeader
          brandName={brandName}
          domain={brandDomain}
          status={contextStatus}
          confidenceScore={overallScore}
          canLock={canLock}
          onLock={handleLock}
          onUnlock={handleUnlock}
          isLocking={saveMutation.isPending}
        />

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-4">
              <div>
                <h3 className="text-sm font-medium">Quick Start with AI</h3>
                <p className="text-xs text-muted-foreground">
                  Generate a random Fortune 500 brand with real company data
                </p>
              </div>
              <Button
                onClick={() => fortune500Mutation.mutate()}
                disabled={fortune500Mutation.isPending}
                variant="default"
                data-testid="button-generate-fortune500"
              >
                {fortune500Mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Fortune 500
                  </>
                )}
              </Button>
            </div>

            <ApprovalChecklist
              items={checklistItems}
              confidenceThreshold={80}
              currentConfidence={overallScore}
            />

            <WhatWeAreBlock />

            <FenceBlock />

            <CompetitorSetBlock />

            <DemandDefinitionBlock />

            <ChannelContextBlock />

            <GovernanceFooter
              updatedAt={configData?.updated_at}
              updatedBy="Current User"
            />

            <div className="flex items-center justify-between border-t pt-6">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                {lastSaved && (
                  <>
                    <Clock className="h-3 w-3" />
                    Last saved {lastSaved.toLocaleTimeString()}
                  </>
                )}
                {isDirty && (
                  <span className="text-amber-600 dark:text-amber-400 ml-2">
                    (Unsaved changes)
                  </span>
                )}
              </span>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save-context"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Context"}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </FormProvider>
  );
}
