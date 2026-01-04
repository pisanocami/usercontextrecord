import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, BarChart3, Activity, FileText, ArrowRight, Zap } from 'lucide-react';
import { ConfidenceBar } from '@/components/ui/confidence-bar';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ModuleResult {
  moduleId: string;
  moduleName: string;
  hasData: boolean;
  confidence: number;
  insights: any[];
  recommendations: any[];
  chartsData: any[];
  freshnessStatus: {
    status: 'fresh' | 'moderate' | 'stale' | 'expired';
    ageDays: number;
    warning?: string;
  };
  errors?: string[];
}

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [executedResults, setExecutedResults] = useState<Record<string, any>>({});

  const { data: modulesData, isLoading: modulesLoading } = useQuery<{ modules: any[] }>({
    queryKey: ['/api/fon/modules']
  });

  const navigateToModule = (moduleId: string) => {
    setLocation(`/modules/${moduleId}`);
  };

  const navigateToMasterReport = () => {
    setLocation('/master-report');
  };

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

  const modules = modulesData?.modules || [];
  
  const allInsights = Object.values(executedResults).flatMap((r: any) => r?.insights || []);
  const allRecommendations = Object.values(executedResults).flatMap((r: any) => r?.recommendations || []);
  const highPriorityRecs = allRecommendations.filter((r: any) => r.priority === 'high');
  
  const avgConfidence = Object.values(executedResults).length > 0
    ? Object.values(executedResults).reduce((sum: number, r: any) => sum + (r?.confidence || 0), 0) / Object.values(executedResults).length
    : 0;

  const moduleHealthData = modules.map((mod: any) => ({
    name: mod.name.split(' ').slice(0, 2).join(' '),
    confidence: executedResults[mod.id]?.confidence ? Math.round(executedResults[mod.id].confidence * 100) : 0
  })) || [];

  if (modulesLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-dashboard">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const hasExecutedModules = Object.keys(executedResults).length > 0;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto" data-testid="dashboard-page">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Executive Intelligence
          </h1>
          <p className="text-lg text-muted-foreground">
            Strategic brand intelligence at a glance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            size="lg"
            onClick={executeAllModules} 
            disabled={executeMutation.isPending} 
            data-testid="button-execute-all"
          >
            {executeMutation.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Zap className="h-5 w-5 mr-2" />
            )}
            Generate Intelligence
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-visible" data-testid="card-confidence-score">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Overall Confidence</span>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-5xl font-bold tracking-tight" data-testid="text-confidence-score">
              {hasExecutedModules ? `${Math.round(avgConfidence * 100)}%` : '--'}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {hasExecutedModules ? 'Across all modules' : 'Run modules to calculate'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-modules-analyzed">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Modules Analyzed</span>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-5xl font-bold tracking-tight" data-testid="text-modules-analyzed">
              {Object.keys(executedResults).length}<span className="text-2xl text-muted-foreground">/{modules.length}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Intelligence modules</p>
          </CardContent>
        </Card>

        <Card data-testid="card-insights-generated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Insights Generated</span>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-5xl font-bold tracking-tight" data-testid="text-insights-generated">
              {allInsights.length}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Strategic findings</p>
          </CardContent>
        </Card>

        <Card data-testid="card-priority-actions">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">Priority Actions</span>
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-5xl font-bold tracking-tight" data-testid="text-priority-actions">
              {highPriorityRecs.length}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {hasExecutedModules && (
        <Card className="border-primary/20 bg-primary/5" data-testid="card-master-report-cta">
          <CardContent className="py-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Master Intelligence Report Ready</h3>
                  <p className="text-muted-foreground">
                    View consolidated analysis with {allInsights.length} insights and {allRecommendations.length} recommendations
                  </p>
                </div>
              </div>
              <Button size="lg" onClick={navigateToMasterReport} data-testid="button-view-master-report">
                View Report
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" data-testid="card-module-confidence">
          <CardHeader>
            <CardTitle className="text-xl">Module Confidence</CardTitle>
            <CardDescription>Intelligence quality across analysis modules</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {hasExecutedModules ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moduleHealthData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Confidence']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="confidence" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Run modules to see confidence scores</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
            <CardDescription>Most critical recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            {highPriorityRecs.length > 0 ? (
              <div className="space-y-4">
                {highPriorityRecs.slice(0, 3).map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{rec.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">{rec.effort} effort</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No priority actions</p>
                <p className="text-sm text-muted-foreground">Run modules to identify actions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-modules-list">
        <CardHeader>
          <CardTitle className="text-xl">Intelligence Modules</CardTitle>
          <CardDescription>Click any module to view detailed analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod: any) => {
              const resultData = executedResults[mod.id];
              const isExecuted = !!resultData;
              
              return (
                <button
                  key={mod.id}
                  onClick={() => navigateToModule(mod.id)}
                  className="group text-left p-4 rounded-lg border transition-all hover:border-primary/50 hover:bg-muted/50"
                  data-testid={`module-card-${mod.id}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {mod.name}
                    </h4>
                    {isExecuted ? (
                      <Badge variant="default" className="shrink-0">
                        {Math.round((resultData.confidence || 0) * 100)}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">Pending</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {mod.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">{mod.category}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
