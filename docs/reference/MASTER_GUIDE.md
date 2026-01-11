# 📚 **MASTER DEVELOPER GUIDE - Brand Intelligence Platform**

> **Documento Maestro para Nuevos Desarrolladores**
> 
> Este documento consolida TODA la información necesaria para que un desarrollador nuevo pueda tomar control completo del proyecto.

---

## 🎯 **QUICK REFERENCE - Lo Más Importante Primero**

### **Los 5 Archivos que DEBES Conocer**

```
1. client/src/App.tsx           → Punto de entrada, rutas, estructura general
2. shared/schema.ts             → TODOS los tipos de datos (Configuration, UCR)
3. shared/module.contract.ts    → Definiciones de los 25+ módulos
4. server/routes.ts             → TODOS los endpoints API
5. server/module-runner.ts      → Lógica de ejecución de módulos
```

### **Comandos Esenciales**

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Compilar para producción
npm run db:push      # Sincronizar schema con DB
npm run lint         # Verificar código
```

### **URLs de Desarrollo**

```
http://localhost:5000           # Aplicación principal
http://localhost:5000/api/...   # Endpoints API
```

---

## 📖 **TABLA DE CONTENIDOS**

### Parte 1: Fundamentos
1. [Glosario de Términos](#-glosario-de-términos)
2. [¿Qué es este proyecto?](#-qué-es-este-proyecto)
3. [Arquitectura en 5 Minutos](#-arquitectura-en-5-minutos)

### Parte 2: Configuración
4. [Setup Paso a Paso](#-setup-paso-a-paso)
5. [Variables de Entorno](#-variables-de-entorno)
6. [APIs Externas - ¿Cuáles Necesito?](#-apis-externas---cuáles-necesito)

### Parte 3: El Código
7. [Tour Guiado del Código](#-tour-guiado-del-código)
8. [El UCR Explicado con Ejemplo Real](#-el-ucr-explicado-con-ejemplo-real)
9. [Sistema de Módulos - Ejemplo Completo](#-sistema-de-módulos---ejemplo-completo)
10. [Mapa de Dependencias de Componentes](#-mapa-de-dependencias-de-componentes)

### Parte 4: Flujos de Datos
11. [Flujo Completo: Guardar Configuración](#-flujo-completo-guardar-configuración)
12. [Flujo Completo: Ejecutar Módulo](#-flujo-completo-ejecutar-módulo)

### Parte 5: Desarrollo Diario
13. [Guía de Debugging](#-guía-de-debugging)
14. [Testing](#-testing)
15. [Archivos que NO Debes Tocar](#-archivos-que-no-debes-tocar)

### Parte 6: Referencia
16. [Tipos Principales](#-tipos-principales)
17. [Endpoints API Completos](#-endpoints-api-completos)
18. [Diagramas de Arquitectura](#-diagramas-de-arquitectura)

---

# PARTE 1: FUNDAMENTOS

## 📚 **Glosario de Términos**

| Término | Significado | Ejemplo |
|---------|-------------|---------|
| **UCR** | User Context Record - El "perfil completo" de una marca con 8 secciones (A-H) | Una configuración de Tesla con su marca, competidores, estrategia, etc. |
| **CMO-safe** | Contenido que un Chief Marketing Officer aprobaría sin preocupaciones legales o de marca | Evitar claims no verificados, mantener tono de marca |
| **Module** | Plugin de análisis que procesa datos del UCR y genera insights | `seo.priority_scoring.v1` analiza prioridad de keywords |
| **CONTRACT_REGISTRY** | Diccionario central con definiciones de todos los módulos | Define qué datos necesita cada módulo y qué produce |
| **Execution Gate** | Validación que verifica si un módulo puede ejecutarse | "Este módulo necesita secciones A, B, C completadas" |
| **Disposition** | Resultado de evaluación de un keyword | PASS, REVIEW, OUT_OF_PLAY |
| **Fence** | Límites de categoría que definen qué está "dentro" o "fuera" del scope | "Footwear" está dentro, "Automotive" está fuera |
| **Guardrails** | Reglas de seguridad que filtran contenido inapropiado | Excluir keywords con términos médicos no aprobados |
| **Block** | Componente UI que maneja lógica de negocio específica | `CompetitorSetBlock` maneja la UI de competidores |
| **Section** | Componente UI que representa una sección completa del formulario | `BrandContext` es la sección A del UCR |

---

## 🎯 **¿Qué es este proyecto?**

### **En Una Oración**
Una plataforma B2B SaaS que ayuda a marcas a configurar su "contexto de marca" para que sistemas de IA generen contenido alineado con su estrategia.

### **El Problema que Resuelve**
- **Sin esta plataforma**: La IA genera contenido genérico que puede contradecir la estrategia de marca
- **Con esta plataforma**: La IA tiene contexto completo y genera contenido "CMO-safe"

### **Usuarios Principales**
1. **Marketing Directors** - Configuran la estrategia de marca
2. **CMO Teams** - Aprueban y gobiernan el uso de IA
3. **Content Teams** - Usan los módulos para generar análisis

### **Flujo de Valor**
```
Marca configura UCR → Sistema valida → Módulos analizan → Insights generados → CMO aprueba
```

---

## 🏗️ **Arquitectura en 5 Minutos**

### **Stack Tecnológico**

```
FRONTEND                    BACKEND                     DATA
─────────────────────────────────────────────────────────────
React 18 + TypeScript       Express.js + TypeScript     PostgreSQL
Wouter (routing)            Drizzle ORM                 Neon (hosting)
React Query (state)         OpenAI GPT-4o               
React Hook Form             DataForSEO API              
shadcn/ui + Tailwind        Ahrefs API                  
```

### **Diagrama Simplificado**

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Pages     │  │  Components │  │   Hooks     │         │
│  │  (routes)   │──│  (UI)       │──│  (state)    │         │
│  └──────┬──────┘  └─────────────┘  └──────┬──────┘         │
│         │                                  │                 │
│         └──────────────┬───────────────────┘                │
│                        │ HTTP/JSON                          │
├────────────────────────┼────────────────────────────────────┤
│                   SERVER (Express)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Routes    │  │   Modules   │  │   Storage   │         │
│  │  /api/*     │──│  (25+)      │──│  (Drizzle)  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
├─────────┼────────────────┼────────────────┼─────────────────┤
│         │                │                │                 │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐         │
│  │   OpenAI    │  │  DataForSEO │  │ PostgreSQL  │         │
│  │   GPT-4o    │  │  Keywords   │  │   (Neon)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### **Estructura de Directorios**

```
usercontextrecord/
├── client/                 # Frontend React
│   └── src/
│       ├── components/     # Componentes UI
│       │   ├── ui/         # Base (shadcn/ui) - 48 componentes
│       │   ├── blocks/     # Lógica de negocio - 9 componentes
│       │   ├── sections/   # Secciones UCR - 8 componentes
│       │   └── notion/     # UX mejorada - 6 componentes
│       ├── pages/          # Páginas/rutas - 21 archivos
│       ├── hooks/          # Custom hooks
│       └── contexts/       # React contexts
├── server/                 # Backend Express
│   ├── routes.ts           # TODOS los endpoints
│   ├── module-runner.ts    # Ejecutor de módulos
│   ├── modules/            # Implementaciones de módulos
│   └── storage.ts          # Capa de datos
├── shared/                 # Código compartido
│   ├── schema.ts           # Tipos y validación Zod
│   └── module.contract.ts  # Definiciones de módulos
└── docs/                   # Documentación adicional
```

---

# PARTE 2: CONFIGURACIÓN

## 🚀 **Setup Paso a Paso**

### **Prerequisitos**

```bash
# Verificar versiones
node --version    # Debe ser 20+
npm --version     # Debe ser 9+
git --version     # Cualquier versión reciente
```

### **Paso 1: Clonar y Instalar**

```bash
git clone <repository-url>
cd usercontextrecord
npm install
```

### **Paso 2: Configurar Variables de Entorno**

```bash
# Copiar template
cp .env.example .env

