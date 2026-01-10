import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  Target,
  Zap,
  Users,
  ArrowLeft,
  Radio,
  FileText,
  Search,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CompetitiveSignal {
  id: number;
  userId: string;
  configurationId: number;
  signalType: "ranking_shift" | "new_keyword" | "demand_inflection" | "new_content" | "serp_entrant";
  severity: "low" | "medium" | "high" | "critical";
  competitor: string | null;
  keyword: string | null;
  title: string;
  description: string;
  impact: string | null;
  recommendation: string | null;
  changeData: Record<string, any>;
  dismissed: boolean;
  created_at: string;
}

interface WeeklyDigest {
  period: string;
  totalSignals: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  topSignals: CompetitiveSignal[];
  competitorsActive: string[];
}

interface Configuration {
  id: number;
  name: string;
  brand: { domain: string; name: string };
}

type SignalType = "ranking_shift" | "new_keyword" | "demand_inflection" | "new_content" | "serp_entrant";
type Severity = "low" | "medium" | "high" | "critical";

const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  ranking_shift: "Cambio de Ranking",
  new_keyword: "Nuevo Keyword",
  demand_inflection: "Cambio de Demanda",
  new_content: "Nuevo Contenido",
  serp_entrant: "Nuevo Competidor en SERP",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

function getSeverityBadgeClass(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700";
    case "high":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-300 dark:border-orange-700";
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700";
    case "low":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-600";
  }
}

