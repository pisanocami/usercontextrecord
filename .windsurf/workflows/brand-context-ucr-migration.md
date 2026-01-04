---
description: Migración de configurations a Brand → Context/UCR → ExecReports → MasterReport
---

# Brand-Context-UCR Migration Plan

## Overview
Refactorizar la estructura actual donde todo está mezclado en `configurations` a una arquitectura limpia:
**Brand (1) → Context/UCR (1) → Exec Reports (N) → Master Report (1 dinámico)**

## Arquitectura Actual vs. Target

### ❌ Actual (Problemático)
```
configurations (todo mezclado)
├── brand data
├── category_definition  
├── competitors
├── demand_definition
├── strategic_intent
├── channel_context
├── negative_scope
└── governance
```

### ✅ Target (Limpio)
```
brands (1)
├── id, name, domain, industry, etc.
└── contexts (1 por brand)
    ├── category_definition
    ├── competitors
    ├── demand_definition
    ├── strategic_intent
    ├── channel_context
    ├── negative_scope
    └── governance
        └── exec_reports (N)
            ├── module_id, context_id
            ├── output, insights, recommendations
            └── master_report (1 dinámico)
```

## Paso 1: Nuevo Schema de Base de Datos

### 1.1 Tabla Brands (Principal)

```sql
-- brands tabla principal
CREATE TABLE brands (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  user_id VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  domain VARCHAR UNIQUE NOT NULL,
  industry VARCHAR,
  business_model VARCHAR CHECK (business_model IN ('B2B', 'DTC', 'Marketplace', 'Hybrid')),
  primary_geography TEXT[], -- Array de países/markets
  revenue_band VARCHAR,
  target_market VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Metadata
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  metadata JSONB DEFAULT '{}'
);

-- Índices
CREATE INDEX idx_brands_tenant ON brands(tenant_id);
CREATE INDEX idx_brands_domain ON brands(domain);
CREATE INDEX idx_brands_status ON brands(status);
```

### 1.2 Tabla Contexts (UCR)

```sql
-- contexts tabla para las 8 secciones UCR
CREATE TABLE contexts (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL,
  user_id VARCHAR NOT NULL,
  
  -- Las 8 secciones UCR
  category_definition JSONB NOT NULL,
  competitors JSONB NOT NULL,
  demand_definition JSONB NOT NULL,
  strategic_intent JSONB NOT NULL,
  channel_context JSONB NOT NULL,
  negative_scope JSONB NOT NULL,
  governance JSONB NOT NULL,
  
  -- Versioning y validación
  version INTEGER DEFAULT 1,
  context_hash VARCHAR NOT NULL,
  validation_status VARCHAR DEFAULT 'incomplete' CHECK (validation_status IN ('complete', 'incomplete', 'blocked', 'needs_review')),
  human_verified BOOLEAN DEFAULT FALSE,
  human_verified_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(brand_id, version)
);

-- Índices
CREATE INDEX idx_contexts_brand ON contexts(brand_id);
CREATE INDEX idx_contexts_tenant ON contexts(tenant_id);
CREATE INDEX idx_contexts_hash ON contexts(context_hash);
CREATE INDEX idx_contexts_status ON contexts(validation_status);
```

### 1.3 Tabla ExecReports

```sql
-- exec_reports para resultados de módulos
CREATE TABLE exec_reports (
  id VARCHAR PRIMARY KEY, -- UUID
  context_id INTEGER NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  module_id VARCHAR NOT NULL,
  tenant_id INTEGER NOT NULL,
  
  -- Execution metadata
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_duration INTEGER, -- ms
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Module output
  output JSONB NOT NULL, -- ModuleOutput completo
  playbook_result JSONB, -- Resultados del playbook processing
  
  -- Metrics
  confidence DECIMAL(3,2), -- 0.00 a 1.00
  data_sources TEXT[],
  data_timestamp TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_exec_reports_context ON exec_reports(context_id);
CREATE INDEX idx_exec_reports_module ON exec_reports(module_id);
CREATE INDEX idx_exec_reports_tenant ON exec_reports(tenant_id);
CREATE INDEX idx_exec_reports_executed_at ON exec_reports(executed_at);
CREATE INDEX idx_exec_reports_success ON exec_reports(success);
```

### 1.4 Tabla MasterReports (Opcional - cache)

