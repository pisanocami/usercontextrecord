import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Building2,
  Globe,
  Target,
  Users,
  TrendingUp,
  Megaphone,
  ShieldX,
  FileCheck,
  Search,
  Layers,
  Copy,
  Download,
  Code,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Shield,
  UserCheck,
  GitBranch,
  Gavel,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Brand, CategoryDefinition, Competitors, DemandDefinition, StrategicIntent, ChannelContext, NegativeScope, Governance } from "@shared/schema";

interface Configuration {
  id: number;
  userId: string;
  name: string;
  brand: Brand;
  category_definition: CategoryDefinition;
  competitors: Competitors;
  demand_definition: DemandDefinition;
  strategic_intent: StrategicIntent;
  channel_context: ChannelContext;
  negative_scope: NegativeScope;
  governance: Governance;
  created_at: string;
  updated_at: string;
}

function BulletList({ items, emptyText = "Not configured" }: { items: string[]; emptyText?: string }) {
  if (!items || items.length === 0) {
    return <span className="text-muted-foreground italic">{emptyText}</span>;
  }
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="text-primary mt-1 shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function JsonPreview({ data, title }: { data: any; title: string }) {
  return (
    <div className="bg-muted/50 rounded-md p-3 font-mono text-xs overflow-x-auto">
      <pre className="whitespace-pre-wrap break-words">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function SectionCard({ 
  id, 
  title, 
  icon: Icon, 
  children,
  rightContent,
}: { 
  id: string;
  title: string; 
  icon: typeof Building2; 
  children: React.ReactNode;
  rightContent?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden" data-testid={`section-${id}`}>
      <CardHeader className="py-3 px-4 bg-muted/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          {rightContent}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
}

function TimelineStep({ step, title, isLast = false }: { step: number; title: string; isLast?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
        {step}
      </div>
      <span className="text-sm font-medium whitespace-nowrap">{title}</span>
      {!isLast && <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />}
    </div>
  );
}

export default function OnePager() {
  const [, params] = useRoute("/one-pager/:id");
  const configId = params?.id;
  const [showJson, setShowJson] = useState(false);
  const { toast } = useToast();

  const { data: config, isLoading, error } = useQuery<Configuration>({
    queryKey: ["/api/configuration", configId],
    enabled: !!configId,
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: `${label} copied to clipboard` });
    } catch {
      toast({ title: "Error", description: "Failed to copy", variant: "destructive" });
    }
  };

  const exportAsMarkdown = () => {
    if (!config) return;
    
    const md = generateMarkdown(config);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.name || "configuration"}-context.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Markdown file downloaded" });
  };

  const generateMarkdown = (c: Configuration): string => {
    return `# User Context Record: ${c.brand?.name || c.name}

## Brand Identity & Scope
- **Name:** ${c.brand?.name || "-"}
- **Domain:** ${c.brand?.domain || "-"}
- **Industry:** ${c.brand?.industry || "-"}
- **Business Model:** ${c.brand?.business_model || "-"}
- **Target Market:** ${c.brand?.target_market || "-"}
- **Geography:** ${c.brand?.primary_geography?.join(", ") || "-"}
- **Revenue Band:** ${c.brand?.revenue_band || "-"}

## Category Definition
- **Primary Category:** ${c.category_definition?.primary_category || "-"}
- **Included:** ${c.category_definition?.included?.join(", ") || "-"}
- **Excluded:** ${c.category_definition?.excluded?.join(", ") || "-"}

## Competitive Set
### Direct
${c.competitors?.direct?.map(d => `- ${d}`).join("\n") || "- None"}

### Indirect
${c.competitors?.indirect?.map(d => `- ${d}`).join("\n") || "- None"}

### Marketplaces
${c.competitors?.marketplaces?.map(d => `- ${d}`).join("\n") || "- None"}

## Demand Definition
### Brand Keywords
- **Seed Terms:** ${c.demand_definition?.brand_keywords?.seed_terms?.join(", ") || "-"}
- **Top N:** ${c.demand_definition?.brand_keywords?.top_n || "-"}

### Non-Brand Keywords
- **Category Terms:** ${c.demand_definition?.non_brand_keywords?.category_terms?.join(", ") || "-"}
- **Problem Terms:** ${c.demand_definition?.non_brand_keywords?.problem_terms?.join(", ") || "-"}
- **Top N:** ${c.demand_definition?.non_brand_keywords?.top_n || "-"}

## Strategic Intent
- **Growth Priority:** ${c.strategic_intent?.growth_priority || "-"}
- **Primary Goal:** ${c.strategic_intent?.primary_goal || "-"}
- **Risk Tolerance:** ${c.strategic_intent?.risk_tolerance || "-"}
- **Avoid:** ${c.strategic_intent?.avoid?.join(", ") || "-"}

## Channel Context
- **Paid Media Active:** ${c.channel_context?.paid_media_active ? "Yes" : "No"}
- **SEO Investment:** ${c.channel_context?.seo_investment_level || "-"}
- **Marketplace Dependence:** ${c.channel_context?.marketplace_dependence || "-"}

## Negative Scope
- **Excluded Categories:** ${c.negative_scope?.excluded_categories?.join(", ") || "-"}
- **Excluded Keywords:** ${c.negative_scope?.excluded_keywords?.join(", ") || "-"}
- **Excluded Use Cases:** ${c.negative_scope?.excluded_use_cases?.join(", ") || "-"}
- **Hard Exclusion:** ${c.negative_scope?.enforcement_rules?.hard_exclusion ? "Yes" : "No"}

## Governance
- **CMO Safe:** ${c.governance?.cmo_safe ? "Yes" : "No"}
- **Last Reviewed:** ${c.governance?.last_reviewed || "-"}
- **Reviewed By:** ${c.governance?.reviewed_by || "-"}

---
Generated: ${new Date().toISOString()}
`;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium">Configuration not found</p>
        <Link href="/">
          <Button variant="outline" data-testid="button-back-to-list">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Button>
        </Link>
      </div>
    );
  }

  const qualityScore = config.governance?.quality_score;
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  if (showJson) {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">{config.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">JSON</span>
                <Switch 
                  checked={showJson} 
                  onCheckedChange={setShowJson}
                  data-testid="toggle-view"
                />
                <span className="text-sm text-muted-foreground">One Pager</span>
              </div>
            </div>
          </div>
          <Card>
            <CardContent className="p-4">
              <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(config, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header with controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">{config.name}</h1>
              <p className="text-sm text-muted-foreground">User Context Record</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 mr-4">
              <span className="text-sm text-muted-foreground">One Pager</span>
              <Switch 
                checked={showJson} 
                onCheckedChange={setShowJson}
                data-testid="toggle-view"
              />
              <span className="text-sm text-muted-foreground">JSON</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(config, null, 2), "Schema")}
              data-testid="button-copy-schema"
            >
              <Copy className="mr-2 h-3 w-3" />
              Copy Schema
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportAsMarkdown}
              data-testid="button-export-md"
            >
              <Download className="mr-2 h-3 w-3" />
              Export MD
            </Button>
          </div>
        </div>

        {/* Compact Header */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Brand</p>
                <p className="font-semibold truncate">{config.brand?.name || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Domain</p>
                <p className="font-medium truncate">{config.brand?.domain || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Industry</p>
                <p className="font-medium truncate">{config.brand?.industry || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Model</p>
                <p className="font-medium">{config.brand?.business_model || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Geography</p>
                <p className="font-medium truncate">{config.brand?.primary_geography?.join(", ") || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Revenue</p>
                <p className="font-medium">{config.brand?.revenue_band || "-"}</p>
              </div>
            </div>
            <Separator className="my-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">What this is</p>
                <p className="text-sm">{config.category_definition?.primary_category || "Primary category not defined"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">What this is not</p>
                <BulletList items={config.category_definition?.excluded || []} emptyText="No exclusions" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executive + Principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="py-3 px-4 bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                User Context Record
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Canonical schema defining brand identity and boundaries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Inherited by all downstream modules (SEO, Demand, Councils)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Single source of truth for competitive and category scope</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Enforces fail-closed validation on all outputs</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4 bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Product Principles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span>No analysis without context</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span>No hidden assumptions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span>No silent scope expansion</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span>Human override always available</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <span>Embarrassment-safe by default</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Canonical Schema Sections */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Canonical Schema</h2>

          {/* A. Brand Identity */}
          <SectionCard id="brand" title="A. Brand Identity & Scope" icon={Building2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <JsonPreview data={config.brand} title="Brand" />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Why this matters</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Establishes trust baseline for all recommendations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Accounts for seasonality and market position</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>No one-size-fits-all assumptions</span>
                  </li>
                </ul>
              </div>
            </div>
          </SectionCard>

          {/* B. Category Definition */}
          <SectionCard id="category" title="B. Category Definition (Semantic Fence)" icon={Layers}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Primary Category</p>
                  <Badge variant="secondary" className="text-sm">{config.category_definition?.primary_category || "Not set"}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Included</p>
                  <BulletList items={config.category_definition?.included || []} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Excluded</p>
                  <BulletList items={config.category_definition?.excluded || []} />
                </div>
              </div>
              <div className="flex items-center">
                <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-4">
                  This is a semantic fence, not a keyword list. Categories define conceptual boundaries for analysis scope.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* C. Competitive Set */}
          <SectionCard id="competitors" title="C. Competitive Set" icon={Users}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Direct</p>
                <BulletList items={config.competitors?.direct || []} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Indirect</p>
                <BulletList items={config.competitors?.indirect || []} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Marketplaces</p>
                <BulletList items={config.competitors?.marketplaces || []} />
              </div>
            </div>
            <Separator className="my-3" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Rules:</p>
              <ul className="space-y-1">
                <li>• Model may suggest competitors based on SERP overlap</li>
                <li>• Humans must approve before inclusion in analysis</li>
              </ul>
            </div>
          </SectionCard>

          {/* D. Demand Definition */}
          <SectionCard id="demand" title="D. Demand Definition" icon={Search}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-muted/20">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs font-medium">Brand Keywords</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Seed Terms</p>
                      <BulletList items={config.demand_definition?.brand_keywords?.seed_terms || []} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Top N</p>
                      <p className="text-sm font-medium">{config.demand_definition?.brand_keywords?.top_n || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/20">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-xs font-medium">Non-Brand Keywords</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Category Terms</p>
                      <BulletList items={config.demand_definition?.non_brand_keywords?.category_terms || []} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Problem Terms</p>
                      <BulletList items={config.demand_definition?.non_brand_keywords?.problem_terms || []} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Top N</p>
                      <p className="text-sm font-medium">{config.demand_definition?.non_brand_keywords?.top_n || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground mt-3 italic">
              Anchors brand vs non-brand logic; governs SEO, demand, and cannibalization modules.
            </p>
          </SectionCard>

          {/* E. Strategic Intent */}
          <SectionCard id="strategic" title="E. Strategic Intent & Guardrails" icon={Target}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <JsonPreview data={config.strategic_intent} title="Strategic Intent" />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Key Points</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Operator intent, not data-driven defaults</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Avoid list enforced in all recommendations</span>
                  </li>
                </ul>
                {config.strategic_intent?.avoid && config.strategic_intent.avoid.length > 0 && (
                  <div className="mt-3 p-2 bg-destructive/10 rounded-md">
                    <p className="text-xs text-destructive font-medium mb-1">Avoid:</p>
                    <BulletList items={config.strategic_intent.avoid} />
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* F. Channel Context */}
          <SectionCard id="channel" title="F. Channel Context" icon={Megaphone}>
            <div className="flex flex-wrap gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Badge variant={config.channel_context?.paid_media_active ? "default" : "secondary"}>
                  Paid Media: {config.channel_context?.paid_media_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  SEO: {config.channel_context?.seo_investment_level || "N/A"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Marketplace: {config.channel_context?.marketplace_dependence || "N/A"}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Qualitative only — never quantitative. Informs channel-specific recommendations.
            </p>
          </SectionCard>

          {/* G. Negative Scope */}
          <SectionCard id="negative" title="G. Negative Scope & Exclusions" icon={ShieldX}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Categories</p>
                <BulletList items={config.negative_scope?.excluded_categories || []} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Keywords</p>
                <BulletList items={config.negative_scope?.excluded_keywords || []} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Use Cases</p>
                <BulletList items={config.negative_scope?.excluded_use_cases || []} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Competitors</p>
                <BulletList items={config.negative_scope?.excluded_competitors || []} />
              </div>
            </div>
            <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
              <p className="text-sm text-destructive font-medium flex items-center gap-2">
                <ShieldX className="h-4 w-4" />
                If excluded here, it must never appear downstream.
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                Hard Exclusion: {config.negative_scope?.enforcement_rules?.hard_exclusion ? "Enabled" : "Disabled"}
              </div>
            </div>
          </SectionCard>

          {/* H. Governance */}
          <SectionCard 
            id="governance" 
            title="H. Governance, Confidence & Overrides" 
            icon={FileCheck}
            rightContent={
              qualityScore?.overall !== undefined && (
                <Badge variant="outline" className={getScoreColor(qualityScore.overall)}>
                  Quality: {qualityScore.overall}/100
                </Badge>
              )
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <JsonPreview data={config.governance} title="Governance" />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Governance Principles</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>The model may suggest. Humans decide.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>The system remembers all overrides.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>CMO-safe means no embarrassing outputs.</span>
                  </li>
                </ul>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant={config.governance?.cmo_safe ? "default" : "secondary"}>
                    CMO Safe: {config.governance?.cmo_safe ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Enforcement & Flow */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Enforcement & Flow</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  1. Hard Pre-Filter
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-1 text-xs">
                  <li>• Block excluded categories</li>
                  <li>• Enforce keyword exclusions</li>
                  <li>• Validate scope boundaries</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  2. Module Inheritance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-1 text-xs">
                  <li>• SEO inherits context</li>
                  <li>• Demand inherits keywords</li>
                  <li>• Councils inherit scope</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-primary" />
                  3. Council Enforcement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-1 text-xs">
                  <li>• Validate against context</li>
                  <li>• Flag scope violations</li>
                  <li>• Require evidence</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  4. Human Override
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-1 text-xs">
                  <li>• Always available</li>
                  <li>• Logged with reason</li>
                  <li>• Updates context</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <TimelineStep step={1} title="Model suggests" />
                <TimelineStep step={2} title="Human reviews" />
                <TimelineStep step={3} title="Modules inherit" />
                <TimelineStep step={4} title="Councils reason" isLast />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center py-4 border-t">
          Last updated: {config.updated_at ? new Date(config.updated_at).toLocaleString() : "Unknown"} 
          {config.governance?.reviewed_by && ` by ${config.governance.reviewed_by}`}
        </div>
      </div>
    </ScrollArea>
  );
}
