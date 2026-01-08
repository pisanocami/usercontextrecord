# Competitor Ad & Landing Page Strategy Playbook

Confidence Level: Medium
Last Updated: 13 de diciembre de 2025
Module: Competitor Ad & Landing Page Strategy
Owner Council: Performance Media & Messaging
Playbook Version: v1
Risk if Wrong: Medium
Status: Active
Supporting Councils: Creative & Funnel

- .md file
    
    ```json
    # 📘 Module Playbook — Competitor Ad & Landing Page Strategy
    **Module:** Competitor Ad & Landing Page Strategy  
    **Owner Council:** Performance Media & Messaging  
    **Supporting Councils:** Creative & Funnel, Strategic Intelligence  
    **Status:** Active  
    **Version:** v1  
    **Inference Type:** External  
    **Confidence Level:** Medium  
    **Risk if Wrong:** Medium  
    
    ---
    
    ## 🧠 Module Overview
    
    This module analyzes **how competitors are showing up in-market right now** — across ads and landing pages — to surface **message patterns, offer strategies, and funnel structures** that appear to be winning attention.
    
    Its purpose is **not** to copy competitors.
    
    Its purpose is to answer:
    > **“What narratives, hooks, and offers are competitors betting on — and what does that tell us about market psychology right now?”**
    
    This module treats competitor execution as **signal**, not instruction.
    
    ---
    
    ## 🎯 Strategic Role in the OS
    
    **Primary role:**  
    Inform **messaging, creative direction, and offer framing** based on observable in-market behavior.
    
    **This module informs:**
    - Creative & Funnel Council recommendations
    - Performance Media messaging tests
    - Action Cards related to narrative or offer shifts
    
    **This module does NOT:**
    - Judge performance outcomes directly
    - Recommend cloning creative
    - Replace first-party creative testing
    
    It provides **context**, not prescriptions.
    
    ---
    
    ## 🧩 Inputs & Data Sources
    
    ### Primary Data Sources
    - **SERPAPI** (paid ad copy for category + brand terms)
    - **Bright Data** (landing page snapshots)
    
    ### Cost-Controlled Scope
    - Max **5 competitors**
    - Max **10–15 ads per competitor**
    - Max **1–2 landing pages per competitor**
    - Snapshots refreshed **monthly**, not weekly
    
    > Council rule:  
    > *If messaging has not changed in 30 days, do not re-scrape.*
    
    ---
    
    ## ⚡ Cost-Optimized Collection Strategy
    
    **Principle:**  
    > *Few examples, deeply interpreted, beat massive scraping.*
    
    ### Ad Collection
    - Focus on:
      - Category-level keywords
      - High-intent modifiers
    - Ignore:
      - Long-tail ad variants
      - Dynamic keyword insertion noise
    
    ### Landing Page Collection
    - Capture:
      - Hero headline
      - Subhead / value proposition
      - Primary CTA
      - Offer framing
    - Ignore:
      - Design flourishes
      - Minor UI differences
    
    ---
    
    ## 🔧 Core Logic & Pattern Extraction
    
    ### Ad-Level Analysis
    Identify:
    - Hook types (identity, urgency, authority, problem-solution)
    - Offer framing (discount, guarantee, proof, risk reversal)
    - Language patterns (pricing transparency, outcomes, social proof)
    
    ### Landing Page Analysis
    Identify:
    - Funnel structure (short vs long)
    - CTA strategy (single vs multi-step)
    - Narrative alignment with ads
    - Friction points (pricing hidden, unclear differentiation)
    
    ### Output Focus
    - **Patterns**, not individual ads
    - **Clusters**, not screenshots
    
    ---
    
    ## 🧠 Council Reasoning Layer
    
    The Performance Media & Messaging Council enforces:
    
    1. **Competitor spend signals conviction**  
       Repeated messaging across competitors indicates a shared belief about what converts.
    
    2. **Patterns matter more than creativity**  
       If multiple competitors converge on the same hook, it’s likely market-driven.
    
    3. **Execution ≠ effectiveness**  
       This module surfaces *what is being tried*, not *what is working*.
    
    The Creative & Funnel Council adds:
    - Perspective on testability
    - Funnel translation (can this work for us?)
    
    ---
    
    ## 🚦 Confidence & Risk Profile
    
    - **Inference Type:** External  
    - **Confidence Level:** Medium  
    - **Risk if Wrong:** Medium  
    
    **Why:**  
    - Ads indicate intent, not performance
    - Landing pages may be rotated or personalized
    - Copy ≠ conversion
    
    This module should always feed **testing**, not conclusions.
    
    ---
    
    ## 📤 Outputs & Artifacts
    
    ### Structured Outputs
    - Message pattern summary
    - Offer and CTA trends
    - Funnel structure archetypes
    
    ### Visual Outputs
    - Ad copy pattern table
    - Landing page structure comparison (abstracted)
    
    ### Downstream Use
    - Action Cards (messaging tests)
    - Creative briefs
    - Funnel optimization hypotheses
    
    ---
    
    ## 🧭 Interpretation Guidelines (Executive-Safe)
    
    ### What this means
    - What competitors *believe* the market responds to
    - Where messaging convergence suggests strong signal
    - Where differentiation opportunities may exist
    
    ### What this does NOT mean
    - “This ad works”
    - “We should copy this”
    - “This is the best creative”
    
    ---
    
    ## ⛔ Deprioritization & Stop Rules
    
    Do **not** act on this module alone when:
    - Only one competitor uses a pattern
    - Messaging is inconsistent month-to-month
    - Patterns conflict with your positioning or GTM motion
    
    In those cases:
    > Flag as **contextual insight only**, not an action driver.
    
    ---
    
    ## 🤖 LLM / Gemini Prompt Instructions
    
    **Tone**
    - Observational
    - Strategic
    - Non-judgmental
    
    **Structure**
    - Message Pattern Insight
    - Funnel or Offer Implication
    - Testable Opportunity (if applicable)
    
    **Hard Rules**
    - Never recommend copying creative
    - Never claim performance
    - Always frame as hypothesis
    
    ---
    
    ## 🧪 Example Output (Ideal)
    
    > *“Across three competitors, ad messaging consistently emphasizes ‘fast relief’ and ‘doctor-recommended’ authority, paired with landing pages that surface guarantees above the fold. This suggests current buyers prioritize immediacy and trust signals. A controlled test introducing authority-based hooks — without discounting — may be warranted.”*
    
    ---
    
    ## 🔁 Version Notes
    
    - **v1:** Pattern extraction + narrative context
    - **v1.1 (planned):** Time-series message shift detection
    - **v2 (planned):** Integration with first-party creative test results
    
    ---
    
    ## Final Principle
    
    This module exists to answer:
    > **“What messages are competitors betting on right now?”**
    
    It does **not** answer:
    > “What message will definitely work for us?”
    ```
    

