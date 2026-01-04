---
description: Validación y rollback seguro para implementación de ExecReports y MasterReports
---

# Validation & Rollback Workflow for ExecReports Implementation

## Overview
Proceso seguro de validación y rollback para implementación de ExecReports y MasterReports con feature flags, monitoring y recuperación automática.

## Pre-requisitos
- Todos los workflows anteriores completados
- Environment de staging configurado
- Monitoring tools configurados
- Backup strategy definida

## Paso 1: Feature Flags Implementation

### 1.1 Backend Feature Flags

```typescript
// server/lib/featureFlags.ts
export interface FeatureFlags {
  execReportsEnabled: boolean;
  masterReportsEnabled: boolean;
  reportsApiEnabled: boolean;
  reportsUiEnabled: boolean;
  consolidationEnabled: boolean;
  councilSynthesisEnabled: boolean;
}

export const defaultFlags: FeatureFlags = {
  execReportsEnabled: false,
  masterReportsEnabled: false,
  reportsApiEnabled: false,
  reportsUiEnabled: false,
  consolidationEnabled: false,
  councilSynthesisEnabled: false,
};

// Environment-based flags
export const getFeatureFlags = (): FeatureFlags => {
  const envFlags = process.env.REPORTS_FEATURE_FLAGS?.split(',').reduce((acc, flag) => {
    const [key, value] = flag.split('=');
    acc[key.trim()] = value?.trim() === 'true';
    return acc;
  }, {} as Partial<FeatureFlags>);

  return { ...defaultFlags, ...envFlags };
};

// Database-driven flags (para runtime changes)
export class FeatureFlagService {
  constructor(private storage: Storage) {}

  async getFlags(tenantId: number): Promise<FeatureFlags> {
    const stored = await this.storage.getFeatureFlags(tenantId);
    return { ...defaultFlags, ...stored };
  }

  async updateFlags(tenantId: number, flags: Partial<FeatureFlags>): Promise<void> {
    await this.storage.updateFeatureFlags(tenantId, flags);
  }

  async isFlagEnabled(tenantId: number, flag: keyof FeatureFlags): Promise<boolean> {
    const flags = await this.getFlags(tenantId);
    return flags[flag];
  }
}
```

### 1.2 Guard Implementation

```typescript
// server/lib/guards.ts
export class ReportsGuard {
  constructor(private featureFlags: FeatureFlagService) {}

  async requireExecReports(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.tenantId || 1;
    const enabled = await this.featureFlags.isFlagEnabled(tenantId, 'execReportsEnabled');
    
    if (!enabled) {
      return res.status(503).json({ 
        error: 'ExecReports feature not available',
        code: 'FEATURE_DISABLED'
      });
    }
    
    next();
  }

  async requireMasterReports(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.tenantId || 1;
    const enabled = await this.featureFlags.isFlagEnabled(tenantId, 'masterReportsEnabled');
    
    if (!enabled) {
      return res.status(503).json({ 
        error: 'MasterReports feature not available',
        code: 'FEATURE_DISABLED'
      });
    }
    
    next();
  }

  async requireReportsApi(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.tenantId || 1;
    const enabled = await this.featureFlags.isFlagEnabled(tenantId, 'reportsApiEnabled');
    
    if (!enabled) {
      return res.status(503).json({ 
        error: 'Reports API not available',
        code: 'FEATURE_DISABLED'
      });
    }
    
    next();
  }
}
```

### 1.3 Apply Guards to Routes

```typescript
// server/modules/routes.ts
import { reportsGuard } from '../lib/guards';

router.post('/modules/:moduleId/execute', 
  requireValidUCR(),
  reportsGuard.requireExecReports.bind(reportsGuard),
  async (req: Request, res: Response) => {
    // Existing implementation with ExecReport creation
    if (featureFlags.execReportsEnabled) {
      // Create ExecReport
      const execReport = await storage.createExecReport({...});
      finalOutput.execReportId = execReport.id;
    }
    
    res.json({ result: finalOutput });
  }
);

// server/reports/routes.ts
router.get('/reports/exec/:configurationId', 
  reportsGuard.requireReportsApi.bind(reportsGuard),
  async (req, res) => {
    // Implementation
  }
);

router.post('/reports/master/:configurationId/generate',
  reportsGuard.requireMasterReports.bind(reportsGuard),
  async (req, res) => {
    // Implementation
  }
);
```

