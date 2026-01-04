# Brand Intelligence Configuration Platform

## Overview

This is a B2B SaaS configuration platform for marketing intelligence with enterprise-grade security. The application allows authenticated users to configure brand context, competitive sets, demand definitions, and strategic guardrails with AI-powered suggestions and persistent storage.

Key features:
- **Secure Authentication**: Sign in with Google, GitHub, Apple, or email via Replit Auth
- **AI-Powered Suggestions**: Generate configuration values using OpenAI (via Replit AI Integrations)
- **Persistent Storage**: PostgreSQL database for secure data persistence
- **8 Configuration Sections**: Brand Context, Category Definition, Competitive Set, Demand Definition, Strategic Intent, Channel Context, Negative Scope, and Governance
- **Full Auditability**: CMO-safe governance with human override tracking
- **One Pager Visualization**: Executive summary view of User Context Records (UCR) with sections A-H
- **DataForSEO Keyword Gap Analysis**: Competitor keyword gap analysis with UCR-based guardrails filtering
- **FON Architecture**: Module executors, playbook-based execution, and council-based strategic reasoning

## FON (Foundational Operational Network) Architecture

The platform implements a FON architecture for brand intelligence analysis:

### Module Executors (`server/modules/`)
- **Base Executor**: Abstract class providing standard output structure (hasData, confidence, insights, recommendations)
- **Registry**: Central registry for module executors
- **Time Decay**: Module-specific confidence decay based on data age
- **Implemented Modules** (7 total):
  - `market-demand`: Market demand and seasonality analysis
  - `keyword-gap`: SEO keyword gap and visibility analysis
  - `strategic-summary`: Cross-module synthesis for executive recommendations
  - `competitive-positioning`: Competitive landscape and positioning analysis
  - `content-performance`: Content effectiveness and engagement metrics
  - `pricing-intelligence`: Pricing strategy and competitor price analysis
  - `channel-attribution`: Marketing channel attribution and ROAS analysis

### Playbooks (`server/playbooks/`)
- **Loader**: JSON-based playbook configuration system
- **Executor**: Template-based processing for insights and recommendations
- **Playbook Configs**: Define processing steps, confidence factors, and insight templates

### Councils (`server/councils/`)
- **7 Councils**: Strategic Intelligence, SEO Visibility, Performance Media, Content Commerce, Product GTM, Ops Attribution, Growth Strategy
- **Reasoning**: OpenAI-powered strategic analysis from each council's perspective
- **Synthesis**: Unified recommendations from multiple council perspectives

### FON UI Components (`client/src/components/ui/`)
- `ConfidenceBar`: Visual confidence score indicator
- `InsightBlock`: Structured insight display with data_point, source, why_it_matters
- `RecommendationCard`: Priority-based action cards with effort/timeline
- `FreshnessIndicator`: Data age status (fresh/moderate/stale/expired) with warnings

### FON Pages (`client/src/pages/`)
- `dashboard.tsx`: Executive Intelligence Dashboard with charts (bar, line, pie, radar)
- `modules.tsx`: Individual module execution and results view

### FON API Routes
- `GET /api/fon/modules` - List all available modules
- `POST /api/fon/modules/:id/execute` - Execute a module
- `POST /api/fon/modules/:id/execute-with-council` - Execute with council reasoning
- `GET /api/fon/councils` - List all councils
- `POST /api/fon/councils/:id/reason` - Get council perspective

## User Preferences

Preferred communication style: Simple, everyday language.
Language: Spanish preferred for communication.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React Hook Form for form state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with hot module replacement
- **Authentication**: useAuth hook with Replit Auth integration

The frontend features:
- Landing page for unauthenticated users
- Section-based configuration wizard with persistent sidebar navigation
- AI generation buttons on each section for intelligent suggestions
- User avatar dropdown with logout functionality

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API with `/api` prefix
- **Authentication**: Replit Auth with OIDC (OpenID Connect), session-based with PostgreSQL storage
- **Validation**: Zod schemas shared between client and server (in `shared/schema.ts`)
- **Storage**: PostgreSQL database via Drizzle ORM
- **AI Integration**: OpenAI via Replit AI Integrations (no API key required)

