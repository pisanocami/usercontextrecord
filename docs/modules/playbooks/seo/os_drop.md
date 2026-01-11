# 📘 Module Playbook — OS Drop (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** Hybrid

---

## 🧠 Module Overview & UCR Mission

Consolidates all module outputs into a single, executive-safe "Drop" (Strategic Brief). In the UCR architecture, the OS Drop is the **Audit Trail** manifested as a report.

**Principle:** Transparency-First. Every recommendation is linked back to the UCR.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Deliver the final synthesis of the Growth OS.
**Execution Gateway Role:**
- Validates the entire UCR is `LOCKED`.
- Summarizes the `Trace Log` to explain excluded opportunities.

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **ALL SECTIONS (A-H):** The OS Drop is a summary of the entire UCR + all active modules.
- **Section H (Governance):** Provides the `context_hash` to guarantee the report matches a specific strategy snapshot.

### UCR Status Requirement
- **Status:** `LOCKED` mandatory.

---

## 🔧 Core Logic & Drop Construction

The OS Drop pulls:
1. **Strategic Snapshot:** Summarizes **Section E** (Goals).
2. **Filtered Wins:** Pulls top-ranked Action Cards (from Priority Scoring).
3. **Execution Guardrails:** Summarizes **Section G** (Negative Scope) to show what was protected.

---

## 📤 Outputs & Governance

- **Consolidated Audit Trail:** A full view of why certain signals were prioritized or rejected based on the UCR.
- **Governance Seal:** If `Section H` has `cmo_safe: true`, the report is marked as "Ready for Board Review".
- **Interaction:** One-click links back to the UCR for "Deep Dives".

---

## ⛔ Stop Rules (UCR-Based)

1. **Incomplete Governance:** Stop if `validation_status` in Section H is not complete.
2. **Stale Context:** Stop if `context_valid_until` has passed.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const OSDropContract = {
  inputSchema: z.object({
    configId: z.string(),
    moduleOutputs: z.array(z.any())
  }),
  outputSchema: z.object({
    dropId: z.string(),
    summary: z.string(),
    pdfUrl: z.string().optional()
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `OSDropContract` in `shared/module.contract.ts`.
- Consolidate all module outputs into a single JSON schema.

### Step 2: Gateway Integration
- **Strict Requirement:** Check that UCR status is `LOCKED`.
- Verify Section H governance seal is attached.

### Step 3: Core Logic & Synthesis
- Generate a summary narrative using the LLM with Section E framing.
- Format the final "Drop" for consumption (PDF/Dashboard).

### Step 4: Governance & UI
- Create an "Archive" system in Section H to track past drops.
- Implement the "CMO Seal of Approval" workflow.

## 🧪 Example Output
> "OS Drop v3.2. Based on **LOCKED UCR (Hash: a1b2c3)**. Top 3 Actions support **Section E (Primary Goal: Consideration)** while protecting **Section G (Excluded Competitors)**."
