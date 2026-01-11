import { useState } from "react";
import { useRoute, Link } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    AlertTriangle,
    BrainCircuit,
    Database,
    Layers,
    ShieldCheck,
    Target,
    Loader2,
    Play,
    FolderOpen,
    Plus,
    SearchX,
    Lightbulb,
    CheckCircle2,
    XCircle,
    ExternalLink,
} from "lucide-react";
import { CONTRACT_REGISTRY } from "@shared/module.contract";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ModuleVisualizer } from "@/components/module-visualizer";

interface Configuration {
    id: number;
    name: string;
    brand: {
        name: string;
        domain: string;
    };
}

function hasNonEmptyData(obj: any, depth: number = 0): boolean {
    if (depth > 3) return false; // Prevent infinite recursion
    if (obj === null || obj === undefined) return false;
    
    // Primitives with value
    if (typeof obj === 'number') return obj > 0;
    if (typeof obj === 'string') return obj.length > 0;
    if (typeof obj === 'boolean') return true;
    
    // Arrays with content
    if (Array.isArray(obj)) return obj.length > 0;
    
    // Objects - check values recursively
    if (typeof obj === 'object') {
        for (const val of Object.values(obj)) {
            if (hasNonEmptyData(val, depth + 1)) return true;
        }
    }
    
    return false;
}

function isEmptyResult(data: any): boolean {
    if (!data) return true;
    
    // ModuleRunResult v2 format: { envelope, items, summary }
    if (data.envelope && Array.isArray(data.items)) {
        // Check if items has content
        if (data.items.length > 0) {
            return false;
        }
        // If items is empty, check if summary has meaningful data
        if (data.summary && typeof data.summary === 'object') {
            const summaryMetaFields = new Set(['totalSignals', 'actionableCount', 'dataSourcesUsed', 'warnings']);
            for (const [key, value] of Object.entries(data.summary)) {
                // Skip known meta fields that are always present
                if (summaryMetaFields.has(key) && (Array.isArray(value) ? value.length === 0 : value === 0)) continue;
                
                // If there's a string with meaningful content
                if (typeof value === 'string' && value.length > 10) return false;
                // If there's a positive number (indicates actual data)
                if (typeof value === 'number' && value > 0) return false;
                // If there's a non-empty array
                if (Array.isArray(value) && value.length > 0) return false;
                // If there's an object with nested data
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    if (hasNonEmptyData(value)) return false;
                }
            }
        }
        // Check envelope warnings - if there are warnings, we should show the result
        if (data.envelope.warnings && data.envelope.warnings.length > 0) {
            return false;
        }
        return true;
    }
    
    // Fields that should be IGNORED when determining if result has data
    // These are metadata fields, not actual results
    const metadataFields = new Set([
        'success', 'error', 'context', 'persistenceWarning', 'message',
        'configId', 'configurationName', 'contextVersion', 'brandDomain',
        'competitors', 'filtersApplied', 'stats', 'executedAt', 'moduleId',
        'ucr_version', 'sections_used', 'rules_triggered', 'executed_at',
        'envelope', 'runId', 'startedAt', 'completedAt'
    ]);
    
    // Known count fields - if > 0, there's data
    const countFields = ['total', 'totalGapKeywords', 'totalKeywords', 'count'];
    for (const field of countFields) {
        if (typeof data[field] === 'number' && data[field] > 0) {
            return false;
        }
    }
    
    // Heuristic approach: check all root-level fields for content
    for (const [key, value] of Object.entries(data)) {
        // Skip metadata fields
        if (metadataFields.has(key)) continue;
        
        // Check arrays with content
        if (Array.isArray(value) && value.length > 0) {
            return false;
        }
        
        // Check meaningful strings (> 20 chars likely content, not just IDs)
        if (typeof value === 'string' && value.length > 20) {
            return false;
        }
        
        // Check objects that contain meaningful data (but not known metadata objects)
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Skip known metadata objects that don't represent results
            if (key === 'stats' || key === 'filtersApplied' || key === 'context') continue;
            
            // Check all nested values for any meaningful content
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
                // Skip nested metadata
                if (metadataFields.has(nestedKey)) continue;
                
                // Arrays with content
                if (Array.isArray(nestedValue) && nestedValue.length > 0) {
                    return false;
                }
                // Meaningful strings (narratives, descriptions, etc.)
                if (typeof nestedValue === 'string' && nestedValue.length > 20) {
                    return false;
                }
                // Numbers that indicate content
                if (typeof nestedValue === 'number' && nestedValue > 0) {
                    return false;
                }
                // Nested objects - use recursive check
                if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
                    if (hasNonEmptyData(nestedValue)) return false;
                }
            }
        }
    }
    
    // Check summary object for all types of nested content
    if (data.summary && typeof data.summary === 'object') {
        for (const [key, value] of Object.entries(data.summary)) {
            if (metadataFields.has(key)) continue;
            
            if (Array.isArray(value) && value.length > 0) return false;
            if (typeof value === 'string' && value.length > 20) return false;
            if (typeof value === 'number' && value > 0) return false;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (hasNonEmptyData(value)) return false;
            }
        }
    }
    
    return true;
}

