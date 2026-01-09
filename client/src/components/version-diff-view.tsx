import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, ArrowLeft, ArrowRight, Minus, Plus, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ConfigurationVersion } from "@shared/schema";
import type { VersionDiff, FieldChange, SectionDiff } from "@shared/version-diff";
import { getSectionDisplayName, formatFieldPath, formatValue } from "@shared/version-diff";
import { cn } from "@/lib/utils";

interface VersionDiffViewProps {
  version1: ConfigurationVersion;
  version2: ConfigurationVersion;
  diff: VersionDiff;
  onClose: () => void;
}

function ChangeTypeBadge({ type }: { type: FieldChange["type"] }) {
  const variants: Record<FieldChange["type"], { label: string; className: string }> = {
    added: { label: "Agregado", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    removed: { label: "Eliminado", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
    modified: { label: "Modificado", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  };

  const variant = variants[type];

  return (
    <Badge variant="outline" className={cn("text-xs", variant.className)}>
      {type === "added" && <Plus className="h-3 w-3 mr-1" />}
      {type === "removed" && <Minus className="h-3 w-3 mr-1" />}
      {type === "modified" && <RefreshCw className="h-3 w-3 mr-1" />}
      {variant.label}
    </Badge>
  );
}

function ChangeRow({ change }: { change: FieldChange }) {
  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">
          {formatFieldPath(change.field) || "Valor"}
        </span>
        <ChangeTypeBadge type={change.type} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div
          className={cn(
            "p-2 rounded text-sm break-words",
            change.type === "removed"
              ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
              : "bg-muted"
          )}
        >
          <span className="text-xs text-muted-foreground block mb-1">Anterior</span>
          <span className={change.type === "removed" ? "line-through opacity-70" : ""}>
            {formatValue(change.oldValue)}
          </span>
        </div>
        <div
          className={cn(
            "p-2 rounded text-sm break-words",
            change.type === "added"
              ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
              : change.type === "modified"
              ? "bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800"
              : "bg-muted"
          )}
        >
          <span className="text-xs text-muted-foreground block mb-1">Nuevo</span>
          {formatValue(change.newValue)}
        </div>
      </div>
    </div>
  );
}

function SectionDiffCard({
  sectionKey,
  sectionDiff,
}: {
  sectionKey: string;
  sectionDiff: SectionDiff;
}) {
  if (!sectionDiff.hasChanges) {
    return (
      <Card className="opacity-60">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getSectionDisplayName(sectionKey)}
            <Badge variant="secondary" className="text-xs">Sin cambios</Badge>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 flex-wrap">
          {getSectionDisplayName(sectionKey)}
          <Badge variant="default" className="text-xs">
            {sectionDiff.changes.length} {sectionDiff.changes.length === 1 ? "cambio" : "cambios"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {sectionDiff.changes.map((change, idx) => (
          <ChangeRow key={`${change.field}-${idx}`} change={change} />
        ))}
      </CardContent>
    </Card>
  );
}

export function VersionDiffView({ version1, version2, diff, onClose }: VersionDiffViewProps) {
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "d MMM yyyy, HH:mm", { locale: es });
  };

  const sectionsWithChanges = Object.entries(diff.sections).filter(
    ([, sectionDiff]) => sectionDiff.hasChanges
  );
  const sectionsWithoutChanges = Object.entries(diff.sections).filter(
    ([, sectionDiff]) => !sectionDiff.hasChanges
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="button-close-diff"
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar comparacion
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" data-testid="badge-version-1">
              v{version1.versionNumber}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" data-testid="badge-version-2">
              v{version2.versionNumber}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {diff.summary.totalChanges} {diff.summary.totalChanges === 1 ? "cambio" : "cambios"} en {diff.summary.sectionsChanged.length} {diff.summary.sectionsChanged.length === 1 ? "seccion" : "secciones"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 border-b">
        <Card data-testid="version-1-summary">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              Version {version1.versionNumber} (Anterior)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-sm text-muted-foreground">
            <p>{formatDate(version1.created_at)}</p>
            {version1.change_summary && (
              <p className="mt-1 text-xs">{version1.change_summary}</p>
            )}
          </CardContent>
        </Card>
        <Card data-testid="version-2-summary">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Version {version2.versionNumber} (Nueva)
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-sm text-muted-foreground">
            <p>{formatDate(version2.created_at)}</p>
            {version2.change_summary && (
              <p className="mt-1 text-xs">{version2.change_summary}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <Tabs defaultValue="changes" className="w-full">
            <TabsList className="mb-4" data-testid="tabs-diff-view">
              <TabsTrigger value="changes" data-testid="tab-changes">
                Con cambios ({sectionsWithChanges.length})
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all">
                Todas las secciones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="changes" className="space-y-4">
              {sectionsWithChanges.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No hay cambios entre estas versiones
                  </CardContent>
                </Card>
              ) : (
                sectionsWithChanges.map(([key, sectionDiff]) => (
                  <SectionDiffCard
                    key={key}
                    sectionKey={key}
                    sectionDiff={sectionDiff}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {sectionsWithChanges.map(([key, sectionDiff]) => (
                <SectionDiffCard
                  key={key}
                  sectionKey={key}
                  sectionDiff={sectionDiff}
                />
              ))}
              {sectionsWithoutChanges.map(([key, sectionDiff]) => (
                <SectionDiffCard
                  key={key}
                  sectionKey={key}
                  sectionDiff={sectionDiff}
                />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