```sql
-- master_reports como cache (se puede generar dinámicamente)
CREATE TABLE master_reports (
  id VARCHAR PRIMARY KEY,
  context_id INTEGER NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  tenant_id INTEGER NOT NULL,
  
  -- Report metadata
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generation_duration INTEGER, -- ms
  context_version INTEGER NOT NULL,
  context_hash VARCHAR NOT NULL,
  
  -- Aggregated data
  exec_report_ids VARCHAR[] NOT NULL, -- IDs de exec_reports incluidos
  consolidated_insights JSONB NOT NULL,
  consolidated_recommendations JSONB NOT NULL,
  council_synthesis JSONB NOT NULL,
  
  -- Metrics
  modules_included TEXT[],
  overall_confidence DECIMAL(3,2),
  data_freshness VARCHAR CHECK (data_freshness IN ('fresh', 'moderate', 'stale')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP -- TTL para cache
);

-- Índices
CREATE INDEX idx_master_reports_context ON master_reports(context_id);
CREATE INDEX idx_master_reports_tenant ON master_reports(tenant_id);
CREATE INDEX idx_master_reports_expires_at ON master_reports(expires_at);
```

## Paso 2: TypeScript Types

### 2.1 Brand Types

```typescript
// shared/models/brand.ts
export interface Brand {
  id: number;
  tenantId: number;
  userId: string;
  name: string;
  domain: string;
  industry?: string;
  businessModel: 'B2B' | 'DTC' | 'Marketplace' | 'Hybrid';
  primaryGeography: string[];
  revenueBand?: string;
  targetMarket?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'archived';
  metadata: Record<string, any>;
}

export interface InsertBrand {
  tenantId: number;
  userId: string;
  name: string;
  domain: string;
  industry?: string;
  businessModel?: 'B2B' | 'DTC' | 'Marketplace' | 'Hybrid';
  primaryGeography?: string[];
  revenueBand?: string;
  targetMarket?: string;
  status?: 'active' | 'inactive' | 'archived';
  metadata?: Record<string, any>;
}
```

### 2.2 Context Types

```typescript
// shared/models/context.ts
export interface Context {
  id: number;
  brandId: number;
  tenantId: number;
  userId: string;
  
  // Las 8 secciones UCR (mover desde Configuration)
  categoryDefinition: CategoryDefinition;
  competitors: Competitors;
  demandDefinition: DemandDefinition;
  strategicIntent: StrategicIntent;
  channelContext: ChannelContext;
  negativeScope: NegativeScope;
  governance: Governance;
  
  // Versioning
  version: number;
  contextHash: string;
  validationStatus: 'complete' | 'incomplete' | 'blocked' | 'needs_review';
  humanVerified: boolean;
  humanVerifiedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertContext {
  brandId: number;
  tenantId: number;
  userId: string;
  categoryDefinition: CategoryDefinition;
  competitors: Competitors;
  demandDefinition: DemandDefinition;
  strategicIntent: StrategicIntent;
  channelContext: ChannelContext;
  negativeScope: NegativeScope;
  governance: Governance;
  version?: number;
  contextHash: string;
  validationStatus?: 'complete' | 'incomplete' | 'blocked' | 'needs_review';
  humanVerified?: boolean;
}
```

### 2.3 ExecReport Types

```typescript
// shared/models/exec-report.ts
export interface ExecReport {
  id: string;
  contextId: number;
  moduleId: string;
  tenantId: number;
  
  // Execution metadata
  executedAt: Date;
  executionDuration?: number;
  success: boolean;
  errorMessage?: string;
  
  // Module output
  output: ModuleOutput;
  playbookResult?: {
    insights: Insight[];
    recommendations: Recommendation[];
    deprioritized: string[];
    councilPrompt: string;
  };
  
  // Metrics
  confidence?: number;
  dataSources: string[];
  dataTimestamp?: Date;
  
  createdAt: Date;
}

export interface InsertExecReport {
  id: string;
  contextId: number;
  moduleId: string;
  tenantId: number;
  executedAt?: Date;
  executionDuration?: number;
  success?: boolean;
  errorMessage?: string;
  output: ModuleOutput;
  playbookResult?: {
    insights: Insight[];
    recommendations: Recommendation[];
    deprioritized: string[];
    councilPrompt: string;
  };
  confidence?: number;
  dataSources?: string[];
  dataTimestamp?: Date;
}
```

## Paso 3: Migration Strategy

### 3.1 Phase 1: Create New Tables (Safe)