function getEmptyResultSuggestions(moduleId: string, _category: string): string[] {
    const suggestions: Record<string, string[]> = {
        "seo": [
            "Verifica que los competidores tengan presencia orgánica significativa",
            "Prueba con competidores más directos de tu nicho",
            "Asegúrate de que tu dominio tenga keywords indexadas"
        ],
        "market": [
            "Verifica las categorías definidas en tu contexto",
            "Asegúrate de que el mercado objetivo tenga suficiente volumen de búsqueda",
            "Prueba con categorías más amplias o específicas"
        ],
        "brand": [
            "Confirma que tu marca tenga presencia de búsqueda medible",
            "Verifica los competidores en tu contexto",
            "Considera expandir el conjunto competitivo"
        ],
        "signal": [
            "Revisa la configuración de fuentes de datos",
            "Verifica que las categorías tengan cobertura de datos",
            "Prueba ajustando los filtros de contexto"
        ],
        "intel": [
            "Ejecuta primero el módulo Keyword Gap para obtener datos de análisis",
            "Verifica que el módulo Market Demand tenga datos históricos",
            "Revisa que los competidores tengan presencia medible",
            "Las APIs de Social/Ads están en modo stub - algunos datos son simulados"
        ]
    };
    
    // Extract category prefix from moduleId (e.g., "seo.keyword_gap.v1" -> "seo")
    const modulePrefix = moduleId.split(".")[0].toLowerCase();
    return suggestions[modulePrefix] || [
        "Revisa la configuración de tu contexto",
        "Verifica que los datos de entrada sean correctos",
        "Contacta soporte si el problema persiste"
    ];
}

interface EmptyModuleResultProps {
    moduleId: string;
    moduleName: string;
    category: string;
    data: any;
}

function EmptyModuleResult({ moduleId, moduleName, category, data }: EmptyModuleResultProps) {
    const suggestions = getEmptyResultSuggestions(moduleId, category);
    
    return (
        <div className="rounded-xl border border-dashed p-8 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <SearchX className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="max-w-md space-y-2">
                <h3 className="font-semibold text-lg">Análisis completado sin resultados</h3>
                <p className="text-sm text-muted-foreground">
                    El módulo <strong>{moduleName}</strong> se ejecutó correctamente, pero no encontró datos que coincidan con tu configuración actual.
                </p>
            </div>
            
            <div className="w-full max-w-md mt-4 p-4 rounded-lg bg-background border">
                <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Sugerencias</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                    {suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            {suggestion}
                        </li>
                    ))}
                </ul>
            </div>
            
            {data?.filtersApplied && (
                <div className="text-xs text-muted-foreground mt-4">
                    <span className="font-medium">Filtros aplicados:</span>{" "}
                    {Object.entries(data.filtersApplied)
                        .filter(([_, v]) => typeof v === "number" && v > 0)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ") || "Ninguno"}
                </div>
            )}
        </div>
    );
}

interface PreflightCheckResult {
    checkType: string;
    passed: boolean;
    currentValue: number | boolean | string;
    requiredValue?: number | boolean | string;
    description: string;
    actionLabel: string;
    actionPath?: string;
    ucrSection: string;
}

interface PreflightResult {
    moduleId: string;
    status: "ready" | "missing_requirements" | "error";
    sectionChecks: {
        section: string;
        name: string;
        required: boolean;
        available: boolean;
    }[];
    entityChecks: PreflightCheckResult[];
    missingRequired: string[];
    allRequirementsMet: boolean;
    summary: string;
}

