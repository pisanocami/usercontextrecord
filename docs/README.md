# Documentación FON Platform

Este directorio contiene la documentación técnica del Brand Intelligence Configuration Platform (FON).

---

## Índice de Documentación

### Documentación Principal

| Documento | Descripción |
|-----------|-------------|
| [SYSTEM_DOCUMENTATION.md](../SYSTEM_DOCUMENTATION.md) | Documentación general del sistema |
| [CONTEXT_MODULE_ARCHITECTURE.md](../CONTEXT_MODULE_ARCHITECTURE.md) | Arquitectura Context-First |
| [KEYWORD_GAP_ANALYSIS.md](../KEYWORD_GAP_ANALYSIS.md) | Documentación de Keyword Gap |
| [OOFOS_CASE_STUDY.md](../OOFOS_CASE_STUDY.md) | Caso de estudio DTC footwear |

### Documentación Técnica

| Documento | Descripción |
|-----------|-------------|
| [MODULE_CONTRACTS.md](./MODULE_CONTRACTS.md) | Sistema de contratos de módulos |
| [UCR_SPECIFICATION.md](./UCR_SPECIFICATION.md) | Especificación del User Context Record |

### Configuración

| Documento | Descripción |
|-----------|-------------|
| [replit.md](../replit.md) | Configuración del proyecto Replit |
| [design_guidelines.md](../design_guidelines.md) | Guías de diseño UI/UX |

---

## Estructura del Directorio

```
docs/
├── README.md                    # Este archivo (índice)
├── MODULE_CONTRACTS.md          # Sistema de contratos de módulos
├── UCR_SPECIFICATION.md         # Especificación del UCR
├── screens-manifest.json        # Registro de pantallas y metadatos
├── capture-screenshots.ts       # Script de captura de screenshots
├── generate-documentation.ts    # Generador de documentación Markdown
└── screenshots/                 # Capturas de pantalla
    ├── 01-landing.png
    ├── 02-configurations-list.png
    └── ...
```

## Uso

### 1. Generar Documentación (sin screenshots)

```bash
npx tsx docs/generate-documentation.ts
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