```sql
-- 01-create-new-tables.sql
-- Crear nuevas tablas sin afectar las existentes

-- Brands table
CREATE TABLE brands (
  -- ... (definición completa arriba)
);

-- Contexts table  
CREATE TABLE contexts (
  -- ... (definición completa arriba)
);

-- ExecReports table
CREATE TABLE exec_reports (
  -- ... (definición completa arriba)
);

-- MasterReports table (opcional)
CREATE TABLE master_reports (
  -- ... (definición completa arriba)
);
```

### 3.2 Phase 2: Migrate Data

```typescript
// scripts/migrate-configurations.ts
export class ConfigurationMigrator {
  constructor(private storage: Storage) {}

  async migrateAllConfigurations(): Promise<MigrationResult> {
    const configurations = await this.storage.getAllConfigurations();
    const results: MigrationResult = {
      total: configurations.length,
      migrated: 0,
      failed: 0,
      errors: [],
    };

    for (const config of configurations) {
      try {
        await this.migrateConfiguration(config);
        results.migrated++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          configurationId: config.id,
          error: error.message,
        });
      }
    }

    return results;
  }

  private async migrateConfiguration(config: Configuration): Promise<void> {
    // 1. Create Brand
    const brand = await this.storage.createBrand({
      tenantId: config.tenantId || 1,
      userId: config.userId,
      name: config.brand.name,
      domain: config.brand.domain,
      industry: config.brand.industry,
      businessModel: config.brand.business_model,
      primaryGeography: config.brand.primary_geography,
      revenueBand: config.brand.revenue_band,
      targetMarket: config.brand.target_market,
    });

    // 2. Create Context
    const context = await this.storage.createContext({
      brandId: brand.id,
      tenantId: config.tenantId || 1,
      userId: config.userId,
      categoryDefinition: config.category_definition,
      competitors: config.competitors,
      demandDefinition: config.demand_definition,
      strategicIntent: config.strategic_intent,
      channelContext: config.channel_context,
      negativeScope: config.negative_scope,
      governance: config.governance,
      version: config.governance.context_version || 1,
      contextHash: config.governance.context_hash || '',
      validationStatus: config.governance.validation_status || 'incomplete',
      humanVerified: config.governance.human_verified || false,
    });

    // 3. Create mapping for reference
    await this.storage.createConfigurationMapping({
      oldConfigurationId: config.id,
      newBrandId: brand.id,
      newContextId: context.id,
      migratedAt: new Date(),
    });

    console.log(`Migrated configuration ${config.id} → brand ${brand.id}, context ${context.id}`);
  }
}
```

### 3.3 Phase 3: Update Application Code

```typescript
// server/storage.ts - New methods
export class Storage {
  // Brand methods
  async createBrand(brand: InsertBrand): Promise<Brand>
  async getBrandById(id: number): Promise<Brand | null>
  async getBrandByDomain(domain: string): Promise<Brand | null>
  async getBrandsByTenant(tenantId: number): Promise<Brand[]>
  async updateBrand(id: number, brand: Partial<InsertBrand>): Promise<Brand>
  async deleteBrand(id: number): Promise<void>

  // Context methods
  async createContext(context: InsertContext): Promise<Context>
  async getContextById(id: number): Promise<Context | null>
  async getContextByBrand(brandId: number, version?: number): Promise<Context | null>
  async updateContext(id: number, context: Partial<InsertContext>): Promise<Context>
  async createNewContextVersion(brandId: number, updates: Partial<InsertContext>): Promise<Context>

  // ExecReport methods
  async createExecReport(report: InsertExecReport): Promise<ExecReport>
  async getExecReportsByContext(contextId: number): Promise<ExecReport[]>
  async getExecReportById(id: string): Promise<ExecReport | null>
  async getExecReportsByModule(moduleId: string): Promise<ExecReport[]>

  // MasterReport methods (cache)
  async createMasterReport(report: InsertMasterReport): Promise<MasterReport>
  async getMasterReportByContext(contextId: number): Promise<MasterReport | null>
  async invalidateMasterReport(contextId: number): Promise<void>
}
```

### 3.4 Phase 4: Update API Routes

