import { useState, useEffect } from "react";
import { useParams, useLocation, useSearch } from "wouter";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  RefreshCw,
  Database,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import { Link } from "wouter";
import { downloadKeywordGapXLSX } from "@/lib/downloadUtils";
import { TraceViewer } from "@/components/TraceViewer";

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

type IntentType = "category_capture" | "problem_solution" | "product_generic" | "brand_capture" | "variant_or_size" | "other";

// Intent weights for score breakdown tooltip (must match server/keyword-gap-lite.ts)
const INTENT_WEIGHTS: Record<IntentType, number> = {
  category_capture: 1.0,
  problem_solution: 1.0,
  product_generic: 0.8,
  brand_capture: 0.1,
  variant_or_size: 0.1,
  other: 0.5,
};

// Helper to format score breakdown for tooltip
function formatScoreBreakdown(kw: KeywordLiteResult): string {
  const volume = kw.searchVolume ?? 0;
  const cpc = kw.cpc ?? 1;
  const intentWeight = INTENT_WEIGHTS[kw.intentType] ?? 0.5;
  const capability = kw.capabilityScore ?? 0;
  const diffFactor = kw.difficultyFactor ?? 1;
  const posFactor = kw.positionFactor ?? 1;

  return [
    `Volume: ${volume.toLocaleString()}`,
    `CPC: $${cpc.toFixed(2)}`,
    `Intent: ${intentWeight.toFixed(1)}`,
    `Capability: ${(capability * 100).toFixed(0)}%`,
    `Difficulty: ${(diffFactor * 100).toFixed(0)}%`,
    `Position: ${(posFactor * 100).toFixed(0)}%`,
  ].join("\n");
}

import type {
  Disposition,
  Severity,
  UCRSectionID,
  ItemTrace,
  UCR_SECTION_NAMES as UCR_NAMES
} from "@shared/module.contract";

interface KeywordLiteResult {
  keyword: string;
  normalizedKeyword: string;
  status: "pass" | "review" | "out_of_play";
  disposition?: Disposition;
  statusIcon: string;
  intentType: IntentType;
  capabilityScore: number;
  opportunityScore: number;
  difficultyFactor?: number;
  positionFactor?: number;
  reason: string;
  reasons?: string[];
  flags: string[];
  confidence: "high" | "medium" | "low";
  competitorsSeen: string[];
  searchVolume?: number;
  cpc?: number;
  keywordDifficulty?: number;
  competitorPosition?: number;
  theme: string;
  trace?: ItemTrace[];
}

function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case "critical": return "text-red-600 dark:text-red-400";
    case "high": return "text-orange-600 dark:text-orange-400";
    case "medium": return "text-amber-600 dark:text-amber-400";
    case "low": return "text-muted-foreground";
  }
}

// Local TraceDisplay removed in favor of centralized TraceViewer component

