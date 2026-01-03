import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Ban, ShieldAlert, Layers, Tag, Users, Plus, X, AlertTriangle } from "lucide-react";
import { ContextBlock } from "@/components/context-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { InsertConfiguration, ExclusionEntry } from "@shared/schema";

function ExclusionChip({ 
  entry, 
  onRemove 
}: { 
  entry: ExclusionEntry; 
  onRemove: () => void;
}) {
  return (
    <Badge 
      variant="outline" 
      className="gap-1.5 text-red-700 border-red-300 bg-red-50 dark:text-red-300 dark:border-red-700 dark:bg-red-950/50 hover-elevate"
    >
      <Ban className="h-3 w-3" />
      <span>{entry.value}</span>
      {entry.match_type === "semantic" && (
        <span className="text-xs opacity-70">~</span>
      )}
      <button 
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="ml-0.5 hover:text-red-900 dark:hover:text-red-100"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

function ExclusionSection({
  title,
  icon: Icon,
  fieldName,
  enhancedFieldName,
  placeholder,
  testIdPrefix,
}: {
  title: string;
  icon: typeof Layers;
  fieldName: `negative_scope.${"excluded_categories" | "excluded_keywords" | "excluded_use_cases" | "excluded_competitors"}`;
  enhancedFieldName: `negative_scope.${"category_exclusions" | "keyword_exclusions" | "use_case_exclusions" | "competitor_exclusions"}`;
  placeholder: string;
  testIdPrefix: string;
}) {
  const form = useFormContext<InsertConfiguration>();
  const [newValue, setNewValue] = useState("");
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: enhancedFieldName,
  });

  const legacyValues = form.watch(fieldName) || [];

  const handleAdd = () => {
    if (!newValue.trim()) return;
    
    const newEntry: ExclusionEntry = {
      value: newValue.trim(),
      match_type: "exact",
      semantic_sensitivity: "medium",
      added_by: "human",
      added_at: new Date().toISOString(),
      reason: "",
    };
    
    append(newEntry);
    setNewValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const allEntries = [
    ...legacyValues.map((v): ExclusionEntry => ({ 
      value: v, 
      match_type: "exact" as const, 
      semantic_sensitivity: "medium" as const, 
      added_by: "human" as const, 
      added_at: new Date().toISOString(),
      reason: "",
    })),
    ...(fields as ExclusionEntry[])
  ];

  const uniqueEntries = allEntries.filter(
    (entry, index, self) => self.findIndex(e => e.value === entry.value) === index
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-red-500 dark:text-red-400" />
        <span className="text-sm font-medium text-red-800 dark:text-red-200">{title}</span>
        <Badge variant="secondary" className="text-xs">{uniqueEntries.length}</Badge>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {uniqueEntries.map((entry, i) => (
          <ExclusionChip
            key={`${entry.value}-${i}`}
            entry={entry}
            onRemove={() => {
              const enhancedIndex = fields.findIndex(f => (f as ExclusionEntry).value === entry.value);
              if (enhancedIndex >= 0) {
                remove(enhancedIndex);
              } else {
                const legacyIndex = legacyValues.indexOf(entry.value);
                if (legacyIndex >= 0) {
                  const updated = [...legacyValues];
                  updated.splice(legacyIndex, 1);
                  form.setValue(fieldName, updated, { shouldDirty: true });
                }
              }
            }}
          />
        ))}
        
        <div className="flex items-center gap-1">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-7 w-40 text-sm border-dashed border-red-300 dark:border-red-700"
            data-testid={`${testIdPrefix}-input`}
          />
          <Button 
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleAdd}
            disabled={!newValue.trim()}
            className="h-7 w-7 text-red-600 dark:text-red-400"
            data-testid={`${testIdPrefix}-add`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FenceBlock() {
  const form = useFormContext<InsertConfiguration>();
  
  const hardExclusion = form.watch("negative_scope.enforcement_rules.hard_exclusion");
  const allowModelSuggestion = form.watch("negative_scope.enforcement_rules.allow_model_suggestion");
  const requireHumanOverride = form.watch("negative_scope.enforcement_rules.require_human_override_for_expansion");

  const categoryExclusions = form.watch("negative_scope.category_exclusions") || [];
  const keywordExclusions = form.watch("negative_scope.keyword_exclusions") || [];
  const useCaseExclusions = form.watch("negative_scope.use_case_exclusions") || [];
  const competitorExclusions = form.watch("negative_scope.competitor_exclusions") || [];
  const legacyCategories = form.watch("negative_scope.excluded_categories") || [];
  const legacyKeywords = form.watch("negative_scope.excluded_keywords") || [];
  
  const totalExclusions = 
    categoryExclusions.length + 
    keywordExclusions.length + 
    useCaseExclusions.length + 
    competitorExclusions.length +
    legacyCategories.length +
    legacyKeywords.length;

  const hasExclusions = totalExclusions > 0;

  return (
    <ContextBlock
      id="fence"
      title="Fence (Non-Negotiables)"
      subtitle={`${totalExclusions} items excluded from all AI analysis`}
      icon={<ShieldAlert className="h-5 w-5" />}
      status={hasExclusions ? "critical" : "warning"}
      statusLabel={hasExclusions ? `${totalExclusions} exclusions` : "No exclusions"}
      defaultExpanded={true}
      forceExpanded={true}
      variant="critical"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3 rounded-lg bg-red-100/50 dark:bg-red-950/30 p-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">
            <span className="font-medium">Hard pre-filter:</span> Items listed here are rejected before any analysis. 
            Keyword expansion, competitor suggestions, SERP scraping - nothing can override these boundaries.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ExclusionSection
            title="Excluded Categories"
            icon={Layers}
            fieldName="negative_scope.excluded_categories"
            enhancedFieldName="negative_scope.category_exclusions"
            placeholder="Add category..."
            testIdPrefix="fence-category"
          />
          
          <ExclusionSection
            title="Excluded Keywords"
            icon={Tag}
            fieldName="negative_scope.excluded_keywords"
            enhancedFieldName="negative_scope.keyword_exclusions"
            placeholder="Add keyword..."
            testIdPrefix="fence-keyword"
          />
          
          <ExclusionSection
            title="Excluded Use Cases"
            icon={Ban}
            fieldName="negative_scope.excluded_use_cases"
            enhancedFieldName="negative_scope.use_case_exclusions"
            placeholder="Add use case..."
            testIdPrefix="fence-usecase"
          />
          
          <ExclusionSection
            title="Excluded Competitors"
            icon={Users}
            fieldName="negative_scope.excluded_competitors"
            enhancedFieldName="negative_scope.competitor_exclusions"
            placeholder="Add competitor..."
            testIdPrefix="fence-competitor"
          />
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-3">Enforcement Rules</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center justify-between gap-2 rounded-md border border-red-200 dark:border-red-800 p-3">
              <span className="text-sm">Hard Exclusion</span>
              <Switch
                checked={hardExclusion}
                onCheckedChange={(checked) => form.setValue("negative_scope.enforcement_rules.hard_exclusion", checked, { shouldDirty: true })}
                data-testid="switch-hard-exclusion"
              />
            </label>
            
            <label className="flex items-center justify-between gap-2 rounded-md border border-red-200 dark:border-red-800 p-3">
              <span className="text-sm">AI Suggestions</span>
              <Switch
                checked={allowModelSuggestion}
                onCheckedChange={(checked) => form.setValue("negative_scope.enforcement_rules.allow_model_suggestion", checked, { shouldDirty: true })}
                data-testid="switch-model-suggestion"
              />
            </label>
            
            <label className="flex items-center justify-between gap-2 rounded-md border border-red-200 dark:border-red-800 p-3">
              <span className="text-sm">Require Override</span>
              <Switch
                checked={requireHumanOverride}
                onCheckedChange={(checked) => form.setValue("negative_scope.enforcement_rules.require_human_override_for_expansion", checked, { shouldDirty: true })}
                data-testid="switch-human-override"
              />
            </label>
          </div>
        </div>
      </div>
    </ContextBlock>
  );
}
