# 📘 Module Playbook — Category Visibility Benchmark (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** External

---

## 🧠 Module Overview & UCR Mission

Establishes a baseline of how the brand performs against competitors within its primary category. In the UCR architecture, the "Category" is not a generic industry term but the specific **primary_category** defined in **Section B**.

**Principle:** Benchmarking against Intent, not just Keywords.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Provide a high-level "Health Score" of the brand's footprint.
**Execution Gateway Role:**
- Injects `Section B.primary_category`.
- Injects `Section C.competitors` (filtering for `tier1`).

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section B (Category Definition):** Mandatory `primary_category`.
- **Section C (Competitive Set):** Mandatory `tier1` competitors for the benchmark.
- **Section A (Brand Context):** Target domain.

### UCR Status Requirement
- **Status:** `APPROVED` or `LOCKED`.

---

## 🔧 Core Logic & Context Injection

### 1. Competitor Filtering
Only competitors marked as `approved` and `tier1` in Section C are included in the visibility comparison.

### 2. Visibility Score (UCR-Weighted)
```python
visibility_score = calculate_sov(
    brand=config.brand.domain,
    competitors=[c.domain for c in config.competitors if c.tier == 'tier1'],
    category=config.category_definition.primary_category
)
```

---

## 📤 Outputs & Governance

- **Trace Log:** Lists the specific competitors excluded from the benchmark because of `REJECTED` status in Section C.
- **Audit:** The benchmark date is tied to the UCR version (Crucial for tracking shifts after a strategy pivot).
- **Quality Score:** Contributes to `Section H.quality_score` by providing external validation of the internal UCR category definition.

---

## ⛔ Stop Rules (UCR-Based)

1. **Category Ambiguity:** Stop if `primary_category` is generic (e.g., "shoes" vs "recovery footwear").
2. **Missing Tiers:** Stop if no `tier1` competitors are approved in Section C.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const CategoryVisibilityContract = {
  inputSchema: z.object({
    category: z.string(),
    competitors: z.array(z.string())
  }),
  outputSchema: z.object({
    visibilityScore: z.number(),
    marketRank: z.number(),
    competitorComparison: z.array(z.any())
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `CategoryVisibilityContract` in `shared/module.contract.ts`.
- Match against Section C competitors.

### Step 2: Gateway Integration
- Ensure all comparisons are anchored to the Section B Category Fence.
- Block execution if Section C is empty.

### Step 3: Core Logic & Scoring
- Calculate pixel share or position-weighted visibility.
- Benchmark against Section C "Tier 1" average.

### Step 4: Governance & UI
- Visualization of Visibility Share vs Competitor Set.
- Trace log for which competitors were included in the baseline.

## 🧪 Example Output
> "Visibility Score: 14/100. Benchmarked against **5 Approved Tier 1 Competitors** (Section C). Focus: **Section B Category** 'Orthotic Sandals'."
