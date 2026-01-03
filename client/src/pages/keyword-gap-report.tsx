import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Eye,
  EyeOff,
  Award,
  BarChart3,
  PieChart,
  Download,
  Printer,
  FileText,
  CheckCircle,
  XCircle,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
} from "lucide-react";
import { Link } from "wouter";

interface VisibilityData {
  brand: {
    domain: string;
    name: string;
    totalKeywords: number;
    top3: number;
    top10: number;
    top20: number;
    top100: number;
    notRanking: number;
    visibilityScore: number;
    avgPosition: number;
  };
  competitors: {
    domain: string;
    name: string;
    totalKeywords: number;
    top3: number;
    top10: number;
    top20: number;
    top100: number;
    notRanking: number;
    visibilityScore: number;
    avgPosition: number;
  }[];
  keywordAnalysis: {
    keyword: string;
    searchVolume: number;
    difficulty: number;
    brandPosition: number | null;
    competitorPositions: { domain: string; position: number | null }[];
    opportunity: "high" | "medium" | "low";
    opportunityReason: string;
  }[];
  summary: {
    totalKeywordsAnalyzed: number;
    brandAdvantage: number;
    competitorAdvantage: number;
    sharedKeywords: number;
    uniqueOpportunities: number;
  };
}

interface Configuration {
  id: number;
  name: string;
  brand: { domain: string; name: string };
  competitors: { 
    direct: string[]; 
    indirect: string[];
    competitors?: { status: string; name: string; domain: string }[];
  };
  governance?: {
    context_status?: string;
  };
}

function getPositionBadge(position: number | null) {
  if (position === null) return <Badge variant="outline" className="text-xs text-muted-foreground"><EyeOff className="h-3 w-3 mr-1" />N/R</Badge>;
  if (position <= 3) return <Badge className="bg-green-600 text-white text-xs"><Award className="h-3 w-3 mr-1" />{position}</Badge>;
  if (position <= 10) return <Badge className="bg-blue-600 text-white text-xs">{position}</Badge>;
  if (position <= 20) return <Badge variant="secondary" className="text-xs">{position}</Badge>;
  if (position <= 50) return <Badge variant="outline" className="text-xs">{position}</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">{position}</Badge>;
}

function getOpportunityBadge(opportunity: "high" | "medium" | "low") {
  switch (opportunity) {
    case "high":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"><TrendingUp className="h-3 w-3 mr-1" />High Priority</Badge>;
    case "medium":
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"><Minus className="h-3 w-3 mr-1" />Medium</Badge>;
    case "low":
      return <Badge variant="outline" className="text-muted-foreground"><TrendingDown className="h-3 w-3 mr-1" />Low</Badge>;
  }
}

function VisibilityBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-medium w-12 text-right">{value}</span>
    </div>
  );
}

