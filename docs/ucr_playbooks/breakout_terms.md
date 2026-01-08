# 📘 Module Playbook — Breakout Terms & Trend Alerts (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** External

---

## 🧠 Module Overview & UCR Mission

Identifies sudden surges in search interest for specific terms. In the UCR architecture, these alerts are filtered to ensure they are **Strategic** (aligned with Section B) and **Decision-Ready** (not noise).

**Principle:** Focus-First. Alerts only for terms within the defined Strategic Fence.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Provide early warning signals for category shifts or competitor moves.
**Execution Gateway Role:**
- Validates that breakout terms belong to `Section B.approved_categories`.
- Cross-references terms with `Section G.excluded_keywords`.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section B (Category Definition):** Defines the "Seed Fence" for monitoring.
- **Section D (Demand Definition):** Includes `seed_terms` for brand protection surfacing.
- **Section G (Negative Scope):** Hard gate for blocking alerts on forbidden topics.

### UCR Status Requirement
- **Status:** `LOCKED` required for real-time alerting.

---

## 🔧 Core Logic & Context Injection

### 1. Alert Filtering
Any "Breakout" detected by upstream scrapers is passed through a UCR Gate:
```python
if term in config.negative_scope.excluded_keywords:
    suppress_alert(term, "Section G Violation")

if not is_in_fence(term, config.category_definition):
    tag_as_adjacent(term, "Outside Section B Fence")
```

### 2. Contextual Thresholding
If **Section E (Strategic Intent)** has `risk_tolerance: low`, the threshold for a "Breakout" is set higher to reduce noise.

---

## 📤 Outputs & Governance

- **Trace Log:** Records which breakout terms were suppressed and why (Fence vs Negative Scope).
- **Execution Workflow:** Breakout alerts feed directly into **Action Cards** with a "High Urgency" flag.
- **CMO-Safe:** Ensures alerts doesn't include "Negative Scope" terms even if they are trending.

---

## ⛔ Stop Rules (UCR-Based)

1. **Broad Scope:** Stop if `Section B` has too many categories (>20), as it creates noise.
2. **Missing Negative Rules:** Stop if Section G is empty (Risk of alerting on sensitive topics).

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const BreakoutTermsContract = {
  inputSchema: z.object({
    seedTerms: z.array(z.string()),
    threshold: z.number().default(100)
  }),
  outputSchema: z.object({
    breakouts: z.array(z.object({
      term: z.string(),
      surge: z.number(),
      status: z.enum(['verified', 'adjacent'])
    }))
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `BreakoutTermsContract` in `shared/module.contract.ts`.
- Map Section B categories to monitoring seeds.

### Step 2: Gateway Integration
- Verify that breakouts aren't already covered in Section G (exclusions).
- Auto-flag breakouts that match Section B semantic extensions.

### Step 3: Core Logic & Scoring
- Implement "Surge" detection (>100% WoW change).
- Classify terms into "Verified" (Inside Fence) vs "Adjacent" (Requires Review).

### Step 4: Governance & UI
- Create "Add to Section B" shortcuts for adjacent breakouts.
- Trace the history of a term from breakout to added context.

## 🧪 Example Output
> "Trend Alert: 'Propel soles' is surging (+400%). Status: **Category Verified** (Section B). Recommendation: Update Category Fence if growth continues."
