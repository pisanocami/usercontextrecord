/**
 * ComparisonToolbar Component
 * 
 * CMO-grade toolbar with strategic filters, field visibility controls, and export options.
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Filter, Eye, EyeOff, EyeIcon } from "lucide-react";
import type { SectionKey, ComparisonSettings, ComparisonPurpose } from "@/lib/comparison/types";
import { SECTION_DEFINITIONS } from "@/lib/comparison/types";
import { ComparisonPurposeSelector } from "./ComparisonPurposeSelector";

interface ComparisonToolbarProps {
  settings: ComparisonSettings;
  onSettingsChange: (settings: Partial<ComparisonSettings>) => void;
  overallSimilarity: number;
  onExport?: () => void;
}

export function ComparisonToolbar({
  settings,
  onSettingsChange,
  overallSimilarity,
  onExport,
}: ComparisonToolbarProps) {
  return (
    <div className="space-y-4">
      {/* Purpose Selector Row */}
      <div className="p-4 bg-muted/30 rounded-lg">
        <ComparisonPurposeSelector
          value={settings.comparisonPurpose}
          onChange={(purpose) => onSettingsChange({ comparisonPurpose: purpose })}
          compact
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Section Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={settings.sections.length === 8 ? "all" : settings.sections[0] || "all"}
              onValueChange={(value) => {
                if (value === "all") {
                  onSettingsChange({
                    sections: SECTION_DEFINITIONS.map((s) => s.key),
                  });
                } else {
                  onSettingsChange({
                    sections: [value as SectionKey],
                  });
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {SECTION_DEFINITIONS.map((section) => (
                  <SelectItem key={section.key} value={section.key}>
                    {section.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Highlight Mode */}
          <div className="flex items-center gap-2">
            <Select
              value={settings.highlightMode}
              onValueChange={(value) =>
                onSettingsChange({
                  highlightMode: value as ComparisonSettings["highlightMode"],
                })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Highlight mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Show All</SelectItem>
                <SelectItem value="differences">Differences Only</SelectItem>
                <SelectItem value="matches">Matches Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show Unique Fields Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border">
            <Switch
              id="show-unique"
              checked={settings.showUniqueFields}
              onCheckedChange={(checked) => onSettingsChange({ showUniqueFields: checked })}
            />
            <Label htmlFor="show-unique" className="text-sm cursor-pointer">
              <EyeIcon className="h-3.5 w-3.5 inline mr-1" />
              Show unique fields
            </Label>
          </div>

          {/* Insights Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSettingsChange({ showInsights: !settings.showInsights })}
          >
            {settings.showInsights ? (
              <>
                <Eye className="h-4 w-4 mr-1" />
                Insights On
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Insights Off
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Competitive Intensity Badge (replacing Overall Similarity) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Competitive Intensity:</span>
            <Badge
              variant={
                overallSimilarity >= 70
                  ? "destructive"
                  : overallSimilarity >= 40
                  ? "secondary"
                  : "default"
              }
            >
              {overallSimilarity < 30 ? "Low" : overallSimilarity < 60 ? "Medium" : "High"}
            </Badge>
          </div>

          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-1" />
              Export Brief
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
