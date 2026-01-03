import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  Globe,
  Target,
  Users,
  TrendingUp,
  Megaphone,
  ShieldX,
  FileCheck,
  Search,
  Layers,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  BarChart3,
  History,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Brand, CategoryDefinition, Competitors, DemandDefinition, StrategicIntent, ChannelContext, NegativeScope, Governance } from "@shared/schema";
import { Link } from "wouter";

interface Configuration {
  id: number;
  userId: string;
  name: string;
  brand: Brand;
  category_definition: CategoryDefinition;
  competitors: Competitors;
  demand_definition: DemandDefinition;
  strategic_intent: StrategicIntent;
  channel_context: ChannelContext;
  negative_scope: NegativeScope;
  governance: Governance;
  created_at: string;
  updated_at: string;
}

interface SectionData {
  title: string;
  icon: typeof Building2;
  fields: { label: string; key: string; isArray?: boolean; isNested?: boolean }[];
}

const sectionDefinitions: Record<string, SectionData> = {
  brand: {
    title: "Brand Context",
    icon: Building2,
    fields: [
      { label: "Name", key: "name" },
      { label: "Domain", key: "domain" },
      { label: "Industry", key: "industry" },
      { label: "Business Model", key: "business_model" },
      { label: "Target Market", key: "target_market" },
      { label: "Primary Geography", key: "primary_geography", isArray: true },
      { label: "Revenue Band", key: "revenue_band" },
    ],
  },
  category_definition: {
    title: "Category Definition",
    icon: Layers,
    fields: [
      { label: "Primary Category", key: "primary_category" },
      { label: "Approved Categories", key: "approved_categories", isArray: true },
      { label: "Included", key: "included", isArray: true },
      { label: "Excluded", key: "excluded", isArray: true },
    ],
  },
  competitors: {
    title: "Competitive Set",
    icon: Users,
    fields: [
      { label: "Direct Competitors", key: "direct", isArray: true },
      { label: "Indirect Competitors", key: "indirect", isArray: true },
      { label: "Marketplaces", key: "marketplaces", isArray: true },
    ],
  },
  demand_definition: {
    title: "Demand Definition",
    icon: Search,
    fields: [
      { label: "Brand Seed Terms", key: "brand_keywords.seed_terms", isNested: true, isArray: true },
      { label: "Top N Brand", key: "brand_keywords.top_n", isNested: true },
      { label: "Category Terms", key: "non_brand_keywords.category_terms", isNested: true, isArray: true },
      { label: "Problem Terms", key: "non_brand_keywords.problem_terms", isNested: true, isArray: true },
      { label: "Top N Non-Brand", key: "non_brand_keywords.top_n", isNested: true },
    ],
  },
  strategic_intent: {
    title: "Strategic Intent",
    icon: Target,
    fields: [
      { label: "Growth Priority", key: "growth_priority" },
      { label: "Risk Tolerance", key: "risk_tolerance" },
      { label: "Primary Goal", key: "primary_goal" },
      { label: "Secondary Goals", key: "secondary_goals", isArray: true },
      { label: "Avoid", key: "avoid", isArray: true },
    ],
  },
  channel_context: {
    title: "Channel Context",
    icon: Megaphone,
    fields: [
      { label: "Paid Media Active", key: "paid_media_active" },
      { label: "SEO Investment Level", key: "seo_investment_level" },
      { label: "Marketplace Dependence", key: "marketplace_dependence" },
    ],
  },
  negative_scope: {
    title: "Negative Scope",
    icon: ShieldX,
    fields: [
      { label: "Excluded Categories", key: "excluded_categories", isArray: true },
      { label: "Excluded Keywords", key: "excluded_keywords", isArray: true },
      { label: "Excluded Use Cases", key: "excluded_use_cases", isArray: true },
      { label: "Excluded Competitors", key: "excluded_competitors", isArray: true },
    ],
  },
  governance: {
    title: "Governance",
    icon: FileCheck,
    fields: [
      { label: "Model Suggested", key: "model_suggested" },
      { label: "Last Reviewed", key: "last_reviewed" },
      { label: "Reviewed By", key: "reviewed_by" },
      { label: "Valid Until", key: "context_valid_until" },
      { label: "CMO Safe", key: "cmo_safe" },
      { label: "Confidence Level", key: "context_confidence.level", isNested: true },
      { label: "Validation Status", key: "validation_status" },
      { label: "Human Verified", key: "human_verified" },
      { label: "Context Version", key: "context_version" },
      { label: "Context Hash", key: "context_hash" },
      { label: "Notes", key: "context_confidence.notes", isNested: true },
    ],
  },
};

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

