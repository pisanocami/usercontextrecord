import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Loader2,
  Check,
  Info,
  ChevronRight,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SWOTItem {
  title: string;
  description: string;
  evidence: string[];
  impact: "high" | "medium" | "low";
  relatedKeywords?: string[];
  relatedCompetitors?: string[];
}

interface SWOTAnalysis {
  id: string;
  configurationId: number;
  configurationName: string;
  generatedAt: string;
  strengths: SWOTItem[];
  weaknesses: SWOTItem[];
  opportunities: SWOTItem[];
  threats: SWOTItem[];
  summary: string;
  recommendations: string[];
  dataSourcesUsed: string[];
}

interface SWOTResponse {
  analysis: SWOTAnalysis | null;
  markdown?: string;
  history?: Array<{ id: number; generatedAt: string; executionTimeMs: number }>;
}

interface GenerateResponse {
  success: boolean;
  analysis: SWOTAnalysis;
  markdown: string;
  executionTimeMs: number;
}

const QUADRANT_STYLES = {
  strengths: {
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
    title: "text-green-700 dark:text-green-400",
    icon: TrendingUp,
    label: "Fortalezas",
    badgeBg: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300",
  },
  weaknesses: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    title: "text-red-700 dark:text-red-400",
    icon: TrendingDown,
    label: "Debilidades",
    badgeBg: "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300",
  },
  opportunities: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    title: "text-blue-700 dark:text-blue-400",
    icon: Target,
    label: "Oportunidades",
    badgeBg: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
  },
  threats: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    title: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
    label: "Amenazas",
    badgeBg: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
  },
};

function getImpactBadgeVariant(impact: "high" | "medium" | "low") {
  switch (impact) {
    case "high":
      return "destructive" as const;
    case "medium":
      return "secondary" as const;
    case "low":
      return "outline" as const;
  }
}