# Editar .env con tus valores (ver sección siguiente)
```

### **Paso 3: Iniciar Servidor**

```bash
# Opción A: Comando directo
npm run dev

# Opción B: En Windows con variables pre-configuradas
docs/start-server.bat
```

### **Paso 4: Verificar que Funciona**

1. Abrir `http://localhost:5000`
2. Deberías ver la lista de configuraciones
3. Crear una nueva configuración de prueba

### **Troubleshooting del Setup**

| Error | Solución |
|-------|----------|
| `ENOENT: no such file .env` | Crear archivo `.env` desde `.env.example` |
| `Cannot connect to database` | Verificar `DATABASE_URL` en `.env` |
| `Port 5000 already in use` | Cambiar `PORT` en `.env` o matar proceso existente |
| `Module not found` | Ejecutar `npm install` de nuevo |

---

## 🔐 **Variables de Entorno**

### **Archivo `.env` Completo**

```env
# ═══════════════════════════════════════════════════════════
# DATABASE - REQUERIDO
# ═══════════════════════════════════════════════════════════
DATABASE_URL=postgresql://user:password@host:5432/database

# ═══════════════════════════════════════════════════════════
# AI SERVICES - REQUERIDO para generación AI
# ═══════════════════════════════════════════════════════════
OPENAI_API_KEY=sk-...

# ═══════════════════════════════════════════════════════════
# KEYWORD ANALYSIS - OPCIONAL (features específicas)
# ═══════════════════════════════════════════════════════════
DATAFORSEO_LOGIN=your-login
DATAFORSEO_PASSWORD=your-password
AHREFS_API_KEY=your-key

# ═══════════════════════════════════════════════════════════
# DEVELOPMENT
# ═══════════════════════════════════════════════════════════
NODE_ENV=development
PORT=5000
SESSION_SECRET=your-random-secret-here
```

