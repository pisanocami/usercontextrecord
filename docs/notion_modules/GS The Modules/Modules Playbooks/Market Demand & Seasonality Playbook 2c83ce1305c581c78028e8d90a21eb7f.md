# Market Demand & Seasonality Playbook

Confidence Level: High
Last Updated: 13 de diciembre de 2025
Module: Market Demand & Seasonality
Owner Council: Strategic Intelligence
Playbook Version: v1
Risk if Wrong: Medium
Status: Active

- .md file
    
    ```json
    # 📘 Module Playbook — Market Demand & Seasonality  
    **Module:** Market Demand & Seasonality  
    **Owner Council:** Strategic Intelligence  
    **Supporting Councils:** Growth Strategy & Planning, Performance Media & Messaging  
    **Status:** Active  
    **Version:** v1  
    **Inference Type:** External  
    **Confidence Level:** High  
    **Risk if Wrong:** Medium  
    
    ---
    
    ## 🧠 Module Overview
    
    This module surfaces **historical and near-term demand cycles** for defined product or category queries using **Google Trends data**, allowing the Growth OS to reason about **timing**, not just opportunity size.
    
    Its purpose is to answer a question executives constantly get wrong:
    
    > **“When does our market actually wake up — and when should we act?”**
    
    This module turns relative search interest into **calendar-aware growth decisions** across media, content, creative, and GTM planning.
    
    ---
    
    ## 🎯 Strategic Role in the OS
    
    **Primary role:**  
    Establish *when* to invest — before deciding *where* or *how much*.
    
    **This module informs:**
    - Media flighting and ramp schedules
    - Content and landing page launch timing
    - Creative production calendars
    - Product or feature GTM readiness
    
    **This module does NOT decide:**
    - Budget size
    - Channel mix
    - Creative strategy
    
    Those decisions are resolved downstream by the **Growth Strategy & Planning Council**.
    
    ---
    
    ## 🧩 Inputs & Data Sources
    
    ### Primary Data Source
    - **Google Trends** (via SER API or PythonAnywhere scraper)
    
    ### Configurable Inputs
    | Field | Default | Rationale |
    |---|---|---|
    | `query_groups` | Required | Category-level clusters, not single keywords |
    | `country_code` | US | Demand timing varies by geography |
    | `time_range` | today 5-y | Captures multi-year seasonality |
    | `interval` | weekly | Balances resolution and stability |
    | `forecast_toggle` | off | Forecasting is optional and flagged |
    
    > Council rule: **Never run this module on single keywords.**  
    > Always use **category-representative clusters**.
    
    ---
    
    ## ⚡ Cost-Optimized Data Collection Strategy
    
    **Principle:**  
    > *Trends data is cheap — interpretation errors are expensive.*
    
    ### Collection Rules
    - Use **Compare mode** to pull multiple queries in one request
    - Default to **weekly aggregation** (daily adds noise + cost)
    - Pull **5 years once**, cache indefinitely
    - Re-run only:
      - Monthly (default)
      - Or when category scope changes
    
    ### Scraper Choice
    - **SER API** → preferred for stability
    - **PythonAnywhere** → backup / cost-controlled batch runs
    
    No downstream enrichment unless this module flags a **timing shift**.
    
    ---
    
    ## 🔧 Core Logic & Processing
    
    ### Normalization
    - Google Trends values (0–100) are treated as **relative intensity**, not volume
    - Cross-query normalization handled via Compare mode
    
    ### Seasonality Detection
    - Identify:
      - First inflection point
      - Peak demand window
      - Decline phase
    - Compare **year-over-year shape**, not raw values
    
    ### Forecasting (Optional)
    - Lightweight smoothing only (no heavy ML)
    - 8–12 week horizon max
    - Forecasts are **directional**, never authoritative
    - Displayed as **dotted / dashed line**
    
    ---
    
    ## 🧠 Council Reasoning Layer
    
    The Strategic Intelligence Council enforces four interpretation rules:
    
    1. **Consistency beats magnitude**  
       A repeatable seasonal spike matters more than a one-time surge.
    
    2. **Timing > volume**  
       Knowing *when* demand starts matters more than how high it peaks.
    
    3. **Early inflection > peak**  
       The ramp period is more actionable than the peak month itself.
    
    4. **Do not over-react to anomalies**  
       One-year deviations require confirmation before action.
    
    If demand timing is:
    - Stable year-over-year → high confidence
    - Shifting earlier/later → flag for strategy review
    - Erratic → downgrade confidence
    
    ---
    
    ## 🚦 Confidence & Risk Profile
    
    - **Inference Type:** External  
    - **Confidence Level:** High  
    - **Risk if Wrong:** Medium  
    
    **Why:**  
    - Trends data is normalized, not absolute
    - Forecasting introduces uncertainty
    - Mis-timing spend can waste budget
    
    This module must always be paired with **budget phasing**, not lump-sum decisions.
    
    ---
    
    ## 📤 Outputs & Artifacts
    
    ### Structured Outputs
    - Weekly demand curve (5y)
    - Identified peak months
    - YoY consistency assessment
    - Optional forecast window
    
    ### Visual Outputs
    - Line chart (historic)
    - Dotted forecast extension
    - Seasonality heatmap (monthly avg)
    
    ### Executive Summary Callout
    > “Historically, demand begins rising in March and peaks in May. Media should ramp **before** March, not during the peak.”
    
    ---
    
    ## 🧭 Interpretation Guidelines (Executive-Safe)
    
    ### What this means
    - When to start showing up
    - When to prepare assets
    - When late entry becomes inefficient
    
    ### What this does NOT mean
    - Exact revenue forecasts
    - Guaranteed performance
    - Channel-specific ROI
    
    ---
    
    ## ⛔ Deprioritization & Stop Rules
    
    Do **not** act on this module alone when:
    - Category demand is flat year-round
    - Only one year shows a spike
    - Forecast contradicts multi-year history
    
    In these cases:
    > Flag as **“Timing neutral — do not over-optimize.”**
    
    ---
    
    ## 🤖 LLM / Gemini Prompt Instructions
    
    **Tone**
    - Strategic
    - Calendar-aware
    - Decisive but cautious
    
    **Structure**
    - Trend Insight
    - Forecast Narrative
    - Timing Recommendation
    
    **Hard Rules**
    - Never claim absolute volume
    - Never overstate forecast certainty
    - Always anchor to calendar actions
    
    ---
    
    ## 🧪 Example Output (Ideal)
    
    > *“Demand for recovery sandals consistently begins rising in March and peaks in May. Over five years, the shape is stable with minimal variance. This suggests TOF media and content should launch no later than mid-February, with creative finalized by early February. Delaying until April historically results in higher CAC and weaker share capture.”*
    
    ---
    
    ## 🔁 Version Notes
    
    - **v1:** Historic seasonality + optional forecast
    - **v1.1 (planned):** Category Momentum delta vs prior year
    - **v2 (planned):** Geo-specific seasonality overlays
    
    ---
    
    ## Final Principle
    
    This module exists to answer:
    > **“When should we move?”**
    
    It does not answer:
    > “How much should we spend?”
    
    That separation is intentional — and strategic.
    ```
    