# 📘 Module Playbook — Competitor Ad & Landing Page Strategy

**Module:** Competitor Ad & Landing Page Strategy

**Owner Council:** Performance Media & Messaging

**Supporting Councils:** Creative & Funnel, Strategic Intelligence

**Status:** Active

**Version:** v1

**Inference Type:** External

**Confidence Level:** Medium

**Risk if Wrong:** Medium

---

## 🧠 Module Overview

This module analyzes **how competitors are showing up in-market right now** — across ads and landing pages — to surface **message patterns, offer strategies, and funnel structures** that appear to be winning attention.

Its purpose is **not** to copy competitors.

Its purpose is to answer:

> “What narratives, hooks, and offers are competitors betting on — and what does that tell us about market psychology right now?”
> 

This module treats competitor execution as **signal**, not instruction.

---

## 🎯 Strategic Role in the OS

**Primary role:**

Inform **messaging, creative direction, and offer framing** based on observable in-market behavior.

**This module informs:**

- Creative & Funnel Council recommendations
- Performance Media messaging tests
- Action Cards related to narrative or offer shifts

**This module does NOT:**

- Judge performance outcomes directly
- Recommend cloning creative
- Replace first-party creative testing

It provides **context**, not prescriptions.

---

## 🧩 Inputs & Data Sources

### Primary Data Sources

- **SERPAPI** (paid ad copy for category + brand terms)
- **Bright Data** (landing page snapshots)

### Cost-Controlled Scope