## Paso 2: Gradual Rollout Strategy

### 2.1 Phase 1: Internal Testing (Team Only)

```typescript
// server/lib/rollout.ts
export class RolloutManager {
  constructor(
    private featureFlags: FeatureFlagService,
    private storage: Storage
  ) {}

  async enableForTeam(teamMembers: string[]): Promise<void> {
    for (const member of teamMembers) {
      await this.storage.updateUserFeatureFlags(member, {
        execReportsEnabled: true,
        masterReportsEnabled: true,
        reportsApiEnabled: true,
      });
    }
  }

  async enableForPercentage(percentage: number): Promise<void> {
    const tenants = await this.storage.getAllTenants();
    const targetCount = Math.floor(tenants.length * (percentage / 100));
    
    // Random selection
    const selected = tenants
      .sort(() => Math.random() - 0.5)
      .slice(0, targetCount);

    for (const tenant of selected) {
      await this.featureFlags.updateFlags(tenant.id, {
        execReportsEnabled: true,
        masterReportsEnabled: true,
        reportsApiEnabled: true,
      });
    }
  }

  async enableByTenantSize(maxSize: 'small' | 'medium' | 'large'): Promise<void> {
    const tenants = await this.storage.getTenantsBySize(maxSize);
    
    for (const tenant of tenants) {
      await this.featureFlags.updateFlags(tenant.id, {
        execReportsEnabled: true,
        masterReportsEnabled: true,
        reportsApiEnabled: true,
      });
    }
  }
}
```

### 2.2 Rollout Script

```typescript
// scripts/rollout-reports.ts
async function main() {
  const rolloutManager = new RolloutManager(featureFlags, storage);
  
  switch (process.env.ROLLOUT_PHASE) {
    case 'team':
      const teamMembers = ['user1@company.com', 'user2@company.com'];
      await rolloutManager.enableForTeam(teamMembers);
      console.log('Enabled for team members');
      break;
      
    case '5percent':
      await rolloutManager.enableForPercentage(5);
      console.log('Enabled for 5% of tenants');
      break;
      
    case 'small':
      await rolloutManager.enableByTenantSize('small');
      console.log('Enabled for small tenants');
      break;
      
    case 'all':
      await rolloutManager.enableForPercentage(100);
      console.log('Enabled for all tenants');
      break;
      
    default:
      console.error('Invalid rollout phase');
      process.exit(1);
  }
}

main().catch(console.error);
```

## Paso 3: Monitoring and Alerting

### 3.1 Metrics Collection

```typescript
// server/lib/metrics.ts
export class ReportsMetrics {
  private execReportCounter = new Counter({
    name: 'exec_reports_created_total',
    help: 'Total number of ExecReports created',
    labelNames: ['module_id', 'success']
  });

  private masterReportCounter = new Counter({
    name: 'master_reports_created_total',
    help: 'Total number of MasterReports created',
    labelNames: ['success']
  });

  private reportGenerationDuration = new Histogram({
    name: 'report_generation_duration_seconds',
    help: 'Time taken to generate reports',
    labelNames: ['type', 'module_id'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  });

  private consolidationDuration = new Histogram({
    name: 'consolidation_duration_seconds',
    help: 'Time taken to consolidate insights/recommendations',
    buckets: [0.1, 0.5, 1, 2, 5]
  });

  recordExecReportCreation(moduleId: string, success: boolean) {
    this.execReportCounter.inc({ module_id: moduleId, success: success ? 'true' : 'false' });
  }

  recordMasterReportCreation(success: boolean) {
    this.masterReportCounter.inc({ success: success ? 'true' : 'false' });
  }

  recordReportGeneration(type: string, moduleId: string, duration: number) {
    this.reportGenerationDuration.observe({ type, module_id: moduleId }, duration);
  }

  recordConsolidation(duration: number) {
    this.consolidationDuration.observe(duration);
  }
}
```

### 3.2 Health Checks