function generateMockVisibilityData(config: Configuration): VisibilityData {
  const approvedCompetitors = config.competitors?.competitors?.filter(c => c.status === "approved") || [];
  const competitorDomains = approvedCompetitors.slice(0, 5).map(c => ({
    domain: c.domain || c.name.toLowerCase().replace(/\s+/g, "") + ".com",
    name: c.name,
  }));

  const generatePositionData = (bias: number) => {
    const total = 100;
    const top3 = Math.floor(Math.random() * 15 * bias);
    const top10 = Math.floor(Math.random() * 25 * bias);
    const top20 = Math.floor(Math.random() * 20 * bias);
    const top100 = Math.floor(Math.random() * 25 * bias);
    const notRanking = total - top3 - top10 - top20 - top100;
    return {
      totalKeywords: total,
      top3: Math.max(0, top3),
      top10: Math.max(0, top10),
      top20: Math.max(0, top20),
      top100: Math.max(0, top100),
      notRanking: Math.max(0, notRanking),
      visibilityScore: Math.floor((top3 * 10 + top10 * 7 + top20 * 4 + top100 * 1) / 10),
      avgPosition: Math.floor(10 + Math.random() * 40),
    };
  };

  const brandData = generatePositionData(1.2);
  const competitorsData = competitorDomains.map(c => ({
    ...c,
    ...generatePositionData(0.8 + Math.random() * 0.6),
  }));

  const sampleKeywords = [
    "pet gps tracker", "dog collar tracking", "smart pet collar",
    "wireless pet tracker", "gps collar for dogs", "pet location tracker",
    "dog tracker app", "pet safety device", "smart dog collar",
    "pet finder gps", "dog gps collar reviews", "best pet tracker 2024",
    "affordable dog tracker", "waterproof pet gps", "real-time dog tracking",
  ];

  const keywordAnalysis = sampleKeywords.map(kw => {
    const brandPos = Math.random() > 0.3 ? Math.floor(1 + Math.random() * 80) : null;
    const compPositions = competitorDomains.map(c => ({
      domain: c.domain,
      position: Math.random() > 0.25 ? Math.floor(1 + Math.random() * 80) : null,
    }));

    let opportunity: "high" | "medium" | "low" = "low";
    let opportunityReason = "Brand already ranks well";

    if (brandPos === null || brandPos > 20) {
      const bestCompPos = Math.min(...compPositions.filter(p => p.position !== null).map(p => p.position!));
      if (bestCompPos <= 10) {
        opportunity = "high";
        opportunityReason = "Competitor ranks top 10, brand missing or weak";
      } else if (bestCompPos <= 30) {
        opportunity = "medium";
        opportunityReason = "Competitor ranks top 30, room to compete";
      }
    } else if (brandPos > 10) {
      opportunity = "medium";
      opportunityReason = "Brand ranks outside top 10, improvement possible";
    }

    return {
      keyword: kw,
      searchVolume: Math.floor(500 + Math.random() * 9500),
      difficulty: Math.floor(20 + Math.random() * 60),
      brandPosition: brandPos,
      competitorPositions: compPositions,
      opportunity,
      opportunityReason,
    };
  });

  return {
    brand: {
      domain: config.brand.domain,
      name: config.brand.name,
      ...brandData,
    },
    competitors: competitorsData,
    keywordAnalysis: keywordAnalysis.sort((a, b) => b.searchVolume - a.searchVolume),
    summary: {
      totalKeywordsAnalyzed: sampleKeywords.length,
      brandAdvantage: keywordAnalysis.filter(k => {
        if (!k.brandPosition) return false;
        const bestComp = Math.min(...k.competitorPositions.filter(p => p.position !== null).map(p => p.position!));
        return k.brandPosition < bestComp;
      }).length,
      competitorAdvantage: keywordAnalysis.filter(k => {
        if (!k.brandPosition) return true;
        const bestComp = Math.min(...k.competitorPositions.filter(p => p.position !== null).map(p => p.position!));
        return bestComp < k.brandPosition;
      }).length,
      sharedKeywords: keywordAnalysis.filter(k => 
        k.brandPosition !== null && k.competitorPositions.some(p => p.position !== null)
      ).length,
      uniqueOpportunities: keywordAnalysis.filter(k => k.opportunity === "high").length,
    },
  };
}

