import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Grid3X3 } from "lucide-react";
import type { ClassifiedKeyword } from "./positioning-map";

interface OpportunityQuadrantProps {
  keywords: ClassifiedKeyword[];
  title?: string;
  description?: string;
  opportunityThreshold?: number;
  difficultyThreshold?: number;
}

const QUADRANT_COLORS = {
  SWEET_SPOT: "#10b981",
  CHALLENGE: "#f59e0b",
  EASY_WINS: "#0ea5e9",
  AVOID: "#94a3b8",
};

const QUADRANT_LABELS = {
  SWEET_SPOT: "Sweet Spot",
  CHALLENGE: "Desafio",
  EASY_WINS: "Victorias Faciles",
  AVOID: "Evitar",
};

const QUADRANT_DESCRIPTIONS = {
  SWEET_SPOT: "Alta oportunidad, baja competencia",
  CHALLENGE: "Alta oportunidad, alta competencia",
  EASY_WINS: "Baja oportunidad, baja competencia",
  AVOID: "Baja oportunidad, alta competencia",
};

function getOpportunityScore(kw: ClassifiedKeyword): number {
  return kw.opportunityScore ?? kw.finalScore ?? (kw.volume ?? kw.searchVolume ?? 0) / 100;
}

function getDifficulty(kw: ClassifiedKeyword): number {
  return kw.kd ?? kw.keywordDifficulty ?? 50;
}

function getQuadrant(
  opportunity: number,
  difficulty: number,
  oppThreshold: number,
  diffThreshold: number
): keyof typeof QUADRANT_COLORS {
  const highOpp = opportunity >= oppThreshold;
  const highDiff = difficulty >= diffThreshold;

  if (highOpp && !highDiff) return "SWEET_SPOT";
  if (highOpp && highDiff) return "CHALLENGE";
  if (!highOpp && !highDiff) return "EASY_WINS";
  return "AVOID";
}

