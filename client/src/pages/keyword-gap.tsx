import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Search,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  BarChart3,
  Users,
  Minus,
  Zap,
  CheckCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Link } from "wouter";

interface RankedKeyword {
  keyword: string;
  search_volume?: number;
  position?: number;
  position_type?: string;
  cpc?: number;
  competition?: number;
}

interface OverlapKeyword {
  keyword: string;
  brand_position: number;
  competitor_position: number;
  search_volume: number;
  gap: number;
}

interface KeywordGapResult {
  brand_domain: string;
  competitor_domain: string;
  gap_keywords: RankedKeyword[];
  overlap_keywords: OverlapKeyword[];
  total_gap_keywords: number;
  total_overlap_keywords: number;
  ucr_guardrails_applied: boolean;
  configuration_name: string;
}

type ContextStatus = "DRAFT_AI" | "AI_READY" | "AI_ANALYSIS_RUN" | "HUMAN_CONFIRMED" | "LOCKED";

interface Configuration {
  id: number;
  name: string;
  brand: { domain: string; name: string };
  competitors: { 
    direct: string[]; 
    indirect: string[];
    competitors?: { status: string; name: string }[];
  };
  category_definition?: {
    primary_category: string;
    included: string[];
    excluded: string[];
  };
  negative_scope?: {
    enforcement_rules?: {
      hard_exclusion: boolean;
    };
    excluded_categories?: string[];
    excluded_keywords?: string[];
  };
  governance?: {
    quality_score?: {
      overall: number;
    };
    validation_status?: string;
    human_verified?: boolean;
    context_status?: ContextStatus;
    context_confidence?: {
      level: "high" | "medium" | "low";
    };
  };
}

interface KeywordLiteResult {
  keyword: string;
  normalizedKeyword: string;
  status: "pass" | "warn" | "block";
  statusIcon: string;
  reason: string;
  competitorsSeen: string[];
  searchVolume?: number;
  theme: string;
}

interface KeywordGapLiteResult {
  brandDomain: string;
  competitors: string[];
  totalGapKeywords: number;
  results: KeywordLiteResult[];
  grouped: Record<string, KeywordLiteResult[]>;
  borderline: KeywordLiteResult[];
  stats: {
    passed: number;
    blocked: number;
  };
  filtersApplied: {
    excludedCategories: number;
    excludedKeywords: number;
    excludedUseCases: number;
    totalFilters: number;
  };
  contextVersion: number;
  configurationName: string;
}

// Auto-checks for AI_READY transition (determines if context can run AI analysis)
function runAutoChecks(config: Configuration | undefined) {
  if (!config) {
    return { passed: false, checks: [{ name: "Context loaded", passed: false }] };
  }
  
  const checks: { name: string; passed: boolean }[] = [];
  
  // Check 1: Category Included not empty
  const hasIncluded = (config.category_definition?.included?.length || 0) > 0;
  checks.push({ name: "Category fence (included terms)", passed: hasIncluded });
  
  // Check 2: Negative Scope not empty (has exclusions)
  const hasNegativeScope = (
    (config.negative_scope?.excluded_categories?.length || 0) > 0 ||
    (config.negative_scope?.excluded_keywords?.length || 0) > 0
  );
  checks.push({ name: "Negative scope defined", passed: hasNegativeScope });
  
  // Check 3: At least 2 direct competitors with domain
  const approvedCompetitors = config.competitors?.competitors?.filter(c => c.status === "approved")?.length || 0;
  const directCompetitors = config.competitors?.direct?.length || 0;
  const hasCompetitors = (approvedCompetitors + directCompetitors) >= 2;
  checks.push({ name: "2+ competitors defined", passed: hasCompetitors });
  
  // Check 4: Hard exclusions active
  const hardExclusionEnabled = config.negative_scope?.enforcement_rules?.hard_exclusion !== false;
  checks.push({ name: "Hard exclusions enabled", passed: hardExclusionEnabled });
  
  // Check 5: Confidence not low
  const confidenceNotLow = config.governance?.context_confidence?.level !== "low";
  checks.push({ name: "Context confidence not low", passed: confidenceNotLow });
  
  const allPassed = checks.every(c => c.passed);
  
  return { passed: allPassed, checks };
}

// Determine effective context status based on auto-checks and stored status
function getEffectiveContextStatus(config: Configuration | undefined): {
  status: ContextStatus;
  autoChecks: ReturnType<typeof runAutoChecks>;
} {
  const autoChecks = runAutoChecks(config);
  const storedStatus = config?.governance?.context_status || "DRAFT_AI";
  
  // If stored status is DRAFT_AI but auto-checks pass, it's effectively AI_READY
  if (storedStatus === "DRAFT_AI" && autoChecks.passed) {
    return { status: "AI_READY", autoChecks };
  }
  
  // If stored status is AI_READY but auto-checks fail, it's effectively DRAFT_AI
  if (storedStatus === "AI_READY" && !autoChecks.passed) {
    return { status: "DRAFT_AI", autoChecks };
  }
  
  return { status: storedStatus, autoChecks };
}

