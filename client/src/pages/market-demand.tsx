import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { 
  MarketDemandResult, 
  MarketDemandAnalysis, 
  MarketDemandByCategoryResult, 
  CategoryDemandSlice, 
  Month,
  CategoryDemandWithKeywords,
  MarketDemandWithKeywordsResult,
  CategoryActionCard,
  CategoryKeywordStats,
  RankedKeyword,
} from "@shared/schema";
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
  ChevronDown,
  ChevronUp,
  Search,
  FileText,
  XCircle,
  Eye,
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

// Helper to normalize full month names to short format
function normalizeMonth(monthStr: string | null | undefined): string | null {
  if (!monthStr) return null;
  const monthMap: Record<string, string> = {
    'january': 'Jan', 'february': 'Feb', 'march': 'Mar', 'april': 'Apr',
    'may': 'May', 'june': 'Jun', 'july': 'Jul', 'august': 'Aug',
    'september': 'Sep', 'october': 'Oct', 'november': 'Nov', 'december': 'Dec'
  };
  const lower = monthStr.toLowerCase();
  if (monthMap[lower]) return monthMap[lower];
  if (monthStr.length <= 3) return monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase();
  return monthStr;
}

// Extract analysis metadata with fallback to results field for legacy data
function getAnalysisMetadata(analysis: MarketDemandAnalysis) {
  // Handle case where results might be a JSON string (legacy storage)
  let results: MarketDemandResult | undefined;
  try {
    if (typeof analysis.results === 'string') {
      results = JSON.parse(analysis.results) as MarketDemandResult;
    } else {
      results = analysis.results as MarketDemandResult | undefined;
    }
  } catch {
    results = undefined;
  }
  
  // Peak month: from field or fallback to results
  let peakMonth = analysis.peakMonth;
  if (!peakMonth && results?.seasonality?.peakWindow?.months?.[0]) {
    peakMonth = normalizeMonth(results.seasonality.peakWindow.months[0]);
  }
  
  // Low month: from field or fallback to results
  let lowMonth = analysis.lowMonth;
  if (!lowMonth && results?.seasonality?.declinePhase?.start) {
    try {
      const declineDate = new Date(results.seasonality.declinePhase.start);
      if (!isNaN(declineDate.getTime())) {
        lowMonth = declineDate.toLocaleString('en-US', { month: 'short' });
      }
    } catch {
      lowMonth = null;
    }
  }
  
  // Seasonality type: from field or fallback
  const seasonalityType = analysis.seasonalityType || results?.seasonality?.yoyConsistency || null;
  
  // Total keywords: from field or fallback
  const totalKeywords = analysis.totalKeywords || results?.demandCurves?.length || 0;
  
  return { peakMonth, lowMonth, seasonalityType, totalKeywords };
}

function isByCategoryResult(result: any): result is MarketDemandByCategoryResult {
  return result && Array.isArray(result.byCategory) && result.byCategory.length > 0;
}

