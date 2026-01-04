# Screenshots Directory

This directory contains screenshots for the system documentation.

## Screenshots Required

| File | Screen | Status |
|-------|--------|--------|
| 01-landing.png | Landing Page | ❌ Missing |
| 02-configurations-list.png | Lista de Configuraciones | ❌ Missing |
| 03-config-brand.png | Configuración - Brand Context | ❌ Missing |
| 04-config-category.png | Configuración - Category Definition | ❌ Missing |
| 05-config-competitors.png | Configuración - Competitive Set | ❌ Missing |
| 06-config-demand.png | Configuración - Demand Definition | ❌ Missing |
| 07-config-intent.png | Configuración - Strategic Intent | ❌ Missing |
| 08-config-channels.png | Configuración - Channel Context | ❌ Missing |
| 09-config-negative.png | Configuración - Negative Scope | ❌ Missing |
| 10-config-governance.png | Configuración - Governance | ❌ Missing |
| 11-one-pager.png | One Pager - Vista Ejecutiva | ❌ Missing |
| 12-keyword-gap.png | Keyword Gap Analysis | ❌ Missing |
| 13-version-history.png | Historial de Versiones | ❌ Missing |

## How to Capture Screenshots

### Option 1: Automatic (Public Screens Only)
```bash
# Start server first
docs/start-server.bat

# Then in another terminal
npx tsx docs/capture-screenshots.ts
```

### Option 2: Manual (All Screens)
1. Start the application: `docs/start-server.bat`
2. Open browser and navigate to http://localhost:5000
3. Log in to the application
4. Navigate to each screen listed above
5. Take screenshots at 1440x900 resolution
6. Save with the exact filename specified

### Option 3: Use Browser DevTools
1. Open Developer Tools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Set dimensions to 1440x900
4. Take screenshots using the screenshot tool
