# 📚 Brand Intelligence Platform - Documentation

> Documentación técnica completa del Brand Intelligence Configuration Platform

---

## 🗂️ Estructura de Documentación

```
docs/
├── getting-started/     # 🚀 Para nuevos desarrolladores
├── architecture/        # 🏗️ Arquitectura técnica
├── specifications/      # 📋 Especificaciones formales
├── modules/             # 🔧 Sistema de módulos
├── features/            # ✨ Documentación por feature
├── guides/              # 📖 Guías prácticas
├── reference/           # 📚 Material de referencia
├── internal/            # 🔒 Docs internos/legacy
└── _tools/              # 🛠️ Scripts de documentación
```

---

## 🚀 Getting Started (Nuevos Desarrolladores)

| Documento | Descripción |
|-----------|-------------|
| [ONBOARDING.md](./getting-started/ONBOARDING.md) | Guía de onboarding para nuevos devs |
| [REPLIT.md](./getting-started/REPLIT.md) | Configuración del entorno Replit |

---

## 🏗️ Architecture (Arquitectura Técnica)

| Documento | Descripción |
|-----------|-------------|
| [OVERVIEW.md](./architecture/OVERVIEW.md) | Arquitectura Context-First del sistema |
| [COMPONENTS.md](./architecture/COMPONENTS.md) | Diagramas de componentes |
| [MODULE_SYSTEM.md](./architecture/MODULE_SYSTEM.md) | Sistema de contratos de módulos |

---

## 📋 Specifications (Especificaciones)

| Documento | Descripción |
|-----------|-------------|
| [UCR_SPEC.md](./specifications/UCR_SPEC.md) | Especificación del User Context Record |
| [KEYWORD_CLASSIFICATION.md](./specifications/KEYWORD_CLASSIFICATION.md) | Clasificación de keywords |

---

## 🔧 Modules (Sistema de Módulos)

| Documento | Descripción |
|-----------|-------------|
| [ADDING_MODULES.md](./modules/ADDING_MODULES.md) | Cómo agregar nuevos módulos |
| [MULTI_API_MODULES.md](./modules/MULTI_API_MODULES.md) | Módulos con múltiples APIs |
| [playbooks/](./modules/playbooks/) | Playbooks por categoría (SEO, Market, Synthesis) |

---

## ✨ Features (Documentación por Feature)

| Documento | Descripción |
|-----------|-------------|
| [KEYWORD_GAP.md](./features/KEYWORD_GAP.md) | Análisis de Keyword Gap |
| [keyword-gap-technical.md](./features/keyword-gap-technical.md) | Detalles técnicos de Keyword Gap |

---

## 📖 Guides (Guías Prácticas)

| Documento | Descripción |
|-----------|-------------|
| [DESIGN_GUIDELINES.md](./guides/DESIGN_GUIDELINES.md) | Guías de diseño UI/UX |

---

## 📚 Reference (Material de Referencia)

| Documento | Descripción |
|-----------|-------------|
| [MASTER_GUIDE.md](./reference/MASTER_GUIDE.md) | Guía maestra completa para desarrolladores |
| [SYSTEM_DOCUMENTATION.md](./reference/SYSTEM_DOCUMENTATION.md) | Documentación general del sistema |

---

## 🔒 Internal (Docs Internos)

| Documento | Descripción |
|-----------|-------------|
| [SYSTEM_AUDIT.md](./internal/SYSTEM_AUDIT.md) | Auditoría del sistema |
| [20-transformational-ideas.md](./internal/20-transformational-ideas.md) | Ideas de transformación |
| [notion_exports/](./internal/notion_exports/) | Exports de Notion (legacy) |

---

## 🛠️ Tools (Scripts de Documentación)

Los scripts de generación de documentación están en `_tools/`:

```bash
# Capturar screenshots
npx tsx docs/_tools/capture-screenshots.ts

# Generar documentación
npx tsx docs/_tools/generate-documentation.ts
```

---

## 📖 Uso de Herramientas de Documentación

### 1. Generar Documentación (sin screenshots)

```bash
npx tsx docs/_tools/generate-documentation.ts
```

Esto genera `SYSTEM_DOCUMENTATION.md` en la raíz del proyecto.

### 2. Capturar Screenshots Públicos

Primero, instala los navegadores de Playwright (solo la primera vez):

```bash
npx playwright install chromium
```

Luego ejecuta el script de captura:

```bash
npx tsx docs/capture-screenshots.ts
```

Esto captura automáticamente las pantallas públicas (landing page).

### 3. Screenshots de Pantallas Autenticadas

Para pantallas que requieren autenticación, sigue estos pasos:

