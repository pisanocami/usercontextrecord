# 📘 Module Playbook — Keyword Gap & Visibility (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** External

---

## 🧠 Module Overview & UCR Mission

Identifies commercially meaningful search demand competitors capture that the client does not. In the UCR architecture, this module doesn't just "find keywords"; it calculates **lost revenue opportunity** while respecting the **strategic boundaries** defined in the UCR.

**Principle:** Context-First. Analysis only runs on validated Category Fences and Approved Competitors.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Establish where SEO is a credible growth lever before paid/product investment.
**Execution Gateway Role:** 
- Injects `brand.domain` and `category_definition.approved_categories`.
- Filters results through `negative_scope` (Section G).

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section A (Brand Context):** Provides the starting domain.
- **Section B (Category Definition):** Provides the "Fence" (Approved Categories).
- **Section C (Competitive Set):** Defines the `tier1` and `tier2` domains to analyze.
- **Section G (Negative Scope):** Hard gate for categorical and keyword exclusions.

### UCR Status Requirement
- **Status:** `LOCKED` required for automated execution. `APPROVED` allows manual triggers with warnings.

---

## 🔧 Core Logic & Context Injection

### 1. Pre-Execution (Execution Gateway)
1. **Tier Validation:** Only `tier1` and `tier2` competitors from Section C are sent to the Content Gap API.
2. **Fence Injection:** `Section B.approved_categories` are used to filter initial keyword clusters.

### 2. Main Processing (Context-Enhanced)
```python
# Pseudo-logic for UCR injection
for keyword in content_gap_results:
    # Rule 1: Section G Hard Gate
    if is_in_negative_scope(keyword, config.negative_scope):
        log_trace(keyword, "REJECTED", "Section G: Negative Scope")
        continue
        
    # Rule 2: Section B Fence Logic
    if not is_in_category_fence(keyword, config.category_definition):
        log_trace(keyword, "REJECTED", "Section B: Outside Category Fence")
        continue

    # Rule 3: Intent Alignment
    # Filter keywords by commercial intent based on CPC/Strategy
    process_valid_gap(keyword)
```

---

## 📤 Outputs & Governance

- **Trace Log:** Every keyword rejected by Section G or Section B is logged in the `TraceViewer` with the specific UCR rule name.
- **Audit Trail:** Results are flagged as `CMO-Safe` only if no Section G violations were bypassed.
- **Quality Score:** If significant gaps are found in "Excluded Categories" (Section B), the module suggests a review of the Category Fence.

---

## ⛔ Stop Rules (UCR-Based)

1. **Missing Domain:** Stop if `Section A.domain` is missing.
2. **Zero Approved Competitors:** Stop if no `tier1` or `tier2` competitors are in `APPROVED` status in Section C.
3. **Weak Negative Scope:** If `Section G` has no enforcement rules, execution is allowed but flagged as "Governance Warning".

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const KeywordGapContract = {
  inputSchema: z.object({
    brand: z.string(),
    competitors: z.array(z.string()).max(5),
    location: z.number().default(2840), // US
    language: z.string().default('en')
  }),
  outputSchema: z.object({
    topOpportunities: z.array(KeywordResultSchema),
    summary: z.string(),
    trace: z.array(ItemTraceSchema)
  })
};
```

### Data Provider
- **Service:** `DataForSEO` (via `server/dataforseo.ts`)
- **Method:** `getKeywordGap(brand, competitorList)`

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `KeywordGapContract` in `shared/module.contract.ts`.
- Standardize inputs (brand, competitors) and outputs (mapped to `DispositionedItem`).

### Step 2: Gateway Integration
- Implement `evaluateGates()` call in `keyword-gap-lite.ts`.
- Map Section G results to immediate `OUT_OF_PLAY` returns.
- Map Section B mismatches to `REVIEW` status.

### Step 3: Core Logic & Scoring
- Integrate `DataForSEO` provider.
- Apply `applyStrategicWeighting()` based on Section E (Strategic Intent).
- Implement keyword eligibility filters (Commercial intent vs informational).

### Step 4: Governance & UI
- Ensure `ItemTrace` is populated for every keyword.
- Update UI components to handle `REVIEW` status.
- Verify audit trail persistence in `governance` collection.

## 🧪 Example Output
> "Identifying ~$350K/month in missed demand in the 'Recovery Footwear' fence. 12% of detected gaps were filtered out by **Section G (Negative Scope)** regarding medical-claims keywords."
