import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { MarketDemandResult, MarketDemandAnalysis } from "@shared/schema";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Loader2,
  BarChart3,
  RefreshCw,
  CheckCircle,
  Info,
  Target,
  Zap,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";


interface Configuration {
  id: number;
  name: string;
  brand: { domain: string; name: string };
  category_definition?: {
    primary_category: string;
    included: string[];
  };
  demand_definition?: {
    non_brand_keywords?: {
      category_terms?: string[];
    };
  };
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

function getConfidenceColor(confidence: "high" | "medium" | "low"): string {
  switch (confidence) {
    case "high": return "text-green-600 dark:text-green-400";
    case "medium": return "text-amber-600 dark:text-amber-400";
    case "low": return "text-red-600 dark:text-red-400";
  }
}

function getConfidenceBadgeVariant(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high": return "default" as const;
    case "medium": return "secondary" as const;
    case "low": return "destructive" as const;
  }
}

function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MarketDemandPage() {
  const params = useParams<{ configId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("today 5-y");
  const [forecastEnabled, setForecastEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("saved");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);

  useEffect(() => {
    if (params.configId) {
      setSelectedConfigId(params.configId);
      setActiveTab("run");
    }
  }, [params.configId]);

  const { data: configurations, isLoading: configsLoading } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
  });

  const { data: savedAnalyses, isLoading: savedAnalysesLoading } = useQuery<MarketDemandAnalysis[]>({
    queryKey: ["/api/market-demand-analyses"],
  });

  const { data: providerStatus, isLoading: statusLoading, error: statusError } = useQuery<{
    available: boolean;
    providers: { provider: string; displayName: string; configured: boolean; message?: string }[];
  }>({
    queryKey: ["/api/market-demand/status"],
    retry: false,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (configId: string) => {
      const response = await apiRequest("POST", "/api/market-demand/analyze", {
        configurationId: configId,
        timeRange,
        forecastEnabled,
      });
      return response.json() as Promise<MarketDemandResult>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/market-demand", selectedConfigId], data);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze market demand",
        variant: "destructive",
      });
    },
  });

  const saveAnalysisMutation = useMutation({
    mutationFn: async (data: { configurationId: string; configurationName: string; results: MarketDemandResult; parameters: { timeRange: string } }) => {
      const response = await apiRequest("POST", "/api/market-demand-analyses", {
        configurationId: parseInt(data.configurationId, 10),
        configurationName: data.configurationName,
        results: data.results,
        parameters: {
          queryGroups: data.results.demandCurves.map(c => c.query),
          countryCode: "US",
          timeRange: data.parameters.timeRange,
        },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Analysis Saved",
        description: "Your market demand analysis has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/market-demand-analyses"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save analysis",
        variant: "destructive",
      });
    },
  });

  const deleteAnalysisMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/market-demand-analyses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Analysis Deleted",
        description: "The analysis has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/market-demand-analyses"] });
      if (selectedAnalysisId) {
        setSelectedAnalysisId(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete analysis",
        variant: "destructive",
      });
    },
  });

  const { data: analysisResult, isLoading: analysisLoading } = useQuery<MarketDemandResult>({
    queryKey: ["/api/market-demand", selectedConfigId],
    enabled: !!selectedConfigId && activeTab === "run",
  });

  const { data: selectedSavedAnalysis, isLoading: selectedAnalysisLoading } = useQuery<MarketDemandAnalysis>({
    queryKey: ["/api/market-demand-analyses", selectedAnalysisId],
    enabled: !!selectedAnalysisId,
  });

  const selectedConfig = configurations?.find(c => String(c.id) === selectedConfigId);

  const handleRunAnalysis = () => {
    if (selectedConfigId) {
      analyzeMutation.mutate(selectedConfigId);
    }
  };

  const handleSaveAnalysis = () => {
    if (selectedConfigId && selectedConfig && analysisResult) {
      saveAnalysisMutation.mutate({
        configurationId: selectedConfigId,
        configurationName: selectedConfig.name,
        results: analysisResult,
        parameters: { timeRange },
      });
    }
  };

  const handleDeleteAnalysis = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this analysis?")) {
      deleteAnalysisMutation.mutate(id);
    }
  };

  const handleViewAnalysis = (analysis: MarketDemandAnalysis) => {
    setSelectedAnalysisId(analysis.id);
  };

  const displayedResult = selectedAnalysisId && selectedSavedAnalysis 
    ? selectedSavedAnalysis.results 
    : analysisResult;
  const isDisplayLoading = selectedAnalysisId ? selectedAnalysisLoading : (analysisLoading || analyzeMutation.isPending);

  const aggregatedChartData = displayedResult?.demandCurves?.[0]?.data.map((point, index) => {
    const entry: Record<string, any> = { date: point.date };
    displayedResult.demandCurves.forEach((curve) => {
      entry[curve.query] = curve.data[index]?.value ?? 0;
    });
    return entry;
  }) || [];

  const monthlyHeatmapData = aggregatedChartData.length > 0 
    ? generateMonthlyHeatmap(aggregatedChartData)
    : [];

  if (configsLoading || statusLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (statusError) {
    const errorMessage = (statusError as any)?.message || "";
    const isAuthError = errorMessage.includes("401") || errorMessage.includes("Unauthorized");
    
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {isAuthError ? "Authentication Required" : "Error Loading Provider Status"}
            </CardTitle>
            <CardDescription>
              {isAuthError 
                ? "Please log in to access Market Demand analysis." 
                : "There was an error checking the trends provider status."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button data-testid="button-login">
                {isAuthError ? "Go to Login" : "Return Home"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!providerStatus?.available) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Trends Provider Not Configured
            </CardTitle>
            <CardDescription>
              Market Demand analysis requires DataForSEO credentials for Google Trends data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please configure your DataForSEO API credentials in the environment settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-market-demand">
      <div className="flex items-center gap-4">
        <Link href="/configurations">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Market Demand Analysis</h1>
            <p className="text-sm text-muted-foreground">
              View saved analyses or run new ones
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        if (value === "saved") {
          setSelectedAnalysisId(null);
        }
      }}>
        <TabsList className="mb-4">
          <TabsTrigger value="saved" data-testid="tab-saved-analyses" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Saved Analyses ({savedAnalyses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="run" data-testid="tab-run-analysis" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Run New Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved">
          {savedAnalysesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          ) : savedAnalyses && savedAnalyses.length > 0 ? (
            <>
              {selectedAnalysisId && selectedSavedAnalysis ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedAnalysisId(null)}
                      data-testid="button-back-to-list"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to list
                    </Button>
                    <div>
                      <h2 className="text-lg font-medium">{selectedSavedAnalysis.configurationName}</h2>
                      <p className="text-sm text-muted-foreground">
                        Created {formatDate(String(selectedSavedAnalysis.created_at))}
                      </p>
                    </div>
                  </div>
                  {renderAnalysisResults(displayedResult, isDisplayLoading, aggregatedChartData, monthlyHeatmapData)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedAnalyses.map((analysis) => (
                    <Card 
                      key={analysis.id} 
                      className="hover-elevate cursor-pointer"
                      onClick={() => handleViewAnalysis(analysis)}
                      data-testid={`card-analysis-${analysis.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{analysis.configurationName}</CardTitle>
                          <Badge variant={analysis.status === "completed" ? "default" : "secondary"}>
                            {analysis.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          {formatDate(String(analysis.created_at))}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {analysis.totalKeywords > 0 && (
                            <Badge variant="secondary">
                              {analysis.totalKeywords} keyword{analysis.totalKeywords > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {analysis.seasonalityType && (
                            <Badge variant="outline">
                              {analysis.seasonalityType} consistency
                            </Badge>
                          )}
                        </div>
                        {(analysis.peakMonth || analysis.lowMonth) && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {analysis.peakMonth && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-primary" />
                                <span className="text-muted-foreground">Peak:</span>
                                <span className="font-medium">{analysis.peakMonth}</span>
                              </div>
                            )}
                            {analysis.lowMonth && (
                              <div className="flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Low:</span>
                                <span className="font-medium">{analysis.lowMonth}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-end pt-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteAnalysis(analysis.id, e)}
                            disabled={deleteAnalysisMutation.isPending}
                            data-testid={`button-delete-${analysis.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No saved analyses yet. Run a new analysis and save it to view here.
                </p>
                <Button onClick={() => setActiveTab("run")} data-testid="button-run-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Run New Analysis
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="run">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Analysis Settings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-2 min-w-[200px]">
                <label className="text-sm font-medium">Configuration</label>
                <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                  <SelectTrigger data-testid="select-configuration">
                    <SelectValue placeholder="Select a configuration" />
                  </SelectTrigger>
                  <SelectContent>
                    {configurations?.map((config) => (
                      <SelectItem key={config.id} value={String(config.id)}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 min-w-[150px]">
                <label className="text-sm font-medium">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger data-testid="select-timerange">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today 5-y">5 Years</SelectItem>
                    <SelectItem value="today 12-m">12 Months</SelectItem>
                    <SelectItem value="today 3-m">3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleRunAnalysis}
                disabled={!selectedConfigId || analyzeMutation.isPending}
                data-testid="button-run-analysis"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Run Analysis
              </Button>

              {analysisResult && !analysisLoading && !analyzeMutation.isPending && selectedConfigId && (
                <Button
                  variant="outline"
                  onClick={handleSaveAnalysis}
                  disabled={saveAnalysisMutation.isPending}
                  data-testid="button-save-analysis"
                >
                  {saveAnalysisMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Analysis
                </Button>
              )}
            </CardContent>
          </Card>

          {renderAnalysisResults(analysisResult, analysisLoading || analyzeMutation.isPending, aggregatedChartData, monthlyHeatmapData)}

          {!analysisResult && !analysisLoading && !analyzeMutation.isPending && selectedConfigId && (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Click "Run Analysis" to generate market demand insights for the selected configuration.
                </p>
              </CardContent>
            </Card>
          )}

          {!selectedConfigId && (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a configuration to begin analyzing market demand and seasonality patterns.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function renderAnalysisResults(
  analysisResult: MarketDemandResult | undefined,
  isLoading: boolean,
  aggregatedChartData: Record<string, any>[],
  monthlyHeatmapData: { value: number }[]
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

  if (!analysisResult) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed" data-testid="text-executive-summary">
            {analysisResult.executiveSummary}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {analysisResult.timingRecommendation?.confidence && (
              <Badge variant={getConfidenceBadgeVariant(analysisResult.timingRecommendation.confidence)}>
                {analysisResult.timingRecommendation.confidence.toUpperCase()} Confidence
              </Badge>
            )}
            {analysisResult.metadata?.dataSource && (
              <Badge variant="outline">
                {analysisResult.metadata.dataSource}
              </Badge>
            )}
            {analysisResult.metadata?.cached && (
              <Badge variant="secondary">Cached</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {analysisResult.timingRecommendation && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Inflection Point
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold" data-testid="text-inflection-month">
                {analysisResult.timingRecommendation.inflectionMonth || "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">
                Demand begins rising
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Peak Window
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold" data-testid="text-peak-months">
                {analysisResult.timingRecommendation.peakMonths?.length > 0 
                  ? analysisResult.timingRecommendation.peakMonths.join(", ")
                  : "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">
                Peak demand months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                Recommended Action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold" data-testid="text-action-date">
                {formatDate(analysisResult.timingRecommendation.recommendedActionDate)}
              </p>
              <p className="text-sm text-muted-foreground">
                Launch content/media by
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Demand Trend
          </CardTitle>
          <CardDescription>
            Search interest over time for category terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80" data-testid="chart-demand-trend">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={aggregatedChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${MONTH_NAMES[date.getMonth()]} '${String(date.getFullYear()).slice(-2)}`;
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  domain={[0, 100]}
                  label={{ value: "Interest", angle: -90, position: "insideLeft" }}
                />
                <Tooltip 
                  labelFormatter={(value) => formatDate(value)}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.375rem"
                  }}
                />
                <Legend />
                {analysisResult.demandCurves.map((curve, index) => (
                  <Line
                    key={curve.query}
                    type="monotone"
                    dataKey={curve.query}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Monthly Seasonality Heatmap
          </CardTitle>
          <CardDescription>
            Average demand intensity by month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-1" data-testid="heatmap-seasonality">
            {MONTH_NAMES.map((month, index) => {
              const monthData = monthlyHeatmapData[index] || { value: 0 };
              const intensity = monthData.value / 100;
              const bgClass = intensity > 0.7 
                ? "bg-green-500" 
                : intensity > 0.4 
                  ? "bg-amber-400" 
                  : "bg-slate-200 dark:bg-slate-700";
              
              return (
                <div
                  key={month}
                  className={`flex flex-col items-center justify-center p-2 rounded-md ${bgClass}`}
                  style={{ opacity: 0.4 + (intensity * 0.6) }}
                >
                  <span className="text-xs font-medium text-foreground">{month}</span>
                  <span className="text-xs text-muted-foreground">{Math.round(monthData.value)}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-400 rounded" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>High</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Year-over-Year Consistency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Pattern Consistency</p>
              <p className={`text-xl font-semibold ${getConfidenceColor(analysisResult.yoyAnalysis.consistency)}`}>
                {analysisResult.yoyAnalysis.consistency.toUpperCase()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round(analysisResult.seasonality.consistencyScore * 100)}% stability score
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Variance</p>
              <p className="text-xl font-semibold">
                {Math.round(analysisResult.yoyAnalysis.variance * 100)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Year-to-year pattern deviation
              </p>
            </div>
          </div>

          {analysisResult.yoyAnalysis.anomalies.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Notable Anomalies
              </p>
              <ul className="space-y-1">
                {analysisResult.yoyAnalysis.anomalies.map((anomaly, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    {anomaly}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Timing Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed" data-testid="text-timing-reasoning">
            {analysisResult.timingRecommendation.reasoning}
          </p>

          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Analysis Trace</p>
            <div className="flex flex-wrap gap-2">
              {analysisResult.trace.sectionsUsed.map((section) => (
                <Badge key={section} variant="outline">
                  Section {section}
                </Badge>
              ))}
              {analysisResult.trace.filtersApplied.map((filter) => (
                <Badge key={filter} variant="secondary">
                  {filter}
                </Badge>
              ))}
            </div>
            {analysisResult.trace.sectionsMissing.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Missing sections: {analysisResult.trace.sectionsMissing.join(", ")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function generateMonthlyHeatmap(chartData: Record<string, any>[]): { value: number }[] {
  const monthlyTotals: number[] = new Array(12).fill(0);
  const monthlyCounts: number[] = new Array(12).fill(0);

  chartData.forEach((point) => {
    const date = new Date(point.date);
    const month = date.getMonth();
    
    const values = Object.entries(point)
      .filter(([key]) => key !== "date")
      .map(([, value]) => Number(value) || 0);
    
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      monthlyTotals[month] += avg;
      monthlyCounts[month] += 1;
    }
  });

  return monthlyTotals.map((total, index) => ({
    value: monthlyCounts[index] > 0 ? total / monthlyCounts[index] : 0,
  }));
}
