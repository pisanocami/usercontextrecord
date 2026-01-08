import React from "react";
import { Info, AlertTriangle, XCircle, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { type ItemTrace, type Disposition } from "@shared/module.contract";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";

interface TraceViewerProps {
    traces: ItemTrace[];
    disposition: Disposition;
    className?: string;
    isInitialOpen?: boolean;
}

export const TraceViewer: React.FC<TraceViewerProps> = ({
    traces,
    disposition,
    className,
    isInitialOpen = false
}) => {
    const [isOpen, setIsOpen] = React.useState(isInitialOpen);

    if (!traces || traces.length === 0) return null;

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case "critical": return <XCircle className="h-4 w-4 text-destructive" />;
            case "high": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            case "medium": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const getDispositionColor = (disp: Disposition) => {
        switch (disp) {
            case "OUT_OF_PLAY": return "bg-destructive/10 text-destructive border-destructive/20";
            case "REVIEW": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
            case "PASS": return "bg-green-500/10 text-green-600 border-green-500/20";
            default: return "bg-muted text-muted-foreground";
        }
    };

    return (
        <div className={cn("mt-2 border rounded-lg overflow-hidden", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between p-2 text-xs font-medium hover:bg-muted/50 transition-colors",
                    getDispositionColor(disposition)
                )}
            >
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Audit Trail ({traces.length} steps)</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0 px-1 ml-1">
                        {disposition}
                    </Badge>
                </div>
                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {isOpen && (
                <div className="p-3 bg-muted/30 space-y-3">
                    {traces.map((trace, idx) => (
                        <div key={idx} className="flex gap-3 relative">
                            {/* Timeline line */}
                            {idx !== traces.length - 1 && (
                                <div className="absolute left-[7px] top-6 bottom-[-12px] w-[2px] bg-border" />
                            )}

                            <div className="mt-1 z-10 bg-background rounded-full">
                                {getSeverityIcon(trace.severity)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                                        Gate {trace.ucrSection} / {trace.ruleId}
                                    </span>
                                </div>
                                <p className="text-xs text-foreground leading-snug">
                                    {trace.reason}
                                </p>
                                {trace.evidence && (
                                    <div className="mt-1 p-1.5 bg-background border rounded text-[10px] font-mono text-muted-foreground truncate italic">
                                        Evidence: {trace.evidence}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
