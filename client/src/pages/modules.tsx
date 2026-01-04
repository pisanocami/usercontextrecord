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