function getSignalTypeIcon(type: SignalType) {
  switch (type) {
    case "ranking_shift":
      return TrendingUp;
    case "new_keyword":
      return Search;
    case "demand_inflection":
      return TrendingDown;
    case "new_content":
      return FileText;
    case "serp_entrant":
      return Users;
    default:
      return AlertCircle;
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function SignalCard({
  signal,
  onDismiss,
  isDismissing,
}: {
  signal: CompetitiveSignal;
  onDismiss: (id: number) => void;
  isDismissing: boolean;
}) {
  const Icon = getSignalTypeIcon(signal.signalType);

  return (
    <Card
      className={`relative ${signal.dismissed ? "opacity-50" : ""}`}
      data-testid={`card-signal-${signal.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className={`text-xs ${getSeverityBadgeClass(signal.severity)}`}>
              {SEVERITY_LABELS[signal.severity]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {SIGNAL_TYPE_LABELS[signal.signalType]}
            </Badge>
          </div>
          {!signal.dismissed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDismiss(signal.id)}
              disabled={isDismissing}
              data-testid={`button-dismiss-${signal.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardTitle className="text-base">{signal.title}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {formatDate(signal.created_at)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{signal.description}</p>

        {signal.impact && (
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Impacto: </span>
            <span>{signal.impact}</span>
          </div>
        )}

        {signal.recommendation && (
          <div className="text-sm">
            <span className="font-medium text-muted-foreground">Recomendación: </span>
            <span>{signal.recommendation}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap pt-2">
          {signal.competitor && (
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {signal.competitor}
            </Badge>
          )}
          {signal.keyword && (
            <Badge variant="secondary" className="text-xs">
              <Search className="h-3 w-3 mr-1" />
              {signal.keyword}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyDigestSection({ digest }: { digest: WeeklyDigest | null }) {
  if (!digest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Resumen Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No hay datos de digest disponibles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card data-testid="card-weekly-digest">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Resumen Semanal
          </CardTitle>
          <CardDescription>{digest.period}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{digest.totalSignals}</div>
              <div className="text-xs text-muted-foreground">Señales Totales</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{digest.competitorsActive.length}</div>
              <div className="text-xs text-muted-foreground">Competidores Activos</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {(digest.bySeverity.critical || 0) + (digest.bySeverity.high || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Alta Prioridad</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {digest.bySeverity.low || 0}
              </div>
              <div className="text-xs text-muted-foreground">Baja Prioridad</div>
            </div>
          </div>

          {digest.competitorsActive.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Competidores Activos:</p>
              <div className="flex flex-wrap gap-2">
                {digest.competitorsActive.map((competitor) => (
                  <Badge key={competitor} variant="outline">
                    {competitor}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {Object.keys(digest.byType).length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Por Tipo de Señal:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(digest.byType).map(([type, count]) => (
                  <Badge key={type} variant="secondary">
                    {SIGNAL_TYPE_LABELS[type as SignalType] || type}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {digest.topSignals && digest.topSignals.length > 0 && (
        <Card data-testid="card-top-signals">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Lo que debes saber esta semana
            </CardTitle>
            <CardDescription>
              Las {digest.topSignals.length} señales más importantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {digest.topSignals.map((signal, index) => (
              <div
                key={signal.id}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                data-testid={`top-signal-${index}`}
              >
                <Badge
                  variant="outline"
                  className={`shrink-0 ${getSeverityBadgeClass(signal.severity)}`}
                >
                  {index + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{signal.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {signal.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {SIGNAL_TYPE_LABELS[signal.signalType]}
                    </Badge>
                    {signal.competitor && (
                      <span className="text-xs text-muted-foreground">
                        {signal.competitor}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CompetitiveRadarPage() {
  const { id } = useParams<{ id: string }>();
  const isLatest = id === "latest";
  const { toast } = useToast();

  const [signalTypeFilter, setSignalTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Fetch all configurations if "latest" is used
  const { data: allConfigs, isLoading: isLoadingAll } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
    enabled: isLatest,
  });

  // Resolve the actual config ID
  const configId = isLatest && allConfigs?.length ? allConfigs[0].id : (id && !isLatest ? parseInt(id, 10) : 0);

  const { data: config, isLoading: configLoading } = useQuery<Configuration>({
    queryKey: ["/api/configurations", configId],
    enabled: configId > 0,
  });

  const {
    data: signals,
    isLoading: signalsLoading,
    refetch: refetchSignals,
  } = useQuery<CompetitiveSignal[]>({
    queryKey: ["/api/configurations", configId, "competitive-signals"],
    queryFn: async () => {
      const res = await fetch(`/api/configurations/${configId}/competitive-signals`);
      if (!res.ok) throw new Error("Failed to fetch signals");
      return res.json();
    },
    enabled: configId > 0,
  });

  const { data: digest, isLoading: digestLoading } = useQuery<WeeklyDigest>({
    queryKey: ["/api/configurations", configId, "competitive-signals", "digest"],
    queryFn: async () => {
      const res = await fetch(`/api/configurations/${configId}/competitive-signals/digest`);
      if (!res.ok) throw new Error("Failed to fetch digest");
      return res.json();
    },
    enabled: configId > 0,
  });

  const detectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/configurations/${configId}/competitive-signals/detect`);
    },
    onSuccess: () => {
      toast({
        title: "Detección iniciada",
        description: "Buscando nuevas señales competitivas...",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/configurations", configId, "competitive-signals"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/configurations", configId, "competitive-signals", "digest"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo ejecutar la detección",
        variant: "destructive",
      });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (signalId: number) => {
      return apiRequest(
        "POST",
        `/api/competitive-signals/${signalId}/dismiss`
      );
    },
    onSuccess: () => {
      toast({
        title: "Señal descartada",
        description: "La señal ha sido marcada como descartada",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/configurations", configId, "competitive-signals"],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo descartar la señal",
        variant: "destructive",
      });
    },
  });

  const filteredSignals =
    signals?.filter((signal) => {
      if (signal.dismissed) return false;
      if (signalTypeFilter !== "all" && signal.signalType !== signalTypeFilter) return false;
      if (severityFilter !== "all") {
        const minSeverityIndex = SEVERITY_ORDER.indexOf(severityFilter as Severity);
        const signalSeverityIndex = SEVERITY_ORDER.indexOf(signal.severity);
        if (signalSeverityIndex > minSeverityIndex) return false;
      }
      return true;
    }) || [];

  const isLoading = configLoading || signalsLoading || digestLoading || (isLatest && isLoadingAll);

  // Wait for configs to load when using "latest"
  if (isLatest && isLoadingAll) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!configId || configId <= 0) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No hay configuraciones disponibles</p>
        <Link href="/new">
          <Button>Crear nueva configuración</Button>
        </Link>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-6xl py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Target className="h-6 w-6" />
                Radar Competitivo
              </h1>
              {config && (
                <p className="text-sm text-muted-foreground">
                  {config.name} • {config.brand?.name || config.brand?.domain}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={() => detectMutation.mutate()}
            disabled={detectMutation.isPending}
            data-testid="button-detect"
          >
            {detectMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Detectar Señales
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        ) : (
          <>
            <WeeklyDigestSection digest={digest || null} />

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Tipo:</span>
                <Select value={signalTypeFilter} onValueChange={setSignalTypeFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-signal-type">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="ranking_shift">Cambio de Ranking</SelectItem>
                    <SelectItem value="new_keyword">Nuevo Keyword</SelectItem>
                    <SelectItem value="demand_inflection">Cambio de Demanda</SelectItem>
                    <SelectItem value="new_content">Nuevo Contenido</SelectItem>
                    <SelectItem value="serp_entrant">Nuevo Competidor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Severidad mínima:</span>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-severity">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="low">Bajo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto text-sm text-muted-foreground">
                {filteredSignals.length} señal{filteredSignals.length !== 1 ? "es" : ""} encontrada
                {filteredSignals.length !== 1 ? "s" : ""}
              </div>
            </div>

            {filteredSignals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">Sin señales activas</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                    No hay señales competitivas que coincidan con los filtros seleccionados.
                    Ejecuta una detección para buscar nuevas señales.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="signals-grid">
                {filteredSignals.map((signal) => (
                  <SignalCard
                    key={signal.id}
                    signal={signal}
                    onDismiss={(id) => dismissMutation.mutate(id)}
                    isDismissing={dismissMutation.isPending}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
