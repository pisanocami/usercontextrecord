---
description: Implementación segura de ExecReports y MasterReports en backend
---

# Backend ExecReports Implementation Workflow

## Overview
Implementar ExecReports y MasterReports de manera segura con migración gradual y compatibilidad backward.

## Pre-requisitos
- Backup actual de la base de datos
- Tests existentes pasando
- Branch feature separado

## Paso 1: Extender Schema con Nuevos Tipos

### 1.1 Agregar tipos en `shared/schema.ts`

```typescript
// ExecReport - resultado de ejecución de un módulo específico
export const execReportSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  configurationId: z.number(),
  contextVersion: z.number(),
  contextHash: z.string(),
  executedAt: z.date(),
  output: z.any(), // ModuleOutput
  playbookResult: z.object({
    insights: z.array(z.any()),
    recommendations: z.array(z.any()),
    deprioritized: z.array(z.string()),
    councilPrompt: z.string(),
  }).optional(),
});

// MasterReport - consolidación de contexto + todos los exec reports
export const masterReportSchema = z.object({
  id: z.string(),
  configurationId: z.number(),
  contextVersion: z.number(),
  contextHash: z.string(),
  generatedAt: z.date(),
  ucrSnapshot: z.any(), // Partial UCR snapshot
  execReports: z.array(execReportSchema),
  consolidatedInsights: z.array(z.any()),
  consolidatedRecommendations: z.array(z.any()),
  councilSynthesis: z.object({
    keyThemes: z.array(z.string()),
    crossModulePatterns: z.array(z.string()),
    prioritizedActions: z.array(z.string()),
  }),
  modulesIncluded: z.array(z.string()),
  overallConfidence: z.number(),
  dataFreshness: z.enum(['fresh', 'moderate', 'stale']),
});

// Tablas de base de datos
export const execReports = pgTable("exec_reports", {
  id: varchar("id").primaryKey(),
  configurationId: integer("configuration_id").notNull(),
  moduleId: varchar("module_id").notNull(),
  contextVersion: integer("context_version").notNull(),
  contextHash: varchar("context_hash").notNull(),
  executedAt: timestamp("executed_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  output: jsonb("output").notNull(),
  playbookResult: jsonb("playbook_result"),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const masterReports = pgTable("master_reports", {
  id: varchar("id").primaryKey(),
  configurationId: integer("configuration_id").notNull(),
  contextVersion: integer("context_version").notNull(),
  contextHash: varchar("context_hash").notNull(),
  generatedAt: timestamp("generated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  ucrSnapshot: jsonb("ucr_snapshot").notNull(),
  execReports: jsonb("exec_reports").notNull(),
  consolidatedInsights: jsonb("consolidated_insights").notNull(),
  consolidatedRecommendations: jsonb("consolidated_recommendations").notNull(),
  councilSynthesis: jsonb("council_synthesis").notNull(),
  modulesIncluded: jsonb("modules_included").notNull(),
  overallConfidence: integer("overall_confidence").notNull(),
  dataFreshness: varchar("data_freshness").notNull(),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
```

### 1.2 Agregar tipos en `server/modules/types.ts`

```typescript
export interface ExecReport {
  id: string;
  moduleId: string;
  configurationId: number;
  contextVersion: number;
  contextHash: string;
  executedAt: Date;
  output: ModuleOutput;
  playbookResult?: {
    insights: Insight[];
    recommendations: Recommendation[];
    deprioritized: string[];
    councilPrompt: string;
  };
}

export interface MasterReport {
  id: string;
  configurationId: number;
  contextVersion: number;
  contextHash: string;
  generatedAt: Date;
  ucrSnapshot: {
    brand: Brand;
    strategicIntent: StrategicIntent;
    negativeScope: NegativeScope;
  };
  execReports: ExecReport[];
  consolidatedInsights: Insight[];
  consolidatedRecommendations: Recommendation[];
  councilSynthesis: {
    keyThemes: string[];
    crossModulePatterns: string[];
    prioritizedActions: string[];
  };
  modulesIncluded: string[];
  overallConfidence: number;
  dataFreshness: 'fresh' | 'moderate' | 'stale';
}
```

## Paso 2: Extender Storage Layer

### 2.1 Agregar métodos en `server/storage.ts`

