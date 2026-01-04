import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ConfidenceBar } from '@/components/ui/confidence-bar';
import { apiRequest } from '@/lib/queryClient';
import { 
  Loader2, 
  RefreshCw, 
  ArrowLeft, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  BarChart3,
  Printer,
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react';

interface ModuleResult {
  moduleId: string;
  moduleName?: string;
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
  rawData?: any;
}

export default function MasterReport() {
  const [, setLocation] = useLocation();
  const [executedResults, setExecutedResults] = useState<Record<string, ModuleResult>>({});
  const [isGenerating, setIsGenerating] = useState(false);

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
    }
  });

  const modules = modulesData?.modules || [];

  const executeAllModules = async () => {
    if (!modules || modules.length === 0) return;
    setIsGenerating(true);
    for (const mod of modules) {
      try {
        const response = await executeMutation.mutateAsync(mod.id);
        setExecutedResults(prev => ({ 
          ...prev, 
          [mod.id]: { ...response.result, moduleName: mod.name }
        }));
      } catch (error) {
        console.error(`Failed to execute ${mod.id}:`, error);
      }
    }
    setIsGenerating(false);
  };

  const allInsights = Object.values(executedResults).flatMap((r) => 
    (r?.insights || []).map(i => ({ ...i, moduleName: r.moduleName }))
  );
  const allRecommendations = Object.values(executedResults).flatMap((r) => 
    (r?.recommendations || []).map(rec => ({ ...rec, moduleName: r.moduleName }))
  );
  
  const highPriorityRecs = allRecommendations.filter((r) => r.priority === 'high');
  const mediumPriorityRecs = allRecommendations.filter((r) => r.priority === 'medium');
  const lowPriorityRecs = allRecommendations.filter((r) => r.priority === 'low');
  
  const avgConfidence = Object.values(executedResults).length > 0
    ? Object.values(executedResults).reduce((sum, r) => sum + (r?.confidence || 0), 0) / Object.values(executedResults).length
    : 0;

  const hasResults = Object.keys(executedResults).length > 0;
  const executedCount = Object.keys(executedResults).length;
  const totalModules = modules.length;

  if (modulesLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-master-report">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto" data-testid="master-report-page">
      <div className="flex items-start justify-between gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-master-report-title">
              Master Report
            </h1>
            <p className="text-lg text-muted-foreground">Consolidated strategic intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasResults && (
            <Button variant="outline" size="lg" onClick={() => window.print()} data-testid="button-print">
              <Printer className="h-5 w-5 mr-2" />
              Export
            </Button>
          )}
          <Button 
            size="lg"
            onClick={executeAllModules} 
            disabled={isGenerating}
            data-testid="button-generate-report"
          >
            {isGenerating ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Zap className="h-5 w-5 mr-2" />
            )}
            {hasResults ? 'Refresh' : 'Generate'}
          </Button>
        </div>
      </div>

      {!hasResults ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
            <BarChart3 className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Generate Your Report</h2>
          <p className="text-muted-foreground text-center max-w-md mb-8">
            Run all intelligence modules to create a comprehensive strategic analysis
          </p>
          <Button size="lg" onClick={executeAllModules} disabled={isGenerating} data-testid="button-generate-empty">
            {isGenerating ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Zap className="h-5 w-5 mr-2" />
            )}
            Generate Report
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden print:block text-center mb-8">
            <h1 className="text-4xl font-bold">Brand Intelligence Report</h1>
            <p className="text-muted-foreground text-lg mt-2">Generated {new Date().toLocaleDateString()}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card data-testid="stat-confidence">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Confidence Score</p>
                <div className="text-4xl font-bold">{Math.round(avgConfidence * 100)}%</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-modules">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Modules Analyzed</p>
                <div className="text-4xl font-bold">{executedCount}<span className="text-xl text-muted-foreground">/{totalModules}</span></div>
              </CardContent>
            </Card>
            <Card data-testid="stat-insights">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Insights</p>
                <div className="text-4xl font-bold">{allInsights.length}</div>
              </CardContent>
            </Card>
            <Card data-testid="stat-actions">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Priority Actions</p>
                <div className="text-4xl font-bold">{highPriorityRecs.length}</div>
              </CardContent>
            </Card>
          </div>

          {highPriorityRecs.length > 0 && (
            <Card className="border-destructive/30" data-testid="card-priority-actions">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Immediate Actions Required</CardTitle>
                    <CardDescription>High-priority recommendations requiring executive attention</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {highPriorityRecs.map((rec, idx) => (
                    <div key={idx} className="p-5 rounded-lg border border-destructive/20 bg-destructive/5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h4 className="font-semibold text-lg">{rec.action}</h4>
                        <Badge variant="destructive">High Priority</Badge>
                      </div>
                      <p className="text-muted-foreground mb-4">{rec.estimatedImpact}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{rec.timeline || 'Immediate'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Effort: </span>
                          <span className="font-medium">{rec.effort}</span>
                        </div>
                        <div className="ml-auto">
                          <Badge variant="outline">{rec.moduleName}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-module-performance">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Module Performance</CardTitle>
                  <CardDescription>Confidence and data quality across intelligence sources</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((mod: any) => {
                  const result = executedResults[mod.id];
                  if (!result) return null;
                  
                  return (
                    <div key={mod.id} className="flex items-center gap-4">
                      <div className="w-48 min-w-0">
                        <Link href={`/modules/${mod.id}`}>
                          <span className="font-medium text-sm hover:text-primary hover:underline cursor-pointer truncate block" data-testid={`link-module-${mod.id}`}>
                            {mod.name}
                          </span>
                        </Link>
                      </div>
                      <Progress value={result.confidence * 100} className="flex-1 h-3" />
                      <span className="text-sm font-semibold w-14 text-right">
                        {Math.round(result.confidence * 100)}%
                      </span>
                      <Badge variant={result.hasData ? "default" : "secondary"} className="w-20 justify-center">
                        {result.hasData ? "Complete" : "Partial"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-key-insights">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Key Insights</CardTitle>
                  <CardDescription>Strategic findings from intelligence analysis</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allInsights.slice(0, 8).map((insight, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{insight.data_point}</p>
                        <p className="text-xs text-muted-foreground mt-1">{insight.source}</p>
                        {insight.why_it_matters && (
                          <p className="text-sm text-muted-foreground mt-2">{insight.why_it_matters}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {allInsights.length > 8 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  + {allInsights.length - 8} more insights
                </p>
              )}
            </CardContent>
          </Card>

          {(mediumPriorityRecs.length > 0 || lowPriorityRecs.length > 0) && (
            <Card data-testid="card-other-recommendations">
              <CardHeader>
                <CardTitle className="text-xl">Additional Recommendations</CardTitle>
                <CardDescription>Strategic actions by priority level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {mediumPriorityRecs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary">Medium Priority</Badge>
                      <span className="text-sm text-muted-foreground">{mediumPriorityRecs.length} recommendations</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mediumPriorityRecs.map((rec, idx) => (
                        <div key={idx} className="p-4 rounded-lg border">
                          <h4 className="font-medium text-sm mb-2">{rec.action}</h4>
                          <p className="text-xs text-muted-foreground">{rec.estimatedImpact}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span>Effort: {rec.effort}</span>
                            <span>{rec.timeline}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {lowPriorityRecs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline">Low Priority</Badge>
                      <span className="text-sm text-muted-foreground">{lowPriorityRecs.length} recommendations</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {lowPriorityRecs.map((rec, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-dashed">
                          <h4 className="font-medium text-sm">{rec.action}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{rec.effort} effort</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="text-center py-8 text-sm text-muted-foreground border-t">
            <p className="font-medium">Brand Intelligence Platform</p>
            <p>Report generated on {new Date().toLocaleString()}</p>
          </div>
        </>
      )}
    </div>
  );
}
