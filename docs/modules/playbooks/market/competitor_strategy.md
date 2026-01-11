# 📘 Module Playbook — Competitor Ad & Landing Page Strategy (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** External

---

## 🧠 Module Overview & UCR Mission

Analyzes where competitors are spending budget and how they are positioning their landing pages. In the UCR architecture, this module uses **Section C (Competitive Set)** to know *who* to watch and **Section B (Category Definition)** to know *what* offerings to analyze.

**Principle:** Competitive Intelligence with Strategic Guardrails.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Reverse-engineer competitor GTM tactics to inform internal creative/media strategy.
**Execution Gateway Role:**
- Injects `Section C` competitor domains.
- Filters landing pages by `Section B` category keywords to ensure relevance.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section C (Competitive Set):** Full list of `tier1` and `tier2` competitors.
- **Section B (Category Definition):** List of `approved_categories` for page classification.
- **Section G (Negative Scope):** Excludes landing pages or ad copy containing `excluded_keywords`.

### UCR Status Requirement
- **Status:** `LOCKED` required.

---

## 🔧 Core Logic & Context Injection

### 1. Scraper Steering
Metadata scrapers are pointed only at domains in Section C.

### 2. Page Classification (UCR-Based)
```python
for l_page in competitor_pages:
    # Check if page belongs to our category fence
    if any(cat in l_page.text for cat in config.category_definition.approved_categories):
        analyze_page(l_page)
    else:
        ignore_page("Outside Section B Fence")
```

---

## 📤 Outputs & Governance

- **Trace Log:** Records which competitor ads were ignored because they hit **Section G** (e.g., ads for products the brand has explicitly excluded from scope).
- **Strategic Summary:** Highlights competitive overlaps that contradict **Section E (Strategic Intent)**.
- **Audit Trail:** Links every ad screenshot/copy snippet to the UCR version.

---

## ⛔ Stop Rules (UCR-Based)

1. **Competitor Overload:** Stop if Section C has >10 competitors (Reduces scraper noise).
2. **Fence Leakage:** Stop if the category definition in Section B is too broad.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const CompetitorStrategyContract = {
  inputSchema: z.object({
    domains: z.array(z.string()),
    categoryTerms: z.array(z.string())
  }),
  outputSchema: z.object({
    adsDetected: z.array(z.any()),
    landingPages: z.array(z.any()),
    strategicOverlap: z.array(z.string())
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `CompetitorStrategyContract` in `shared/module.contract.ts`.
- Load Section C domains as the analysis target.

### Step 2: Gateway Integration
- Cross-reference detected landing pages with Section B categories.
- Ensure monitoring is restricted to the Section A Geography.

### Step 3: Core Logic & Scoring
- Detect changes in Ad Copy or Page H1s.
- Categorize strategic moves (e.g., "Discounting", "New Product Launch").

### Step 4: Governance & UI
- Render a "Competitor Move" feed.
- Trace alerts back to the specific Section C entity.

## 🧪 Example Output
> "Competitor X (Section C: Tier 1) increased spend by 30% on 'Arch Support' pages. This aligns with **Section B Category** but counters your **Section E Intent** to Avoid Price Wars."