# 📘 Module Playbook — Market Demand & Seasonality

**Module:** Market Demand & Seasonality

**Owner Council:** Strategic Intelligence

**Supporting Councils:** Growth Strategy & Planning, Performance Media & Messaging

**Status:** Active

**Version:** v1

**Inference Type:** External

**Confidence Level:** High

**Risk if Wrong:** Medium

---

## 🧠 Module Overview

This module surfaces **historical and near-term demand cycles** for defined product or category queries using **Google Trends data**, allowing the Growth OS to reason about **timing**, not just opportunity size.

Its purpose is to answer a question executives constantly get wrong:

> “When does our market actually wake up — and when should we act?”
> 

This module turns relative search interest into **calendar-aware growth decisions** across media, content, creative, and GTM planning.

---

## 🎯 Strategic Role in the OS

**Primary role:**

Establish *when* to invest — before deciding *where* or *how much*.

**This module informs:**

- Media flighting and ramp schedules
- Content and landing page launch timing
- Creative production calendars
- Product or feature GTM readiness

**This module does NOT decide:**

- Budget size
- Channel mix
- Creative strategy

Those decisions are resolved downstream by the **Growth Strategy & Planning Council**.

---

## 🧩 Inputs & Data Sources

### Primary Data Source

- **Google Trends** (via SER API or PythonAnywhere scraper)

### Configurable Inputs