```typescript
// ExecReports
async createExecReport(report: InsertExecReport): Promise<ExecReport>
async getExecReportsByConfiguration(configurationId: number, contextVersion?: number): Promise<ExecReport[]>
async getExecReportById(id: string): Promise<ExecReport | null>

// MasterReports  
async createMasterReport(report: InsertMasterReport): Promise<MasterReport>
async getMasterReportsByConfiguration(configurationId: number): Promise<MasterReport[]>
async getLatestMasterReport(configurationId: number): Promise<MasterReport | null>
```

### 2.2 Implementar migración de base de datos

```sql
-- Crear tablas nuevas
CREATE TABLE exec_reports (
  id VARCHAR PRIMARY KEY,
  configuration_id INTEGER NOT NULL,
  module_id VARCHAR NOT NULL,
  context_version INTEGER NOT NULL,
  context_hash VARCHAR NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  output JSONB NOT NULL,
  playbook_result JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE master_reports (
  id VARCHAR PRIMARY KEY,
  configuration_id INTEGER NOT NULL,
  context_version INTEGER NOT NULL,
  context_hash VARCHAR NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ucr_snapshot JSONB NOT NULL,
  exec_reports JSONB NOT NULL,
  consolidated_insights JSONB NOT NULL,
  consolidated_recommendations JSONB NOT NULL,
  council_synthesis JSONB NOT NULL,
  modules_included JSONB NOT NULL,
  overall_confidence INTEGER NOT NULL,
  data_freshness VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_exec_reports_config ON exec_reports(configuration_id);
CREATE INDEX idx_exec_reports_context ON exec_reports(configuration_id, context_version);
CREATE INDEX idx_master_reports_config ON master_reports(configuration_id);
```

## Paso 3: Modificar Module Execution

### 3.1 Actualizar `server/modules/routes.ts`

```typescript
// POST /api/modules/:moduleId/execute
router.post('/modules/:moduleId/execute', requireValidUCR(), async (req: Request, res: Response) => {
  // ... existing validation ...
  
  const output = await executor.execute(enrichedInput);
  const playbookResult = await playbookExecutor.execute(moduleId, enrichedInput, output);
  
  // NUEVO: Crear ExecReport
  const execReport = await storage.createExecReport({
    id: `exec-${moduleId}-${Date.now()}`,
    moduleId,
    configurationId: ucr.configurationId,
    contextVersion: ucr.contextVersion,
    contextHash: ucr.contextHash,
    executedAt: new Date(),
    output,
    playbookResult
  });
  
  const finalOutput = {
    ...output,
    insights: playbookResult.insights,
    recommendations: playbookResult.recommendations,
    deprioritizedActions: playbookResult.deprioritized,
    ucrSnapshot: {
      hash: ucr.snapshotHash,
      validatedAt: ucr.snapshotAt,
      isCMOSafe: ucr.validation.isCMOSafe,
    },
    execReportId: execReport.id, // NUEVO
  };

  res.json({ result: finalOutput });
});
```

### 3.2 Crear `server/reports/executor.ts`

```typescript
export class ReportExecutor {
  async generateMasterReport(configurationId: number, contextVersion: number): Promise<MasterReport> {
    // 1. Obtener UCR snapshot
    const config = await storage.getConfigurationById(configurationId, 1, "anonymous-user");
    if (!config) throw new Error("Configuration not found");
    
    // 2. Obtener todos los ExecReports para este contexto
    const execReports = await storage.getExecReportsByConfiguration(configurationId, contextVersion);
    
    // 3. Consolidar insights y recommendations
    const consolidatedInsights = this.consolidateInsights(execReports);
    const consolidatedRecommendations = this.consolidateRecommendations(execReports);
    
    // 4. Generar council synthesis
    const councilSynthesis = await this.generateCouncilSynthesis(execReports, config);
    
    // 5. Calcular métricas agregadas
    const overallConfidence = this.calculateOverallConfidence(execReports);
    const dataFreshness = this.calculateDataFreshness(execReports);
    
    // 6. Crear MasterReport
    const masterReport: InsertMasterReport = {
      id: `master-${configurationId}-${contextVersion}-${Date.now()}`,
      configurationId,
      contextVersion,
      contextHash: config.governance.context_hash,
      generatedAt: new Date(),
      ucrSnapshot: {
        brand: config.brand,
        strategicIntent: config.strategic_intent,
        negativeScope: config.negative_scope,
      },
      execReports,
      consolidatedInsights,
      consolidatedRecommendations,
      councilSynthesis,
      modulesIncluded: execReports.map(r => r.moduleId),
      overallConfidence,
      dataFreshness,
    };
    
    return await storage.createMasterReport(masterReport);
  }
  
  private consolidateInsights(execReports: ExecReport[]): Insight[] {
    // Lógica para consolidar insights cross-module
    // - Eliminar duplicados
    // - Priorizar por severidad
    // - Agrupar por categorías
  }
  
  private consolidateRecommendations(execReports: ExecReport[]): Recommendation[] {
    // Lógica para consolidar recommendations cross-module
    // - Detectar conflictos
    // - Priorizar por impacto/effort
    // - Agrupar por temas
  }
  
  private async generateCouncilSynthesis(execReports: ExecReport[], config: Configuration) {
    // Lógica para generar synthesis usando council reasoning
  }
}
```

