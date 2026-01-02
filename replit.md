# Brand Intelligence Configuration Platform

## Overview

This is a B2B SaaS configuration platform for marketing intelligence. The application allows enterprise users to configure brand context, competitive sets, demand definitions, and strategic guardrails for marketing intelligence systems. It follows an enterprise-grade design system (Carbon/IBM-inspired) with robust form handling and governance controls.

The platform is a full-stack TypeScript application with a React frontend and Express backend, using in-memory storage that can be extended to PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Hook Form for form state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with hot module replacement

The frontend follows a section-based configuration wizard pattern with a persistent sidebar navigation. Each configuration section (Brand Context, Category Definition, Competitive Set, etc.) is a separate form component that shares state through React Hook Form's FormProvider.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API with `/api` prefix
- **Validation**: Zod schemas shared between client and server (in `shared/schema.ts`)
- **Storage**: Memory-based storage with interface abstraction for future database integration

The backend serves both the API and static files in production. Development uses Vite's dev server with proxy to Express.

### Data Flow
1. Configuration data flows from the form UI → React Hook Form → TanStack Query mutations → Express API → Storage layer
2. Zod schemas in `shared/schema.ts` provide type-safe validation on both client and server
3. The storage interface (`IStorage`) abstracts persistence, currently using `MemStorage` but designed for easy PostgreSQL migration via Drizzle ORM

### Key Design Decisions
- **Shared Schema Pattern**: Zod schemas are defined once in `shared/` and used for both TypeScript types and runtime validation on client and server
- **Section-Based Navigation**: The UI is organized into logical configuration sections with unsaved changes tracking and "CMO Safe" status indicators
- **Form-Heavy UX**: Extensive use of tag inputs, radio groups, sliders, and switches for complex nested configuration objects
- **Theme Support**: CSS variable-based theming with light/dark mode toggle persisted to localStorage

## External Dependencies

### Database
- **Drizzle ORM**: Configured for PostgreSQL but currently using in-memory storage
- **PostgreSQL**: Database schema defined in `shared/schema.ts`, requires `DATABASE_URL` environment variable when using Drizzle

### UI Libraries
- **Radix UI**: Headless component primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-styled component collection built on Radix
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **CMDK**: Command palette component

### Form & Validation
- **React Hook Form**: Form state management with `@hookform/resolvers` for Zod integration
- **Zod**: Schema validation and TypeScript type inference
- **zod-validation-error**: Human-readable validation error messages

### Fonts
- **IBM Plex Sans**: Primary UI font (loaded via Google Fonts CDN)
- **IBM Plex Mono**: Monospace font for code/JSON display