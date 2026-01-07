# FON Module Contract System

> Module Contract System Documentation
>
> Version 3.2 - January 2026

---

## Overview

The module contracts system defines the formal rules that govern the execution of analytical modules in the FON (Foundational Operational Network) platform. Each module declares its UCR dependencies and output guarantees.

**Source file:** `shared/module.contract.ts`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MODULE CONTRACT SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  shared/module.contract.ts                                              │
│  ├── Type Definitions                                                   │
│  │   ├── UCRSectionID ('A' | 'B' | ... | 'H')                          │
│  │   ├── UCRStatus ('DRAFT_AI' | 'PENDING_REVIEW' | 'LOCKED')          │
│  │   ├── Disposition ('PASS' | 'REVIEW' | 'OUT_OF_PLAY')               │
│  │   ├── Severity ('low' | 'medium' | 'high' | 'critical')             │
│  │   └── ItemTrace (ruleId, ucrSection, reason, severity, evidence)    │
│  │                                                                      │
│  ├── UCR Section Metadata                                               │
│  │   ├── UCR_SECTION_NAMES                                              │
│  │   └── UCR_SECTION_ROLES                                              │
│  │                                                                      │
│  ├── Gate Definitions                                                   │
│  │   ├── GATE_EVALUATION_ORDER                                          │
│  │   └── GATE_TYPES                                                     │
│  │                                                                      │
│  ├── Module Contracts                                                   │
│  │   ├── ModuleContract interface                                       │
│  │   └── Contract validation utilities                                  │
│  │                                                                      │
│  └── Legacy Module Definitions                                          │
│      ├── ModuleDefinition interface                                     │
│      ├── MODULE_REGISTRY                                                │
│      └── Helper functions                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## UCR Section IDs

The 8 canonical sections of the User Context Record:

| ID | Name | Role |
|----|------|------|
| A | Brand Context | Defines brand identity (domain, name, tagline) |
| B | Category Definition | Defines the "fence" of relevant categories |
| C | Competitive Set | List of direct and indirect competitors |
| D | Demand Definition | Demand clusters and keywords |
| E | Strategic Intent | Goals, time horizon, risk tolerance |
| F | Channel Context | SEO investment, paid media, marketplace |
| G | Negative Scope | Exclusions (keywords, categories, competitors) |
| H | Governance | Status, version, quality score, approvals |

### TypeScript Definition

```typescript
export type UCRSectionID = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export const UCR_SECTION_NAMES: Record<UCRSectionID, string> = {
  A: "Brand Context",
  B: "Category Definition",
  C: "Competitive Set",
  D: "Demand Definition",
  E: "Strategic Intent",
  F: "Channel Context",
  G: "Negative Scope",
  H: "Governance"
};
```

---

## Dispositions

Each analyzed item receives one of 3 dispositions:

| Disposition | Meaning | Action Required |
|-------------|---------|-----------------|
| PASS | Item approved for execution | Proceed with recommendation |
| REVIEW | Item requires human review | Escalate to CMO/stakeholder |
| OUT_OF_PLAY | Item excluded from analysis | Ignore, document reason |

### TypeScript Definition

```typescript
export type Disposition = 'PASS' | 'REVIEW' | 'OUT_OF_PLAY';
```

---

## Severity Levels

Severity levels for traces and alerts:

| Severity | Color | Meaning |
|----------|-------|---------|
| critical | Red | Immediate blocking, requires urgent action |
| high | Orange | Significant problem, likely exclusion |
| medium | Amber | Moderate flag, may affect classification |
| low | Gray | Informational, no impact on decision |

### TypeScript Definition

```typescript
export type Severity = 'low' | 'medium' | 'high' | 'critical';
```

---

## Item Traces

Structure for documenting gate evaluations:

```typescript
export interface ItemTrace {
  ruleId: string;           // Unique ID of the evaluated gate/rule
  ucrSection: UCRSectionID; // UCR section that activated the rule
  reason: string;           // Human-readable explanation
  severity: Severity;       // Severity level
  evidence?: string;        // Specific data from the evaluation
}
```

### Example

```json
{
  "ruleId": "G_COMPETITOR_BRAND",
  "ucrSection": "G",
  "reason": "Contains competitor brand term",
  "severity": "critical",
  "evidence": "matched: walmart"
}
```

---

## Gate Evaluation Order

Strict evaluation order for CMO-safety:

