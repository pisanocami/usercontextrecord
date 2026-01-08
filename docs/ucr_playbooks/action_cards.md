# 📘 Module Playbook — Action Cards (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** Hybrid

---

## 🧠 Module Overview & UCR Mission

Translates Growth Signal insights into **clear, discrete decisions**. In the UCR architecture, Action Cards are the final bridge between analytical modules and the **Strategic Intent (Section E)** of the user.

**Principle:** Decision-First. Every card must be grounded in both a Signal and a UCR constraint.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Convert analysis into bounded, decision-ready recommendations.
**Execution Gateway Role:**
- Injects `Section E (Strategic Intent)` to filter or prioritize recommendations.
- Injects `Section F (Channel Context)` to ensure actions are executable within current investments.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section E (Strategic Intent):** Defines `primary_goal` and `constraint_flags` (e.g., budget_constrained).
- **Section F (Channel Context):** Defines where the brand is currently active (SEO, Paid, Marketplace).
- **Section H (Governance):** Provides the `context_confidence` level for the entire UCR.

### UCR Status Requirement
- **Status:** Must be `LOCKED`. Recommendations generated on `DRAFT` UCRs are strictly prohibited.

---

## 🔧 Core Logic & Card Construction

Each Action Card must reconcile upstream signals with UCR constraints:

### 1. Constraint Reconciliation
```python
# Filter actions by Section E constraints
if action.type == "Paid Expansion" and config.strategic_intent.constraint_flags.budget_constrained:
    action.impact_rating = "LOW"
    action.rationale += " (Caution: Budget constrained per Section E)"

# Ensure channel relevance
if action.channel == "SEO" and config.channel_context.seo_investment_level == "none":
    action.flag = "REQUIRES_INFRASTRUCTURE"
```

### 2. Mandatory Elements
1. **Decision Unit:** Derived from Keyword Gap, SOV, or Demand.
2. **UCR Alignment:** Explicitly state which **Section E Goal** this supports.
3. **Execution Gate:** Reference **Section G** to confirm the action doesn't hit exclusions.

---

## 📤 Outputs & Governance

- **Trace Log:** Shows the exact upstream signal + the UCR section that shaped the recommendation.
- **Audit Trail:** Action Cards are marked as `Governance: High` if they align perfectly with `Strategic Intent`.
- **CMO-Safe Gate:** The Gateway blocks any card whose recommendation involves a `Section G` excluded competitor or keyword.

---

## ⛔ Stop Rules (UCR-Based)

1. **Strategic Pivot:** Stop if `primary_goal` in Section E is undefined.
2. **Governance Block:** Stop if `governance.validation_status` is `incomplete`.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const ActionCardContract = {
  inputSchema: z.object({
    signals: z.array(z.any()),
    focus: z.enum(['awareness', 'roi', 'capture'])
  }),
  outputSchema: z.object({
    cards: z.array(z.object({
      action: z.string(),
      rationale: z.string(),
      ucr_fit: z.string(),
      confidence: z.enum(['high', 'medium', 'inferred'])
    }))
  })
};
```

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `ActionCardContract` in `shared/module.contract.ts`.
- Map signal inputs to card outputs.

### Step 2: Gateway Integration
- Ensure input signals have been pre-filtered by Section G/B in upstream modules.
- Use Section E to determine the "Tone" and "Urgency" of the rationale.

### Step 3: Core Logic & Council
- Implement the "Reasoning Layer" using LLM prompts constrained by Section E (Goals).
- Ensure every card has a `ucr_fit` field describing its alignment.

### Step 4: Governance & UI
- Populate trace logs for why a specific action was chosen.
- Link cards to the "Prioritize" button in the OS UI.

## 🧪 Example Action Card
> **Action:** Launch discovery campaigns for 'Cluster X'.
> **Rationale:** Validated gap of $50K. 
> **UCR Fit:** Supports **Section E Goal (Awareness)** and fits **Section F (Paid Media: Active)**.
