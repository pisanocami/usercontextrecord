import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, ArrowLeft, Save, AlertTriangle, Zap, Shield, Clock, CheckCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { AlertPreference } from "@shared/schema";
import { useState, useEffect } from "react";

interface PreferenceOption {
  id: keyof Omit<AlertPreference, "id" | "userId" | "updated_at" | "emailNotifications">;
  label: string;
  description: string;
  icon: typeof Bell;
}

const preferenceOptions: PreferenceOption[] = [
  {
    id: "qualityDropEnabled",
    label: "Descenso de calidad",
    description: "Recibir alertas cuando el puntaje de calidad de un contexto baja significativamente.",
    icon: AlertTriangle,
  },
  {
    id: "competitorChangeEnabled",
    label: "Cambios en competidores",
    description: "Notificaciones cuando se agregan, eliminan o modifican competidores.",
    icon: Zap,
  },
  {
    id: "guardrailViolationEnabled",
    label: "Violaciones de guardrail",
    description: "Alertas cuando se detectan violaciones de las reglas de exclusion.",
    icon: Shield,
  },
  {
    id: "expirationWarningEnabled",
    label: "Avisos de expiracion",
    description: "Recordatorios cuando un contexto esta proximo a expirar.",
    icon: Clock,
  },
  {
    id: "analysisCompleteEnabled",
    label: "Analisis completados",
    description: "Notificaciones cuando un modulo finaliza su ejecucion.",
    icon: CheckCircle,
  },
];

export default function AlertPreferencesPage() {
  const { toast } = useToast();
  const [localPrefs, setLocalPrefs] = useState<Partial<AlertPreference>>({});

  const { data: preferences, isLoading } = useQuery<AlertPreference>({
    queryKey: ["/api/alerts/preferences"],
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  const updateMutation = useMutation({
    mutationFn: async (prefs: Partial<AlertPreference>) => {
      await apiRequest("PUT", "/api/alerts/preferences", prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/preferences"] });
      toast({
        title: "Preferencias guardadas",
        description: "Tus preferencias de alertas han sido actualizadas.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron guardar las preferencias.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof AlertPreference, value: boolean) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const updates: Partial<AlertPreference> = {};
    
    preferenceOptions.forEach((option) => {
      if (localPrefs[option.id] !== undefined) {
        updates[option.id] = localPrefs[option.id];
      }
    });
    
    if (localPrefs.emailNotifications !== undefined) {
      updates.emailNotifications = localPrefs.emailNotifications;
    }

    updateMutation.mutate(updates);
  };

  const hasChanges = preferences && Object.keys(localPrefs).some(
    (key) => localPrefs[key as keyof AlertPreference] !== preferences[key as keyof AlertPreference]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Cargando preferencias...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Preferencias de Alertas</h1>
            <p className="text-muted-foreground text-sm">
              Configura que notificaciones deseas recibir
            </p>
          </div>
        </div>
      </div>

      <Card data-testid="card-alert-preferences">
        <CardHeader>
          <CardTitle className="text-lg">Tipos de Alertas</CardTitle>
          <CardDescription>
            Activa o desactiva los diferentes tipos de notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {preferenceOptions.map((option, index) => {
            const Icon = option.icon;
            const isEnabled = localPrefs[option.id] ?? true;
            
            return (
              <div key={option.id}>
                {index > 0 && <Separator className="mb-6" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor={option.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={option.id}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggle(option.id, checked)}
                    data-testid={`switch-${option.id}`}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="mt-6" data-testid="card-email-preferences">
        <CardHeader>
          <CardTitle className="text-lg">Notificaciones por Email</CardTitle>
          <CardDescription>
            Recibe alertas importantes en tu correo electronico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="mt-0.5">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="emailNotifications"
                  className="text-sm font-medium cursor-pointer"
                >
                  Activar notificaciones por email
                </Label>
                <p className="text-xs text-muted-foreground">
                  Proximamente: recibe alertas criticas directamente en tu correo.
                </p>
              </div>
            </div>
            <Switch
              id="emailNotifications"
              checked={localPrefs.emailNotifications ?? false}
              onCheckedChange={(checked) => handleToggle("emailNotifications", checked)}
              disabled
              data-testid="switch-emailNotifications"
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          data-testid="button-save-preferences"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Guardando..." : "Guardar preferencias"}
        </Button>
      </div>
    </div>
  );
}
