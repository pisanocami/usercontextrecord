import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Save, Copy, Download, Upload, Clock, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
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

interface ConfigurationPageProps {
  activeSection: string;
  onDirtyChange?: (isDirty: boolean) => void;
  onCmoSafeChange?: (isSafe: boolean) => void;
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

  const { data: configuration, isLoading } = useQuery<Configuration>({
    queryKey: ["/api/configuration"],
  });

  const form = useForm<InsertConfiguration>({
    resolver: zodResolver(insertConfigurationSchema),
    defaultValues: defaultConfiguration,
    mode: "onChange",
  });

  const isDirty = form.formState.isDirty;
  const cmoSafe = form.watch("governance.cmo_safe");

  useEffect(() => {
    if (configuration) {
      form.reset({
        name: configuration.name,
        brand: configuration.brand,
        category_definition: configuration.category_definition,
        competitors: configuration.competitors,
        demand_definition: configuration.demand_definition,
        strategic_intent: configuration.strategic_intent,
        channel_context: configuration.channel_context,
        negative_scope: configuration.negative_scope,
        governance: configuration.governance,
      });
      setLastSaved(new Date(configuration.updated_at));
    }
  }, [configuration, form]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onCmoSafeChange?.(cmoSafe);
  }, [cmoSafe, onCmoSafeChange]);

  const saveMutation = useMutation({
    mutationFn: async (data: InsertConfiguration) => {
      const res = await apiRequest("POST", "/api/configuration", data);
      return res.json() as Promise<Configuration>;
    },
    onSuccess: (savedConfig: Configuration) => {
      queryClient.invalidateQueries({ queryKey: ["/api/configuration"] });
      setLastSaved(new Date());
      const resetData: InsertConfiguration = {
        name: savedConfig.name,
        brand: savedConfig.brand,
        category_definition: savedConfig.category_definition,
        competitors: savedConfig.competitors,
        demand_definition: savedConfig.demand_definition,
        strategic_intent: savedConfig.strategic_intent,
        channel_context: savedConfig.channel_context,
        negative_scope: savedConfig.negative_scope,
        governance: savedConfig.governance,
      };
      form.reset(resetData);
      toast({
        title: "Configuration saved",
        description: "Your configuration has been saved successfully.",
      });
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

  if (isLoading) {
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
          <div className="mx-auto max-w-4xl">
            {ActiveSection && <ActiveSection />}
          </div>
        </main>
      </div>
    </FormProvider>
  );
}
