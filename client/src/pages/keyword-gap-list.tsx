import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, FileText, Calendar, Globe, Users, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import type { Configuration } from "@shared/schema";

export default function KeywordGapList() {
  const { data: configurations, isLoading, error } = useQuery<Configuration[]>({
    queryKey: ["/api/configurations"],
  });

  const getCompetitorCount = (config: Configuration): number => {
    const competitors = config.competitors?.competitors;
    if (!competitors || !Array.isArray(competitors)) return 0;
    return competitors.filter(c => c.tier === "tier1" || c.tier === "tier2").length;
  };

  const getDomain = (config: Configuration): string => {
    return config.brand?.domain || "No domain";
  };

  const getCategory = (config: Configuration): string => {
    return config.category_definition?.primary_category || "No category";
  };

  const isReadyForAnalysis = (config: Configuration): boolean => {
    const domain = config.brand?.domain;
    const competitors = getCompetitorCount(config);
    return !!domain && competitors > 0;
  };

  const getStatusBadge = (config: Configuration) => {
    const status = config.governance?.context_status;
    if (status === "LOCKED" || status === "HUMAN_CONFIRMED") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Confirmed
        </Badge>
      );
    }
    if (status === "AI_READY" || status === "AI_ANALYSIS_RUN") {
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          AI-Generated
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        Draft
      </Badge>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Keyword Gap Analysis</h1>
              <p className="text-sm text-muted-foreground">
                Select a configuration to run keyword gap analysis
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          {isLoading ? (
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
          ) : error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-4">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Error loading configurations</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  There was an error loading your configurations. Please try again.
                </p>
              </CardContent>
            </Card>
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
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            {config.updated_at 
                              ? new Date(config.updated_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : "No date"
                            }
                          </CardDescription>
                        </div>
                        {getStatusBadge(config)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Domain
                          </span>
                          <span className="font-medium truncate max-w-[150px]" title={getDomain(config)}>
                            {getDomain(config)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Category
                          </span>
                          <span className="font-medium truncate max-w-[150px]" title={getCategory(config)}>
                            {getCategory(config)}
                          </span>
                        </div>
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
                              <Link href={`/keyword-gap/${config.id}`}>
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
        </div>
      </div>
    </div>
  );
}
