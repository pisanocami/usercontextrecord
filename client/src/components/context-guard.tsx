import { useUCR, useUCRGate } from "@/hooks/use-ucr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, XCircle, Settings, Loader2, ShieldCheck, Clock } from "lucide-react";
import { Link } from "wouter";
import type { ReactNode } from "react";

interface ContextGuardProps {
  children: ReactNode;
  fallbackRoute?: string;
}

const SECTION_LABELS: Record<string, string> = {
  brand: "Brand Identity",
  category_definition: "Category Definition",
  competitors: "Competitive Set",
  demand_definition: "Demand Definition",
  strategic_intent: "Strategic Intent",
  channel_context: "Channel Context",
  negative_scope: "Negative Scope",
  governance: "Governance",
};

export function ContextGuard({ children, fallbackRoute = "/" }: ContextGuardProps) {
  const { isLoading, status, hasContext, getCompletionPercentage, getRequiredIncomplete } = useUCR();
  const { canExecuteModules, isBlocked, reason } = useUCRGate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Validating context...</p>
        </div>
      </div>
    );
  }

  if (!hasContext) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle>No Context Configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              You need to configure your brand context before running any analysis modules. 
              The context defines who you are, who you compete with, and what demand you're targeting.
            </p>
            <div className="flex justify-center">
              <Link href={fallbackRoute}>
                <Button className="gap-2" data-testid="button-configure-context">
                  <Settings className="h-4 w-4" />
                  Configure Context
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isBlocked) {
    const incompleteSections = getRequiredIncomplete();
    const completionPct = getCompletionPercentage();

    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <CardTitle>Context Incomplete</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Analysis modules are blocked until all required context sections are complete.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Completion</span>
                <span className="font-medium">{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="h-2" />
            </div>

            {reason && (
              <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-800 dark:text-red-200">
                {reason}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Required Sections</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(status?.sectionStatus || {}).map(([key, section]) => {
                  if (!section.required) return null;
                  const isComplete = section.complete;
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                        isComplete
                          ? "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200"
                          : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span>{SECTION_LABELS[key] || key}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center">
              <Link href={fallbackRoute}>
                <Button className="gap-2" data-testid="button-complete-context">
                  <Settings className="h-4 w-4" />
                  Complete Context Setup
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function ContextStatusBadge() {
  const { status, isLoading } = useUCR();
  const { canExecuteModules } = useUCRGate();

  if (isLoading) {
    return <Badge variant="outline"><Loader2 className="h-3 w-3 animate-spin" /></Badge>;
  }

  if (!status) {
    return <Badge variant="destructive">No Context</Badge>;
  }

  if (status.isExpired) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Clock className="h-3 w-3" />
        Expired
      </Badge>
    );
  }

  if (!canExecuteModules) {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1">
        <AlertTriangle className="h-3 w-3" />
        Incomplete
      </Badge>
    );
  }

  if (status.isCMOSafe) {
    return (
      <Badge className="bg-green-600 text-white gap-1">
        <ShieldCheck className="h-3 w-3" />
        CMO Safe
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400 gap-1">
      <CheckCircle className="h-3 w-3" />
      Valid
    </Badge>
  );
}

export function ContextCompletionIndicator() {
  const { getCompletionPercentage, getRequiredIncomplete, isLoading } = useUCR();

  if (isLoading) {
    return null;
  }

  const pct = getCompletionPercentage();
  const incomplete = getRequiredIncomplete();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Context Completion</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
      {incomplete.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Missing: {incomplete.map(s => SECTION_LABELS[s] || s).join(", ")}
        </p>
      )}
    </div>
  );
}
