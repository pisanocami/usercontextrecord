# 📘 Module Playbook — Paid vs Organic Overlap (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** Hybrid

---

## 🧠 Module Overview & UCR Mission

Identifies keywords where the brand is paying for clicks they already capture organically (Cannibalization) or where SEO is a smart replacement for high CPCs. In the UCR architecture, this module uses **Section F (Channel Context)** to know if Paid Media is active.

**Principle:** Efficiency-First. Optimization of cross-channel spend.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Reallocate budget from redundant to incremental demand.
**Execution Gateway Role:**
- Injects `Section F.paid_media_active`.
- Cross-references CPC data with `Section E.constraint_flags` (budget_constrained).

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section F (Channel Context):** Must confirm Paid Media activity.
- **Section B (Category Definition):** Scope of keywords to analyze.
- **Section G (Negative Scope):** Discards overlaps on excluded terms.

### UCR Status Requirement
- **Status:** `LOCKED`.

---

## 🔧 Core Logic & Overlap Detection

### 1. Incremental vs Redundant
The module compares Organic Rank (from keyword_gap) vs Paid Visibility.
- **High Redundancy:** Organic Rank 1 + Paid Ad active.
- **Strategic Opportunity:** Organic Rank >10 + High CPC.

### 2. UCR Scaling
If **Section E** has `constraint_flags.budget_constrained: true`, the recommendations for "Paid to Organic Migration" are weighted higher.

---

## 📤 Outputs & Governance

- **Trace Log:** Log every overlap detected and the recommendation (Keep/Pause/Transition).
- **Audit:** Links spend optimization recommendations to the brand's `revenue_band` (Section A).
- **Quality Score:** High cannibalization reduces the `efficiency_score` in Section H.

---

## ⛔ Stop Rules (UCR-Based)

1. **Paid Inactive:** Stop if `Section F.paid_media_active` is False.
2. **Missing CPC:** No recommendation can be made without price context.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const PaidOrganicOverlapContract = {
  inputSchema: z.object({
    paidData: z.array(z.any()),
    organicData: z.array(z.any())
  }),
  outputSchema: z.object({
    redundancies: z.array(z.any()),
    opportunityValue: z.number()
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `PaidOrganicOverlapContract` in `shared/module.contract.ts`.
- Mappings for Paid vs Organic keyword sets.

### Step 2: Gateway Integration
- Fetch Paid investment levels from Section F.
- Anchor all overlap analysis to the Section B Category Fence.

### Step 3: Core Logic & Scoring
- Calculate efficiency gain ($ reallocatable) based on organic rank.
- Flag high-CPC keywords with low organic visibility for "Paid Protection".

### Step 4: Governance & UI
- Visualize the "Cannibalization Risk" vs "Efficiency Gain".
- Trace the reasoning for reallocation suggestions.

## 🧪 Example Output
> "Identified $15K/month in redundant spend on 'Cluster Z'. **Organic Rank: 1** (Section B). Recommendation: Reallocate to **Section E Strategic Goal**."