interface TooltipPayloadItem {
  payload: {
    keyword: string;
    opportunity: number;
    difficulty: number;
    quadrant: string;
    volume?: number;
    theme?: string;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const quadrantLabel = QUADRANT_LABELS[data.quadrant as keyof typeof QUADRANT_LABELS] || data.quadrant;
  const quadrantDesc = QUADRANT_DESCRIPTIONS[data.quadrant as keyof typeof QUADRANT_DESCRIPTIONS];

  return (
    <div className="bg-popover border rounded-md p-3 shadow-lg text-sm">
      <p className="font-medium mb-2">{data.keyword}</p>
      <div className="space-y-1 text-muted-foreground">
        <p>Oportunidad: <span className="text-foreground font-medium">{Math.round(data.opportunity)}</span></p>
        <p>Dificultad: <span className="text-foreground font-medium">{data.difficulty}</span></p>
        {data.volume !== undefined && (
          <p>Volumen: <span className="text-foreground font-medium">{data.volume.toLocaleString()}</span></p>
        )}
        {data.theme && (
          <p>Tema: <span className="text-foreground font-medium">{data.theme}</span></p>
        )}
        <p className="pt-1 border-t">
          <Badge
            className="text-xs"
            style={{ backgroundColor: QUADRANT_COLORS[data.quadrant as keyof typeof QUADRANT_COLORS] }}
          >
            {quadrantLabel}
          </Badge>
          <span className="ml-2 text-xs">{quadrantDesc}</span>
        </p>
      </div>
    </div>
  );
}

export function OpportunityQuadrant({
  keywords,
  title,
  description,
  opportunityThreshold: initialOppThreshold = 500,
  difficultyThreshold: initialDiffThreshold = 50,
}: OpportunityQuadrantProps) {
  const [oppThreshold, setOppThreshold] = useState(initialOppThreshold);
  const [diffThreshold, setDiffThreshold] = useState(initialDiffThreshold);
  const [activeQuadrant, setActiveQuadrant] = useState<string | null>(null);

  const { chartData, quadrantCounts, maxOpp } = useMemo(() => {
    const data = keywords.map((kw) => {
      const opportunity = getOpportunityScore(kw);
      const difficulty = getDifficulty(kw);
      return {
        keyword: kw.keyword,
        opportunity,
        difficulty,
        quadrant: getQuadrant(opportunity, difficulty, oppThreshold, diffThreshold),
        volume: kw.volume ?? kw.searchVolume,
        theme: kw.theme,
      };
    });

    const counts = {
      SWEET_SPOT: 0,
      CHALLENGE: 0,
      EASY_WINS: 0,
      AVOID: 0,
    };
    data.forEach((d) => counts[d.quadrant]++);

    const max = Math.max(...data.map((d) => d.opportunity), oppThreshold * 2);

    return { chartData: data, quadrantCounts: counts, maxOpp: max };
  }, [keywords, oppThreshold, diffThreshold]);

  const filteredData = useMemo(() => {
    if (!activeQuadrant) return chartData;
    return chartData.filter((d) => d.quadrant === activeQuadrant);
  }, [chartData, activeQuadrant]);

  if (!keywords.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            {title || "Cuadrante de Oportunidades"}
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
          <Grid3X3 className="h-5 w-5" />
          {title || "Cuadrante de Oportunidades"}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {(Object.keys(QUADRANT_COLORS) as Array<keyof typeof QUADRANT_COLORS>).map((quadrant) => (
            <Badge
              key={quadrant}
              variant={activeQuadrant === quadrant ? "default" : "outline"}
              className="cursor-pointer justify-center py-1"
              style={activeQuadrant === quadrant ? { backgroundColor: QUADRANT_COLORS[quadrant] } : undefined}
              onClick={() => setActiveQuadrant(activeQuadrant === quadrant ? null : quadrant)}
              data-testid={`filter-quadrant-${quadrant.toLowerCase()}`}
            >
              {QUADRANT_LABELS[quadrant]} ({quadrantCounts[quadrant]})
            </Badge>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4 p-3 bg-muted/50 rounded-md">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Umbral de Oportunidad</Label>
              <span className="text-xs font-mono text-muted-foreground">{oppThreshold}</span>
            </div>
            <Slider
              value={[oppThreshold]}
              onValueChange={(v) => setOppThreshold(v[0])}
              min={0}
              max={Math.ceil(maxOpp)}
              step={10}
              data-testid="slider-opportunity"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Umbral de Dificultad</Label>
              <span className="text-xs font-mono text-muted-foreground">{diffThreshold}</span>
            </div>
            <Slider
              value={[diffThreshold]}
              onValueChange={(v) => setDiffThreshold(v[0])}
              min={0}
              max={100}
              step={5}
              data-testid="slider-difficulty"
            />
          </div>
        </div>

        <div className="h-[400px]" data-testid="opportunity-quadrant-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                dataKey="opportunity"
                name="Oportunidad"
                domain={[0, Math.ceil(maxOpp * 1.1)]}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                label={{ value: "Score de Oportunidad", position: "bottom", offset: 20 }}
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
              <ReferenceLine
                x={oppThreshold}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <ReferenceLine
                y={diffThreshold}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ paddingBottom: 10 }}
              />
              {(Object.keys(QUADRANT_COLORS) as Array<keyof typeof QUADRANT_COLORS>).map((quadrant) => {
                const data = filteredData.filter((d) => d.quadrant === quadrant);
                if (!data.length) return null;
                return (
                  <Scatter
                    key={quadrant}
                    name={QUADRANT_LABELS[quadrant]}
                    data={data}
                    fill={QUADRANT_COLORS[quadrant]}
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={QUADRANT_COLORS[quadrant]}
                        opacity={activeQuadrant && activeQuadrant !== quadrant ? 0.2 : 0.8}
                      />
                    ))}
                  </Scatter>
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded border-l-4" style={{ borderColor: QUADRANT_COLORS.SWEET_SPOT, backgroundColor: "hsl(142 76% 95%)" }}>
            <p className="font-medium">Sweet Spot</p>
            <p className="text-muted-foreground">Prioridad maxima</p>
          </div>
          <div className="p-2 rounded border-l-4" style={{ borderColor: QUADRANT_COLORS.CHALLENGE, backgroundColor: "hsl(38 92% 95%)" }}>
            <p className="font-medium">Desafio</p>
            <p className="text-muted-foreground">Requiere recursos</p>
          </div>
          <div className="p-2 rounded border-l-4" style={{ borderColor: QUADRANT_COLORS.EASY_WINS, backgroundColor: "hsl(199 89% 95%)" }}>
            <p className="font-medium">Victorias Faciles</p>
            <p className="text-muted-foreground">Quick wins</p>
          </div>
          <div className="p-2 rounded border-l-4" style={{ borderColor: QUADRANT_COLORS.AVOID, backgroundColor: "hsl(215 14% 95%)" }}>
            <p className="font-medium">Evitar</p>
            <p className="text-muted-foreground">Bajo ROI</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
