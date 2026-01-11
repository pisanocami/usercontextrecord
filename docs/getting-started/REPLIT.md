# Brand Intelligence Configuration Platform

## Overview
This B2B SaaS platform provides marketing intelligence configuration with enterprise-grade security. It enables authenticated users to configure brand context, competitive sets, and demand definitions using AI-powered suggestions. The platform ensures CMO-safe governance with auditability, executive summary views, and advanced features like competitor keyword gap analysis. Its vision is to be a comprehensive tool for strategic marketing intelligence, offering detailed insights and actionable recommendations to enhance brand performance and market understanding.

## User Preferences
Preferred communication style: Simple, everyday language.
Language: Spanish preferred for communication.

## System Architecture
The platform is built with a clear separation of concerns, using React 18 with TypeScript, Tailwind CSS, and `shadcn/ui` for a responsive frontend, and Express.js with TypeScript for a RESTful JSON API backend.

### UI/UX Decisions
The frontend features a modern design with light/dark mode support, section-based configuration wizards, persistent navigation, and an executive summary visualization.

### Technical Implementations
- **Frontend**: React 18, Wouter for routing, TanStack React Query for server state, React Hook Form, Vite.
- **Backend**: Express.js with TypeScript, RESTful JSON API.
- **Authentication**: Replit Auth with OIDC, session-based using PostgreSQL.
- **Data Storage**: PostgreSQL managed by Drizzle ORM.
- **AI Integration**: OpenAI via Replit AI Integrations (`gpt-4o`) for suggestions and content generation.
- **Validation**: Zod schemas for shared client/server validation.
- **Keyword Gap Analysis**: Multi-provider architecture (DataForSEO, Ahrefs) with a factory pattern, including a "Keyword Gap Lite" module for classified analysis with configurable scoring.
- **Security**: Authentication middleware protects sensitive routes, ensuring user-scoped data access and HTTPS-only cookies.
- **Module System**: Consolidates module definitions (`shared/module.contract.ts`) for UCR sections, module contracts, dispositions, severity levels, and traces.
- **Version Control**: Full version history with side-by-side diffs, path tracking, and restore capabilities for UCR configurations.
- **Automated Alerts**: Proactive notification infrastructure for UCR-relevant events with user-configurable preferences.
- **AI Content Brief Generator**: Generates 5 types of content briefs (SEO Article, Ad Copy, Landing Page, Email Campaign, Social Media) contextualized by UCR, including guardrail validation against negative scope.
- **SWOT Competitive Analyzer**: Provides strategic analysis using Keyword Gap data (algorithmic) or AI fallback (UCR-contextualized) with 2x2 grid visualization.
- **Competitive Intelligence Dashboard**: Real-time competitive radar detecting competitor movements, ranking shifts, and market changes with AI-generated insights and a weekly digest.
- **Multi-API Intelligence Modules**: Five advanced modules (Intent Positioning, SERP + Trends + Social, Demand Forecasting, Cross-Channel Messaging, SERP + Attribution) combine multiple external APIs following a 5-phase pipeline (Extract→Transform→Correlate→Score→Disposition) with graceful degradation.

### System Design Choices
The architecture emphasizes modularity, type safety (TypeScript, Zod, Drizzle ORM), and component-based UI development. It supports flexible integration of various SEO data sources and adaptable scoring systems for different industry verticals.

## External Dependencies
- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM
- **Authentication**: `openid-client`, `passport`, `express-session`, `connect-pg-simple`
- **AI**: OpenAI SDK (via Replit AI Integrations)
- **UI Libraries**: Radix UI, shadcn/ui, Lucide React
- **Form & Validation**: React Hook Form, Zod
- **Fonts**: IBM Plex Sans, IBM Plex Mono
- **Keyword Data Providers**: DataForSEO, Ahrefs
- **Trends Data Providers**: DataForSEO Google Trends API