import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";

export interface ClassifiedKeyword {
  keyword: string;
  volume?: number;
  searchVolume?: number;
  kd?: number;
  keywordDifficulty?: number;
  cpc?: number;
  intent?: string;
  intentType?: string;
  theme?: string;
  disposition?: "PASS" | "REVIEW" | "OUT_OF_PLAY";
  status?: "pass" | "review" | "out_of_play";
  capabilityScore?: number;
  opportunityScore?: number;
  finalScore?: number;
  competitorRanks?: Record<string, number>;
}

interface PositioningMapProps {
  keywords: ClassifiedKeyword[];
  title?: string;
  description?: string;
}

const DISPOSITION_COLORS = {
  PASS: "#22c55e",
  REVIEW: "#eab308",
  OUT_OF_PLAY: "#ef4444",
  pass: "#22c55e",
  review: "#eab308",
  out_of_play: "#ef4444",
};

const DISPOSITION_LABELS = {
  PASS: "Aprobado",
  REVIEW: "Revisar",
  OUT_OF_PLAY: "Fuera de juego",
  pass: "Aprobado",
  review: "Revisar",
  out_of_play: "Fuera de juego",
};

function getDisposition(kw: ClassifiedKeyword): string {
  if (kw.disposition) return kw.disposition;
  if (kw.status) return kw.status.toUpperCase().replace("_", "_");
  return "REVIEW";
}

function getVolume(kw: ClassifiedKeyword): number {
  return kw.volume ?? kw.searchVolume ?? 0;
}

function getDifficulty(kw: ClassifiedKeyword): number {
  return kw.kd ?? kw.keywordDifficulty ?? 50;
}

interface TooltipPayloadItem {
  payload: {
    keyword: string;
    volume: number;
    difficulty: number;
    disposition: string;
    cpc?: number;
    theme?: string;
    opportunityScore?: number;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const dispositionLabel = DISPOSITION_LABELS[data.disposition as keyof typeof DISPOSITION_LABELS] || data.disposition;

  return (
    <div className="bg-popover border rounded-md p-3 shadow-lg text-sm">
      <p className="font-medium mb-2">{data.keyword}</p>
      <div className="space-y-1 text-muted-foreground">
        <p>Volumen: <span className="text-foreground font-medium">{data.volume.toLocaleString()}</span></p>
        <p>Dificultad: <span className="text-foreground font-medium">{data.difficulty}</span></p>
        <p>Estado: <Badge 
          className="ml-1 text-xs" 
          style={{ backgroundColor: DISPOSITION_COLORS[data.disposition as keyof typeof DISPOSITION_COLORS] }}
        >
          {dispositionLabel}
        </Badge></p>
        {data.cpc !== undefined && (
          <p>CPC: <span className="text-foreground font-medium">${data.cpc.toFixed(2)}</span></p>
        )}
        {data.theme && (
          <p>Tema: <span className="text-foreground font-medium">{data.theme}</span></p>
        )}
        {data.opportunityScore !== undefined && (
          <p>Oportunidad: <span className="text-foreground font-medium">{Math.round(data.opportunityScore)}</span></p>
        )}
      </div>
    </div>
  );
}

export function PositioningMap({ keywords, title, description }: PositioningMapProps) {
  const [activeDisposition, setActiveDisposition] = useState<string | null>(null);

  const chartData = useMemo(() => {
    return keywords.map((kw) => ({
      keyword: kw.keyword,
      volume: getVolume(kw),
      difficulty: getDifficulty(kw),
      disposition: getDisposition(kw),
      cpc: kw.cpc,
      theme: kw.theme,
      opportunityScore: kw.opportunityScore,
    }));
  }, [keywords]);

  const filteredData = useMemo(() => {
    if (!activeDisposition) return chartData;
    return chartData.filter((d) => d.disposition === activeDisposition);
  }, [chartData, activeDisposition]);

  const dispositionGroups = useMemo(() => {
    const groups: Record<string, typeof chartData> = {};
    chartData.forEach((item) => {
      if (!groups[item.disposition]) groups[item.disposition] = [];
      groups[item.disposition].push(item);
    });
    return groups;
  }, [chartData]);

  if (!keywords.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            {title || "Mapa de Posicionamiento"}
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

  const maxVolume = Math.max(...chartData.map((d) => d.volume));
  const volumeDomain = [0, Math.ceil(maxVolume * 1.1)];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5" />
          {title || "Mapa de Posicionamiento"}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge
            variant={activeDisposition === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setActiveDisposition(null)}
            data-testid="filter-all"
          >
            Todos ({chartData.length})
          </Badge>
          {Object.entries(dispositionGroups).map(([disposition, items]) => (
            <Badge
              key={disposition}
              variant={activeDisposition === disposition ? "default" : "outline"}
              className="cursor-pointer"
              style={activeDisposition === disposition ? { 
                backgroundColor: DISPOSITION_COLORS[disposition as keyof typeof DISPOSITION_COLORS] 
              } : undefined}
              onClick={() => setActiveDisposition(activeDisposition === disposition ? null : disposition)}
              data-testid={`filter-${disposition.toLowerCase()}`}
            >
              {DISPOSITION_LABELS[disposition as keyof typeof DISPOSITION_LABELS] || disposition} ({items.length})
            </Badge>
          ))}
        </div>

        <div className="h-[400px]" data-testid="positioning-map-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                dataKey="volume"
                name="Volumen"
                domain={volumeDomain}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                label={{ value: "Volumen de Busqueda", position: "bottom", offset: 20 }}
                className="text-xs"
              />
              <YAxis
                type="number"
                dataKey="difficulty"
                name="Dificultad"
                domain={[0, 100]}
                label={{ value: "Dificultad (KD)", angle: -90, position: "insideLeft", offset: -10 }}
                className="text-xs"
              />
              <ZAxis range={[50, 200]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: 10 }}
                onClick={(e) => {
                  const value = e.value as string;
                  const disposition = Object.entries(DISPOSITION_LABELS).find(([, label]) => label === value)?.[0];
                  if (disposition) {
                    setActiveDisposition(activeDisposition === disposition ? null : disposition);
                  }
                }}
              />
              {Object.entries(DISPOSITION_COLORS).map(([disposition, color]) => {
                const data = filteredData.filter((d) => d.disposition === disposition);
                if (!data.length) return null;
                return (
                  <Scatter
                    key={disposition}
                    name={DISPOSITION_LABELS[disposition as keyof typeof DISPOSITION_LABELS] || disposition}
                    data={data}
                    fill={color}
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={color}
                        opacity={activeDisposition && activeDisposition !== disposition ? 0.2 : 0.8}
                      />
                    ))}
                  </Scatter>
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 text-xs text-muted-foreground text-center">
          Haz clic en la leyenda o los filtros para resaltar por clasificacion
        </div>
      </CardContent>
    </Card>
  );
}
