import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ConfidenceBar } from '@/components/ui/confidence-bar';
import { InsightBlock } from '@/components/ui/insight-block';
import { RecommendationCard } from '@/components/ui/recommendation-card';
import { FreshnessIndicator } from '@/components/ui/freshness-indicator';
import { apiRequest } from '@/lib/queryClient';
import { 
  Loader2, 
  RefreshCw, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  BarChart3,
  Eye,
  Swords,
  Brain,
  Activity,
  LineChart,
  Clock,
  Printer,
  Download
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

const categoryIcons: Record<string, typeof BarChart3> = {
  demand: TrendingUp,
  visibility: Eye,
  competitive: Swords,
  strategy: Brain,
  performance: Activity,
  content: LineChart,
};

const categoryLabels: Record<string, string> = {
  demand: 'Demand Analysis',
  visibility: 'SEO & Visibility',
  competitive: 'Competitive Intelligence',
  strategy: 'Strategic Planning',
  performance: 'Performance Metrics',
  content: 'Content Analysis',
};

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
  
  const avgConfidence = Object.values(executedResults).length > 0
    ? Object.values(executedResults).reduce((sum, r) => sum + (r?.confidence || 0), 0) / Object.values(executedResults).length
    : 0;

  const getModulesByCategory = () => {
    const grouped: Record<string, any[]> = {};
    modules.forEach((mod: any) => {
      const cat = mod.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ ...mod, result: executedResults[mod.id] });
    });
    return grouped;
  };

  const modulesByCategory = getModulesByCategory();
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
    <div className="p-6 space-y-6 max-w-6xl mx-auto" data-testid="master-report-page">
      <div className="flex items-center justify-between gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/dashboard')} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-master-report-title">Master Intelligence Report</h1>
            <p className="text-muted-foreground">Consolidated analysis across all FON modules</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={executeAllModules} 
            disabled={isGenerating}
            data-testid="button-generate-report"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {hasResults ? 'Refresh Report' : 'Generate Report'}
          </Button>
          {hasResults && (
            <Button variant="outline" onClick={() => window.print()} data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          )}
        </div>
      </div>

      {!hasResults ? (
        <Card className="py-12">
          <CardContent className="text-center space-y-4">
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">No Report Data</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Click "Generate Report" to run all intelligence modules and create a comprehensive analysis.
            </p>
            <Button onClick={executeAllModules} disabled={isGenerating} data-testid="button-generate-empty">
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Generate Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="print:block">
            <div className="text-center mb-6 hidden print:block">
              <h1 className="text-3xl font-bold">Brand Intelligence Master Report</h1>
              <p className="text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
            </div>

            <Card data-testid="card-executive-summary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Executive Summary
                </CardTitle>
                <CardDescription>Key metrics and overall intelligence status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-md bg-muted/50">
                    <div className="text-3xl font-bold text-primary">{executedCount}/{totalModules}</div>
                    <p className="text-sm text-muted-foreground">Modules Analyzed</p>
                  </div>
                  <div className="text-center p-4 rounded-md bg-muted/50">
                    <div className="text-3xl font-bold text-primary">{Math.round(avgConfidence * 100)}%</div>
                    <p className="text-sm text-muted-foreground">Avg Confidence</p>
                  </div>
                  <div className="text-center p-4 rounded-md bg-muted/50">
                    <div className="text-3xl font-bold text-primary">{allInsights.length}</div>
                    <p className="text-sm text-muted-foreground">Total Insights</p>
                  </div>
                  <div className="text-center p-4 rounded-md bg-muted/50">
                    <div className="text-3xl font-bold text-primary">{highPriorityRecs.length}</div>
                    <p className="text-sm text-muted-foreground">Priority Actions</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Module Confidence Scores</h4>
                  <div className="space-y-2">
                    {modules.map((mod: any) => {
                      const result = executedResults[mod.id];
                      return (
                        <div key={mod.id} className="flex items-center gap-3">
                          <span className="text-sm w-48 truncate">{mod.name}</span>
                          <Progress 
                            value={result ? result.confidence * 100 : 0} 
                            className="flex-1 h-2"
                          />
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {result ? `${Math.round(result.confidence * 100)}%` : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {highPriorityRecs.length > 0 && (
            <Card data-testid="card-priority-actions">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Priority Actions
                </CardTitle>
                <CardDescription>High-priority recommendations requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {highPriorityRecs.slice(0, 6).map((rec, idx) => (
                    <div key={idx} className="p-4 rounded-md border border-destructive/30 bg-destructive/5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium">{rec.action}</h4>
                        <Badge variant="destructive">High Priority</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.estimatedImpact}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Effort: {rec.effort}</span>
                        {rec.timeline && <span>Timeline: {rec.timeline}</span>}
                        <span className="ml-auto">{rec.moduleName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {Object.entries(modulesByCategory).map(([category, categoryModules]) => {
            const CategoryIcon = categoryIcons[category] || BarChart3;
            const categoryLabel = categoryLabels[category] || category;
            const categoryResults = categoryModules.filter((m: any) => m.result);
            
            if (categoryResults.length === 0) return null;

            return (
              <Card key={category} data-testid={`card-category-${category}`} className="break-inside-avoid">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CategoryIcon className="h-5 w-5" />
                    {categoryLabel}
                  </CardTitle>
                  <CardDescription>{categoryResults.length} module(s) with data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {categoryModules.map((mod: any) => {
                    const result = mod.result;
                    if (!result) return null;

                    return (
                      <div key={mod.id} className="space-y-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <Link href={`/modules/${mod.id}`}>
                              <span className="font-semibold hover:underline cursor-pointer" data-testid={`link-module-${mod.id}`}>
                                {mod.name}
                              </span>
                            </Link>
                            <ConfidenceBar score={result.confidence} size="sm" />
                          </div>
                          <FreshnessIndicator status={result.freshnessStatus} />
                        </div>

                        {result.insights?.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {result.insights.slice(0, 4).map((insight: any, idx: number) => (
                              <InsightBlock key={idx} insight={insight} />
                            ))}
                          </div>
                        )}

                        {result.recommendations?.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {result.recommendations.slice(0, 2).map((rec: any, idx: number) => (
                              <RecommendationCard key={idx} recommendation={rec} />
                            ))}
                          </div>
                        )}

                        <Separator className="my-4" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          <Card data-testid="card-all-recommendations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                All Recommendations
              </CardTitle>
              <CardDescription>Complete list of strategic recommendations by priority</CardDescription>
            </CardHeader>
            <CardContent>
              {mediumPriorityRecs.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Badge variant="secondary">Medium Priority</Badge>
                    <span className="text-sm text-muted-foreground">({mediumPriorityRecs.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mediumPriorityRecs.map((rec, idx) => (
                      <RecommendationCard key={idx} recommendation={rec} />
                    ))}
                  </div>
                </div>
              )}

              {allRecommendations.filter(r => r.priority === 'low').length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Badge variant="outline">Low Priority</Badge>
                    <span className="text-sm text-muted-foreground">({allRecommendations.filter(r => r.priority === 'low').length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allRecommendations.filter(r => r.priority === 'low').map((rec, idx) => (
                      <RecommendationCard key={idx} recommendation={rec} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground py-4 print:block">
            <p>Report generated on {new Date().toLocaleString()}</p>
            <p>Brand Intelligence Platform - FON Architecture</p>
          </div>
        </>
      )}
    </div>
  );
}
