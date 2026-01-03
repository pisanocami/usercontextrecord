import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TagInput } from "@/components/tag-input";
import { Ban, Info, Lock, Layers, Tag, Users, ShieldAlert, Plus, X, ChevronDown, Calendar, Search, Target, History } from "lucide-react";
import type { InsertConfiguration, ExclusionEntry } from "@shared/schema";
import { format } from "date-fns";

function ExclusionEntryCard({ 
  entry, 
  index, 
  onRemove, 
  onUpdate,
  typeLabel,
  testIdPrefix
}: { 
  entry: ExclusionEntry;
  index: number;
  onRemove: () => void;
  onUpdate: (updates: Partial<ExclusionEntry>) => void;
  typeLabel: string;
  testIdPrefix: string;
}) {
  const hasExpiry = !!entry.expires_at;
  
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm break-words" data-testid={`${testIdPrefix}-value-${index}`}>
            {entry.value}
          </span>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-xs">
              {entry.match_type === "exact" ? "Exact Match" : "Semantic"}
            </Badge>
            {entry.match_type === "semantic" && (
              <Badge variant="secondary" className="text-xs">
                {entry.semantic_sensitivity} sensitivity
              </Badge>
            )}
            <Badge variant={entry.added_by === "ai" ? "secondary" : "default"} className="text-xs">
              {entry.added_by === "ai" ? "AI" : "Human"}
            </Badge>
            {hasExpiry && (
              <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                Expires {format(new Date(entry.expires_at!), "MMM d, yyyy")}
              </Badge>
            )}
          </div>
        </div>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          onClick={onRemove}
          data-testid={`${testIdPrefix}-remove-${index}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground">Match Type</label>
          <Select
            value={entry.match_type}
            onValueChange={(value: "exact" | "semantic") => onUpdate({ match_type: value })}
          >
            <SelectTrigger className="h-8 text-xs" data-testid={`${testIdPrefix}-match-type-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exact" data-testid={`${testIdPrefix}-match-type-exact-${index}`}>Exact Match</SelectItem>
              <SelectItem value="semantic" data-testid={`${testIdPrefix}-match-type-semantic-${index}`}>Semantic Match</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {entry.match_type === "semantic" && (
          <div>
            <label className="text-xs text-muted-foreground">Sensitivity</label>
            <Select
              value={entry.semantic_sensitivity}
              onValueChange={(value: "low" | "medium" | "high") => onUpdate({ semantic_sensitivity: value })}
            >
              <SelectTrigger className="h-8 text-xs" data-testid={`${testIdPrefix}-sensitivity-${index}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low" data-testid={`${testIdPrefix}-sensitivity-low-${index}`}>Low</SelectItem>
                <SelectItem value="medium" data-testid={`${testIdPrefix}-sensitivity-medium-${index}`}>Medium</SelectItem>
                <SelectItem value="high" data-testid={`${testIdPrefix}-sensitivity-high-${index}`}>High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div>
          <label className="text-xs text-muted-foreground">Expires (optional)</label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={entry.expires_at ? entry.expires_at.split("T")[0] : ""}
            onChange={(e) => onUpdate({ expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            data-testid={`${testIdPrefix}-expires-${index}`}
          />
        </div>
      </div>
    </div>
  );
}

function EnhancedExclusionSection({
  title,
  icon: Icon,
  description,
  legacyFieldName,
  enhancedFieldName,
  testIdPrefix,
}: {
  title: string;
  icon: typeof Layers;
  description: string;
  legacyFieldName: `negative_scope.${"excluded_categories" | "excluded_keywords" | "excluded_use_cases" | "excluded_competitors"}`;
  enhancedFieldName: `negative_scope.${"category_exclusions" | "keyword_exclusions" | "use_case_exclusions" | "competitor_exclusions"}`;
  testIdPrefix: string;
}) {
  const form = useFormContext<InsertConfiguration>();
  const [newValue, setNewValue] = useState("");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: enhancedFieldName,
  });

  const handleAddEntry = () => {
    if (!newValue.trim()) return;
    
    const newEntry: ExclusionEntry = {
      value: newValue.trim(),
      match_type: "exact",
      semantic_sensitivity: "medium",
      added_by: "human",
      added_at: new Date().toISOString(),
    };
    
    append(newEntry);
    setNewValue("");
  };

  const handleUpdateEntry = (index: number, updates: Partial<ExclusionEntry>) => {
    const current = fields[index] as ExclusionEntry;
    update(index, { ...current, ...updates });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name={legacyFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">Quick Add (Basic)</FormLabel>
              <FormControl>
                <TagInput
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder={`Add ${title.toLowerCase().replace("excluded ", "")} to exclude...`}
                  testId={testIdPrefix}
                />
              </FormControl>
              <FormDescription>
                {description}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between"
              data-testid={`${testIdPrefix}-advanced-toggle`}
            >
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Advanced Exclusions ({fields.length})
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add exclusion with options..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEntry())}
                data-testid={`${testIdPrefix}-advanced-input`}
              />
              <Button 
                type="button" 
                size="icon" 
                onClick={handleAddEntry}
                disabled={!newValue.trim()}
                data-testid={`${testIdPrefix}-advanced-add`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {fields.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {fields.map((field, index) => (
                  <ExclusionEntryCard
                    key={field.id}
                    entry={field as ExclusionEntry}
                    index={index}
                    onRemove={() => remove(index)}
                    onUpdate={(updates) => handleUpdateEntry(index, updates)}
                    typeLabel={title}
                    testIdPrefix={`${testIdPrefix}-entry`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No advanced exclusions. Add entries above for fine-grained control over match types and TTL.
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function AuditLogSection() {
  const form = useFormContext<InsertConfiguration>();
  const auditLog = form.watch("negative_scope.audit_log") || [];
  const [isOpen, setIsOpen] = useState(false);

  if (auditLog.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div 
              className="flex items-center justify-between cursor-pointer"
              data-testid="button-audit-log-toggle"
            >
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Exclusion Audit Log</CardTitle>
                <Badge variant="secondary">{auditLog.length}</Badge>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CardDescription>
            Track when exclusions were applied during analysis
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {auditLog.map((entry, index) => (
                <div 
                  key={index}
                  className="flex items-start justify-between gap-2 rounded-lg border p-2 text-sm"
                  data-testid={`audit-log-entry-${index}`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{entry.exclusion_value}</span>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{entry.exclusion_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        matched against "{entry.matched_against}"
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.applied_at), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function NegativeScopeSection() {
  const form = useFormContext<InsertConfiguration>();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 sm:h-12 sm:w-12">
          <Ban className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Negative Scope & Exclusions</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Define explicit "NOT THIS" boundaries. If excluded here, it never enters the system.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EnhancedExclusionSection
          title="Excluded Categories"
          icon={Layers}
          description="Adjacent but non-core categories"
          legacyFieldName="negative_scope.excluded_categories"
          enhancedFieldName="negative_scope.category_exclusions"
          testIdPrefix="tag-excluded-categories"
        />

        <EnhancedExclusionSection
          title="Excluded Keywords"
          icon={Tag}
          description="Keywords signaling different intent"
          legacyFieldName="negative_scope.excluded_keywords"
          enhancedFieldName="negative_scope.keyword_exclusions"
          testIdPrefix="tag-excluded-keywords"
        />

        <EnhancedExclusionSection
          title="Excluded Use Cases"
          icon={ShieldAlert}
          description="Use cases outside your value proposition"
          legacyFieldName="negative_scope.excluded_use_cases"
          enhancedFieldName="negative_scope.use_case_exclusions"
          testIdPrefix="tag-excluded-use-cases"
        />

        <EnhancedExclusionSection
          title="Excluded Competitors"
          icon={Users}
          description="Brands in adjacent but irrelevant markets"
          legacyFieldName="negative_scope.excluded_competitors"
          enhancedFieldName="negative_scope.competitor_exclusions"
          testIdPrefix="tag-excluded-competitors"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Enforcement Rules</CardTitle>
          </div>
          <CardDescription>
            Control how strictly exclusions are enforced
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="negative_scope.enforcement_rules.hard_exclusion"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Hard Exclusion</FormLabel>
                  <FormDescription>
                    Excluded items are completely blocked from all analysis
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-hard-exclusion"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="negative_scope.enforcement_rules.allow_model_suggestion"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Allow Model Suggestions</FormLabel>
                  <FormDescription>
                    Allow the model to suggest expanding the negative scope
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-model-suggestion"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="negative_scope.enforcement_rules.require_human_override_for_expansion"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Require Human Override</FormLabel>
                  <FormDescription>
                    Any scope expansion requires human approval
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-human-override"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <AuditLogSection />

      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
        <Info className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        <div className="text-sm text-red-800 dark:text-red-200">
          <p className="font-medium">Hard Pre-Filter</p>
          <p className="mt-1 text-red-700 dark:text-red-300">
            Before any analysis - keyword expansion, competitor suggestion, SERP scraping, or trend analysis - excluded items are rejected. If excluded here, it never enters the system.
          </p>
        </div>
      </div>
    </div>
  );
}
