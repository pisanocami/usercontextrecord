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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertTriangle,
    BrainCircuit,
    Database,
    Layers,
    ShieldCheck,
    Target,
    Loader2,
    Play,
    Building2,
    CheckCircle2,
    AlertCircle,
    Zap
} from "lucide-react";
import { CONTRACT_REGISTRY } from "@shared/module.contract";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ModuleVisualizer } from "@/components/module-visualizer";
import type { Configuration } from "@shared/schema";

type ProviderType = "dataforseo" | "ahrefs";

interface ProviderStatus {
    provider: ProviderType;
    available: boolean;
    configured: boolean;
    name: string;
    description: string;
}

interface AhrefsEstimate {
    provider: string;
    configurationName: string;
    brandDomain: string;
    competitorDomains: string[];
    estimate: {
        totalUnits: number;
        breakdown: Array<{
            domain: string;
            cached: boolean;
            estimatedUnits: number;
            estimatedRows: number;
        }>;
        warnings: string[];
        requiresConfirmation: boolean;
        message?: string;
    };
}

export function ModuleShell() {
    const [match, params] = useRoute("/modules/:moduleId");
    const moduleId = params?.moduleId;
    const { toast } = useToast();
    const { user } = useAuth();
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [selectedConfigId, setSelectedConfigId] = useState<string>("");
    const [selectedProvider, setSelectedProvider] = useState<ProviderType>("ahrefs");
    const [showAhrefsConfirm, setShowAhrefsConfirm] = useState(false);
    const [ahrefsEstimate, setAhrefsEstimate] = useState<AhrefsEstimate | null>(null);

    // Check if this is the keyword gap module
    const isKeywordGapModule = moduleId === "seo.keyword_gap_visibility.v1";

    // 1. Resolve Contract
    const contract = moduleId ? CONTRACT_REGISTRY[moduleId] : undefined;

    // 2. Fetch Available Configurations
    const { data: configurations, isLoading: configsLoading, error: configsError } = useQuery<Configuration[]>({
        queryKey: ["/api/configurations"],
        retry: 3,
        staleTime: 5 * 60 * 1000,
    });

    // 3. Fetch provider status for keyword gap module
    const { data: providersData } = useQuery<{ providers: ProviderStatus[] }>({
        queryKey: ["/api/keyword-gap-lite/providers"],
        enabled: isKeywordGapModule,
    });

    // 4. Ahrefs estimate mutation
    const estimateMutation = useMutation({
        mutationFn: async (params: { configurationId: number; provider: ProviderType }) => {
            const response = await apiRequest("POST", "/api/keyword-gap-lite/estimate", {
                configurationId: params.configurationId,
                provider: params.provider,
                limitPerDomain: 200,
                maxCompetitors: 5,
            });
            return response.json() as Promise<AhrefsEstimate>;
        },
        onSuccess: (data) => {
            setAhrefsEstimate(data);
            if (data.estimate.requiresConfirmation) {
                setShowAhrefsConfirm(true);
            } else {
                // No confirmation needed - run directly
                runKeywordGapMutation.mutate({
                    configurationId: parseInt(selectedConfigId),
                    provider: selectedProvider,
                });
            }
        },
        onError: (error: Error) => {
            toast({
                title: "Error estimating API units",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // 5. Keyword gap specific mutation using the lite endpoint
    const runKeywordGapMutation = useMutation({
        mutationFn: async (params: { configurationId: number; provider: ProviderType }) => {
            const response = await apiRequest("POST", "/api/keyword-gap-lite/run", {
                configurationId: params.configurationId,
                limitPerDomain: 200,
                locationCode: 2840,
                languageCode: "en",
                maxCompetitors: 5,
                provider: params.provider,
                forceRefresh: false,
            });
            return response.json();
        },
        onSuccess: (data) => {
            if (data.success !== false) {
                setExecutionResult(data);
                toast({ title: "Analysis Complete", description: "Keyword Gap analysis executed successfully." });
            } else {
                toast({ title: "Analysis Failed", description: data.error, variant: "destructive" });
            }
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message || "Failed to run keyword gap analysis.", variant: "destructive" });
        },
    });

    // 6. Generic module execution mutation
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

    // Handle run button click
    const handleRunAnalysis = () => {
        if (!selectedConfigId) {
            toast({ title: "Error", description: "Please select a context first", variant: "destructive" });
            return;
        }

        if (isKeywordGapModule) {
            // Use keyword gap specific logic with provider selection
            if (selectedProvider === "ahrefs") {
                // Get estimate first for Ahrefs
                estimateMutation.mutate({
                    configurationId: parseInt(selectedConfigId),
                    provider: selectedProvider,
                });
            } else {
                // Run directly for DataForSEO
                runKeywordGapMutation.mutate({
                    configurationId: parseInt(selectedConfigId),
                    provider: selectedProvider,
                });
            }
        } else {
            // Use generic module execution
            runMutation.mutate();
        }
    };

    // Confirm and run after Ahrefs estimate
    const handleConfirmAhrefsRun = () => {
        setShowAhrefsConfirm(false);
        runKeywordGapMutation.mutate({
            configurationId: parseInt(selectedConfigId),
            provider: "ahrefs",
        });
    };

    const isRunning = runMutation.isPending || runKeywordGapMutation.isPending || estimateMutation.isPending;

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
            {/* Header */}
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
                                        <SelectTrigger className="w-80" data-testid="select-config">
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

                        {/* Provider Selector - Only for Keyword Gap Module */}
                        {isKeywordGapModule && (
                            <div className="mt-4 space-y-2">
                                <label className="text-sm font-medium">Data Provider</label>
                                <div className="flex items-center gap-3">
                                    <Select value={selectedProvider} onValueChange={(v) => setSelectedProvider(v as ProviderType)}>
                                        <SelectTrigger className="w-48" data-testid="select-provider">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ahrefs">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="h-3 w-3 text-orange-500" />
                                                    Ahrefs
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="dataforseo">
                                                <div className="flex items-center gap-2">
                                                    <Database className="h-3 w-3 text-blue-500" />
                                                    DataForSEO
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {providersData?.providers && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {providersData.providers.find(p => p.provider === selectedProvider)?.configured ? (
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                            ) : (
                                                <AlertCircle className="h-3 w-3 text-amber-500" />
                                            )}
                                            {providersData.providers.find(p => p.provider === selectedProvider)?.configured 
                                                ? "Configured" 
                                                : "Not configured"}
                                        </div>
                                    )}
                                </div>
                                {selectedProvider === "ahrefs" && (
                                    <p className="text-xs text-muted-foreground">
                                        Ahrefs provides more accurate keyword data. Cost estimate shown before running.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleRunAnalysis}
                            disabled={isRunning || !selectedConfigId || configsLoading}
                            data-testid="button-run-analysis"
                        >
                            {isRunning ? (
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

            {/* Main Content */}
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

            {/* Ahrefs Confirmation Dialog */}
            <Dialog open={showAhrefsConfirm} onOpenChange={setShowAhrefsConfirm}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-orange-500" />
                            Confirm Ahrefs API Usage
                        </DialogTitle>
                        <DialogDescription>
                            This analysis will consume Ahrefs API units. Review the estimate below.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {ahrefsEstimate && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-4 border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium">Total API Units</span>
                                    <span className="text-2xl font-bold text-orange-600">
                                        {ahrefsEstimate.estimate.totalUnits.toLocaleString()}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {ahrefsEstimate.estimate.breakdown.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground truncate max-w-[200px]">
                                                {item.domain}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {item.cached && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Cached
                                                    </Badge>
                                                )}
                                                <span className="font-mono">
                                                    {item.estimatedUnits.toLocaleString()} units
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {ahrefsEstimate.estimate.warnings.length > 0 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Warnings</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc list-inside">
                                            {ahrefsEstimate.estimate.warnings.map((w, i) => (
                                                <li key={i}>{w}</li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowAhrefsConfirm(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleConfirmAhrefsRun}
                            disabled={runKeywordGapMutation.isPending}
                            data-testid="button-confirm-ahrefs"
                        >
                            {runKeywordGapMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Confirm & Run
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
