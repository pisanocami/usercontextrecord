import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save, Copy, Download, Upload, Clock, Check, AlertCircle, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ContextReviewPanel } from "@/components/context-review-panel";
import { BrandContextSection } from "@/components/sections/brand-context";
import { CategoryDefinitionSection } from "@/components/sections/category-definition";
import { CompetitiveSetSection } from "@/components/sections/competitive-set";
import { DemandDefinitionSection } from "@/components/sections/demand-definition";
import { StrategicIntentSection } from "@/components/sections/strategic-intent";
import { ChannelContextSection } from "@/components/sections/channel-context";
import { NegativeScopeSection } from "@/components/sections/negative-scope";
import { GovernanceSection } from "@/components/sections/governance";
import {
  insertConfigurationSchema,
  defaultConfiguration,
  type InsertConfiguration,
  type Configuration,
} from "@shared/schema";
import { Link, useSearch } from "wouter";

interface ConfigurationPageProps {
  activeSection: string;
  onDirtyChange?: (isDirty: boolean) => void;
  onCmoSafeChange?: (isSafe: boolean) => void;
}

// Helper function to generate configuration name from domain
function generateNameFromDomain(domain: string): string {
  if (!domain) return "New Context";
  // Remove protocol and www, extract main domain part
  const cleanDomain = domain
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .replace(/\/$/, "")
    .split("/")[0];
  // Capitalize first letter of each word
  const name = cleanDomain
    .split(".")[0]
    .replace(/[-_]/g, " ")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return `${name} Context`;
}

const sectionComponents: Record<string, () => JSX.Element> = {
  brand: BrandContextSection,
  category: CategoryDefinitionSection,
  competitors: CompetitiveSetSection,
  demand: DemandDefinitionSection,
  strategic: StrategicIntentSection,
  channel: ChannelContextSection,
  negative: NegativeScopeSection,
  governance: GovernanceSection,
};

export function ConfigurationPage({ activeSection, onDirtyChange, onCmoSafeChange }: ConfigurationPageProps) {
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

  // Only fetch existing config when editing, NOT when creating new
  const { data: existingConfig, isLoading: isLoadingExisting } = useQuery<Configuration>({
    queryKey: ["/api/configurations", editId],
    enabled: isEditMode,
  });

  const form = useForm<InsertConfiguration>({
    resolver: zodResolver(insertConfigurationSchema),
    defaultValues: defaultConfiguration,
    mode: "onChange",
  });

  const isDirty = form.formState.isDirty;
  const cmoSafe = form.watch("governance.cmo_safe");

  // Only load existing config data when editing - new contexts start with defaultConfiguration
  useEffect(() => {
    if (isEditMode && existingConfig) {
      form.reset({
        name: existingConfig.name,
        brand: { ...defaultConfiguration.brand, ...existingConfig.brand },
        category_definition: { ...defaultConfiguration.category_definition, ...existingConfig.category_definition },
        competitors: { ...defaultConfiguration.competitors, ...existingConfig.competitors },
        demand_definition: { ...defaultConfiguration.demand_definition, ...existingConfig.demand_definition },
        strategic_intent: { 
          ...defaultConfiguration.strategic_intent, 
          ...existingConfig.strategic_intent,
          constraint_flags: {
            ...defaultConfiguration.strategic_intent.constraint_flags,
            ...(existingConfig.strategic_intent?.constraint_flags || {}),
          },
        },
        channel_context: { ...defaultConfiguration.channel_context, ...existingConfig.channel_context },
        negative_scope: { ...defaultConfiguration.negative_scope, ...existingConfig.negative_scope },
        governance: { 
          ...defaultConfiguration.governance, 
          ...existingConfig.governance,
          quality_score: {
            ...defaultConfiguration.governance.quality_score,
            ...(existingConfig.governance?.quality_score || {}),
          },
          ai_behavior: {
            ...defaultConfiguration.governance.ai_behavior,
            ...(existingConfig.governance?.ai_behavior || {}),
          },
        },
      });
      setLastSaved(new Date(existingConfig.updated_at));
    }
  }, [existingConfig, form, isEditMode]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onCmoSafeChange?.(cmoSafe);
  }, [cmoSafe, onCmoSafeChange]);

  const saveMutation = useMutation({
    mutationFn: async (data: InsertConfiguration) => {
      // Auto-generate name from domain if not provided
      const configData = {
        ...data,
        name: data.name.trim() || generateNameFromDomain(data.brand.domain),
      };
      
      if (isEditMode && editId) {
        const res = await apiRequest("PUT", `/api/configurations/${editId}`, {
          ...configData,
          editReason: editReason || "Update via configuration editor",
        });
        return res.json() as Promise<Configuration>;
      } else {
        const res = await apiRequest("POST", "/api/configurations", configData);
        return res.json() as Promise<Configuration>;
      }
    },
    onSuccess: (savedConfig: Configuration) => {
      queryClient.invalidateQueries({ queryKey: ["/api/configuration"] });
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
      setLastSaved(new Date());
      const resetData: InsertConfiguration = {
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
      };
      form.reset(resetData);
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

  const handleCopyJSON = () => {
    const data = form.getValues();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast({
      title: "Copied to clipboard",
      description: "Configuration JSON has been copied to your clipboard.",
    });
  };

  const handleExport = () => {
    const data = form.getValues();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name.toLowerCase().replace(/\s+/g, "-")}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Configuration exported",
      description: "Your configuration has been downloaded as JSON.",
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        form.reset(data, { keepDefaultValues: false });
        toast({
          title: "Configuration imported",
          description: "Your configuration has been loaded from the file.",
        });
      } catch {
        toast({
          title: "Import failed",
          description: "The file could not be parsed as valid JSON.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const ActiveSection = sectionComponents[activeSection];

  if (isEditMode && isLoadingExisting) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

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
        <header className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <div className="flex items-center gap-2 flex-wrap sm:gap-4">
            <Input
              {...form.register("name")}
              className="h-9 w-full font-medium sm:w-64"
              placeholder="Configuration name"
              data-testid="input-config-name"
            />
            <div className="flex items-center gap-2">
              {cmoSafe && (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  <span className="hidden xs:inline">CMO Safe</span>
                </Badge>
              )}
              {isDirty && (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span className="hidden xs:inline">Unsaved</span>
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="hidden text-xs text-muted-foreground sm:flex sm:items-center sm:gap-1.5">
              {lastSaved && (
                <>
                  <Clock className="h-3 w-3" />
                  Last saved {lastSaved.toLocaleTimeString()}
                </>
              )}
            </span>

            <div className="flex flex-wrap items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleCopyJSON}
                aria-label="Copy JSON"
                data-testid="button-copy-json"
              >
                <Copy className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleExport}
                aria-label="Export configuration"
                data-testid="button-export"
              >
                <Download className="h-4 w-4" />
              </Button>

              <label>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  asChild
                  data-testid="button-import"
                >
                  <span aria-label="Import configuration">
                    <Upload className="h-4 w-4" />
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                aria-label="Save configuration"
                data-testid="button-save"
                className="ml-2"
              >
                <Save className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <div className={isEditMode && existingConfig ? "grid gap-6 lg:grid-cols-[1fr_320px]" : ""}>
              <div className="max-w-4xl">
                {ActiveSection && <ActiveSection />}
              </div>
              {isEditMode && existingConfig && (
                <div className="hidden lg:block">
                  <div className="sticky top-4">
                    <ContextReviewPanel
                      configuration={existingConfig as Configuration}
                      onStatusChange={() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/configurations", editId] });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </FormProvider>
  );
}
