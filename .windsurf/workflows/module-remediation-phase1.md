---
description: Phase 1 - Security Fixes for Module System
---

# Phase 1: Security Fixes for Module System

This workflow implements critical security fixes for the module execution system.

## Prerequisites
- Server is running locally
- Access to `server/module-runner.ts` and `server/routes.ts`

## Steps

### Step 1: Add userId validation to runModule
Edit `server/module-runner.ts` to require userId:

```typescript
// At the start of runModule function, after the function signature
if (!userId) {
    return wrapModuleOutput(
        null,
        createExecutionContext(moduleId, { id: "0", name: "Unknown" } as any, []),
        "Authentication required: userId is missing"
    );
}
```

### Step 2: Create audit logging function
Add to `server/module-runner.ts` before the runModule function:

```typescript
interface ModuleExecutionLog {
    moduleId: string;
    configId: number;
    userId: string;
    startedAt: string;
    completedAt: string;
    success: boolean;
    executionTimeMs: number;
    error?: string;
}

function logModuleExecution(log: ModuleExecutionLog): void {
    const logLine = `[MODULE_AUDIT] ${log.moduleId} | user:${log.userId} | config:${log.configId} | ${log.success ? 'SUCCESS' : 'FAILED'} | ${log.executionTimeMs}ms`;
    console.log(logLine);
}
```

### Step 3: Add audit logging to runModule
Wrap the execution in timing and logging:

```typescript
// At the start of runModule, after userId validation
const startTime = Date.now();

// At the end, before returning (wrap existing return)
const executionLog: ModuleExecutionLog = {
    moduleId,
    configId,
    userId: userId!,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    success: result.success,
    executionTimeMs: Date.now() - startTime,
    error: result.error || undefined
};
logModuleExecution(executionLog);
```

### Step 4: Verify the fix
// turbo
Run the server and test:
```bash
npm run dev
```

Then test with curl:
```bash
curl -X POST http://localhost:5000/api/modules/seo.keyword_gap_visibility.v1/run \
  -H "Content-Type: application/json" \
  -d '{"configId": 1, "inputs": {}}'
```

## Validation Checklist
- [ ] userId validation added
- [ ] Audit logging function created
- [ ] Audit logs appear in console
- [ ] Unauthorized requests return proper error

## Rollback
If issues occur, revert changes to `server/module-runner.ts` using git:
```bash
git checkout server/module-runner.ts
```
