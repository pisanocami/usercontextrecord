import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  History,
  RotateCcw,
  Calendar,
  FileText,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ConfigurationVersion } from "@shared/schema";

interface Configuration {
  id: number;
  name: string;
  brand: { name: string; domain: string };
}

export default function VersionHistory() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ConfigurationVersion | null>(null);

  const configId = id ? parseInt(id, 10) : null;

  const { data: config, isLoading: configLoading } = useQuery<Configuration>({
    queryKey: [`/api/configurations/${configId}`],
    enabled: !!configId,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery<ConfigurationVersion[]>({
    queryKey: [`/api/configurations/${configId}/versions`],
    enabled: !!configId,
  });

  const restoreMutation = useMutation({
    mutationFn: async (versionId: number) => {
      const response = await apiRequest("POST", `/api/versions/${versionId}/restore`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Version restored",
        description: "La configuración ha sido restaurada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
      setRestoreDialogOpen(false);
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRestoreClick = (version: ConfigurationVersion) => {
    setSelectedVersion(version);
    setRestoreDialogOpen(true);
  };

  const confirmRestore = () => {
    if (selectedVersion) {
      restoreMutation.mutate(selectedVersion.id);
    }
  };

  if (configLoading || versionsLoading) {
    return (
      <div className="h-full p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <ScrollArea className="h-full">
        <div className="container max-w-4xl py-6 px-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a configuraciones
            </Button>
          </Link>
          <Card>
            <CardHeader>
              <CardTitle>Configuración no encontrada</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
  };

  const renderSectionSummary = (version: ConfigurationVersion) => {
    const sections = [
      { key: "brand", label: "Marca", value: version.brand?.name || "-" },
      { key: "category", label: "Categoría", value: version.category_definition?.primary_category || "-" },
      { key: "competitors", label: "Competidores", value: `${(version.competitors?.direct?.length || 0) + (version.competitors?.indirect?.length || 0)} configurados` },
      { key: "negative", label: "Exclusiones", value: `${(version.negative_scope?.excluded_keywords?.length || 0)} keywords` },
    ];

    return (
      <div className="grid grid-cols-2 gap-2 text-sm">
        {sections.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="text-muted-foreground">{s.label}:</span>
            <span className="font-medium truncate">{s.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="container max-w-4xl py-6 px-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a configuraciones
          </Button>
        </Link>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6" />
              Historial de Versiones
            </h1>
            <p className="text-muted-foreground">
              {config.name} - {config.brand?.name || config.brand?.domain}
            </p>
          </div>
          <Badge variant="secondary">
            {versions?.length || 0} versiones
          </Badge>
        </div>

        {versions && versions.length > 0 ? (
          <div className="space-y-4">
            {versions.map((version, index) => (
              <Card key={version.id} data-testid={`version-card-${version.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">
                          Versión {version.versionNumber}
                        </CardTitle>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Más reciente
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(version.created_at)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreClick(version)}
                      disabled={restoreMutation.isPending}
                      data-testid={`button-restore-${version.id}`}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restaurar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {version.change_summary && (
                    <div className="mb-3 p-2 bg-muted rounded-md">
                      <p className="text-sm flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{version.change_summary}</span>
                      </p>
                    </div>
                  )}
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="details" className="border-none">
                      <AccordionTrigger className="py-2 text-sm">
                        Ver detalles
                      </AccordionTrigger>
                      <AccordionContent>
                        {renderSectionSummary(version)}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin historial de versiones</h3>
              <p className="text-muted-foreground">
                El historial de versiones se crea automáticamente cuando editas una configuración.
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restaurar versión</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas restaurar la versión {selectedVersion?.versionNumber}?
                La configuración actual será guardada automáticamente como una nueva versión antes de restaurar.
              </DialogDescription>
            </DialogHeader>
            {selectedVersion && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm mb-2">
                  <strong>Fecha:</strong> {formatDate(selectedVersion.created_at)}
                </p>
                {selectedVersion.change_summary && (
                  <p className="text-sm">
                    <strong>Cambio:</strong> {selectedVersion.change_summary}
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRestoreDialogOpen(false)}
                disabled={restoreMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmRestore}
                disabled={restoreMutation.isPending}
                data-testid="button-confirm-restore"
              >
                {restoreMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Confirmar restauración
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