function renderValue(value: any, isArray?: boolean): React.ReactNode {
  if (value === undefined || value === null) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isArray && Array.isArray(value)) {
    if (value.length === 0) return "-";
    return (
      <ul className="text-right space-y-1.5" data-testid="list-value">
        {value.map((item, i) => (
          <li key={i} className="flex items-start justify-end gap-2 text-sm" title={String(item)}>
            <span className="font-medium text-right break-words max-w-[200px] leading-relaxed">{String(item)}</span>
            <span className="text-primary font-bold mt-1 shrink-0 text-[10px]">•</span>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ConfigurationCard({
  config,
  onEdit,
  onDelete,
  onRegenerate,
  isRegenerating,
}: {
  config: Configuration;
  onEdit: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="mb-4" data-testid={`card-config-${config.id}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg truncate">{config.name}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      {config.brand.domain || "No domain"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {config.brand.industry || "No industry"}
                    </Badge>
                    {config.governance.cmo_safe && (
                      <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        CMO Safe
                      </Badge>
                    )}
                    {config.governance.validation_status === "complete" && (
                      <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Validated
                      </Badge>
                    )}
                    {config.governance.validation_status === "needs_review" && (
                      <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Needs Review
                      </Badge>
                    )}
                    {config.governance.validation_status === "blocked" && (
                      <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Blocked
                      </Badge>
                    )}
                    {config.governance.validation_status === "incomplete" && (
                      <Badge className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Incomplete
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/one-pager/${config.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="View One Pager"
                    data-testid={`button-onepager-${config.id}`}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/keyword-gap/${config.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Keyword Gap Analysis"
                    data-testid={`button-keyword-gap-${config.id}`}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/versions/${config.id}`} onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Version History"
                    data-testid={`button-versions-${config.id}`}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegenerate();
                  }}
                  disabled={isRegenerating}
                  title="Regenerate all sections with AI"
                  data-testid={`button-regenerate-${config.id}`}
                >
                  {isRegenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  data-testid={`button-edit-${config.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  data-testid={`button-delete-${config.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {Object.entries(sectionDefinitions).map(([key, section]) => {
                const Icon = section.icon;
                const sectionData = (config as any)[key];
                
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      {section.title}
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                      {section.fields.map((field) => {
                        const value = field.isNested
                          ? getNestedValue(sectionData, field.key)
                          : sectionData?.[field.key];
                        return (
                          <div key={field.key} className="flex justify-between items-start gap-4 text-sm py-1.5 border-b border-border/20 last:border-0">
                            <span className="text-muted-foreground shrink-0 font-medium pt-0.5">{field.label}:</span>
                            <div className="min-w-0 flex-1 flex justify-end overflow-hidden">
                              {renderValue(value, field.isArray)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex flex-wrap gap-4">
              <span>Created: {new Date(config.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(config.updated_at).toLocaleDateString()}</span>
              <span>Last Reviewed: {config.governance.last_reviewed || "-"}</span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function ConfigurationsList() {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<Configuration | null>(null);
  const [editReason, setEditReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const { data: configurations, isLoading } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/configurations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
      toast({ title: "Context deleted", description: "The context has been removed." });
      setDeleteDialogOpen(false);
      setSelectedConfig(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (config: Configuration) => {
      const response = await apiRequest("POST", "/api/ai/generate-complete", {
        domain: config.brand.domain,
        name: config.brand.name,
        primaryCategory: config.category_definition.primary_category || config.brand.industry,
      });
      const data = await response.json();
      
      const updateResponse = await apiRequest("PUT", `/api/configurations/${config.id}`, {
        ...data.configuration,
        name: config.name,
        editReason: "AI regeneration of all sections",
      });
      return updateResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
      toast({ 
        title: "Context regenerated", 
        description: "All sections have been regenerated with AI." 
      });
      setRegeneratingId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setRegeneratingId(null);
    },
  });

  const handleRegenerate = (config: Configuration) => {
    setRegeneratingId(config.id);
    regenerateMutation.mutate(config);
  };

  const handleEdit = (config: Configuration) => {
    setSelectedConfig(config);
    setEditReason("");
    setEditDialogOpen(true);
  };

  const handleDelete = (config: Configuration) => {
    setSelectedConfig(config);
    setDeleteDialogOpen(true);
  };

  const handleConfirmEdit = () => {
    if (!editReason.trim() || editReason.trim().length < 5) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for editing (minimum 5 characters)",
        variant: "destructive",
      });
      return;
    }
    setEditDialogOpen(false);
    window.location.href = `/new?editId=${selectedConfig?.id}&reason=${encodeURIComponent(editReason.trim())}`;
  };

  const filteredConfigurations = configurations?.filter((config) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      config.name.toLowerCase().includes(query) ||
      config.brand.name.toLowerCase().includes(query) ||
      config.brand.domain.toLowerCase().includes(query) ||
      config.brand.industry.toLowerCase().includes(query)
    );
  });

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-5xl py-6 px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Record Contexts</h1>
            <p className="text-muted-foreground">
              View and manage all saved brand intelligence contexts
            </p>
          </div>
          <Link href="/new">
            <Button data-testid="button-new-config">
              <Plus className="h-4 w-4 mr-2" />
              New Context
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, domain, or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-configs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredConfigurations?.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">No contexts found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "Create your first user record context to get started"}
                </p>
              </div>
              {!searchQuery && (
                <Link href="/">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Context
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {filteredConfigurations?.length} context{filteredConfigurations?.length !== 1 ? "s" : ""}
            </p>
            {filteredConfigurations?.map((config) => (
              <ConfigurationCard
                key={config.id}
                config={config}
                onEdit={() => handleEdit(config)}
                onDelete={() => handleDelete(config)}
                onRegenerate={() => handleRegenerate(config)}
                isRegenerating={regeneratingId === config.id}
              />
            ))}
          </div>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Context</DialogTitle>
              <DialogDescription>
                Please provide a reason for editing "{selectedConfig?.name}". This is required for audit purposes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editReason">Reason for edit *</Label>
                <Textarea
                  id="editReason"
                  placeholder="Describe why you're making changes to this context..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="min-h-24"
                  data-testid="textarea-edit-reason"
                />
                <p className="text-xs text-muted-foreground">Minimum 5 characters required</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmEdit}
                disabled={editReason.trim().length < 5}
                data-testid="button-confirm-edit"
              >
                Continue to Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedConfig?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedConfig && deleteMutation.mutate(selectedConfig.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}
