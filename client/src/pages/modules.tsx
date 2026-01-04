import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfidenceBar } from "@/components/ui/confidence-bar";
import { InsightBlock } from "@/components/ui/insight-block";
import { RecommendationCard } from "@/components/ui/recommendation-card";
import { FreshnessIndicator } from "@/components/ui/freshness-indicator";
import { Loader2, Play, BarChart3, Target, Users, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [moduleResult, setModuleResult] = useState<ModuleResult | null>(null);

  const { data: modulesData, isLoading } = useQuery<{ modules: ModuleDefinition[] }>({
    queryKey: ['/api/fon/modules'],
  });

  const executeMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const response = await apiRequest('POST', `/api/fon/modules/${moduleId}/execute`, {
        brandId: 1,
        tenantId: 1,
        keywords: ['marketing automation', 'email marketing', 'crm software'],
        domain: 'example.com',
        competitors: ['competitor1.com', 'competitor2.com'],
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
                    disabled={executeMutation.isPending}
                    data-testid="execute-module-button"
                  >
                    {executeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Execute Module
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
                        {selectedModule === 'market-demand' && moduleResult.rawData.trends && (
                          <div className="space-y-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Demand Trends</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                  {moduleResult.rawData.trends.slice(0, 12).map((item: any, i: number) => (
                                    <div key={i} className="p-3 border rounded-md">
                                      <p className="text-xs text-muted-foreground">{item.date}</p>
                                      <p className="text-sm font-bold">{item.value}</p>
                                      <p className="text-[10px] truncate">{item.keyword}</p>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Seasonality Details</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Peak Months:</span>
                                    <span className="font-medium">{moduleResult.rawData.seasonality.peakMonths.join(', ')}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Low Months:</span>
                                    <span className="font-medium">{moduleResult.rawData.seasonality.lowMonths.join(', ')}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>YoY Trend:</span>
                                    <Badge variant={moduleResult.rawData.seasonality.yoyTrend > 0 ? 'default' : 'destructive'}>
                                      {moduleResult.rawData.seasonality.yoyTrend}%
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {selectedModule === 'keyword-gap' && moduleResult.rawData.gapAnalysis && (
                          <div className="space-y-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">Top Gap Keywords</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-left pb-2">Keyword</th>
                                        <th className="text-right pb-2">Volume</th>
                                        <th className="text-right pb-2">Difficulty</th>
                                        <th className="text-left pb-2 pl-4">Intent</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {moduleResult.rawData.gapAnalysis.topGapKeywords.map((kw: any, i: number) => (
                                        <tr key={i} className="border-b last:border-0">
                                          <td className="py-2">{kw.keyword}</td>
                                          <td className="py-2 text-right">{kw.volume.toLocaleString()}</td>
                                          <td className="py-2 text-right">{kw.difficulty}</td>
                                          <td className="py-2 pl-4">
                                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                                              {kw.intent}
                                            </Badge>
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
                                <CardHeader>
                                  <CardTitle className="text-sm">Opportunity Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Total Gap Keywords:</span>
                                    <span className="font-bold">{moduleResult.rawData.gapAnalysis.totalGapKeywords}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Total Monthly Volume:</span>
                                    <span className="font-bold">{moduleResult.rawData.gapAnalysis.totalGapVolume.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Avg Difficulty:</span>
                                    <span className="font-bold">{moduleResult.rawData.gapAnalysis.avgDifficulty}%</span>
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
