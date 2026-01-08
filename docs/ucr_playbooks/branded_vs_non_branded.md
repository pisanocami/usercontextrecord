# 📘 Module Playbook — Branded vs Non-Branded Demand Capture (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** Hybrid

---

## 🧠 Module Overview & UCR Mission

Analyzes the split between brand-driven traffic and category-driven growth. In the UCR architecture, this module uses **Section D (Demand Definition)** as the source of truth for what constitutes "Brand" vs "Category".

**Principle:** Zero-Ambiquity. No manual classification; classification is inherited from the UCR.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Measure brand health vs category capture efficiency.
**Execution Gateway Role:**
- Injects `Section D.brand_keywords.seed_terms`.
- Injects `Section D.non_brand_keywords.category_terms`.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section D (Demand Definition):** Mandatory seed terms for both Branded and Non-Branded.
- **Section A (Brand Context):** Provides the official `name` and `domain`.

### UCR Status Requirement
- **Status:** `APPROVED` or `LOCKED`.

---

## 🔧 Core Logic & Context Injection

### 1. Classification Engine
The module pulls `seed_terms` from Section D.
- **Branded:** Any query containing `brand_keywords.seed_terms` or `Section A.name`.
- **Non-Branded (Category):** Any query containing `non_brand_keywords.category_terms`.

### 2. UCR Validation Gate
```python
# Check for scope leakage
for keyword in dataset:
    if keyword in config.negative_scope.excluded_keywords:
        mark_as_out_of_play(keyword)
```

---

## 📤 Outputs & Governance

- **Trace Log:** Lists every keyword classified as "Ambiguous" for Section D refinement.
- **Governance Score:** High Branded dependency with low Category capture triggers a "Strategic Risk" flag in the Executive Summary.
- **CMO-Safe:** Validates that no competitor names (from Section C) are being tracked in the "Branded" bucket.

---

## ⛔ Stop Rules (UCR-Based)

1. **Empty Seed Terms:** Stop if `Section D.brand_keywords.seed_terms` is empty.
2. **UCR Version Mismatch:** Stop if the classification rules differ from the locked UCR baseline.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const BrandedDemandContract = {
  inputSchema: z.object({
    keywords: z.array(z.string()),
    brandSeeds: z.array(z.string())
  }),
  outputSchema: z.object({
    summary: z.object({
      branded_share: z.number(),
      category_share: z.number()
    })
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `BrandedDemandContract` in `shared/module.contract.ts`.
- Define source query sets from Section D.

### Step 2: Gateway Integration
- Map Section D seeds as the "Gold Standard" for branded classification.
- Record any keywords that move from Non-Branded to Branded as part of the trace.

### Step 3: Core Logic & Scoring
- Calculate Search Volume share per cluster.
- Apply Section C filters to identify competitor brand capture in your clusters.

### Step 4: Governance & UI
- Link share charts to Section E (Goal: Defensive vs Offensive).
- Audit trail for keyword classification logic.

## 🧪 Example Output
> "Branded demand accounts for 85% of capture. **Section D Category Seeds** show a 70% gap in capture efficiency vs **Section C (Tier 1 Competitors)**."
