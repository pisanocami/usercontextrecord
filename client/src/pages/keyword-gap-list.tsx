import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, FileText, Calendar, Globe, Users, TrendingUp, CheckCircle, AlertCircle, 
  BarChart3, Trash2, Eye, Plus, Clock
} from "lucide-react";
import type { Configuration, KeywordGapAnalysis } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function KeywordGapList() {
  const { toast } = useToast();

  const { data: analyses, isLoading: analysesLoading } = useQuery<KeywordGapAnalysis[]>({
    queryKey: ["/api/keyword-gap-analyses"],
  });

  const { data: configurations, isLoading: configsLoading } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
  });

  const deleteAnalysisMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/keyword-gap-analyses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keyword-gap-analyses"] });
      toast({
        title: "Analysis deleted",
        description: "The keyword gap analysis has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the analysis.",
        variant: "destructive",
      });
    },
  });

  const getCompetitorCount = (config: Configuration): number => {
    const competitors = config.competitors?.competitors;
    if (!competitors || !Array.isArray(competitors)) return 0;
    return competitors.filter(c => c.tier === "tier1" || c.tier === "tier2").length;
  };

  const getDomain = (config: Configuration): string => {
    return config.brand?.domain || "No domain";
  };

  const isReadyForAnalysis = (config: Configuration): boolean => {
    const domain = config.brand?.domain;
    const competitors = getCompetitorCount(config);
    return !!domain && competitors > 0;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Keyword Gap Analysis</h1>
              <p className="text-sm text-muted-foreground">
                View saved analyses or run new ones
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <Tabs defaultValue="analyses" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="analyses" data-testid="tab-analyses">
                <BarChart3 className="h-4 w-4 mr-2" />
                Saved Analyses ({analyses?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="new" data-testid="tab-new">
                <Plus className="h-4 w-4 mr-2" />
                Run New Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analyses">
              {analysesLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-2/3 mb-4" />
                        <Skeleton className="h-9 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !analyses || analyses.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                      <BarChart3 className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No analyses yet</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                      Run a keyword gap analysis to see competitive insights and opportunities.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {analyses.map((analysis) => (
                    <Card 
                      key={analysis.id}
                      className="hover:shadow-md transition-shadow"
                      data-testid={`card-analysis-${analysis.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-1 truncate">
                              {analysis.configurationName}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Clock className="h-3 w-3 flex-shrink-0" />
                              {formatDate(analysis.created_at)}
                            </CardDescription>
                          </div>
                          <Badge 
                            className={
                              analysis.status === "completed" 
                                ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                            }
                          >
                            {analysis.status === "completed" ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {analysis.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Domain
                            </span>
                            <span className="font-medium truncate max-w-[150px]" title={analysis.domain}>
                              {analysis.domain}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Provider</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {analysis.provider}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {analysis.passCount}
                              </div>
                              <div className="text-xs text-muted-foreground">Pass</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                {analysis.reviewCount}
                              </div>
                              <div className="text-xs text-muted-foreground">Review</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-muted-foreground">
                                {analysis.outOfPlayCount}
                              </div>
                              <div className="text-xs text-muted-foreground">Out</div>
                            </div>
                          </div>
                          {analysis.estimatedMissingValue > 0 && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Est. Missing Volume</span>
                                <span className="font-semibold text-primary">
                                  {formatNumber(analysis.estimatedMissingValue)}
                                </span>
                              </div>
                            </div>
                          )}
                          {analysis.topThemes && analysis.topThemes.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-2">
                              {analysis.topThemes.slice(0, 3).map((theme, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {theme.theme}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 pt-3">
                            <Link href={`/keyword-gap/${analysis.configurationId}?analysisId=${analysis.id}`} className="flex-1">
                              <Button size="sm" className="w-full" data-testid={`button-view-${analysis.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  data-testid={`button-delete-${analysis.id}`}
                                  disabled={deleteAnalysisMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Analysis</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this analysis? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteAnalysisMutation.mutate(analysis.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="new">
              {configsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-9 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !configurations || configurations.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No configurations yet</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                      Create a configuration with a domain and competitors to run keyword gap analysis.
                    </p>
                    <Link href="/new">
                      <Button data-testid="button-create-config">
                        Create Configuration
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {configurations.map((config) => {
                    const ready = isReadyForAnalysis(config);
                    const competitorCount = getCompetitorCount(config);
                    
                    return (
                      <Card 
                        key={config.id} 
                        className={`transition-shadow ${ready ? "hover:shadow-md" : "opacity-70"}`}
                        data-testid={`card-config-${config.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg mb-1 truncate">{config.name}</CardTitle>
                              <CardDescription className="flex items-center gap-2">
                                <Globe className="h-3 w-3 flex-shrink-0" />
                                {getDomain(config)}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Competitors
                              </span>
                              <span className={`font-semibold ${competitorCount > 0 ? "text-primary" : "text-muted-foreground"}`}>
                                {competitorCount}
                              </span>
                            </div>
                            <div className="pt-2">
                              {ready ? (
                                <Link href={`/keyword-gap/${config.id}`}>
                                  <Button size="sm" className="w-full" data-testid={`button-analyze-${config.id}`}>
                                    <Zap className="h-4 w-4 mr-2" />
                                    Run Analysis
                                  </Button>
                                </Link>
                              ) : (
                                <div className="text-center">
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Add domain and competitors to enable analysis
                                  </p>
                                  <Link href={`/configuration/${config.id}`}>
                                    <Button variant="outline" size="sm" className="w-full" data-testid={`button-setup-${config.id}`}>
                                      Setup Configuration
                                    </Button>
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