function KeywordRowWithTrace({
  kw,
  index,
  testIdPrefix,
  showScore = true
}: {
  kw: KeywordLiteResult;
  index: number;
  testIdPrefix: string;
  showScore?: boolean;
}) {
  const [showTrace, setShowTrace] = useState(false);
  const hasTrace = kw.trace && kw.trace.length > 0;

  return (
    <>
      <TableRow data-testid={`row-${testIdPrefix}-${index}`}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2 flex-wrap">
            <span>{kw.keyword}</span>
            {kw.disposition && (
              <Badge variant="outline" className="text-xs font-mono">
                {kw.disposition}
              </Badge>
            )}
            {kw.flags?.includes("outside_fence") && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Fence
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">Outside current category scope. Verify alignment.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs capitalize">
            {kw.intentType.replace(/_/g, " ")}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          {kw.searchVolume?.toLocaleString() || "-"}
        </TableCell>
        <TableCell className="text-right font-mono text-xs">
          {kw.keywordDifficulty != null ? kw.keywordDifficulty : "-"}
        </TableCell>
        {showScore && (
          <TableCell className="text-right font-mono text-xs">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help underline decoration-dotted decoration-muted-foreground/50">
                    {Math.round(kw.opportunityScore).toLocaleString()}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="font-mono text-xs">
                  <div className="whitespace-pre-line">{formatScoreBreakdown(kw)}</div>
                  <div className="mt-1 pt-1 border-t border-muted text-right font-semibold">
                    = {Math.round(kw.opportunityScore).toLocaleString()}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </TableCell>
        )}
        <TableCell className="text-right">
          <Badge variant={kw.capabilityScore >= 0.7 ? "default" : "secondary"} className="text-xs">
            {Math.round(kw.capabilityScore * 100)}%
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate" title={kw.reason}>
          {kw.reason}
        </TableCell>
        <TableCell className="text-center">
          <Badge
            variant={kw.confidence === "high" ? "default" : kw.confidence === "medium" ? "secondary" : "outline"}
            className="text-xs capitalize"
          >
            {kw.confidence || "medium"}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          {hasTrace && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTrace(!showTrace)}
              data-testid={`btn-trace-${testIdPrefix}-${index}`}
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${showTrace ? 'rotate-90' : ''}`} />
            </Button>
          )}
        </TableCell>
      </TableRow>
      {hasTrace && showTrace && (
        <TableRow className="bg-muted/10">
          <TableCell colSpan={showScore ? 9 : 8} className="p-2 pt-0">
            <TraceViewer
              traces={kw.trace!}
              disposition={kw.disposition || (kw.status === "pass" ? "PASS" : kw.status === "review" ? "REVIEW" : "OUT_OF_PLAY")}
              isInitialOpen={true}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

interface UCRContext {
  ucr_version: string;
  sections_used: UCRSectionID[];
  rules_triggered: string[];
  executed_at: string;
  module_id: string;
}

interface KeywordGapLiteResult {
  brandDomain: string;
  competitors: string[];
  totalGapKeywords: number;
  topOpportunities: KeywordLiteResult[];
  needsReview: KeywordLiteResult[];
  outOfPlay: KeywordLiteResult[];
  grouped: Record<string, KeywordLiteResult[]>;
  stats: {
    passed: number;
    review: number;
    outOfPlay: number;
    percentPassed: number;
    percentReview: number;
    percentOutOfPlay: number;
  };
  filtersApplied: {
    excludedCategories: number;
    excludedKeywords: number;
    excludedUseCases: number;
    competitorBrandTerms: number;
    variantTerms: number;
    irrelevantEntities: number;
    lowCapability: number;
    totalFilters: number;
  };
  contextVersion: number;
  configurationName: string;
  fromCache?: boolean;
  provider?: string;
  ucrContext?: UCRContext;
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

type ProviderType = "dataforseo" | "ahrefs";

interface ProviderStatus {
  provider: ProviderType;
  displayName: string;
  configured: boolean;
  message?: string;
}

interface SavedAnalysis {
  id: number;
  userId: string;
  configurationId: number;
  configurationName: string;
  domain: string;
  provider: string;
  status: string;
  totalKeywords: number;
  passCount: number;
  reviewCount: number;
  outOfPlayCount: number;
  estimatedMissingValue: number;
  topThemes: { theme: string; count: number; totalVolume: number }[];
  results: KeywordGapLiteResult;
  parameters: Record<string, unknown>;
  created_at: string;
}

export default function KeywordGap() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const [competitorDomain, setCompetitorDomain] = useState("");
  const [activeTab, setActiveTab] = useState("gap");
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>("dataforseo");

  const configId = id ? parseInt(id, 10) : null;

  // Parse analysisId from query string
  const urlParams = new URLSearchParams(searchString);
  const analysisIdParam = urlParams.get("analysisId");
  const analysisId = analysisIdParam ? parseInt(analysisIdParam, 10) : null;

  // Fetch saved analysis if analysisId is present
  const { data: savedAnalysis, isLoading: savedAnalysisLoading } = useQuery<SavedAnalysis>({
    queryKey: ["/api/keyword-gap-analyses", analysisId],
    queryFn: async () => {
      const response = await fetch(`/api/keyword-gap-analyses/${analysisId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch saved analysis');
      }
      return response.json();
    },
    enabled: !!analysisId,
  });

  const { data: statusData, isLoading: statusLoading } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/keyword-gap/status"],
  });

  const { data: providersData } = useQuery<{ providers: ProviderStatus[] }>({
    queryKey: ["/api/keyword-gap-lite/providers"],
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
    mutationFn: async (params: {
      configurationId: number;
      limitPerDomain?: number;
      locationCode?: number;
      languageCode?: string;
      maxCompetitors?: number;
      provider: ProviderType;
      forceRefresh?: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/keyword-gap-lite/run", {
        configurationId: params.configurationId,
        limitPerDomain: params.limitPerDomain ?? 200,
        locationCode: params.locationCode ?? 2840,
        languageCode: params.languageCode ?? "en",
        maxCompetitors: params.maxCompetitors ?? 5,
        provider: params.provider,
        forceRefresh: params.forceRefresh ?? false,
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

  // When viewing a saved analysis, set the lite mutation data from the saved results
  useEffect(() => {
    if (savedAnalysis?.results) {
      // Trigger a "success" state on the mutation with saved data
      liteMutation.reset();
    }
  }, [savedAnalysis]);

  if (statusLoading || configLoading || savedAnalysisLoading) {
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

  // Use saved analysis results if available, otherwise use live mutation data
  const liteResult = savedAnalysis?.results || liteMutation.data;
  const isViewingSavedAnalysis = !!savedAnalysis;

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-6xl py-6 px-4">
        <Link href="/keyword-gap">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Analyses
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

        {/* Saved Analysis Banner */}
        {isViewingSavedAnalysis && savedAnalysis && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Viewing Saved Analysis
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Ran on {new Date(savedAnalysis.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} using {savedAnalysis.provider}
                    </p>
                  </div>
                </div>
                <Link href={`/keyword-gap/${configId}`}>
                  <Button variant="outline" size="sm" data-testid="button-run-new">
                    <Zap className="h-4 w-4 mr-2" />
                    Run New Analysis
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {!isViewingSavedAnalysis && (
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

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedProvider}
                      onValueChange={(v) => setSelectedProvider(v as ProviderType)}
                      data-testid="select-provider"
                    >
                      <SelectTrigger className="w-40" data-testid="select-provider-trigger">
                        <SelectValue placeholder="Data Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {providersData?.providers?.map((p) => (
                          <SelectItem
                            key={p.provider}
                            value={p.provider}
                            disabled={!p.configured}
                            data-testid={`select-provider-${p.provider}`}
                          >
                            {p.displayName} {!p.configured && "(Not configured)"}
                          </SelectItem>
                        )) || (
                            <>
                              <SelectItem value="dataforseo">DataForSEO</SelectItem>
                              <SelectItem value="ahrefs" disabled>Ahrefs (Coming soon)</SelectItem>
                            </>
                          )}
                      </SelectContent>
                    </Select>
                    <Button
                      className="flex-1"
                      onClick={() => liteMutation.mutate({
                        configurationId: Number(id),
                        provider: selectedProvider,
                      })}
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
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {isProvisional && "Results are provisional until human validation"}
                  </p>
                </div>
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
        )}

        {liteResult && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Keyword Gap Lite Results
                  </CardTitle>
                  <CardDescription>
                    {liteResult.brandDomain} vs {liteResult.competitors.length} competitors - Top 30 of {liteResult.totalGapKeywords} keywords
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {isProvisional && (
                    <Badge className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 border-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      AI-Generated
                    </Badge>
                  )}
                  {isConfirmed && (
                    <Badge className="flex items-center gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                      <CheckCircle className="h-3 w-3" />
                      Confirmed
                    </Badge>
                  )}
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <ShieldCheck className="h-3 w-3" />
                    v{liteResult.contextVersion}
                  </Badge>
                  <Badge className="flex items-center gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                    <CheckCircle className="h-3 w-3" />
                    {liteResult.stats.percentPassed}% Pass ({liteResult.stats.passed})
                  </Badge>
                  <Badge className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                    <HelpCircle className="h-3 w-3" />
                    {liteResult.stats.percentReview}% Review ({liteResult.stats.review})
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                    {liteResult.stats.percentOutOfPlay}% Out ({liteResult.stats.outOfPlay})
                  </Badge>
                  {liteResult.fromCache && !isViewingSavedAnalysis && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200" data-testid="badge-cached-data">
                          <Database className="h-3 w-3" />
                          Datos de Cache
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Estos resultados provienen del cache (24h TTL).</p>
                        <p>Use "Regenerar" para obtener datos frescos de la API.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex gap-2">
                  {liteResult.fromCache && !isViewingSavedAnalysis && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            liteMutation.mutate({
                              configurationId: Number(id),
                              limitPerDomain: 200,
                              locationCode: 2840,
                              languageCode: "en",
                              maxCompetitors: 5,
                              provider: selectedProvider,
                              forceRefresh: true,
                            });
                          }}
                          disabled={liteMutation.isPending}
                          data-testid="button-regenerate"
                        >
                          {liteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Regenerar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-medium">Regenerar datos frescos</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Esto hara una nueva llamada a la API de {selectedProvider === "ahrefs" ? "Ahrefs" : "DataForSEO"},
                          lo cual consume creditos de tu plan.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!config || !liteResult) return;
                          downloadKeywordGapXLSX(
                            config,
                            liteResult.topOpportunities,
                            liteResult.needsReview,
                            liteResult.outOfPlay,
                            liteResult.stats,
                            liteResult.filtersApplied,
                            `keyword-gap-${config.brand?.domain || "report"}-${new Date().toISOString().split("T")[0]}`
                          );
                        }}
                        data-testid="button-download-xlsx"
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Descargar Excel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium">Descargar reporte completo en Excel</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Incluye el contexto, resumen del analisis, y todas las keywords organizadas por hojas.
                      </p>
                    </TooltipContent>
                  </Tooltip>
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
              {/* UCR Context Traceability */}
              {liteResult.ucrContext && (
                <Collapsible className="mt-4">
                  <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="trigger-ucr-context">
                    <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                    UCR Context: {liteResult.ucrContext.ucr_version}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-3 rounded-md bg-muted/30 border text-xs space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-muted-foreground mr-1">Sections Used:</span>
                      {liteResult.ucrContext.sections_used.map((section) => (
                        <Badge key={section} variant="outline" className="text-xs">
                          {section}
                        </Badge>
                      ))}
                    </div>
                    {liteResult.ucrContext.rules_triggered.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-muted-foreground mr-1">Rules Triggered:</span>
                        {liteResult.ucrContext.rules_triggered.map((rule) => (
                          <Badge key={rule} variant="secondary" className="text-xs">
                            {rule}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="text-muted-foreground">
                      Executed: {new Date(liteResult.ucrContext.executed_at).toLocaleString()}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardHeader>
            <CardContent>
              {/* Executive Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-md border bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-1">Estimated Missing Value</div>
                  <div className="text-2xl font-bold" data-testid="stat-missing-value">
                    ${(() => {
                      // Confidence-weighted capture probability calculation
                      const computeCaptureProbability = (kw: KeywordLiteResult) => {
                        // Status factor based on keyword's actual status
                        const hasFenceFlag = kw.flags?.includes("outside_fence");
                        let statusFactor: number;
                        if (kw.status === "pass" && !hasFenceFlag) {
                          statusFactor = 0.7; // Strong Pass
                        } else if (kw.status === "pass" && hasFenceFlag) {
                          statusFactor = 0.4; // Fence (outside category but strong capability)
                        } else if (kw.status === "review") {
                          statusFactor = 0.2; // Review
                        } else {
                          statusFactor = 0.05; // Out of play (shouldn't happen but safe default)
                        }

                        // Confidence factor
                        const confidenceMap: Record<string, number> = { high: 1.0, medium: 0.7, low: 0.4 };
                        const confidenceFactor = confidenceMap[kw.confidence] || 0.7;

                        // KD factor (lower KD = easier to rank) - clamp to 0-100 range
                        const kd = Math.min(100, Math.max(0, kw.keywordDifficulty ?? 50));
                        const kdFactor = 1 - (kd / 100) * 0.5; // 100 KD -> 0.5x, 0 KD -> 1.0x

                        // Position factor (competitor at pos 15+ = easier opportunity)
                        const pos = kw.competitorPosition ?? 10;
                        let posFactor: number;
                        if (pos <= 3) posFactor = 0.5;  // Hard to displace
                        else if (pos <= 10) posFactor = 0.7;
                        else if (pos <= 20) posFactor = 0.9;
                        else posFactor = 1.0; // Weak competitor hold

                        return Math.max(0, Math.min(1, statusFactor * confidenceFactor * kdFactor * posFactor));
                      };

                      // Sum both Pass and Review keywords with capture probability
                      const passValue = liteResult.topOpportunities.reduce((sum, kw) => {
                        const baseValue = (kw.searchVolume || 0) * (kw.cpc || 0.5) * 0.03;
                        const captureProbability = computeCaptureProbability(kw);
                        return sum + (baseValue * captureProbability);
                      }, 0);

                      const reviewValue = liteResult.needsReview.reduce((sum, kw) => {
                        const baseValue = (kw.searchVolume || 0) * (kw.cpc || 0.5) * 0.03;
                        const captureProbability = computeCaptureProbability(kw);
                        return sum + (baseValue * captureProbability);
                      }, 0);

                      const totalValue = passValue + reviewValue;
                      return totalValue > 1000
                        ? `${(totalValue / 1000).toFixed(1)}K`
                        : totalValue.toFixed(0);
                    })()}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs text-muted-foreground mt-1 cursor-help underline decoration-dotted">
                          Weighted by capture probability
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs max-w-[250px]">
                        <div className="space-y-1">
                          <p><strong>Capture Probability Factors:</strong></p>
                          <p>Status: Pass 70%, Fence 40%, Review 20%</p>
                          <p>Confidence: High 100%, Med 70%, Low 40%</p>
                          <p>KD: Lower = better capture rate</p>
                          <p>Position: Higher = weaker competitor hold</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="p-4 rounded-md border bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-1">Top Themes</div>
                  <div className="flex flex-wrap gap-1" data-testid="stat-top-themes">
                    {Object.entries(liteResult.grouped || {})
                      .sort((a, b) => b[1].length - a[1].length)
                      .slice(0, 4)
                      .map(([theme, keywords]) => (
                        <Badge key={theme} variant="outline" className="text-xs">
                          {theme} ({keywords.length})
                        </Badge>
                      ))}
                  </div>
                </div>
                <div className="p-4 rounded-md border bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-1">Competitor Ownership</div>
                  <div className="space-y-1" data-testid="stat-competitor-owners">
                    {(() => {
                      const competitorCounts: Record<string, number> = {};
                      liteResult.topOpportunities.forEach(kw => {
                        kw.competitorsSeen?.forEach(c => {
                          competitorCounts[c] = (competitorCounts[c] || 0) + 1;
                        });
                      });
                      return Object.entries(competitorCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([comp, count]) => (
                          <div key={comp} className="flex items-center justify-between text-xs">
                            <span className="truncate max-w-[120px]">{comp}</span>
                            <Badge variant="secondary" className="text-xs">{count}</Badge>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="opportunities" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="opportunities" data-testid="tab-opportunities">
                    Top Opportunities ({liteResult.topOpportunities.length})
                  </TabsTrigger>
                  <TabsTrigger value="review" data-testid="tab-review">
                    Needs Review ({liteResult.needsReview.length})
                  </TabsTrigger>
                  <TabsTrigger value="out" data-testid="tab-out">
                    Out of Play ({liteResult.outOfPlay.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="opportunities">
                  <p className="text-sm text-muted-foreground mb-4">
                    High-capability keywords aligned with your category. Ready to target.
                  </p>
                  {liteResult.topOpportunities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No top opportunities found. Check "Needs Review" for borderline keywords.
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Keyword</TableHead>
                            <TableHead>Intent</TableHead>
                            <TableHead className="text-right">Volume</TableHead>
                            <TableHead className="text-right">KD</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead className="text-right">Capability</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead className="text-center">Confidence</TableHead>
                            <TableHead className="text-center">Trace</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {liteResult.topOpportunities.slice(0, 50).map((kw, i) => (
                            <KeywordRowWithTrace
                              key={i}
                              kw={kw}
                              index={i}
                              testIdPrefix="opportunity"
                              showScore={true}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="review">
                  <p className="text-sm text-muted-foreground mb-4">
                    Medium-capability keywords. Review for potential opportunities or exclusions.
                  </p>
                  {liteResult.needsReview.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No keywords need review.
                    </div>
                  ) : (
                    <div className="border rounded-md border-amber-200 dark:border-amber-900">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Keyword</TableHead>
                            <TableHead>Intent</TableHead>
                            <TableHead className="text-right">Volume</TableHead>
                            <TableHead className="text-right">KD</TableHead>
                            <TableHead className="text-right">Capability</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead className="text-center">Confidence</TableHead>
                            <TableHead className="text-center">Trace</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {liteResult.needsReview.slice(0, 50).map((kw, i) => (
                            <KeywordRowWithTrace
                              key={i}
                              kw={kw}
                              index={i}
                              testIdPrefix="review"
                              showScore={false}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="out">
                  <p className="text-sm text-muted-foreground mb-4">
                    Keywords filtered out, grouped by reason. Expand each category to view details.
                  </p>
                  {liteResult.outOfPlay.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No keywords marked as out of play.
                    </div>
                  ) : (
                    (() => {
                      // Group keywords by reason category
                      const reasonGroups: Record<string, { label: string; keywords: typeof liteResult.outOfPlay }> = {
                        competitor_brand: { label: "Competitor Brand Terms", keywords: [] },
                        size_variant: { label: "Size/Variant Queries", keywords: [] },
                        irrelevant_entity: { label: "Irrelevant Entity Keywords", keywords: [] },
                        excluded: { label: "Excluded by Negative Scope", keywords: [] },
                        low_capability: { label: "Low Capability Fit", keywords: [] },
                        other: { label: "Other", keywords: [] },
                      };

                      liteResult.outOfPlay.forEach(kw => {
                        if (kw.flags.includes("competitor_brand")) {
                          reasonGroups.competitor_brand.keywords.push(kw);
                        } else if (kw.flags.includes("size_variant")) {
                          reasonGroups.size_variant.keywords.push(kw);
                        } else if (kw.flags.includes("irrelevant_entity")) {
                          reasonGroups.irrelevant_entity.keywords.push(kw);
                        } else if (kw.flags.includes("excluded")) {
                          reasonGroups.excluded.keywords.push(kw);
                        } else if (kw.reason === "Low capability fit") {
                          reasonGroups.low_capability.keywords.push(kw);
                        } else {
                          reasonGroups.other.keywords.push(kw);
                        }
                      });

                      const nonEmptyGroups = Object.entries(reasonGroups)
                        .filter(([_, group]) => group.keywords.length > 0)
                        .sort((a, b) => b[1].keywords.length - a[1].keywords.length);

                      return (
                        <Accordion type="multiple" className="w-full space-y-2">
                          {nonEmptyGroups.map(([key, group]) => (
                            <AccordionItem key={key} value={key} className="border rounded-md px-4">
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-3">
                                  <Badge variant="secondary" className="text-xs">
                                    {group.keywords.length}
                                  </Badge>
                                  <span className="text-sm font-medium">{group.label}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="border rounded-md mt-2">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Keyword</TableHead>
                                        <TableHead className="text-right">Volume</TableHead>
                                        <TableHead className="text-right">KD</TableHead>
                                        <TableHead>Reason</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.keywords.slice(0, 50).map((kw, i) => (
                                        <TableRow key={i} data-testid={`row-out-${key}-${i}`} className="text-muted-foreground">
                                          <TableCell className="font-medium">{kw.keyword}</TableCell>
                                          <TableCell className="text-right font-mono text-xs">
                                            {kw.searchVolume?.toLocaleString() || "-"}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-xs">
                                            {kw.keywordDifficulty ?? "-"}
                                          </TableCell>
                                          <TableCell className="text-xs max-w-[200px] truncate" title={kw.reason}>
                                            {kw.reason}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      {group.keywords.length > 50 && (
                                        <TableRow>
                                          <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-2">
                                            ... and {group.keywords.length - 50} more
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      );
                    })()
                  )}
                </TabsContent>
              </Tabs>

              {/* Approve Context & Adopt Analysis button - only shown when provisional */}
              {isProvisional && liteResult && (
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