export default function KeywordGapReport() {
  const params = useParams<{ id: string }>();
  const configId = params.id ? parseInt(params.id) : null;
  const [activeTab, setActiveTab] = useState("visibility");

  const { data: config, isLoading } = useQuery<Configuration>({
    queryKey: ["/api/configuration", configId],
    enabled: !!configId,
  });

  if (isLoading) {
    return (
      <ScrollArea className="h-full">
        <div className="container max-w-7xl py-6 px-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
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

  const visibilityData = generateMockVisibilityData(config);
  const maxKeywords = Math.max(
    visibilityData.brand.totalKeywords,
    ...visibilityData.competitors.map(c => c.totalKeywords)
  );

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-7xl py-6 px-4">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Keyword Gap Visibility Report
              </h1>
              <p className="text-muted-foreground">
                {config.name} - {config.brand.domain}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              UCR Guardrails Active
            </Badge>
            <Button variant="outline" size="sm" data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Keywords Analyzed</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-total-keywords">
                {visibilityData.summary.totalKeywordsAnalyzed}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Across all competitors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Brand Advantage</CardDescription>
              <CardTitle className="text-3xl text-green-600" data-testid="text-brand-advantage">
                {visibilityData.summary.brandAdvantage}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-green-600" />
                Keywords where brand leads
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Competitor Advantage</CardDescription>
              <CardTitle className="text-3xl text-red-600" data-testid="text-competitor-advantage">
                {visibilityData.summary.competitorAdvantage}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3 text-red-600" />
                Keywords to improve
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>High Priority Opportunities</CardDescription>
              <CardTitle className="text-3xl text-amber-600" data-testid="text-opportunities">
                {visibilityData.summary.uniqueOpportunities}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3 text-amber-600" />
                Immediate action items
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Visibility Comparison Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Visibility Comparison
            </CardTitle>
            <CardDescription>
              Position distribution across brand and competitors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Domain</TableHead>
                    <TableHead className="text-center">Top 3</TableHead>
                    <TableHead className="text-center">Top 10</TableHead>
                    <TableHead className="text-center">Top 20</TableHead>
                    <TableHead className="text-center">Top 100</TableHead>
                    <TableHead className="text-center">Not Ranking</TableHead>
                    <TableHead className="text-center">Visibility Score</TableHead>
                    <TableHead className="text-center">Avg. Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-blue-50/50 dark:bg-blue-950/20" data-testid="row-brand-visibility">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">Brand</Badge>
                        {visibilityData.brand.domain}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-600 text-white">{visibilityData.brand.top3}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-blue-600 text-white">{visibilityData.brand.top10}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{visibilityData.brand.top20}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{visibilityData.brand.top100}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-muted-foreground">{visibilityData.brand.notRanking}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Progress value={visibilityData.brand.visibilityScore} className="w-16 h-2" />
                        <span className="font-medium">{visibilityData.brand.visibilityScore}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{visibilityData.brand.avgPosition}</TableCell>
                  </TableRow>
                  {visibilityData.competitors.map((comp, i) => (
                    <TableRow key={comp.domain} data-testid={`row-competitor-visibility-${i}`}>
                      <TableCell className="font-medium">{comp.domain}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-600 text-white">{comp.top3}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-600 text-white">{comp.top10}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{comp.top20}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{comp.top100}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-muted-foreground">{comp.notRanking}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={comp.visibilityScore} className="w-16 h-2" />
                          <span className="font-medium">{comp.visibilityScore}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{comp.avgPosition}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Keyword Analysis */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Keyword Position Analysis
            </CardTitle>
            <CardDescription>
              Detailed breakdown of ranking positions for each keyword
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all" data-testid="tab-all">
                  All Keywords ({visibilityData.keywordAnalysis.length})
                </TabsTrigger>
                <TabsTrigger value="opportunities" data-testid="tab-opportunities">
                  High Priority ({visibilityData.keywordAnalysis.filter(k => k.opportunity === "high").length})
                </TabsTrigger>
                <TabsTrigger value="winning" data-testid="tab-winning">
                  Brand Winning ({visibilityData.summary.brandAdvantage})
                </TabsTrigger>
                <TabsTrigger value="losing" data-testid="tab-losing">
                  Brand Losing ({visibilityData.summary.competitorAdvantage})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <KeywordTable keywords={visibilityData.keywordAnalysis} brandDomain={config.brand.domain} />
              </TabsContent>
              <TabsContent value="opportunities">
                <KeywordTable 
                  keywords={visibilityData.keywordAnalysis.filter(k => k.opportunity === "high")} 
                  brandDomain={config.brand.domain} 
                />
              </TabsContent>
              <TabsContent value="winning">
                <KeywordTable 
                  keywords={visibilityData.keywordAnalysis.filter(k => {
                    if (!k.brandPosition) return false;
                    const bestComp = Math.min(...k.competitorPositions.filter(p => p.position !== null).map(p => p.position!));
                    return k.brandPosition < bestComp;
                  })} 
                  brandDomain={config.brand.domain} 
                />
              </TabsContent>
              <TabsContent value="losing">
                <KeywordTable 
                  keywords={visibilityData.keywordAnalysis.filter(k => {
                    if (!k.brandPosition) return true;
                    const bestComp = Math.min(...k.competitorPositions.filter(p => p.position !== null).map(p => p.position!));
                    return bestComp < k.brandPosition;
                  })} 
                  brandDomain={config.brand.domain} 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Strategic Recommendations
            </CardTitle>
            <CardDescription>
              Actionable insights based on keyword gap analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Strengths to Maintain
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Continue optimizing for top-performing brand keywords</li>
                  <li>Protect market share in high-volume terms where brand leads</li>
                  <li>Monitor competitor movements on defended keywords</li>
                </ul>
              </div>
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Gaps to Address
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Target high-volume keywords where competitors rank but brand does not</li>
                  <li>Improve content depth for keywords ranking outside top 10</li>
                  <li>Create dedicated landing pages for opportunity keywords</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

interface KeywordTableProps {
  keywords: VisibilityData["keywordAnalysis"];
  brandDomain: string;
}

function KeywordTable({ keywords, brandDomain }: KeywordTableProps) {
  if (keywords.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No keywords in this category
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Keyword</TableHead>
            <TableHead className="text-right">Volume</TableHead>
            <TableHead className="text-center">Difficulty</TableHead>
            <TableHead className="text-center">{brandDomain}</TableHead>
            {keywords[0]?.competitorPositions.slice(0, 3).map((cp, i) => (
              <TableHead key={i} className="text-center text-xs max-w-[100px] truncate" title={cp.domain}>
                {cp.domain.replace(/^www\./, "").slice(0, 15)}
              </TableHead>
            ))}
            <TableHead>Opportunity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keywords.map((kw, i) => (
            <TableRow key={kw.keyword} data-testid={`row-keyword-${i}`}>
              <TableCell className="font-medium">{kw.keyword}</TableCell>
              <TableCell className="text-right">{kw.searchVolume.toLocaleString()}</TableCell>
              <TableCell className="text-center">
                <Progress value={kw.difficulty} className="w-12 h-2 mx-auto" />
              </TableCell>
              <TableCell className="text-center">
                {getPositionBadge(kw.brandPosition)}
              </TableCell>
              {kw.competitorPositions.slice(0, 3).map((cp, j) => (
                <TableCell key={j} className="text-center">
                  {getPositionBadge(cp.position)}
                </TableCell>
              ))}
              <TableCell>
                <div className="flex flex-col gap-1">
                  {getOpportunityBadge(kw.opportunity)}
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={kw.opportunityReason}>
                    {kw.opportunityReason}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
