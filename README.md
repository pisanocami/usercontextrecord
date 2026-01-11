# 🧠 Brand Intelligence Configuration Platform

> Plataforma B2B SaaS de configuración de inteligencia de marca con seguridad empresarial

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

---

## 🚀 Quick Start

```bash
# 1. Clonar e instalar
git clone <repository-url>
cd usercontextrecord
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Abrir en navegador
# http://localhost:5000
```

---

## 📚 Documentación

Toda la documentación está organizada en el directorio `docs/`:

| Sección | Descripción | Link |
|---------|-------------|------|
| 🚀 **Getting Started** | Para nuevos desarrolladores | [docs/getting-started/](./docs/getting-started/) |
| 🏗️ **Architecture** | Arquitectura técnica | [docs/architecture/](./docs/architecture/) |
| 📋 **Specifications** | Especificaciones formales | [docs/specifications/](./docs/specifications/) |
| 🔧 **Modules** | Sistema de módulos | [docs/modules/](./docs/modules/) |
| ✨ **Features** | Documentación por feature | [docs/features/](./docs/features/) |
| 📖 **Guides** | Guías prácticas | [docs/guides/](./docs/guides/) |
| 📚 **Reference** | Material de referencia | [docs/reference/](./docs/reference/) |

**👉 Nuevo desarrollador? Empieza aquí:** [docs/getting-started/ONBOARDING.md](./docs/getting-started/ONBOARDING.md)

---

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Data Layer    │
│   React + TS    │◄──►│   Express.js    │◄──►│   PostgreSQL    │
│   shadcn/ui     │    │   25+ Modules   │    │   Drizzle ORM   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Stack Tecnológico:**
- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui, React Query
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **AI**: OpenAI GPT-4o
- **APIs**: DataForSEO, Ahrefs

---

## 📁 Estructura del Proyecto

```
usercontextrecord/
├── client/              # Frontend React
│   └── src/
│       ├── components/  # Componentes UI
│       ├── pages/       # Páginas/rutas
│       └── hooks/       # Custom hooks
├── server/              # Backend Express
│   ├── routes.ts        # Endpoints API
│   ├── module-runner.ts # Ejecutor de módulos
│   └── modules/         # Implementaciones
├── shared/              # Código compartido
│   ├── schema.ts        # Tipos y validación
│   └── module.contract.ts # Contratos de módulos
└── docs/                # Documentación
```

---

## 🔧 Scripts Disponibles

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run lint       # Verificar código
npm run db:push    # Sincronizar schema con DB
npm run db:studio  # Abrir Drizzle Studio
```

---

## 🔐 Variables de Entorno

```env
# Requeridas
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...

# Opcionales (para features específicas)
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...
AHREFS_API_KEY=...
```

---

## 📄 Licencia

Propietario - Todos los derechos reservados.

---

*Para más información, consulta la [documentación completa](./docs/README.md).*
