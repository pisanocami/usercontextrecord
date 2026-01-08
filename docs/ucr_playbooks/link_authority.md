# 📘 Module Playbook — Link Authority & Technical SEO (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** External

---

## 🧠 Module Overview & UCR Mission

Measures the structural strength and backlink profile of the brand vs competitors. In the UCR architecture, this provides the **Reality Check** for SEO execution—can the brand actually rank for its target categories?

**Principle:** Capability-First. Analyzing structural "Weight" to validate strategic goals.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Determine if SEO is a "Winnable" channel based on current authority.
**Execution Gateway Role:**
- Injects `Section A.domain`.
- Injects `Section C` (tier 1 competitors) for side-by-side gap analysis.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section A (Brand Context):** Target domain.
- **Section C (Competitive Set):** Domains to benchmark against.
- **Section H (Governance):** Uses authority scores to calculate `Section H.quality_score`.

### UCR Status Requirement
- **Status:** `APPROVED` or `LOCKED`.

---

## 🔧 Core Logic & Context Injection

### 1. Authority Benchmarking
The module compares the brand's Domain Rating (DR) or Link Velocity with the `tier1` competitors in Section C.

### 2. Technical Score
Scans the `brand.domain` for performance issues (Core Web Vitals) that might block the goals in **Section E**.

```python
if brand_dr < min(competitor_t1_dr):
    flag_as_authority_gap()
```

---

## 📤 Outputs & Governance

- **Trace Log:** Links specific technical failures to the "Blocked" execution of Keyword Gap modules.
- **Governance Feedback:** If authority is too low to compete in the **Section B Category**, the module recommends a "Niche Strategy" or "Paid Buffer".
- **Audit:** All link metrics are versioned with the UCR environment.

---

## ⛔ Stop Rules (UCR-Based)

1. **Missing Domain:** Stop if Section A is incomplete.
2. **Generic Benchmarking:** Stop if no competitors are defined in Section C.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const LinkAuthorityContract = {
  inputSchema: z.object({
    domain: z.string(),
    benchmarks: z.array(z.string())
  }),
  outputSchema: z.object({
    domainRating: z.number(),
    authorityGap: z.number(),
    techFlags: z.array(z.string())
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `LinkAuthorityContract` in `shared/module.contract.ts`.
- Benchmark parameters for Section C domains.

### Step 2: Gateway Integration
- Ensure analysis targets only domains in the active Section C list.
- Cross-reference technical issues with Section B priorities (e.g., core collection pages).

### Step 3: Core Logic & Scoring
- Integrate Ahrefs or SERP-based authority metrics.
- Rank technical issues by "Impact to Section B visibility".

### Step 4: Governance & UI
- Create an "Authority Gap" visualization.
- Trace logs for technical SEO changes over time.

## 🧪 Example Output
> "Domain Authority (DR 45) is 20 points below **Tier 1 Avg** (Section C). **Technical SEO** flags 15 high-risk issues on 'Collection Page' (Section B)."
