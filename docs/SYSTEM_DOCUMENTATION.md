# User Context Record (UCR) - Documentación Completa del Sistema

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Modelo de Datos](#3-modelo-de-datos)
4. [Backend - Servidor Express](#4-backend---servidor-express)
5. [Frontend - Cliente React](#5-frontend---cliente-react)
6. [Sistema FON (Foundational Operational Network)](#6-sistema-fon)
7. [APIs y Endpoints](#7-apis-y-endpoints)
8. [Guía de Instalación](#8-guía-de-instalación)
9. [Configuración](#9-configuración)
10. [Flujos de Trabajo](#10-flujos-de-trabajo)

---

## 1. Visión General

### 1.1 ¿Qué es UCR?

**User Context Record (UCR)** es una plataforma B2B SaaS de configuración de inteligencia de marketing con seguridad de nivel empresarial. Permite a usuarios autenticados configurar contexto de marca, conjuntos competitivos, definiciones de demanda y guardrails estratégicos con sugerencias potenciadas por IA y almacenamiento persistente.

### 1.2 Características Principales

| Característica | Descripción |
|----------------|-------------|
| **Autenticación Segura** | Sign in con Google, GitHub, Apple o email vía Replit Auth |
| **Sugerencias IA** | Generación de valores de configuración usando OpenAI |
| **Almacenamiento Persistente** | Base de datos PostgreSQL para persistencia segura |
| **8 Secciones de Configuración** | Brand, Category, Competitors, Demand, Strategic, Channel, Negative Scope, Governance |
| **Auditabilidad Completa** | Gobernanza CMO-safe con tracking de overrides humanos |
| **Visualización One Pager** | Vista ejecutiva de UCR con secciones A-H |
| **Keyword Gap Analysis** | Análisis de gap de keywords con filtrado basado en UCR |
| **Arquitectura FON** | Module executors, playbooks y councils estratégicos |

### 1.3 Stack Tecnológico

```
Frontend:  React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
Backend:   Express.js + TypeScript + Drizzle ORM
Database:  PostgreSQL (Neon)
AI:        OpenAI GPT-4o
Auth:      Replit Auth (OIDC)
```

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTE (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Providers  │  │    Pages     │  │  Components  │              │
│  │ ─────────────│  │ ─────────────│  │ ─────────────│              │
│  │ TenantProv.  │  │ Dashboard    │  │ AppSidebar   │              │
│  │ BrandProv.   │  │ Configuration│  │ BrandSelector│              │
│  │ UCRProvider  │  │ Modules      │  │ ContextGuard │              │
│  │ QueryClient  │  │ MasterReport │  │ UI Components│              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────────────┐
│                          SERVIDOR (Express)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Routes     │  │   Modules    │  │   Councils   │              │
│  │ ─────────────│  │ ─────────────│  │ ─────────────│              │
│  │ /api/config  │  │ BaseExecutor │  │ 7 Councils   │              │
│  │ /api/brands  │  │ 7 Executors  │  │ Guardrails   │              │
│  │ /api/ucr     │  │ Playbooks    │  │ Reasoning    │              │
│  │ /api/fon     │  │ Time Decay   │  │ Synthesis    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Storage    │  │   Auth       │  │   External   │              │
│  │ ─────────────│  │ ─────────────│  │ ─────────────│              │
│  │ DatabaseStor.│  │ Replit Auth  │  │ OpenAI       │              │
│  │ MemStorage   │  │ Sessions     │  │ DataForSEO   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Drizzle ORM
┌─────────────────────────────────────────────────────────────────────┐
│                         BASE DE DATOS (PostgreSQL)                   │
├─────────────────────────────────────────────────────────────────────┤
│  users │ sessions │ brands │ contexts │ exec_reports │ audit_logs  │
│  configurations │ configuration_versions │ bulk_jobs │ tenants     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Estructura de Directorios

```
usercontextrecord/
├── client/                      # Frontend React
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   │   ├── sections/        # Secciones de configuración (8)
│   │   │   ├── reports/         # Componentes de reportes
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── hooks/               # Custom hooks
│   │   ├── pages/               # Páginas de la aplicación
│   │   ├── lib/                 # Utilidades
│   │   └── App.tsx              # Componente raíz
│   └── index.html
├── server/                      # Backend Express
│   ├── modules/                 # Sistema de módulos FON
│   │   ├── executors/           # 7 ejecutores de módulos
│   │   ├── base-executor.ts     # Clase base abstracta
│   │   ├── registry.ts          # Registro de módulos
│   │   ├── time-decay.ts        # Decaimiento temporal
│   │   └── types.ts             # Tipos TypeScript
│   ├── councils/                # Sistema de councils
│   │   ├── definitions.ts       # 7 definiciones de councils
│   │   ├── guardrails.ts        # Enforcement de guardrails
│   │   ├── reasoning.ts         # Razonamiento con OpenAI
│   │   └── types.ts
│   ├── playbooks/               # Sistema de playbooks
│   │   ├── loader.ts            # Cargador de playbooks
│   │   ├── executor.ts          # Ejecutor de playbooks
│   │   └── types.ts
│   ├── ucr/                     # Controlador UCR
│   │   ├── routes.ts            # Rutas de UCR
│   │   └── controller.ts        # Lógica de UCR
│   ├── replit_integrations/     # Integraciones Replit
│   │   └── auth/                # Autenticación
│   ├── routes.ts                # Rutas principales
│   ├── storage.ts               # Capa de almacenamiento
│   ├── db.ts                    # Conexión a base de datos
│   ├── dataforseo.ts            # Cliente DataForSEO
│   └── keyword-gap-lite.ts      # Módulo Keyword Gap
├── shared/                      # Código compartido
│   ├── schema.ts                # Esquemas Drizzle + Zod
│   └── models/                  # Modelos de datos
├── docs/                        # Documentación
├── .env                         # Variables de entorno
├── package.json                 # Dependencias
├── tsconfig.json                # Configuración TypeScript
├── vite.config.ts               # Configuración Vite
└── drizzle.config.ts            # Configuración Drizzle
```

---

## 3. Modelo de Datos

### 3.1 Modelo Normalizado

El sistema usa un modelo de datos normalizado:

```
Brand (1) → Context/UCR (1) → Exec Reports (N) → Master Report (agregación)
```

### 3.2 Tablas Principales

#### 3.2.1 `brands` - Entidad de Marca

```typescript
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  domain: varchar("domain", { length: 255 }).notNull(),
  name: text("name").notNull(),
  industry: text("industry"),
  businessModel: varchar("business_model", { length: 50 }),
  primaryGeography: jsonb("primary_geography").default([]),
  revenueBand: text("revenue_band"),
  targetMarket: text("target_market"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
```

#### 3.2.2 `contexts` - UCR (User Context Record)

```typescript
export const contexts = pgTable("contexts", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").notNull().references(() => brands.id),
  tenantId: integer("tenant_id"),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull().default("Default Context"),
  // 8 Secciones Canónicas (A-H)
  brand: jsonb("brand").notNull().default({}),                    // A
  category_definition: jsonb("category_definition").default({}),  // B
  competitors: jsonb("competitors").notNull().default({}),        // C
  demand_definition: jsonb("demand_definition").default({}),      // D
  strategic_intent: jsonb("strategic_intent").default({}),        // E
  channel_context: jsonb("channel_context").default({}),          // F
  negative_scope: jsonb("negative_scope").default({}),            // G
  governance: jsonb("governance").default({}),                    // H
  // Metadata UCR
  snapshotHash: varchar("snapshot_hash", { length: 64 }),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
```

#### 3.2.3 `exec_reports` - Resultados de Ejecución de Módulos

```typescript
export const execReports = pgTable("exec_reports", {
  id: serial("id").primaryKey(),
  contextId: integer("context_id").notNull().references(() => contexts.id),
  brandId: integer("brand_id").notNull().references(() => brands.id),
  tenantId: integer("tenant_id"),
  userId: varchar("user_id").notNull().references(() => users.id),
  moduleId: varchar("module_id", { length: 100 }).notNull(),
  moduleName: text("module_name").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  confidence: real("confidence").default(0),
  hasData: boolean("has_data").default(false),
  insights: jsonb("insights").default([]),
  recommendations: jsonb("recommendations").default([]),
  rawOutput: jsonb("raw_output").default({}),
  councilPerspectives: jsonb("council_perspectives"),
  synthesis: jsonb("synthesis"),
  guardrailStatus: jsonb("guardrail_status"),
  ucrSnapshotHash: varchar("ucr_snapshot_hash", { length: 64 }),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
```

#### 3.2.4 `audit_logs` - Registro de Auditoría

```typescript
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id"),
  userId: varchar("user_id").notNull().references(() => users.id),
  configurationId: integer("configuration_id"),
  action: varchar("action").notNull(), // create, update, override, approve, reject, expire
  entityType: varchar("entity_type").notNull(), // configuration, competitor, keyword, etc.
  entityId: varchar("entity_id").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
```

### 3.3 Las 8 Secciones del UCR

| Sección | ID | Descripción | Campos Clave |
|---------|-----|-------------|--------------|
| **A** | `brand` | Identidad de marca | name, domain, industry, business_model, geography |
| **B** | `category_definition` | Definición de categoría | primary_category, included, excluded, alternatives |
| **C** | `competitors` | Conjunto competitivo | direct, indirect, marketplaces, tiers, evidence |
| **D** | `demand_definition` | Definición de demanda | brand_keywords, non_brand_keywords, seed_terms |
| **E** | `strategic_intent` | Intención estratégica | growth_priority, risk_tolerance, goals, constraints |
| **F** | `channel_context` | Contexto de canales | paid_media, seo_investment, marketplace_dependence |
| **G** | `negative_scope` | Alcance negativo (guardrails) | excluded_categories, keywords, use_cases, competitors |
| **H** | `governance` | Gobernanza | human_overrides, context_confidence, validation_status |

### 3.4 Esquemas Zod de Validación

#### Brand Schema
```typescript
export const brandSchema = z.object({
  name: z.string().default(""),
  domain: z.string().default(""),
  industry: z.string().default(""),
  business_model: caseInsensitiveEnum(["b2b", "dtc", "marketplace", "hybrid"]),
  primary_geography: z.array(z.string()).default([]),
  revenue_band: z.string().default(""),
  target_market: z.string().default(""),
});
```

#### Competitor Entry Schema (Phase 2 Enhanced)
```typescript
export const competitorEntrySchema = z.object({
  name: z.string(),
  domain: z.string().default(""),
  tier: caseInsensitiveEnum(["tier1", "tier2", "tier3"]).default("tier1"),
  status: caseInsensitiveEnum(["approved", "rejected", "pending_review"]).default("pending_review"),
  similarity_score: z.number().min(0).max(100).default(50),
  serp_overlap: z.number().min(0).max(100).default(0),
  size_proximity: z.number().min(0).max(100).default(50),
  revenue_range: z.string().default(""),
  employee_count: z.string().default(""),
  funding_stage: caseInsensitiveEnum(["bootstrap", "seed", "series_a", "series_b", "series_c_plus", "public", "unknown"]),
  geo_overlap: z.array(z.string()).default([]),
  evidence: competitorEvidenceSchema.default({}),
  added_by: caseInsensitiveEnum(["ai", "human"]).default("ai"),
  added_at: z.string().default(""),
  rejected_reason: z.string().default(""),
});
```

#### Negative Scope Schema (Phase 3 Enhanced)
```typescript
export const negativeScopeSchema = z.object({
  // Legacy arrays
  excluded_categories: z.array(z.string()).default([]),
  excluded_keywords: z.array(z.string()).default([]),
  excluded_use_cases: z.array(z.string()).default([]),
  excluded_competitors: z.array(z.string()).default([]),
  // Enhanced exclusions with match type and TTL
  category_exclusions: z.array(exclusionEntrySchema).default([]),
  keyword_exclusions: z.array(exclusionEntrySchema).default([]),
  use_case_exclusions: z.array(exclusionEntrySchema).default([]),
  competitor_exclusions: z.array(exclusionEntrySchema).default([]),
  // Enforcement rules
  enforcement_rules: z.object({
    hard_exclusion: z.boolean(),
    allow_model_suggestion: z.boolean(),
    require_human_override_for_expansion: z.boolean(),
  }),
  audit_log: z.array(exclusionAuditEntrySchema).default([]),
});
```

#### Governance Schema (Phase 4 Enhanced)
```typescript
export const governanceSchema = z.object({
  model_suggested: z.boolean(),
  human_overrides: z.object({
    competitors: z.array(z.string()),
    keywords: z.array(z.string()),
    categories: z.array(z.string()),
  }),
  context_confidence: z.object({
    level: caseInsensitiveEnum(["high", "medium", "low"]),
    notes: z.string(),
  }),
  last_reviewed: z.string(),
  reviewed_by: z.string(),
  context_valid_until: z.string(),
  cmo_safe: z.boolean(),
  // Phase 1: Validation & Versioning
  context_hash: z.string().default(""),
  context_version: z.number().default(1),
  validation_status: caseInsensitiveEnum(["complete", "incomplete", "blocked", "needs_review"]),
  human_verified: z.boolean().default(false),
  blocked_reasons: z.array(z.string()).default([]),
  // Phase 4: Quality Score & AI Behavior
  quality_score: contextQualityScoreSchema,
  ai_behavior: aiBehaviorContractSchema,
});
```

---

## 4. Backend - Servidor Express

### 4.1 Punto de Entrada (`server/index.ts`)

```typescript
import express from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { errorHandler } from "./utils/error-handling";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

const httpServer = createServer(app);

(async () => {
  await registerRoutes(httpServer, app);
  app.use(errorHandler);
  
  // Vite dev server or static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }
  
  const port = process.env.PORT || 5000;
  httpServer.listen(port, () => {
    log(`Server running on port ${port}`);
  });
})();
```

### 4.2 Sistema de Rutas (`server/routes.ts`)

#### Rutas Principales Registradas

```typescript
export async function registerRoutes(server: Server, app: Express) {
  // Autenticación
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Rutas de tenant
  registerTenantRoutes(app);
  
  // Rutas de módulos FON
  app.use("/api/fon/modules", isAuthenticated, moduleRoutes);
  
  // Rutas de councils
  app.use("/api/fon/councils", isAuthenticated, councilRoutes);
  
  // Rutas de UCR
  app.use("/api/ucr", isAuthenticated, ucrRoutes);
  
  // Rutas de configuración (CRUD)
  app.get("/api/configurations", isAuthenticated, ...);
  app.get("/api/configuration", isAuthenticated, ...);
  app.post("/api/configuration", isAuthenticated, ...);
  app.put("/api/configuration/:id", isAuthenticated, ...);
  app.delete("/api/configuration/:id", isAuthenticated, ...);
  
  // Rutas de Brands
  app.get("/api/brands", isAuthenticated, ...);
  app.post("/api/brands", isAuthenticated, ...);
  app.get("/api/brands/:id", isAuthenticated, ...);
  app.put("/api/brands/:id", isAuthenticated, ...);
  app.delete("/api/brands/:id", isAuthenticated, ...);
  
  // Rutas de Contexts (UCR)
  app.get("/api/contexts", isAuthenticated, ...);
  app.post("/api/contexts", isAuthenticated, ...);
  app.get("/api/contexts/:id", isAuthenticated, ...);
  app.put("/api/contexts/:id", isAuthenticated, ...);
  
  // Rutas de ExecReports
  app.get("/api/exec-reports/context/:contextId", isAuthenticated, ...);
  app.get("/api/exec-reports/:id", isAuthenticated, ...);
  
  // Rutas de MasterReport
  app.get("/api/master-report/:contextId", isAuthenticated, ...);
  
  // AI Generation
  app.post("/api/ai/generate", isAuthenticated, ...);
  
  // Keyword Gap
  app.get("/api/keyword-gap/status", isAuthenticated, ...);
  app.post("/api/keyword-gap/analyze", isAuthenticated, ...);
  app.post("/api/keyword-gap-lite/run", isAuthenticated, ...);
  
  // Bulk Generation
  app.post("/api/bulk/generate", isAuthenticated, ...);
  app.get("/api/bulk/jobs", isAuthenticated, ...);
}
```

### 4.3 Capa de Almacenamiento (`server/storage.ts`)

El sistema implementa dos estrategias de almacenamiento:

#### DatabaseStorage (PostgreSQL)
```typescript
class DatabaseStorage implements IStorage {
  // Brands CRUD
  async createBrand(userId: string, brand: Omit<InsertBrand, 'userId'>): Promise<BrandRecord>;
  async getBrand(brandId: number, userId: string): Promise<BrandRecord | undefined>;
  async getAllBrands(userId: string): Promise<BrandRecord[]>;
  async updateBrand(brandId: number, userId: string, updates: Partial<InsertBrand>): Promise<BrandRecord>;
  async deleteBrand(brandId: number, userId: string): Promise<void>;
  
  // Contexts (UCR) CRUD
  async createContext(context: InsertContext): Promise<ContextRecord>;
  async getContext(contextId: number, userId: string): Promise<ContextRecord | undefined>;
  async getContextByBrand(brandId: number, userId: string): Promise<ContextRecord | undefined>;
  async getAllContexts(userId: string): Promise<ContextRecord[]>;
  async updateContext(contextId: number, userId: string, updates: Partial<InsertContext>): Promise<ContextRecord>;
  
  // ExecReports CRUD
  async createExecReport(report: InsertExecReport): Promise<ExecReportRecord>;
  async getExecReportsByContext(contextId: number, userId: string): Promise<ExecReportRecord[]>;
  async getExecReport(execReportId: number, userId: string): Promise<ExecReportRecord | undefined>;
  
  // MasterReport (agregación)
  async getMasterReportData(contextId: number, userId: string): Promise<{
    context: ContextRecord | undefined;
    brand: BrandRecord | undefined;
    reports: ExecReportRecord[];
  }>;
  
  // Audit Logs
  async createAuditLog(log: Omit<AuditLog, "id" | "created_at">): Promise<AuditLog>;
  async getAuditLogs(tenantId: number, configurationId?: number): Promise<AuditLog[]>;
  
  // Configurations (Legacy)
  async getConfiguration(id: number): Promise<Configuration | undefined>;
  async createConfiguration(config: InsertConfiguration, userId: string): Promise<Configuration>;
  async updateConfiguration(id: number, config: Partial<InsertConfiguration>): Promise<Configuration>;
  async deleteConfiguration(id: number): Promise<void>;
}
```

#### MemStorage (Desarrollo Local)
```typescript
class MemStorage implements IStorage {
  private brands = new Map<number, BrandRecord>();
  private contexts = new Map<number, ContextRecord>();
  private execReports = new Map<number, ExecReportRecord>();
  private configurations = new Map<number, Configuration>();
  private auditLogs = new Map<number, AuditLog>();
  // ... mismos métodos que DatabaseStorage
}
```

### 4.4 Manejo de Errores (`server/utils/error-handling.ts`)

```typescript
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export const createValidationError = (message: string) => new AppError(message, 400);
export const createNotFoundError = (message: string) => new AppError(message, 404);
export const createDatabaseError = (message: string) => new AppError(message, 500);
export const createExternalApiError = (message: string) => new AppError(message, 502);

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }
  
  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: "Internal server error",
    statusCode: 500,
  });
};
```

---

## 5. Frontend - Cliente React

### 5.1 Estructura de la Aplicación (`client/src/App.tsx`)

```typescript
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TenantProvider>
          <BrandProvider>
            <UCRProvider>
              <Switch>
                <Route path="/tenants" component={TenantSelect} />
                <Route path="/" component={ConfigurationLayout} />
              </Switch>
              <Toaster />
            </UCRProvider>
          </BrandProvider>
        </TenantProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

### 5.2 Providers (Context API)

#### TenantProvider (`hooks/use-tenant.tsx`)
Maneja la selección y estado del tenant actual.

#### BrandProvider (`hooks/use-brand.tsx`)
```typescript
interface BrandContextType {
  activeBrand: Configuration | null;
  activeBrandId: number | null;
  brands: Configuration[];
  isLoading: boolean;
  setActiveBrand: (brandId: number | null) => void;
  createBrand: (brandName: string, domain: string) => Promise<Configuration>;
  isCreating: boolean;
  refreshBrands: () => void;
}
```

#### UCRProvider (`hooks/use-ucr.tsx`)
```typescript
interface UCRContextType {
  status: UCRStatus | null;
  isLoading: boolean;
  isAllowed: boolean;
  blockReason: string | null;
  hasContext: boolean;
  configurationId: number | null;
  snapshotHash: string | null;
  refetch: () => void;
  getSectionStatus: (section: keyof UCRStatus["sectionStatus"]) => SectionStatus | null;
  getCompletionPercentage: () => number;
  getRequiredIncomplete: () => string[];
}
```

### 5.3 Páginas Principales

| Página | Ruta | Descripción |
|--------|------|-------------|
| `Dashboard` | `/` | Panel ejecutivo con KPIs y gráficos |
| `Configuration` | `/configuration` | Editor de las 8 secciones UCR |
| `ConfigurationsList` | `/configurations` | Lista de todas las configuraciones |
| `Modules` | `/modules` | Ejecución de módulos FON |
| `MasterReport` | `/master-report/:id` | Reporte consolidado ejecutivo |
| `OnePager` | `/one-pager/:id` | Vista resumen de UCR |
| `KeywordGap` | `/keyword-gap/:id` | Análisis de keyword gap |
| `VersionHistory` | `/version-history/:id` | Historial de versiones |
| `BulkGeneration` | `/bulk` | Generación masiva de UCRs |

### 5.4 Componentes de Secciones

Cada sección del UCR tiene su propio componente en `client/src/components/sections/`:

```
sections/
├── brand.tsx              # Sección A: Brand Context
├── category-definition.tsx # Sección B: Category Definition
├── competitive-set.tsx    # Sección C: Competitive Set
├── demand-definition.tsx  # Sección D: Demand Definition
├── strategic-intent.tsx   # Sección E: Strategic Intent
├── channel-context.tsx    # Sección F: Channel Context
├── negative-scope.tsx     # Sección G: Negative Scope
└── governance.tsx         # Sección H: Governance
```

### 5.5 Componentes UI (shadcn/ui)

El sistema usa shadcn/ui con 50+ componentes:

```
ui/
├── accordion.tsx
├── alert-dialog.tsx
├── avatar.tsx
├── badge.tsx
├── button.tsx
├── card.tsx
├── checkbox.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── form.tsx
├── input.tsx
├── label.tsx
├── popover.tsx
├── progress.tsx
├── select.tsx
├── separator.tsx
├── sidebar.tsx
├── slider.tsx
├── switch.tsx
├── table.tsx
├── tabs.tsx
├── textarea.tsx
├── toast.tsx
├── tooltip.tsx
└── ... (50+ componentes)
```

---

## 6. Sistema FON (Foundational Operational Network)

### 6.1 Arquitectura FON

```
┌─────────────────────────────────────────────────────────────────┐
│                         FON ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   MODULES    │───▶│  PLAYBOOKS   │───▶│   COUNCILS   │      │
│  │  (Executors) │    │  (Templates) │    │  (Reasoning) │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                    UCR CONTEXT                        │      │
│  │  (Single Source of Truth - 8 Canonical Sections)     │      │
│  └──────────────────────────────────────────────────────┘      │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────────────────────────────────────────────┐      │
│  │                    GUARDRAILS                         │      │
│  │  (Negative Scope Enforcement + Strategic Alignment)  │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Módulos Ejecutores

#### Base Executor (`server/modules/base-executor.ts`)

```typescript
export abstract class BaseModuleExecutor implements ModuleExecutor {
  abstract definition: ModuleDefinition;
  abstract execute(input: ModuleInput): Promise<ModuleOutput>;
  
  validate(input: ModuleInput): { valid: boolean; errors: string[] };
  
  protected createEmptyOutput(): ModuleOutput;
  protected createInsight(params: InsightParams): Insight;
  protected createRecommendation(params: RecommendationParams): Recommendation;
  protected createChartData(params: ChartDataParams): ChartData;
  protected calculateConfidence(factors: ConfidenceFactors): number;
  protected getFreshnessStatus(dataTimestamp: Date): FreshnessInfo;
  protected applyTimeDecayToConfidence(baseConfidence: number, dataTimestamp: Date): number;
}
```

#### 7 Módulos Implementados

| Módulo | ID | Descripción | Owner Council |
|--------|-----|-------------|---------------|
| **Market Demand** | `market-demand` | Análisis de demanda y estacionalidad | Strategic Intelligence |
| **Keyword Gap** | `keyword-gap` | Gap de keywords SEO y visibilidad | SEO Visibility |
| **Strategic Summary** | `strategic-summary` | Síntesis cross-module ejecutiva | Growth Strategy |
| **Competitive Positioning** | `competitive-positioning` | Landscape competitivo y posicionamiento | Strategic Intelligence |
| **Content Performance** | `content-performance` | Efectividad de contenido y engagement | Creative Funnel |
| **Pricing Intelligence** | `pricing-intelligence` | Estrategia de precios y análisis competitivo | Strategic Intelligence |
| **Channel Attribution** | `channel-attribution` | Atribución de canales y ROAS | Ops Attribution |

#### Estructura de ModuleOutput

```typescript
interface ModuleOutput {
  moduleId: string;
  hasData: boolean;
  confidence: number;           // 0-1
  dataSources: string[];
  dataTimestamp: Date;
  rawData: Record<string, unknown>;
  insights: Insight[];
  recommendations: Recommendation[];
  chartsData: ChartData[];
  councilContext: CouncilContext;
  freshnessStatus: FreshnessInfo;
  errors?: string[];
}

interface Insight {
  id: string;
  title: string;
  content: string;
  dataPoint: string;
  source: string;
  whyItMatters: string;
  severity: 'high' | 'medium' | 'low';
  category: 'opportunity' | 'risk' | 'observation';
}

interface Recommendation {
  id: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
  effort: 'low' | 'medium' | 'high';
  timeline?: string;
  withAccessCta?: string;
}
```

### 6.3 Sistema de Councils

#### 7 Councils Definidos

```typescript
const COUNCIL_DEFINITIONS = {
  strategic_intelligence: {
    name: 'Strategic Intelligence Council',
    expertise: ['market analysis', 'trend detection', 'competitive intelligence'],
    decisionAuthority: 1.0,
  },
  seo_visibility_demand: {
    name: 'SEO Visibility & Demand Council',
    expertise: ['SEO strategy', 'keyword research', 'content optimization'],
    decisionAuthority: 0.9,
  },
  performance_media_messaging: {
    name: 'Performance Media & Messaging Council',
    expertise: ['paid advertising', 'messaging strategy', 'conversion optimization'],
    decisionAuthority: 0.85,
  },
  creative_funnel: {
    name: 'Creative & Funnel Council',
    expertise: ['creative strategy', 'UX optimization', 'funnel analysis'],
    decisionAuthority: 0.7,
  },
  growth_strategy_planning: {
    name: 'Growth Strategy & Planning Council',
    expertise: ['growth strategy', 'resource allocation', 'prioritization'],
    decisionAuthority: 1.0,
  },
  ops_attribution: {
    name: 'Operations & Attribution Council',
    expertise: ['attribution modeling', 'operational efficiency', 'data quality'],
    decisionAuthority: 0.8,
  },
  product_gtm_alignment: {
    name: 'Product & GTM Alignment Council',
    expertise: ['product marketing', 'GTM strategy', 'market positioning'],
    decisionAuthority: 0.75,
  },
};
```

#### Razonamiento con OpenAI

```typescript
async function getCouncilReasoning(
  councilId: string,
  moduleOutput: ModuleOutput,
  configuration: Configuration
): Promise<CouncilResponse> {
  const council = COUNCIL_DEFINITIONS[councilId];
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: council.reasoningPrompt },
      { role: "user", content: JSON.stringify({ moduleOutput, configuration }) }
    ],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### 6.4 Sistema de Guardrails

#### Enforcement de Negative Scope

```typescript
interface GuardrailViolation {
  type: "excluded_keyword" | "excluded_category" | "excluded_competitor" | "excluded_use_case" | "strategic_misalignment";
  severity: "block" | "warn" | "info";
  matchedTerm: string;
  context: string;
  source: string;
}

function checkRecommendationGuardrails(
  recommendation: string,
  guardrails: CouncilGuardrails
): GuardrailCheckResult {
  // Verifica contra:
  // - excluded_keywords
  // - excluded_categories
  // - excluded_competitors
  // - excluded_use_cases
  // - strategic_intent.avoid
  
  return {
    passed: blockedCount === 0,
    violations,
    blockedCount,
    warnCount,
    enforcementLevel: "strict" | "moderate" | "permissive",
  };
}
```

### 6.5 Sistema de Playbooks

#### Estructura de Playbook

```typescript
interface PlaybookConfig {
  moduleId: string;
  name: string;
  version: string;
  strategicRole: string;
  primaryQuestion: string;
  ownerCouncil: string;
  supportingCouncils: string[];
  processingSteps: ProcessingStep[];
  councilReasoningPrompt: string;
  confidenceFactors: ConfidenceFactor[];
  insightTemplates: InsightTemplate[];
  recommendationTemplates: RecommendationTemplate[];
  deprioritizationRules: DeprioritizationRule[];
}
```

#### Ejemplo de Playbook

```json
{
  "moduleId": "market-demand",
  "name": "Market Demand & Seasonality",
  "strategicRole": "Answers 'When should we move?'",
  "primaryQuestion": "When does demand actually happen?",
  "ownerCouncil": "strategic_intelligence",
  "processingSteps": [
    { "step": "fetch_trends", "api": "google_trends" },
    { "step": "normalize_data" },
    { "step": "detect_seasonality" },
    { "step": "calculate_forecast" }
  ],
  "insightTemplates": [
    {
      "id": "peak_timing",
      "condition": "seasonality_index > 1.5",
      "titleTemplate": "Peak Demand Period Identified",
      "contentTemplate": "Peak demand occurs in {{peak_months}} with {{peak_increase}}% above average",
      "severity": "high",
      "category": "opportunity"
    }
  ]
}
```

### 6.6 Time Decay

```typescript
interface TimeDecayConfig {
  moduleId: string;
  freshDays: number;      // Días considerados "fresh"
  moderateDays: number;   // Días considerados "moderate"
  staleDays: number;      // Días considerados "stale"
  decayRate: number;      // Tasa de decaimiento por día
}

function applyTimeDecay(
  baseConfidence: number,
  dataTimestamp: Date,
  config: TimeDecayConfig
): number {
  const ageDays = (Date.now() - dataTimestamp.getTime()) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.exp(-config.decayRate * ageDays);
  return baseConfidence * decayFactor;
}

function calculateFreshnessStatus(
  dataTimestamp: Date,
  config: TimeDecayConfig
): FreshnessInfo {
  const ageDays = (Date.now() - dataTimestamp.getTime()) / (1000 * 60 * 60 * 24);
  
  if (ageDays <= config.freshDays) return { status: 'fresh', ageDays };
  if (ageDays <= config.moderateDays) return { status: 'moderate', ageDays };
  if (ageDays <= config.staleDays) return { status: 'stale', ageDays, warning: 'Data may be outdated' };
  return { status: 'expired', ageDays, warning: 'Data is expired, refresh recommended' };
}
```

---

## 7. APIs y Endpoints

### 7.1 Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/auth/user` | Usuario autenticado actual |
| GET | `/api/login` | Iniciar flujo de login |
| GET | `/api/logout` | Cerrar sesión |
| GET | `/api/callback` | Callback de OAuth |

### 7.2 Configuraciones (Legacy)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/configurations` | Listar todas las configuraciones |
| GET | `/api/configuration` | Obtener configuración activa |
| POST | `/api/configuration` | Crear nueva configuración |
| PUT | `/api/configuration/:id` | Actualizar configuración |
| DELETE | `/api/configuration/:id` | Eliminar configuración |

### 7.3 Brands

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/brands` | Listar todas las marcas |
| POST | `/api/brands` | Crear nueva marca |
| GET | `/api/brands/:id` | Obtener marca por ID |
| PUT | `/api/brands/:id` | Actualizar marca |
| DELETE | `/api/brands/:id` | Eliminar marca |

### 7.4 Contexts (UCR)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/contexts` | Listar todos los contextos |
| POST | `/api/contexts` | Crear nuevo contexto |
| GET | `/api/contexts/:id` | Obtener contexto por ID |
| PUT | `/api/contexts/:id` | Actualizar contexto |
| GET | `/api/contexts/brand/:brandId` | Obtener contexto por marca |

### 7.5 UCR Controller

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ucr/status` | Estado de validación del UCR |
| GET | `/api/ucr/gate` | Verificar si módulos pueden ejecutar |
| GET | `/api/ucr/snapshot` | Snapshot completo del UCR |
| GET | `/api/ucr/sections` | Estado de completitud por sección |
| POST | `/api/ucr/override` | Registrar override humano |
| GET | `/api/ucr/audit-log` | Obtener log de auditoría |
| POST | `/api/ucr/verify` | Marcar UCR como verificado |

### 7.6 FON Modules

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/fon/modules` | Listar módulos disponibles |
| GET | `/api/fon/modules/:id` | Obtener definición de módulo |
| POST | `/api/fon/modules/:id/execute` | Ejecutar módulo |
| POST | `/api/fon/modules/:id/execute-with-council` | Ejecutar con razonamiento de council |

### 7.7 FON Councils

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/fon/councils` | Listar councils disponibles |
| GET | `/api/fon/councils/:id` | Obtener definición de council |
| POST | `/api/fon/councils/:id/reason` | Obtener perspectiva del council |

### 7.8 ExecReports

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/exec-reports/context/:contextId` | Reportes por contexto |
| GET | `/api/exec-reports/:id` | Obtener reporte específico |

### 7.9 MasterReport

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/master-report/:contextId` | Reporte maestro consolidado |

### 7.10 AI Generation

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/ai/generate` | Generar sección con IA |

**Request Body:**
```json
{
  "section": "brand" | "category_definition" | "competitors" | ...,
  "configId": 123
}
```

### 7.11 Keyword Gap

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/keyword-gap/status` | Estado de DataForSEO |
| POST | `/api/keyword-gap/analyze` | Analizar gap vs competidor |
| POST | `/api/keyword-gap/compare-all` | Análisis multi-competidor |
| POST | `/api/keyword-gap-lite/run` | Análisis rápido con guardrails |
| GET | `/api/keyword-gap-lite/cache` | Estadísticas de caché |
| DELETE | `/api/keyword-gap-lite/cache` | Limpiar caché |

### 7.12 Bulk Generation

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/bulk/generate` | Iniciar generación masiva |
| GET | `/api/bulk/jobs` | Listar trabajos de generación |
| GET | `/api/bulk/jobs/:id` | Estado de trabajo específico |

---

## 8. Guía de Instalación

### 8.1 Requisitos Previos

- **Node.js** 18+ (recomendado 20+)
- **npm** 9+
- **PostgreSQL** 14+ (o cuenta en Neon/ElephantSQL)
- **Git**

### 8.2 Instalación

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd usercontextrecord

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 4. Inicializar base de datos
npm run db:push

# 5. Iniciar en desarrollo
npm run dev
```

### 8.3 Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://user:password@host:5432/database

# OpenAI (para generación IA)
OPENAI_API_KEY=sk-...
# O usando Replit AI Integrations:
AI_INTEGRATIONS_OPENAI_API_KEY=...
AI_INTEGRATIONS_OPENAI_BASE_URL=...

# DataForSEO (opcional, para Keyword Gap)
DATAFORSEO_LOGIN=your-login
DATAFORSEO_PASSWORD=your-password

# Sesión
SESSION_SECRET=your-secret-key

# Replit Auth (si usas Replit)
REPLIT_DOMAINS=your-domain.replit.app
ISSUER_URL=https://replit.com
```

### 8.4 Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot reload
npm run build        # Build de producción
npm run start        # Iniciar en producción
npm run check        # Verificar tipos TypeScript
npm run db:push      # Sincronizar esquema a BD
```

---

## 9. Configuración

### 9.1 TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@shared/*": ["./shared/*"],
      "@/*": ["./client/src/*"]
    }
  }
}
```

### 9.2 Vite (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
```

### 9.3 Drizzle (`drizzle.config.ts`)

```typescript
export default {
  schema: "./shared/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
};
```

### 9.4 Tailwind (`tailwind.config.ts`)

```typescript
export default {
  darkMode: ["class"],
  content: ["./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { ... },
        secondary: { ... },
        // ... más colores
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

---

## 10. Flujos de Trabajo

### 10.1 Flujo de Creación de Brand

```
1. Usuario hace clic en "New Brand"
2. Ingresa nombre y dominio
3. Sistema crea Brand en BD
4. Sistema crea Context (UCR) asociado
5. Sistema ejecuta auto-generación IA para las 8 secciones
6. Usuario revisa y ajusta cada sección
7. Sistema calcula quality_score
8. Usuario marca como "CMO Safe" cuando está listo
```

### 10.2 Flujo de Ejecución de Módulo

```
1. Usuario selecciona módulo a ejecutar
2. Sistema verifica UCR Gate (validación)
3. Si UCR incompleto → muestra bloqueo con razones
4. Si UCR válido → ejecuta módulo
5. Módulo obtiene datos de fuentes externas
6. Módulo genera insights y recomendaciones
7. Sistema aplica guardrails (negative_scope)
8. Sistema filtra recomendaciones bloqueadas
9. Si council habilitado → obtiene perspectiva IA
10. Sistema guarda ExecReport en BD
11. Usuario ve resultados con confidence score
```

### 10.3 Flujo de Generación de MasterReport

```
1. Usuario solicita MasterReport
2. Sistema obtiene Context (UCR) actual
3. Sistema obtiene Brand asociado
4. Sistema obtiene todos los ExecReports del Context
5. Sistema agrega insights de todos los módulos
6. Sistema agrega recomendaciones de todos los módulos
7. Sistema calcula overall confidence
8. Sistema genera vista ejecutiva consolidada
```

### 10.4 Flujo de Override Humano

```
1. Usuario modifica valor sugerido por IA
2. Sistema detecta cambio (human override)
3. Sistema crea entrada en audit_log
4. Sistema actualiza governance.human_overrides
5. Sistema recalcula context_hash
6. Sistema incrementa context_version
7. Sistema invalida ExecReports anteriores (opcional)
```

### 10.5 Flujo de Keyword Gap Analysis

```
1. Usuario selecciona competidores a analizar
2. Sistema verifica credenciales DataForSEO
3. Sistema obtiene keywords del brand
4. Sistema obtiene keywords de competidores
5. Sistema calcula gap (keywords que competidores tienen y brand no)
6. Sistema aplica guardrails UCR:
   - Filtra excluded_keywords
   - Filtra excluded_categories
   - Filtra excluded_use_cases
7. Sistema agrupa por temas (brand, category, problem, product)
8. Sistema asigna badges (pass, warn, block)
9. Usuario ve resultados filtrados y priorizados
```

---

## Apéndice A: Glosario

| Término | Definición |
|---------|------------|
| **UCR** | User Context Record - Registro de contexto del usuario con 8 secciones canónicas |
| **FON** | Foundational Operational Network - Arquitectura de módulos, playbooks y councils |
| **Council** | Entidad de razonamiento estratégico que analiza outputs de módulos |
| **Guardrail** | Regla de exclusión que filtra recomendaciones no deseadas |
| **CMO Safe** | Estado que indica que el contexto está listo para uso ejecutivo |
| **ExecReport** | Resultado de ejecución de un módulo específico |
| **MasterReport** | Agregación de todos los ExecReports para un contexto |
| **Playbook** | Configuración de procesamiento para un módulo |
| **Time Decay** | Decaimiento de confianza basado en antigüedad de datos |
| **Snapshot Hash** | Fingerprint inmutable del estado del UCR |

---

## Apéndice B: Troubleshooting

### Error: DATABASE_URL not set
```
Solución: Configurar DATABASE_URL en .env o usar modo desarrollo (MemStorage)
```

### Error: OpenAI API Key not found
```
Solución: Configurar OPENAI_API_KEY o AI_INTEGRATIONS_OPENAI_API_KEY en .env
```

### Error: UCR validation failed
```
Solución: Completar secciones requeridas (brand, category_definition, competitors)
```

### Error: Guardrail blocked recommendation
```
Solución: Revisar negative_scope y ajustar exclusiones si es necesario
```

---

## Apéndice C: Changelog de Fases

### Phase 1: Validation & Versioning
- Context hash para reproducibilidad
- Context version tracking
- Validation status (complete/incomplete/blocked)
- Human verification flag

### Phase 2: Enhanced Competitors
- Competitor tiers (tier1/tier2/tier3)
- Scoring metrics (similarity, SERP overlap, size proximity)
- Evidence packs
- Approval workflow (approved/rejected/pending_review)

### Phase 3: Enhanced Negative Scope
- Match types (exact/semantic)
- Semantic sensitivity levels
- TTL (expires_at) for exclusions
- Audit log for applied exclusions

### Phase 4: Quality Score & AI Behavior
- Context quality score (completeness, competitor_confidence, etc.)
- AI behavior contract (regeneration limits, redaction tracking)
- Auto-approve thresholds
- Violation detection

### Phase 5: ExecReports & MasterReports
- Normalized data model (Brand → Context → ExecReports)
- Persistent module execution results
- Master report aggregation
- Council perspectives storage

---

*Documentación generada el 4 de Enero de 2026*
*Versión del sistema: 1.0.0*
