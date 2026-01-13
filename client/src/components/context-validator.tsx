import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Shield, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  ThumbsUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ValidationIssue {
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

interface CompetitorValidation {
  domain: string;
  status: "approved" | "needs_review" | "removed";
  reason?: string;
  confidence: number;
}

interface ContextValidationResult {
  context_status: "approved" | "needs_review" | "blocked";
  confidence_band: "high" | "medium" | "low";
  confidence_score: number;
  issues: ValidationIssue[];
  required_fields_missing: string[];
  approved_competitors: CompetitorValidation[];
  suggested_removals: string[];
  section_scores: Record<string, number>;
  validation_timestamp: string;
  context_version: number;
}

interface ContextValidatorProps {
  configurationId: number;
  onApproved?: () => void;
}

export function ContextValidator({ configurationId, onApproved }: ContextValidatorProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: validation, isLoading, refetch } = useQuery<ContextValidationResult>({
    queryKey: ["/api/context/validate", configurationId],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/context/validate", {
        configurationId,
      });
      return res.json();
    },
    staleTime: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/context/approve", {
        configurationId,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Context Approved",
        description: "The context has been approved and is ready for analysis.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/context/validate", configurationId] });
      onApproved?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Validating context...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validation) return null;

  const statusConfig = {
    approved: {
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950",
      badge: "default" as const,
      label: "Approved",
    },
    needs_review: {
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
      badge: "secondary" as const,
      label: "Needs Review",
    },
    blocked: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950",
      badge: "destructive" as const,
      label: "Blocked",
    },
  };

  const status = statusConfig[validation.context_status];
  const StatusIcon = status.icon;

  const errorCount = validation.issues.filter(i => i.severity === "error").length;
  const warningCount = validation.issues.filter(i => i.severity === "warning").length;
  const infoCount = validation.issues.filter(i => i.severity === "info").length;

  return (
    <Card className={status.bg}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Context Validation Council</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={status.badge} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            <Badge variant="outline" className="text-xs">
              v{validation.context_version}
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                validation.confidence_band === "high" 
                  ? "border-green-500 text-green-700" 
                  : validation.confidence_band === "medium"
                  ? "border-amber-500 text-amber-700"
                  : "border-red-500 text-red-700"
              }`}
            >
              Confidence: {Math.round(validation.confidence_score * 100)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence score</span>
            <span className="font-medium">{Math.round(validation.confidence_score * 100)}%</span>
          </div>
          <Progress value={validation.confidence_score * 100} className="h-2" />
        </div>

        <div className="flex items-center gap-3 text-sm">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-3 w-3" />
              {errorCount} errors
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {warningCount} warnings
            </span>
          )}
          {infoCount > 0 && (
            <span className="flex items-center gap-1 text-blue-600">
              <CheckCircle className="h-3 w-3" />
              {infoCount} suggestions
            </span>
          )}
          {validation.issues.length === 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              No issues detected
            </span>
          )}
        </div>

        {validation.issues.length > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                View details ({validation.issues.length} items)
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {validation.issues.map((issue, idx) => (
                <div 
                  key={idx} 
                  className={`p-2 rounded-md text-sm ${
                    issue.severity === "error" 
                      ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200" 
                      : issue.severity === "warning"
                      ? "bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200"
                      : "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {issue.severity === "error" && <XCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                    {issue.severity === "warning" && <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
                    {issue.severity === "info" && <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                    <div>
                      <p className="font-medium">{issue.message}</p>
                      {issue.suggestion && (
                        <p className="text-xs opacity-80 mt-0.5">{issue.suggestion}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending || validation.context_status === "blocked"}
            className="flex-1"
            data-testid="button-approve-context"
          >
            {approveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ThumbsUp className="h-4 w-4 mr-2" />
            )}
            Approve Context
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            data-testid="button-revalidate"
          >
            <Shield className="h-4 w-4" />
          </Button>
        </div>

        {validation.context_status === "blocked" && (
          <p className="text-xs text-red-600 text-center">
            Resolve errors before approving the context
          </p>
        )}
      </CardContent>
    </Card>
  );
}
