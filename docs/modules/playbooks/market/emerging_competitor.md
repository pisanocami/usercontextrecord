# 📘 Module Playbook — Emerging Competitor Watch (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** External

---

## 🧠 Module Overview & UCR Mission

Detects new players entering the SERPs or market. In the UCR architecture, this module ensures that "New" doesn't mean "Relevant" by filtering candidates through **Section G (Negative Scope)** and the **Category Fence (Section B)**.

**Principle:** Vigilance-First. Controlled expansion of the Competitive Set.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Prevent strategic blindspots by identifying new competitors before they scale.
**Execution Gateway Role:**
- Injects `Section C` (to ignore known players).
- Injects `Section B` (to ensure the player is in our category).

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section C (Competitive Set):** Current domains (to identify what is truly "New").
- **Section B (Category Definition):** Ensures the new player is a threat to the defined categories.
- **Section G (Negative Scope):** Discards players in excluded niches.

### UCR Status Requirement
- **Status:** `LOCKED`.

---

## 🔧 Core Logic & Verification

### 1. New Player Detection
SERP scrapers identify domains ranking in **Section B** categories that are NOT in **Section C**.

### 2. Emerging Tiering
The module suggests a tier (tier1, tier2, tier3) based on overlap with the UCR:
```python
if overlap_score > 0.8:
    suggest_status = "PENDING_REVIEW"
    suggest_tier = "tier1"
else:
    suggest_status = "PENDING_REVIEW"
    suggest_tier = "tier3"
```

---

## 📤 Outputs & Governance

- **Trace Log:** Lists domains that were detected but rejected because they hit **Section G** (e.g., Marketplace domains or excluded categories).
- **UCR Feedback Loop:** Provides buttons to "Approve and Add to Section C" within the UI.
- **Audit:** Tracks "Threat Velocity" (How quickly new players are entering the Section B Fence).

---

## ⛔ Stop Rules (UCR-Based)

1. **Incomplete Section C:** Stop if the current competitive set is not yet validated.
2. **Generic Category:** Stop if Section B is too broad, as it will flag too many irrelevant domains.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const EmergingCompetitorContract = {
  inputSchema: z.object({
    currentCompetitors: z.array(z.string()),
    categoryFence: z.array(z.string())
  }),
  outputSchema: z.object({
    newDomains: z.array(z.object({
      domain: z.string(),
      overlap: z.number(),
      suggestedTier: z.string()
    }))
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `EmergingCompetitorContract` in `shared/module.contract.ts`.
- Set tracking for domains outside Section C but inside Section B.

### Step 2: Gateway Integration
- Use Section G to filter out marketplaces (e.g., Amazon, Walmart) from being flagged as "Competitors".
- Anchor all entity detection to the Geography defined in Section A.

### Step 3: Core Logic & Scoring
- Implement domain overlap analysis (category overlap).
- Suggest `Tier` based on authority and traffic proximity to the brand.

### Step 4: Governance & UI
- Add "Approve to Section C" button on detected emerging players.
- Audit trail for why a domain was suggested for inclusion.

## 🧪 Example Output
> "New Potential Competitor: 'FoamWalk.io'. 70% overlap with **Section B Category**. Recommendation: Add to **Section C** for tracking."
