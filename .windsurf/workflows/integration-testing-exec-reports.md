---
description: Testing end-to-end para ExecReports y MasterReports
---

# Integration Testing Workflow for ExecReports & MasterReports

## Overview
Testing completo de la implementación de ExecReports y MasterReports con validación de integración end-to-end.

## Pre-requisitos
- Backend implementation completada
- Frontend implementation completada
- Database de testing configurada
- Test data preparado

## Paso 1: Setup de Testing Environment

### 1.1 Configurar database de testing

```bash
# Crear database de testing
createdb ucr_testing

# Aplicar migraciones
npm run migrate:test

# Seed data de testing
npm run seed:test
```

### 1.2 Test data fixtures

```typescript
// tests/fixtures/ucr-fixtures.ts
export const testConfiguration: InsertConfiguration = {
  name: "Test Configuration for Reports",
  brand: {
    name: "Test Brand",
    domain: "testbrand.com",
    industry: "Technology",
    business_model: "B2B",
    primary_geography: ["US"],
    revenue_band: "10M-50M",
    target_market: "US",
  },
  category_definition: {
    primary_category: "enterprise-software",
    included: ["software", "saas", "enterprise"],
    excluded: ["consumer", "gaming"],
    approved_categories: ["enterprise-software"],
    alternative_categories: [],
  },
  competitors: {
    direct: ["competitor1.com", "competitor2.com"],
    indirect: ["adjacent1.com"],
    marketplaces: [],
    competitors: [],
    approved_count: 0,
    rejected_count: 0,
    pending_review_count: 0,
  },
  demand_definition: {
    brand_keywords: {
      seed_terms: ["test brand", "test software"],
      top_n: 20,
    },
    non_brand_keywords: {
      category_terms: ["enterprise software", "business solutions"],
      problem_terms: ["productivity issues", "workflow problems"],
      top_n: 50,
    },
  },
  strategic_intent: {
    growth_priority: "market expansion",
    risk_tolerance: "medium",
    primary_goal: "increase market share",
    secondary_goals: ["improve brand awareness", "generate qualified leads"],
    avoid: ["price wars", "brand dilution"],
    goal_type: "roi",
    time_horizon: "medium",
    constraint_flags: {
      budget_constrained: false,
      resource_limited: false,
      regulatory_sensitive: false,
      brand_protection_priority: true,
    },
  },
  channel_context: {
    paid_media_active: true,
    seo_investment_level: "high",
    marketplace_dependence: "low",
  },
  negative_scope: {
    excluded_categories: ["consumer electronics"],
    excluded_keywords: ["free", "cheap"],
    excluded_use_cases: ["personal use"],
    excluded_competitors: ["walmart.com"],
    category_exclusions: [],
    keyword_exclusions: [],
    use_case_exclusions: [],
    competitor_exclusions: [],
    enforcement_rules: {
      hard_exclusion: true,
      allow_model_suggestion: false,
      require_human_override_for_expansion: true,
    },
    audit_log: [],
  },
  governance: {
    model_suggested: true,
    human_overrides: {
      competitors: [],
      keywords: [],
      categories: [],
    },
    context_confidence: {
      level: "high",
      notes: "Test configuration with complete data",
    },
    last_reviewed: new Date().toISOString().split("T")[0],
    reviewed_by: "test-user",
    context_valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    cmo_safe: true,
    context_hash: "test-hash-123",
    context_version: 1,
    validation_status: "complete",
    human_verified: true,
    human_verified_at: new Date().toISOString(),
    blocked_reasons: [],
    quality_score: {
      completeness: 100,
      competitor_confidence: 85,
      negative_strength: 90,
      evidence_coverage: 80,
      overall: 89,
      grade: "high",
      breakdown: {
        completeness_details: "All required fields filled",
        competitor_details: "Strong competitor evidence",
        negative_details: "Comprehensive exclusions",
        evidence_details: "Good evidence coverage",
      },
      calculated_at: new Date().toISOString(),
    },
    ai_behavior: {
      regeneration_count: 0,
      max_regenerations: 1,
      redacted_fields: [],
      auto_approve_threshold: 80,
      require_human_below: 50,
      requires_human_review: false,
      auto_approved: true,
      violation_detected: false,
    },
  },
};
```

## Paso 2: Backend Integration Tests

### 2.1 Module Execution con ExecReport Creation

