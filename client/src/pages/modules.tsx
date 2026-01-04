import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfidenceBar } from "@/components/ui/confidence-bar";
import { InsightBlock } from "@/components/ui/insight-block";
import { RecommendationCard } from "@/components/ui/recommendation-card";
import { FreshnessIndicator } from "@/components/ui/freshness-indicator";
import { Loader2, Play, BarChart3, Target, Users, TrendingUp, AlertTriangle, Settings, Clock, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Configuration } from "@shared/schema";

interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  ownerCouncil: string;
  supportingCouncils: string[];
  dataSources: string[];
}

interface FreshnessInfo {
  status: 'fresh' | 'moderate' | 'stale' | 'expired';
  ageDays: number;
  warning?: string;
}

interface ModuleResult {
  moduleId: string;
  hasData: boolean;
  confidence: number;
  dataSources: string[];
  dataTimestamp?: string;
  chartsData?: Array<{
    type: string;
    title: string;
    data: unknown;
  }>;
  insights: Array<{
    id: string;
    title: string;
    content: string;
    dataPoint: string;
    source: string;
    whyItMatters: string;
    severity: 'high' | 'medium' | 'low';
    category: 'opportunity' | 'risk' | 'observation';
  }>;
  recommendations: Array<{
    id: string;
    action: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
    effort: 'low' | 'medium' | 'high';
    timeline?: string;
    withAccessCta?: string;
  }>;
  freshnessStatus: FreshnessInfo;
  rawData?: any;
  errors?: string[];
}

const categoryIcons: Record<string, typeof BarChart3> = {
  demand: TrendingUp,
  visibility: BarChart3,
  competitive: Users,
  strategy: Target,
};