// Helper for context status display
function getContextStatusInfo(status: ContextStatus) {
  switch (status) {
    case "DRAFT_AI":
      return { 
        label: "Draft (AI)", 
        color: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-100 dark:bg-gray-800",
        description: "Auto-checks not yet passed" 
      };
    case "AI_READY":
      return { 
        label: "AI Ready", 
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
        description: "Ready for AI-generated analysis" 
      };
    case "AI_ANALYSIS_RUN":
      return { 
        label: "AI Analysis Run", 
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
        description: "Results are provisional, pending validation" 
      };
    case "HUMAN_CONFIRMED":
      return { 
        label: "Human Confirmed", 
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
        description: "Analysis adopted and validated" 
      };
    case "LOCKED":
      return { 
        label: "Locked", 
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-100 dark:bg-purple-900/30",
        description: "Context is locked" 
      };
    default:
      return { 
        label: status, 
        color: "text-gray-600",
        bgColor: "bg-gray-100",
        description: "" 
      };
  }
}

export default function KeywordGap() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [activeTab, setActiveTab] = useState("gap");

  const configId = id ? parseInt(id, 10) : null;

  const { data: statusData, isLoading: statusLoading } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/keyword-gap/status"],
  });

  const { data: config, isLoading: configLoading } = useQuery<Configuration>({
    queryKey: ["/api/configurations", configId],
    enabled: !!configId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async (competitor: string) => {
      const response = await apiRequest("POST", "/api/keyword-gap/analyze", {
        configurationId: configId,
        competitorDomain: competitor,
        limit: 100,
      });
      return response.json() as Promise<KeywordGapResult>;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const compareAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/keyword-gap/compare-all", {
        configurationId: configId,
        limit: 50,
      });
      return response.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const liteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/keyword-gap-lite/run", {
        configurationId: configId,
        limitPerDomain: 200,
        maxCompetitors: 5,
      });
      return response.json() as Promise<KeywordGapLiteResult>;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!competitorDomain.trim()) {
      toast({
        title: "Error",
        description: "Please enter a competitor domain",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate(competitorDomain.trim());
  };

  const handleQuickAnalyze = (competitor: string) => {
    setCompetitorDomain(competitor);
    analyzeMutation.mutate(competitor);
  };

  if (statusLoading || configLoading) {
    return (
      <div className="h-full p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!statusData?.configured) {
    return (
      <ScrollArea className="h-full">
        <div className="container max-w-4xl py-6 px-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contexts
            </Button>
          </Link>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                DataForSEO Not Configured
              </CardTitle>
              <CardDescription>
                To use Keyword Gap analysis, you need to configure your DataForSEO credentials.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure the following environment variables:
              </p>
              <div className="bg-muted p-4 rounded-md font-mono text-sm">
                <div>DATAFORSEO_LOGIN=your_login</div>
                <div>DATAFORSEO_PASSWORD=your_password</div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                You can obtain your credentials at{" "}
                <a href="https://app.dataforseo.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  app.dataforseo.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  if (!config) {
    return (
      <ScrollArea className="h-full">
        <div className="container max-w-4xl py-6 px-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contexts
            </Button>
          </Link>
          
          <Card>
            <CardHeader>
              <CardTitle>Context not found</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  const allCompetitors = [
    ...(config.competitors?.direct || []),
    ...(config.competitors?.indirect || []),
  ].slice(0, 10);

  // Get effective context status (auto-checks determine if AI_READY)
  const { status: contextStatus, autoChecks } = getEffectiveContextStatus(config);
  const statusInfo = getContextStatusInfo(contextStatus);
  
  // Can run analysis if AI_READY or higher
  const canRunAnalysis = ["AI_READY", "AI_ANALYSIS_RUN", "HUMAN_CONFIRMED"].includes(contextStatus);
  const isProvisional = contextStatus === "AI_READY" || contextStatus === "AI_ANALYSIS_RUN";
  const isConfirmed = contextStatus === "HUMAN_CONFIRMED" || contextStatus === "LOCKED";

  const result = analyzeMutation.data;

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-6xl py-6 px-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contexts
          </Button>
        </Link>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Keyword Gap Analysis</h1>
            <p className="text-muted-foreground">
              {config.name} - {config.brand.domain}
            </p>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            UCR Guardrails Active
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Analyze Competitor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., competitor.com"
                  value={competitorDomain}
                  onChange={(e) => setCompetitorDomain(e.target.value)}
                  data-testid="input-competitor-domain"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  data-testid="button-analyze"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Analyze
                </Button>
              </div>

              {allCompetitors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Configured competitors:</p>
                  <div className="flex flex-wrap gap-2">
                    {allCompetitors.map((comp) => (
                      <Button
                        key={comp}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAnalyze(comp)}
                        disabled={analyzeMutation.isPending}
                        data-testid={`button-competitor-${comp}`}
                      >
                        {comp}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Analysis
              </CardTitle>
              <CardDescription>
                <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                  {statusInfo.label}
                </Badge>
                <span className="ml-2 text-xs">{statusInfo.description}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Auto-checks status */}
              {!autoChecks.passed && (
                <div className="text-xs border rounded-md p-3 bg-muted/50">
                  <p className="font-medium mb-2">Auto-Checks Required:</p>
                  <ul className="space-y-1">
                    {autoChecks.checks.map((check, i) => (
                      <li key={i} className="flex items-center gap-2">
                        {check.passed ? (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className={check.passed ? "text-muted-foreground" : ""}>{check.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* AI-Ready messaging */}
              {canRunAnalysis && isProvisional && (
                <div className="text-xs border border-amber-200 dark:border-amber-800 rounded-md p-3 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">AI-Generated Mode</p>
                  <p className="text-amber-600 dark:text-amber-400">
                    Results will be generated automatically and must be reviewed before adoption.
                  </p>
                </div>
              )}
              
              {/* Human Confirmed messaging */}
              {isConfirmed && (
                <div className="text-xs border border-green-200 dark:border-green-800 rounded-md p-3 bg-green-50/50 dark:bg-green-950/20">
                  <p className="font-medium text-green-700 dark:text-green-300 mb-1">Human Confirmed</p>
                  <p className="text-green-600 dark:text-green-400">
                    This context has been validated and adopted. Analysis results are official.
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => liteMutation.mutate()}
                disabled={liteMutation.isPending || !canRunAnalysis}
                data-testid="button-gap-lite"
              >
                {liteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {isProvisional ? "Run Keyword Gap (AI-Generated)" : "Run Keyword Gap Lite"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {isProvisional && "Results are provisional until human validation"}
              </p>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => compareAllMutation.mutate()}
                disabled={compareAllMutation.isPending || !canRunAnalysis}
                data-testid="button-compare-all"
              >
                {compareAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Compare All Competitors
              </Button>
            </CardContent>
          </Card>
        </div>

        {liteMutation.data && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Keyword Gap Lite Results
                  </CardTitle>
                  <CardDescription>
                    {liteMutation.data.brandDomain} vs {liteMutation.data.competitors.length} competitors - Top 30 of {liteMutation.data.totalGapKeywords} keywords
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* AI-Generated Badge - visible when provisional */}
                  {isProvisional && (
                    <Badge className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      AI-Generated - Pending Validation
                    </Badge>
                  )}
                  {isConfirmed && (
                    <Badge className="flex items-center gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                      <CheckCircle className="h-3 w-3" />
                      Human Confirmed
                    </Badge>
                  )}
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <ShieldCheck className="h-3 w-3" />
                    v{liteMutation.data.contextVersion}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1 text-xs border-amber-500 text-amber-700">
                    <Target className="h-3 w-3" />
                    {liteMutation.data.filtersApplied.totalFilters} filters
                  </Badge>
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {liteMutation.data.stats.passed} passed
                  </Badge>
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {liteMutation.data.stats.blocked} blocked
                  </Badge>
                </div>
              </div>
              {/* AI-Generated warning banner */}
              {isProvisional && (
                <div className="mt-4 text-sm p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
                  <strong>This analysis was generated using an AI-proposed context.</strong>
                  <br />
                  Review context and exclusions before approving.
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {Object.entries(liteMutation.data.grouped).map(([theme, keywords]) => (
                  <AccordionItem key={theme} value={theme}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{theme}</span>
                        <Badge variant="outline" className="text-xs">
                          {keywords.length} keywords
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8">Status</TableHead>
                              <TableHead>Keyword</TableHead>
                              <TableHead>Competitors</TableHead>
                              <TableHead className="text-right">Reason</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {keywords.map((kw, i) => (
                              <TableRow key={i} data-testid={`row-lite-${theme}-${i}`}>
                                <TableCell>
                                  <span className="text-lg" title={kw.reason}>
                                    {kw.status === "pass" && <CheckCircle className="h-4 w-4 text-green-600" />}
                                    {kw.status === "warn" && <HelpCircle className="h-4 w-4 text-amber-500" />}
                                    {kw.status === "block" && <XCircle className="h-4 w-4 text-red-500" />}
                                  </span>
                                </TableCell>
                                <TableCell className="font-medium">{kw.keyword}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {kw.competitorsSeen.map((c, j) => (
                                      <Badge key={j} variant="outline" className="text-xs">
                                        {c}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground max-w-[200px] truncate" title={kw.reason}>
                                  {kw.reason}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {Object.keys(liteMutation.data.grouped).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No gap keywords found that pass the guardrails
                </div>
              )}

              {liteMutation.data.borderline && liteMutation.data.borderline.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h4 className="font-medium text-sm">Borderline - Requires Human Review ({liteMutation.data.borderline.length})</h4>
                  </div>
                  <div className="border rounded-md border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">Status</TableHead>
                          <TableHead>Keyword</TableHead>
                          <TableHead>Theme</TableHead>
                          <TableHead className="text-right">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {liteMutation.data.borderline.map((kw, i) => (
                          <TableRow key={i} data-testid={`row-borderline-${i}`}>
                            <TableCell>
                              <HelpCircle className="h-4 w-4 text-amber-500" />
                            </TableCell>
                            <TableCell className="font-medium">{kw.keyword}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{kw.theme}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground max-w-[200px] truncate" title={kw.reason}>
                              {kw.reason}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Approve Context & Adopt Analysis button - only shown when provisional */}
              {isProvisional && liteMutation.data && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">Ready to adopt this analysis?</p>
                      <p className="text-xs">This will mark the context as Human Confirmed and make results official.</p>
                    </div>
                    <Button 
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      data-testid="button-approve-adopt"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Context & Adopt Analysis
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">
                    {result.brand_domain} vs {result.competitor_domain}
                  </CardTitle>
                  <CardDescription>
                    {result.total_gap_keywords} gap keywords, {result.total_overlap_keywords} in common
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    <Target className="h-3 w-3 mr-1" />
                    Gap: {result.total_gap_keywords}
                  </Badge>
                  <Badge variant="outline">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Overlap: {result.total_overlap_keywords}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="gap" data-testid="tab-gap">
                    Gap Keywords ({result.gap_keywords.length})
                  </TabsTrigger>
                  <TabsTrigger value="overlap" data-testid="tab-overlap">
                    Common Keywords ({result.overlap_keywords.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="gap">
                  <p className="text-sm text-muted-foreground mb-4">
                    Keywords where the competitor ranks but your brand does not. Potential content opportunities.
                  </p>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Keyword</TableHead>
                          <TableHead className="text-right">Search Volume</TableHead>
                          <TableHead className="text-right">Competitor Pos.</TableHead>
                          <TableHead className="text-right">CPC</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.gap_keywords.slice(0, 20).map((kw, i) => (
                          <TableRow key={i} data-testid={`row-gap-keyword-${i}`}>
                            <TableCell className="font-medium">{kw.keyword}</TableCell>
                            <TableCell className="text-right">
                              {kw.search_volume?.toLocaleString() || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                #{kw.position || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {kw.cpc ? `$${kw.cpc.toFixed(2)}` : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {result.gap_keywords.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No gap keywords found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {result.gap_keywords.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Showing 20 of {result.gap_keywords.length} keywords
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="overlap">
                  <p className="text-sm text-muted-foreground mb-4">
                    Keywords where both domains rank. Positive gap = your brand ranks higher.
                  </p>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Keyword</TableHead>
                          <TableHead className="text-right">Your Position</TableHead>
                          <TableHead className="text-right">Competitor Pos.</TableHead>
                          <TableHead className="text-right">Gap</TableHead>
                          <TableHead className="text-right">Search Volume</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.overlap_keywords.slice(0, 20).map((kw, i) => (
                          <TableRow key={i} data-testid={`row-overlap-keyword-${i}`}>
                            <TableCell className="font-medium">{kw.keyword}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="text-xs">
                                #{kw.brand_position}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                #{kw.competitor_position}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {kw.gap > 0 ? (
                                <span className="text-green-600 dark:text-green-400 flex items-center justify-end gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  +{kw.gap}
                                </span>
                              ) : kw.gap < 0 ? (
                                <span className="text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                                  <TrendingDown className="h-3 w-3" />
                                  {kw.gap}
                                </span>
                              ) : (
                                <span className="text-muted-foreground flex items-center justify-end gap-1">
                                  <Minus className="h-3 w-3" />
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {kw.search_volume?.toLocaleString() || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {result.overlap_keywords.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No common keywords found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {result.overlap_keywords.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Showing 20 of {result.overlap_keywords.length} keywords
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {compareAllMutation.data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Multi-Competitor Analysis Summary</CardTitle>
              <CardDescription>
                Keywords prioritized by frequency of appearance across competitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-right">Competitors</TableHead>
                      <TableHead className="text-right">Total Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(compareAllMutation.data.prioritized_gap_keywords || []).slice(0, 15).map((kw: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{kw.keyword}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{kw.count}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {kw.totalVolume?.toLocaleString() || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
