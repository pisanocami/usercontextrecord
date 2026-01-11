# 📘 Module Playbook — Strategic Summary (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** Hybrid (LLM)

---

## 🧠 Module Overview & UCR Mission

Provides the high-level narrative and "State of the Union" for the growth strategy. In the UCR architecture, this is the **Voice of the AI** reasoning over all 8 sections and active modules.

**Principle:** Insight-First. Narrative that connects the dots between Context and Action.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Synthesize complex data into executive wisdom.
**Execution Gateway Role:**
- Collects `Trace Logs` from all modules.
- Injects **Section E (Intent)** to frame the narrative around user goals.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **ALL SECTIONS (A-H):** Mandatory for full synthesis.
- **Section E (Strategic Intent):** Mandatory for goal-framing.

### UCR Status Requirement
- **Status:** `LOCKED`.

---

## 🔧 Core Logic & Synthesis (Gemini/LLM)

### 1. Input Prompting
The LLM is prompted with the full UCR record + top signals.

### 2. Contextual Checking
The LLM is instructed to:
- "Check if the detected growth in **Section B** category aligns with **Section E** primary goal."
- "Verify that no recommended pivots hit **Section G** exclusions."

---

## 📤 Outputs & Governance

- **Executive Summary:** A 3-bullet point "TL;DR" for leadership.
- **Audit Trail:** Every "Strategic Claim" in the summary must have a source link to a module or UCR section.
- **Governance Check:** If `cmo_safe` is False in Section H, the summary includes a "Manual Review Required" header.

---

## ⛔ Stop Rules (UCR-Based)

1. **Incomplete UCR:** Stop if any required section (A, B, C, G) is missing.
2. **Quality Score Panic:** If `Section H.quality_score < 30`, the summary is replaced with a "UCR Refinement Required" warning.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const StrategicSummaryContract = {
  inputSchema: z.object({
    ucr: z.any(),
    signals: z.array(z.any())
  }),
  outputSchema: z.object({
    narrative: z.string(),
    topInsights: z.array(z.string())
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `StrategicSummaryContract` in `shared/module.contract.ts`.
- Mappings for all 8 UCR sections (A-H).

### Step 2: Gateway Integration
- **Strict Requirement:** UCR must be at least `AI_READY`.
- Inject current `context_hash` to ensure the summary is anchored to a specific version.

### Step 3: Core Logic & AI Framing
- Implement the "Reasoning Engine" that cross-references module findings (e.g., Gap, Demand) with Section E (Intent) and Section G (Rules).
- Ensure the narrative tone matches the Section E posture.

### Step 4: Governance & UI
- Link the summary to the "Review UCR" workflow in the UI.
- Trace log for which specific Section H quality flags influenced the narrative.

## 🧪 Example Output
> "The brand is capturing early demand (Market Demand) but failing to convert it into share against **Tier 1 Rivals** (Section C). This aligns with your **Resource Limited** constraint (Section E). Recommendation: Focus on Category X (Section B)."