### Database Schema
- **users**: User accounts from Replit Auth
- **sessions**: Session storage for authentication
- **configurations**: User configuration data (JSON columns for each section)
- **conversations/messages**: Chat storage (for future AI chat features)

### API Endpoints
- `GET/POST /api/configuration` - Protected configuration CRUD (user-scoped)
- `POST /api/ai/generate` - AI-powered section suggestions
- `GET /api/auth/user` - Current authenticated user
- `/api/login`, `/api/logout`, `/api/callback` - Auth flow
- `GET /api/keyword-gap/status` - Check DataForSEO configuration status
- `POST /api/keyword-gap/analyze` - Analyze keyword gap vs single competitor
- `POST /api/keyword-gap/compare-all` - Multi-competitor keyword gap analysis
- `POST /api/keyword-gap-lite/run` - Fast keyword gap with UCR guardrails and theme grouping
- `GET /api/keyword-gap-lite/cache` - View cache statistics
- `DELETE /api/keyword-gap-lite/cache` - Clear keyword cache

### Security Features
- All configuration routes protected with `isAuthenticated` middleware
- User-scoped data (each user sees only their own configurations)
- Session-based auth with PostgreSQL storage
- HTTPS-only cookies in production

## External Dependencies

### Database
- **PostgreSQL**: Primary database via Neon
- **Drizzle ORM**: Type-safe database queries
- **connect-pg-simple**: PostgreSQL session storage

### Authentication
- **openid-client**: OIDC protocol implementation
- **passport**: Authentication middleware
- **express-session**: Session management

### AI
- **OpenAI SDK**: AI completions (via Replit AI Integrations)
- Uses `gpt-4o` model for intelligent suggestions
- No API key required - uses Replit's integrated AI

### UI Libraries
- **Radix UI**: Headless component primitives
- **shadcn/ui**: Pre-styled component collection
- **Lucide React**: Icon library

### Form & Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **zod-validation-error**: Human-readable errors

### Fonts
- **IBM Plex Sans**: Primary UI font (Carbon Design System)
- **IBM Plex Mono**: Monospace font for code/JSON display

### DataForSEO Integration
- **server/dataforseo.ts**: Client with Basic Auth authentication
- **Keyword Gap Analysis**: Compare brand keywords vs competitors
- **UCR Guardrails**: Filter results based on excluded_categories, excluded_keywords, excluded_use_cases
- **Environment Variables**: DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD (optional)

### Keyword Gap Lite Module
- **server/keyword-gap-lite.ts**: Fast analysis with theme-based grouping
- **Normalization**: Domains (strip http/www/slash, lowercase) and keywords (lowercase, trim, collapse spaces)
- **24h TTL Cache**: In-memory cache keyed by (domain, location, language, limit)
- **Guardrails**: apply_exclusions() blocks on substring match, fence_check() evaluates against demand themes
- **Theme Groups**: Brand, Category, Problem/Solution, Product, Other
- **Status Badges**: Pass (valid), Warn (needs review), Block (excluded by guardrails)

## Recent Changes

- Added PostgreSQL database for persistent storage
- Integrated Replit Auth for secure authentication
- Added AI-powered "Generate with AI" buttons on configuration sections
- Created landing page for unauthenticated users
- User-scoped configurations (each user has their own data)
- Implemented 4-phase enhancement plan: validation framework, competitive intelligence, negative scope, context quality scoring
- Added One Pager visualization with A-H canonical schema sections
- Integrated DataForSEO Keyword Gap analysis with UCR-based guardrail filtering
- Added navigation icons (FileText, BarChart3) in configurations list for One Pager and Keyword Gap
- Added Version History with rollback capability for configuration versions
- Implemented Keyword Gap Lite module with theme-based grouping and UCR guardrails filtering