### **¿Dónde Obtener las Keys?**

| Variable | Dónde Obtener | Costo |
|----------|---------------|-------|
| `DATABASE_URL` | [Neon](https://neon.tech) o PostgreSQL local | Gratis (tier básico) |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) | Pay-per-use |
| `DATAFORSEO_LOGIN/PASSWORD` | [DataForSEO](https://app.dataforseo.com/) | Pay-per-use |
| `AHREFS_API_KEY` | [Ahrefs](https://ahrefs.com/api) | Suscripción |

---

## 🔌 **APIs Externas - ¿Cuáles Necesito?**

### **Matriz de Dependencias**

| Feature | Sin API | Con OpenAI | Con DataForSEO | Con Ahrefs |
|---------|---------|------------|----------------|------------|
| Ver/editar configuraciones | ✅ | ✅ | ✅ | ✅ |
| Guardar configuraciones | ✅ | ✅ | ✅ | ✅ |
| Generación AI de contenido | ❌ | ✅ | ✅ | ✅ |
| Keyword Gap Analysis | ❌ | ❌ | ✅ | ✅ |
| Backlink Analysis | ❌ | ❌ | ❌ | ✅ |
| Módulos SEO avanzados | ❌ | ✅ | ✅ | ✅ |

### **Recomendación para Desarrollo**

**Mínimo para empezar:**
- ✅ `DATABASE_URL` - Requerido siempre
- ✅ `OPENAI_API_KEY` - Para probar generación AI

**Para desarrollo completo:**
- Agregar `DATAFORSEO_*` cuando trabajes en Keyword Gap
- Agregar `AHREFS_API_KEY` cuando trabajes en análisis de backlinks

---

# PARTE 3: EL CÓDIGO

## 🗺️ **Tour Guiado del Código**

### **Día 1: Entender la Estructura**

**Abre estos archivos en este orden:**

#### **1. `client/src/App.tsx`** - El Punto de Entrada

```typescript
// Este archivo define TODAS las rutas de la aplicación
// Busca el componente Router para ver qué página se renderiza en cada URL

<Route path="/">
  <ConfigurationsList />  // Lista de configuraciones
</Route>

<Route path="/modules/:moduleId">
  <ModuleShell />  // Renderiza cualquier módulo dinámicamente
</Route>
```

**Lo que debes notar:**
- Cómo se usa `MainLayout` para envolver todas las páginas
- Cómo `ModuleShell` maneja 25+ módulos con una sola ruta

#### **2. `shared/schema.ts`** - Los Tipos de Datos

```typescript
// Este archivo define TODOS los tipos principales
// Busca estos tipos clave:

export const configurationSchema = z.object({
  brand: brandSchema,           // Sección A
  category_definition: ...,     // Sección B
  competitive_set: ...,         // Sección C
  // ... hasta sección H
});

export type Configuration = z.infer<typeof configurationSchema>;
export type InsertConfiguration = typeof configurations.$inferInsert;
```

**Lo que debes notar:**
- Cómo Zod define la validación
- Cómo se infieren los tipos de TypeScript

#### **3. `server/routes.ts`** - Los Endpoints API

```typescript
// Este archivo tiene TODOS los endpoints
// Busca patrones como:

app.get("/api/configurations", async (req, res) => {
  // Lista configuraciones
});

app.post("/api/configurations", async (req, res) => {
  // Crea configuración
});

app.post("/api/modules/:moduleId/run", async (req, res) => {
  // Ejecuta un módulo
});
```

**Lo que debes notar:**
- Cómo se usa `isAuthenticated` middleware
- Cómo se llama a `storage.*` para acceder a datos

#### **4. `shared/module.contract.ts`** - Definiciones de Módulos

```typescript
// Este archivo define los 25+ módulos
// Busca CONTRACT_REGISTRY:

export const CONTRACT_REGISTRY: Record<string, ModuleContract> = {
  "seo.priority_scoring.v1": {
    name: "Priority Scoring",
    description: "Analyze content priority...",
    contextInjection: {
      requiredSections: ["A", "B", "C"],
      optionalSections: ["D", "E"]
    },
    // ...
  },
  // ... más módulos
};
```

**Lo que debes notar:**
- Cómo cada módulo declara qué secciones UCR necesita
- Cómo se organizan por categoría (SEO, Market, etc.)

#### **5. `server/module-runner.ts`** - Ejecución de Módulos

```typescript
// Este archivo ejecuta la lógica de cada módulo
// Busca el switch statement:

switch (moduleId) {
  case "seo.priority_scoring.v1":
    resultData = await analyzePriorityScoring(config, inputs);
    break;
  case "market.share_of_voice.v1":
    resultData = await analyzeShareOfVoice(config, inputs);
    break;
  // ... más casos
}
```

**Lo que debes notar:**
- Cómo se valida antes de ejecutar
- Cómo se persisten los resultados

---

## 📋 **El UCR Explicado con Ejemplo Real**

### **¿Qué es un UCR?**

Un **User Context Record** es el "perfil completo" de una marca. Tiene 8 secciones:

### **Ejemplo Completo: OOFOS (Marca de Calzado)**

```json
{
  "id": 1,
  "name": "OOFOS Brand Configuration",
  
  "brand": {
    "name": "OOFOS",
    "domain": "oofos.com",
    "industry": "Footwear",
    "business_model": "DTC",
    "primary_geography": ["US", "CA", "UK"],
    "revenue_band": "$50M-$100M",
    "target_market": "Active recovery enthusiasts"
  },
  
  "category_definition": {
    "primary_category": "Recovery Footwear",
    "included": ["sandals", "slides", "clogs", "recovery shoes"],
    "excluded": ["running shoes", "hiking boots", "dress shoes"],
    "approved_categories": ["Recovery Footwear", "Comfort Footwear"],
    "alternative_categories": ["Athletic Recovery", "Post-Workout Footwear"]
  },
  
  "competitive_set": {
    "direct_competitors": [
      {
        "name": "Hoka",
        "domain": "hoka.com",
        "tier": "tier1",
        "strengths": ["Brand recognition", "Running heritage"],
        "weaknesses": ["Higher price point", "Less recovery focus"]
      },
      {
        "name": "Crocs",
        "domain": "crocs.com",
        "tier": "tier2",
        "strengths": ["Mass market appeal", "Price accessibility"],
        "weaknesses": ["Less technical", "Different positioning"]
      }
    ],
    "indirect_competitors": ["Nike", "Adidas", "New Balance"]
  },
  
  "demand_definition": {
    "target_audiences": [
      {
        "name": "Active Recovery Seekers",
        "description": "Athletes and fitness enthusiasts seeking post-workout comfort",
        "pain_points": ["Foot fatigue", "Plantar fasciitis", "Post-exercise soreness"]
      }
    ],
    "journey_stages": ["Awareness", "Consideration", "Purchase", "Loyalty"],
    "themes": ["recovery", "comfort", "foot health", "active lifestyle"]
  },
  
  "strategic_intent": {
    "objectives": ["Increase brand awareness", "Expand DTC channel", "Enter new markets"],
    "kpis": ["Revenue growth 20% YoY", "NPS > 70", "Repeat purchase rate > 40%"],
    "key_messages": ["OOfoam technology", "Clinically proven recovery", "Loved by athletes"],
    "tone": "Confident, supportive, science-backed",
    "differentiators": ["Patented OOfoam", "Podiatrist recommended", "Recovery-first design"]
  },
  
  "channel_context": {
    "paid_media_active": true,
    "seo_investment_level": "high",
    "marketplace_dependence": "medium",
    "primary_channels": ["Organic Search", "Paid Social", "Email"],
    "secondary_channels": ["Amazon", "Retail Partners"]
  },
  
  "negative_scope": {
    "excluded_categories": ["medical devices", "prescription footwear"],
    "excluded_keywords": ["cure", "treat", "medical", "prescription"],
    "excluded_use_cases": ["medical treatment", "injury rehabilitation"],
    "excluded_competitors": [],
    "enforcement_rules": {
      "hard_exclusion": true,
      "allow_model_suggestion": false,
      "require_human_override_for_expansion": true
    }
  },
  
  "governance": {
    "quality_score": {
      "completeness": 95,
      "competitor_confidence": 88,
      "negative_strength": 92,
      "evidence_coverage": 85,
      "overall": 90,
      "grade": "high"
    },
    "ai_behavior": {
      "regeneration_count": 2,
      "max_regenerations": 5,
      "last_regeneration": "2026-01-10T15:30:00Z"
    },
    "cmo_safe": true,
    "approval_status": "approved",
    "approved_by": "marketing_director@oofos.com",
    "approved_at": "2026-01-10T16:00:00Z"
  }
}
```

### **¿Dónde Vive Este Dato?**

```
Base de Datos (PostgreSQL)
    └── Tabla: configurations
        └── Columnas JSONB para cada sección

TypeScript Types
    └── shared/schema.ts
        └── Configuration, InsertConfiguration

Formularios UI
    └── client/src/components/sections/
        └── brand-context.tsx (Sección A)
        └── category-definition.tsx (Sección B)
        └── ... (una por sección)
```

---

## 🔧 **Sistema de Módulos - Ejemplo Completo**

### **Anatomía de un Módulo: `seo.priority_scoring.v1`**

#### **1. Definición en CONTRACT_REGISTRY**

```typescript
// shared/module.contract.ts
"seo.priority_scoring.v1": {
  name: "Priority Scoring",
  description: "Analyze and score content priorities based on SEO potential",
  category: "seo",
  version: "1.0.0",
  
  contextInjection: {
    requiredSections: ["A", "B", "C"],  // Brand, Category, Competitors
    optionalSections: ["D", "E"]         // Demand, Strategic Intent
  },
  
  executionGate: {
    minCompleteness: 0.7,
    requiredFields: ["brand.domain", "category_definition.primary_category"],
    blockingConditions: []
  },
  
  inputSchema: {
    keywords: "string[]",
    maxResults: "number"
  },
  
  outputSchema: {
    scores: "PriorityScore[]",
    recommendations: "string[]"
  },
  
  ui: {
    icon: "TrendingUp",
    color: "blue",
    displayOrder: 1
  }
}
```

#### **2. Implementación en module-runner.ts**

```typescript
// server/module-runner.ts
case "seo.priority_scoring.v1":
  // 1. Extraer datos del UCR
  const { brand, category_definition, competitive_set } = config;
  
  // 2. Llamar a la función de análisis
  resultData = await analyzePriorityScoring({
    brandDomain: brand.domain,
    category: category_definition.primary_category,
    competitors: competitive_set.direct_competitors.map(c => c.domain),
    keywords: inputs.keywords
  });
  break;
```

#### **3. Función de Análisis**

```typescript
// server/modules/priority-scoring.ts
export async function analyzePriorityScoring(params: PriorityScoringInput) {
  const { brandDomain, category, competitors, keywords } = params;
  
  // 1. Obtener datos de keywords (DataForSEO)
  const keywordData = await fetchKeywordMetrics(keywords);
  
  // 2. Analizar competencia
  const competitorRankings = await fetchCompetitorRankings(competitors, keywords);
  
  // 3. Calcular scores con AI
  const scores = await calculatePriorityScores({
    keywordData,
    competitorRankings,
    brandContext: { domain: brandDomain, category }
  });
  
  // 4. Generar recomendaciones
  const recommendations = await generateRecommendations(scores);
  
  return {
    scores,
    recommendations,
    metadata: {
      analyzedAt: new Date().toISOString(),
      keywordsProcessed: keywords.length
    }
  };
}
```

#### **4. Renderizado en UI**

```typescript
// client/src/pages/module-shell.tsx
export function ModuleShell() {
  const { moduleId } = useParams();
  const contract = CONTRACT_REGISTRY[moduleId];
  
  // Cargar resultados del módulo
  const { data: results } = useQuery({
    queryKey: ['module-results', moduleId],
    queryFn: () => fetchModuleResults(moduleId)
  });
  
  return (
    <div>
      <ModuleHeader contract={contract} />
      <ModuleVisualizer 
        contract={contract} 
        results={results} 
      />
    </div>
  );
}
```

---

## 🔗 **Mapa de Dependencias de Componentes**

### **¿Quién Usa a Quién?**

```
App.tsx
├── MainLayout
│   ├── AppSidebar
│   └── [Page Content]
│
├── ConfigurationPage (ruta: /new, /configuration/:id)
│   ├── sections/brand-context.tsx
│   │   └── blocks/what-we-are-block.tsx
│   ├── sections/competitive-set.tsx
│   │   └── blocks/competitor-set-block.tsx
│   ├── sections/negative-scope.tsx
│   │   └── blocks/fence-block.tsx
│   └── ... (más secciones)
│
├── ModuleShell (ruta: /modules/:moduleId)
│   ├── ModuleVisualizer
│   │   └── [Componentes específicos por módulo]
│   └── CONTRACT_REGISTRY (datos)
│
└── KeywordGap (ruta: /keyword-gap/:id)
    └── [Componentes especializados]
```

### **Diferencia entre `blocks/` y `sections/`**

| Directorio | Propósito | Ejemplo |
|------------|-----------|---------|
| `sections/` | Sección COMPLETA del formulario UCR | `brand-context.tsx` = toda la sección A |
| `blocks/` | Componente REUTILIZABLE con lógica específica | `competitor-set-block.tsx` = solo la tabla de competidores |

**Regla Simple:**
- Si es una sección del wizard → `sections/`
- Si es un componente reutilizable con lógica → `blocks/`
- Si es UI base sin lógica → `ui/`

---

# PARTE 4: FLUJOS DE DATOS

## 💾 **Flujo Completo: Guardar Configuración**

### **Diagrama de Secuencia**

```
Usuario          Frontend           Backend            Database
   │                │                  │                  │
   │ Click "Save"   │                  │                  │
   │───────────────>│                  │                  │
   │                │                  │                  │
   │                │ form.handleSubmit()                 │
   │                │ validate with Zod                   │
   │                │                  │                  │
   │                │ POST /api/configurations/:id        │
   │                │─────────────────>│                  │
   │                │                  │                  │
   │                │                  │ validateRequest()│
   │                │                  │ storage.updateConfiguration()
   │                │                  │─────────────────>│
   │                │                  │                  │
   │                │                  │                  │ UPDATE configurations
   │                │                  │                  │ SET data = $1
   │                │                  │                  │ WHERE id = $2
   │                │                  │                  │
   │                │                  │<─────────────────│
   │                │                  │ { success: true }│
   │                │<─────────────────│                  │
   │                │                  │                  │
   │                │ queryClient.invalidateQueries()     │
   │                │ toast.success("Saved!")             │
   │<───────────────│                  │                  │
   │                │                  │                  │
```

### **Código Involucrado**

#### **1. Frontend: Formulario**

```typescript
// client/src/pages/configuration.tsx
const form = useForm<Configuration>({
  resolver: zodResolver(configurationSchema),
  defaultValues: existingConfig
});

const onSubmit = async (data: Configuration) => {
  await updateConfiguration.mutateAsync(data);
};
```

#### **2. Frontend: Mutación**

```typescript
// client/src/hooks/use-configuration.ts
const updateConfiguration = useMutation({
  mutationFn: async (data: Configuration) => {
    const response = await fetch(`/api/configurations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['configuration', id]);
    toast.success('Configuration saved!');
  }
});
```

#### **3. Backend: Endpoint**

```typescript
// server/routes.ts
app.put("/api/configurations/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  
  // Validar datos
  const validated = configurationSchema.parse(data);
  
  // Guardar en DB
  const result = await storage.updateConfiguration(id, validated);
  
  res.json({ success: true, data: result });
});
```

#### **4. Backend: Storage**

```typescript
// server/storage.ts
async updateConfiguration(id: number, data: Configuration) {
  return await db
    .update(configurations)
    .set({ 
      ...data,
      updated_at: new Date()
    })
    .where(eq(configurations.id, id))
    .returning();
}
```

---

## ⚡ **Flujo Completo: Ejecutar Módulo**

### **Diagrama de Secuencia**

```
Usuario          Frontend           Backend            External APIs
   │                │                  │                  │
   │ Click "Run"    │                  │                  │
   │───────────────>│                  │                  │
   │                │                  │                  │
   │                │ POST /api/modules/:moduleId/run     │
   │                │─────────────────>│                  │
   │                │                  │                  │
   │                │                  │ 1. Validate contract
   │                │                  │ 2. Check execution gates
   │                │                  │ 3. Load UCR config
   │                │                  │                  │
   │                │                  │ 4. Call external APIs
   │                │                  │─────────────────>│
   │                │                  │                  │ DataForSEO
   │                │                  │<─────────────────│ keyword data
   │                │                  │                  │
   │                │                  │ 5. Process with AI
   │                │                  │─────────────────>│
   │                │                  │                  │ OpenAI
   │                │                  │<─────────────────│ analysis
   │                │                  │                  │
   │                │                  │ 6. Save results
   │                │                  │ 7. Return response
   │                │<─────────────────│                  │
   │                │                  │                  │
   │                │ Update UI with results              │
   │<───────────────│                  │                  │