- Max **5 competitors**
- Max **10–15 ads per competitor**
- Max **1–2 landing pages per competitor**
- Snapshots refreshed **monthly**, not weekly

> Council rule:
> 
> 
> *If messaging has not changed in 30 days, do not re-scrape.*
> 

---

## ⚡ Cost-Optimized Collection Strategy

**Principle:**

> Few examples, deeply interpreted, beat massive scraping.
> 

### Ad Collection

- Focus on:
    - Category-level keywords
    - High-intent modifiers
- Ignore:
    - Long-tail ad variants
    - Dynamic keyword insertion noise

### Landing Page Collection

- Capture:
    - Hero headline
    - Subhead / value proposition
    - Primary CTA
    - Offer framing
- Ignore:
    - Design flourishes
    - Minor UI differences

---

## 🔧 Core Logic & Pattern Extraction

### Ad-Level Analysis

Identify:

- Hook types (identity, urgency, authority, problem-solution)
- Offer framing (discount, guarantee, proof, risk reversal)
- Language patterns (pricing transparency, outcomes, social proof)

### Landing Page Analysis

Identify:

- Funnel structure (short vs long)
- CTA strategy (single vs multi-step)
- Narrative alignment with ads
- Friction points (pricing hidden, unclear differentiation)

### Output Focus

- **Patterns**, not individual ads
- **Clusters**, not screenshots

---

## 🧠 Council Reasoning Layer

The Performance Media & Messaging Council enforces:

1. **Competitor spend signals conviction**
    
    Repeated messaging across competitors indicates a shared belief about what converts.
    
2. **Patterns matter more than creativity**
    
    If multiple competitors converge on the same hook, it’s likely market-driven.
    
3. **Execution ≠ effectiveness**
    
    This module surfaces *what is being tried*, not *what is working*.
    

The Creative & Funnel Council adds:

- Perspective on testability
- Funnel translation (can this work for us?)

---

## 🚦 Confidence & Risk Profile

- **Inference Type:** External
- **Confidence Level:** Medium
- **Risk if Wrong:** Medium

**Why:**

- Ads indicate intent, not performance
- Landing pages may be rotated or personalized
- Copy ≠ conversion

This module should always feed **testing**, not conclusions.

---

## 📤 Outputs & Artifacts

### Structured Outputs

- Message pattern summary
- Offer and CTA trends
- Funnel structure archetypes

### Visual Outputs

- Ad copy pattern table
- Landing page structure comparison (abstracted)

### Downstream Use

- Action Cards (messaging tests)
- Creative briefs
- Funnel optimization hypotheses

---

## 🧭 Interpretation Guidelines (Executive-Safe)

### What this means

- What competitors *believe* the market responds to
- Where messaging convergence suggests strong signal
- Where differentiation opportunities may exist

### What this does NOT mean

- “This ad works”
- “We should copy this”
- “This is the best creative”

---

## ⛔ Deprioritization & Stop Rules

Do **not** act on this module alone when:

- Only one competitor uses a pattern
- Messaging is inconsistent month-to-month
- Patterns conflict with your positioning or GTM motion

In those cases:

> Flag as contextual insight only, not an action driver.
> 

---

## 🤖 LLM / Gemini Prompt Instructions

**Tone**

- Observational
- Strategic
- Non-judgmental

**Structure**

- Message Pattern Insight
- Funnel or Offer Implication
- Testable Opportunity (if applicable)

**Hard Rules**

- Never recommend copying creative
- Never claim performance
- Always frame as hypothesis

---

## 🧪 Example Output (Ideal)

> “Across three competitors, ad messaging consistently emphasizes ‘fast relief’ and ‘doctor-recommended’ authority, paired with landing pages that surface guarantees above the fold. This suggests current buyers prioritize immediacy and trust signals. A controlled test introducing authority-based hooks — without discounting — may be warranted.”
> 

---

## 🔁 Version Notes

- **v1:** Pattern extraction + narrative context
- **v1.1 (planned):** Time-series message shift detection
- **v2 (planned):** Integration with first-party creative test results

---

## Final Principle

This module exists to answer:

> “What messages are competitors betting on right now?”
> 

It does **not** answer:

> “What message will definitely work for us?”
>