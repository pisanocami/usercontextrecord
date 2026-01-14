import { useState } from "react";
import { useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertTriangle,
    BrainCircuit,
    Database,
    Layers,
    ShieldCheck,
    Target,
    Loader2,
    Play,
    Building2
} from "lucide-react";
import { CONTRACT_REGISTRY } from "@shared/module.contract";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ModuleVisualizer } from "@/components/module-visualizer";
import type { Configuration } from "@shared/schema";

export function ModuleShell() {
    const [match, params] = useRoute("/modules/:moduleId");
    const moduleId = params?.moduleId;
    const { toast } = useToast();
    const { user } = useAuth();
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [selectedConfigId, setSelectedConfigId] = useState<string>("");

    // 1. Resolve Contract
    const contract = moduleId ? CONTRACT_REGISTRY[moduleId] : undefined;

    // 2. Fetch Available Configurations
    const { data: configurations, isLoading: configsLoading, error: configsError } = useQuery<Configuration[]>({
        queryKey: ["/api/configurations"],
        retry: 3,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // 3. Execution Mutation
    const runMutation = useMutation({
        mutationFn: async () => {
            if (!selectedConfigId) {
                throw new Error("Please select a context to run the analysis");
            }
            const configId = parseInt(selectedConfigId);
            const payload: any = { configId };
            if (user?.id) {
                payload.userId = user.id;
            }
            const res = await apiRequest("POST", `/api/modules/${moduleId}/run`, payload);
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                setExecutionResult(data.data);
                toast({ title: "Analysis Complete", description: "Module executed successfully." });
            } else {
                toast({ title: "Analysis Failed", description: data.error, variant: "destructive" });
            }
        },
        onError: (err) => {
            toast({ title: "Error", description: "Failed to run module analysis.", variant: "destructive" });
        }
    });

    if (!moduleId || !contract) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Module Not Found</AlertTitle>
                    <AlertDescription>
                        The module "{moduleId || 'unknown'}" is not registered in the system.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
            {/* 3. Header */}
            <header className="border-b bg-background px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="text-xs font-normal">
                                {contract.layer} Layer
                            </Badge>
                            <Badge variant="secondary" className="text-xs font-normal">
                                {contract.category}
                            </Badge>
                            {contract.riskProfile.confidence === "high" && (
                                <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400">
                                    <ShieldCheck className="mr-1 h-3 w-3" />
                                    High Confidence
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            {contract.name}
                        </h1>
                        <p className="text-muted-foreground">
                            {contract.description}
                        </p>

                        {/* Context Selector */}
                        <div className="mt-4 space-y-2">
                            <label className="text-sm font-medium">Select Context for Analysis</label>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {configsLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading contexts...
                                    </div>
                                ) : configsError ? (
                                    <div className="text-sm text-destructive">
                                        Failed to load contexts
                                    </div>
                                ) : configurations?.length ? (
                                    <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                                        <SelectTrigger className="w-80">
                                            <SelectValue placeholder="Choose a context..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {configurations.map((config) => (
                                                <SelectItem key={config.id} value={config.id.toString()}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{config.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {config.brand.name} • {config.brand.domain}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm text-muted-foreground">
                                        No contexts available. Create one first.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => runMutation.mutate()}
                            disabled={runMutation.isPending || !selectedConfigId || configsLoading}
                        >
                            {runMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    Run Analysis
                                    <Play className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-4 rounded-lg border bg-slate-50 px-4 py-3 dark:bg-slate-900/50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Target className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Strategic Question
                        </p>
                        <p className="font-medium text-foreground">
                            {contract.strategicQuestion}
                        </p>
                    </div>
                </div>
            </header>

            {/* 4. Main Content */}
            <main className="flex-1 overflow-auto p-6">
                <div className="grid gap-6 md:grid-cols-3">

                    {/* Left Column: Inputs & Context (1/3) */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Required Context</CardTitle>
                                <CardDescription>
                                    UCR sections needed for execution
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                {contract.contextInjection.requiredSections.map((section) => (
                                    <div key={section} className="flex items-start gap-3">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted font-mono text-xs font-medium">
                                            {section}
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-medium leading-none mb-1">
                                                Section {section}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {contract.contextInjection.sectionUsage[section]}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Input Parameters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {contract.inputs.fields.map((field) => (
                                        <div key={field.name} className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">
                                                {field.name} {field.required && <span className="text-rose-500">*</span>}
                                            </label>
                                            <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground font-mono">
                                                {field.type}
                                            </div>
                                            {field.description && (
                                                <p className="text-[0.8rem] text-muted-foreground">{field.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Work Area (2/3) */}
                    <div className="md:col-span-2 space-y-6">
                        {executionResult ? (
                            <ModuleVisualizer
                                visuals={contract.output.visuals || []}
                                data={executionResult}
                            />
                        ) : (
                            <div className="rounded-xl border border-dashed p-8 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                    <Layers className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="max-w-md space-y-2">
                                    <h3 className="font-semibold text-lg">Ready to Analyze</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Click "Run Analysis" to execute <strong>{contract.moduleId}</strong> against the active context.
                                    </p>
                                </div>
                                <Separator className="w-1/3 my-4" />
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Database className="h-3 w-3" />
                                        {contract.dataSources.join(", ")}
                                    </div>
                                    <div className="w-px h-4 bg-border" />
                                    <div className="flex items-center gap-1.5">
                                        <BrainCircuit className="h-3 w-3" />
                                        {contract.riskProfile.inferenceType}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
