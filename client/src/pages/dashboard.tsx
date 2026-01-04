import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, BarChart3, PieChart, Activity } from 'lucide-react';
import { ConfidenceBar } from '@/components/ui/confidence-bar';
import { FreshnessIndicator } from '@/components/ui/freshness-indicator';
import { InsightBlock } from '@/components/ui/insight-block';
import { RecommendationCard } from '@/components/ui/recommendation-card';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface FreshnessInfo {
  status: 'fresh' | 'moderate' | 'stale' | 'expired';
  ageDays: number;
  warning?: string;
}

interface ModuleResult {
  moduleId: string;
  moduleName: string;
  hasData: boolean;
  confidence: number;
  insights: any[];
  recommendations: any[];
  chartsData: any[];
  freshnessStatus: FreshnessInfo;
  errors?: string[];
}

interface DashboardData {
  modules: ModuleResult[];
  summary: {
    totalModules: number;
    healthyModules: number;
    avgConfidence: number;
    topInsights: any[];
    priorityRecommendations: any[];
  };
}

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Dashboard() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const { data: modulesData, isLoading: modulesLoading } = useQuery<{ modules: any[] }>({
    queryKey: ['/api/fon/modules']
  });

  const executeMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const res = await apiRequest('POST', `/api/fon/modules/${moduleId}/execute`, {
        domain: 'example.com',
        competitors: ['competitor1.com', 'competitor2.com', 'competitor3.com'],
        keywords: ['brand keyword', 'industry keyword']
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fon/modules'] });
    }
  });

  const [executedResults, setExecutedResults] = useState<Record<string, any>>({});

  const executeModule = async (moduleId: string) => {
    try {
      const response = await executeMutation.mutateAsync(moduleId);
      setExecutedResults(prev => ({ ...prev, [moduleId]: response.result }));
    } catch (error) {
      console.error('Module execution failed:', error);
    }
  };

  const executeAllModules = async () => {
    if (!modules || modules.length === 0) return;
    for (const mod of modules) {
      await executeModule(mod.id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fresh': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'moderate': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'stale': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const allInsights = Object.values(executedResults).flatMap((r: any) => r?.insights || []);
  const allRecommendations = Object.values(executedResults).flatMap((r: any) => r?.recommendations || []);
  const highPriorityRecs = allRecommendations.filter((r: any) => r.priority === 'high');

  const modules = modulesData?.modules || [];

  const moduleHealthData = modules.map((mod: any) => ({
    name: mod.name.split(' ').slice(0, 2).join(' '),
    confidence: executedResults[mod.id]?.confidence ? Math.round(executedResults[mod.id].confidence * 100) : 0
  })) || [];

  const categoryData = [
    { name: 'Demand', value: 35 },
    { name: 'Visibility', value: 25 },
    { name: 'Competitive', value: 20 },
    { name: 'Performance', value: 20 }
  ];

  if (modulesLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-dashboard">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Executive Intelligence Dashboard</h1>
          <p className="text-muted-foreground">Real-time brand intelligence across all modules</p>
        </div>
        <Button onClick={executeAllModules} disabled={executeMutation.isPending} data-testid="button-execute-all">
          {executeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Run All Modules
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-modules">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-modules-count">{modules.length}</div>
            <p className="text-xs text-muted-foreground">Intelligence modules available</p>
          </CardContent>
        </Card>

        <Card data-testid="card-executed-modules">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-executed-count">{Object.keys(executedResults).length}</div>
            <p className="text-xs text-muted-foreground">Modules with fresh data</p>
          </CardContent>
        </Card>

        <Card data-testid="card-insights-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-insights-count">{allInsights.length}</div>
            <p className="text-xs text-muted-foreground">Strategic insights generated</p>
          </CardContent>
        </Card>

        <Card data-testid="card-recommendations-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priority Actions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-priority-actions-count">{highPriorityRecs.length}</div>
            <p className="text-xs text-muted-foreground">High-priority recommendations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList data-testid="tabs-dashboard">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="charts" data-testid="tab-charts">Visualizations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-module-health">
              <CardHeader>
                <CardTitle>Module Health</CardTitle>
                <CardDescription>Confidence scores across all intelligence modules</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleHealthData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '6px'
                      }} 
                    />
                    <Bar dataKey="confidence" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="card-category-distribution">
              <CardHeader>
                <CardTitle>Intelligence Categories</CardTitle>
                <CardDescription>Distribution of intelligence coverage</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-modules-status">
            <CardHeader>
              <CardTitle>Module Status</CardTitle>
              <CardDescription>Execution status and freshness of all modules</CardDescription>
            </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {modules.map((mod: any) => {
                const resultData = executedResults[mod.id];
                return (
                  <div 
                    key={mod.id} 
                    className="flex items-center justify-between gap-4 p-3 rounded-md border flex-wrap"
                    data-testid={`module-status-${mod.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {resultData ? getStatusIcon(resultData.freshnessStatus?.status || 'fresh') : <div className="h-4 w-4" />}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{mod.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{mod.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {resultData ? (
                        <>
                          <ConfidenceBar score={resultData.confidence} size="sm" />
                          <Badge variant={resultData.hasData ? 'default' : 'secondary'}>
                            {resultData.hasData ? 'Has Data' : 'No Data'}
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline">Not Executed</Badge>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => executeModule(mod.id)}
                        disabled={executeMutation.isPending}
                        data-testid={`button-execute-${mod.id}`}
                      >
                        {executeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Run'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card data-testid="card-all-insights">
            <CardHeader>
              <CardTitle>Strategic Insights</CardTitle>
              <CardDescription>Key findings from all intelligence modules</CardDescription>
            </CardHeader>
            <CardContent>
              {allInsights.length === 0 ? (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-insights">
                  Run modules to generate insights
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {allInsights.map((insight, idx) => (
                    <InsightBlock key={idx} insight={insight} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card data-testid="card-all-recommendations">
            <CardHeader>
              <CardTitle>Strategic Recommendations</CardTitle>
              <CardDescription>Prioritized actions across all modules</CardDescription>
            </CardHeader>
            <CardContent>
              {allRecommendations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-recommendations">
                  Run modules to generate recommendations
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {allRecommendations.map((rec, idx) => (
                    <RecommendationCard key={idx} recommendation={rec} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          {Object.entries(executedResults).map(([moduleId, resultData]: [string, any]) => {
            if (!resultData?.chartsData?.length) return null;
            const modInfo = modulesData?.modules?.find((m: any) => m.id === moduleId);
            
            return (
              <Card key={moduleId} data-testid={`card-charts-${moduleId}`}>
                <CardHeader>
                  <CardTitle>{modInfo?.name || moduleId} Visualizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {resultData.chartsData.map((chart: any, idx: number) => (
                      <div key={idx} className="h-64">
                        <h4 className="text-sm font-medium mb-2">{chart.title}</h4>
                        <ResponsiveContainer width="100%" height="100%">
                          {chart.type === 'bar' ? (
                            <BarChart data={Array.isArray(chart.data) ? chart.data : []}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--background))', 
                                  borderColor: 'hsl(var(--border))' 
                                }} 
                              />
                              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          ) : chart.type === 'line' ? (
                            <LineChart data={Array.isArray(chart.data) ? chart.data : []}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                              <YAxis />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--background))', 
                                  borderColor: 'hsl(var(--border))' 
                                }} 
                              />
                              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                              <Legend />
                            </LineChart>
                          ) : chart.type === 'pie' ? (
                            <RechartsPieChart>
                              <Pie
                                data={Array.isArray(chart.data) ? chart.data : []}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                label={({ name }) => name}
                              >
                                {(Array.isArray(chart.data) ? chart.data : []).map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </RechartsPieChart>
                          ) : chart.type === 'radar' && Array.isArray(chart.data) && chart.data.length > 0 ? (
                            <RadarChart 
                              cx="50%" 
                              cy="50%" 
                              outerRadius="80%" 
                              data={Array.isArray(chart.data[0]?.values) ? chart.data[0].values.map((v: number, i: number) => ({
                                subject: ['Brand', 'Product', 'Price', 'Service', 'Innovation'][i] || `Dim ${i+1}`,
                                A: v,
                                B: Array.isArray(chart.data[1]?.values) ? chart.data[1].values[i] || 0 : 0
                              })) : []}
                            >
                              <PolarGrid />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} />
                              <Radar name={chart.data[0]?.name} dataKey="A" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                              {chart.data[1] && (
                                <Radar name={chart.data[1]?.name} dataKey="B" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
                              )}
                              <Legend />
                            </RadarChart>
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              Chart type not supported
                            </div>
                          )}
                        </ResponsiveContainer>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {Object.keys(executedResults).length === 0 && (
            <Card>
              <CardContent className="py-12">
                <p className="text-muted-foreground text-center" data-testid="text-no-charts">
                  Run modules to generate visualizations
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