```typescript
// server/lib/health.ts
export class ReportsHealthCheck {
  constructor(
    private storage: Storage,
    private metrics: ReportsMetrics
  ) {}

  async checkExecReportsHealth(): Promise<HealthStatus> {
    try {
      // Test database connection
      await storage.testConnection();
      
      // Test ExecReport creation
      const testReport = await this.createTestExecReport();
      await storage.deleteExecReport(testReport.id);
      
      return {
        status: 'healthy',
        message: 'ExecReports functioning normally',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `ExecReports error: ${error.message}`,
        timestamp: new Date(),
        error: error.stack,
      };
    }
  }

  async checkMasterReportsHealth(): Promise<HealthStatus> {
    try {
      // Test consolidation logic
      const testExecReports = await this.createTestExecReports(3);
      const consolidation = this.testConsolidation(testExecReports);
      
      // Cleanup
      for (const report of testExecReports) {
        await storage.deleteExecReport(report.id);
      }
      
      return {
        status: 'healthy',
        message: 'MasterReports functioning normally',
        timestamp: new Date(),
        metrics: {
          consolidationTime: consolidation.duration,
          insightsConsolidated: consolidation.insightsCount,
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `MasterReports error: ${error.message}`,
        timestamp: new Date(),
        error: error.stack,
      };
    }
  }

  private async createTestExecReport(): Promise<ExecReport> {
    return await storage.createExecReport({
      id: `health-test-${Date.now()}`,
      moduleId: 'keyword-gap',
      configurationId: 1,
      contextVersion: 1,
      contextHash: 'test-hash',
      executedAt: new Date(),
      output: createMockModuleOutput(),
    });
  }

  private testConsolidation(execReports: ExecReport[]) {
    const startTime = Date.now();
    const insights = this.consolidateInsights(execReports);
    const duration = Date.now() - startTime;
    
    return {
      duration,
      insightsCount: insights.length,
    };
  }
}
```

### 3.3 Alerting Rules

```yaml
# monitoring/alerts.yml
groups:
  - name: reports
    rules:
      - alert: ExecReportCreationFailure
        expr: rate(exec_reports_created_total{success="false"}[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High ExecReport creation failure rate"
          description: "ExecReport creation failure rate is {{ $value }} per second"

      - alert: MasterReportGenerationFailure
        expr: rate(master_reports_created_total{success="false"}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "MasterReport generation failures detected"
          description: "MasterReport generation failure rate is {{ $value }} per second"

      - alert: ReportGenerationSlow
        expr: histogram_quantile(0.95, rate(report_generation_duration_seconds_bucket[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Report generation is slow"
          description: "95th percentile of report generation time is {{ $value }} seconds"

      - alert: ConsolidationSlow
        expr: histogram_quantile(0.95, rate(consolidation_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Insight consolidation is slow"
          description: "95th percentile of consolidation time is {{ $value }} seconds"
```

## Paso 4: Automated Rollback

### 4.1 Rollback Triggers