export function ModuleShell() {
    const [match, params] = useRoute("/modules/:moduleId");
    const moduleId = params?.moduleId;
    const { toast } = useToast();
    const [executionResult, setExecutionResult] = useState<any>(null);
    const [selectedConfigId, setSelectedConfigId] = useState<string>("");

    // 1. Resolve Contract
    const contract = moduleId ? CONTRACT_REGISTRY[moduleId] : undefined;

    // 2. Load available configurations
    const { data: configurations, isLoading: isLoadingConfigs } = useQuery<Configuration[]>({
        queryKey: ["/api/configurations"],
        queryFn: getQueryFn({ on401: "throw" }),
    });

    // 3. Preflight check when config is selected
    const { data: preflightData, isLoading: isLoadingPreflight, refetch: refetchPreflight } = useQuery<{ success: boolean; data: PreflightResult }>({
        queryKey: ["/api/modules", moduleId, "preflight", selectedConfigId],
        queryFn: async () => {
            if (!selectedConfigId || !moduleId) return null;
            const res = await apiRequest("POST", `/api/modules/${moduleId}/preflight`, { configId: parseInt(selectedConfigId) });
            return res.json();
        },
        enabled: !!selectedConfigId && !!moduleId,
    });

    const preflight = preflightData?.data;
    const preflightReady = preflight?.allRequirementsMet ?? false;
    const preflightError = preflightData === undefined && !isLoadingPreflight && selectedConfigId;

    // 4. Execution Mutation
    const runMutation = useMutation({
        mutationFn: async () => {
            if (!selectedConfigId) {
                throw new Error("No context selected");
            }
            const configId = parseInt(selectedConfigId);
            const res = await apiRequest("POST", `/api/modules/${moduleId}/run`, { configId });
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
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message || "Failed to run module analysis.", variant: "destructive" });
        }
    });

    const selectedConfig = configurations?.find(c => c.id.toString() === selectedConfigId);
    const canRun = !!selectedConfigId && !runMutation.isPending && preflightReady;

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
                        <div className="flex items-center gap-2">
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
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Context Selector */}
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">Contexto</span>
                            {isLoadingConfigs ? (
                                <Skeleton className="h-9 w-[200px]" />
                            ) : configurations && configurations.length > 0 ? (
                                <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                                    <SelectTrigger className="w-[200px]" data-testid="select-context">
                                        <SelectValue placeholder="Selecciona contexto..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {configurations.map((config) => (
                                            <SelectItem key={config.id} value={config.id.toString()}>
                                                {config.name || config.brand?.domain || `Context ${config.id}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Link href="/new">
                                    <Button variant="outline" size="sm" className="gap-1">
                                        <Plus className="h-3 w-3" />
                                        Crear Contexto
                                    </Button>
                                </Link>
                            )}
                        </div>
                        <Button
                            onClick={() => runMutation.mutate()}
                            disabled={!canRun}
                            data-testid="button-run-analysis"
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
                        {/* Preflight Loading */}
                        {selectedConfigId && isLoadingPreflight && (
                            <Card className="border-muted">
                                <CardContent className="flex items-center gap-3 py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Checking requirements...</p>
                                        <p className="text-xs text-muted-foreground">Validating configuration</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Preflight Error */}
                        {preflightError && (
                            <Card className="border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20">
                                <CardContent className="flex items-center gap-3 py-4">
                                    <XCircle className="h-5 w-5 text-rose-600" />
                                    <div>
                                        <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Failed to check requirements</p>
                                        <p className="text-xs text-muted-foreground">Please try selecting the context again</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Preflight Requirements Panel */}
                        {selectedConfigId && preflight && !preflight.allRequirementsMet && !isLoadingPreflight && (
                            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                        Requirements Missing
                                    </CardTitle>
                                    <CardDescription>
                                        Complete these items to run the module
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {preflight.entityChecks.filter(c => !c.passed).map((check, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                                            <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                                            <div className="flex-1 space-y-2">
                                                <p className="text-sm font-medium">{check.description}</p>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        Section {check.ucrSection}
                                                    </Badge>
                                                    {check.actionPath && (
                                                        <Link href={check.actionPath.replace(":id", selectedConfigId)}>
                                                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                                                {check.actionLabel}
                                                                <ExternalLink className="h-3 w-3" />
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {preflight.missingRequired.length > 0 && (
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                                            <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">Missing required sections</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {preflight.sectionChecks
                                                        .filter(s => s.required && !s.available)
                                                        .map(s => s.name)
                                                        .join(", ")}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Ready to Run indicator */}
                        {selectedConfigId && preflight?.allRequirementsMet && !isLoadingPreflight && (
                            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                                <CardContent className="flex items-center gap-3 py-4">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    <div>
                                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Ready to Run</p>
                                        <p className="text-xs text-muted-foreground">All requirements met</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Required Context</CardTitle>
                                <CardDescription>
                                    UCR sections needed for execution
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                {contract.contextInjection.requiredSections.map((section) => {
                                    const sectionCheck = preflight?.sectionChecks.find(s => s.section === section);
                                    const isAvailable = sectionCheck?.available ?? false;
                                    const showStatus = selectedConfigId && preflight && !isLoadingPreflight;
                                    return (
                                        <div key={section} className="flex items-start gap-3">
                                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-medium ${
                                                showStatus
                                                    ? (isAvailable 
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" 
                                                        : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300")
                                                    : "bg-muted"
                                            }`}>
                                                {section}
                                            </div>
                                            <div className="text-sm flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium leading-none mb-1">
                                                        Section {section}
                                                    </p>
                                                    {showStatus && (
                                                        isAvailable 
                                                            ? <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                            : <XCircle className="h-3 w-3 text-rose-500" />
                                                    )}
                                                    {selectedConfigId && isLoadingPreflight && (
                                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {contract.contextInjection.sectionUsage[section]}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
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
                            isEmptyResult(executionResult) ? (
                                <EmptyModuleResult
                                    moduleId={contract.moduleId}
                                    moduleName={contract.name}
                                    category={contract.category}
                                    data={executionResult}
                                />
                            ) : (
                                <ModuleVisualizer
                                    visuals={contract.output.visuals || []}
                                    data={executionResult}
                                />
                            )
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
