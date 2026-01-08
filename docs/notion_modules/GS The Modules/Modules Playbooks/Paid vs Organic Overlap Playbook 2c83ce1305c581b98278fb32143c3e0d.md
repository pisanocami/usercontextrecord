# Paid vs Organic Overlap Playbook

Confidence Level: Medium
Last Updated: 13 de diciembre de 2025
Module: Paid vs Organic Overlap (SERP Cannibalization)
Owner Council: Performance Media & Messaging
Playbook Version: v1
Risk if Wrong: High
Status: Active
Supporting Councils: Ops & Attribution

- .md file
    
    ```json
    # 📘 Module Playbook — Paid vs Organic Overlap (SERP Cannibalization)
    **Module:** Paid vs Organic Overlap (SERP Cannibalization)  
    **Owner Council:** Performance Media & Messaging  
    **Supporting Councils:** Ops & Attribution  
    **Status:** Active  
    **Version:** v1  
    **Inference Type:** External  
    **Confidence Level:** Medium  
    **Risk if Wrong:** High  
    
    ---
    
    ## 🧠 Module Overview
    
    This module identifies where **paid media spend overlaps with organic visibility** on the same SERPs, creating potential **cannibalization or defensive inefficiency**.
    
    Its purpose is to answer:
    > **“Are we paying for demand we already own — and if so, where should we change behavior?”**
    
    This module treats overlap as a **diagnostic signal**, not a default optimization mandate.
    
    ---
    
    ## 🎯 Strategic Role in the OS
    
    **Primary role:**  
    Expose spend inefficiencies caused by unnecessary paid coverage.
    
    **This module informs:**
    - Budget reallocation decisions
    - Brand vs non-brand bidding strategy
    - SEO vs paid arbitration
    
    **This module does NOT:**
    - Automatically recommend pausing paid campaigns
    - Prove incrementality on its own
    - Replace controlled testing
    
    Incrementality validation happens downstream.
    
    ---
    
    ## 🧩 Inputs & Data Sources
    
    ### Primary Data Sources
    - **SERPAPI** — Paid ad presence by keyword
    - **Bright Data** — Organic SERP snapshots (selective)
    
    ### Scope Constraints
    - Focus on **high-intent keywords only**
    - Limit analysis to **top 10–20 SERPs**
    - Snapshot monthly, not weekly
    
    > Council rule:  
    > *If organic rank is below position 5, do not treat overlap as cannibalization.*
    
    ---
    
    ## 🔧 Core Logic & Overlap Classification
    
    Each keyword is classified into one of four states:
    
    1. **Paid Only** — Justified coverage  
    2. **Organic Only** — No paid needed  
    3. **Paid + Organic (Defensive)** — May be justified  
    4. **Paid + Organic (Redundant)** — Investigate reallocation  
    
    Overlap becomes actionable only when:
    - Organic rank ≤ 3  
    - Brand strength is established  
    - No SERP features suppress clicks  
    
    ---
    
    ## 🧠 Council Reasoning Layer
    
    The Performance Media Council enforces:
    - Efficiency over platform norms
    - Margin impact over CTR optics
    
    The Ops & Attribution Council enforces:
    - No reallocation without measurement confidence
    - Clear acknowledgment of attribution bias
    
    Overlap is a **hypothesis**, not a verdict.
    
    ---
    
    ## 🚦 Confidence & Risk Profile
    
    - **Confidence Level:** Medium  
    - **Risk if Wrong:** High  
    
    Why:
    - Overlap ≠ cannibalization
    - Brand terms often require defense
    - Missteps can reduce total conversions
    
    ---
    
    ## 📤 Outputs & Artifacts
    
    - Overlap table by keyword
    - Estimated redundant spend range
    - Flags requiring incrementality testing
    
    Feeds directly into:
    - Action Cards
    - Deprioritization Flags
    - OS Drop
    
    ---
    
    ## 🧭 Interpretation Guidelines
    
    ### What this means
    - Where paid may be inefficient
    - Where SEO has earned coverage
    - Where testing is warranted
    
    ### What this does NOT mean
    - “Turn off paid”
    - “SEO replaces paid”
    - “This saves money immediately”
    
    ---
    
    ## ⛔ Stop Rules
    
    Do **not** act on this module alone when:
    - Attribution is unreliable
    - Brand terms dominate conversion paths
    - SERP features change frequently
    
    ---
    
    ## Final Principle
    
    This module exists to answer:
    > **“Where might paid spend be inefficient?”**
    
    Not:
    > “What should we turn off?”
    ```
    