## Paso 4: Nuevas Rutas de Reports

### 4.1 Crear `server/reports/routes.ts`

```typescript
router.get('/reports/exec/:configurationId', async (req, res) => {
  const { configurationId } = req.params;
  const { contextVersion } = req.query;
  
  const execReports = await storage.getExecReportsByConfiguration(
    parseInt(configurationId), 
    contextVersion ? parseInt(contextVersion) : undefined
  );
  
  res.json({ execReports });
});

router.get('/reports/master/:configurationId', async (req, res) => {
  const { configurationId } = req.params;
  
  const masterReports = await storage.getMasterReportsByConfiguration(parseInt(configurationId));
  const latest = await storage.getLatestMasterReport(parseInt(configurationId));
  
  res.json({ masterReports, latest });
});

router.post('/reports/master/:configurationId/generate', async (req, res) => {
  const { configurationId } = req.params;
  const { contextVersion } = req.body;
  
  const masterReport = await reportExecutor.generateMasterReport(
    parseInt(configurationId),
    contextVersion
  );
  
  res.json({ masterReport });
});
```

## Paso 5: Testing y Validación

### 5.1 Tests unitarios

```typescript
// tests/reports.test.ts
describe('ExecReports', () => {
  test('should create exec report on module execution', async () => {
    // Test module execution creates exec report
  });
  
  test('should retrieve exec reports by configuration', async () => {
    // Test retrieval logic
  });
});

describe('MasterReports', () => {
  test('should generate master report from exec reports', async () => {
    // Test master report generation
  });
  
  test('should consolidate insights correctly', async () => {
    // Test insight consolidation logic
  });
});
```

### 5.2 Tests de integración

```typescript
// tests/integration/reports-flow.test.ts
describe('Reports Flow Integration', () => {
  test('should execute modules and generate master report', async () => {
    // 1. Create configuration
    // 2. Execute multiple modules
    // 3. Generate master report
    // 4. Validate consolidation
  });
});
```

## Paso 6: Deploy y Rollback

### 6.1 Deploy Strategy

1. **Database Migration**: Ejecutar migración en modo forward-only
2. **Backend Deploy**: Deploy con feature flag para nueva funcionalidad
3. **Gradual Enable**: Habilitar por tenant/configuration
4. **Monitor**: Observar performance y errores

### 6.2 Rollback Plan

1. **Feature Flag**: Deshabilitar nueva funcionalidad
2. **Database**: Migración backward compatible (no eliminar tablas)
3. **Cache**: Invalidar caches relacionados
4. **Monitor**: Verificar estabilidad post-rollback

## Validación Checklist

- [ ] Schema types definidos correctamente
- [ ] Database migration probada en staging
- [ ] Storage layer implementada con tests
- [ ] Module execution crea ExecReports
- [ ] MasterReport generation funciona
- [ ] API endpoints responden correctamente
- [ ] Tests unitarios pasan (>90% coverage)
- [ ] Tests de integración pasan
- [ ] Performance impact < 100ms en module execution
- [ ] Rollback plan documentado y probado

## Post-Implementation

1. **Monitor metrics**: ExecReport creation rate, MasterReport generation time
2. **User feedback**: Recopilar feedback sobre nueva funcionalidad
3. **Documentation**: Actualizar API docs y user guides
4. **Cleanup**: Remover feature flags después de estabilización