```typescript
export const GATE_EVALUATION_ORDER: UCRSectionID[] = ['G', 'B', 'H', 'E', 'F'];

export const GATE_TYPES: Record<UCRSectionID, 'hard' | 'soft' | 'classification' | 'prioritization'> = {
  G: 'hard',           // Negative Scope - immediate rejection
  B: 'soft',           // Category Fence - flag only
  H: 'classification', // Scoring - determines disposition
  E: 'prioritization', // Strategic - adjusts ranking
  F: 'prioritization', // Channel - adjusts ranking
  // A, C, D are data providers, not gates
  A: 'soft',
  C: 'soft',
  D: 'soft'
};
```

---

## Module Contracts

Each module defines a formal contract:

```typescript
export interface ModuleContract {
  id: string;
  name: string;
  version: string;
  description: string;

  // UCR Requirements
  requiredSections: UCRSectionID[];
  optionalSections: UCRSectionID[];
  minimumUCRStatus: UCRStatus;

  // Input/Output Specs
  inputSchema: z.ZodSchema<any>;
  outputSchema: z.ZodSchema<any>;

  // Execution Guarantees
  guarantees: {
    maxExecutionTimeMs: number;
    retryable: boolean;
    idempotent: boolean;
  };

  // Explainability
  explainability: {
    traceRequired: boolean;
    humanReadableOutput: boolean;
    alwaysProvideNextStep: boolean;
  };
}
```

### Registered Contracts

| Module ID | Name | Required Sections | Status |
|-----------|------|-------------------|--------|
| keyword_gap_visibility | SEO Visibility & Gap Mapping | A, B, C | Active |
| category_demand_trend | Category Demand Signal | A, B | Planned |
| brand_attention | Brand Attention & Share | A, B, C | Planned |

---

## Module Definitions (Legacy)

For compatibility with existing code:

```typescript
export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  question: string;  // Business question it answers
  requiredSections: UCRSectionID[];
  optionalSections: UCRSectionID[];
  outputType: 'keywords' | 'signal' | 'share' | 'levers' | 'capture' | 'pricing';
  status: 'active' | 'planned' | 'deprecated';
}
```

### Registered Modules

| Module | Question | Output Type | Status |
|--------|----------|-------------|--------|
| seo_visibility_gap | Where are we missing organic opportunity? | keywords | Active |
| category_demand_signal | Is this category worth investing in? | signal | Planned |
| brand_attention | What part of the market mind is ours? | share | Planned |
| retail_pricing | Where are we losing shelf and margin? | pricing | Planned |
| demand_capture | Are we capturing demand or just defending? | capture | Planned |
| strategic_levers | What should we do next? | levers | Planned |

---

## Validation Utilities

### canModuleExecute

Verifies if a module can execute given the available UCR:

```typescript
function canModuleExecute(
  moduleId: string,
  availableSections: UCRSectionID[]
): {
  canExecute: boolean;
  missingSections: UCRSectionID[];
  warnings: string[]
}
```

### validateContractExecution

Validates that a contract can execute with the given context:

```typescript
function validateContractExecution(
  contract: ModuleContract,
  availableSections: UCRSectionID[],
  ucrStatus: UCRStatus
): ContractValidationResult
```

---

## Usage Examples

### Checking Module Execution Readiness

```typescript
import { canModuleExecute, UCR_SECTION_NAMES } from '@shared/module.contract';

const result = canModuleExecute('seo_visibility_gap', ['A', 'B', 'C']);
if (!result.canExecute) {
  console.log('Missing sections:', result.missingSections.map(s => UCR_SECTION_NAMES[s]));
}
```

### Importing Types in Frontend

```typescript
import type {
  Disposition,
  Severity,
  UCRSectionID,
  ItemTrace
} from '@shared/module.contract';

// Use types directly
const trace: ItemTrace = {
  ruleId: "B_OUTSIDE_FENCE",
  ucrSection: "B",
  reason: "Outside category fence",
  severity: "medium"
};
```

---

## Migration from module-registry.ts

The `shared/module-registry.ts` file is **deprecated**.

### Before (deprecated)

```typescript
import { getModuleDefinition } from '@shared/module-registry';
```

### After (current)

```typescript
import { getModuleDefinition } from '@shared/module.contract';
```

All functions and types are available in `module.contract.ts`:

- `UCRSection` → `UCRSectionID`
- `ModuleDefinition`
- `MODULE_REGISTRY`
- `getModuleDefinition()`
- `getAllModules()`
- `getActiveModules()`
- `canModuleExecute()`
- `UCR_SECTION_NAMES`
- `UCR_SECTION_ROLES`

---

## File Structure

```
shared/
├── module.contract.ts      # Single source of truth (active)
├── module-registry.ts      # DEPRECATED - do not use
└── schema.ts               # Database schema and types
```
