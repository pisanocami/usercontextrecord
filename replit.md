# Brand Intelligence Configuration Platform

## Overview

This is a B2B SaaS configuration platform for marketing intelligence with enterprise-grade security. It enables authenticated users to configure brand context, competitive sets, demand definitions, and strategic guardrails using AI-powered suggestions and persistent storage. The platform aims to provide CMO-safe governance with auditability and an executive summary view of configurations, alongside advanced features like competitor keyword gap analysis.

## User Preferences

Preferred communication style: Simple, everyday language.
Language: Spanish preferred for communication.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript, styled with Tailwind CSS and `shadcn/ui` components for a modern, responsive design with light/dark mode support. It features a section-based configuration wizard with persistent navigation, AI generation buttons, and an executive summary visualization.

### Technical Implementations
- **Frontend**: React 18, Wouter for routing, TanStack React Query for server state, React Hook Form for form management, Vite for building.
- **Backend**: Express.js with TypeScript, RESTful JSON API.
- **Authentication**: Replit Auth with OIDC, session-based using PostgreSQL.
- **Data Storage**: PostgreSQL database managed by Drizzle ORM.
- **AI Integration**: OpenAI via Replit AI Integrations (no API key required), utilizing `gpt-4o` for suggestions.
- **Validation**: Zod schemas for shared client/server validation.
- **Keyword Gap Analysis**: Multi-provider architecture supporting DataForSEO and Ahrefs, with a factory pattern for provider selection. Includes a "Keyword Gap Lite" module for fast, classified analysis with configurable scoring and UCR-based guardrails.
- **Security**: All sensitive routes are protected with authentication middleware, ensuring user-scoped data access and HTTPS-only cookies in production.

### Feature Specifications
- **8 Configuration Sections**: Brand Context, Category Definition, Competitive Set, Demand Definition, Strategic Intent, Channel Context, Negative Scope, and Governance.
- **AI-Powered Suggestions**: Integrated "Generate with AI" functionality across configuration sections.
- **One Pager Visualization**: Executive summary view of User Context Records (UCR).
- **Keyword Gap Analysis**: Comprehensive competitor keyword analysis with UCR-based filtering and a 3-tier classification system (Pass, Review, Out of Play) based on capability and opportunity scoring. Features include intent classification, configurable scoring models, vertical presets, and detailed result breakdowns with confidence levels.
- **Market Demand & Seasonality Module**: Timing intelligence using Google Trends data via DataForSEO. Answers "When does our market wake up - and when should we act?" with **per-category analysis** showing individual seasonality patterns for each category (Peak/Low months, stability scores, heatmaps). Features include:
  - Per-category analysis via `/api/market-demand/analyze-by-category` endpoint
  - CategoryDemandCard grid showing individual category metrics
  - In-memory cache with 24h TTL keyed by configId+category+queries+country+timeRange
  - Backward compatibility for legacy aggregated analyses (shown with "Legacy Analysis" badge)
  - Types: `CategoryDemandSlice`, `MarketDemandByCategoryResult`, `Month` (heatmap keys)
- **Item-Level Traces**: Every keyword carries an ItemTrace array with ruleId, ucrSection, reason, severity, and evidence for complete CMO-safe auditability. Traces are displayed in expandable table rows.
- **CMO-Safe Gate Order**: Keyword evaluation follows strict gate order - G (Negative Scope) hard gate first, then B (Category Fence) soft gate, then H (Scoring), finally E/F (Strategic/Channel) with proper early returns.
- **Context Workflow**: State machine for managing context lifecycle (DRAFT_AI to LOCKED) with validation gates and approval workflows.
- **Module Contract System**: Consolidated module definitions in `shared/module.contract.ts` - single source of truth for UCR sections, module contracts, dispositions, severity levels, and traces. Module IDs use domain-specific prefixes (seo.*, market.*, sem.*) for semantic clarity. Legacy aliases (signal.*, action.*, synthesis.*) are maintained in module-runner.ts for backward compatibility.
- **Category Demand Trend Module** (`market.category_demand_trend.v1`): Analyzes 5-year demand trends by category. Features CAGR calculation (only with ≥4.5 years data), linear regression slope analysis, trend classification (growing/stagnating/declining), seasonality peak detection, and timing recommendations. Implementation file: `server/modules/category-demand-trend.ts`.
  - **Known Limitation**: `supporting_queries` provides category-level slopes rather than per-query differentiation due to the MarketDemandAnalyzer's aggregation architecture. Future enhancement would require exposing per-query trend series from the analyzer.

### System Design Choices
The architecture emphasizes modularity with clear separation of concerns (frontend/backend, data providers). It leverages modern web development best practices including type safety (TypeScript, Zod, Drizzle ORM) and component-based UI development. The multi-provider keyword gap architecture allows for flexible integration of various SEO data sources, and the configurable scoring system provides adaptability for different industry verticals.

## External Dependencies

- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM
- **Authentication**: `openid-client`, `passport`, `express-session`, `connect-pg-simple` (for PostgreSQL session storage)
- **AI**: OpenAI SDK (via Replit AI Integrations)
- **UI Libraries**: Radix UI, shadcn/ui, Lucide React (icons)
- **Form & Validation**: React Hook Form, Zod, `zod-validation-error`
- **Fonts**: IBM Plex Sans, IBM Plex Mono
- **Keyword Data Providers**: DataForSEO, Ahrefs (integrated through a factory pattern)
- **Trends Data Providers**: DataForSEO Google Trends API (for Market Demand module)