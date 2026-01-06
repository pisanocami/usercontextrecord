# User Context Record (UCR) Specification

> Especificación Técnica del UCR
> 
> Versión 3.2 - Enero 2026

---

## Overview

El User Context Record (UCR) es el **single source of truth** para toda la inteligencia de marca. Ningún módulo analítico puede ejecutar sin un UCR validado y completo.

**Principio fundamental:** Context-First, Decision-First

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UCR: SINGLE SOURCE OF TRUTH                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │                    8 CANONICAL SECTIONS                      │          │
│   ├─────────────────────────────────────────────────────────────┤          │
│   │                                                              │          │
│   │  A. Brand Context      │  E. Strategic Intent               │          │
│   │  B. Category Definition│  F. Channel Context                │          │
│   │  C. Competitive Set    │  G. Negative Scope                 │          │
│   │  D. Demand Definition  │  H. Governance                     │          │
│   │                                                              │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │              EXECUTION GATEWAY                               │          │
│   │  ├── Validates UCR completeness                             │          │
│   │  ├── Checks required sections                               │          │
│   │  ├── Verifies UCR status (LOCKED required)                  │          │
│   │  └── Injects context into modules                           │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                              │                                              │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │              ANALYSIS MODULES                                │          │
│   │  ├── Keyword Gap Lite                                       │          │
│   │  ├── Category Demand Signal (planned)                       │          │
│   │  ├── Brand Attention (planned)                              │          │
│   │  └── Strategic Levers (planned)                             │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UCR Status Lifecycle

El UCR atraviesa un ciclo de vida con estados definidos:

```
DRAFT_AI → PENDING_REVIEW → APPROVED → LOCKED
    │           │              │          │
    │           ▼              ▼          ▼
    └──────► REJECTED ◄────────┘     (immutable)
```

| Status | Description | Module Execution |
|--------|-------------|------------------|
| DRAFT_AI | Generado por IA, sin revisión | Blocked |
| PENDING_REVIEW | En revisión humana | Blocked |
| APPROVED | Aprobado, puede ser editado | Allowed with warnings |
| LOCKED | Bloqueado, inmutable | Full access |
| REJECTED | Rechazado, requiere regeneración | Blocked |

---

## Section A: Brand Context

Define la identidad fundamental de la marca.

### Schema

```typescript
interface BrandContext {
  name: string;             // Nombre de la marca
  domain: string;           // Dominio principal (requerido)
  tagline?: string;         // Propuesta de valor
  industry?: string;        // Industria (auto-detectada)
  revenue_band?: string;    // Rango de ingresos
  target_market?: string;   // Mercado objetivo
  business_model?: 'B2B' | 'B2C' | 'Hybrid';
  primary_geography?: string[];
}
```

### Validation Rules

- `domain` es requerido y debe ser un dominio válido
- `name` se genera automáticamente del dominio si no se proporciona

### Usage in Modules

```typescript
// Keyword Gap: punto de partida del análisis
const clientDomain = config.brand.domain; // "oofos.com"
```

---

## Section B: Category Definition

Define el "fence" de categorías relevantes para la marca.

### Schema

```typescript
interface CategoryDefinition {
  primary_category: string;       // Categoría principal
  approved_categories?: string[]; // Categorías aprobadas
  included_categories?: string[]; // Alias: categorías incluidas
  excluded_categories?: string[]; // Categorías a ignorar
  alternative_categories?: string[];
}
```

### Fence Logic

```typescript
function checkFence(keyword: string, config: Configuration): FenceResult {
  const included = config.category_definition?.approved_categories || [];
  const excluded = config.category_definition?.excluded_categories || [];
  
  // Exclusión tiene prioridad
  if (excluded.some(cat => keyword.includes(cat.toLowerCase()))) {
    return { inFence: false, reason: "Excluded category" };
  }
  
  // Inclusión explícita
  if (included.some(cat => keyword.includes(cat.toLowerCase()))) {
    return { inFence: true, reason: "Included category" };
  }
  
  return { inFence: false, reason: "No category match" };
}
```

---

## Section C: Competitive Set

Define el conjunto de competidores para análisis.

### Schema

```typescript
interface CompetitiveSet {
  competitors: Competitor[];
  direct?: string[];      // Legacy: nombres de competidores directos
  indirect?: string[];    // Legacy: nombres de competidores indirectos
  marketplaces?: string[];
  approved_count: number;
  rejected_count: number;
  pending_review_count: number;
}

interface Competitor {
  name: string;
  domain: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  status: 'approved' | 'rejected' | 'pending';
  added_by: 'ai' | 'human';
  added_at: string;
  evidence?: CompetitorEvidence;
}
```

### Tier Definitions

| Tier | Description | Gap Analysis |
|------|-------------|--------------|
| tier1 | Competidores directos | Included |
| tier2 | Competidores indirectos | Included |
| tier3 | Jugadores aspiracionales | Excluded |

---

## Section D: Demand Definition

Define clusters de demanda y keywords semilla.

### Schema

```typescript
interface DemandDefinition {
  brand_keywords: {
    seed_terms: string[];
    top_n: number;
  };
  non_brand_keywords: {
    category_terms: string[];
    problem_terms: string[];
    top_n: number;
  };
}
```

### Usage

