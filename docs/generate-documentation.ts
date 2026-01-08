import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { CONTRACT_REGISTRY, UCR_SECTION_NAMES } from "../shared/module.contract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = __dirname;
const MANIFEST_PATH = path.join(DOCS_DIR, "screens-manifest.json");
const OUTPUT_PATH = path.join(DOCS_DIR, "..", "SYSTEM_DOCUMENTATION.md");
const PDF_OUTPUT_PATH = path.join(DOCS_DIR, "..", "SYSTEM_DOCUMENTATION.pdf");
const SCREENSHOTS_DIR = "docs/screenshots";

interface Screen {
  id: string;
  name: string;
  route: string;
  section?: string;
  requiresAuth: boolean;
  description: string;
  technicalNotes: string;
  flow: string;
  screenshotFile: string;
}

interface Flow {
  name: string;
  description: string;
}

interface Manifest {
  metadata: {
    title: string;
    version: string;
    generated: string;
    description: string;
  };
  screens: Screen[];
  flows: Record<string, Flow>;
  technicalArchitecture: {
    frontend: Record<string, string>;
    backend: Record<string, string>;
    integrations: Record<string, string>;
  };
}

function generatePDF(markdownContent: string): void {
  console.log("📄 Generating PDF documentation...");

  try {
    // Check if pandoc is available
    execSync('pandoc --version', { stdio: 'ignore' });

    // Create temporary markdown file with proper image paths
    const tempMarkdownPath = path.join(DOCS_DIR, "..", "temp_docs.md");
    const adjustedMarkdown = markdownContent.replace(
      /!\[([^\]]*)\]\(docs\/screenshots\/([^)]+)\)/g,
      (match, alt, filename) => {
        const imagePath = path.join(DOCS_DIR, "screenshots", filename);
        if (fs.existsSync(imagePath)) {
          return `![${alt}](${imagePath})`;
        }
        return `![${alt}](docs/screenshots/${filename})`;
      }
    );

    fs.writeFileSync(tempMarkdownPath, adjustedMarkdown);

    // Generate PDF with pandoc
    const pdfCommand = `pandoc "${tempMarkdownPath}" -o "${PDF_OUTPUT_PATH}" --pdf-engine=xelatex --variable=geometry:margin=1in --highlight-style=tango`;

    execSync(pdfCommand, { stdio: 'inherit' });

    // Clean up temporary file
    fs.unlinkSync(tempMarkdownPath);

    console.log(`✅ PDF generated: ${PDF_OUTPUT_PATH}`);

  } catch (error) {
    console.log("⚠️  PDF generation failed (pandoc not available or other error)");
    console.log("   To enable PDF generation, install pandoc:");
    console.log("   - macOS: brew install pandoc");
    console.log("   - Ubuntu/Debian: sudo apt-get install pandoc");
    console.log("   - Windows: choco install pandoc");
    console.log("   Or download from: https://pandoc.org/installing.html");
  }
}

