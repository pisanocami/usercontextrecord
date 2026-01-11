# 📘 Module Playbook — Deprioritization Flags (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** Hybrid

---

## 🧠 Module Overview & UCR Mission

Identifies actions that should **NOT** be taken, even if they show high potential traffic. In the UCR architecture, this module is the primary defender of **Section G (Negative Scope)** and **Section H (Governance)**.

**Principle:** Discipline-First. Saying "No" is a strategic win.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Safeguard brand resources by flagging out-of-scope or high-risk opportunities.
**Execution Gateway Role:**
- Injects `Section G` (Negative Scope) to automatically flag any Action Card hitting exclusions.
- Injects `Section H.quality_score` to flag actions based on low-confidence data.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section G (Negative Scope):** The "Bible" of what to deprioritize.
- **Section E (Strategic Intent):** Contains the `avoid` list and `constraint_flags`.
- **Section H (Governance):** Provides `blocked_reasons`.

### UCR Status Requirement
- **Status:** `LOCKED`.

---

## 🔧 Core Logic & Flagging

The module scans all generated Action Cards and applies UCR Flags:

| Flag Type | UCR Condition | Action |
|---|---|---|
| **HARD_STOP** | Matches `Section G` exclusion. | Remove from Priority Scoring. |
| **STRATEGIC_CONFLICT** | Matches `Section E.avoid` list. | Mark as "Review Required". |
| **DATA_RISK** | Source segment has `Section H.confidence: low`. | Add "Verification Recommended". |
| **RESOURCE_BLOCK** | `constraint_flags.resource_limited` is True. | Move to "Backlog". |

---

## 📤 Outputs & Governance

- **Trace Log:** Detailed reasoning for every "Hard Stop" applied, citing specific items in Section G.
- **Strategic Cleanup:** Recommended updates to the UCR if many "Breakout" opportunities are hitting Deprioritization Flags.
- **Audit:** Weekly report of "Opportunity Lost by Design" (Total traffic/value rejected for strategic reasons).

---

## ⛔ Stop Rules (UCR-Based)

1. **Empty Negative Scope:** Stop if Section G is blank. The module cannot function without its primary reference.
2. **Draft UCR:** Cannot deprioritize accurately if the UCR is not locked.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const DeprioritizationContract = {
  inputSchema: z.object({
    actionCards: z.array(z.any()),
    negativeScope: z.any(),
    strategicIntent: z.any()
  }),
  outputSchema: z.object({
    flags: z.array(z.object({
      actionId: z.string(),
      flagType: z.string(),
      reason: z.string()
    }))
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `DeprioritizationContract` in `shared/module.contract.ts`.
- Load Section G and Section E as the evaluation baseline.

### Step 2: Gateway Integration
- Act as the "Final Auditor" for every Action Card generated.
- Record the exact Section G rule or Section E goal that triggered the flag.

### Step 3: Core Logic & Scoring
- Implement conflict detection between Action Card "Rationales" and Section E "Goals".
- Ensure "Hard Gates" override any high-impact score.

### Step 4: Governance & UI
- Display flags as "Red Warnings" in the priority list.
- Provide a "Override Review" workflow for CM Os.

## 🧪 Example Output
> "FLAGGED: 'Discount Campaign'. Reason: **Section E Conflict** (Goal is Premiumization). Action: Move to Deprioritized List."