| Field | Default | Rationale |
| --- | --- | --- |
| `query_groups` | Required | Category-level clusters, not single keywords |
| `country_code` | US | Demand timing varies by geography |
| `time_range` | today 5-y | Captures multi-year seasonality |
| `interval` | weekly | Balances resolution and stability |
| `forecast_toggle` | off | Forecasting is optional and flagged |

> Council rule: Never run this module on single keywords.
> 
> 
> Always use **category-representative clusters**.
> 

---

## ⚡ Cost-Optimized Data Collection Strategy

**Principle:**

> Trends data is cheap — interpretation errors are expensive.
> 

### Collection Rules

- Use **Compare mode** to pull multiple queries in one request
- Default to **weekly aggregation** (daily adds noise + cost)
- Pull **5 years once**, cache indefinitely
- Re-run only:
    - Monthly (default)
    - Or when category scope changes

### Scraper Choice

- **SER API** → preferred for stability
- **PythonAnywhere** → backup / cost-controlled batch runs

No downstream enrichment unless this module flags a **timing shift**.

---

## 🔧 Core Logic & Processing

### Normalization

- Google Trends values (0–100) are treated as **relative intensity**, not volume
- Cross-query normalization handled via Compare mode

### Seasonality Detection

- Identify:
    - First inflection point
    - Peak demand window
    - Decline phase
- Compare **year-over-year shape**, not raw values

### Forecasting (Optional)

- Lightweight smoothing only (no heavy ML)
- 8–12 week horizon max
- Forecasts are **directional**, never authoritative
- Displayed as **dotted / dashed line**

---

## 🧠 Council Reasoning Layer

The Strategic Intelligence Council enforces four interpretation rules:

1. **Consistency beats magnitude**
    
    A repeatable seasonal spike matters more than a one-time surge.
    
2. **Timing > volume**
    
    Knowing *when* demand starts matters more than how high it peaks.
    
3. **Early inflection > peak**
    
    The ramp period is more actionable than the peak month itself.
    
4. **Do not over-react to anomalies**
    
    One-year deviations require confirmation before action.
    

If demand timing is:

- Stable year-over-year → high confidence
- Shifting earlier/later → flag for strategy review
- Erratic → downgrade confidence

---

## 🚦 Confidence & Risk Profile

- **Inference Type:** External
- **Confidence Level:** High
- **Risk if Wrong:** Medium

**Why:**

- Trends data is normalized, not absolute
- Forecasting introduces uncertainty
- Mis-timing spend can waste budget

This module must always be paired with **budget phasing**, not lump-sum decisions.

---

## 📤 Outputs & Artifacts

### Structured Outputs

- Weekly demand curve (5y)
- Identified peak months
- YoY consistency assessment
- Optional forecast window

### Visual Outputs

- Line chart (historic)
- Dotted forecast extension
- Seasonality heatmap (monthly avg)

### Executive Summary Callout

> “Historically, demand begins rising in March and peaks in May. Media should ramp before March, not during the peak.”
> 

---

## 🧭 Interpretation Guidelines (Executive-Safe)

### What this means

- When to start showing up
- When to prepare assets
- When late entry becomes inefficient

### What this does NOT mean

- Exact revenue forecasts
- Guaranteed performance
- Channel-specific ROI

---

## ⛔ Deprioritization & Stop Rules

Do **not** act on this module alone when:

- Category demand is flat year-round
- Only one year shows a spike
- Forecast contradicts multi-year history

In these cases:

> Flag as “Timing neutral — do not over-optimize.”
> 

---

## 🤖 LLM / Gemini Prompt Instructions

**Tone**

- Strategic
- Calendar-aware
- Decisive but cautious

**Structure**

- Trend Insight
- Forecast Narrative
- Timing Recommendation

**Hard Rules**

- Never claim absolute volume
- Never overstate forecast certainty
- Always anchor to calendar actions

---

## 🧪 Example Output (Ideal)

> “Demand for recovery sandals consistently begins rising in March and peaks in May. Over five years, the shape is stable with minimal variance. This suggests TOF media and content should launch no later than mid-February, with creative finalized by early February. Delaying until April historically results in higher CAC and weaker share capture.”
> 

---

## 🔁 Version Notes

- **v1:** Historic seasonality + optional forecast
- **v1.1 (planned):** Category Momentum delta vs prior year
- **v2 (planned):** Geo-specific seasonality overlays

---

## Final Principle

This module exists to answer:

> “When should we move?”
> 

It does not answer:

> “How much should we spend?”
> 

That separation is intentional — and strategic.