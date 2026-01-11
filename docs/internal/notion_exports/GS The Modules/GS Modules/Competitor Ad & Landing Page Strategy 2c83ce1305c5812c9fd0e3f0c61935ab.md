# Competitor Ad & Landing Page Strategy

Active: Ready for Review
Confidence Level: Medium
Decision Type: Prioritize
Downstream Outputs: Creative Insights;Executive Summary
Inference Type: External
Module Layer: Signal
Module Version: v1
Narrative Section: Execution Signals
Owner Council: Performance Media & Messaging (https://www.notion.so/Performance-Media-Messaging-2c83ce1305c581d3a3f2f5e76630d039?pvs=21)
Primary Question Answered: What messages are winning in-market right now?
Reusable Dataset: FALSE
Risk if Wrong: Medium
Supporting Councils: Creative & Funnel
Upstream Data Sets: Bright Data;SERPAPI

```python
# 🛠️ Developer Instructions — Competitor Ad & Landing Page Strategy Module

**Module:** Competitor Ad & Landing Page Strategy  
**Owner Council:** Performance Media & Messaging  
**Supporting Councils:** Creative & Funnel, Strategic Intelligence  
**Version:** v1  
**Inference Type:** External  
**Primary Output:** Decision-Constrained Pattern Summary (NOT recommendations)

---

## 🎯 Purpose (Engineering Context)

This module exists to **surface market messaging patterns** from competitor ads and landing pages and translate them into **bounded, hypothesis-ready insights** for downstream decision-making.

It must:
- Detect **patterns and convergence**, not performance
- Enforce **restraint and non-prescription**
- Produce outputs that **inform tests**, not dictate actions
- Never imply “what works,” only “what competitors are betting on”

This module **does not decide**.  
It **feeds context** into Action Cards and Creative/Funnel workflows.

---

## 🧩 Inputs (Required)

### Required Inputs
```json
{
  "brand_domain": "string",
  "competitor_domains": ["string"],
  "category_keywords": ["string"],
  "run_date": "YYYY-MM-DD"
}
```

### **Constraints**

- competitor_domains: max **5**
- category_keywords: curated list only (no long-tail expansion)
- Reject runs where:
    - competitor_domains < 2
    - category_keywords < 3

---

## **📡 Data Collection (Cost-Controlled)**

### **1️⃣ SERPAPI — Paid Ad Copy**

**Scope**

- Query only:
    - Category-level keywords
    - High-intent modifiers (e.g. “best”, “buy”, “reviews”, “pricing”)
- Capture:
    - Headline
    - Description
    - Display URL
    - Advertiser domain

**Limits**

- Max **10–15 ads per competitor**
- Ignore:
    - DKI variants
    - Near-duplicate ads
    - Retargeting-only language (brand-only queries)

**Cache Policy**

- Cache by competitor + keyword set
- Re-scrape only if:
    - Last snapshot > 30 days old
    - Or keyword set materially changes

---

### **2️⃣ Bright Data — Landing Page Snapshots**

**Scope**

- Max **1–2 landing pages per competitor**
- Capture only:
    - Hero headline
    - Subhead / value proposition
    - Primary CTA text
    - Offer framing (e.g. guarantee, trial, discount)

**Ignore**

- Visual styling
- Layout differences
- Secondary CTAs
- Testimonials (unless explicitly part of offer)

---

## **🔧 Core Processing Logic**

### **Step 1: Normalize Inputs**

- Deduplicate ads by semantic similarity
- Normalize copy to lowercase
- Strip pricing numbers into tokens (do not evaluate value)

---

### **Step 2: Pattern Classification**

### **Ad Hook Taxonomy (Required)**

Classify each ad into one or more:

- IDENTITY
- URGENCY
- AUTHORITY
- PROBLEM_SOLUTION
- OUTCOME_PROMISE

### **Offer Framing Taxonomy**

- DISCOUNT
- FREE_TRIAL
- GUARANTEE
- RISK_REVERSAL
- PROOF
- NONE

### **Landing Page Structure**

- SHORT_FUNNEL vs LONG_FUNNEL
- SINGLE_CTA vs MULTI_CTA
- PRICE_VISIBLE vs PRICE_HIDDEN

---

### **Step 3: Pattern Aggregation**

Aggregate **across competitors**, not per competitor.

Rules:

- A pattern is **valid** only if:
    - Appears across ≥ 2 competitors
- Single-competitor patterns → flag as LOW_CONFIDENCE

---

## **🧠 Decision Guardrails (Non-Negotiable)**

The module **MUST NOT**:

- Recommend copying creative
- Claim performance (“this works”)
- Rank competitors
- Suggest spend changes
- Use prescriptive language

If any output includes:

- “We should copy…”
- “This ad performs…”
- “Best performing…”

→ **FAIL the run**

---

## **📦 Decision Summary Object (Required Output)**

Before any narrative generation, produce this object:

```json
{
  "module": "competitor_ad_landing_page",
  "pattern_confidence": "LOW | MEDIUM | HIGH",
  "detected_patterns": [
    {
      "pattern_type": "AUTHORITY + URGENCY",
      "evidence_count": 3,
      "competitors_involved": ["competitor_a", "competitor_b"],
      "notes": "Repeated use of expert endorsements + time-bound language"
    }
  ],
  "market_signal": "CONVERGENCE | DIVERGENCE | INCONCLUSIVE",
  "actionability": "TEST_ONLY | CONTEXT_ONLY",
  "do_not_use_for": [
    "performance claims",
    "direct cloning",
    "budget decisions"
  ]
}
```

This object is the **source of truth**.

---

## **✍️ LLM Narrative Generation (Constrained)**

### **Prompt Contract**

The LLM may ONLY:

- Explain detected patterns
- Describe possible market psychology
- Frame **testable hypotheses**

### **Prompt Rules**

```
You are explaining observed competitor behavior.

You may NOT:
- Recommend copying creative
- Claim effectiveness
- Use prescriptive language

You MUST:
- Frame insights as hypotheses
- Reference pattern convergence, not outcomes
- Maintain neutral, observational tone 
```

You are explaining observed competitor behavior.

You may NOT:

- Recommend copying creative
- Claim effectiveness
- Use prescriptive language

You MUST:

- Frame insights as hypotheses
- Reference pattern convergence, not outcomes
- Maintain neutral, observational tone