```

---

# PARTE 5: DESARROLLO DIARIO

## 🐛 **Guía de Debugging**

### **Herramientas Esenciales**

#### **1. React Query DevTools**

```typescript
// Ya incluido en el proyecto
// Abre el panel flotante en la esquina inferior derecha
// Muestra: queries activas, cache, estado de fetching
```

#### **2. Console del Navegador**

```javascript
// Ver estado de React Query
window.__REACT_QUERY_DEVTOOLS__

// Ver configuración actual
console.log(queryClient.getQueryData(['configuration', id]))
```

#### **3. Logs del Servidor**

```bash
# Los logs aparecen en la terminal donde ejecutaste npm run dev
# Busca líneas como:
[INFO] POST /api/configurations/1 - 200 OK
[ERROR] Module execution failed: Missing required section B
```

### **Debugging Común**

#### **"El formulario no guarda"**

```typescript
// 1. Verificar validación
console.log(form.formState.errors);

// 2. Verificar que el endpoint responde
// Network tab → buscar POST /api/configurations

// 3. Verificar respuesta del servidor
// Console → buscar errores de la mutación
```

#### **"El módulo no ejecuta"**

```typescript
// 1. Verificar que el módulo existe
console.log(CONTRACT_REGISTRY[moduleId]);

// 2. Verificar execution gates
const validation = canModuleExecute(moduleId, availableSections);
console.log(validation);

