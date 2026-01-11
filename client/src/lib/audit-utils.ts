// client/src/lib/audit-utils.ts
import type { ExclusionAuditEntry } from "@shared/schema";

export function createAuditEntry(
  action: "applied" | "overridden" | "expired" | "removed",
  exclusionValue: string,
  exclusionType: "category" | "keyword" | "use_case" | "competitor",
  context?: string,
  userId?: string
): ExclusionAuditEntry {
  return {
    timestamp: new Date().toISOString(),
    action,
    exclusion_value: exclusionValue,
    exclusion_type: exclusionType,
    context: context || "",
    user_id: userId || "",
  };
}
