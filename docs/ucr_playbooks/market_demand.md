# 📘 Module Playbook — Market Demand & Seasonality (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** External

---

## 🧠 Module Overview & UCR Mission

Surfaces historical and near-term demand cycles for defined product or category queries. In the UCR architecture, this module answers **WHEN** to move, using the **Category Definition (Section B)** as the scope anchor.

**Principle:** Timing-First. Contextualizes demand signals within the brand's approved strategic window.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Establish *when* to invest before deciding *where* or *how much*.
**Execution Gateway Role:**
- Validates that `query_groups` align with `Section B.primary_category`.
- Ensures geography matches `Section A.primary_geography`.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section A (Brand Context):** Defines `primary_geography` for Trends regionality.
- **Section B (Category Definition):** Defines the `primary_category` and `approved_categories` used as seed terms.
- **Section E (Strategic Intent):** Determines if the `time_horizon` (short/long) matches the Trends lookback.

### UCR Status Requirement
- **Status:** `LOCKED` or `APPROVED` required.

---

## 🔧 Core Logic & Context Injection

### 1. Query Construction
Instead of manual query entry, the module pulls:
- `seed_terms` from **Section D (Demand Definition)**.
- `approved_categories` from **Section B**.

### 2. Processing (Context-Aware)
```python
# Logic for UCR-based seasonality
target_geo = config.brand.primary_geography[0] or "US"
categories = config.category_definition.approved_categories

for category in categories:
    trend_data = fetch_trends(category, target_geo)
    # Apply Strategic Intent Filter
    if config.strategic_intent.goal_type == 'roi':
        identify_peak_efficiency_window(trend_data)
    else:
        identify_early_awareness_window(trend_data)
```

---

## 📤 Outputs & Governance

- **Trace Log:** Records which category clusters were used to generate the seasonality curve.
- **Strategic Alignment:** Flags as "High Risk" if the peak demand window occurs during a period the brand has marked as `avoid` in **Section E**.
- **Audit:** All Trends data points are linked to the UCR version used at the time of pull.

---

## ⛔ Stop Rules (UCR-Based)

1. **Geo Mismatch:** Stop if the `primary_geography` in Section A is not supported by Trends.
2. **Category Scope Drift:** Stop if the queries requested do not exist in `Section B` (Prevents "Ghost Analysis").

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const MarketDemandContract = {
  inputSchema: z.object({
    categories: z.array(z.string()),
    geo: z.string().length(2).default('US'),
    timeRange: z.string().default('today 5-y')
  }),
  outputSchema: z.object({
    seasonality: SeasonalitySchema,
    executiveSummary: z.string(),
    trace: z.array(ItemTraceSchema)
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `MarketDemandContract` in `shared/module.contract.ts`.
- Standardize category query inputs from Section B.

### Step 2: Gateway Integration
- Fetch market (geo) from Section A.
- Validate that all input queries are within the Section B Category Fence.

### Step 3: Core Logic & Scoring
- Integrate `Google Trends` or `DataForSEO Trends`.
- Implement seasonality detection and YoY consistency algorithms.
- Rationale influenced by Section E expectations.

### Step 4: Governance & UI
- Populate trace logs for "Timing Confidence".
- Render the Heatmap and Seasonality curves in the Wizard/Dashboard.

## 🧪 Example Output
> "Market demand for 'Plant-based Recovery' (Section B) starts rising in Feb. Alignment with **Section E (Intent: Awareness)** suggests launching TOF activity 3 weeks prior."
