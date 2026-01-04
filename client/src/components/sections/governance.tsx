import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/tag-input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, Info, Check, User, Calendar, AlertCircle, BarChart3, Target, Users, Ban, FileText, AlertTriangle, CheckCircle2, RefreshCw, History, ChevronDown, Edit3 } from "lucide-react";
import type { InsertConfiguration, ContextQualityScore, AIBehaviorContract } from "@shared/schema";
import { format } from "date-fns";

const CONFIDENCE_LEVELS = [
  { value: "high", label: "High", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "medium", label: "Medium", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "low", label: "Low", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
] as const;

function getScoreColor(score: number): string {
  if (score >= 75) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getGradeBadge(grade: "high" | "medium" | "low"): { variant: "default" | "secondary" | "destructive"; label: string } {
  switch (grade) {
    case "high": return { variant: "default", label: "High Quality" };
    case "medium": return { variant: "secondary", label: "Medium Quality" };
    case "low": return { variant: "destructive", label: "Low Quality" };
  }
}

function RegenerationTrackerCard({ aiBehavior }: { aiBehavior: AIBehaviorContract | undefined }) {
  if (!aiBehavior) return null;
  
  const regenerationPercent = aiBehavior.max_regenerations > 0 
    ? Math.min((aiBehavior.regeneration_count / aiBehavior.max_regenerations) * 100, 100)
    : 0;
  
  const isAtLimit = aiBehavior.regeneration_count >= aiBehavior.max_regenerations;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">AI Regeneration Tracker</CardTitle>
          </div>
          <Badge variant={isAtLimit ? "destructive" : "secondary"}>
            {aiBehavior.regeneration_count} / {aiBehavior.max_regenerations}
          </Badge>
        </div>
        <CardDescription>Track how many times AI has regenerated content</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Regenerations used</span>
            <span className={isAtLimit ? "text-red-600 dark:text-red-400 font-medium" : ""}>
              {aiBehavior.regeneration_count} of {aiBehavior.max_regenerations}
            </span>
          </div>
          <Progress value={regenerationPercent} className="h-2" />
        </div>
        
        {aiBehavior.last_regeneration_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Last regeneration: {format(new Date(aiBehavior.last_regeneration_at), "MMM d, yyyy HH:mm")}</span>
          </div>
        )}
        
        {aiBehavior.regeneration_reason && (
          <div className="rounded-md bg-muted/50 p-2 text-xs">
            <span className="text-muted-foreground">Reason: </span>
            <span>{aiBehavior.regeneration_reason}</span>
          </div>
        )}
        
        {isAtLimit && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-medium">Regeneration limit reached</p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                Further regenerations require human approval
              </p>
            </div>
          </div>
        )}
        
        {aiBehavior.violation_detected && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 dark:bg-red-950/30 dark:border-red-900">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div className="text-xs text-red-800 dark:text-red-200">
              <p className="font-medium">Violation Detected</p>
              {aiBehavior.violation_details && (
                <p className="text-red-700 dark:text-red-300 mt-0.5">{aiBehavior.violation_details}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RedactedFieldsCard({ aiBehavior }: { aiBehavior: AIBehaviorContract | undefined }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!aiBehavior?.redacted_fields?.length) return null;
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="button-redactions-toggle">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Redacted Fields</CardTitle>
              <Badge variant="secondary">{aiBehavior.redacted_fields.length}</Badge>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CardDescription>Fields that have been modified or redacted</CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {aiBehavior.redacted_fields.map((field, index) => (
                <div 
                  key={index}
                  className="flex items-start justify-between gap-2 rounded-lg border p-2 text-sm"
                  data-testid={`redacted-field-${index}`}
                >
                  <div className="flex-1 min-w-0">
                    <code className="text-xs bg-muted px-1 rounded">{field.field_path}</code>
                    <p className="text-xs text-muted-foreground mt-1">{field.reason}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(field.redacted_at), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function QualityScoreCard({ qualityScore }: { qualityScore: ContextQualityScore | undefined }) {
  if (!qualityScore || !qualityScore.calculated_at) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Context Quality Score</CardTitle>
          </div>
          <CardDescription>Save the context to calculate quality score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="mr-2 h-5 w-5" />
            <span>Quality score not yet calculated</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gradeBadge = getGradeBadge(qualityScore.grade);
  const dimensions = [
    { 
      name: "Completeness", 
      score: qualityScore.completeness, 
      icon: CheckCircle2,
      description: "Required fields filled",
      details: qualityScore.breakdown?.completeness_details || ""
    },
    { 
      name: "Competitor Confidence", 
      score: qualityScore.competitor_confidence, 
      icon: Users,
      description: "Competitor coverage and evidence",
      details: qualityScore.breakdown?.competitor_details || ""
    },
    { 
      name: "Negative Strength", 
      score: qualityScore.negative_strength, 
      icon: Ban,
      description: "Exclusion rule coverage",
      details: qualityScore.breakdown?.negative_details || ""
    },
    { 
      name: "Evidence Coverage", 
      score: qualityScore.evidence_coverage, 
      icon: FileText,
      description: "Competitor documentation",
      details: qualityScore.breakdown?.evidence_details || ""
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Context Quality Score</CardTitle>
          </div>
          <Badge variant={gradeBadge.variant}>{gradeBadge.label}</Badge>
        </div>
        <CardDescription>Composite score based on context completeness and quality</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-bold ${getScoreColor(qualityScore.overall)}`} data-testid="text-quality-score-overall">
            {qualityScore.overall}
          </div>
          <div className="flex-1">
            <Progress value={qualityScore.overall} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">
              Overall score out of 100
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {dimensions.map((dim) => (
            <Tooltip key={dim.name}>
              <TooltipTrigger asChild>
                <div 
                  className="rounded-lg border p-3 space-y-2 cursor-help"
                  data-testid={`quality-dimension-${dim.name.toLowerCase().replace(/ /g, "-")}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <dim.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{dim.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${getScoreColor(dim.score)}`}>
                      {dim.score}
                    </span>
                  </div>
                  <Progress value={dim.score} className="h-1.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="font-medium">{dim.description}</p>
                {dim.details && <p className="text-xs text-muted-foreground mt-1">{dim.details}</p>}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {qualityScore.overall < 50 && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Human review required</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Score below 50 requires manual verification before use
              </p>
            </div>
          </div>
        )}

        {qualityScore.overall >= 80 && (
          <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 p-3 dark:bg-green-950/30 dark:border-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div className="text-sm text-green-800 dark:text-green-200">
              <p className="font-medium">Auto-approved</p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                High quality context, ready for production use
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GovernanceSection() {
  const form = useFormContext<InsertConfiguration>();
  const cmoSafe = form.watch("governance.cmo_safe");
  const qualityScore = form.watch("governance.quality_score");
  const aiBehavior = form.watch("governance.ai_behavior");

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-12 sm:w-12">
          <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Governance, Confidence & Overrides</h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Define human control and auditability. The model may suggest. Humans decide. The system remembers.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <QualityScoreCard qualityScore={qualityScore} />
        <RegenerationTrackerCard aiBehavior={aiBehavior} />
      </div>
      
      <RedactedFieldsCard aiBehavior={aiBehavior} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Model Settings</CardTitle>
          <CardDescription>Control how model suggestions are handled</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="governance.model_suggested"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Model Suggestions Enabled</FormLabel>
                  <FormDescription>
                    Allow the model to provide suggestions for this context
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-model-suggested"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Human Overrides</CardTitle>
          <CardDescription>Explicit overrides that take precedence over model suggestions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="governance.human_overrides.competitors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Competitor Overrides</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add competitor override..."
                    testId="tag-override-competitors"
                  />
                </FormControl>
                <FormDescription>
                  Competitors explicitly added or removed by humans
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="governance.human_overrides.keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Keyword Overrides</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add keyword override..."
                    testId="tag-override-keywords"
                  />
                </FormControl>
                <FormDescription>
                  Keywords explicitly added or removed by humans
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="governance.human_overrides.categories"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Overrides</FormLabel>
                <FormControl>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add category override..."
                    testId="tag-override-categories"
                  />
                </FormControl>
                <FormDescription>
                  Categories explicitly added or removed by humans
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Context Confidence</CardTitle>
          <CardDescription>How confident are you in this context?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="governance.context_confidence.level"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Confidence Level *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid gap-3 md:grid-cols-3"
                  >
                    {CONFIDENCE_LEVELS.map((level) => (
                      <label
                        key={level.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover-elevate ${
                          field.value === level.value
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        data-testid={`radio-confidence-${level.value}`}
                      >
                        <RadioGroupItem value={level.value} />
                        <Badge variant="secondary" className={level.color}>
                          {level.label}
                        </Badge>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="governance.context_confidence.notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confidence Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Add any notes about confidence level or areas of uncertainty..."
                    className="resize-none"
                    rows={3}
                    data-testid="textarea-confidence-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Information</CardTitle>
          <CardDescription>Track when and by whom this context was reviewed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="governance.reviewed_by"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reviewed By *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="Reviewer name"
                        className="pl-9"
                        data-testid="input-reviewed-by"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="governance.last_reviewed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Reviewed *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        type="date"
                        className="pl-9"
                        data-testid="input-last-reviewed"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="governance.context_valid_until"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Context Valid Until *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      {...field}
                      type="date"
                      className="pl-9"
                      data-testid="input-valid-until"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  When this context should be reviewed again
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="governance.cmo_safe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-base">CMO Safe</FormLabel>
                    {cmoSafe && (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        Validated
                      </Badge>
                    )}
                  </div>
                  <FormDescription>
                    Mark this context as approved and safe for executive reporting
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-cmo-safe"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50">
        <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">Key Principle</p>
          <p className="mt-1 text-blue-700 dark:text-blue-300">
            The model may suggest. Humans decide. The system remembers. All overrides and approvals are tracked for auditability.
          </p>
        </div>
      </div>
    </div>
  );
}