```typescript
// tests/integration/module-execution.test.ts
describe('Module Execution with ExecReports', () => {
  let configuration: Configuration;
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
    configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
  });

  test('should create ExecReport when module executes successfully', async () => {
    const moduleId = 'keyword-gap';
    const moduleInput = {
      brandId: configuration.brand.domain,
      keywords: ["test keyword 1", "test keyword 2"],
      competitors: configuration.competitors.direct,
    };

    const response = await request(app)
      .post(`/api/modules/${moduleId}/execute`)
      .send(moduleInput)
      .expect(200);

    const { result } = response.body;
    
    // Validar response structure
    expect(result).toHaveProperty('execReportId');
    expect(result).toHaveProperty('insights');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('ucrSnapshot');

    // Validar ExecReport creation
    const execReport = await storage.getExecReportById(result.execReportId);
    expect(execReport).toBeTruthy();
    expect(execReport?.moduleId).toBe(moduleId);
    expect(execReport?.configurationId).toBe(configuration.id);
    expect(execReport?.contextVersion).toBe(configuration.governance.context_version);
    expect(execReport?.contextHash).toBe(configuration.governance.context_hash);
  });

  test('should handle module execution failure gracefully', async () => {
    const moduleId = 'non-existent-module';
    const moduleInput = {};

    const response = await request(app)
      .post(`/api/modules/${moduleId}/execute`)
      .send(moduleInput)
      .expect(404);

    expect(response.body.error).toBe('Module not found');
  });

  test('should create ExecReport with playbook results', async () => {
    const moduleId = 'keyword-gap';
    const moduleInput = {
      brandId: configuration.brand.domain,
      keywords: ["test keyword"],
    };

    const response = await request(app)
      .post(`/api/modules/${moduleId}/execute`)
      .send(moduleInput)
      .expect(200);

    const execReport = await storage.getExecReportById(response.body.result.execReportId);
    expect(execReport?.playbookResult).toBeTruthy();
    expect(execReport?.playbookResult?.insights).toBeInstanceOf(Array);
    expect(execReport?.playbookResult?.recommendations).toBeInstanceOf(Array);
  });
});
```

### 2.2 MasterReport Generation Tests

```typescript
// tests/integration/master-report.test.ts
describe('MasterReport Generation', () => {
  let configuration: Configuration;
  let execReports: ExecReport[];

  beforeAll(async () => {
    configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    
    // Ejecutar múltiples módulos para tener datos
    const modules = ['keyword-gap', 'competitor-analysis', 'demand-trends'];
    execReports = [];
    
    for (const moduleId of modules) {
      const response = await request(app)
        .post(`/api/modules/${moduleId}/execute`)
        .send({ brandId: configuration.brand.domain })
        .expect(200);
      
      const execReport = await storage.getExecReportById(response.body.result.execReportId);
      if (execReport) execReports.push(execReport);
    }
  });

  test('should generate MasterReport from ExecReports', async () => {
    const response = await request(app)
      .post(`/api/reports/master/${configuration.id}/generate`)
      .send({ contextVersion: configuration.governance.context_version })
      .expect(200);

    const { masterReport } = response.body;

    // Validar structure
    expect(masterReport).toHaveProperty('id');
    expect(masterReport).toHaveProperty('configurationId', configuration.id);
    expect(masterReport).toHaveProperty('contextVersion', configuration.governance.context_version);
    expect(masterReport).toHaveProperty('execReports');
    expect(masterReport).toHaveProperty('consolidatedInsights');
    expect(masterReport).toHaveProperty('consolidatedRecommendations');
    expect(masterReport).toHaveProperty('councilSynthesis');

    // Validar data
    expect(masterReport.execReports).toHaveLength(execReports.length);
    expect(masterReport.modulesIncluded).toContain('keyword-gap');
    expect(masterReport.modulesIncluded).toContain('competitor-analysis');
    expect(masterReport.modulesIncluded).toContain('demand-trends');
    expect(masterReport.overallConfidence).toBeGreaterThan(0);
    expect(masterReport.overallConfidence).toBeLessThanOrEqual(1);
  });

  test('should consolidate insights correctly', async () => {
    const response = await request(app)
      .post(`/api/reports/master/${configuration.id}/generate`)
      .send({ contextVersion: configuration.governance.context_version })
      .expect(200);

    const { masterReport } = response.body;
    
    // Validar que insights estén consolidados
    const totalInsights = execReports.reduce((sum, report) => 
      sum + report.output.insights.length, 0
    );
    
    expect(masterReport.consolidatedInsights.length).toBeGreaterThan(0);
    expect(masterReport.consolidatedInsights.length).toBeLessThanOrEqual(totalInsights);
    
    // Validar que cada insight tenga estructura correcta
    masterReport.consolidatedInsights.forEach(insight => {
      expect(insight).toHaveProperty('id');
      expect(insight).toHaveProperty('title');
      expect(insight).toHaveProperty('content');
      expect(insight).toHaveProperty('severity');
      expect(insight).toHaveProperty('category');
    });
  });

  test('should generate council synthesis', async () => {
    const response = await request(app)
      .post(`/api/reports/master/${configuration.id}/generate`)
      .send({ contextVersion: configuration.governance.context_version })
      .expect(200);

    const { masterReport } = response.body;
    
    expect(masterReport.councilSynthesis.keyThemes).toBeInstanceOf(Array);
    expect(masterReport.councilSynthesis.crossModulePatterns).toBeInstanceOf(Array);
    expect(masterReport.councilSynthesis.prioritizedActions).toBeInstanceOf(Array);
    
    // Validar que synthesis tenga contenido significativo
    expect(masterReport.councilSynthesis.keyThemes.length).toBeGreaterThan(0);
    expect(masterReport.councilSynthesis.prioritizedActions.length).toBeGreaterThan(0);
  });
});
```

