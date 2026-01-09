import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LayoutGrid } from "lucide-react";
import type { ClassifiedKeyword } from "./positioning-map";

interface CategoryOwnershipHeatmapProps {
  keywords: ClassifiedKeyword[];
  brandDomain: string;
  competitors: string[];
  title?: string;
  description?: string;
  metricType?: "count" | "volume";
}

function getVolume(kw: ClassifiedKeyword): number {
  return kw.volume ?? kw.searchVolume ?? 0;
}

function getTheme(kw: ClassifiedKeyword): string {
  return kw.theme || "Sin categoria";
}

function getHeatmapColor(value: number, maxValue: number): string {
  if (maxValue === 0) return "hsl(var(--muted))";
  const ratio = value / maxValue;
  if (ratio === 0) return "hsl(var(--muted))";
  if (ratio < 0.2) return "hsl(142 76% 90%)";
  if (ratio < 0.4) return "hsl(142 76% 75%)";
  if (ratio < 0.6) return "hsl(142 76% 55%)";
  if (ratio < 0.8) return "hsl(142 76% 40%)";
  return "hsl(142 76% 30%)";
}

function getTextColor(value: number, maxValue: number): string {
  if (maxValue === 0) return "hsl(var(--muted-foreground))";
  const ratio = value / maxValue;
  return ratio >= 0.5 ? "white" : "hsl(var(--foreground))";
}

export function CategoryOwnershipHeatmap({
  keywords,
  brandDomain,
  competitors,
  title,
  description,
  metricType = "count",
}: CategoryOwnershipHeatmapProps) {
  const { themes, columns, heatmapData, maxValue } = useMemo(() => {
    const themesSet = new Set<string>();
    const themeStats: Record<string, Record<string, { count: number; volume: number }>> = {};

    keywords.forEach((kw) => {
      const theme = getTheme(kw);
      themesSet.add(theme);
      if (!themeStats[theme]) themeStats[theme] = {};

      const competitors = kw.competitorRanks ? Object.keys(kw.competitorRanks) : [];
      competitors.forEach((domain) => {
        if (!themeStats[theme][domain]) {
          themeStats[theme][domain] = { count: 0, volume: 0 };
        }
        themeStats[theme][domain].count += 1;
        themeStats[theme][domain].volume += getVolume(kw);
      });

      if (!themeStats[theme][brandDomain]) {
        themeStats[theme][brandDomain] = { count: 0, volume: 0 };
      }
      themeStats[theme][brandDomain].count += 1;
      themeStats[theme][brandDomain].volume += getVolume(kw);
    });

    const allColumns = [brandDomain, ...competitors.filter((c) => c !== brandDomain)].slice(0, 6);
    const sortedThemes = Array.from(themesSet).sort((a, b) => {
      const aTotal = Object.values(themeStats[a] || {}).reduce(
        (sum, s) => sum + (metricType === "count" ? s.count : s.volume),
        0
      );
      const bTotal = Object.values(themeStats[b] || {}).reduce(
        (sum, s) => sum + (metricType === "count" ? s.count : s.volume),
        0
      );
      return bTotal - aTotal;
    }).slice(0, 10);

    let max = 0;
    sortedThemes.forEach((theme) => {
      allColumns.forEach((col) => {
        const stats = themeStats[theme]?.[col];
        const value = stats ? (metricType === "count" ? stats.count : stats.volume) : 0;
        if (value > max) max = value;
      });
    });

    return {
      themes: sortedThemes,
      columns: allColumns,
      heatmapData: themeStats,
      maxValue: max,
    };
  }, [keywords, brandDomain, competitors, metricType]);

  if (!keywords.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            {title || "Dominio por Categoria"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No hay datos para visualizar
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          {title || "Dominio por Categoria"}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto" data-testid="category-heatmap">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 border-b font-medium text-muted-foreground">
                  Tema / Categoria
                </th>
                {columns.map((col, i) => (
                  <th
                    key={col}
                    className={`text-center p-2 border-b font-medium ${i === 0 ? "bg-primary/10" : ""}`}
                    title={col}
                  >
                    <span className="block max-w-[80px] truncate text-xs">
                      {col.replace(/^www\./, "").split(".")[0]}
                    </span>
                    {i === 0 && (
                      <span className="text-xs text-primary font-normal block">Brand</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {themes.map((theme) => (
                <tr key={theme} className="border-b border-muted/50">
                  <td className="p-2 font-medium text-sm max-w-[200px] truncate" title={theme}>
                    {theme}
                  </td>
                  {columns.map((col, i) => {
                    const stats = heatmapData[theme]?.[col];
                    const value = stats ? (metricType === "count" ? stats.count : stats.volume) : 0;
                    const displayValue = metricType === "volume" && value >= 1000 
                      ? `${(value / 1000).toFixed(1)}K` 
                      : value.toString();

                    return (
                      <TooltipProvider key={col}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <td
                              className={`text-center p-2 cursor-default transition-colors ${i === 0 ? "border-l-2 border-l-primary" : ""}`}
                              style={{
                                backgroundColor: getHeatmapColor(value, maxValue),
                                color: getTextColor(value, maxValue),
                              }}
                              data-testid={`heatmap-cell-${theme}-${col}`}
                            >
                              {value > 0 ? displayValue : "-"}
                            </td>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <p className="font-medium">{theme}</p>
                              <p className="text-muted-foreground">{col}</p>
                              <div className="border-t mt-1 pt-1">
                                <p>Keywords: {stats?.count ?? 0}</p>
                                <p>Volumen: {(stats?.volume ?? 0).toLocaleString()}</p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Intensidad:</span>
            <div className="flex gap-1">
              <div className="w-6 h-4 rounded" style={{ backgroundColor: "hsl(142 76% 90%)" }} />
              <div className="w-6 h-4 rounded" style={{ backgroundColor: "hsl(142 76% 75%)" }} />
              <div className="w-6 h-4 rounded" style={{ backgroundColor: "hsl(142 76% 55%)" }} />
              <div className="w-6 h-4 rounded" style={{ backgroundColor: "hsl(142 76% 40%)" }} />
              <div className="w-6 h-4 rounded" style={{ backgroundColor: "hsl(142 76% 30%)" }} />
            </div>
            <span>Mayor dominio</span>
          </div>
          <span>Mostrando top 10 categorias por {metricType === "count" ? "cantidad" : "volumen"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