# 📘 Module Playbook — Paid vs Organic Overlap (SERP Cannibalization)

**Module:** Paid vs Organic Overlap (SERP Cannibalization)

**Owner Council:** Performance Media & Messaging

**Supporting Councils:** Ops & Attribution

**Status:** Active

**Version:** v1

**Inference Type:** External

**Confidence Level:** Medium

**Risk if Wrong:** High

---

## 🧠 Module Overview

This module identifies where **paid media spend overlaps with organic visibility** on the same SERPs, creating potential **cannibalization or defensive inefficiency**.

Its purpose is to answer:

> “Are we paying for demand we already own — and if so, where should we change behavior?”
> 

This module treats overlap as a **diagnostic signal**, not a default optimization mandate.

---

## 🎯 Strategic Role in the OS

**Primary role:**

Expose spend inefficiencies caused by unnecessary paid coverage.

**This module informs:**

- Budget reallocation decisions
- Brand vs non-brand bidding strategy
- SEO vs paid arbitration

**This module does NOT:**

- Automatically recommend pausing paid campaigns
- Prove incrementality on its own
- Replace controlled testing

Incrementality validation happens downstream.

---

## 🧩 Inputs & Data Sources

### Primary Data Sources

- **SERPAPI** — Paid ad presence by keyword
- **Bright Data** — Organic SERP snapshots (selective)

### Scope Constraints

- Focus on **high-intent keywords only**
- Limit analysis to **top 10–20 SERPs**
- Snapshot monthly, not weekly

> Council rule:
> 
> 
> *If organic rank is below position 5, do not treat overlap as cannibalization.*
> 

---

## 🔧 Core Logic & Overlap Classification

Each keyword is classified into one of four states:

1. **Paid Only** — Justified coverage
2. **Organic Only** — No paid needed
3. **Paid + Organic (Defensive)** — May be justified
4. **Paid + Organic (Redundant)** — Investigate reallocation

Overlap becomes actionable only when:

- Organic rank ≤ 3
- Brand strength is established
- No SERP features suppress clicks

---

## 🧠 Council Reasoning Layer

The Performance Media Council enforces:

- Efficiency over platform norms
- Margin impact over CTR optics

The Ops & Attribution Council enforces:

- No reallocation without measurement confidence
- Clear acknowledgment of attribution bias

Overlap is a **hypothesis**, not a verdict.

---

## 🚦 Confidence & Risk Profile

- **Confidence Level:** Medium
- **Risk if Wrong:** High

Why:

- Overlap ≠ cannibalization
- Brand terms often require defense
- Missteps can reduce total conversions

---

## 📤 Outputs & Artifacts

- Overlap table by keyword
- Estimated redundant spend range
- Flags requiring incrementality testing

Feeds directly into:

- Action Cards
- Deprioritization Flags
- OS Drop

---

## 🧭 Interpretation Guidelines

### What this means

- Where paid may be inefficient
- Where SEO has earned coverage
- Where testing is warranted

### What this does NOT mean

- “Turn off paid”
- “SEO replaces paid”
- “This saves money immediately”

---

## ⛔ Stop Rules

Do **not** act on this module alone when:

- Attribution is unreliable
- Brand terms dominate conversion paths
- SERP features change frequently

---

## Final Principle

This module exists to answer:

> “Where might paid spend be inefficient?”
> 

Not:

> “What should we turn off?”
>