export default function ModulesPage() {
  const params = useParams<{ moduleId?: string }>();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [moduleResult, setModuleResult] = useState<ModuleResult | null>(null);

  const { data: modulesData, isLoading } = useQuery<{ modules: ModuleDefinition[] }>({
    queryKey: ['/api/fon/modules'],
  });

  const { data: configurations } = useQuery<Configuration[]>({
    queryKey: ['/api/configurations'],
  });

  const activeConfig = configurations?.[0];
  
  const contextStatus = {
    hasDomain: !!(activeConfig?.brand?.domain && activeConfig.brand.domain.trim() !== ''),
    hasCompetitors: !!(activeConfig?.competitors?.direct && activeConfig.competitors.direct.length > 0),
    brandName: activeConfig?.brand?.name || activeConfig?.name || 'Not configured',
    domain: activeConfig?.brand?.domain || '',
    competitors: activeConfig?.competitors?.direct || [],
  };

  const isContextComplete = contextStatus.hasDomain && contextStatus.hasCompetitors;

  useEffect(() => {
    if (params.moduleId && params.moduleId !== selectedModule) {
      setSelectedModule(params.moduleId);
      setModuleResult(null);
    }
  }, [params.moduleId, selectedModule]);

  const executeMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const demandKeywords = activeConfig?.demand_definition?.brand_keywords?.seed_terms || [];
      const categoryKeywords = activeConfig?.demand_definition?.non_brand_keywords?.category_terms || [];
      const allKeywords = [...demandKeywords, ...categoryKeywords].slice(0, 10);
      
      const response = await apiRequest('POST', `/api/fon/modules/${moduleId}/execute`, {
        brandId: activeConfig?.id || 1,
        tenantId: 1,
        keywords: allKeywords.length > 0 ? allKeywords : ['brand keywords'],
        domain: contextStatus.domain,
        competitors: contextStatus.competitors,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setModuleResult(data.result);
    },
  });

  const modules = modulesData?.modules || [];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      demand: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      visibility: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      competitive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      strategy: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="modules-page-title">FON Module Executors</h1>
          <p className="text-muted-foreground">
            Execute brand intelligence modules to analyze market data
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {modules.length} modules available
        </Badge>
      </div>

      {!isContextComplete && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Context Required
              </p>
              <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                Configure your brand domain and competitors before running intelligence modules.
                {!contextStatus.hasDomain && " Missing: Brand Domain."}
                {!contextStatus.hasCompetitors && " Missing: Competitors."}
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="gap-2" data-testid="button-configure-context">
                <Settings className="h-4 w-4" />
                Configure Brand
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {isContextComplete && (
        <Card className="border-green-500/30 bg-green-50/30 dark:bg-green-950/10">
          <CardContent className="flex items-center gap-4 py-3">
            <div className="flex-1">
              <div className="text-sm flex items-center gap-1 flex-wrap">
                <span className="font-medium">Active Context:</span>
                <Badge variant="outline">{contextStatus.brandName}</Badge>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{contextStatus.domain}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{contextStatus.competitors.length} competitors</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeConfig?.governance?.cmo_safe && (
                <Badge className="bg-green-600 text-white" data-testid="badge-cmo-safe">
                  CMO Safe
                </Badge>
              )}
              {activeConfig?.governance?.context_valid_until && (() => {
                const expirationDate = new Date(activeConfig.governance.context_valid_until);
                const now = new Date();
                const daysUntil = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysUntil < 0) {
                  return <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" /> Expired</Badge>;
                }
                if (daysUntil <= 7) {
                  return <Badge className="bg-amber-500 text-white gap-1"><Clock className="h-3 w-3" /> Expires {daysUntil}d</Badge>;
                }
                return <Badge variant="outline" className="gap-1 text-muted-foreground"><Shield className="h-3 w-3" /> Valid {daysUntil}d</Badge>;
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold">Available Modules</h2>
          {modules.map((module) => {
            const Icon = categoryIcons[module.category] || BarChart3;
            const isSelected = selectedModule === module.id;
            
            return (
              <Card 
                key={module.id}
                className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover-elevate'}`}
                onClick={() => setSelectedModule(module.id)}
                data-testid={`module-card-${module.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{module.name}</CardTitle>
                    </div>
                    <Badge className={getCategoryColor(module.category)}>
                      {module.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm mb-3">
                    {module.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1">
                    {module.dataSources.map((source) => (
                      <Badge key={source} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedModule ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>
                      {modules.find(m => m.id === selectedModule)?.name}
                    </CardTitle>
                    <CardDescription>
                      Execute this module to analyze brand data
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => executeMutation.mutate(selectedModule)}
                    disabled={executeMutation.isPending || !isContextComplete}
                    data-testid="execute-module-button"
                  >
                    {executeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {isContextComplete ? "Execute Module" : "Configure Context First"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {moduleResult ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <ConfidenceBar score={moduleResult.confidence} />
                      </div>
                      <FreshnessIndicator 
                        status={moduleResult.freshnessStatus.status} 
                        ageDays={moduleResult.freshnessStatus.ageDays}
                        warning={moduleResult.freshnessStatus.warning}
                      />
                    </div>

                    <Tabs defaultValue="insights">
                      <TabsList>
                        <TabsTrigger value="insights" data-testid="tab-insights">
                          Insights ({moduleResult.insights.length})
                        </TabsTrigger>
                        <TabsTrigger value="recommendations" data-testid="tab-recommendations">
                          Recommendations ({moduleResult.recommendations.length})
                        </TabsTrigger>
                        {moduleResult.rawData && (
                          <TabsTrigger value="results" data-testid="tab-results">
                            Detailed Results
                          </TabsTrigger>
                        )}
                      </TabsList>

                      <TabsContent value="insights" className="space-y-4 mt-4">
                        {moduleResult.insights.length > 0 ? (
                          moduleResult.insights.map((insight) => (
                            <InsightBlock key={insight.id} insight={insight} />
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-8">
                            No insights generated
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="recommendations" className="space-y-4 mt-4">
                        {moduleResult.recommendations.length > 0 ? (
                          moduleResult.recommendations.map((rec) => (
                            <RecommendationCard key={rec.id} recommendation={rec} />
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-8">
                            No recommendations generated
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="results" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 mb-2">
                          <div className="flex gap-4">
                            <span>API Source: <Badge variant="outline" className="text-[10px] ml-1">{moduleResult.dataSources.join(', ')}</Badge></span>
                            <span>Timestamp: {new Date(moduleResult.dataTimestamp || '').toLocaleString()}</span>
                          </div>
                        </div>

                        {selectedModule === 'market-demand' && moduleResult.rawData.trends && (
                          <div className="space-y-6">
                            <Card>
                              <CardHeader className="py-3">
                                <CardTitle className="text-sm font-semibold">Historical Demand Trends</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-left pb-2 font-medium">Period / Month</th>
                                        <th className="text-right pb-2 font-medium">Search Volume / Interest</th>
                                        <th className="text-left pb-2 pl-4 font-medium">Keyword Context</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {moduleResult.rawData.trends.slice(-20).reverse().map((item: any, i: number) => (
                                        <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                          <td className="py-2.5 font-medium">{item.date}</td>
                                          <td className="py-2.5 text-right font-mono">
                                            {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                                          </td>
                                          <td className="py-2.5 pl-4 text-muted-foreground italic">
                                            {item.keyword}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader className="py-3">
                                <CardTitle className="text-sm font-semibold">Seasonality & Growth Analysis</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Peak Demand Months</p>
                                    <p className="text-sm font-medium">{moduleResult.rawData.seasonality.peakMonths.join(', ')}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Low Demand Months</p>
                                    <p className="text-sm font-medium">{moduleResult.rawData.seasonality.lowMonths.join(', ')}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Year-over-Year Trend</p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={moduleResult.rawData.seasonality.yoyTrend >= 0 ? 'default' : 'destructive'} className="font-mono">
                                        {moduleResult.rawData.seasonality.yoyTrend > 0 ? '+' : ''}{moduleResult.rawData.seasonality.yoyTrend}%
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">Search Interest Growth</span>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {selectedModule === 'keyword-gap' && moduleResult.rawData.gapAnalysis && (
                          <div className="space-y-6">
                            <Card>
                              <CardHeader className="py-3">
                                <CardTitle className="text-sm font-semibold">Competitive Keyword Gap Matrix</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-left pb-2 font-medium">Keyword Opportunity</th>
                                        <th className="text-right pb-2 font-medium">Avg. Volume</th>
                                        <th className="text-right pb-2 font-medium">KD %</th>
                                        <th className="text-left pb-2 pl-4 font-medium">Intent</th>
                                        <th className="text-right pb-2 font-medium">CPC</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {moduleResult.rawData.gapAnalysis.topGapKeywords.map((kw: any, i: number) => (
                                        <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                          <td className="py-2.5 font-medium">{kw.keyword}</td>
                                          <td className="py-2.5 text-right font-mono">{kw.volume.toLocaleString()}</td>
                                          <td className="py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <span className="font-mono text-xs">{kw.difficulty}</span>
                                              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div 
                                                  className={`h-full ${kw.difficulty > 70 ? 'bg-red-500' : kw.difficulty > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                  style={{ width: `${kw.difficulty}%` }}
                                                />
                                              </div>
                                            </div>
                                          </td>
                                          <td className="py-2.5 pl-4">
                                            <Badge variant="secondary" className="text-[10px] uppercase tracking-tighter px-1.5 py-0">
                                              {kw.intent}
                                            </Badge>
                                          </td>
                                          <td className="py-2.5 text-right font-mono text-muted-foreground">
                                            ${kw.cpc?.toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card>
                                <CardHeader className="py-3">
                                  <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Opportunity Landscape</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Total Untapped Keywords:</span>
                                    <span className="font-bold font-mono text-lg">{moduleResult.rawData.gapAnalysis.totalGapKeywords}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Aggregate Monthly Volume:</span>
                                    <span className="font-bold font-mono text-lg text-primary">{moduleResult.rawData.gapAnalysis.totalGapVolume.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Weighted Difficulty Avg:</span>
                                    <span className="font-bold font-mono text-lg">{moduleResult.rawData.gapAnalysis.avgDifficulty}%</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        )}

                        {!['market-demand', 'keyword-gap'].includes(selectedModule || '') && (
                          <div className="p-8 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                            <p className="text-muted-foreground">Detailed data view for this module is coming soon.</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Click "Execute Module" to run the analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a module from the list to view details and execute</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