1. Inicia sesión en la aplicación
2. Navega a cada pantalla
3. Usa las herramientas de desarrollo del navegador (F12 > Device toolbar)
4. Configura viewport a 1440x900
5. Toma captura de pantalla
6. Guarda en `docs/screenshots/` con el nombre correspondiente

#### Lista de Screenshots Requeridos

| Archivo | Pantalla |
|---------|----------|
| 01-landing.png | Landing Page |
| 02-configurations-list.png | Lista de Configuraciones |
| 03-config-brand.png | Configuración - Brand Context |
| 04-config-category.png | Configuración - Category Definition |
| 05-config-competitors.png | Configuración - Competitive Set |
| 06-config-demand.png | Configuración - Demand Definition |
| 07-config-intent.png | Configuración - Strategic Intent |
| 08-config-channels.png | Configuración - Channel Context |
| 09-config-negative.png | Configuración - Negative Scope |
| 10-config-governance.png | Configuración - Governance |
| 11-one-pager.png | One Pager - Vista Ejecutiva |
| 12-keyword-gap.png | Keyword Gap Analysis |
| 13-version-history.png | Historial de Versiones |

### 4. Generar Documentación con PDF

El script ahora genera automáticamente un PDF si hay screenshots disponibles:

```bash
npx tsx docs/generate-documentation.ts
```

Esto generará:
- `SYSTEM_DOCUMENTATION.md` - Documentación en formato Markdown
- `SYSTEM_DOCUMENTATION.pdf` - Documentación en formato PDF (si hay screenshots)

#### Requisitos para PDF

Para generar el PDF necesitas tener **pandoc** instalado:

**macOS:**
```bash
brew install pandoc
```

**Ubuntu/Debian:**
```bash
sudo apt-get install pandoc
```

**Windows:**
```bash
choco install pandoc
```

O descárgalo desde: https://pandoc.org/installing.html

Si pandoc no está disponible, el script generará solo el archivo Markdown y mostrará instrucciones para instalar pandoc.

### 5. Flujo Completo de Documentación

Para generar documentación completa con screenshots y PDF:

```bash
# 1. Configurar variables de entorno (solo primera vez)
cp .env.example .env
# Editar .env con tu DATABASE_URL y otras variables

# 2. Instalar navegadores (solo primera vez)
npx playwright install chromium

# 3. Iniciar servidor manualmente
npm run dev

# 4. Capturar screenshots públicos (en otra terminal)
npx tsx docs/capture-screenshots.ts

# 5. Capturar screenshots autenticados (manual)
# - Inicia sesión en la app
# - Navega a cada pantalla
# - Toma capturas en 1440x900
# - Guarda en docs/screenshots/

# 6. Generar documentación completa
npx tsx docs/generate-documentation.ts
```

### 6. Solución de Problemas

**Error: DATABASE_URL must be set**
- Copia `.env.example` a `.env`
- Configura tu `DATABASE_URL` con tu conexión PostgreSQL

**Error: Server not running**
- Asegúrate que el servidor está corriendo en `http://localhost:5000`
- Ejecuta `npm run dev` en una terminal

**Error: pandoc not found**
- Instala pandoc para generar PDFs
- Si no tienes pandoc, el script generará solo Markdown

**Error: NODE_ENV no se reconoce como comando**
- Esto es un problema de Windows con variables de entorno
- Ahora usamos `cross-env` para solucionarlo
- Ejecuta: `npm run dev` (debería funcionar ahora)

**Error: Acceso denegado al instalar pandoc**
- Ejecuta el script de instalación sin admin:
  ```bash
  powershell -ExecutionPolicy Bypass -File docs/install-pandoc.ps1
  ```
- O descarga pandoc manualmente desde https://pandoc.org/installing.html

## Manifiesto de Pantallas

El archivo `screens-manifest.json` contiene:

- **metadata**: Información del proyecto y versión
- **screens**: Lista de pantallas con:
  - `id`: Identificador único
  - `name`: Nombre para mostrar
  - `route`: Ruta de la aplicación
  - `requiresAuth`: Si requiere autenticación
  - `description`: Descripción funcional
  - `technicalNotes`: Notas técnicas de implementación
  - `flow`: Flujo de usuario al que pertenece
  - `screenshotFile`: Nombre del archivo de captura
- **flows**: Definición de flujos de usuario
- **technicalArchitecture**: Stack tecnológico

## Personalización

Para agregar nuevas pantallas:

1. Edita `screens-manifest.json`
2. Agrega la entrada en el array `screens`
3. Ejecuta el generador de documentación
4. Captura el screenshot correspondiente
