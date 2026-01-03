import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Search,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  BarChart3,
  Users,
  Minus,
} from "lucide-react";
import { Link } from "wouter";

interface RankedKeyword {
  keyword: string;
  search_volume?: number;
  position?: number;
  position_type?: string;
  cpc?: number;
  competition?: number;
}

interface OverlapKeyword {
  keyword: string;
  brand_position: number;
  competitor_position: number;
  search_volume: number;
  gap: number;
}

interface KeywordGapResult {
  brand_domain: string;
  competitor_domain: string;
  gap_keywords: RankedKeyword[];
  overlap_keywords: OverlapKeyword[];
  total_gap_keywords: number;
  total_overlap_keywords: number;
  ucr_guardrails_applied: boolean;
  configuration_name: string;
}

interface Configuration {
  id: number;
  name: string;
  brand: { domain: string; name: string };
  competitors: { direct: string[]; indirect: string[] };
}

export default function KeywordGap() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [activeTab, setActiveTab] = useState("gap");

  const configId = id ? parseInt(id, 10) : null;

  const { data: statusData, isLoading: statusLoading } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/keyword-gap/status"],
  });

  const { data: config, isLoading: configLoading } = useQuery<Configuration>({
    queryKey: ["/api/configurations", configId],
    enabled: !!configId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (competitor: string) => {
      const response = await apiRequest("POST", "/api/keyword-gap/analyze", {
        configurationId: configId,
        competitorDomain: competitor,
        limit: 100,
      });
      return response.json() as Promise<KeywordGapResult>;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const compareAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/keyword-gap/compare-all", {
        configurationId: configId,
        limit: 50,
      });
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!competitorDomain.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un dominio del competidor",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate(competitorDomain.trim());
  };

  const handleQuickAnalyze = (competitor: string) => {
    setCompetitorDomain(competitor);
    analyzeMutation.mutate(competitor);
  };

  if (statusLoading || configLoading) {
    return (
      <div className="h-full p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!statusData?.configured) {
    return (
      <ScrollArea className="h-full">
        <div className="container max-w-4xl py-6 px-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a configuraciones
            </Button>
          </Link>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                DataForSEO No Configurado
              </CardTitle>
              <CardDescription>
                Para usar el análisis de Keyword Gap, necesitas configurar tus credenciales de DataForSEO.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configura las siguientes variables de entorno:
              </p>
              <div className="bg-muted p-4 rounded-md font-mono text-sm">
                <div>DATAFORSEO_LOGIN=tu_login</div>
                <div>DATAFORSEO_PASSWORD=tu_password</div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Puedes obtener tus credenciales en{" "}
                <a href="https://app.dataforseo.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  app.dataforseo.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  if (!config) {
    return (
      <ScrollArea className="h-full">
        <div className="container max-w-4xl py-6 px-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a configuraciones
            </Button>
          </Link>
          
          <Card>
            <CardHeader>
              <CardTitle>Configuración no encontrada</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  const allCompetitors = [
    ...(config.competitors?.direct || []),
    ...(config.competitors?.indirect || []),
  ].slice(0, 10);

  const result = analyzeMutation.data;

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-6xl py-6 px-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a configuraciones
          </Button>
        </Link>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Keyword Gap Analysis</h1>
            <p className="text-muted-foreground">
              {config.name} - {config.brand.domain}
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            UCR Guardrails Active
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Analizar Competidor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="ejemplo: competitor.com"
                  value={competitorDomain}
                  onChange={(e) => setCompetitorDomain(e.target.value)}
                  data-testid="input-competitor-domain"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  data-testid="button-analyze"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Analizar
                </Button>
              </div>

              {allCompetitors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Competidores configurados:</p>
                  <div className="flex flex-wrap gap-2">
                    {allCompetitors.map((comp) => (
                      <Button
                        key={comp}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAnalyze(comp)}
                        disabled={analyzeMutation.isPending}
                        data-testid={`button-competitor-${comp}`}
                      >
                        {comp}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparar Todos</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => compareAllMutation.mutate()}
                disabled={compareAllMutation.isPending || allCompetitors.length === 0}
                data-testid="button-compare-all"
              >
                {compareAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Analizar {allCompetitors.length} competidores
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Compara tu dominio contra todos los competidores configurados.
              </p>
            </CardContent>
          </Card>
        </div>

        {result && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">
                    {result.brand_domain} vs {result.competitor_domain}
                  </CardTitle>
                  <CardDescription>
                    {result.total_gap_keywords} keywords de brecha, {result.total_overlap_keywords} en común
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    <Target className="h-3 w-3 mr-1" />
                    Gap: {result.total_gap_keywords}
                  </Badge>
                  <Badge variant="outline">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Overlap: {result.total_overlap_keywords}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="gap" data-testid="tab-gap">
                    Keywords de Brecha ({result.gap_keywords.length})
                  </TabsTrigger>
                  <TabsTrigger value="overlap" data-testid="tab-overlap">
                    Keywords en Común ({result.overlap_keywords.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="gap">
                  <p className="text-sm text-muted-foreground mb-4">
                    Keywords donde el competidor rankea pero tu marca no. Oportunidades potenciales de contenido.
                  </p>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Keyword</TableHead>
                          <TableHead className="text-right">Vol. Búsqueda</TableHead>
                          <TableHead className="text-right">Posición Comp.</TableHead>
                          <TableHead className="text-right">CPC</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.gap_keywords.slice(0, 20).map((kw, i) => (
                          <TableRow key={i} data-testid={`row-gap-keyword-${i}`}>
                            <TableCell className="font-medium">{kw.keyword}</TableCell>
                            <TableCell className="text-right">
                              {kw.search_volume?.toLocaleString() || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                #{kw.position || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {kw.cpc ? `$${kw.cpc.toFixed(2)}` : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {result.gap_keywords.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No se encontraron keywords de brecha
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {result.gap_keywords.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Mostrando 20 de {result.gap_keywords.length} keywords
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="overlap">
                  <p className="text-sm text-muted-foreground mb-4">
                    Keywords donde ambos dominios rankean. Gap positivo = tu marca rankea mejor.
                  </p>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Keyword</TableHead>
                          <TableHead className="text-right">Tu Posición</TableHead>
                          <TableHead className="text-right">Pos. Comp.</TableHead>
                          <TableHead className="text-right">Gap</TableHead>
                          <TableHead className="text-right">Vol. Búsqueda</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.overlap_keywords.slice(0, 20).map((kw, i) => (
                          <TableRow key={i} data-testid={`row-overlap-keyword-${i}`}>
                            <TableCell className="font-medium">{kw.keyword}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-xs">
                                #{kw.brand_position}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                #{kw.competitor_position}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {kw.gap > 0 ? (
                                <span className="text-green-600 dark:text-green-400 flex items-center justify-end gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  +{kw.gap}
                                </span>
                              ) : kw.gap < 0 ? (
                                <span className="text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                                  <TrendingDown className="h-3 w-3" />
                                  {kw.gap}
                                </span>
                              ) : (
                                <span className="text-muted-foreground flex items-center justify-end gap-1">
                                  <Minus className="h-3 w-3" />
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {kw.search_volume?.toLocaleString() || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {result.overlap_keywords.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No se encontraron keywords en común
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {result.overlap_keywords.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Mostrando 20 de {result.overlap_keywords.length} keywords
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {compareAllMutation.data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Análisis Multi-Competidor</CardTitle>
              <CardDescription>
                Keywords prioritizadas por frecuencia de aparición entre competidores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-right">Competidores</TableHead>
                      <TableHead className="text-right">Vol. Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(compareAllMutation.data.prioritized_gap_keywords || []).slice(0, 15).map((kw: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{kw.keyword}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{kw.count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {kw.totalVolume?.toLocaleString() || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
