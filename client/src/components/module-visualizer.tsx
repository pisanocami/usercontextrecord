
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

    return (
        <div className="grid gap-6">
            {visuals.map((visual, idx) => (
                <Card key={idx}>
                    <CardHeader>
                        <CardTitle>{visual.title}</CardTitle>
                        {visual.description && <CardDescription>{visual.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                        {renderVisual(visual, data)}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function renderVisual(visual: VisualSpec, data: any) {
    // Defensive check for missing data properties
    // We assume the data contains keys matching standard structures or loosely typed

    switch (visual.kind) {
        case "bar":
            // Expecting array of objects for recharts
            const barData = Array.isArray(data) ? data : (data.chartData || data.items || []);
            if (barData.length === 0) return <NoData />;

            return (
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {/* Auto-detect keys if possible, or fallback to 'value' */}
                            <Bar dataKey="value" fill="#8884d8" name="Value" />
                            <Bar dataKey="score" fill="#82ca9d" name="Score" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );

        case "line":
            const lineData = Array.isArray(data) ? data : (data.trendData || data.history || []);
            if (lineData.length === 0) return <NoData />;

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
            const tableRows = Array.isArray(data) ? data : (data.rows || data.items || []);
            if (tableRows.length === 0) return <NoData />;

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
            // For summary statistics
            return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(data).map(([key, value]) => {
                        if (typeof value === 'object') return null;
                        return (
                            <div key={key} className="rounded-lg border p-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</p>
                                <p className="text-2xl font-bold">{String(value)}</p>
                            </div>
                        );
                    })}
                </div>
            );

        default:
            return (
                <div className="p-4 bg-muted/50 rounded-md text-sm font-mono">
                    Visualization type "{visual.kind}" not yet fully implemented.
                    <pre className="mt-2 text-xs opacity-50">{JSON.stringify(data, null, 2).slice(0, 200)}...</pre>
                </div>
            );
    }
}

function NoData() {
    return <div className="text-sm text-muted-foreground italic p-4">No data available to render chart.</div>;
}
