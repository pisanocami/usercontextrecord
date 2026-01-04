import { Router, type Request, type Response } from "express";
import { storage, type AuditLogInsert } from "../storage";
import { computeUCRStatus, createUCRSnapshot, getActiveUCR, validateAndGateUCR } from "./controller";
import { createAuditEntry } from "../ucr-enforcement";
import { z } from "zod";

const router = Router();

router.get("/status", async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers["x-tenant-id"] as string, 10) || 1;
    const userId = (req as any).user?.id || "anonymous-user";
    
    const ucr = await getActiveUCR(tenantId, userId);
    
    if (!ucr) {
      return res.json({
        hasContext: false,
        status: computeUCRStatus(null),
      });
    }
    
    return res.json({
      hasContext: true,
      configurationId: ucr.id,
      status: ucr.validation,
      snapshotHash: ucr.snapshotHash,
      snapshotAt: ucr.snapshotAt,
    });
  } catch (error) {
    console.error("Error fetching UCR status:", error);
    return res.status(500).json({ error: "Failed to fetch UCR status" });
  }
});

router.get("/snapshot", async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers["x-tenant-id"] as string, 10) || 1;
    const userId = (req as any).user?.id || "anonymous-user";
    
    const ucr = await getActiveUCR(tenantId, userId);
    
    if (!ucr) {
      return res.status(404).json({
        error: "NO_UCR",
        message: "No UCR context found",
      });
    }
    
    return res.json(ucr);
  } catch (error) {
    console.error("Error fetching UCR snapshot:", error);
    return res.status(500).json({ error: "Failed to fetch UCR snapshot" });
  }
});

router.get("/gate", async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers["x-tenant-id"] as string, 10) || 1;
    const userId = (req as any).user?.id || "anonymous-user";
    
    const gateResult = await validateAndGateUCR(tenantId, userId);
    
    return res.json({
      allowed: gateResult.allowed,
      reason: gateResult.reason,
      validation: gateResult.ucr?.validation || null,
    });
  } catch (error) {
    console.error("Error checking UCR gate:", error);
    return res.status(500).json({ error: "Failed to check UCR gate" });
  }
});

router.get("/sections", async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers["x-tenant-id"] as string, 10) || 1;
    const userId = (req as any).user?.id || "anonymous-user";
    
    const ucr = await getActiveUCR(tenantId, userId);
    
    if (!ucr) {
      return res.status(404).json({
        error: "NO_UCR",
        message: "No UCR context found",
      });
    }
    
    return res.json({
      sections: ucr.validation.sectionStatus,
      isComplete: ucr.validation.isValid,
      isCMOSafe: ucr.validation.isCMOSafe,
    });
  } catch (error) {
    console.error("Error fetching UCR sections:", error);
    return res.status(500).json({ error: "Failed to fetch UCR sections" });
  }
});

const humanOverrideSchema = z.object({
  action: z.enum(["override", "approve", "reject", "verify", "expire", "restore"]),
  entityType: z.enum(["competitor", "keyword", "category", "exclusion", "configuration", "governance"]),
  entityId: z.string(),
  previousValue: z.any().optional(),
  newValue: z.any().optional(),
  reason: z.string().min(1, "Reason is required for human overrides"),
  snapshotHash: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

router.post("/override", async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers["x-tenant-id"] as string, 10) || 1;
    const userId = (req as any).user?.id || "anonymous-user";
    
    const result = humanOverrideSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid override request",
        details: result.error.errors,
      });
    }

    const { action, entityType, entityId, previousValue, newValue, reason, snapshotHash, metadata } = result.data;
    
    const ucr = await getActiveUCR(tenantId, userId);
    if (!ucr) {
      return res.status(404).json({
        error: "NO_UCR",
        message: "No UCR context found to log override against",
      });
    }

    if (snapshotHash && snapshotHash !== ucr.snapshotHash) {
      return res.status(409).json({
        error: "SNAPSHOT_MISMATCH",
        message: "Context has changed since this action was initiated. Please refresh and try again.",
        currentHash: ucr.snapshotHash,
        providedHash: snapshotHash,
      });
    }

    const auditEntry: AuditLogInsert = {
      tenantId,
      userId,
      configurationId: ucr.id,
      action,
      entityType,
      entityId,
      previousValue,
      newValue,
      reason,
      metadata: {
        ...metadata,
        ucrSnapshotHash: ucr.snapshotHash,
        contextVersion: ucr.governance?.context_version || 1,
        validationStatus: ucr.validation.validationStatus,
        isCMOSafe: ucr.validation.isCMOSafe,
      },
    };

    const log = await storage.createAuditLog(auditEntry);

    return res.json({
      success: true,
      auditLogId: log.id,
      snapshotHash: ucr.snapshotHash,
      message: `Override logged: ${action} on ${entityType}`,
    });
  } catch (error) {
    console.error("Error logging human override:", error);
    return res.status(500).json({ error: "Failed to log human override" });
  }
});

router.get("/audit-log", async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers["x-tenant-id"] as string, 10) || 1;
    const configurationId = req.query.configurationId 
      ? parseInt(req.query.configurationId as string, 10) 
      : undefined;
    const limit = req.query.limit 
      ? parseInt(req.query.limit as string, 10) 
      : 50;
    
    const logs = await storage.getAuditLogs(tenantId, configurationId, limit);

    return res.json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.post("/verify", async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers["x-tenant-id"] as string, 10) || 1;
    const userId = (req as any).user?.id || "anonymous-user";
    
    const ucr = await getActiveUCR(tenantId, userId);
    if (!ucr) {
      return res.status(404).json({
        error: "NO_UCR",
        message: "No UCR context found to verify",
      });
    }

    const auditEntry: AuditLogInsert = {
      tenantId,
      userId,
      configurationId: ucr.id,
      action: "verify",
      entityType: "configuration",
      entityId: String(ucr.id),
      reason: "Human verification of UCR context",
      metadata: {
        ucrSnapshotHash: ucr.snapshotHash,
        contextVersion: ucr.governance?.context_version || 1,
        verifiedAt: new Date().toISOString(),
      },
    };

    await storage.createAuditLog(auditEntry);

    return res.json({
      success: true,
      message: "UCR context verified by human",
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error verifying UCR:", error);
    return res.status(500).json({ error: "Failed to verify UCR" });
  }
});

export default router;