function getImpactLabel(impact: "high" | "medium" | "low"): string {
  switch (impact) {
    case "high":
      return "Alto";
    case "medium":
      return "Medio";
    case "low":
      return "Bajo";
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface QuadrantCardProps {
  type: keyof typeof QUADRANT_STYLES;
  items: SWOTItem[];
  onItemClick: (item: SWOTItem, type: keyof typeof QUADRANT_STYLES) => void;
}

function QuadrantCard({ type, items, onItemClick }: QuadrantCardProps) {
  const style = QUADRANT_STYLES[type];
  const Icon = style.icon;

  return (
    <Card className={`${style.bg} ${style.border} overflow-hidden`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-lg ${style.title}`}>
          <Icon className="h-5 w-5" />
          {style.label}
          <Badge variant="outline" className={style.badgeBg}>
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No se identificaron elementos en esta categoria.
          </p>
        ) : (
          items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onItemClick(item, type)}
              className="w-full text-left p-3 rounded-md bg-background/80 hover-elevate border border-transparent hover:border-border transition-colors"
              data-testid={`swot-item-${type}-${idx}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={getImpactBadgeVariant(item.impact)} className="text-xs">
                    {getImpactLabel(item.impact)}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface ItemDetailModalProps {
  item: SWOTItem | null;
  type: keyof typeof QUADRANT_STYLES | null;
  open: boolean;
  onClose: () => void;
}

function ItemDetailModal({ item, type, open, onClose }: ItemDetailModalProps) {
  if (!item || !type) return null;

  const style = QUADRANT_STYLES[type];
  const Icon = style.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${style.title}`}>
            <Icon className="h-5 w-5" />
            {item.title}
          </DialogTitle>
          <DialogDescription className="pt-2">{item.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Impacto:</span>
            <Badge variant={getImpactBadgeVariant(item.impact)}>
              {getImpactLabel(item.impact)}
            </Badge>
          </div>

          {item.evidence.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Evidencia</h4>
              <ul className="space-y-1.5">
                {item.evidence.map((e, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.relatedKeywords && item.relatedKeywords.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Keywords Relacionadas</h4>
              <div className="flex flex-wrap gap-1.5">
                {item.relatedKeywords.map((kw, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {item.relatedCompetitors && item.relatedCompetitors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Competidores Relacionados</h4>
              <div className="flex flex-wrap gap-1.5">
                {item.relatedCompetitors.map((comp, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {comp}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SWOTSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function SWOTAnalysisPage() {
  const params = useParams<{ id: string }>();
  const configId = params.id ? parseInt(params.id, 10) : null;
  const { toast } = useToast();

  const [selectedItem, setSelectedItem] = useState<SWOTItem | null>(null);
  const [selectedType, setSelectedType] = useState<keyof typeof QUADRANT_STYLES | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const {
    data: swotData,
    isLoading,
    error,
  } = useQuery<SWOTResponse>({
    queryKey: ["/api/configurations", configId, "swot-analysis"],
    enabled: !!configId,
  });

  const generateMutation = useMutation<GenerateResponse, Error>({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/configurations/${configId}/swot-analysis`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/configurations", configId, "swot-analysis"] });
      toast({
        title: "Analisis generado",
        description: `Analisis SWOT completado en ${data.executionTimeMs}ms`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el analisis SWOT",
        variant: "destructive",
      });
    },
  });

  const handleItemClick = (item: SWOTItem, type: keyof typeof QUADRANT_STYLES) => {
    setSelectedItem(item);
    setSelectedType(type);
    setModalOpen(true);
  };

  const handleExport = () => {
    if (!swotData?.analysis) return;

    const markdown = generateMarkdown(swotData.analysis);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swot-analysis-${swotData.analysis.configurationName || configId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exportado",
      description: "Analisis SWOT exportado como Markdown",
    });
  };

  if (!configId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">ID de configuracion invalido</p>
      </div>
    );
  }

  const analysis = swotData?.analysis;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">Analisis SWOT</h1>
              {analysis && (
                <p className="text-sm text-muted-foreground">
                  {analysis.configurationName} - Generado {formatDate(analysis.generatedAt)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!analysis}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-regenerate"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {analysis ? "Regenerar" : "Generar Analisis"}
            </Button>
          </div>
        </div>

        {isLoading && <SWOTSkeleton />}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Error al cargar el analisis: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && !analysis && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin analisis SWOT</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Genera un analisis SWOT para obtener una vision estrategica de tu posicion
                competitiva basada en datos de Keyword Gap y tu configuracion UCR.
              </p>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                data-testid="button-generate-first"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Target className="h-4 w-4 mr-2" />
                )}
                Generar Primer Analisis
              </Button>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Resumen Ejecutivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{analysis.summary}</p>
                {analysis.dataSourcesUsed.length > 0 && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <span className="text-xs text-muted-foreground">Fuentes:</span>
                    {analysis.dataSourcesUsed.map((source, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuadrantCard
                type="strengths"
                items={analysis.strengths}
                onItemClick={handleItemClick}
              />
              <QuadrantCard
                type="weaknesses"
                items={analysis.weaknesses}
                onItemClick={handleItemClick}
              />
              <QuadrantCard
                type="opportunities"
                items={analysis.opportunities}
                onItemClick={handleItemClick}
              />
              <QuadrantCard
                type="threats"
                items={analysis.threats}
                onItemClick={handleItemClick}
              />
            </div>

            {analysis.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recomendaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {analysis.recommendations.map((rec, idx) => (
                      <AccordionItem key={idx} value={`rec-${idx}`}>
                        <AccordionTrigger data-testid={`accordion-recommendation-${idx}`}>
                          <span className="text-left">
                            {idx + 1}. {rec.split(".")[0]}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-muted-foreground">{rec}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <ItemDetailModal
          item={selectedItem}
          type={selectedType}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </ScrollArea>
  );
}

function generateMarkdown(analysis: SWOTAnalysis): string {
  const lines: string[] = [];

  lines.push(`# Analisis SWOT: ${analysis.configurationName}`);
  lines.push(`Generado: ${formatDate(analysis.generatedAt)}`);
  lines.push("");

  lines.push("## Resumen Ejecutivo");
  lines.push(analysis.summary);
  lines.push("");

  lines.push("## Fortalezas");
  for (const item of analysis.strengths) {
    lines.push(`### ${item.title} [${item.impact.toUpperCase()}]`);
    lines.push(item.description);
    if (item.evidence.length > 0) {
      lines.push("**Evidencia:**");
      for (const e of item.evidence) {
        lines.push(`- ${e}`);
      }
    }
    lines.push("");
  }

  lines.push("## Debilidades");
  for (const item of analysis.weaknesses) {
    lines.push(`### ${item.title} [${item.impact.toUpperCase()}]`);
    lines.push(item.description);
    if (item.evidence.length > 0) {
      lines.push("**Evidencia:**");
      for (const e of item.evidence) {
        lines.push(`- ${e}`);
      }
    }
    lines.push("");
  }

  lines.push("## Oportunidades");
  for (const item of analysis.opportunities) {
    lines.push(`### ${item.title} [${item.impact.toUpperCase()}]`);
    lines.push(item.description);
    if (item.evidence.length > 0) {
      lines.push("**Evidencia:**");
      for (const e of item.evidence) {
        lines.push(`- ${e}`);
      }
    }
    lines.push("");
  }

  lines.push("## Amenazas");
  for (const item of analysis.threats) {
    lines.push(`### ${item.title} [${item.impact.toUpperCase()}]`);
    lines.push(item.description);
    if (item.evidence.length > 0) {
      lines.push("**Evidencia:**");
      for (const e of item.evidence) {
        lines.push(`- ${e}`);
      }
    }
    lines.push("");
  }

  lines.push("## Recomendaciones");
  for (let i = 0; i < analysis.recommendations.length; i++) {
    lines.push(`${i + 1}. ${analysis.recommendations[i]}`);
  }
  lines.push("");

  lines.push("---");
  lines.push(`**Fuentes de datos:** ${analysis.dataSourcesUsed.join(", ")}`);

  return lines.join("\n");
}
