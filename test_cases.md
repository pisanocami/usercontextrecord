# Casos de Prueba para UserContextRecord

Este documento detalla los casos de prueba sugeridos para el proyecto UserContextRecord, basados en la configuración BYOK con Claude. Incluye pruebas para componentes React, APIs y integraciones MCP.

## 1. Pruebas de Componentes React con BYOK Claude

### 🎯 CompetitorSetBlock Component
- **Descripción**: Pruebas para renderizado y funcionalidad del componente.
- **Casos de Prueba**:
  - Renderizado de competidores por tiers (Direct, Adjacent, Aspirational).
  - Funcionalidad de aprobación/rechazo de competidores.
  - Cálculo de evidence strength.
  - Validación de size mismatch warnings.
  - Integración con formularios React Hook Form.

### 🔍 Evidence Pack Testing
- **Descripción**: Pruebas para el componente EvidencePackCard.
- **Casos de Prueba**:
  - Cálculo correcto de strength percentage.
  - Renderizado de SERP overlap, Size Match y Similarity scores.
  - Manejo de estados sin evidencia vs con evidencia completa.

## 2. Pruebas de API Backend con Claude

### 🌐 Competitor Search API
- **Descripción**: Pruebas para la función searchCompetitorsWithGemini en routes.ts.
- **Casos de Prueba**:
  - Integración correcta con Google Search grounding.
  - Parsing de respuestas JSON de Gemini.
  - Fallback a GPT-4o cuando Gemini falla.
  - Normalización de dominios de competidores.

### 📊 Configuration Validation
- **Descripción**: Pruebas para validateConfiguration.
- **Casos de Prueba**:
  - Validación de campos requeridos (domain, primary_category).
  - Cálculo de quality scores.
  - Estados de configuración (blocked, incomplete, needs_review, complete).
  - Generación de context hash.

## 3. Pruebas de Integración con Herramientas MCP

### 🔍 Búsqueda Web con Fetch + Claude
- **Descripción**: Pruebas para fetch con Claude.
- **Casos de Prueba**:
  - Búsqueda de información web y validación de resultados.

### 🧠 Análisis de Competidores con Memory + Claude
- **Descripción**: Pruebas para memory con Claude.
- **Casos de Prueba**:
  - Análisis de competidores y almacenamiento en memoria.

### 🤖 Automatización con Playwright + Claude
- **Descripción**: Pruebas para mcp-playwright con Claude.
- **Casos de Prueba**:
  - Navegación a páginas de competidores y extracción de datos.

## 4. Pruebas de Funcionalidad Específica del Dominio

### 📈 Quality Score Calculation
- **Descripción**: Pruebas para calculateQualityScore.
- **Casos de Prueba**:
  - Cálculo de completeness, competitor confidence, negative strength y evidence coverage.

### 🏷️ Tier Classification Logic
- **Descripción**: Pruebas para TIER_CONFIG.
- **Casos de Prueba**:
  - Clasificación correcta de competidores por tier.
  - Renderizado de iconos y colores.
  - Validación de funding stage mismatches.

## 5. Pruebas End-to-End con BYOK

### 🔄 Flujo Completo de Configuración
- **Descripción**: Pruebas para el flujo completo de configuración.
- **Casos de Prueba**:
  - Creación de configuración desde POST /api/brands hasta generación de competidores.

### 🎯 Prueba de Regeneración de Competidores
- **Descripción**: Pruebas para handleRegenerate.
- **Casos de Prueba**:
  - Llamada a AI generate y procesamiento de sugerencias.

## 6. Pruebas de Rendimiento

### ⚡ Pruebas de Carga con Claude
- **Descripción**: Pruebas de rendimiento.
- **Casos de Prueba**:
  - Búsqueda simultánea de competidores.
  - Validación de configuraciones complejas.

## 7. Pruebas Inmediatas

### 🎯 Prueba 1 - Análisis de Código
- **Descripción**: Análisis de getEvidenceStrength.

### 🔍 Prueba 2 - Búsqueda de Información
- **Descripción**: Búsqueda con Claude.

### 🤔 Prueba 3 - Razonamiento Secuencial
- **Descripción**: Uso de sequential thinking para testing.