- `brand_keywords.seed_terms`: términos de marca para filtrar
- `non_brand_keywords`: base para expansión de keywords

---

## Section E: Strategic Intent

Define objetivos y horizonte estratégico.

### Schema

```typescript
interface StrategicIntent {
  primary_goal: string;
  secondary_goals?: string[];
  goal_type: 'awareness' | 'consideration' | 'conversion' | 'roi';
  time_horizon: 'short' | 'medium' | 'long';
  risk_tolerance: 'low' | 'medium' | 'high';
  growth_priority?: string;
  avoid?: string[];
  constraint_flags: {
    budget_constrained: boolean;
    resource_limited: boolean;
    regulatory_sensitive: boolean;
    brand_protection_priority: boolean;
  };
}
```

---

## Section F: Channel Context

Define el contexto de canales de marketing.

### Schema

```typescript
interface ChannelContext {
  seo_investment_level: 'none' | 'low' | 'medium' | 'high';
  paid_media_active: boolean;
  marketplace_dependence: 'none' | 'low' | 'medium' | 'high';
}
```

---

## Section G: Negative Scope

Define exclusiones absolutas para protección de marca.

### Schema

```typescript
interface NegativeScope {
  excluded_keywords: string[];
  excluded_categories: string[];
  excluded_use_cases: string[];
  excluded_competitors: string[];
  
  keyword_exclusions: ExclusionRule[];
  category_exclusions: ExclusionRule[];
  use_case_exclusions: ExclusionRule[];
  competitor_exclusions: ExclusionRule[];
  
  enforcement_rules: {
    hard_exclusion: boolean;
    allow_model_suggestion: boolean;
    require_human_override_for_expansion: boolean;
  };
  
  audit_log: AuditEntry[];
}

interface ExclusionRule {
  value: string;
  reason: string;
  added_by: 'ai' | 'human';
  added_at: string;
  match_type: 'exact' | 'contains' | 'regex';
  semantic_sensitivity: 'low' | 'medium' | 'high';
}
```

### Gate Behavior

Section G actúa como **hard gate**:
- Keywords que coinciden con exclusiones → OUT_OF_PLAY inmediato
- No hay override posible sin cambio de UCR

---

## Section H: Governance

Metadatos de gobernanza y auditoría.

### Schema

```typescript
interface Governance {
  context_version: number;
  context_status: 'DRAFT_AI' | 'PENDING_REVIEW' | 'APPROVED' | 'LOCKED';
  context_hash: string;
  context_valid_until: string;
  context_confidence: {
    level: 'low' | 'medium' | 'high';
    notes: string;
  };
  
  quality_score: QualityScore;
  validation_status: 'incomplete' | 'needs_review' | 'complete' | 'blocked';
  blocked_reasons: string[];
  
  human_verified: boolean;
  reviewed_by: string;
  last_reviewed: string;
  
  cmo_safe: boolean;
  model_suggested: boolean;
  
  ai_behavior: AIBehavior;
  human_overrides: HumanOverrides;
  section_approvals: Record<string, SectionApproval>;
}

interface QualityScore {
  overall: number;           // 0-100
  grade: 'low' | 'medium' | 'high';
  completeness: number;
  evidence_coverage: number;
  competitor_confidence: number;
  negative_strength: number;
  calculated_at: string;
  breakdown: {
    completeness_details: string;
    evidence_details: string;
    competitor_details: string;
    negative_details: string;
  };
}
```

---

## Validation Requirements

### Section Completeness

| Section | Required Fields | Minimum for Module Execution |
|---------|-----------------|------------------------------|
| A | domain | Yes |
| B | primary_category | Yes (for fence checking) |
| C | competitors[] (1+) | Yes (for gap analysis) |
| D | - | Optional |
| E | - | Optional |
| F | - | Optional |
| G | enforcement_rules | Yes (for hard gates) |
| H | context_version | Yes |

### Module Requirements

| Module | Required Sections | Optional Sections |
|--------|-------------------|-------------------|
| seo_visibility_gap | A, B, C | D, E, F, G, H |
| category_demand_signal | A, B | D, E, G, H |
| brand_attention | A, B, C | E, H |

---

## API Endpoints

### Get UCR

```
GET /api/configurations/:id
```

Returns full UCR with all 8 sections.

### Update Section

```
PATCH /api/configurations/:id
Body: { section_name: { ...fields } }
```

### Validate UCR

```
POST /api/configurations/:id/validate
```

Returns validation result with section-by-section status.

### Lock UCR

```
POST /api/configurations/:id/lock
```

Transitions UCR to LOCKED status (immutable).

---

## Database Schema

```typescript
// shared/schema.ts
export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  brand: jsonb("brand"),
  category_definition: jsonb("category_definition"),
  competitors: jsonb("competitors"),
  demand_definition: jsonb("demand_definition"),
  strategic_intent: jsonb("strategic_intent"),
  channel_context: jsonb("channel_context"),
  negative_scope: jsonb("negative_scope"),
  governance: jsonb("governance"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});
```

---

## Best Practices

1. **Complete UCR before module execution** - Ensures reliable results
2. **Lock UCR for production use** - Prevents mid-analysis changes
3. **Review AI suggestions** - Never auto-approve without review
4. **Document human overrides** - Maintain audit trail
5. **Set context expiration** - UCRs should be reviewed periodically
