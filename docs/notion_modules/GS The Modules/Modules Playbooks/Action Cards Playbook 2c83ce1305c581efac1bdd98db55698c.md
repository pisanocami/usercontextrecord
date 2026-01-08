# Action Cards Playbook

Confidence Level: High
Last Updated: 13 de diciembre de 2025
Module: Action Cards
Owner Council: Growth Strategy & Planning
Playbook Version: v1
Risk if Wrong: High
Status: Active
Supporting Councils: All Councils

- .md file
    
    ```json
    # 📘 Module Playbook — Action Cards
    **Module:** Action Cards  
    **Owner Council:** Growth Strategy & Planning  
    **Supporting Councils:** All Councils  
    **Status:** Active  
    **Version:** v1  
    **Inference Type:** Hybrid  
    **Confidence Level:** High  
    **Risk if Wrong:** High  
    
    ---
    
    ## 🧠 Module Overview
    
    Action Cards translate Growth Signal insights into **clear, discrete decisions** that teams can actually execute.
    
    Each Action Card answers:
    > **“What exactly should we do next — and why?”**
    
    This module is where insight becomes **movement**.
    
    Action Cards are not tasks.  
    They are **decision units** designed to be debated, approved, sequenced, or rejected.
    
    ---
    
    ## 🎯 Strategic Role in the OS
    
    **Primary role:**  
    Convert analysis into **bounded, decision-ready recommendations**.
    
    This module:
    - Aggregates signal from multiple upstream modules
    - Applies council judgment
    - Produces actions that can be prioritized or deprioritized
    
    **This module does NOT:**
    - Decide execution order (Priority Scoring does that)
    - Set budgets (resolved downstream)
    - Guarantee outcomes
    
    ---
    
    ## 🧩 Inputs & Data Sources
    
    **Upstream Inputs**
    - Keyword Gap & Visibility
    - Market Demand & Seasonality
    - Market Momentum Index
    - Paid vs Organic Overlap
    - Share of Voice vs Competitors
    - Ops & Attribution confidence flags
    
    No new data is pulled.
    
    ---
    
    ## 🔧 Core Logic & Card Construction
    
    Each Action Card must contain **exactly five elements**:
    
    ### 1. Action
    What to do — clearly and specifically.
    
    ### 2. Rationale
    Why this action matters *now*, tied to signal.
    
    ### 3. Expected Impact
    Directional outcome (demand capture, efficiency, risk reduction).
    
    ### 4. Confidence Level
    High / Medium / Inferred  
    Derived from upstream module confidence.
    
    ### 5. Dependencies or Constraints
    What must be true for this action to work.
    
    ---
    
    ## 🧠 Council Reasoning Layer
    
    The Growth Strategy & Planning Council enforces:
    
    - No vague recommendations
    - No “test everything” language
    - No actions without signal support
    - One primary action per card
    
    Supporting councils may:
    - Add constraints
    - Downgrade confidence
    - Recommend deferment
    
    ---
    
    ## 📤 Outputs & Artifacts
    
    - Discrete Action Cards (JSON + UI)
    - Each card tied to source modules
    - Confidence + risk surfaced explicitly
    
    Action Cards feed directly into:
    - Priority Scoring
    - Deprioritization Flags
    - OS Drop
    
    ---
    
    ## 🧭 Interpretation Guidelines
    
    Action Cards are meant to be:
    - Discussed in leadership meetings
    - Accepted, modified, or rejected
    - Tracked over time
    
    They are **not execution tickets**.
    
    ---
    
    ## ⛔ Stop Rules
    
    Do not generate Action Cards when:
    - Confidence is downgraded due to data integrity
    - Signal is purely speculative
    - Structural constraints dominate (flag instead)
    
    ---
    
    ## 🧪 Example Action Card
    
    **Action:**  
    Launch mid-funnel category pages for “recovery sandals” and related clusters.
    
    **Rationale:**  
    Competitors capture ~$300–400K/month in mid-intent demand where organic clicks remain available.
    
    **Expected Impact:**  
    Improved organic demand capture and reduced reliance on paid coverage.
    
    **Confidence:**  
    Medium (external inference, validated by multiple competitors).
    
    **Dependencies:**  
    Requires internal linking updates and product page alignment.
    
    ---
    
    ## Final Principle
    
    This module exists to answer:
    > **“What should we do — based on what we now know?”**
    
    Not:
    > “What could we experiment with endlessly?”
    ```
    

# 📘 Module Playbook — Action Cards

**Module:** Action Cards

**Owner Council:** Growth Strategy & Planning

**Supporting Councils:** All Councils

**Status:** Active

**Version:** v1

**Inference Type:** Hybrid

**Confidence Level:** High

**Risk if Wrong:** High

---

## 🧠 Module Overview

Action Cards translate Growth Signal insights into **clear, discrete decisions** that teams can actually execute.

Each Action Card answers:

> “What exactly should we do next — and why?”
> 

This module is where insight becomes **movement**.

Action Cards are not tasks.

They are **decision units** designed to be debated, approved, sequenced, or rejected.

---

## 🎯 Strategic Role in the OS

**Primary role:**

Convert analysis into **bounded, decision-ready recommendations**.

This module:

- Aggregates signal from multiple upstream modules
- Applies council judgment
- Produces actions that can be prioritized or deprioritized

**This module does NOT:**

- Decide execution order (Priority Scoring does that)
- Set budgets (resolved downstream)
- Guarantee outcomes

---

## 🧩 Inputs & Data Sources

**Upstream Inputs**

- Keyword Gap & Visibility
- Market Demand & Seasonality
- Market Momentum Index
- Paid vs Organic Overlap
- Share of Voice vs Competitors
- Ops & Attribution confidence flags

No new data is pulled.

---

## 🔧 Core Logic & Card Construction

Each Action Card must contain **exactly five elements**:

### 1. Action

What to do — clearly and specifically.

### 2. Rationale

Why this action matters *now*, tied to signal.

### 3. Expected Impact

Directional outcome (demand capture, efficiency, risk reduction).

### 4. Confidence Level

High / Medium / Inferred

Derived from upstream module confidence.

### 5. Dependencies or Constraints

What must be true for this action to work.

---

## 🧠 Council Reasoning Layer

The Growth Strategy & Planning Council enforces:

- No vague recommendations
- No “test everything” language
- No actions without signal support
- One primary action per card

Supporting councils may:

- Add constraints
- Downgrade confidence
- Recommend deferment

---

## 📤 Outputs & Artifacts

- Discrete Action Cards (JSON + UI)
- Each card tied to source modules
- Confidence + risk surfaced explicitly

Action Cards feed directly into:

- Priority Scoring
- Deprioritization Flags
- OS Drop

---

## 🧭 Interpretation Guidelines

Action Cards are meant to be:

- Discussed in leadership meetings
- Accepted, modified, or rejected
- Tracked over time

They are **not execution tickets**.

---

## ⛔ Stop Rules

Do not generate Action Cards when:

- Confidence is downgraded due to data integrity
- Signal is purely speculative
- Structural constraints dominate (flag instead)

---

## 🧪 Example Action Card

**Action:**

Launch mid-funnel category pages for “recovery sandals” and related clusters.

**Rationale:**

Competitors capture ~$300–400K/month in mid-intent demand where organic clicks remain available.

**Expected Impact:**

Improved organic demand capture and reduced reliance on paid coverage.

**Confidence:**

Medium (external inference, validated by multiple competitors).

**Dependencies:**

Requires internal linking updates and product page alignment.

---

## Final Principle

This module exists to answer:

> “What should we do — based on what we now know?”
> 

Not:

> “What could we experiment with endlessly?”
>