```typescript
// server/lib/rollback.ts
export interface RollbackTrigger {
  type: 'error_rate' | 'performance' | 'manual' | 'health_check';
  threshold?: number;
  window?: number; // minutes
}

export class RollbackManager {
  constructor(
    private featureFlags: FeatureFlagService,
    private metrics: ReportsMetrics,
    private healthCheck: ReportsHealthCheck
  ) {}

  async checkRollbackConditions(): Promise<RollbackDecision[]> {
    const decisions: RollbackDecision[] = [];

    // Check error rates
    const errorRate = await this.getErrorRate();
    if (errorRate > 0.1) { // 10% error rate
      decisions.push({
        trigger: { type: 'error_rate', threshold: 0.1 },
        action: 'disable_exec_reports',
        reason: `Error rate ${errorRate} exceeds threshold`,
        severity: 'high',
      });
    }

    // Check performance
    const performance = await this.getPerformanceMetrics();
    if (performance.p95Duration > 15000) { // 15 seconds
      decisions.push({
        trigger: { type: 'performance', threshold: 15000 },
        action: 'disable_master_reports',
        reason: `P95 duration ${performance.p95Duration}ms exceeds threshold`,
        severity: 'medium',
      });
    }

    // Check health
    const health = await this.healthCheck.checkExecReportsHealth();
    if (health.status === 'unhealthy') {
      decisions.push({
        trigger: { type: 'health_check' },
        action: 'disable_all_reports',
        reason: `Health check failed: ${health.message}`,
        severity: 'critical',
      });
    }

    return decisions;
  }

  async executeRollback(decision: RollbackDecision): Promise<void> {
    console.warn(`Executing rollback: ${decision.action} - ${decision.reason}`);

    switch (decision.action) {
      case 'disable_exec_reports':
        await this.featureFlags.updateFlags(1, { execReportsEnabled: false });
        await this.notifyTeam('ExecReports disabled due to issues', decision.severity);
        break;

      case 'disable_master_reports':
        await this.featureFlags.updateFlags(1, { masterReportsEnabled: false });
        await this.notifyTeam('MasterReports disabled due to performance issues', decision.severity);
        break;

      case 'disable_all_reports':
        await this.featureFlags.updateFlags(1, {
          execReportsEnabled: false,
          masterReportsEnabled: false,
          reportsApiEnabled: false,
        });
        await this.notifyTeam('All reports features disabled due to critical issues', 'critical');
        break;
    }

    // Log rollback
    await this.logRollback(decision);
  }

  private async getErrorRate(): Promise<number> {
    // Calculate error rate from metrics
    const totalExecReports = this.metrics.getExecReportCounter('true');
    const failedExecReports = this.metrics.getExecReportCounter('false');
    
    return totalExecReports > 0 ? failedExecReports / totalExecReports : 0;
  }

  private async getPerformanceMetrics(): Promise<{ p95Duration: number }> {
    // Get P95 duration from histogram
    return {
      p95Duration: this.metrics.getReportGenerationP95(),
    };
  }

  private async notifyTeam(message: string, severity: string): Promise<void> {
    // Send Slack/Teams notification
    await this.sendNotification({
      channel: '#alerts',
      message,
      severity,
      timestamp: new Date(),
    });
  }

  private async logRollback(decision: RollbackDecision): Promise<void> {
    // Log to audit system
    await this.storage.createAuditLog({
      action: 'rollback',
      entityType: 'feature_flag',
      entityId: 'reports',
      previousValue: { enabled: true },
      newValue: { enabled: false },
      reason: decision.reason,
      metadata: decision,
    });
  }
}
```

### 4.2 Automated Monitoring Loop

```typescript
// server/lib/monitor.ts
export class AutomatedMonitor {
  private monitoringInterval: NodeJS.Timeout;

  constructor(
    private rollbackManager: RollbackManager,
    private healthCheck: ReportsHealthCheck
  ) {}

  start(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        // Check rollback conditions
        const decisions = await this.rollbackManager.checkRollbackConditions();
        
        for (const decision of decisions) {
          await this.rollbackManager.executeRollback(decision);
        }

        // Health checks
        await this.performHealthChecks();

      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 60000); // Check every minute
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  private async performHealthChecks(): Promise<void> {
    const execReportsHealth = await this.healthCheck.checkExecReportsHealth();
    const masterReportsHealth = await this.healthCheck.checkMasterReportsHealth();

    if (execReportsHealth.status === 'unhealthy') {
      await this.sendHealthAlert('ExecReports', execReportsHealth);
    }

    if (masterReportsHealth.status === 'unhealthy') {
      await this.sendHealthAlert('MasterReports', masterReportsHealth);
    }
  }

  private async sendHealthAlert(component: string, health: HealthStatus): Promise<void> {
    await this.sendNotification({
      channel: '#health',
      message: `${component} health check failed: ${health.message}`,
      severity: 'warning',
      timestamp: new Date(),
      details: health,
    });
  }
}
```

## Paso 5: Manual Rollback Procedures

### 5.1 Emergency Rollback Script