function generateDocumentation(): void {
  console.log("📝 Generating system documentation...\n");

  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));

  const sections: string[] = [];

  sections.push(`# ${manifest.metadata.title}

> Documentación del Sistema - Versión ${manifest.metadata.version}
>
> Generado automáticamente: ${manifest.metadata.generated || new Date().toISOString()}

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Técnica](#arquitectura-técnica)
3. [Flujos de Usuario](#flujos-de-usuario)
4. [Pantallas del Sistema](#pantallas-del-sistema)
5. [Endpoints API](#endpoints-api)
6. [Modelo de Datos](#modelo-de-datos)
7. [Integraciones Externas](#integraciones-externas)
8. [Seguridad](#seguridad)

---

## Resumen Ejecutivo

${manifest.metadata.title} es una plataforma B2B SaaS de configuración de inteligencia de marca con seguridad empresarial. Permite a usuarios autenticados configurar contexto de marca, conjuntos competitivos, definiciones de demanda y guardrails estratégicos con sugerencias impulsadas por IA y almacenamiento persistente.

### Características Principales

- **Autenticación Segura**: Inicio de sesión con Google, GitHub, Apple o email via Replit Auth
- **Sugerencias con IA**: Generación de valores de configuración usando OpenAI gpt-4o
- **Almacenamiento Persistente**: Base de datos PostgreSQL para persistencia segura
- **8 Secciones de Configuración**: Brand Context, Category Definition, Competitive Set, Demand Definition, Strategic Intent, Channel Context, Negative Scope, y Governance
- **Auditoría Completa**: Gobernanza CMO-safe con tracking de override humano
- **Visualización One Pager**: Vista ejecutiva del User Context Record (UCR)
- **Análisis Keyword Gap**: Análisis de brecha de keywords con filtrado de guardrails UCR
- **Historial de Versiones**: Rollback a versiones anteriores

---

## Arquitectura Técnica

### Frontend
| Componente | Tecnología |
|------------|------------|
${Object.entries(manifest.technicalArchitecture.frontend)
      .map(([key, value]) => `| ${key} | ${value} |`)
      .join("\n")}

### Backend
| Componente | Tecnología |
|------------|------------|
${Object.entries(manifest.technicalArchitecture.backend)
      .map(([key, value]) => `| ${key} | ${value} |`)
      .join("\n")}

### Diagrama de Arquitectura

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   React 18  │  │  TanStack   │  │  shadcn/ui  │              │
│  │  + Wouter   │  │   Query     │  │  + Tailwind │              │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘              │
│         │                │                                       │
│         └────────────────┼───────────────────────────────────────┤
│                          │ HTTP/JSON                             │
├──────────────────────────┼───────────────────────────────────────┤
│                     EXPRESS.JS SERVER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Routes    │  │  Passport   │  │   Storage   │              │
│  │   /api/*    │  │  + Session  │  │  Interface  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
├─────────┼────────────────┼────────────────┼──────────────────────┤
│         │                │                │                      │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐              │
│  │   OpenAI    │  │ Replit Auth │  │ PostgreSQL  │              │
│  │   gpt-4o    │  │   (OIDC)    │  │  (Neon)     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌─────────────┐                                                │
│  │ DataForSEO  │                                                │
│  │  Keyword    │                                                │
│  │  Gap API    │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

---

## Flujos de Usuario

`);

  for (const [flowId, flow] of Object.entries(manifest.flows)) {
    const flowScreens = manifest.screens.filter((s) => s.flow === flowId);
    sections.push(`### ${flow.name}

${flow.description}

**Pantallas involucradas:**
${flowScreens.map((s) => `- ${s.name}`).join("\n")}

`);
  }

  sections.push(`---

## Pantallas del Sistema

`);

  for (const screen of manifest.screens) {
    const screenshotPath = `${SCREENSHOTS_DIR}/${screen.screenshotFile}`;
    const hasScreenshot = fs.existsSync(path.join(DOCS_DIR, "..", screenshotPath));

    sections.push(`### ${screen.name}

**Ruta:** \`${screen.route}\`
**Requiere Autenticación:** ${screen.requiresAuth ? "Sí" : "No"}
**Flujo:** ${manifest.flows[screen.flow]?.name || screen.flow}

#### Descripción
${screen.description}

#### Notas Técnicas
${screen.technicalNotes}

${hasScreenshot ? `#### Captura de Pantalla\n![${screen.name}](${screenshotPath})` : "_Screenshot pendiente de captura_"}

---

`);
  }

  sections.push(`## Endpoints API

### Configuraciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | \`/api/configurations\` | Lista todas las configuraciones del usuario |
| POST | \`/api/configurations\` | Crea nueva configuración |
| GET | \`/api/configurations/:id\` | Obtiene configuración por ID |
| PUT | \`/api/configurations/:id\` | Actualiza configuración |
| DELETE | \`/api/configurations/:id\` | Elimina configuración |

### Versiones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | \`/api/configurations/:id/versions\` | Lista versiones de una configuración |
| POST | \`/api/configurations/:id/versions/:versionId/rollback\` | Restaura versión anterior |

### Generación AI
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | \`/api/ai/generate\` | Genera contenido para una sección |
| POST | \`/api/ai/generate-all\` | Genera todas las secciones |

### Keyword Gap
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | \`/api/keyword-gap/status\` | Verifica configuración DataForSEO |
| POST | \`/api/keyword-gap/analyze\` | Analiza gap vs un competidor |
| POST | \`/api/keyword-gap/compare-all\` | Compara vs todos los competidores |
| POST | \`/api/keyword-gap-lite/run\` | Análisis rápido con guardrails |
| GET | \`/api/keyword-gap-lite/cache\` | Estadísticas de cache |
| DELETE | \`/api/keyword-gap-lite/cache\` | Limpia cache |

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | \`/api/auth/user\` | Usuario actual |
| GET | \`/api/login\` | Inicia flujo de login |
| GET | \`/api/logout\` | Cierra sesión |
| GET | \`/api/callback\` | Callback OAuth |

---

## Registro de Módulos (UCR Contracts)

El sistema utiliza un sistema de contratos para definir qué secciones del UCR requiere cada módulo de análisis.

| Módulo | Categoría | Secciones Requeridas | Propósito Estratégico |
|--------|-----------|----------------------|-----------------------|
${Object.values(CONTRACT_REGISTRY).map(c => `| ${c.name} | ${c.category} | ${c.contextInjection.requiredSections.join(", ")} | ${c.strategicQuestion} |`).join("\n")}

---

## Modelo de Datos

### Tabla: configurations
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | ID único |
| userId | TEXT | ID del usuario propietario |
| name | TEXT | Nombre de la configuración |
| brand | JSONB | Contexto de marca (sección A) |
| category | JSONB | Definición de categoría (sección B) |
| competitors | JSONB | Conjunto competitivo (sección C) |
| demand | JSONB | Definición de demanda (sección D) |
| intent | JSONB | Intención estratégica (sección E) |
| channels | JSONB | Contexto de canales (sección F) |
| negative_scope | JSONB | Alcance negativo (sección G) |
| governance | JSONB | Gobernanza (sección H) |
| createdAt | TIMESTAMP | Fecha de creación |
| updatedAt | TIMESTAMP | Última actualización |

### Tabla: configuration_versions
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | ID de versión |
| configurationId | INTEGER | FK a configurations |
| version | INTEGER | Número de versión |
| data | JSONB | Snapshot completo |
| changeNote | TEXT | Descripción del cambio |
| createdAt | TIMESTAMP | Fecha de versión |

---

## Integraciones Externas

### OpenAI (vía Replit AI Integrations)
- **Propósito**: Generación inteligente de contenido para secciones de configuración
- **Modelo**: gpt-4o
- **Autenticación**: Automática via Replit (sin API key requerida)

### DataForSEO
- **Propósito**: Análisis de keyword gap competitivo
- **API**: Ranked Keywords endpoint
- **Autenticación**: Basic Auth (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD)
- **Cache**: 24 horas TTL en memoria

### Replit Auth
- **Propósito**: Autenticación de usuarios
- **Protocolo**: OIDC (OpenID Connect)
- **Proveedores**: Google, GitHub, Apple, Email

---

## Seguridad

### Autenticación
- Sesiones basadas en cookies con almacenamiento PostgreSQL
- Cookies HTTPS-only en producción
- Timeout de sesión configurable

### Autorización
- Datos con scope de usuario (cada usuario ve solo sus configuraciones)
- Middleware \`isAuthenticated\` protege rutas sensibles
- Modo anónimo soportado para pruebas

### Datos Sensibles
- Secrets gestionados via Replit Secrets
- Credenciales DataForSEO en variables de entorno
- Sin exposición de API keys en frontend

### Guardrails UCR
- Filtrado de keywords por categorías excluidas
- Bloqueo de términos en lista negra
- Validación de conceptos in-scope

---

*Documentación generada automáticamente por el sistema de documentación del Brand Intelligence Configuration Platform.*
`);

  const documentation = sections.join("\n");
  fs.writeFileSync(OUTPUT_PATH, documentation);

  console.log(`✅ Documentation generated: ${OUTPUT_PATH}`);
  console.log(`   Total screens documented: ${manifest.screens.length}`);
  console.log(`   Total flows documented: ${Object.keys(manifest.flows).length}`);

  // Generate PDF if screenshots exist
  const screenshotsDir = path.join(DOCS_DIR, "screenshots");
  if (fs.existsSync(screenshotsDir)) {
    const screenshotFiles = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
    if (screenshotFiles.length > 0) {
      console.log(`   Found ${screenshotFiles.length} screenshots`);
      generatePDF(documentation);
    } else {
      console.log("   No screenshots found, skipping PDF generation");
      console.log("   Run 'npx tsx docs/capture-screenshots.ts' to capture screenshots first");
    }
  } else {
    console.log("   Screenshots directory not found, skipping PDF generation");
    console.log("   Run 'npx tsx docs/capture-screenshots.ts' to create screenshots and capture them");
  }
}

generateDocumentation();
