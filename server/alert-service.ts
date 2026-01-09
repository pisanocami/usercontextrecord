import { storage } from "./storage";
import type { AlertType, AlertSeverity, InsertAlert, InsertConfiguration, Governance } from "@shared/schema";

interface GenerateAlertOptions {
  userId: string;
  type: AlertType;
  title: string;
  message: string;
  configurationId?: number | null;
  severity?: AlertSeverity;
  metadata?: Record<string, any>;
}

export async function generateAlert(options: GenerateAlertOptions) {
  const prefs = await storage.getAlertPreferences(options.userId);
  
  const typeToPreference: Record<AlertType, keyof typeof prefs> = {
    quality_drop: "qualityDropEnabled",
    competitor_change: "competitorChangeEnabled",
    guardrail_violation: "guardrailViolationEnabled",
    expiration_warning: "expirationWarningEnabled",
    analysis_complete: "analysisCompleteEnabled",
  };

  const prefKey = typeToPreference[options.type];
  if (prefKey && !prefs[prefKey]) {
    console.log(`[Alert Service] Alert type ${options.type} is disabled for user ${options.userId}`);
    return null;
  }

  const alert: InsertAlert = {
    userId: options.userId,
    configurationId: options.configurationId ?? null,
    type: options.type,
    severity: options.severity || "info",
    title: options.title,
    message: options.message,
    metadata: options.metadata || {},
  };

  const created = await storage.createAlert(alert);
  console.log(`[Alert Service] Created alert ${created.id}: ${options.type} - ${options.title}`);
  return created;
}

export async function checkQualityDropAlert(
  userId: string,
  configurationId: number,
  configurationName: string,
  oldScore: number,
  newScore: number
) {
  if (oldScore <= 0) return null;
  
  const dropPercentage = ((oldScore - newScore) / oldScore) * 100;
  
  if (dropPercentage > 10) {
    const severity: AlertSeverity = dropPercentage > 25 ? "critical" : "warning";
    
    return generateAlert({
      userId,
      type: "quality_drop",
      title: `Descenso de calidad en ${configurationName}`,
      message: `El puntaje de calidad ha bajado de ${oldScore.toFixed(0)} a ${newScore.toFixed(0)} (${dropPercentage.toFixed(1)}% de descenso).`,
      configurationId,
      severity,
      metadata: {
        oldScore,
        newScore,
        dropPercentage,
        configurationName,
      },
    });
  }
  
  return null;
}

export async function checkExpirationWarning(
  userId: string,
  config: { id: number; name: string; governance: Governance }
) {
  const contextValidUntil = config.governance?.context_valid_until;
  if (!contextValidUntil) return null;
  
  const expirationDate = new Date(contextValidUntil);
  const now = new Date();
  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiration <= 7 && daysUntilExpiration > 0) {
    const severity: AlertSeverity = daysUntilExpiration <= 3 ? "critical" : "warning";
    
    return generateAlert({
      userId,
      type: "expiration_warning",
      title: `Contexto proximo a expirar: ${config.name}`,
      message: `El contexto "${config.name}" expira en ${daysUntilExpiration} ${daysUntilExpiration === 1 ? "dia" : "dias"}. Considera actualizar la fecha de validez.`,
      configurationId: config.id,
      severity,
      metadata: {
        expirationDate: contextValidUntil,
        daysUntilExpiration,
        configurationName: config.name,
      },
    });
  }
  
  return null;
}

export async function notifyAnalysisComplete(
  userId: string,
  configurationId: number,
  configurationName: string,
  moduleId: string,
  moduleName: string
) {
  return generateAlert({
    userId,
    type: "analysis_complete",
    title: `Analisis completado: ${moduleName}`,
    message: `El modulo "${moduleName}" ha finalizado su ejecucion para el contexto "${configurationName}".`,
    configurationId,
    severity: "info",
    metadata: {
      moduleId,
      moduleName,
      configurationName,
    },
  });
}

export async function notifyGuardrailViolation(
  userId: string,
  configurationId: number,
  configurationName: string,
  violationType: string,
  details: string
) {
  return generateAlert({
    userId,
    type: "guardrail_violation",
    title: `Violacion de guardrail: ${configurationName}`,
    message: details,
    configurationId,
    severity: "warning",
    metadata: {
      violationType,
      configurationName,
    },
  });
}

export async function notifyCompetitorChange(
  userId: string,
  configurationId: number,
  configurationName: string,
  changeType: "added" | "removed" | "status_changed",
  competitorName: string
) {
  const changeMessages = {
    added: `Se ha agregado un nuevo competidor: ${competitorName}`,
    removed: `Se ha eliminado el competidor: ${competitorName}`,
    status_changed: `El estado del competidor ${competitorName} ha cambiado`,
  };

  return generateAlert({
    userId,
    type: "competitor_change",
    title: `Cambio en competidores: ${configurationName}`,
    message: changeMessages[changeType],
    configurationId,
    severity: "info",
    metadata: {
      changeType,
      competitorName,
      configurationName,
    },
  });
}

export const alertService = {
  generateAlert,
  checkQualityDropAlert,
  checkExpirationWarning,
  notifyAnalysisComplete,
  notifyGuardrailViolation,
  notifyCompetitorChange,
};
