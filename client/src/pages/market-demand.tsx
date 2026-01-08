import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Configuration, MarketDemandAnalysis } from "@shared/schema";
// Context-First: Analysis result types and helpers
export type MarketDemandResult = {
  configurationId: number;
  contextVersion: number;
  demandCurves: {
    query: string;
    data: { date: string; value: number }[];
  }[];
  seasonality?: {
    inflectionPoint?: { month: number; week: number; date: string };
    peakWindow?: { start: string; end: string; months: string[] };
    declinePhase?: { start: string };
    yoyConsistency?: string;
    consistencyScore?: number;
  };
  timingRecommendation?: {
    inflectionMonth: string;
    peakMonths: string[];
    recommendedActionDate: string;
    reasoning: string;
    confidence: string;
  };
  yoyAnalysis?: {
    consistency: string;
    variance: number;
    anomalies: string[];
  };
  executiveSummary: string;
  trace?: any;
  metadata?: {
    fetchedAt: string;
    cached: boolean;
    dataSource: string;
  };
};

export type MarketDemandByCategoryResult = {
  configurationId: number;
  ucrVersion: string;
  byCategory: {
    categoryName: string;
    queries: string[];
    peakMonth: string;
    lowMonth: string;
    variance: number;
    stabilityScore: number;
    consistencyLabel: string;
    recommendedLaunchByISO: string;
    recommendationRationale: string;
    peakWindow: string[];
    inflectionMonth: string;
    series: { date: string; value: number }[];
    heatmap: Record<string, number>;
    trace?: any;
  }[];
  overall?: {
    peakMonth: string;
    stabilityScore: number;
    series: { date: string; value: number }[];
  };
  executiveSummary: string;
  metadata?: {
    fetchedAt: string;
    cached: boolean;
    dataSource: string;
  };
  contextStatus?: string;
  forecastPolicy?: string;
  warnings?: string[];
  validationResult?: {
    valid: boolean;
    contextStatus: string;
    contextVersion: number;
    errors: string[];
    warnings: string[];
  };
};

export function isByCategoryResult(
  result: MarketDemandByCategoryResult | MarketDemandResult | any
): result is MarketDemandByCategoryResult {
  return result && (Array.isArray(result.byCategory) || 'byCategory' in result);
}

import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Target, 
  Info, 
  AlertTriangle,
  FileDown,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  Search,
  Settings,
  Inbox,
  Home
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import * as XLSX from "xlsx";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

// Mock helper for missing function
const generateMonthlyHeatmap = (heatmap: Record<string, number>) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map(m => ({ month: m, value: heatmap[m] || 0 }));
};

