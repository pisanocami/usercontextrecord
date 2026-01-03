import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { TagInput } from "@/components/tag-input";
import { AIGenerateButton } from "@/components/ai-generate-button";
import { useAIGenerate } from "@/hooks/use-ai-generate";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, Info, Target, TrendingUp, Store, Plus, Check, X, ChevronDown, ChevronRight, AlertCircle, Star, Building2, Globe } from "lucide-react";
import type { InsertConfiguration, CompetitorEntry } from "@shared/schema";

const TIER_LABELS = {
  tier1: { label: "Direct", description: "Same core product/service", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  tier2: { label: "Adjacent", description: "Different solution, same problem", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  tier3: { label: "Aspirational", description: "Market leaders to learn from", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
};

const FUNDING_STAGES = [
  { value: "unknown", label: "Unknown" },
  { value: "bootstrap", label: "Bootstrap" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c_plus", label: "Series C+" },
  { value: "public", label: "Public" },
];

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{score}%</span>
    </div>
  );
}

function CompetitorCard({ 
  competitor, 
  onApprove, 
  onReject, 
  onEdit,
  isExpanded,
  onToggle
}: { 
  competitor: CompetitorEntry; 
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const tierInfo = TIER_LABELS[competitor.tier];
  
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 shrink-0" 
            onClick={onToggle}
            data-testid={`btn-toggle-${competitor.name}`}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{competitor.name}</span>
              <Badge className={`${tierInfo.color} text-xs`}>{tierInfo.label}</Badge>
              {competitor.status === "approved" && (
                <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                  <Check className="h-3 w-3 mr-1" /> Approved
                </Badge>
              )}
              {competitor.status === "rejected" && (
                <Badge variant="outline" className="text-red-600 border-red-300 text-xs">
                  <X className="h-3 w-3 mr-1" /> Rejected
                </Badge>
              )}
              {competitor.status === "pending_review" && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" /> Pending
                </Badge>
              )}
            </div>
            {competitor.domain && (
              <span className="text-xs text-muted-foreground">{competitor.domain}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {competitor.status === "pending_review" && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-green-600" 
                onClick={onApprove}
                data-testid={`btn-approve-${competitor.name}`}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-red-600" 
                onClick={onReject}
                data-testid={`btn-reject-${competitor.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-3 pl-9 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ScoreBar score={competitor.similarity_score} label="Similarity" />
            <ScoreBar score={competitor.serp_overlap} label="SERP Overlap" />
            <ScoreBar score={competitor.size_proximity} label="Size Match" />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Revenue:</span>
              <span>{competitor.revenue_range || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Employees:</span>
              <span>{competitor.employee_count || "Unknown"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Stage:</span>
              <span className="capitalize">{competitor.funding_stage.replace("_", " ")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Geo:</span>
              <span>{competitor.geo_overlap.length > 0 ? competitor.geo_overlap.join(", ") : "Unknown"}</span>
            </div>
          </div>
          
          {competitor.evidence.why_selected && (
            <div className="bg-muted/50 rounded-md p-2 text-xs">
              <span className="font-medium">Why selected: </span>
              <span className="text-muted-foreground">{competitor.evidence.why_selected}</span>
            </div>
          )}
          
          {competitor.evidence.top_overlap_keywords.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Overlap keywords:</span>
              {competitor.evidence.top_overlap_keywords.map((kw, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
              ))}
            </div>
          )}
          
          {competitor.rejected_reason && (
            <div className="bg-red-50 dark:bg-red-950/30 rounded-md p-2 text-xs text-red-700 dark:text-red-300">
              <span className="font-medium">Rejection reason: </span>
              {competitor.rejected_reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CompetitiveSetSection() {
  const form = useFormContext<InsertConfiguration>();
  const { toast } = useToast();
  const { generate, isGenerating } = useAIGenerate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState<Partial<CompetitorEntry>>({
    name: "",
    domain: "",
    tier: "tier1",
    status: "approved",
    similarity_score: 50,
    serp_overlap: 0,
    size_proximity: 50,
    revenue_range: "",
    employee_count: "",
    funding_stage: "unknown",
    geo_overlap: [],
    evidence: { why_selected: "", top_overlap_keywords: [], serp_examples: [] },
    added_by: "human",
  });
  
  const competitors = form.watch("competitors.competitors") || [];
  
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
          
          const parseCompetitorItem = (item: unknown): { name: string; domain: string; why: string } | null => {
            if (typeof item === "string") {
              return { name: item, domain: "", why: "" };
            }
            if (typeof item === "object" && item !== null) {
              const obj = item as Record<string, unknown>;
              return {
                name: (obj.name as string) || "",
                domain: (obj.domain as string) || "",
                why: (obj.why as string) || "",
              };
            }
            return null;
          };
          
          const directItems = (suggestions.direct as unknown[] || []).map(parseCompetitorItem).filter(Boolean) as { name: string; domain: string; why: string }[];
          const indirectItems = (suggestions.indirect as unknown[] || []).map(parseCompetitorItem).filter(Boolean) as { name: string; domain: string; why: string }[];
          const marketplaceItems = (suggestions.marketplaces as unknown[] || []).map(parseCompetitorItem).filter(Boolean) as { name: string; domain: string; why: string }[];
          
          form.setValue("competitors.direct", directItems.map(c => c.name), { shouldDirty: true });
          form.setValue("competitors.indirect", indirectItems.map(c => c.name), { shouldDirty: true });
          form.setValue("competitors.marketplaces", marketplaceItems.map(c => c.name), { shouldDirty: true });
          
          const newEntries: CompetitorEntry[] = [];
          const now = new Date().toISOString();
          
          directItems.forEach((item) => {
            if (!competitors.some(c => c.name === item.name)) {
              newEntries.push({
                name: item.name,
                domain: item.domain,
                tier: "tier1",
                status: "pending_review",
                similarity_score: 70,
                serp_overlap: 0,
                size_proximity: 50,
                revenue_range: "",
                employee_count: "",
                funding_stage: "unknown",
                geo_overlap: [],
                evidence: { 
                  why_selected: item.why || "AI-suggested direct competitor", 
                  top_overlap_keywords: [], 
                  serp_examples: [] 
                },
                added_by: "ai",
                added_at: now,
                rejected_reason: "",
              });
            }
          });
          
          indirectItems.forEach((item) => {
            if (!competitors.some(c => c.name === item.name) && !newEntries.some(e => e.name === item.name)) {
              newEntries.push({
                name: item.name,
                domain: item.domain,
                tier: "tier2",
                status: "pending_review",
                similarity_score: 50,
                serp_overlap: 0,
                size_proximity: 50,
                revenue_range: "",
                employee_count: "",
                funding_stage: "unknown",
                geo_overlap: [],
                evidence: { 
                  why_selected: item.why || "AI-suggested indirect competitor", 
                  top_overlap_keywords: [], 
                  serp_examples: [] 
                },
                added_by: "ai",
                added_at: now,
                rejected_reason: "",
              });
            }
          });
          
          if (newEntries.length > 0) {
            const allCompetitors = [...competitors, ...newEntries];
            form.setValue("competitors.competitors", allCompetitors, { shouldDirty: true });
            updateCounts(allCompetitors);
          }
          
          toast({
            title: "AI suggestions applied",
            description: `Added ${newEntries.length} competitors for review.`,
          });
        },
      }
    );
  };
  
  const updateCounts = (list: CompetitorEntry[]) => {
    form.setValue("competitors.approved_count", list.filter(c => c.status === "approved").length, { shouldDirty: true });
    form.setValue("competitors.rejected_count", list.filter(c => c.status === "rejected").length, { shouldDirty: true });
    form.setValue("competitors.pending_review_count", list.filter(c => c.status === "pending_review").length, { shouldDirty: true });
  };
  
  const handleApprove = (index: number) => {
    const updated = [...competitors];
    updated[index] = { ...updated[index], status: "approved" };
    form.setValue("competitors.competitors", updated, { shouldDirty: true });
    updateCounts(updated);
    toast({ title: "Competitor approved" });
  };
  
  const handleReject = (index: number) => {
    const updated = [...competitors];
    updated[index] = { ...updated[index], status: "rejected", rejected_reason: "Rejected by user" };
    form.setValue("competitors.competitors", updated, { shouldDirty: true });
    updateCounts(updated);
    toast({ title: "Competitor rejected" });
  };
  
  const handleAddCompetitor = () => {
    if (!newCompetitor.name) return;
    
    const entry: CompetitorEntry = {
      name: newCompetitor.name || "",
      domain: newCompetitor.domain || "",
      tier: newCompetitor.tier || "tier1",
      status: "approved",
      similarity_score: newCompetitor.similarity_score || 50,
      serp_overlap: newCompetitor.serp_overlap || 0,
      size_proximity: newCompetitor.size_proximity || 50,
      revenue_range: newCompetitor.revenue_range || "",
      employee_count: newCompetitor.employee_count || "",
      funding_stage: newCompetitor.funding_stage || "unknown",
      geo_overlap: newCompetitor.geo_overlap || [],
      evidence: { why_selected: "Manually added", top_overlap_keywords: [], serp_examples: [] },
      added_by: "human",
      added_at: new Date().toISOString(),
      rejected_reason: "",
    };
    
    const updated = [...competitors, entry];
    form.setValue("competitors.competitors", updated, { shouldDirty: true });
    updateCounts(updated);
    setShowAddDialog(false);
    setNewCompetitor({
      name: "",
      domain: "",
      tier: "tier1",
      status: "approved",
      similarity_score: 50,
      serp_overlap: 0,
      size_proximity: 50,
      revenue_range: "",
      employee_count: "",
      funding_stage: "unknown",
      geo_overlap: [],
      evidence: { why_selected: "", top_overlap_keywords: [], serp_examples: [] },
      added_by: "human",
    });
    toast({ title: "Competitor added" });
  };
  
  const toggleExpand = (name: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setExpandedIds(newSet);
  };
  
  const tier1Competitors = competitors.filter(c => c.tier === "tier1");
  const tier2Competitors = competitors.filter(c => c.tier === "tier2");
  const tier3Competitors = competitors.filter(c => c.tier === "tier3");
  const approvedCount = competitors.filter(c => c.status === "approved").length;
  const pendingCount = competitors.filter(c => c.status === "pending_review").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12">
            <Users className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Competitive Set</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Define who you compare against. Tier and approve each competitor.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="text-xs">
                {approvedCount} Approved
              </Badge>
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                  {pendingCount} Pending Review
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAddDialog(true)}
            data-testid="btn-add-competitor"
          >
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
          <AIGenerateButton
            onClick={handleGenerate}
            isGenerating={isGenerating}
            disabled={!form.getValues("brand.name")}
          />
        </div>
      </div>

      <div className="grid gap-4">
        <Collapsible defaultOpen>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left hover-elevate rounded-md p-1 -m-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                    <Target className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Tier 1: Direct Competitors</CardTitle>
                    <CardDescription>Same core product or service ({tier1Competitors.length})</CardDescription>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-2">
                {tier1Competitors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No direct competitors added yet</p>
                ) : (
                  tier1Competitors.map((c, i) => {
                    const originalIndex = competitors.findIndex(comp => comp.name === c.name);
                    return (
                      <CompetitorCard
                        key={c.name}
                        competitor={c}
                        isExpanded={expandedIds.has(c.name)}
                        onToggle={() => toggleExpand(c.name)}
                        onApprove={() => handleApprove(originalIndex)}
                        onReject={() => handleReject(originalIndex)}
                        onEdit={() => {}}
                      />
                    );
                  })
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left hover-elevate rounded-md p-1 -m-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Tier 2: Adjacent Competitors</CardTitle>
                    <CardDescription>Solving same problem differently ({tier2Competitors.length})</CardDescription>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-2">
                {tier2Competitors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No adjacent competitors added yet</p>
                ) : (
                  tier2Competitors.map((c, i) => {
                    const originalIndex = competitors.findIndex(comp => comp.name === c.name);
                    return (
                      <CompetitorCard
                        key={c.name}
                        competitor={c}
                        isExpanded={expandedIds.has(c.name)}
                        onToggle={() => toggleExpand(c.name)}
                        onApprove={() => handleApprove(originalIndex)}
                        onReject={() => handleReject(originalIndex)}
                        onEdit={() => {}}
                      />
                    );
                  })
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible defaultOpen>
          <Card>
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left hover-elevate rounded-md p-1 -m-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Star className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Tier 3: Aspirational</CardTitle>
                    <CardDescription>Market leaders to learn from ({tier3Competitors.length})</CardDescription>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-2">
                {tier3Competitors.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No aspirational competitors added yet</p>
                ) : (
                  tier3Competitors.map((c, i) => {
                    const originalIndex = competitors.findIndex(comp => comp.name === c.name);
                    return (
                      <CompetitorCard
                        key={c.name}
                        competitor={c}
                        isExpanded={expandedIds.has(c.name)}
                        onToggle={() => toggleExpand(c.name)}
                        onApprove={() => handleApprove(originalIndex)}
                        onReject={() => handleReject(originalIndex)}
                        onEdit={() => {}}
                      />
                    );
                  })
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

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
            AI-suggested competitors require human approval. Review scores, evidence, and tier classification before approving.
          </p>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Competitor</DialogTitle>
            <DialogDescription>
              Manually add a competitor with tier classification and company details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>Name *</FormLabel>
                <Input
                  value={newCompetitor.name}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                  placeholder="Competitor name"
                  data-testid="input-competitor-name"
                />
              </div>
              <div className="space-y-2">
                <FormLabel>Domain</FormLabel>
                <Input
                  value={newCompetitor.domain}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, domain: e.target.value })}
                  placeholder="competitor.com"
                  data-testid="input-competitor-domain"
                />
              </div>
            </div>
            <div className="space-y-2">
              <FormLabel>Tier</FormLabel>
              <Select
                value={newCompetitor.tier}
                onValueChange={(v) => setNewCompetitor({ ...newCompetitor, tier: v as "tier1" | "tier2" | "tier3" })}
              >
                <SelectTrigger data-testid="select-competitor-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier1">Tier 1 - Direct Competitor</SelectItem>
                  <SelectItem value="tier2">Tier 2 - Adjacent Competitor</SelectItem>
                  <SelectItem value="tier3">Tier 3 - Aspirational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>Revenue Range</FormLabel>
                <Input
                  value={newCompetitor.revenue_range}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, revenue_range: e.target.value })}
                  placeholder="e.g., 10M-50M"
                  data-testid="input-competitor-revenue"
                />
              </div>
              <div className="space-y-2">
                <FormLabel>Employee Count</FormLabel>
                <Input
                  value={newCompetitor.employee_count}
                  onChange={(e) => setNewCompetitor({ ...newCompetitor, employee_count: e.target.value })}
                  placeholder="e.g., 50-200"
                  data-testid="input-competitor-employees"
                />
              </div>
            </div>
            <div className="space-y-2">
              <FormLabel>Funding Stage</FormLabel>
              <Select
                value={newCompetitor.funding_stage}
                onValueChange={(v) => setNewCompetitor({ ...newCompetitor, funding_stage: v as CompetitorEntry["funding_stage"] })}
              >
                <SelectTrigger data-testid="select-competitor-funding">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUNDING_STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCompetitor} disabled={!newCompetitor.name} data-testid="btn-confirm-add-competitor">
              Add Competitor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
