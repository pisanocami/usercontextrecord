/**
 * ComparisonToolbar Component
 * 
 * Toolbar with filters, view mode toggle, and export options.
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Filter, Eye, EyeOff } from "lucide-react";
import type { SectionKey, ComparisonSettings } from "@/lib/comparison/types";
import { SECTION_DEFINITIONS } from "@/lib/comparison/types";

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
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg mb-6">
      <div className="flex items-center gap-4">
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Overall Similarity:</span>
          <Badge
            variant={
              overallSimilarity >= 70
                ? "default"
                : overallSimilarity >= 40
                ? "secondary"
                : "destructive"
            }
          >
            {overallSimilarity}%
          </Badge>
        </div>

        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        )}
      </div>
    </div>
  );
}
