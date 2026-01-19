
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
    Line,
    PieChart,
    Pie,
    Cell
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

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

export function ModuleVisualizer({ visuals, data }: ModuleVisualizerProps) {
    if (!data || !visuals || visuals.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                No visualization data available
            </div>
        );
    }

    // Transform keyword gap data if detected
    const transformedData = transformKeywordGapData(data);

    return (
        <div className="grid gap-6">
            {visuals.map((visual, idx) => (
                <Card key={idx}>
                    <CardHeader>
                        <CardTitle>{visual.title}</CardTitle>
                        {visual.description && <CardDescription>{visual.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                        {renderVisual(visual, transformedData, data)}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// Transform keyword gap specific data structure
function transformKeywordGapData(data: any) {
    // Check if this is keyword gap data (has topOpportunities or stats with perCompetitor)
    const isKeywordGapData = data.topOpportunities || data.stats?.perCompetitor || data.needsReview;

    if (!isKeywordGapData) {
        return data;
    }

    // Build chart data from per-competitor stats
    let chartData: any[] = [];
    if (data.stats?.perCompetitor) {
        chartData = Object.entries(data.stats.perCompetitor).map(([domain, stats]: [string, any]) => ({
            name: domain.replace(/^www\./, '').split('.')[0], // Shorten domain for display
            fullDomain: domain,
            keywords: stats.keywordCount || 0,
            volume: stats.totalVolume || 0,
            missedValue: Math.round((stats.totalVolume || 0) * 0.02), // Estimated value
        }));
    }

    // Build table data from topOpportunities
    const tableRows = (data.topOpportunities || []).slice(0, 20).map((kw: any) => ({
        keyword: kw.keyword,
        volume: kw.searchVolume || kw.volume || 0,
        cpc: typeof kw.cpc === 'number' ? `$${kw.cpc.toFixed(2)}` : '-',
        difficulty: kw.keywordDifficulty || kw.difficulty || '-',
        competitor: Array.isArray(kw.competitorsSeen) ? kw.competitorsSeen[0] : (kw.competitor || '-'),
        position: kw.competitorPosition || kw.position || '-',
        theme: kw.theme || 'Other',
        disposition: kw.disposition || 'PASS',
    }));

    // Build summary stats
    const summary = {
        totalKeywords: data.totalGapKeywords || data.stats?.totalKeywords || 0,
        passCount: data.topOpportunities?.length || 0,
        reviewCount: data.needsReview?.length || 0,
        outOfPlayCount: data.outOfPlay?.length || 0,
        totalVolume: data.stats?.totalVolume || 0,
    };

    return {
        ...data,
        chartData,
        rows: tableRows,
        items: tableRows,
        summary,
        isKeywordGap: true,
    };
}

function renderVisual(visual: VisualSpec, transformedData: any, originalData: any) {
    switch (visual.kind) {
        case "bar":
            return renderBarChart(visual, transformedData, originalData);

        case "line":
            return renderLineChart(visual, transformedData);

        case "table":
            return renderTable(visual, transformedData, originalData);

        case "card":
            return renderCardStats(transformedData);

        default:
            return (
                <div className="p-4 bg-muted/50 rounded-md text-sm font-mono">
                    Visualization type "{visual.kind}" not yet fully implemented.
                    <pre className="mt-2 text-xs opacity-50">{JSON.stringify(originalData, null, 2).slice(0, 200)}...</pre>
                </div>
            );
    }
}

function renderBarChart(visual: VisualSpec, transformedData: any, originalData: any) {
    // For keyword gap "Missed Traffic Value by Competitor" chart
    if (visual.title.toLowerCase().includes('competitor') && transformedData.isKeywordGap) {
        const chartData = transformedData.chartData || [];
        if (chartData.length === 0) {
            // Try to build from topOpportunities grouped by competitor
            const competitorMap = new Map<string, { keywords: number; volume: number }>();
            (originalData.topOpportunities || []).forEach((kw: any) => {
                const competitors = Array.isArray(kw.competitorsSeen) ? kw.competitorsSeen : [kw.competitor];
                competitors.forEach((comp: string) => {
                    if (comp) {
                        const existing = competitorMap.get(comp) || { keywords: 0, volume: 0 };
                        existing.keywords++;
                        existing.volume += kw.searchVolume || kw.volume || 0;
                        competitorMap.set(comp, existing);
                    }
                });
            });

            const derivedChartData = Array.from(competitorMap.entries())
                .map(([domain, stats]) => ({
                    name: domain.replace(/^www\./, '').split('.')[0],
                    fullDomain: domain,
                    keywords: stats.keywords,
                    volume: stats.volume,
                }))
                .sort((a, b) => b.volume - a.volume)
                .slice(0, 10);

            if (derivedChartData.length === 0) return <NoData />;

            return (
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={derivedChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip 
                                formatter={(value: number, name: string) => [
                                    name === 'volume' ? value.toLocaleString() : value,
                                    name === 'volume' ? 'Search Volume' : 'Keywords'
                                ]}
                                labelFormatter={(label) => derivedChartData.find(d => d.name === label)?.fullDomain || label}
                            />
                            <Legend />
                            <Bar dataKey="volume" fill="#8884d8" name="Search Volume" />
                            <Bar dataKey="keywords" fill="#82ca9d" name="Keywords" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        return (
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="volume" fill="#8884d8" name="Search Volume" />
                        <Bar dataKey="keywords" fill="#82ca9d" name="Keywords" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    // Generic bar chart handling
    const barData = Array.isArray(transformedData) ? transformedData : (transformedData.chartData || transformedData.items || []);
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
                    <Bar dataKey="value" fill="#8884d8" name="Value" />
                    <Bar dataKey="score" fill="#82ca9d" name="Score" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function renderLineChart(visual: VisualSpec, data: any) {
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
}

function renderTable(visual: VisualSpec, transformedData: any, originalData: any) {
    // For keyword gap "Top Keyword Opportunities" table
    if (visual.title.toLowerCase().includes('keyword') && transformedData.isKeywordGap) {
        const opportunities = transformedData.rows || originalData.topOpportunities || [];
        if (opportunities.length === 0) return <NoData />;

        return (
            <div className="max-h-[400px] overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Keyword</TableHead>
                            <TableHead className="text-right">Volume</TableHead>
                            <TableHead className="text-right">CPC</TableHead>
                            <TableHead className="text-right">Difficulty</TableHead>
                            <TableHead>Competitor</TableHead>
                            <TableHead className="text-center">Position</TableHead>
                            <TableHead>Theme</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {opportunities.slice(0, 20).map((row: any, i: number) => {
                            // Handle both transformed and raw formats
                            const kw = row.keyword || row;
                            const volume = row.volume || row.searchVolume || 0;
                            const cpc = typeof row.cpc === 'string' ? row.cpc : (typeof row.cpc === 'number' ? `$${row.cpc.toFixed(2)}` : '-');
                            const difficulty = row.difficulty || row.keywordDifficulty || '-';
                            const competitor = row.competitor || (Array.isArray(row.competitorsSeen) ? row.competitorsSeen[0] : '-');
                            const position = row.position || row.competitorPosition || '-';
                            const theme = row.theme || 'Other';
                            const disposition = row.disposition || 'PASS';

                            return (
                                <TableRow key={i}>
                                    <TableCell className="font-medium max-w-[200px] truncate" title={typeof kw === 'string' ? kw : kw?.keyword}>
                                        {typeof kw === 'string' ? kw : kw?.keyword || '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {typeof volume === 'number' ? volume.toLocaleString() : volume}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{cpc}</TableCell>
                                    <TableCell className="text-right">{difficulty}</TableCell>
                                    <TableCell className="max-w-[120px] truncate" title={competitor}>
                                        {competitor?.replace(/^www\./, '')}
                                    </TableCell>
                                    <TableCell className="text-center">{position}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">{theme}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge 
                                            variant={disposition === 'PASS' ? 'default' : disposition === 'REVIEW' ? 'secondary' : 'destructive'}
                                            className="text-xs"
                                        >
                                            {disposition}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
                {opportunities.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        Showing 20 of {opportunities.length} keywords
                    </p>
                )}
            </div>
        );
    }

    // Generic table handling
    const tableRows = Array.isArray(transformedData) ? transformedData : (transformedData.rows || transformedData.items || []);
    if (tableRows.length === 0) return <NoData />;

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
}

function renderCardStats(data: any) {
    // For summary statistics
    const stats = data.summary || data;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats).map(([key, value]) => {
                if (typeof value === 'object' || key === 'isKeywordGap') return null;
                return (
                    <div key={key} className="rounded-lg border p-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</p>
                        <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : String(value)}</p>
                    </div>
                );
            })}
        </div>
    );
}

function NoData() {
    return <div className="text-sm text-muted-foreground italic p-4">No data available to render chart.</div>;
}