// 3. Verificar logs del servidor
// Buscar: "Module execution failed"
```

#### **"No veo los datos actualizados"**

```typescript
// React Query cache puede estar desactualizado
// Forzar refetch:
queryClient.invalidateQueries(['configuration', id]);

// O refetch manual:
refetch();
```

---

## 🧪 **Testing**

### **Estructura de Tests**

```
tests/
├── unit/           # Tests de funciones individuales
├── integration/    # Tests de endpoints API
└── e2e/            # Tests end-to-end (Playwright)
```

### **Comandos**

```bash
npm test              # Correr todos los tests
npm run test:watch    # Modo watch
npm run test:coverage # Con cobertura
```

### **Ejemplo de Test**

```typescript
// tests/unit/module-validation.test.ts
import { canModuleExecute } from '@shared/module.contract';

describe('canModuleExecute', () => {
  it('should return true when all required sections are available', () => {
    const result = canModuleExecute('seo.priority_scoring.v1', ['A', 'B', 'C']);
    expect(result.canExecute).toBe(true);
  });
  
  it('should return false when missing required sections', () => {
    const result = canModuleExecute('seo.priority_scoring.v1', ['A']);
    expect(result.canExecute).toBe(false);
    expect(result.missingSections).toContain('B');
  });
});
```

---

## 🚫 **Archivos que NO Debes Tocar**

### **Archivos Generados (NO EDITAR)**

```
node_modules/           # Dependencias instaladas
dist/                   # Build de producción
.next/                  # Cache de Next.js (si aplica)
*.lock                  # Lock files de dependencias
```

### **Archivos de Configuración (EDITAR CON CUIDADO)**

```
tsconfig.json           # Configuración TypeScript
vite.config.ts          # Configuración Vite
drizzle.config.ts       # Configuración Drizzle ORM
tailwind.config.ts      # Configuración Tailwind
```

### **Archivos Críticos (CONSULTAR ANTES DE EDITAR)**

```
shared/schema.ts        # Cambios afectan toda la app
server/routes.ts        # Cambios afectan API completa
.env                    # Nunca commitear a git
```

---

# PARTE 6: REFERENCIA

## 📝 **Tipos Principales**

### **Configuration (UCR Completo)**

```typescript
interface Configuration {
  id?: number;
  name: string;
  created_at: string;
  updated_at: string;
  brand_id?: number;
  user_id: string;
  