### 2.3 API Endpoints Tests

```typescript
// tests/integration/reports-api.test.ts
describe('Reports API Endpoints', () => {
  let configuration: Configuration;
  let masterReport: MasterReport;

  beforeAll(async () => {
    configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    
    // Generar un MasterReport para testing
    const response = await request(app)
      .post(`/api/reports/master/${configuration.id}/generate`)
      .send({ contextVersion: configuration.governance.context_version })
      .expect(200);
    
    masterReport = response.body.masterReport;
  });

  test('GET /api/reports/exec/:configurationId should return exec reports', async () => {
    const response = await request(app)
      .get(`/api/reports/exec/${configuration.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('execReports');
    expect(response.body.execReports).toBeInstanceOf(Array);
  });

  test('GET /api/reports/exec/:configurationId?contextVersion should filter by version', async () => {
    const response = await request(app)
      .get(`/api/reports/exec/${configuration.id}`)
      .query({ contextVersion: configuration.governance.context_version })
      .expect(200);

    response.body.execReports.forEach((report: ExecReport) => {
      expect(report.contextVersion).toBe(configuration.governance.context_version);
    });
  });

  test('GET /api/reports/master/:configurationId should return master reports', async () => {
    const response = await request(app)
      .get(`/api/reports/master/${configuration.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('masterReports');
    expect(response.body).toHaveProperty('latest');
    expect(response.body.masterReports).toBeInstanceOf(Array);
    expect(response.body.latest).toBeTruthy();
  });

  test('should handle non-existent configuration gracefully', async () => {
    await request(app)
      .get('/api/reports/exec/99999')
      .expect(404);

    await request(app)
      .get('/api/reports/master/99999')
      .expect(404);
  });
});
```

## Paso 3: Frontend Integration Tests

### 3.1 Page Integration Tests

```typescript
// tests/integration/frontend/reports-page.test.tsx
describe('Reports Page Integration', () => {
  let configuration: Configuration;
  let mockApp: RenderResult;

  beforeAll(async () => {
    configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    
    // Mock API responses
    jest.spyOn(api, 'get').mockImplementation((url) => {
      if (url.includes(`/api/reports/exec/${configuration.id}`)) {
        return Promise.resolve({ data: { execReports: [] } });
      }
      if (url.includes(`/api/reports/master/${configuration.id}`)) {
        return Promise.resolve({ data: { masterReports: [], latest: null } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  beforeEach(() => {
    mockApp = render(
      <MemoryRouter initialEntries={[`/configurations/${configuration.id}/reports`]}>
        <Routes>
          <Route path="/configurations/:configurationId/reports" element={<ReportsPage />} />
        </Routes>
      </MemoryRouter>
    );
  });

  test('renders reports page correctly', async () => {
    expect(screen.getByText('Analysis Reports')).toBeInTheDocument();
    expect(screen.getByText('Generate Master Report')).toBeInTheDocument();
    expect(screen.getByText('Module Executions')).toBeInTheDocument();
  });

  test('loads and displays exec reports', async () => {
    const mockExecReports = [
      createMockExecReport({ moduleId: 'keyword-gap' }),
      createMockExecReport({ moduleId: 'competitor-analysis' }),
    ];

    api.get.mockResolvedValue({ data: { execReports: mockExecReports } });

    await waitFor(() => {
      expect(screen.getByText('keyword-gap')).toBeInTheDocument();
      expect(screen.getByText('competitor-analysis')).toBeInTheDocument();
    });
  });

  test('displays master report when available', async () => {
    const mockMasterReport = createMockMasterReport();
    
    api.get.mockResolvedValue({ 
      data: { 
        masterReports: [mockMasterReport], 
        latest: mockMasterReport 
      } 
    });

    await waitFor(() => {
      expect(screen.getByText('Master Report')).toBeInTheDocument();
      expect(screen.getByText('Council Synthesis')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });
});
```

### 3.2 Component Integration Tests

```typescript
// tests/integration/frontend/exec-report-card.test.tsx
describe('ExecReportCard Integration', () => {
  test('renders report data correctly', () => {
    const mockReport = createMockExecReport({
      moduleId: 'keyword-gap',
      output: {
        hasData: true,
        confidence: 0.85,
        insights: [createMockInsight()],
        recommendations: [createMockRecommendation()],
        dataSources: ['source1', 'source2'],
      } as ModuleOutput,
    });

    render(<ExecReportCard report={mockReport} onView={jest.fn()} />);

    expect(screen.getByText('keyword-gap')).toBeInTheDocument();
    expect(screen.getByText('Data Available')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // insights count
    expect(screen.getByText('1')).toBeInTheDocument(); // recommendations count
  });

  test('calls onView when button clicked', () => {
    const onView = jest.fn();
    const mockReport = createMockExecReport();

    render(<ExecReportCard report={mockReport} onView={onView} />);
    
    fireEvent.click(screen.getByText('View Details'));
    
    expect(onView).toHaveBeenCalledWith(mockReport);
  });

  test('shows no data state correctly', () => {
    const mockReport = createMockExecReport({
      output: { hasData: false } as ModuleOutput,
    });

    render(<ExecReportCard report={mockReport} onView={jest.fn()} />);

    expect(screen.getByText('No Data')).toBeInTheDocument();
  });
});
```

## Paso 4: End-to-End Tests

### 4.1 Full Flow E2E Tests

```typescript
// tests/e2e/reports-flow.test.ts
describe('Reports Flow E2E', () => {
  test('complete flow: configuration -> module execution -> master report', async () => {
    // 1. Crear configuración
    const configResponse = await request(app)
      .post('/api/configurations')
      .send(testConfiguration)
      .expect(200);

    const configuration = configResponse.body;
    
    // 2. Ejecutar múltiples módulos
    const modules = ['keyword-gap', 'competitor-analysis'];
    const execReportIds: string[] = [];

    for (const moduleId of modules) {
      const moduleResponse = await request(app)
        .post(`/api/modules/${moduleId}/execute`)
        .send({ brandId: configuration.brand.domain })
        .expect(200);

      execReportIds.push(moduleResponse.body.result.execReportId);
    }

    // 3. Verificar ExecReports creados
    for (const reportId of execReportIds) {
      const execReport = await storage.getExecReportById(reportId);
      expect(execReport).toBeTruthy();
      expect(execReport?.configurationId).toBe(configuration.id);
    }

    // 4. Generar MasterReport
    const masterResponse = await request(app)
      .post(`/api/reports/master/${configuration.id}/generate`)
      .send({ contextVersion: configuration.governance.context_version })
      .expect(200);

    const masterReport = masterResponse.body.masterReport;

    // 5. Validar MasterReport
    expect(masterReport.execReports).toHaveLength(modules.length);
    expect(masterReport.consolidatedInsights.length).toBeGreaterThan(0);
    expect(masterReport.consolidatedRecommendations.length).toBeGreaterThan(0);
    expect(masterReport.councilSynthesis.keyThemes.length).toBeGreaterThan(0);

    // 6. Verificar persistencia
    const retrievedMaster = await storage.getLatestMasterReport(configuration.id);
    expect(retrievedMaster?.id).toBe(masterReport.id);
  });

  test('handles context version changes correctly', async () => {
    // 1. Crear configuración inicial
    const configResponse = await request(app)
      .post('/api/configurations')
      .send(testConfiguration)
      .expect(200);

    const configuration = configResponse.body;
    const initialVersion = configuration.governance.context_version;

    // 2. Ejecutar módulo en versión 1
    const exec1Response = await request(app)
      .post('/api/modules/keyword-gap/execute')
      .send({ brandId: configuration.brand.domain })
      .expect(200);

    // 3. Actualizar configuración (incrementa versión)
    const updatedConfig = {
      ...configuration,
      name: "Updated Configuration",
    };

    const updateResponse = await request(app)
      .put(`/api/configurations/${configuration.id}`)
      .send({ ...updatedConfig, editReason: "Testing version change" })
      .expect(200);

    const newVersion = updateResponse.body.governance.context_version;
    expect(newVersion).toBe(initialVersion + 1);

    // 4. Ejecutar mismo módulo en nueva versión
    const exec2Response = await request(app)
      .post('/api/modules/keyword-gap/execute')
      .send({ brandId: configuration.brand.domain })
      .expect(200);

    // 5. Verificar que ExecReports tengan diferentes versiones
    const exec1 = await storage.getExecReportById(exec1Response.body.result.execReportId);
    const exec2 = await storage.getExecReportById(exec2Response.body.result.execReportId);

    expect(exec1?.contextVersion).toBe(initialVersion);
    expect(exec2?.contextVersion).toBe(newVersion);

    // 6. Generar MasterReports para cada versión
    const master1Response = await request(app)
      .post(`/api/reports/master/${configuration.id}/generate`)
      .send({ contextVersion: initialVersion })
      .expect(200);

    const master2Response = await request(app)
      .post(`/api/reports/master/${configuration.id}/generate`)
      .send({ contextVersion: newVersion })
      .expect(200);

    // 7. Verificar que MasterReports sean diferentes
    expect(master1Response.body.masterReport.contextVersion).toBe(initialVersion);
    expect(master2Response.body.masterReport.contextVersion).toBe(newVersion);
  });
});
```

### 4.2 Performance Tests

```typescript
// tests/performance/reports-performance.test.ts
describe('Reports Performance', () => {
  test('module execution should complete within acceptable time', async () => {
    const configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    
    const startTime = Date.now();
    
    await request(app)
      .post('/api/modules/keyword-gap/execute')
      .send({ brandId: configuration.brand.domain })
      .expect(200);

    const executionTime = Date.now() - startTime;
    
    // Should complete within 5 seconds
    expect(executionTime).toBeLessThan(5000);
  });

  test('master report generation should complete within acceptable time', async () => {
    const configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    
    // Execute multiple modules first
    const modules = ['keyword-gap', 'competitor-analysis', 'demand-trends'];
    for (const moduleId of modules) {
      await request(app)
        .post(`/api/modules/${moduleId}/execute`)
        .send({ brandId: configuration.brand.domain })
        .expect(200);
    }

    const startTime = Date.now();
    
    await request(app)
      .post(`/api/reports/master/${configuration.id}/generate`)
      .send({ contextVersion: configuration.governance.context_version })
      .expect(200);

    const generationTime = Date.now() - startTime;
    
    // Should complete within 10 seconds
    expect(generationTime).toBeLessThan(10000);
  });

  test('API responses should handle concurrent requests', async () => {
    const configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    
    // Simulate concurrent module executions
    const promises = Array(5).fill(null).map(() =>
      request(app)
        .post('/api/modules/keyword-gap/execute')
        .send({ brandId: configuration.brand.domain })
    );

    const results = await Promise.all(promises);
    
    // All should succeed
    results.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.result.execReportId).toBeTruthy();
    });

    // All should have unique ExecReport IDs
    const reportIds = results.map(r => r.body.result.execReportId);
    const uniqueIds = new Set(reportIds);
    expect(uniqueIds.size).toBe(reportIds.length);
  });
});
```

## Paso 5: Load Testing

### 5.1 Database Performance Tests

```typescript
// tests/load/database-performance.test.ts
describe('Database Load Performance', () => {
  test('exec reports insertion performance', async () => {
    const configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    const batchSize = 100;
    
    const startTime = Date.now();
    
    const promises = Array(batchSize).fill(null).map((_, index) =>
      storage.createExecReport({
        id: `exec-test-${index}`,
        moduleId: 'keyword-gap',
        configurationId: configuration.id,
        contextVersion: 1,
        contextHash: 'test-hash',
        executedAt: new Date(),
        output: createMockModuleOutput(),
      })
    );

    await Promise.all(promises);
    
    const insertionTime = Date.now() - startTime;
    const avgTimePerInsertion = insertionTime / batchSize;
    
    // Average insertion should be under 50ms
    expect(avgTimePerInsertion).toBeLessThan(50);
  });

  test('master report retrieval performance', async () => {
    // Create large dataset
    const configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    
    // Create many exec reports
    for (let i = 0; i < 50; i++) {
      await storage.createExecReport({
        id: `exec-load-${i}`,
        moduleId: 'keyword-gap',
        configurationId: configuration.id,
        contextVersion: 1,
        contextHash: 'test-hash',
        executedAt: new Date(),
        output: createMockModuleOutput(),
      });
    }

    // Create master report with many exec reports
    const execReports = await storage.getExecReportsByConfiguration(configuration.id);
    const masterReport = createMockMasterReport({ 
      execReports,
      consolidatedInsights: Array(100).fill(null).map((_, i) => createMockInsight()),
      consolidatedRecommendations: Array(50).fill(null).map((_, i) => createMockRecommendation()),
    });

    await storage.createMasterReport(masterReport);

    // Test retrieval performance
    const startTime = Date.now();
    
    const retrieved = await storage.getLatestMasterReport(configuration.id);
    
    const retrievalTime = Date.now() - startTime;
    
    expect(retrieved).toBeTruthy();
    expect(retrievalTime).toBeLessThan(1000); // Should retrieve under 1 second
  });
});
```

## Paso 6: Error Handling Tests

### 6.1 Edge Cases and Error Scenarios

```typescript
// tests/integration/error-handling.test.ts
describe('Error Handling', () => {
  test('should handle database connection failures', async () => {
    // Mock database failure
    jest.spyOn(storage, 'createExecReport').mockRejectedValue(new Error('Database connection failed'));
    
    const configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    
    const response = await request(app)
      .post('/api/modules/keyword-gap/execute')
      .send({ brandId: configuration.brand.domain })
      .expect(500);

    expect(response.body.error).toContain('Module execution failed');
  });

  test('should handle invalid configuration gracefully', async () => {
    const invalidConfig = {
      ...testConfiguration,
      brand: { ...testConfiguration.brand, domain: '' }, // Invalid domain
    };

    const response = await request(app)
      .post('/api/configurations')
      .send(invalidConfig)
      .expect(400);

    expect(response.body.error).toBeTruthy();
  });

  test('should handle master report generation with no exec reports', async () => {
    const configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    
    const response = await request(app)
      .post(`/api/reports/master/${configuration.id}/generate`)
      .send({ contextVersion: configuration.governance.context_version })
      .expect(400);

    expect(response.body.error).toContain('No execution reports found');
  });

  test('should handle corrupted exec report data', async () => {
    const configuration = await storage.createConfiguration(1, "test-user", testConfiguration);
    
    // Create corrupted exec report
    await storage.createExecReport({
      id: 'corrupted-report',
      moduleId: 'keyword-gap',
      configurationId: configuration.id,
      contextVersion: 1,
      contextHash: 'test-hash',
      executedAt: new Date(),
      output: null as any, // Corrupted data
    });

    const response = await request(app)
      .post(`/api/reports/master/${configuration.id}/generate`)
      .send({ contextVersion: configuration.governance.context_version })
      .expect(500);

    expect(response.body.error).toBeTruthy();
  });
});
```

## Paso 7: Test Execution Pipeline

### 7.1 GitHub Actions Workflow

```yaml
# .github/workflows/reports-testing.yml
name: Reports Integration Testing

on:
  pull_request:
    paths:
      - 'server/modules/**'
      - 'server/reports/**'
      - 'client/src/components/reports/**'
      - 'shared/schema.ts'

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          createdb ucr_testing
          npm run migrate:test
          npm run seed:test
      
      - name: Run backend tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ucr_testing
      
      - name: Run performance tests
        run: npm run test:performance
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ucr_testing

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run frontend tests
        run: npm run test:frontend:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CYPRESS_baseUrl: http://localhost:3000

  load-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run load tests
        run: npm run test:load
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ucr_testing
```

## Validación Checklist

- [ ] Unit tests para backend (>90% coverage)
- [ ] Unit tests para frontend (>80% coverage)
- [ ] Integration tests para API endpoints
- [ ] Integration tests para componentes
- [ ] End-to-end tests para flujo completo
- [ ] Performance tests (<5s module execution, <10s master report)
- [ ] Load tests (100+ concurrent requests)
- [ ] Error handling tests
- [ ] Database performance tests
- [ ] CI/CD pipeline configurado
- [ ] Test data fixtures preparados
- [ ] Environment de testing configurado

## Post-Testing

1. **Code Review**: Review de test coverage y quality
2. **Performance Benchmark**: Establecer baseline metrics
3. **Documentation**: Actualizar testing documentation
4. **Monitoring**: Configurar alerts para performance degradation
5. **Regression Tests**: Agregar tests al regression suite
