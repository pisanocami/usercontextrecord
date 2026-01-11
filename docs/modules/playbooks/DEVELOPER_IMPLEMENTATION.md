# Developer Implementation Supplement: UCR Architecture Integration

This document provides technical instructions for developers to implement analytical modules using the User Context Record (UCR) and the Execution Gateway.

## 1. Module Contract Implementation

Every module must implement the `ModuleContract` interface in `shared/module.contract.ts`.

```typescript
import { z } from 'zod';
import type { ModuleContract } from './module.contract';

export const MyModuleContract: ModuleContract = {
  id: 'my_module_id',
  name: 'My Module Name',
  version: '1.0.0',
  description: '...',
  requiredSections: ['A', 'B', 'G'], // Strict dependencies
  optionalSections: ['E', 'H'],
  minimumUCRStatus: 'LOCKED',
  
  inputSchema: z.object({
    // Standard module input
  }),
  
  outputSchema: z.object({
    // Standard module output including ucrContext
  }),
  
  guarantees: {
    maxExecutionTimeMs: 5000,
    retryable: true,
    idempotent: true
  },
  
  explainability: {
    traceRequired: true,
    humanReadableOutput: true,
    alwaysProvideNextStep: true
  }
};
```

## 2. Standard Evaluation Pattern (G -> B -> H)

Use the `ExecutionGateway.evaluateItem()` helper (updated in `server/execution-gateway.ts`) to process items through the canonical gate order.

```typescript
import { evaluateGates, RULES } from './execution-gateway';

async function processItems(items: any[], config: Configuration) {
  const traces: ItemTrace[] = [];
  
  const filteredItems = items.filter(item => {
    const result = evaluateGates(item.text, config);
    traces.push(...result.traces);
    
    // Hard rejection from Negative Scope (Section G)
    if (result.disposition === 'OUT_OF_PLAY') return false;
    
    // Soft gate handling (Section B)
    if (result.disposition === 'REVIEW') {
       item.needsHumanReview = true;
    }
    
    return true;
  });
  
  return { filteredItems, traces };
}
```

## 3. Standard Rule Dictionary

| Rule ID | UCR Section | Severity | Use Case |
|---|---|---|---|
| `G_HARD_EXCLUSION` | G | critical | Keyword matches `excluded_keywords`. |
| `G_COMPETITOR_BRAND` | G | high | Mentions a competitor from Section C. |
| `B_OUTSIDE_FENCE` | B | medium | Outside `approved_categories`. |
| `H_LOW_CONFIDENCE` | H | medium | Source segment has low `context_confidence`. |
| `E_STRATEGIC_AVOID` | E | high | Matches items in the `avoid` list. |

## 4. Weighting Utilities

To apply `Section E` strategic weights:

```typescript
function applyStrategicWeight(rawScore: number, goal: string, strategicIntent: StrategicIntent) {
  let multiplier = 1.0;
  if (strategicIntent.primary_goal === goal) multiplier *= 1.5;
  if (strategicIntent.risk_tolerance === 'low') multiplier *= 0.8;
  return rawScore * multiplier;
}
```

## 5. Trace Logging for TraceViewer

Always include the `ItemTrace` array in the standard block response. The `TraceViewer` component expects:

```json
{
  "ruleId": "G_HARD_EXCLUSION",
  "ucrSection": "G",
  "reason": "Matches excluded term: 'cheap'",
  "severity": "critical",
  "evidence": "Input: 'cheap shoes'"
}
```
