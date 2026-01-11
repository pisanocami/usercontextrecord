# 📘 Module Playbook — Market Momentum Index (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** External

---

## 🧠 Module Overview & UCR Mission

Measures the velocity of change in category demand (Acceleration/Deceleration). In the UCR architecture, this provides the **Urgency Factor** for Priority Scoring, using **Section B (Category Definition)** as the baseline.

**Principle:** Velocity-First. Knowing if a market is heating up or cooling down.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Add a "Speed" dimension to seasonality and gap analysis.
**Execution Gateway Role:**
- Injects `Section B` categories.
- Injects `Section E.time_horizon` to determine if momentum should be measured weekly or monthly.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section B (Category Definition):** The target clusters.
- **Section E (Strategic Intent):** Determines if the brand cares about short-term or long-term momentum.
- **Section D (Demand Definition):** Source of seed keywords.

### UCR Status Requirement
- **Status:** `APPROVED` or `LOCKED`.

---

## 🔧 Core Logic & Momentum Calculation

### 1. Velocity Calculation
Compares the last 4 weeks of demand against the previous year's 4-week moving average.

### 2. UCR Weighting
If **Section E** primary_goal is "Awareness", momentum in new categories is flagged. If goal is "ROI", momentum is only relevant in existing high-converting fences.

---

## 📤 Outputs & Governance

- **Trace Log:** Records which categories are "Hot" (High Momentum) vs "Cold".
- **Priority Scoring Input:** Momentum serves as a multiplier for "Timing Fit" in the scoring module.
- **Audit:** Tracks how momentum shifted relative to the UCR version date.

---

## ⛔ Stop Rules (UCR-Based)

1. **Short-Term Noise:** Stop if total search volume for the category is below the threshold in Section D.
2. **Stale Data:** Stop if Trends data cannot be refreshed.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const MarketMomentumContract = {
  inputSchema: z.object({
    categories: z.array(z.string()),
    timeHorizon: z.enum(['short', 'long'])
  }),
  outputSchema: z.object({
    velocity: z.array(z.object({
      category: z.string(),
      score: z.number()
    }))
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `MarketMomentumContract` in `shared/module.contract.ts`.
- Load Section B categories as the tracking seeds.

### Step 2: Gateway Integration
- Cross-reference velocity with Section E "Time Horizon".
- Block execution if Section B contains fewer than 3 canonical categories.

### Step 3: Core Logic & Velocity
- Calculate WoW and MoM momentum scores.
- Apply Section E weights to prioritize "Emerging" vs "Stable" categories.

### Step 4: Governance & UI
- Visualize the "Momentum Matrix".
- Trace log for "Sudden Velocity Shifts" hitting Section E thresholds.

## 🧪 Example Output
> "Market Momentum in **Section B category** 'Recovery Footwear' is +25% vs last year. High Alignment with **Section E (Goal: Growth)**. Urgency: HIGH."
