# 📘 Module Playbook — Priority Scoring (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** Hybrid

---

## 🧠 Module Overview & UCR Mission

Converts multiple Action Cards into a clear execution order. In the UCR architecture, Priority Scoring is not just a math exercise; it is a **Strategic Alignment** check against **Section E (Strategic Intent)** and **Section H (Governance)**.

**Principle:** Focus-First. Prioritizes what matters most to the user's defined goals.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Translate strategic insight into operational sequencing.
**Execution Gateway Role:**
- Injects `Section E.risk_tolerance` and `Section E.time_horizon` as weighting factors.
- Checks `Section H.quality_score` to discount signals from low-confidence UCR sections.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section E (Strategic Intent):** `risk_tolerance`, `time_horizon`, and `primary_goal`.
- **Section H (Governance):** `context_confidence` and `quality_score`.

### UCR Status Requirement
- **Status:** `LOCKED` required.

---

## 🔧 Core Scoring Logic (UCR-Weighted)

The legacy Impact/Effort/Timing/Confidence model is enhanced with UCR weights:

| Dimension | UCR Injection Points |
|---|---|
| **Impact** | Weighted by `Section E.primary_goal` (e.g., higher weight if goal=ROI). |
| **Effort** | Adjusted by `Section E.constraint_flags` (e.g., higher 'cost' if resources_limited). |
| **Timing** | Driven by Market Demand signals vs `Section E.time_horizon`. |
| **Confidence** | Multiplied by `Section H.quality_score`. |

### Scoring Formula (Simplified)
`Total Score = (Signal_Impact * Goal_Weight) + (Signal_Confidence * UCR_Quality_Score)`

---

## 📤 Outputs & Governance

- **Trace Log:** Explicitly shows how the UCR Quality Score affected the ranking of specific actions.
- **Audit:** Records the `Section E` snapshot used for the scoring run.
- **Executive Visibility:** Groups actions into "Strategic Wins" (High E-Alignment) vs "Quick Wins" (Low Effort).

---

## ⛔ Stop Rules (UCR-Based)

1. **Goal Ambiguity:** Stop if `primary_goal` in Section E is not set.
2. **Low UCR Quality:** If `Section H.quality_score < 40`, the module flags the results as "UNRELIABLE due to weak Context Record".

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const PriorityScoringContract = {
  inputSchema: z.object({
    actions: z.array(ActionCardSchema),
    strategicIntent: StrategicIntentSchema
  }),
  outputSchema: z.object({
    rankedActions: z.array(z.object({
      id: z.string(),
      score: z.number(),
      ucr_weight: z.number()
    }))
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `PriorityScoringContract` in `shared/module.contract.ts`.
- Define weighting parameters for Sections E, F, and H.

### Step 2: Gateway Integration
- Verify the UCR Status is `LOCKED` before allowing prioritization.
- Inject Section H `quality_score` as a multiplier.

### Step 3: Core Logic & Scoring
- Implement the RICE or ICE scoring algorithm.
- Apply multipliers from Section E (Primary Goal alignment).
- Apply penalties for Section G proximity signals.

### Step 4: Governance & UI
- Create a trace log explaining the final rank calculation.
- Render the prioritized list with "UCR Alignment" badges.

## 🧪 Example Output
> "Rank 1: 'Launch Category X Pages'. High Impact for **Section E (Goal: Consideration)**. Adjusted for **Low Risk Tolerance** per UCR."
