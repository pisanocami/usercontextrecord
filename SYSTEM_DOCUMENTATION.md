# Brand Intelligence Configuration Platform

> Documentación del Sistema - Versión 1.0.0
>
> Generado automáticamente: 2026-01-03T03:22:19.366Z

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

Brand Intelligence Configuration Platform es una plataforma B2B SaaS de configuración de inteligencia de marca con seguridad empresarial. Permite a usuarios autenticados configurar contexto de marca, conjuntos competitivos, definiciones de demanda y guardrails estratégicos con sugerencias impulsadas por IA y almacenamiento persistente.

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
| framework | React 18 + TypeScript |
| routing | Wouter |
| state | TanStack React Query v5 |
| forms | React Hook Form + Zod |
| ui | shadcn/ui + Radix UI + Tailwind CSS |
| icons | Lucide React |

### Backend
| Componente | Tecnología |
|------------|------------|
| framework | Express.js + TypeScript |
| database | PostgreSQL via Drizzle ORM |
| auth | Replit Auth (OIDC) + Passport |
| sessions | express-session + connect-pg-simple |
| ai | OpenAI gpt-4o via Replit AI Integrations |

### Diagrama de Arquitectura

```
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
```

---

## Flujos de Usuario


### Flujo de Entrada

Usuario llega a la aplicación, ve landing page, se autentica.

**Pantallas involucradas:**
- Landing Page


### Flujo Principal

Usuario autenticado gestiona sus configuraciones desde el dashboard.

**Pantallas involucradas:**
- Lista de Configuraciones


### Flujo de Configuración

Usuario crea/edita configuración navegando por las 8 secciones del wizard.

**Pantallas involucradas:**
- Configuración - Brand Context
- Configuración - Category Definition
- Configuración - Competitive Set
- Configuración - Demand Definition
- Configuración - Strategic Intent
- Configuración - Channel Context
- Configuración - Negative Scope
- Configuración - Governance


### Flujo de Visualización

Usuario visualiza resumen ejecutivo de la configuración.

**Pantallas involucradas:**
- One Pager - Vista Ejecutiva


### Flujo de Análisis

Usuario ejecuta análisis de keyword gap contra competidores.

**Pantallas involucradas:**
- Keyword Gap Analysis


### Flujo de Gestión

Usuario gestiona versiones y realiza rollback si es necesario.

**Pantallas involucradas:**
- Historial de Versiones


---

## Pantallas del Sistema


### Landing Page

**Ruta:** `/`
**Requiere Autenticación:** No
**Flujo:** Flujo de Entrada

#### Descripción
Página de inicio para usuarios no autenticados. Muestra el valor del producto y opciones de acceso.

#### Notas Técnicas
Renderizada por LandingPage.tsx cuando el usuario no está autenticado. Usa useAuth() hook para detectar estado de sesión.

_Screenshot pendiente de captura_

---


### Lista de Configuraciones

**Ruta:** `/`
**Requiere Autenticación:** Sí
**Flujo:** Flujo Principal

#### Descripción
Dashboard principal que muestra todas las configuraciones del usuario. Permite crear nuevas, editar existentes, ver One Pager, acceder a Keyword Gap y gestionar versiones.

#### Notas Técnicas
Componente ConfigurationsList.tsx. Usa TanStack Query para fetch de /api/configurations. Soporta modo anónimo y autenticado.

_Screenshot pendiente de captura_

---


### Configuración - Brand Context

**Ruta:** `/configuration/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Configuración

#### Descripción
Sección A del wizard. Define identidad de marca: nombre, dominio, industria, misión, propuestas de valor únicas y personalidad.

#### Notas Técnicas
Sección del wizard en Configuration.tsx. Datos validados con Zod schema. Soporta generación AI via POST /api/ai/generate.

_Screenshot pendiente de captura_

---


### Configuración - Category Definition

**Ruta:** `/configuration/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Configuración

#### Descripción
Sección B. Define la categoría de mercado: categoría primaria, tamaño de mercado, madurez y tendencias.

#### Notas Técnicas
Validación de campos requeridos. Campo primary_category utilizado para AI auto-detection basado en el dominio.

_Screenshot pendiente de captura_

---


### Configuración - Competitive Set

**Ruta:** `/configuration/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Configuración

#### Descripción
Sección C. Define competidores directos e indirectos con dominios, descripciones y fortalezas/debilidades.

#### Notas Técnicas
Datos usados por Keyword Gap Analysis. Validación de dominios. Máximo recomendado: 5 competidores directos + 5 indirectos.

_Screenshot pendiente de captura_

---


### Configuración - Demand Definition

**Ruta:** `/configuration/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Configuración

#### Descripción
Sección D. Define audiencias objetivo, journey stages, pain points, intención de búsqueda y temas de demanda.

#### Notas Técnicas
Campo 'themes' usado por Keyword Gap Lite para fence_check() y asignación de temas a keywords.

_Screenshot pendiente de captura_

---


### Configuración - Strategic Intent

