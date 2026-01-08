# 📘 Module Playbook — Share of Voice vs Competitors (UCR-Adapted)

**Status:** Active | **Version:** v1.0-UCR | **Inference Type:** External

---

## 🧠 Module Overview & UCR Mission

Measures the percentage of "Real Estate" (SERP clicks) the brand captures compared to its rivals. In the UCR architecture, this is the final **Market Domination Score** filtered by the **Competitive Set (Section C)**.

**Principle:** Relative-First. Performance is always relative to who is in the UCR.

---

## 🎯 Strategic Role in the UCR Architecture

**Primary role:** Quantify market share capture within the approved strategic window.
**Execution Gateway Role:**
- Injects full list of `Section C` competitors.
- Weight results by `Section C.tier` (Tier 1 share counts more than Tier 3).

---

## 🧩 UCR Requirements & Gating

### Required Sections
- **Section C (Competitive Set):** Full list of domains and tiers.
- **Section B (Category Definition):** The volume baseline for SOV calculation.
- **Section G (Negative Scope):** Filters out competitor share in "Excluded Use Cases".

### UCR Status Requirement
- **Status:** `LOCKED`.

---

## 🔧 Core Logic & Weighted Share

### 1. Domain Coverage
Calculate SOV for all players.

### 2. Tiered Weighting
`Score = (Brand_SOV / (Tier1_Avg_SOV + Tier2_Avg_SOV)) * 100`

```python
for competitor in config.competitors:
    if competitor.tier == 'tier3':
        excluded_from_main_sov(competitor)
```

---

## 📤 Outputs & Governance

- **Trace Log:** Shows which "Competitors" in the SERP were ignored because they weren't in Section C.
- **Strategic Brief:** Compares `Brand_SOV` vs `Strategic_Intent.primary_goal`.
- **Quality Score:** Contributes to the `competitor_confidence` metric in Section H.

---

## ⛔ Stop Rules (UCR-Based)

1. **Competitor Gap:** Stop if Section C has < 2 confirmed players.
2. **Status Locked:** Only run on Locked UCRs to ensure SOV tracking is stable.

---

## 🛠 Implementation Details (Developer-First)

### Zod Schema (Input/Output)
```typescript
export const ShareOfVoiceContract = {
  inputSchema: z.object({
    competitors: z.array(z.any()),
    keywords: z.array(z.string())
  }),
  outputSchema: z.object({
    brandSov: z.number(),
    marketLeaders: z.array(z.any())
  })
};
```

---

---

## 🚀 Development Plan

### Step 1: Contract & Schema
- Define `ShareOfVoiceContract` in `shared/module.contract.ts`.
- Match against Section C domains and Section B category queries.

### Step 2: Gateway Integration
- Validate that all competitors measured are in the active Section C dictionary.
- Ensure the "Market Share" is calculated only within the Section B Fence.

### Step 3: Core Logic & Scoring
- Aggregate weighted visibility scores for the Brand vs each Section C entity.
- Rank entities and calculate the "Gap to Leader".

### Step 4: Governance & UI
- Render the SOV Bar Chart and Gap Table.
- Trace log for which Section D keyword clusters are driving or dragging SOV.

## 🧪 Example Output
> "Share of Voice (SOV): 12.5%. You are currently **3rd in Tier 1**. Main rival: Competitor Y (Section C). Gap is widening in **Section B category** 'Insoles'."