function CategoryDemandCard({ 
  slice, 
  index,
  onViewKeywords 
}: { 
  slice: CategoryDemandSlice | CategoryDemandWithKeywords; 
  index: number;
  onViewKeywords?: (categoryName: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasKeywords = 'stats' in slice && slice.stats && slice.stats.totalKeywords > 0;
  const hasActionCard = 'actionCard' in slice && slice.actionCard;
  const sliceWithKeywords = slice as CategoryDemandWithKeywords;

  return (
    <Card data-testid={`card-category-${index}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
          <span>{slice.categoryName}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={slice.consistencyLabel === 'high' ? 'default' : slice.consistencyLabel === 'medium' ? 'secondary' : 'destructive'}>
              {slice.consistencyLabel} stability
            </Badge>
            {hasKeywords && (
              <Badge variant="outline" className="text-xs">
                {sliceWithKeywords.stats!.totalKeywords} keywords
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          {slice.queries.length} query term{slice.queries.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              Peak Month
            </span>
            <span className="font-semibold">{slice.peakMonth || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-500" />
              Low Month
            </span>
            <span className="font-semibold">{slice.lowMonth || 'N/A'}</span>
          </div>
        </div>
        
        <div>
          <p className="text-xs text-muted-foreground mb-1">Monthly Pattern</p>
          <div className="grid grid-cols-12 gap-0.5">
            {MONTH_NAMES.map((month) => {
              const value = slice.heatmap?.[month as Month] ?? 0;
              const intensity = value / 100;
              const bgClass = intensity > 0.7 
                ? "bg-green-500" 
                : intensity > 0.4 
                  ? "bg-amber-400" 
                  : "bg-slate-200 dark:bg-slate-700";
              return (
                <div
                  key={month}
                  className={`h-6 rounded-sm ${bgClass}`}
                  style={{ opacity: 0.4 + (intensity * 0.6) }}
                  title={`${month}: ${Math.round(value)}`}
                  data-testid={`heatmap-cell-${month}-${index}`}
                />
              );
            })}
          </div>
        </div>

        {hasKeywords && sliceWithKeywords.stats && (
          <div className="flex items-center gap-3 text-sm border-t pt-3">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="font-medium text-green-700 dark:text-green-400">{sliceWithKeywords.stats.pass}</span>
              <span className="text-muted-foreground text-xs">PASS</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="font-medium text-amber-700 dark:text-amber-400">{sliceWithKeywords.stats.review}</span>
              <span className="text-muted-foreground text-xs">REVIEW</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="font-medium text-red-700 dark:text-red-400">{sliceWithKeywords.stats.outOfPlay}</span>
              <span className="text-muted-foreground text-xs">OUT</span>
            </div>
            {sliceWithKeywords.stats.avgKD && (
              <div className="ml-auto text-xs text-muted-foreground">
                Avg KD: {sliceWithKeywords.stats.avgKD}
              </div>
            )}
          </div>
        )}

        {hasActionCard && sliceWithKeywords.actionCard && (
          <div className="border-t pt-3 space-y-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between text-sm font-medium hover-elevate p-2 rounded-md"
              data-testid={`button-expand-action-${index}`}
            >
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Action Plan
              </span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {expanded && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{sliceWithKeywords.actionCard.recommendedWindowLabel}</Badge>
                  <Badge variant="secondary">{sliceWithKeywords.actionCard.primaryChannel}</Badge>
                  <Badge variant="secondary">{sliceWithKeywords.actionCard.objective}</Badge>
                </div>
                
                {sliceWithKeywords.actionCard.startISO && sliceWithKeywords.actionCard.endISO && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {sliceWithKeywords.actionCard.startISO} to {sliceWithKeywords.actionCard.endISO}
                  </div>
                )}
                
                {sliceWithKeywords.actionCard.nextSteps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Next Steps</p>
                    <ul className="text-xs space-y-1">
                      {sliceWithKeywords.actionCard.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {sliceWithKeywords.actionCard.risks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Risks</p>
                    <ul className="text-xs space-y-1">
                      {sliceWithKeywords.actionCard.risks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasKeywords && onViewKeywords && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onViewKeywords(slice.categoryName)}
                    className="w-full mt-2"
                    data-testid={`button-view-keywords-${index}`}
                  >
                    <Eye className="h-3 w-3 mr-2" />
                    View {sliceWithKeywords.stats!.pass} Keyword Opportunities
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        
        {slice.recommendationRationale && (
          <p className="text-xs text-muted-foreground" data-testid={`text-rationale-${index}`}>
            {slice.recommendationRationale}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function KeywordListPanel({ 
  categoryName, 
  keywords,
  onClose 
}: { 
  categoryName: string;
  keywords: { 
    topOpportunities: RankedKeyword[]; 
    needsReview: RankedKeyword[]; 
    outOfPlay: RankedKeyword[];
  };
  onClose: () => void;
}) {
  const [activeKeywordTab, setActiveKeywordTab] = useState<"pass" | "review" | "out">("pass");
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);

  const currentKeywords = activeKeywordTab === "pass" 
    ? keywords.topOpportunities 
    : activeKeywordTab === "review" 
      ? keywords.needsReview 
      : keywords.outOfPlay;

  return (
    <Card data-testid="panel-keyword-list">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Keywords: {categoryName}
          </CardTitle>
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-keywords">
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeKeywordTab} onValueChange={(v) => setActiveKeywordTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pass" className="text-xs" data-testid="tab-pass">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              PASS ({keywords.topOpportunities.length})
            </TabsTrigger>
            <TabsTrigger value="review" className="text-xs" data-testid="tab-review">
              <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
              REVIEW ({keywords.needsReview.length})
            </TabsTrigger>
            <TabsTrigger value="out" className="text-xs" data-testid="tab-out">
              <XCircle className="h-3 w-3 mr-1 text-red-500" />
              OUT ({keywords.outOfPlay.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeKeywordTab} className="mt-4">
            {currentKeywords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No keywords in this category</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentKeywords.map((kw, idx) => (
                  <div 
                    key={kw.keyword} 
                    className="border rounded-md p-3 space-y-2"
                    data-testid={`keyword-row-${idx}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{kw.keyword}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{kw.intentType}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Vol: {kw.scoreComponents.searchVolume?.toLocaleString() || 'N/A'}
                          </span>
                          {kw.scoreComponents.keywordDifficulty && (
                            <span className="text-xs text-muted-foreground">
                              KD: {kw.scoreComponents.keywordDifficulty}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold">{Math.round(kw.opportunityScore * 100)}%</div>
                        <div className="text-xs text-muted-foreground">opportunity</div>
                      </div>
                    </div>

                    {kw.reasons.length > 0 && (
                      <p className="text-xs text-muted-foreground">{kw.reasons[0]}</p>
                    )}

                    {kw.trace.length > 0 && (
                      <button
                        onClick={() => setExpandedKeyword(expandedKeyword === kw.keyword ? null : kw.keyword)}
                        className="text-xs text-primary flex items-center gap-1"
                        data-testid={`button-expand-trace-${idx}`}
                      >
                        <FileText className="h-3 w-3" />
                        {expandedKeyword === kw.keyword ? 'Hide' : 'Show'} trace ({kw.trace.length})
                      </button>
                    )}

                    {expandedKeyword === kw.keyword && kw.trace.length > 0 && (
                      <div className="bg-muted/50 rounded p-2 space-y-1 text-xs">
                        {kw.trace.map((t, ti) => (
                          <div key={ti} className="flex items-start gap-2">
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {t.ucrSection}
                            </Badge>
                            <span className="text-muted-foreground">{t.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<{ id: number; name: string } | null>(null);
  const [selectedKeywordCategory, setSelectedKeywordCategory] = useState<string | null>(null);
  const [keywordsResult, setKeywordsResult] = useState<MarketDemandWithKeywordsResult | null>(null);

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
      const response = await apiRequest("POST", "/api/market-demand/analyze-by-category", {
        configurationId: configId,
        timeRange,
        countryCode: "US",
      });
      return response.json() as Promise<MarketDemandByCategoryResult>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/market-demand", selectedConfigId], data);
      setKeywordsResult(null);
      setSelectedKeywordCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze market demand",
        variant: "destructive",
      });
    },
  });

  const analyzeWithKeywordsMutation = useMutation({
    mutationFn: async (configId: string) => {
      const response = await apiRequest("POST", "/api/market-demand/analyze-with-keywords", {
        configurationId: configId,
        timeRange,
        countryCode: "US",
      });
      return response.json() as Promise<MarketDemandWithKeywordsResult>;
    },
    onSuccess: (data) => {
      setKeywordsResult(data);
      queryClient.setQueryData(["/api/market-demand", selectedConfigId], data);
    },
    onError: (error: any) => {
      toast({
        title: "Keyword Analysis Failed",
        description: error.message || "Failed to analyze keywords",
        variant: "destructive",
      });
    },
  });

  const saveAnalysisMutation = useMutation({
    mutationFn: async (data: { configurationId: string; configurationName: string; results: MarketDemandByCategoryResult | MarketDemandResult; parameters: { timeRange: string } }) => {
      let queryGroups: string[] = [];
      if (isByCategoryResult(data.results)) {
        queryGroups = data.results.byCategory.flatMap(cat => cat.queries);
      } else if ((data.results as MarketDemandResult).demandCurves) {
        queryGroups = (data.results as MarketDemandResult).demandCurves.map(c => c.query);
      }
      
      const response = await apiRequest("POST", "/api/market-demand-analyses", {
        configurationId: parseInt(data.configurationId, 10),
        configurationName: data.configurationName,
        results: data.results,
        parameters: {
          queryGroups,
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

  const { data: analysisResult, isLoading: analysisLoading } = useQuery<MarketDemandByCategoryResult | MarketDemandResult>({
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

  const handleRunWithKeywords = () => {
    if (selectedConfigId) {
      analyzeWithKeywordsMutation.mutate(selectedConfigId);
    }
  };

  const handleSaveAnalysis = () => {
    const resultToSave = keywordsResult || analyzeMutation.data;
    if (selectedConfigId && selectedConfig && resultToSave) {
      saveAnalysisMutation.mutate({
        configurationId: selectedConfigId,
        configurationName: selectedConfig.name,
        results: resultToSave,
        parameters: { timeRange },
      });
    }
  };

  const handleDeleteAnalysis = (analysis: MarketDemandAnalysis, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalysisToDelete({ id: analysis.id, name: analysis.configurationName });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (analysisToDelete) {
      deleteAnalysisMutation.mutate(analysisToDelete.id);
    }
    setDeleteDialogOpen(false);
    setAnalysisToDelete(null);
  };

  const handleViewAnalysis = (analysis: MarketDemandAnalysis) => {
    setSelectedAnalysisId(analysis.id);
  };

  const displayedResult: MarketDemandByCategoryResult | MarketDemandResult | MarketDemandWithKeywordsResult | undefined = selectedAnalysisId && selectedSavedAnalysis 
    ? selectedSavedAnalysis.results 
    : (keywordsResult || analyzeMutation.data || analysisResult);
  const isDisplayLoading = selectedAnalysisId ? selectedAnalysisLoading : (analysisLoading || analyzeMutation.isPending || analyzeWithKeywordsMutation.isPending);

  const aggregatedChartData = (() => {
    if (!displayedResult) return [];
    
    if (isByCategoryResult(displayedResult)) {
      if (!displayedResult.byCategory?.length) return [];
      
      const allDates = new Set<string>();
      const categoryDataMaps: Map<string, Map<string, number>> = new Map();
      
      displayedResult.byCategory.forEach((cat) => {
        const dateValueMap = new Map<string, number>();
        cat.series?.forEach((point) => {
          allDates.add(point.date);
          dateValueMap.set(point.date, point.value);
        });
        categoryDataMaps.set(cat.categoryName, dateValueMap);
      });
      
      const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      return sortedDates.map((date) => {
        const entry: Record<string, any> = { date };
        displayedResult.byCategory.forEach((cat) => {
          const dataMap = categoryDataMaps.get(cat.categoryName);
          entry[cat.categoryName] = dataMap?.get(date) ?? null;
        });
        return entry;
      });
    } else {
      const legacyResult = displayedResult as MarketDemandResult;
      if (!legacyResult.demandCurves?.length) return [];
      
      const allDates = new Set<string>();
      const curveDataMaps: Map<string, Map<string, number>> = new Map();
      
      legacyResult.demandCurves.forEach((curve) => {
        const dateValueMap = new Map<string, number>();
        curve.data?.forEach((point) => {
          allDates.add(point.date);
          dateValueMap.set(point.date, point.value);
        });
        curveDataMaps.set(curve.query, dateValueMap);
      });
      
      const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      return sortedDates.map((date) => {
        const entry: Record<string, any> = { date };
        legacyResult.demandCurves.forEach((curve) => {
          const dataMap = curveDataMaps.get(curve.query);
          entry[curve.query] = dataMap?.get(date) ?? null;
        });
        return entry;
      });
    }
  })();

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
                  {renderAnalysisResults(displayedResult, isDisplayLoading, aggregatedChartData, monthlyHeatmapData, keywordsResult, selectedKeywordCategory, setSelectedKeywordCategory)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedAnalyses.map((analysis) => {
                    const meta = getAnalysisMetadata(analysis);
                    return (
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
                            {meta.totalKeywords > 0 && (
                              <Badge variant="secondary">
                                {meta.totalKeywords} keyword{meta.totalKeywords > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {meta.seasonalityType && (
                              <Badge variant="outline">
                                {meta.seasonalityType} consistency
                              </Badge>
                            )}
                          </div>
                          {(meta.peakMonth || meta.lowMonth) && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {meta.peakMonth && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-primary" />
                                  <span className="text-muted-foreground">Peak:</span>
                                  <span className="font-medium">{meta.peakMonth}</span>
                                </div>
                              )}
                              {meta.lowMonth && (
                                <div className="flex items-center gap-1">
                                  <TrendingDown className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">Low:</span>
                                  <span className="font-medium">{meta.lowMonth}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-end pt-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDeleteAnalysis(analysis, e)}
                              disabled={deleteAnalysisMutation.isPending}
                              data-testid={`button-delete-${analysis.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
                disabled={!selectedConfigId || analyzeMutation.isPending || analyzeWithKeywordsMutation.isPending}
                data-testid="button-run-analysis"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Timing Only
              </Button>

              <Button
                onClick={handleRunWithKeywords}
                disabled={!selectedConfigId || analyzeMutation.isPending || analyzeWithKeywordsMutation.isPending}
                variant="default"
                data-testid="button-run-with-keywords"
              >
                {analyzeWithKeywordsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Timing + Keywords
              </Button>

              {(analyzeMutation.data || keywordsResult) && !analyzeMutation.isPending && !analyzeWithKeywordsMutation.isPending && selectedConfigId && (
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

          {renderAnalysisResults(displayedResult, isDisplayLoading && activeTab === "run", aggregatedChartData, monthlyHeatmapData)}

          {!displayedResult && !isDisplayLoading && !analyzeMutation.isPending && selectedConfigId && (
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the analysis "{analysisToDelete?.name}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function renderAnalysisResults(
  analysisResult: MarketDemandByCategoryResult | MarketDemandResult | MarketDemandWithKeywordsResult | undefined,
  isLoading: boolean,
  aggregatedChartData: Record<string, any>[],
  monthlyHeatmapData: { value: number }[],
  keywordsResult: MarketDemandWithKeywordsResult | null,
  selectedKeywordCategory: string | null,
  setSelectedKeywordCategory: (category: string | null) => void
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

  const isByCategory = isByCategoryResult(analysisResult);
  const byCategoryResult = isByCategory ? analysisResult as MarketDemandByCategoryResult : null;
  const legacyResult = !isByCategory ? analysisResult as MarketDemandResult : null;

  return (
    <div className="space-y-6" data-testid="results-container">
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
              <Badge variant={getConfidenceBadgeVariant(legacyResult.timingRecommendation.confidence)}>
                {legacyResult.timingRecommendation.confidence.toUpperCase()} Confidence
              </Badge>
            )}
            {!isByCategory && legacyResult?.metadata?.dataSource && (
              <Badge variant="outline">
                {legacyResult.metadata.dataSource}
              </Badge>
            )}
            {!isByCategory && legacyResult?.metadata?.cached && (
              <Badge variant="secondary">Cached</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {isByCategory && byCategoryResult && (
        <>
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Category Analysis
              <Badge variant="outline" data-testid="badge-category-count">
                {byCategoryResult.byCategory.length} categories
              </Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-category-cards">
              {(keywordsResult?.byCategory || byCategoryResult.byCategory).map((slice, index) => (
                <CategoryDemandCard 
                  key={slice.categoryName} 
                  slice={slice} 
                  index={index}
                  onViewKeywords={keywordsResult ? setSelectedKeywordCategory : undefined}
                />
              ))}
            </div>

            {selectedKeywordCategory && keywordsResult && (() => {
              const categoryData = keywordsResult.byCategory.find(c => c.categoryName === selectedKeywordCategory);
              if (!categoryData) return null;
              return (
                <KeywordListPanel
                  categoryName={selectedKeywordCategory}
                  keywords={{
                    topOpportunities: categoryData.topOpportunities,
                    needsReview: categoryData.needsReview,
                    outOfPlay: categoryData.outOfPlay,
                  }}
                  onClose={() => setSelectedKeywordCategory(null)}
                />
              );
            })()}
          </div>

          {byCategoryResult.overall && (
            <Card data-testid="card-overall-aggregate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Overall Aggregate
                </CardTitle>
                <CardDescription>
                  Weighted average across all categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      Peak Month
                    </span>
                    <span className="font-semibold text-lg" data-testid="text-overall-peak">
                      {byCategoryResult.overall.peakMonth || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-500" />
                      Low Month
                    </span>
                    <span className="font-semibold text-lg" data-testid="text-overall-low">
                      {byCategoryResult.overall.lowMonth || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Stability Score
                    </span>
                    <span className="font-semibold text-lg" data-testid="text-overall-stability">
                      {Math.round(byCategoryResult.overall.stabilityScore * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Launch By
                    </span>
                    <span className="font-semibold text-lg" data-testid="text-overall-launch">
                      {byCategoryResult.overall.recommendedLaunchByISO 
                        ? formatDate(byCategoryResult.overall.recommendedLaunchByISO) 
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Monthly Pattern</p>
                  <div className="grid grid-cols-12 gap-1" data-testid="heatmap-overall">
                    {MONTH_NAMES.map((month) => {
                      const value = byCategoryResult.overall?.heatmap?.[month as Month] ?? 0;
                      const intensity = value / 100;
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
                          <span className="text-xs text-muted-foreground">{Math.round(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Demand Trend by Category
              </CardTitle>
              <CardDescription>
                Search interest over time for each category
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
                    {byCategoryResult.byCategory.map((cat, index) => (
                      <Line
                        key={cat.categoryName}
                        type="monotone"
                        dataKey={cat.categoryName}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls={false}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {byCategoryResult.trace && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Analysis Trace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {byCategoryResult.trace.sectionsUsed?.map((section) => (
                    <Badge key={section} variant="outline">
                      Section {section}
                    </Badge>
                  ))}
                  {byCategoryResult.trace.filtersApplied?.map((filter) => (
                    <Badge key={filter} variant="secondary">
                      {filter}
                    </Badge>
                  ))}
                  {byCategoryResult.trace.rulesTriggered?.map((rule) => (
                    <Badge key={rule} variant="default">
                      {rule}
                    </Badge>
                  ))}
                </div>
                {byCategoryResult.trace.sectionsMissing && byCategoryResult.trace.sectionsMissing.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Missing sections: {byCategoryResult.trace.sectionsMissing.join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!isByCategory && legacyResult && (
        <>
          {legacyResult.timingRecommendation && (
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
                    {legacyResult.timingRecommendation.inflectionMonth || "N/A"}
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
                    {legacyResult.timingRecommendation.peakMonths?.length > 0 
                      ? legacyResult.timingRecommendation.peakMonths.join(", ")
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
                    {formatDate(legacyResult.timingRecommendation.recommendedActionDate)}
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
                    {legacyResult.demandCurves.map((curve, index) => (
                      <Line
                        key={curve.query}
                        type="monotone"
                        dataKey={curve.query}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls={false}
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
                  <p className={`text-xl font-semibold ${getConfidenceColor(legacyResult.yoyAnalysis.consistency)}`}>
                    {legacyResult.yoyAnalysis.consistency.toUpperCase()}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Math.round(legacyResult.seasonality.consistencyScore * 100)}% stability score
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Variance</p>
                  <p className="text-xl font-semibold">
                    {Math.round(legacyResult.yoyAnalysis.variance * 100)}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Year-to-year pattern deviation
                  </p>
                </div>
              </div>

              {legacyResult.yoyAnalysis.anomalies.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Notable Anomalies
                  </p>
                  <ul className="space-y-1">
                    {legacyResult.yoyAnalysis.anomalies.map((anomaly, index) => (
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
                {legacyResult.timingRecommendation?.reasoning}
              </p>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Analysis Trace</p>
                <div className="flex flex-wrap gap-2">
                  {legacyResult.trace.sectionsUsed.map((section) => (
                    <Badge key={section} variant="outline">
                      Section {section}
                    </Badge>
                  ))}
                  {legacyResult.trace.filtersApplied.map((filter) => (
                    <Badge key={filter} variant="secondary">
                      {filter}
                    </Badge>
                  ))}
                </div>
                {legacyResult.trace.sectionsMissing.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Missing sections: {legacyResult.trace.sectionsMissing.join(", ")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
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
      .map(([, value]) => value)
      .filter((v): v is number => v !== null && v !== undefined && typeof v === "number");
    
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