```typescript
// scripts/emergency-rollback.ts
async function emergencyRollback(feature: string) {
  console.log(`🚨 Emergency rollback: ${feature}`);
  
  try {
    switch (feature) {
      case 'exec-reports':
        await featureFlags.updateFlags(1, { execReportsEnabled: false });
        console.log('✅ ExecReports disabled');
        break;
        
      case 'master-reports':
        await featureFlags.updateFlags(1, { masterReportsEnabled: false });
        console.log('✅ MasterReports disabled');
        break;
        
      case 'reports-api':
        await featureFlags.updateFlags(1, { reportsApiEnabled: false });
        console.log('✅ Reports API disabled');
        break;
        
      case 'all':
        await featureFlags.updateFlags(1, {
          execReportsEnabled: false,
          masterReportsEnabled: false,
          reportsApiEnabled: false,
          reportsUiEnabled: false,
        });
        console.log('✅ All reports features disabled');
        break;
        
      default:
        console.error('❌ Unknown feature:', feature);
        process.exit(1);
    }

    // Notify team
    await sendEmergencyNotification(`Emergency rollback: ${feature}`);
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

const feature = process.argv[2];
if (!feature) {
  console.error('Usage: npm run emergency-rollback <feature>');
  process.exit(1);
}

emergencyRollback(feature);
```

### 5.2 Database Rollback

```sql
-- scripts/rollback.sql
-- Disable feature flags in database
UPDATE feature_flags 
SET exec_reports_enabled = false,
    master_reports_enabled = false,
    reports_api_enabled = false,
    reports_ui_enabled = false
WHERE tenant_id = 1;

-- Create audit entry
INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, reason)
VALUES (1, 'system', 'rollback', 'feature_flag', 'reports', 'Emergency rollback');

-- Optional: Drop new tables (only if data can be lost)
-- DROP TABLE IF EXISTS exec_reports CASCADE;
-- DROP TABLE IF EXISTS master_reports CASCADE;
```

## Paso 6: Validation Checklist

### 6.1 Pre-Deployment Validation

```typescript
// scripts/pre-deployment-check.ts
export class PreDeploymentValidator {
  async validate(): Promise<ValidationResult> {
    const checks = [
      await this.checkDatabaseMigration(),
      await this.checkFeatureFlags(),
      await this.checkApiEndpoints(),
      await this.checkPerformance(),
      await this.checkSecurity(),
      await this.checkDocumentation(),
    ];

    const failed = checks.filter(check => !check.passed);
    
    return {
      passed: failed.length === 0,
      checks,
      failed,
      summary: `${checks.length - failed.length}/${checks.length} checks passed`,
    };
  }

  private async checkDatabaseMigration(): Promise<CheckResult> {
    try {
      // Test migration on staging database
      await this.runMigrationTest();
      return { name: 'Database Migration', passed: true };
    } catch (error) {
      return { name: 'Database Migration', passed: false, error: error.message };
    }
  }

  private async checkFeatureFlags(): Promise<CheckResult> {
    try {
      const flags = await this.featureFlags.getFlags(1);
      
      // All flags should be disabled initially
      const enabledFlags = Object.entries(flags)
        .filter(([_, enabled]) => enabled)
        .map(([name]) => name);

      if (enabledFlags.length > 0) {
        return {
          name: 'Feature Flags',
          passed: false,
          error: `Flags enabled: ${enabledFlags.join(', ')}`
        };
      }

      return { name: 'Feature Flags', passed: true };
    } catch (error) {
      return { name: 'Feature Flags', passed: false, error: error.message };
    }
  }

  private async checkApiEndpoints(): Promise<CheckResult> {
    try {
      // Test endpoints with feature flags disabled
      const response = await request(app)
        .post('/api/modules/keyword-gap/execute')
        .send({ brandId: 'test.com' });

      if (response.status === 503 && response.body.code === 'FEATURE_DISABLED') {
        return { name: 'API Endpoints', passed: true };
      }

      return {
        name: 'API Endpoints',
        passed: false,
        error: 'Expected feature disabled response'
      };
    } catch (error) {
      return { name: 'API Endpoints', passed: false, error: error.message };
    }
  }

  private async checkPerformance(): Promise<CheckResult> {
    try {
      // Baseline performance test
      const startTime = Date.now();
      
      await this.baselineModuleExecution();
      
      const duration = Date.now() - startTime;
      
      if (duration > 3000) { // 3 seconds
        return {
          name: 'Performance',
          passed: false,
          error: `Baseline execution took ${duration}ms`
        };
      }

      return { name: 'Performance', passed: true };
    } catch (error) {
      return { name: 'Performance', passed: false, error: error.message };
    }
  }

  private async checkSecurity(): Promise<CheckResult> {
    try {
      // Security checks
      const securityChecks = [
        this.checkSqlInjection(),
        this.checkXssProtection(),
        this.checkRateLimiting(),
      ];

      const results = await Promise.all(securityChecks);
      const failed = results.filter(result => !result.passed);

      return {
        name: 'Security',
        passed: failed.length === 0,
        error: failed.length > 0 ? failed.map(f => f.error).join(', ') : undefined
      };
    } catch (error) {
      return { name: 'Security', passed: false, error: error.message };
    }
  }

  private async checkDocumentation(): Promise<CheckResult> {
    try {
      // Check API documentation is updated
      const docsUpdated = await this.checkApiDocsUpdated();
      
      return {
        name: 'Documentation',
        passed: docsUpdated,
        error: docsUpdated ? undefined : 'API documentation not updated'
      };
    } catch (error) {
      return { name: 'Documentation', passed: false, error: error.message };
    }
  }
}
```