  brand: BrandSection;                    // Sección A
  category_definition: CategorySection;   // Sección B
  competitive_set: CompetitiveSection;    // Sección C
  demand_definition: DemandSection;       // Sección D
  strategic_intent: StrategicSection;     // Sección E
  channel_context: ChannelSection;        // Sección F
  negative_scope: NegativeSection;        // Sección G
  governance: GovernanceSection;          // Sección H
}
```

### **ModuleContract**

```typescript
interface ModuleContract {
  name: string;
  description: string;
  category: 'seo' | 'market' | 'synthesis' | 'intelligence';
  version: string;
  
  contextInjection: {
    requiredSections: UCRSectionID[];
    optionalSections: UCRSectionID[];
  };
  
  executionGate: {
    minCompleteness: number;
    requiredFields: string[];
    blockingConditions: string[];
  };
  
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  
  ui: {
    icon: string;
    color: string;
    displayOrder: number;
  };
}
```

### **Disposition (Resultado de Evaluación)**

```typescript
type Disposition = 'PASS' | 'REVIEW' | 'OUT_OF_PLAY';

interface ItemTrace {
  ruleId: string;
  ucrSection: UCRSectionID;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

interface EvaluatedItem {
  keyword: string;
  disposition: Disposition;
  trace: ItemTrace[];
  confidence: 'high' | 'medium' | 'low';
}
```

---

## 🌐 **Endpoints API Completos**

### **Configuraciones**

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/configurations` | Lista todas | ✅ |
| POST | `/api/configurations` | Crear nueva | ✅ |
| GET | `/api/configurations/:id` | Obtener una | ✅ |
| PUT | `/api/configurations/:id` | Actualizar | ✅ |
| DELETE | `/api/configurations/:id` | Eliminar | ✅ |

### **Módulos**

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/modules` | Lista módulos disponibles | ✅ |
| POST | `/api/modules/:moduleId/run` | Ejecutar módulo | ✅ |
| GET | `/api/modules/:moduleId/results` | Obtener resultados | ✅ |

### **AI Generation**

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/ai/generate` | Generar sección | ✅ |
| POST | `/api/ai/generate-all` | Generar todas | ✅ |

### **Keyword Gap**

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/keyword-gap/status` | Estado de API | ✅ |
| POST | `/api/keyword-gap/analyze` | Analizar vs competidor | ✅ |
| POST | `/api/keyword-gap/compare-all` | Comparar todos | ✅ |

---

## 📊 **Diagramas de Arquitectura**

*Ver archivo separado: `COMPONENT_ARCHITECTURE_DIAGRAM.md` para diagramas Mermaid completos.*

---

# 📞 **CONTACTO Y AYUDA**

### **Canales de Comunicación**

- **Slack**: #brand-intelligence-dev
- **Email**: dev-team@company.com
- **GitHub Issues**: Para bugs y feature requests

### **Escalación**

1. **Nivel 1**: Buscar en documentación
2. **Nivel 2**: Preguntar en Slack
3. **Nivel 3**: Crear issue en GitHub
4. **Nivel 4**: Contactar al tech lead

---

*Este documento es mantenido por el equipo de desarrollo. Última actualización: Enero 2026.*

*Si encuentras algo desactualizado o confuso, por favor crea un PR o issue.*