```typescript
// server/routes.ts - New structure
// Brands
app.post("/api/brands", async (req, res) => {
  const brand = await storage.createBrand(req.body);
  res.json(brand);
});

app.get("/api/brands/:brandId", async (req, res) => {
  const brand = await storage.getBrandById(parseInt(req.params.brandId));
  if (!brand) return res.status(404).json({ error: "Brand not found" });
  res.json(brand);
});

// Contexts (UCR)
app.post("/api/brands/:brandId/contexts", async (req, res) => {
  const context = await storage.createContext({
    ...req.body,
    brandId: parseInt(req.params.brandId),
  });
  res.json(context);
});

app.get("/api/brands/:brandId/contexts/:contextVersion?", async (req, res) => {
  const context = await storage.getContextByBrand(
    parseInt(req.params.brandId),
    req.params.contextVersion ? parseInt(req.params.contextVersion) : undefined
  );
  if (!context) return res.status(404).json({ error: "Context not found" });
  res.json(context);
});

// ExecReports
app.post("/api/contexts/:contextId/modules/:moduleId/execute", async (req, res) => {
  const contextId = parseInt(req.params.contextId);
  const moduleId = req.params.moduleId;
  
  // Get context for UCR validation
  const context = await storage.getContextById(contextId);
  if (!context) return res.status(404).json({ error: "Context not found" });
  
  // Execute module
  const output = await moduleExecutor.execute(moduleId, {
    ...req.body,
    ucrContext: {
      domain: context.brand?.domain, // Need to join with brand
      competitors: context.competitors.direct,
      negativeScope: context.negativeScope,
      // ... other context fields
    },
  });
  
  // Create ExecReport
  const execReport = await storage.createExecReport({
    id: `exec-${moduleId}-${Date.now()}`,
    contextId,
    moduleId,
    tenantId: context.tenantId,
    output,
    executedAt: new Date(),
    success: true,
    confidence: output.confidence,
    dataSources: output.dataSources,
    dataTimestamp: output.dataTimestamp,
  });
  
  res.json({ result: output, execReportId: execReport.id });
});

// MasterReports (dinámicos)
app.get("/api/contexts/:contextId/master-report", async (req, res) => {
  const contextId = parseInt(req.params.contextId);
  
  // Try cache first
  let masterReport = await storage.getMasterReportByContext(contextId);
  
  if (!masterReport || isExpired(masterReport)) {
    // Generate dynamically
    const execReports = await storage.getExecReportsByContext(contextId);
    const context = await storage.getContextById(contextId);
    
    masterReport = await generateMasterReport(context, execReports);
    
    // Cache for future requests
    await storage.createMasterReport(masterReport);
  }
  
  res.json(masterReport);
});
```

## Paso 4: Frontend Updates

### 4.1 Update Types and Hooks

```typescript
// client/src/hooks/useBrand.ts
export const useBrand = (brandId: number) => {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await api.get(`/api/brands/${brandId}`);
        setBrand(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [brandId]);

  return { brand, loading, error };
};

// client/src/hooks/useContext.ts
export const useContext = (brandId: number, version?: number) => {
  const [context, setContext] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const url = version 
          ? `/api/brands/${brandId}/contexts/${version}`
          : `/api/brands/${brandId}/contexts`;
        const response = await api.get(url);
        setContext(response.data);
      } catch (err) {
        console.error('Failed to fetch context:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [brandId, version]);

  return { context, loading };
};
```

### 4.2 Update Navigation

```typescript
// client/src/App.tsx - New routes
<Routes>
  <Route path="/brands" element={<BrandsList />} />
  <Route path="/brands/:brandId" element={<BrandDetail />} />
  <Route path="/brands/:brandId/contexts" element={<ContextList />} />
  <Route path="/brands/:brandId/contexts/:contextVersion" element={<ContextDetail />} />
  <Route path="/contexts/:contextId/reports" element={<ReportsPage />} />
  <Route path="/contexts/:contextId/master-report" element={<MasterReportView />} />
</Routes>
```

## Paso 5: Data Migration Script

### 5.1 Complete Migration Script

