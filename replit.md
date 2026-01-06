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

### Multi-Provider Keyword Gap Architecture
- **server/keyword-data-provider.ts**: Abstract provider interface with factory pattern
- **server/providers/**: Provider implementations directory
  - **dataforseo-provider.ts**: DataForSEO domain_intersection endpoint, Basic Auth
  - **ahrefs-provider.ts**: Ahrefs organic-keywords endpoint, Bearer token auth, 7-day cache TTL
- **Factory Pattern**: `getProvider(name)` returns appropriate provider instance
- **Common Interface**: `GapResult`, `GapKeyword`, `RankedKeywordsResult` types

### DataForSEO Provider
- **Endpoint**: POST /v3/dataforseo_labs/google/domain_intersection/live
- **Authentication**: Basic Auth (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD)
- **UCR Guardrails**: Filter results based on excluded_categories, excluded_keywords, excluded_use_cases

### Ahrefs Provider
- **Endpoint**: GET /v3/site-explorer/organic-keywords
- **Authentication**: Bearer token (AHREFS_API_KEY)
- **Gap Computation**: In-memory (competitor_keywords - client_keywords)
- **Cache**: 7-day TTL, keyed by (domain, country, limit)
- **Limits**: 2000 keywords/domain, position ≤ 20 for competitors, ≤ 100 for client
- **Filters**: minVolume = 100, maxKd = 60
- **Fields**: keyword, best_position, volume, keyword_difficulty, cpc (no traffic field)

### Keyword Gap Lite Module
- **server/keyword-gap-lite.ts**: Fast analysis with 3-tier classification system
- **Multi-Provider Support**: `provider` parameter accepts "dataforseo" or "ahrefs"
- **Normalization**: Domains (strip http/www/slash, lowercase) and keywords (lowercase, trim, collapse spaces)
- **Competitor Extraction**: From UCR `config.competitors.competitors[]` array, tier1 + tier2 only
- **3-Tier Classification**:
  - **Pass** (≥60% capability): High-fit keywords ready to target
  - **Review** (30-60% capability): Medium-fit keywords for human evaluation
  - **Out of Play** (<30% capability, competitor brands, size variants): Filtered keywords
- **Intent Classification**: Deterministic regex patterns (category_capture, problem_solution, product_generic, brand_capture, variant_or_size)
- **Scoring System (v3.1)**: opportunityScore = volume × cpc × intentWeight × capabilityScore × difficultyFactor × positionFactor
- **Configurable Capability Model**: UCR can define boosters/penalties arrays for vertical-specific capability scoring
- **Configurable Scoring Thresholds**: pass_threshold (default 0.60), review_threshold (default 0.30), difficulty_weight, position_weight
- **Vertical Presets**: capability-presets.ts contains DTC footwear (0.55), retail big box (0.65), B2B SaaS (0.50) configurations
- **Confidence Levels**: Each keyword result includes high/medium/low confidence based on capability proximity to thresholds
- **Competitor Brand Detection**: Extracts from UCR competitors + common footwear brands (with stopword filtering)
- **UI (v3.1)**: 3-tab layout with Executive Summary Card (missing value, top themes, competitor ownership), Reason/Confidence/KD columns

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
- Added Context Validation Council: automated validator with weighted scoring and approval workflow
- Enhanced AI competitor generation: now includes "why" reasoning for each suggested competitor
- Keyword Gap Lite improvements: filters applied badge, context version tracking, borderline bucket for human review
- **Keyword Gap Lite 3-Tier Rewrite**: Complete rewrite with pass/review/out_of_play classification, capability scoring (0-1), opportunity scoring (volume × cpc × intent × capability), competitor brand detection with stopword filtering, and 3-tab UI layout
- Phase 4 Remediation (Summary Cards & Navigation): Added ChannelSummaryCard and StrategicSummaryCard to header with tooltips showing channel mix, SEO level, risk tolerance, goal type, and active constraints
- Sidebar reorganization: Grouped 8 sections into 4 semantic categories (Identity, Market, Strategy, Guardrails) with reusable SectionMenuItems component
- Simplified context creation: Only domain and primary_category are required fields. All other fields (brand name, industry, competitors, categories) are optional and can be AI-generated from domain + category. Configuration name auto-generated from domain.
- **Phase 2 (Context Locking)**: State machine workflow DRAFT_AI → AI_READY → AI_ANALYSIS_RUN → HUMAN_CONFIRMED → LOCKED with validation gates. ContextReviewPanel UI for section-by-section approval. PATCH /api/configurations/:id/status endpoint.
- **Phase 3 (Validation Gate)**: Comprehensive validation module (shared/validation.ts) with section-level validation, integrity checksum, approval gates. GET /api/configurations/:id/validate endpoint returns detailed validation results.
- **Multi-Provider Keyword Gap (Complete)**: Implemented factory pattern with DataForSEO and Ahrefs providers. Ahrefs uses organic-keywords endpoint with 7-day cache, in-memory gap computation. Fixed competitor domain extraction to use UCR `competitors.competitors[]` array (tier1+tier2 only).
- **Keyword Gap Lite v3.1**: Configurable scoring models with capability boosters/penalties, difficulty/position factors in opportunity score, vertical presets (DTC footwear, retail, B2B SaaS), confidence levels (high/medium/low), Executive Summary Card with estimated value/themes/competitor ownership, and Reason/Confidence/KD columns in tables.
- **Governance Fallback Fix**: Updated keyword-gap-lite.ts to read scoring_config/capability_model from governance JSONB column when top-level fields are absent. OOFOS test validated: 15% pass rate (41 keywords) with DTC footwear preset vs 0% without.
- **OOFOS Case Study**: Created OOFOS_CASE_STUDY.md with detailed analysis results showing "recovery shoes" theme as top opportunity (153K score).
- **SPEC 3.1 Fence Override Fix**: Capability score now determines Pass/Review status, fence check only adds flags. Keywords with high capability (≥pass_threshold) are Pass even if outside fence, with `outside_fence` flag. OOFOS now shows 23% pass (62 keywords) vs 15% before. UI shows amber "Fence" badge with tooltip for outside_fence keywords.
- **Score Transparency Tooltip**: Added interactive tooltip on opportunity score showing all formula components (volume, CPC, intent weight, capability, difficulty factor, position factor) for CMO transparency and auditability.
- **Irrelevant Entity Filter**: Added detection for sports teams (NCAA/NFL/NBA), college names, influencer names, and idioms - routes to Out of Play with "irrelevant_entity" flag. Only fires when combined with footwear terms to avoid false positives.
- **Out of Play Grouped UI**: Rewrote Out of Play tab to use collapsible Accordion grouped by reason categories (competitor_brand, size_variant, irrelevant_entity, excluded, low_capability) with count badges per group, sorted by volume descending.
- **Confidence-Weighted Missing Value**: Replaced simple 3% CTR with capture probability formula: `statusFactor × confidenceFactor × kdFactor × positionFactor`. Status: Pass 70%, Fence 40%, Review 20%. Confidence: High 100%, Med 70%, Low 40%. KD clamped to [0,100]. Tooltip explains methodology.

### 10-Phase Growth Signal Architecture

1. **Context Creation** (Complete): Domain + primary_category required, auto-generation for other fields
2. **Context Locking** (Complete): State machine with validation gates, section approvals
3. **Validation Gate** (Complete): Per-section validation, integrity hash, approval workflow
4. **Pre-Filter Layer** (Planned): Pre-API filtering against Negative Scope
5. **External APIs** (Planned): Ahrefs, Bright Data, Google Trends integration
6. **AI Councils** (Planned): Growth, SEO, Performance, Strategic, GTM councils
7. **Post-Validation** (Planned): Output scanning for excluded terms
8. **Decision Engine** (Planned): PREPARE/RAMP/EXPLOIT/HOLD/AVOID classifier
9. **Output Generation** (Planned): Insights, recommendations, exports
10. **Frontend Display** (Planned): Dashboard, filters, actions, feedback loop