## Paso 7: Deployment Pipeline

### 7.1 Safe Deployment Strategy

```yaml
# .github/workflows/safe-deployment.yml
name: Safe Reports Deployment

on:
  push:
    branches: [main]
    paths:
      - 'server/modules/**'
      - 'server/reports/**'
      - 'shared/schema.ts'

jobs:
  pre-deployment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run pre-deployment validation
        run: npm run validate:pre-deployment
      
      - name: Run security scans
        run: npm run audit:security

  deploy-staging:
    needs: pre-deployment
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to staging
        run: |
          # Deploy with all features disabled
          REPORTS_FEATURE_FLAGS="execReportsEnabled=false,masterReportsEnabled=false,reportsApiEnabled=false"
          npm run deploy:staging
      
      - name: Run smoke tests
        run: npm run test:smoke
      
      - name: Enable for team
        run: |
          npm run rollout:team
          npm run test:team-validation

  canary-deployment:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    if: success()
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy canary (5%)
        run: |
          REPORTS_FEATURE_FLAGS="execReportsEnabled=false,masterReportsEnabled=false,reportsApiEnabled=false"
          npm run deploy:production
          npm run rollout:5percent
      
      - name: Monitor canary (15 minutes)
        run: |
          npm run monitor:canary &
          sleep 900
          npm run check:canary-health
      
      - name: Rollback if issues detected
        if: failure()
        run: npm run emergency:rollback all

  full-rollout:
    needs: canary-deployment
    runs-on: ubuntu-latest
    environment: production
    if: success()
    steps:
      - name: Gradual rollout
        run: |
          npm run rollout:25percent
          sleep 1800
          npm run rollout:50percent
          sleep 1800
          npm run rollout:100percent
      
      - name: Final validation
        run: npm run validate:post-deployment
```

## Validación Checklist

- [ ] Feature flags implementados y testados
- [ ] Guards aplicados a todos los endpoints
- [ ] Monitoring y metrics configurados
- [ ] Health checks implementados
- [ ] Automated rollback configurado
- [ ] Emergency rollback procedures documentados
- [ ] Pre-deployment validation script
- [ ] Staging environment configurado
- [ ] Canary deployment pipeline
- [ ] Alerting rules configuradas
- [ ] Documentation actualizada
- [ ] Team training completado

## Post-Deployment Monitoring

1. **First 24 Hours**: Monitor intensivo con alertas sensibles
2. **First Week**: Validación de performance y user feedback
3. **First Month**: Optimización basada en metrics reales
4. **Ongoing**: Monitoring continuo con thresholds ajustados

## Emergency Procedures

1. **Critical Issues**: Ejecutar `npm run emergency:rollback all`
2. **Performance Issues**: Deshabilitar MasterReports temporalmente
3. **Data Issues**: Parar creación de nuevos ExecReports
4. **UI Issues**: Deshabilitar reports UI pero mantener API

## Communication Plan

1. **Internal Team**: Slack #engineering para updates
2. **Product Team**: Daily status durante rollout
3. **Customer Support**: Información sobre feature availability
4. **Documentation**: Actualizar status pages y user guides
