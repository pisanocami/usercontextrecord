/**
 * SectionComparisonCard Component
 * 
 * Collapsible card for comparing a single section across contexts.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
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
import type { SectionComparison } from "@/lib/comparison/types";

interface SectionComparisonCardProps {
  section: SectionComparison;
  defaultOpen?: boolean;
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

export function SectionComparisonCard({ section, defaultOpen = false }: SectionComparisonCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = sectionIcons[section.sectionKey] || FileCheck;

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
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getMatchBadgeVariant(section.overallMatch)}>
                  {section.overallMatch}% match
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {section.matchingFieldsCount}/{section.totalFieldsCount} fields
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
            {section.fields.map((field) => (
              <FieldComparisonRow key={field.fieldKey} field={field} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