function CategoryDemandCard({ slice, index }: { slice: any; index: number }) {
  const heatmapData = generateMonthlyHeatmap(slice.heatmap || {});
  
  return (
    <Card key={slice.categoryName} className="hover-elevate" data-testid={`card-category-${index}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm font-bold truncate">
            {slice.categoryName}
          </CardTitle>
          <Badge variant={slice.consistencyLabel === 'high' ? 'default' : 'secondary'} className="text-[10px] h-4">
            {slice.consistencyLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-xs mb-3">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Peak</span>
            <span className="font-semibold">{slice.peakMonth}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-muted-foreground">Launch By</span>
            <span className="font-semibold text-primary">{slice.recommendedLaunchByISO ? format(new Date(slice.recommendedLaunchByISO), 'MMM dd') : 'N/A'}</span>
          </div>
        </div>
        
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
            <span>Seasonality Heatmap</span>
            <span>{Math.round(slice.stabilityScore * 100)}% stable</span>
          </div>
          <div className="grid grid-cols-12 gap-0.5 h-6">
            {heatmapData.map(({ month, value }, i) => {
              const intensity = value / 100;
              const bgClass = intensity > 0.7 
                ? "bg-primary" 
                : intensity > 0.4 
                  ? "bg-primary/60" 
                  : intensity > 0.1 
                    ? "bg-primary/20" 
                    : "bg-muted";
              return (
                <div
                  key={month}
                  className={`h-full rounded-sm ${bgClass}`}
                  title={`${month}: ${Math.round(value)}`}
                  data-testid={`heatmap-cell-${month}-${index}`}
                />
              );
            })}
          </div>
        </div>
        
        {slice.recommendationRationale && (
          <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2" data-testid={`text-rationale-${index}`}>
            {slice.recommendationRationale}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function renderAnalysisResults(
  analysisResult: MarketDemandByCategoryResult | MarketDemandResult | undefined,
  isLoading: boolean,
  aggregatedChartData: Record<string, any>[]
) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!analysisResult) return null;

  const isByCategory = isByCategoryResult(analysisResult);
  const byCategoryResult = isByCategory ? analysisResult as MarketDemandByCategoryResult : null;
  const legacyResult = !isByCategory ? analysisResult as MarketDemandResult : null;

  const contextStatus = (analysisResult as any)?.contextStatus || (analysisResult as any)?.validationResult?.contextStatus;
  const forecastPolicy = (analysisResult as any)?.forecastPolicy;
  const validationErrors = (analysisResult as any)?.validationResult?.errors || [];
  const warnings = (analysisResult as any)?.warnings || (analysisResult as any)?.validationResult?.warnings || [];

  return (
    <div className="space-y-6" data-testid="results-container">
      {(contextStatus || forecastPolicy || warnings.length > 0 || validationErrors.length > 0) && (
        <Card className={validationErrors.length > 0 ? "border-destructive/50 bg-destructive/5" : "bg-muted/50"} data-testid="card-context-first">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className={validationErrors.length > 0 ? "h-4 w-4 text-destructive" : "h-4 w-4"} />
              Context-First Analysis {validationErrors.length > 0 ? "(Validation Failed)" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contextStatus && (
                <Badge variant={validationErrors.length > 0 ? "destructive" : "outline"} data-testid="badge-context-status">
                  Status: {contextStatus}
                </Badge>
              )}
              {forecastPolicy && (
                <Badge variant={forecastPolicy === 'DISABLED' ? 'secondary' : 'default'} data-testid="badge-forecast-policy">
                  Forecast: {forecastPolicy.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            
            {validationErrors.length > 0 && (
              <div className="mt-4 space-y-2 p-3 bg-background rounded-md border border-destructive/20">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Required Actions
                </p>
                {validationErrors.map((error: string, idx: number) => (
                  <p key={idx} className="text-xs text-foreground leading-tight pl-6">
                    • {error}
                  </p>
                ))}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {warnings.map((warning: string, idx: number) => (
                  <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {validationErrors.length === 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Executive Summary
                {!isByCategory && (
                  <Badge variant="secondary" data-testid="badge-legacy-analysis">Legacy Analysis</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed" data-testid="text-executive-summary">
                {analysisResult.executiveSummary}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {isByCategory && byCategoryResult?.metadata?.dataSource && (
                  <Badge variant="outline">
                    {byCategoryResult.metadata.dataSource}
                  </Badge>
                )}
                {!isByCategory && legacyResult?.timingRecommendation?.confidence && (
                  <Badge variant="outline">
                    {legacyResult.timingRecommendation.confidence.toUpperCase()} Confidence
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {isByCategory && byCategoryResult && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Analysis
                  <Badge variant="outline">
                    {byCategoryResult.byCategory.length} categories
                  </Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {byCategoryResult.byCategory.map((slice, index) => (
                    <CategoryDemandCard key={slice.categoryName} slice={slice} index={index} />
                  ))}
                </div>
              </div>

              {byCategoryResult.overall && (
                <Card data-testid="card-overall-aggregate">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="h-4 w-4" />
                      Overall Aggregate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Peak Month</span>
                        <span className="font-semibold text-lg">{byCategoryResult.overall.peakMonth}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Consistency</span>
                        <span className="font-semibold text-lg">{Math.round(byCategoryResult.overall.stabilityScore * 100)}%</span>
                      </div>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={aggregatedChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" hide />
                          <YAxis hide domain={[0, 'auto']} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-popover border border-border p-2 rounded-md shadow-md text-xs">
                                    <p className="font-medium">{payload[0].payload.date}</p>
                                    <p className="text-primary">Demand: {Math.round(payload[0].value as number)}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const csvData = isByCategory 
                  ? byCategoryResult?.byCategory.map(c => ({ Category: c.categoryName, Peak: c.peakMonth, Consistency: c.consistencyLabel }))
                  : [];
                const ws = XLSX.utils.json_to_sheet(csvData as any[]);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "MarketDemand");
                XLSX.writeFile(wb, "market_demand_analysis.xlsx");
              }}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MarketDemandPage() {
  const params = useParams<{ configId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("today 5-y");
  const [activeTab, setActiveTab] = useState<string>("saved");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);

  const { data: configurations } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
  });

  const { data: analysisResult, isLoading: isAnalyzing, error } = useQuery({
    queryKey: ["/api/market-demand", selectedConfigId, timeRange],
    queryFn: async () => {
      if (!selectedConfigId) return null;
      try {
        const res = await apiRequest("POST", "/api/market-demand/analyze-by-category", {
          configurationId: selectedConfigId,
          timeRange,
          countryCode: "US"
        });
        return await res.json();
      } catch (err: any) {
        // Handle API errors gracefully for the UI
        console.error("Market Demand API Error:", err);
        
        // If the error object has a json method (from apiRequest/fetch)
        if (err.json && typeof err.json === 'function') {
          try {
            const errorData = await err.json();
            return {
              validationResult: errorData.validationResult || {
                valid: false,
                errors: [errorData.message || "An unexpected error occurred"],
                warnings: []
              },
              executiveSummary: errorData.message || "Validation failed",
              byCategory: []
            };
          } catch (e) {
            // Fallback if JSON parsing fails
          }
        }
        
        // Generic fallback error structure that the UI can render
        return {
          validationResult: {
            valid: false,
            errors: [err.message || "Connection failed. Please try again."],
            warnings: []
          },
          executiveSummary: "Error connecting to service",
          byCategory: []
        };
      }
    },
    enabled: !!selectedConfigId && activeTab === "run",
    retry: false
  });

  const displayResult = analysisResult;


  const aggregatedChartData = displayResult && isByCategoryResult(displayResult) && displayResult.overall
    ? displayResult.overall.series.map((d: any) => ({
        date: format(new Date(d.date), 'MMM yyyy'),
        value: d.value
      }))
    : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Demand</h1>
          <p className="text-muted-foreground">Timing intelligence and seasonality analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Brand Strategy</label>
              <select 
                className="w-full p-2 rounded-md border bg-background"
                value={selectedConfigId}
                onChange={(e) => setSelectedConfigId(e.target.value)}
              >
                <option value="">Choose configuration...</option>
                {configurations?.map(config => (
                  <option key={config.id} value={config.id}>{config.name}</option>
                ))}
              </select>
            </div>
            <Button 
              className="w-full" 
              onClick={() => setActiveTab("run")}
              disabled={!selectedConfigId || isAnalyzing}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Demand"}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {renderAnalysisResults(displayResult, isAnalyzing, aggregatedChartData)}
        </div>
      </div>
    </div>
  );
}
