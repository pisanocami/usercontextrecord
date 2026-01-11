# Keyword Gap & Visibility Playbook

Confidence Level: Medium
Last Updated: 13 de diciembre de 2025
Module: Keyword Gap & Visibility
Owner Council: SEO Visibility & Demand
Playbook Version: v1
Risk if Wrong: Medium
Status: Active
Supporting Councils: Strategic Intelligence

```json
# 📘 Module Playbook — Keyword Gap & Visibility  
**Module:** Keyword Gap & Visibility  
**Owner Council:** SEO Visibility & Demand  
**Supporting Councils:** Strategic Intelligence, Performance Media & Messaging  
**Status:** Active  
**Version:** v1  
**Inference Type:** External  
**Confidence Level:** Medium  
**Risk if Wrong:** Medium  

---

## 🧠 Module Overview

This module identifies **commercially meaningful search demand competitors capture that the client does not** — and translates that gap into **lost revenue opportunity**, not abstract traffic.

Its purpose is to turn SEO from a reporting function into a **demand capture lever**, while being explicit about **what is winnable vs structurally constrained**.

This module is:
- Strong for **prioritization**
- Directional for **valuation**
- Not a promise of guaranteed traffic

---

## 🎯 Strategic Role in the OS

**Primary role:**  
Establish *where SEO is a credible growth lever* before paid or product investment.

**This module answers:**  
> “What high-intent demand are competitors capturing today that we are structurally positioned to pursue?”

**This module does NOT answer:**  
- Exact traffic forecasts  
- Guaranteed ROI  
- Execution sequencing (handled downstream)

It feeds directly into:
- Share of Voice vs Competitors
- Paid vs Organic Cannibalization
- Growth Strategy & Planning decisions

---

## 🧩 Inputs & Data Sources

### Primary Data Source
- **Ahrefs — Content Gap API**
  - Scope: domain-level only
  - Competitors: max 5
  - Positions considered: top 20

### Configurable Inputs
| Field | Default | Rationale |
|---|---|---|
| `min_search_volume` | 500 | Removes long-tail noise |
| `positions_to_include` | 1–20 | Ensures real visibility |
| `ctr_assumption` | 0.10 | Used only for *directional* value |

> ⚠️ CTR is treated as a **scenario input**, not truth.

---

## ⚡ Cost-Optimized API Strategy (Council-Approved)

**Principle:**  
> *One cheap call → heavy filtering → limited downstream enrichment.*

### Ahrefs Call Pattern
- **Single `content_gap` call** per client
- `mode=domain` (never URL-level)
- All competitors included in one request

### Caching Rules
- Cache results **weekly**
- Re-run only if:
  - Competitor set changes
  - Category scope changes materially

This keeps API cost predictable and low.

---

## 🔧 Core Logic & Calculations

### Keyword Eligibility Filters
```python
if volume < min_search_volume:
    skip

if cpc <= 0:
    skip

if all(comp_rank > 20 for comp_rank in competitor_ranks):
    skip
```

## **🧠 Council Reasoning Layer**

The SEO Visibility & Demand Council applies four constraints:

1. **Missed visibility only matters where clicks exist**
    
    Ranking ≠ traffic. SERP reality matters downstream.
    
2. **Intent > volume**
    
    Mid-funnel and commercial queries outrank TOF volume.
    
3. **Structure beats content volume**
    
    Architecture and internal linking often matter more than net-new pages.
    
4. **Not all gaps are winnable**
    
    Some demand is better deferred or covered by paid.
    

If a keyword gap:

- Lives in SERPs dominated by ads, shopping, or Google features
    
    → mark as **structurally constrained**
    

---

## **🚦 Confidence & Risk Profile**

- **Inference Type:** External
- **Confidence Level:** Medium
- **Risk if Wrong:** Medium

**Why:**

- CPC is a proxy, not revenue
- CTR varies by brand and SERP features
- SERP dynamics change

This module must always be paired with **SERP validation** or **paid arbitration** before large bets.

---

## **📤 Outputs & Artifacts**

### **Structured Outputs**

- Total missed keyword count
- Directional missed value (aggregate)
- Top keyword clusters by opportunity
- Missed value by competitor

### **Visual Outputs**

- Bar chart: missed value by competitor
- Table: top 10 keyword opportunities

### **Machine-Readable**

- JSON output suitable for:
    - Dashboards
    - Agent reasoning
    - LLM synthesis

---

## **🧭 Interpretation Guidelines (Executive-Safe)**

### **What this means**

- Competitors are capturing **intent you are not**
- SEO may reduce future paid dependency
- Opportunity size is **relative**, not guaranteed

### **What this does NOT mean**

- “Build content for every keyword”
- “SEO will replace paid”
- “This is guaranteed revenue”

---

## **⛔ Deprioritization & Stop Rules**

Do **not** pursue gaps when:

- CPC exists but organic clicks are suppressed
- SERP is dominated by marketplaces or Google properties
- Brand authority is insufficient for near-term capture

Flag these as:

> “Cover via paid or defer”
> 

---

## **🤖 LLM / Gemini Prompt Instructions**

**Tone**

- Executive
- Commercial
- Decisive

**Structure**

- Visibility Insight
- Actionable Fix
- Business Impact (range or directional)

**Hard Rules**

- Never list raw keywords without intent framing
- Never promise revenue
- Always point to *one* next step

---

## **🧪 Example Output (Ideal)**

> “You are missing ~$300–400K/month in mid-intent search demand competitors capture today. These gaps cluster around category-level terms where organic clicks remain available. This is a credible SEO opportunity — but only if supported by structural pages and internal linking. Cover defensively with paid while SEO ramps.”
> 

---

## **🔁 Version Notes**

- **v1:** Directional valuation + prioritization
- **v1.1 (planned):** SERP hostility scoring
- **v2 (planned):** First-party CTR calibration

---

## **Final Principle**

This module exists to answer:

> “Is SEO a smart place to invest next?”
> 

It does not answer:

> “How much revenue will SEO generate?”
> 

That distinction protects trust — and budget.