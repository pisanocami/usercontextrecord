import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PositioningMap, type ClassifiedKeyword } from "./positioning-map";
import { CategoryOwnershipHeatmap } from "./category-ownership-heatmap";
import { OpportunityQuadrant } from "./opportunity-quadrant";
import {
  BarChart3,
  Target,
  LayoutGrid,
  Grid3X3,
  Filter,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";

interface KeywordGapVisualizationsProps {
  keywords: ClassifiedKeyword[];
  brandDomain: string;
  competitors: string[];
  title?: string;
}

type DispositionFilter = "all" | "pass" | "review" | "out_of_play";

function getDisposition(kw: ClassifiedKeyword): string {
  if (kw.disposition) return kw.disposition.toLowerCase();
  if (kw.status) return kw.status.toLowerCase().replace("_", "_");
  return "review";
}

function getVolume(kw: ClassifiedKeyword): number {
  return kw.volume ?? kw.searchVolume ?? 0;
}

function getDifficulty(kw: ClassifiedKeyword): number {
  return kw.kd ?? kw.keywordDifficulty ?? 50;
}

export function KeywordGapVisualizations({
  keywords,
  brandDomain,
  competitors,
  title,
}: KeywordGapVisualizationsProps) {
  const [activeTab, setActiveTab] = useState("positioning");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dispositionFilter, setDispositionFilter] = useState<DispositionFilter>("all");
  const [minVolume, setMinVolume] = useState(0);
  const [maxDifficulty, setMaxDifficulty] = useState(100);
  const [heatmapMetric, setHeatmapMetric] = useState<"count" | "volume">("count");

  const { filteredKeywords, stats, maxVolumeInData } = useMemo(() => {
    const maxVol = Math.max(...keywords.map(getVolume), 0);
    
    const filtered = keywords.filter((kw) => {
      const disposition = getDisposition(kw);
      if (dispositionFilter !== "all" && disposition !== dispositionFilter) return false;
      if (getVolume(kw) < minVolume) return false;
      if (getDifficulty(kw) > maxDifficulty) return false;
      return true;
    });

    const stats = {
      total: keywords.length,
      filtered: filtered.length,
      pass: keywords.filter((kw) => getDisposition(kw) === "pass").length,
      review: keywords.filter((kw) => getDisposition(kw) === "review").length,
      outOfPlay: keywords.filter((kw) => getDisposition(kw) === "out_of_play").length,
    };

    return { filteredKeywords: filtered, stats, maxVolumeInData: maxVol };
  }, [keywords, dispositionFilter, minVolume, maxDifficulty]);

  const resetFilters = () => {
    setDispositionFilter("all");
    setMinVolume(0);
    setMaxDifficulty(100);
  };

  const hasActiveFilters = dispositionFilter !== "all" || minVolume > 0 || maxDifficulty < 100;

  if (!keywords.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Visualizaciones de Gap Competitivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-center">No hay datos de keywords para visualizar</p>
            <p className="text-sm text-center mt-2">
              Ejecuta un analisis de Keyword Gap para ver las visualizaciones
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="keyword-gap-visualizations">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {title || "Visualizaciones de Gap Competitivo"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredKeywords.length} de {keywords.length} keywords
              </Badge>
              <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="btn-toggle-filters">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filtros
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Activos
                      </Badge>
                    )}
                    {filtersOpen ? (
                      <ChevronUp className="h-4 w-4 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
          </div>
        </CardHeader>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <CardContent className="border-t pt-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Clasificacion</Label>
                  <Select
                    value={dispositionFilter}
                    onValueChange={(v) => setDispositionFilter(v as DispositionFilter)}
                  >
                    <SelectTrigger data-testid="select-disposition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas ({stats.total})</SelectItem>
                      <SelectItem value="pass">Aprobado ({stats.pass})</SelectItem>
                      <SelectItem value="review">Revisar ({stats.review})</SelectItem>
                      <SelectItem value="out_of_play">Fuera de juego ({stats.outOfPlay})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Volumen minimo</Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {minVolume.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={[minVolume]}
                    onValueChange={(v) => setMinVolume(v[0])}
                    min={0}
                    max={maxVolumeInData}
                    step={Math.max(10, Math.floor(maxVolumeInData / 100))}
                    data-testid="slider-min-volume"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Dificultad maxima</Label>
                    <span className="text-xs font-mono text-muted-foreground">{maxDifficulty}</span>
                  </div>
                  <Slider
                    value={[maxDifficulty]}
                    onValueChange={(v) => setMaxDifficulty(v[0])}
                    min={0}
                    max={100}
                    step={5}
                    data-testid="slider-max-difficulty"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    disabled={!hasActiveFilters}
                    data-testid="btn-reset-filters"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Limpiar filtros
                  </Button>
                </div>
              </div>

              {activeTab === "heatmap" && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <Label className="text-xs">Metrica del heatmap:</Label>
                    <Select
                      value={heatmapMetric}
                      onValueChange={(v) => setHeatmapMetric(v as "count" | "volume")}
                    >
                      <SelectTrigger className="w-40" data-testid="select-heatmap-metric">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Cantidad de keywords</SelectItem>
                        <SelectItem value="volume">Volumen total</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="positioning" className="flex items-center gap-2" data-testid="tab-positioning">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Posicionamiento</span>
            <span className="sm:hidden">Pos.</span>
          </TabsTrigger>
          <TabsTrigger value="quadrant" className="flex items-center gap-2" data-testid="tab-quadrant">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Cuadrantes</span>
            <span className="sm:hidden">Cuad.</span>
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="flex items-center gap-2" data-testid="tab-heatmap">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Categorias</span>
            <span className="sm:hidden">Cat.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positioning" className="mt-4">
          <PositioningMap
            keywords={filteredKeywords}
            title="Mapa de Posicionamiento Competitivo"
            description="Volumen de busqueda vs. Dificultad de keyword, coloreado por clasificacion"
          />
        </TabsContent>

        <TabsContent value="quadrant" className="mt-4">
          <OpportunityQuadrant
            keywords={filteredKeywords}
            title="Cuadrante de Oportunidades"
            description="Identifica las mejores oportunidades segun score y dificultad"
          />
        </TabsContent>

        <TabsContent value="heatmap" className="mt-4">
          <CategoryOwnershipHeatmap
            keywords={filteredKeywords}
            brandDomain={brandDomain}
            competitors={competitors}
            metricType={heatmapMetric}
            title="Dominio por Categoria"
            description="Quien domina cada tema o categoria"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { PositioningMap } from "./positioning-map";
export { CategoryOwnershipHeatmap } from "./category-ownership-heatmap";
export { OpportunityQuadrant } from "./opportunity-quadrant";
export type { ClassifiedKeyword } from "./positioning-map";