```typescript
// scripts/complete-migration.ts
async function completeMigration() {
  console.log('🚀 Starting Brand-Context-UCR migration...');
  
  try {
    // Phase 1: Create new tables
    console.log('📋 Creating new tables...');
    await createNewTables();
    
    // Phase 2: Migrate existing configurations
    console.log('📦 Migrating existing configurations...');
    const migrator = new ConfigurationMigrator(storage);
    const results = await migrator.migrateAllConfigurations();
    
    console.log(`✅ Migration complete:`);
    console.log(`   Total: ${results.total}`);
    console.log(`   Migrated: ${results.migrated}`);
    console.log(`   Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('❌ Errors:');
      results.errors.forEach(err => {
        console.log(`   Config ${err.configurationId}: ${err.error}`);
      });
    }
    
    // Phase 3: Create backup of old tables
    console.log('💾 Creating backup of old tables...');
    await backupOldTables();
    
    // Phase 4: Validate migration
    console.log('🔍 Validating migration...');
    const validation = await validateMigration();
    
    if (validation.valid) {
      console.log('✅ Migration validated successfully');
      
      // Phase 5: Update application (manual step)
      console.log('📝 Next steps:');
      console.log('   1. Update application code to use new tables');
      console.log('   2. Test thoroughly in staging');
      console.log('   3. Deploy to production');
      console.log('   4. Monitor for issues');
      console.log('   5. Drop old tables when confident');
      
    } else {
      console.log('❌ Migration validation failed:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

async function validateMigration(): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // Check brands count matches configurations count
  const configCount = await storage.getConfigurationsCount();
  const brandCount = await storage.getBrandsCount();
  
  if (configCount !== brandCount) {
    errors.push(`Brand count mismatch: expected ${configCount}, got ${brandCount}`);
  }
  
  // Check each brand has a context
  const brands = await storage.getAllBrands();
  for (const brand of brands) {
    const context = await storage.getContextByBrand(brand.id);
    if (!context) {
      errors.push(`Brand ${brand.id} has no context`);
    }
  }
  
  // Check data integrity
  for (const brand of brands) {
    const context = await storage.getContextByBrand(brand.id);
    if (context) {
      // Validate context hash
      const expectedHash = generateContextHash(context);
      if (context.contextHash !== expectedHash) {
        errors.push(`Context ${context.id} has invalid hash`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

completeMigration();
```

## Paso 6: Rollback Plan

### 6.1 Emergency Rollback

```sql
-- rollback.sql
-- Restaurar tabla configurations original si algo sale mal

DROP TABLE IF EXISTS brands_backup;
DROP TABLE IF EXISTS contexts_backup;
DROP TABLE IF EXISTS exec_reports_backup;

-- Renombrar tablas nuevas a backup
ALTER TABLE brands RENAME TO brands_backup;
ALTER TABLE contexts RENAME TO contexts_backup;
ALTER TABLE exec_reports RENAME TO exec_reports_backup;

-- Restaurar configurations backup si existe
-- ALTER TABLE configurations_backup RENAME TO configurations;
```

### 6.2 Gradual Cutover

```typescript
// Feature flag para usar nuevas tablas
const useNewBrandContext = process.env.USE_NEW_BRAND_CONTEXT === 'true';

// Storage wrapper que soporta ambas estructuras
export class HybridStorage {
  async getBrandOrConfiguration(id: number) {
    if (useNewBrandContext) {
      return await this.getBrandById(id);
    } else {
      const config = await this.getConfigurationById(id);
      return config ? this.convertConfigToBrand(config) : null;
    }
  }
  
  async getContextOrConfiguration(brandId: number, version?: number) {
    if (useNewBrandContext) {
      return await this.getContextByBrand(brandId, version);
    } else {
      const config = await this.getConfigurationById(brandId);
      return config ? this.convertConfigToContext(config) : null;
    }
  }
}
```

## Validación Checklist

- [ ] New tables created successfully
- [ ] Data migration script tested
- [ ] TypeScript types updated
- [ ] Storage methods implemented
- [ ] API routes updated
- [ ] Frontend components updated
- [ ] Migration validation passes
- [ ] Rollback plan tested
- [ ] Documentation updated
- [ ] Team trained on new structure

## Post-Migration Benefits

1. **Clean Separation**: Brands, Contexts, y Reports en tablas separadas
2. **Better Performance**: Queries más específicas y eficientes
3. **Scalability**: Fácil agregar nuevos tipos de reports
4. **Data Integrity**: Foreign keys y constraints apropiados
5. **Flexibility**: Context versioning y brand management independiente
6. **Maintainability**: Código más limpio y desacoplado

## Timeline Estimado

- **Week 1**: Crear nuevas tablas y migration script
- **Week 2**: Migrar datos y validar
- **Week 3**: Actualizar backend (storage, routes)
- **Week 4**: Actualizar frontend y testing
- **Week 5**: Deploy gradual y monitoreo
- **Week 6**: Cleanup tablas viejas

Esta migración transformará la arquitectura actual mezclada en una estructura limpia, escalable y mantenible que soportará el crecimiento futuro del sistema.
