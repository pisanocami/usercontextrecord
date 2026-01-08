# Breakout Terms & Trend Alerts Playbook/

Confidence Level: Medium
Last Updated: 13 de diciembre de 2025
Module: Breakout Terms & Trend Alerts
Owner Council: Strategic Intelligence
Playbook Version: v1
Risk if Wrong: Medium
Status: Active

- .md file
    
    ```json
    # 📘 Module Playbook — Breakout Terms & Trend Alerts
    **Module:** Breakout Terms & Trend Alerts  
    **Owner Council:** Strategic Intelligence  
    **Status:** Active  
    **Version:** v1  
    **Inference Type:** External  
    **Confidence Level:** Medium  
    **Risk if Wrong:** Medium  
    
    ---
    
    ## 🧠 Module Overview
    
    This module detects **early signals of emerging demand** by identifying search terms whose interest is accelerating faster than baseline category growth.
    
    Its purpose is to surface:
    - New use cases
    - Shifting language
    - Early-stage demand pockets
    
    Before they are obvious in revenue or rankings.
    
    ---
    
    ## 🎯 Strategic Role in the OS
    
    **Primary role:**  
    Identify **what’s starting to matter** — not what already dominates.
    
    **This module informs:**
    - Content ideation
    - Creative angle testing
    - Product messaging shifts
    - Market Momentum Index
    
    **This module does NOT:**
    - Predict revenue
    - Replace keyword research
    - Guarantee sustained demand
    
    It surfaces **signals**, not outcomes.
    
    ---
    
    ## 🧩 Inputs & Data Sources
    
    ### Primary Data Sources
    - **Google Trends**
    - **Ahrefs** (validation only)
    
    ### Scope Rules
    - Compare terms **against category baseline**
    - Exclude:
      - Brand-specific spikes
      - One-week anomalies
    - Refresh **monthly**
    
    > Council rule:  
    > *Acceleration matters more than absolute volume.*
    
    ---
    
    ## 🔧 Core Logic & Detection Rules
    
    A term is flagged when:
    - Search interest accelerates faster than category average
    - Growth persists across multiple weeks
    - Similar phrasing appears across related queries
    
    Breakout terms are **clustered**, not listed individually.
    
    ---
    
    ## 🧠 Council Reasoning Layer
    
    The Strategic Intelligence Council enforces:
    
    1. **Velocity > size**  
    2. **Consistency > novelty**  
    3. **Language shifts precede category shifts**
    
    False positives are expected — restraint is required.
    
    ---
    
    ## 🚦 Confidence & Risk Profile
    
    - **Confidence Level:** Medium  
    - **Risk if Wrong:** Medium  
    
    Why:
    - Trends data is normalized
    - Early signals may fade
    
    This module must be corroborated before major investment.
    
    ---
    
    ## 📤 Outputs & Artifacts
    
    - Breakout term clusters
    - Acceleration indicators
    - Executive alert summary
    
    Feeds directly into:
    - Market Momentum Index
    - Strategic Summary
    - Action Cards (exploratory only)
    
    ---
    
    ## 🧭 Interpretation Guidelines
    
    ### What this means
    - Where attention may shift next
    - How buyers describe problems differently
    - Early messaging opportunities
    
    ### What this does NOT mean
    - “Build a full product”
    - “Bet the quarter”
    - “This will convert now”
    
    ---
    
    ## ⛔ Stop Rules
    
    Do **not** escalate when:
    - Spikes are isolated
    - Terms lack commercial intent
    - No supporting category movement exists
    
    In these cases:
    > Flag as **monitor only**.
    
    ---
    
    ## Final Principle
    
    This module exists to answer:
    > **“What’s starting to change?”**
    
    Not:
    > “What will definitely matter?”
    ```
    

# 📘 Module Playbook — Breakout Terms & Trend Alerts

**Module:** Breakout Terms & Trend Alerts

**Owner Council:** Strategic Intelligence

**Status:** Active

**Version:** v1

**Inference Type:** External

**Confidence Level:** Medium

**Risk if Wrong:** Medium

---

## 🧠 Module Overview

This module detects **early signals of emerging demand** by identifying search terms whose interest is accelerating faster than baseline category growth.

Its purpose is to surface:

- New use cases
- Shifting language
- Early-stage demand pockets

Before they are obvious in revenue or rankings.

---

## 🎯 Strategic Role in the OS

**Primary role:**

Identify **what’s starting to matter** — not what already dominates.

**This module informs:**

- Content ideation
- Creative angle testing
- Product messaging shifts
- Market Momentum Index

**This module does NOT:**

- Predict revenue
- Replace keyword research
- Guarantee sustained demand

It surfaces **signals**, not outcomes.

---

## 🧩 Inputs & Data Sources

### Primary Data Sources

- **Google Trends**
- **Ahrefs** (validation only)

### Scope Rules

- Compare terms **against category baseline**
- Exclude:
    - Brand-specific spikes
    - One-week anomalies
- Refresh **monthly**

> Council rule:
> 
> 
> *Acceleration matters more than absolute volume.*
> 

---

## 🔧 Core Logic & Detection Rules

A term is flagged when:

- Search interest accelerates faster than category average
- Growth persists across multiple weeks
- Similar phrasing appears across related queries

Breakout terms are **clustered**, not listed individually.

---

## 🧠 Council Reasoning Layer

The Strategic Intelligence Council enforces:

1. **Velocity > size**
2. **Consistency > novelty**
3. **Language shifts precede category shifts**

False positives are expected — restraint is required.

---

## 🚦 Confidence & Risk Profile

- **Confidence Level:** Medium
- **Risk if Wrong:** Medium

Why:

- Trends data is normalized
- Early signals may fade

This module must be corroborated before major investment.

---

## 📤 Outputs & Artifacts

- Breakout term clusters
- Acceleration indicators
- Executive alert summary

Feeds directly into:

- Market Momentum Index
- Strategic Summary
- Action Cards (exploratory only)

---

## 🧭 Interpretation Guidelines

### What this means

- Where attention may shift next
- How buyers describe problems differently
- Early messaging opportunities

### What this does NOT mean

- “Build a full product”
- “Bet the quarter”
- “This will convert now”

---

## ⛔ Stop Rules

Do **not** escalate when:

- Spikes are isolated
- Terms lack commercial intent
- No supporting category movement exists

In these cases:

> Flag as monitor only.
> 

---

## Final Principle

This module exists to answer:

> “What’s starting to change?”
> 

Not:

> “What will definitely matter?”
>