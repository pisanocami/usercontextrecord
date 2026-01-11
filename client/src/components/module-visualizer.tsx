
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface VisualSpec {
    kind: "line" | "bar" | "table" | "heatmap" | "matrix" | "card" | "other";
    title: string;
    description?: string;
}

interface ModuleVisualizerProps {
    visuals: VisualSpec[];
    data: any;
}

export function ModuleVisualizer({ visuals, data }: ModuleVisualizerProps) {
    if (!data || !visuals || visuals.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                No visualization data available
            </div>
        );
    }

    // Extract envelope warnings if present (v2 format)
    const warnings = data.envelope?.warnings || [];
    const summary = data.summary || {};
    const items = data.items || [];

    return (
        <div className="grid gap-6">
            {/* Show warnings from envelope */}
            {warnings.length > 0 && (
                <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-400">Avisos del Análisis</AlertTitle>
                    <AlertDescription className="mt-2 space-y-1">
                        {warnings.map((w: any, i: number) => (
                            <div key={i} className="text-sm text-amber-700 dark:text-amber-300">
                                <Badge variant="outline" className="mr-2 text-xs">{w.code}</Badge>
                                {w.message}
                            </div>
                        ))}
                    </AlertDescription>
                </Alert>
            )}

            {/* Show summary metrics if available */}
            {Object.keys(summary).length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Resumen del Análisis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(summary).map(([key, value]) => {
                                if (typeof value === 'object' && !Array.isArray(value)) return null;
                                if (Array.isArray(value) && value.length === 0) return null;
                                const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                                return (
                                    <div key={key} className="rounded-lg border p-3">
                                        <p className="text-xs font-medium text-muted-foreground uppercase truncate">{key.replace(/_/g, ' ')}</p>
                                        <p className="text-lg font-bold truncate" title={displayValue}>{displayValue || '-'}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Render configured visuals */}
            {visuals.map((visual, idx) => (
                <Card key={idx}>
                    <CardHeader>
                        <CardTitle>{visual.title}</CardTitle>
                        {visual.description && <CardDescription>{visual.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                        {renderVisual(visual, data, items, summary)}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function renderVisual(visual: VisualSpec, data: any, items: any[], summary: any) {
    // Defensive check for missing data properties
    // We use items and summary from the v2 format

    switch (visual.kind) {
        case "bar":
            // Expecting array of objects for recharts - use items or fallback to data
            const barData = items.length > 0 ? items : (Array.isArray(data) ? data : (data.chartData || []));
            if (barData.length === 0) return <NoData message="Sin datos para gráfico de barras" />;

            return (
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#8884d8" name="Value" />
                            <Bar dataKey="score" fill="#82ca9d" name="Score" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );

        case "line":
            const lineData = items.length > 0 ? items : (Array.isArray(data) ? data : (data.trendData || data.history || []));
            if (lineData.length === 0) return <NoData message="Sin datos de tendencia" />;

            return (
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            );

        case "table":
            const tableRows = items.length > 0 ? items : (Array.isArray(data) ? data : (data.rows || []));
            if (tableRows.length === 0) return <NoData message="Sin datos tabulares" />;

            // Extract headers from first Item
            const headers = Object.keys(tableRows[0]).filter(k => typeof tableRows[0][k] !== 'object');

            return (
                <Table>
                    <TableHeader>
                        <TableRow>
                            {headers.map(h => <TableHead key={h} className="capitalize">{h.replace(/_/g, ' ')}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableRows.slice(0, 10).map((row: any, i: number) => (
                            <TableRow key={i}>
                                {headers.map(h => (
                                    <TableCell key={h}>
                                        {typeof row[h] === 'boolean' ? (row[h] ? 'Yes' : 'No') : row[h]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );

        case "card":
            // For summary statistics - use summary from v2 format
            const cardData = Object.keys(summary).length > 0 ? summary : data;
            const entries = Object.entries(cardData).filter(([_, v]) => typeof v !== 'object' || Array.isArray(v));
            if (entries.length === 0) return <NoData message="Sin métricas de resumen" />;
            
            return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {entries.map(([key, value]) => {
                        if (typeof value === 'object' && !Array.isArray(value)) return null;
                        const displayValue = Array.isArray(value) ? (value.length > 0 ? value.join(', ') : '-') : String(value);
                        return (
                            <div key={key} className="rounded-lg border p-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</p>
                                <p className="text-2xl font-bold">{displayValue}</p>
                            </div>
                        );
                    })}
                </div>
            );

        case "matrix":
        case "heatmap":
            // Placeholder for matrix/heatmap visualizations
            return (
                <div className="p-4 bg-muted/50 rounded-md text-center">
                    <p className="text-sm text-muted-foreground">
                        Visualización de {visual.kind === 'matrix' ? 'matriz' : 'mapa de calor'} pendiente de datos.
                    </p>
                    {items.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Ejecuta el módulo con más datos para ver esta visualización.
                        </p>
                    )}
                </div>
            );

        default:
            return (
                <div className="p-4 bg-muted/50 rounded-md text-sm font-mono">
                    Tipo de visualización "{visual.kind}" no implementado.
                    <pre className="mt-2 text-xs opacity-50">{JSON.stringify(summary, null, 2).slice(0, 200)}...</pre>
                </div>
            );
    }
}

function NoData({ message = "No data available to render chart." }: { message?: string }) {
    return <div className="text-sm text-muted-foreground italic p-4">{message}</div>;
}
