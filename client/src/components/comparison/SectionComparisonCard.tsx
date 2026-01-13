/**
 * SectionComparisonCard Component
 * 
 * Collapsible card for comparing a single section across contexts.
 * Now with CMO-grade field filtering based on categories.
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, EyeOff } from "lucide-react";
import {
  Building2,
  Layers,
  Users,
  Search,
  Target,
  Megaphone,
  ShieldX,
  FileCheck,
} from "lucide-react";
import { FieldComparisonRow } from "./FieldComparisonRow";
import type { SectionComparison, ComparisonSettings, FieldCategory } from "@/lib/comparison/types";
import { SECTION_DEFINITIONS } from "@/lib/comparison/types";

interface SectionComparisonCardProps {
  section: SectionComparison;
  defaultOpen?: boolean;
  settings?: ComparisonSettings;
}

const sectionIcons: Record<string, React.ElementType> = {
  brand: Building2,
  category_definition: Layers,
  competitors: Users,
  demand_definition: Search,
  strategic_intent: Target,
  channel_context: Megaphone,
  negative_scope: ShieldX,
  governance: FileCheck,
};

function getMatchBadgeVariant(match: number): "default" | "secondary" | "destructive" | "outline" {
  if (match >= 80) return "default";
  if (match >= 50) return "secondary";
  if (match >= 20) return "outline";
  return "destructive";
}

export function SectionComparisonCard({ section, defaultOpen = false, settings }: SectionComparisonCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = sectionIcons[section.sectionKey] || FileCheck;

  // Get field definitions for this section to check categories
  const sectionDef = SECTION_DEFINITIONS.find(s => s.key === section.sectionKey);
  
  // Filter fields based on settings
  const filteredFields = useMemo(() => {
    if (!settings || !sectionDef) return section.fields;
    
    return section.fields.filter(field => {
      const fieldDef = sectionDef.fields.find(f => f.key === field.fieldKey);
      if (!fieldDef) return true;
      
      // If showUniqueFields is false, hide always_unique fields
      if (!settings.showUniqueFields && fieldDef.category === "always_unique") {
        return false;
      }
      
      // If fieldCategories is set, only show fields in those categories
      if (settings.fieldCategories.length > 0) {
        // Always show if showUniqueFields is true and it's unique
        if (settings.showUniqueFields && fieldDef.category === "always_unique") {
          return true;
        }
        return settings.fieldCategories.includes(fieldDef.category);
      }
      
      return true;
    });
  }, [section.fields, settings, sectionDef]);

  // Calculate filtered stats
  const filteredMatchingCount = filteredFields.filter(f => f.matchType === "full").length;
  const hiddenFieldsCount = section.fields.length - filteredFields.length;

  // Don't render if all fields are filtered out
  if (filteredFields.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">{section.sectionTitle}</CardTitle>
                {hiddenFieldsCount > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    {hiddenFieldsCount} hidden
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getMatchBadgeVariant(section.overallMatch)}>
                  {section.overallMatch}% match
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {filteredMatchingCount}/{filteredFields.length} fields
                </span>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {filteredFields.map((field) => (
              <FieldComparisonRow key={field.fieldKey} field={field} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