**Ruta:** `/configuration/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Configuración

#### Descripción
Sección E. Define objetivos estratégicos, KPIs, mensajes clave, tono de comunicación y diferenciadores.

#### Notas Técnicas
Campos in_scope_concepts usados para validación de guardrails en análisis de keywords.

_Screenshot pendiente de captura_

---


### Configuración - Channel Context

**Ruta:** `/configuration/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Configuración

#### Descripción
Sección F. Define canales primarios, secundarios, requisitos por canal y estrategia de distribución.

#### Notas Técnicas
Usado para contextualizar recomendaciones de contenido y priorización de keywords por canal.

_Screenshot pendiente de captura_

---


### Configuración - Negative Scope

**Ruta:** `/configuration/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Configuración

#### Descripción
Sección G. Define exclusiones: categorías prohibidas, keywords bloqueados, casos de uso excluidos, tonos inapropiados.

#### Notas Técnicas
Campos críticos para guardrails UCR. apply_exclusions() usa estos valores para filtrar keywords en análisis.

_Screenshot pendiente de captura_

---


### Configuración - Governance

**Ruta:** `/configuration/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Configuración

#### Descripción
Sección H. Define reglas de gobernanza, flujos de aprobación, políticas de compliance y tracking de override.

#### Notas Técnicas
Soporte para audit trail de modificaciones manuales vs. generadas por AI. CMO-safe por diseño.

_Screenshot pendiente de captura_

---


### One Pager - Vista Ejecutiva

**Ruta:** `/one-pager/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Visualización

#### Descripción
Resumen ejecutivo de la configuración UCR. Muestra secciones A-H en formato compacto para presentación a stakeholders.

#### Notas Técnicas
Componente OnePager.tsx. Renderiza datos de configuración en Cards con iconos de sección. Imprimible.

_Screenshot pendiente de captura_

---


### Keyword Gap Analysis

**Ruta:** `/keyword-gap/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Análisis

#### Descripción
Análisis de brecha de keywords vs competidores. Incluye análisis individual, Compare All, y Keyword Gap Lite con agrupación temática.

#### Notas Técnicas
Integración DataForSEO. Endpoints: /api/keyword-gap/analyze, /api/keyword-gap/compare-all, /api/keyword-gap-lite/run. Cache 24h.

_Screenshot pendiente de captura_

---


### Historial de Versiones

**Ruta:** `/version-history/:id`
**Requiere Autenticación:** Sí
**Flujo:** Flujo de Gestión

#### Descripción
Historial completo de versiones de la configuración con capacidad de rollback a versiones anteriores.

#### Notas Técnicas
Tabla configuration_versions en PostgreSQL. Endpoints: GET /api/configurations/:id/versions, POST rollback.

_Screenshot pendiente de captura_

---


## Endpoints API

### Configuraciones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/configurations` | Lista todas las configuraciones del usuario |
| POST | `/api/configurations` | Crea nueva configuración |
| GET | `/api/configurations/:id` | Obtiene configuración por ID |
| PUT | `/api/configurations/:id` | Actualiza configuración |
| DELETE | `/api/configurations/:id` | Elimina configuración |

### Versiones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/configurations/:id/versions` | Lista versiones de una configuración |
| POST | `/api/configurations/:id/versions/:versionId/rollback` | Restaura versión anterior |

### Generación AI
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/ai/generate` | Genera contenido para una sección |
| POST | `/api/ai/generate-all` | Genera todas las secciones |

### Keyword Gap
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/keyword-gap/status` | Verifica configuración DataForSEO |
| POST | `/api/keyword-gap/analyze` | Analiza gap vs un competidor |
| POST | `/api/keyword-gap/compare-all` | Compara vs todos los competidores |
| POST | `/api/keyword-gap-lite/run` | Análisis rápido con guardrails |
| GET | `/api/keyword-gap-lite/cache` | Estadísticas de cache |
| DELETE | `/api/keyword-gap-lite/cache` | Limpia cache |

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/auth/user` | Usuario actual |
| GET | `/api/login` | Inicia flujo de login |
| GET | `/api/logout` | Cierra sesión |
| GET | `/api/callback` | Callback OAuth |

---

## Registro de Módulos (UCR Contracts)

El sistema utiliza un sistema de contratos para definir qué secciones del UCR requiere cada módulo de análisis.

| Módulo | Categoría | Secciones Requeridas | Propósito Estratégico |
|--------|-----------|----------------------|-----------------------|
| Keyword Gap & Visibility | SEO Signal | A, B, C | What high-intent demand are competitors capturing today that we are structurally positioned to pursue? |
| Category Demand Trend (5-Year) | Market Trends | A, B | Is this a category worth being in, and is demand expanding or contracting? |
| Brand Attention & Share of Search | Brand Signal | A, B, C | What part of the market's mind is ours? |
| Market Demand & Seasonality | Market Intelligence | D, H | When does our market actually wake up — and when should we act? |

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
- Middleware `isAuthenticated` protege rutas sensibles
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
