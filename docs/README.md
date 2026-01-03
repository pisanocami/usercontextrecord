# Sistema de Documentación

Este directorio contiene herramientas para generar documentación automatizada del Brand Intelligence Configuration Platform.

## Estructura

```
docs/
├── README.md                    # Este archivo
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

### 4. Regenerar Documentación con Screenshots

Después de agregar los screenshots:

```bash
npx tsx docs/generate-documentation.ts
```

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
