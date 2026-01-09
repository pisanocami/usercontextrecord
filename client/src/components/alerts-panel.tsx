import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, X, AlertTriangle, Info, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";
import type { Alert, AlertSeverity } from "@shared/schema";

const severityConfig: Record<AlertSeverity, { icon: typeof Info; className: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  info: {
    icon: Info,
    className: "text-blue-500",
    badgeVariant: "default",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-amber-500",
    badgeVariant: "secondary",
  },
  critical: {
    icon: AlertCircle,
    className: "text-red-500",
    badgeVariant: "destructive",
  },
};

export function AlertsPanel() {
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/alerts/count"],
    refetchInterval: 30000,
  });

  const { data: alerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts", { limit: 20 }],
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/alerts/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/alerts/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/count"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/count"] });
    },
  });

  const unreadCount = countData?.count ?? 0;

  const handleAlertClick = (alert: Alert) => {
    if (!alert.read) {
      markAsReadMutation.mutate(alert.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-alerts-toggle"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-xs"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 md:w-96"
        data-testid="panel-alerts"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="font-medium text-sm">Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas como leidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Cargando...
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <span>No hay notificaciones</span>
            </div>
          ) : (
            <div className="py-1">
              {alerts.map((alert) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "px-3 py-2.5 cursor-pointer hover-elevate transition-colors",
                      !alert.read && "bg-accent/50"
                    )}
                    onClick={() => handleAlertClick(alert)}
                    data-testid={`alert-item-${alert.id}`}
                  >
                    <div className="flex gap-3">
                      <div className={cn("mt-0.5 flex-shrink-0", config.className)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            !alert.read && "font-semibold"
                          )}>
                            {alert.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 flex-shrink-0 opacity-50 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissMutation.mutate(alert.id);
                            }}
                            data-testid={`button-dismiss-alert-${alert.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.created_at), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                          {alert.configurationId && (
                            <Link
                              href={`/configurations/${alert.configurationId}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                data-testid={`link-config-${alert.configurationId}`}
                              >
                                Ver contexto
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="px-3 py-2">
          <Link href="/alert-preferences">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs"
              data-testid="link-alert-preferences"
            >
              Configurar preferencias de alertas
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
