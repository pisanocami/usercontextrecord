import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { TrendingUp, Search, Tag, Plus, X } from "lucide-react";
import { ContextBlock, BlockStatus } from "@/components/context-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AIGenerateButton } from "@/components/ai-generate-button";
import { useAIGenerate } from "@/hooks/use-ai-generate";
import { useToast } from "@/hooks/use-toast";
import type { InsertConfiguration } from "@shared/schema";

function ChipSection({
  title,
  icon: Icon,
  items,
  onAdd,
  onRemove,
  placeholder,
  testIdPrefix,
}: {
  title: string;
  icon: typeof Tag;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  testIdPrefix: string;
}) {
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    if (newValue.trim() && !items.includes(newValue.trim())) {
      onAdd(newValue.trim());
      setNewValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title}</span>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <Badge 
            key={`${item}-${i}`}
            variant="outline"
            className="gap-1.5"
            data-testid={`${testIdPrefix}-chip-${i}`}
          >
            {item}
            <button 
              type="button"
              onClick={() => onRemove(i)}
              className="ml-0.5 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        
        <div className="flex items-center gap-1">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-7 w-32 text-sm border-dashed"
            data-testid={`${testIdPrefix}-input`}
          />
          <Button 
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleAdd}
            disabled={!newValue.trim()}
            className="h-7 w-7"
            data-testid={`${testIdPrefix}-add`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DemandDefinitionBlock() {
  const form = useFormContext<InsertConfiguration>();
  const { toast } = useToast();
  const { generate, isGenerating } = useAIGenerate();

  const seedTerms = form.watch("demand_definition.brand_keywords.seed_terms") || [];
  const categoryTerms = form.watch("demand_definition.non_brand_keywords.category_terms") || [];
  const problemTerms = form.watch("demand_definition.non_brand_keywords.problem_terms") || [];

  const hasContent = seedTerms.length > 0 || categoryTerms.length > 0;
  const status: BlockStatus = hasContent ? "complete" : "incomplete";

  const handleRegenerate = () => {
    const brand = form.getValues("brand");
    const category = form.getValues("category_definition");
    generate(
      { 
        section: "demand", 
        context: { 
          name: brand.name, 
          industry: brand.industry,
          primary_category: category.primary_category,
        } 
      },
      {
        onSuccess: (data) => {
          const suggestions = data.suggestions as Record<string, unknown>;
          if (Array.isArray(suggestions.seed_terms)) {
            form.setValue("demand_definition.brand_keywords.seed_terms", suggestions.seed_terms as string[], { shouldDirty: true });
          }
          if (Array.isArray(suggestions.category_terms)) {
            form.setValue("demand_definition.non_brand_keywords.category_terms", suggestions.category_terms as string[], { shouldDirty: true });
          }
          if (Array.isArray(suggestions.problem_terms)) {
            form.setValue("demand_definition.non_brand_keywords.problem_terms", suggestions.problem_terms as string[], { shouldDirty: true });
          }
          toast({ title: "Demand keywords refreshed" });
        },
      }
    );
  };

  const addSeedTerm = (value: string) => {
    const current = [...seedTerms];
    current.push(value);
    form.setValue("demand_definition.brand_keywords.seed_terms", current, { shouldDirty: true });
  };

  const removeSeedTerm = (index: number) => {
    const current = [...seedTerms];
    current.splice(index, 1);
    form.setValue("demand_definition.brand_keywords.seed_terms", current, { shouldDirty: true });
  };

  const addCategoryTerm = (value: string) => {
    const current = [...categoryTerms];
    current.push(value);
    form.setValue("demand_definition.non_brand_keywords.category_terms", current, { shouldDirty: true });
  };

  const removeCategoryTerm = (index: number) => {
    const current = [...categoryTerms];
    current.splice(index, 1);
    form.setValue("demand_definition.non_brand_keywords.category_terms", current, { shouldDirty: true });
  };

  const addProblemTerm = (value: string) => {
    const current = [...problemTerms];
    current.push(value);
    form.setValue("demand_definition.non_brand_keywords.problem_terms", current, { shouldDirty: true });
  };

  const removeProblemTerm = (index: number) => {
    const current = [...problemTerms];
    current.splice(index, 1);
    form.setValue("demand_definition.non_brand_keywords.problem_terms", current, { shouldDirty: true });
  };

  return (
    <ContextBlock
      id="demand-definition"
      title="Demand Definition"
      subtitle={`${seedTerms.length} brand terms, ${categoryTerms.length + problemTerms.length} non-brand terms`}
      icon={<TrendingUp className="h-5 w-5" />}
      status={status}
      statusLabel={hasContent ? "Configured" : "Needs terms"}
      defaultExpanded={false}
      onRegenerate={handleRegenerate}
      isRegenerating={isGenerating}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Brand Keywords</span>
            </div>
            <AIGenerateButton
              onClick={handleRegenerate}
              isGenerating={isGenerating}
              disabled={!form.getValues("brand.name")}
            />
          </div>
          <p className="text-xs text-muted-foreground">Seed terms for brand-related keyword expansion</p>
          
          <ChipSection
            title="Seed Terms"
            icon={Tag}
            items={seedTerms}
            onAdd={addSeedTerm}
            onRemove={removeSeedTerm}
            placeholder="Add term..."
            testIdPrefix="seed-term"
          />
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Non-Brand Keywords</span>
          </div>
          
          <ChipSection
            title="Category Terms"
            icon={Tag}
            items={categoryTerms}
            onAdd={addCategoryTerm}
            onRemove={removeCategoryTerm}
            placeholder="Add category..."
            testIdPrefix="category-term"
          />
          
          <ChipSection
            title="Problem Terms"
            icon={Tag}
            items={problemTerms}
            onAdd={addProblemTerm}
            onRemove={removeProblemTerm}
            placeholder="Add problem..."
            testIdPrefix="problem-term"
          />
        </div>
      </div>
    </ContextBlock>
  );
}
