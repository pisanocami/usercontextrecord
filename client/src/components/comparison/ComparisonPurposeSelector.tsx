/**
 * ComparisonPurposeSelector Component
 * 
 * Allows users to select the strategic purpose of their comparison,
 * which determines which fields are most relevant to show.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, TrendingUp, BarChart3, Briefcase } from "lucide-react";
import type { ComparisonPurpose } from "@/lib/comparison/types";

interface ComparisonPurposeSelectorProps {
  value: ComparisonPurpose;
  onChange: (purpose: ComparisonPurpose) => void;
  compact?: boolean;
}

const PURPOSE_OPTIONS: {
  value: ComparisonPurpose;
  label: string;
  description: string;
  icon: React.ReactNode;
  focusAreas: string[];
}[] = [
  {
    value: "threat_analysis",
    label: "Threat Analysis",
    description: "Is this brand a threat to my market position?",
    icon: <Shield className="h-5 w-5" />,
    focusAreas: ["Keyword overlap", "Audience overlap", "Channel conflict"],
  },
  {
    value: "expansion_research",
    label: "Market Expansion",
    description: "Should I enter their market or adjacent segments?",
    icon: <TrendingUp className="h-5 w-5" />,
    focusAreas: ["Category gaps", "Geographic opportunities", "Positioning"],
  },
  {
    value: "benchmarking",
    label: "Strategic Benchmarking",
    description: "What can I learn from their strategy?",
    icon: <BarChart3 className="h-5 w-5" />,
    focusAreas: ["Channel mix", "Investment levels", "Goal alignment"],
  },
  {
    value: "portfolio_analysis",
    label: "Portfolio Analysis",
    description: "How do my own brands relate to each other?",
    icon: <Briefcase className="h-5 w-5" />,
    focusAreas: ["Cannibalization risk", "Coverage gaps", "Synergies"],
  },
];

export function ComparisonPurposeSelector({
  value,
  onChange,
  compact = false,
}: ComparisonPurposeSelectorProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Purpose:</Label>
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as ComparisonPurpose)}
          className="flex gap-2"
        >
          {PURPOSE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center">
              <RadioGroupItem
                value={option.value}
                id={`purpose-${option.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`purpose-${option.value}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer
                  peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground
                  peer-data-[state=checked]:border-primary hover:bg-muted transition-colors text-sm"
              >
                {option.icon}
                <span className="hidden sm:inline">{option.label}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">What's your strategic objective?</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ComparisonPurpose)}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {PURPOSE_OPTIONS.map((option) => (
          <div key={option.value}>
            <RadioGroupItem
              value={option.value}
              id={`purpose-card-${option.value}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`purpose-card-${option.value}`}
              className="cursor-pointer"
            >
              <Card className="peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground">
                      {option.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{option.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {option.focusAreas.map((area) => (
                          <span
                            key={area}
                            className="text-[10px] px-1.5 py-0.5 bg-muted rounded"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
