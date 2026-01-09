import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Edit,
  Trash2,
  Plus,
  Search,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  BarChart3,
  History,
  Eye,
  Calendar,
  MoreHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Brand, CategoryDefinition, Competitors, DemandDefinition, StrategicIntent, ChannelContext, NegativeScope, Governance } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { ConfigCardList } from "@/components/mobile/config-card";
import { BrandSelector } from "@/components/brand-selector";
import { SECTION_DEFINITIONS, getNestedValue } from "@shared/section-definitions";

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

function calculateQualityScore(config: Configuration): number {
  let filledFields = 0;
  let totalFields = 0;

  Object.entries(SECTION_DEFINITIONS).forEach(([sectionKey, section]) => {
    const sectionData = (config as any)[sectionKey];
    if (!sectionData) return;

    section.fields.forEach((field) => {
      totalFields++;
      const value = field.isNested
        ? getNestedValue(sectionData, field.key)
        : sectionData?.[field.key];

      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          if (value.length > 0) filledFields++;
        } else {
          filledFields++;
        }
      }
    });
  });

  return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
}

function ValidationStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return (
        <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Validated
        </Badge>
      );
    case "needs_review":
      return (
        <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
          <Clock className="h-3 w-3 mr-1" />
          Needs Review
        </Badge>
      );
    case "blocked":
      return (
        <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    default:
      return (
        <Badge className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Incomplete
        </Badge>
      );
  }
}

function ScoreBadge({ score }: { score: number }) {
  let colorClass = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  if (score >= 80) {
    colorClass = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  } else if (score >= 50) {
    colorClass = "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  } else if (score > 0) {
    colorClass = "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  }

  return (
    <Badge className={`text-xs ${colorClass}`}>
      {score}%
    </Badge>
  );
}

export default function ConfigurationsList() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<Configuration | null>(null);
  const [editReason, setEditReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const isMobile = useIsMobile();

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
    navigate(`/new?editId=${selectedConfig?.id}&reason=${encodeURIComponent(editReason.trim())}`);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedConfigurations = useMemo(() => {
    if (!configurations) return [];

    let items = configurations.filter((config) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        config.name.toLowerCase().includes(query) ||
        config.brand.name.toLowerCase().includes(query) ||
        config.brand.domain.toLowerCase().includes(query) ||
        config.brand.industry.toLowerCase().includes(query)
      );
    });

    items.sort((a, b) => {
      let aVal: any = "";
      let bVal: any = "";

      switch (sortField) {
        case "name":
          aVal = a.brand.name || "";
          bVal = b.brand.name || "";
          break;
        case "domain":
          aVal = a.brand.domain || "";
          bVal = b.brand.domain || "";
          break;
        case "industry":
          aVal = a.brand.industry || "";
          bVal = b.brand.industry || "";
          break;
        default:
          aVal = a.brand.name || "";
          bVal = b.brand.name || "";
      }

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    return items;
  }, [configurations, searchQuery, sortField, sortDirection]);

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-7xl py-6 px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Record Contexts</h1>
            <p className="text-muted-foreground">
              View and manage all saved brand intelligence contexts
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/context">
              <Button data-testid="button-fortune500">
                <Sparkles className="h-4 w-4 mr-2" />
                Create Fortune 500
              </Button>
            </Link>
            <Link href="/new">
              <Button variant="outline" data-testid="button-new-config">
                <Plus className="h-4 w-4 mr-2" />
                New Context
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-64">
            <BrandSelector />
          </div>
          <div className="relative flex-1">
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
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : filteredAndSortedConfigurations.length === 0 ? (
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
              {filteredAndSortedConfigurations.length} context{filteredAndSortedConfigurations.length !== 1 ? "s" : ""}
            </p>
            {isMobile ? (
              <ConfigCardList
                configs={filteredAndSortedConfigurations as any}
                onEdit={(id) => handleEdit(filteredAndSortedConfigurations.find((c) => c.id === id)!)}
                onDelete={(id) => handleDelete(filteredAndSortedConfigurations.find((c) => c.id === id)!)}
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort("name")}
                              className="font-medium -ml-3"
                              data-testid="button-sort-brand"
                            >
                              Brand
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort("domain")}
                              className="font-medium -ml-3"
                              data-testid="button-sort-domain"
                            >
                              Domain
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort("industry")}
                              className="font-medium -ml-3"
                              data-testid="button-sort-industry"
                            >
                              Industry
                              <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedConfigurations.map((config) => {
                          const qualityScore = calculateQualityScore(config);
                          const isRegenerating = regeneratingId === config.id;

                          return (
                            <TableRow key={config.id} data-testid={`row-config-${config.id}`}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Building2 className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium truncate max-w-[200px]" title={config.brand.name}>
                                      {config.brand.name || config.name}
                                    </div>
                                    {config.governance.cmo_safe && (
                                      <Badge variant="secondary" className="text-[10px] mt-0.5">
                                        CMO Safe
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground truncate max-w-[150px] block" title={config.brand.domain}>
                                  {config.brand.domain || "-"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {config.brand.industry || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <ValidationStatusBadge status={config.governance.validation_status || "incomplete"} />
                              </TableCell>
                              <TableCell>
                                <ScoreBadge score={qualityScore} />
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      data-testid={`button-actions-${config.id}`}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                    <Link href={`/one-pager/${config.id}`}>
                                      <DropdownMenuItem data-testid={`menuitem-onepager-${config.id}`}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        One Pager
                                      </DropdownMenuItem>
                                    </Link>
                                    <Link href={`/keyword-gap/${config.id}`}>
                                      <DropdownMenuItem data-testid={`menuitem-keywordgap-${config.id}`}>
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        Keyword Gap
                                      </DropdownMenuItem>
                                    </Link>
                                    <Link href={`/market-demand/${config.id}`}>
                                      <DropdownMenuItem data-testid={`menuitem-marketdemand-${config.id}`}>
                                        <Calendar className="h-4 w-4 mr-2" />
                                        Market Demand
                                      </DropdownMenuItem>
                                    </Link>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Analysis</DropdownMenuLabel>
                                    <Link href={`/keyword-gap-report/${config.id}`}>
                                      <DropdownMenuItem data-testid={`menuitem-visibilityreport-${config.id}`}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Visibility Report
                                      </DropdownMenuItem>
                                    </Link>
                                    <Link href={`/versions/${config.id}`}>
                                      <DropdownMenuItem data-testid={`menuitem-versionhistory-${config.id}`}>
                                        <History className="h-4 w-4 mr-2" />
                                        Version History
                                      </DropdownMenuItem>
                                    </Link>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Manage</DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => handleRegenerate(config)}
                                      disabled={isRegenerating}
                                      data-testid={`menuitem-regenerate-${config.id}`}
                                    >
                                      {isRegenerating ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-4 w-4 mr-2" />
                                      )}
                                      Regenerate with AI
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleEdit(config)}
                                      data-testid={`menuitem-edit-${config.id}`}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(config)}
                                      className="text-destructive focus:text-destructive"
                                      data-testid={`menuitem-delete-${config.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
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
              <AlertDialogTitle>Delete Context</AlertDialogTitle>
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
