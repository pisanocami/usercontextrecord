# GS. | Product | Modules | Brief

Date: 10 de diciembre de 2025

1. **Provide the broadest reusable data backbone**
2. **Can be reused across multiple downstream queries**
3. **Anchor the narrative for CMOs and Operators**

---

# **🧠 Core Architecture Insight**

Before we rank, here’s a **structure lens** to organize the Master Report. Think in **3 stacked layers**:

| **Layer** | **Function** | **Example Modules** |
| --- | --- | --- |
| **1. Signal Layer** | Pulls *external market data* (search, trends, competitors) | Keyword Gap, Seasonality, Category Benchmark |
| **2. Pulse Layer** | Audits *internal systems* (spend, PMax, naming) | Branded/Non-Branded, PMax Audit, Link Health |
| **3. Analysis Layer** | Combines both into strategic forecasts or recommendations | Media Mix Shift, Paid vs Organic, Funnel Waste |

# **🧩 MASTER REPORT MODULE PRIORITIZATION**

## **📚 Master Report Narrative Structure**

### **🧠 SECTION 1:**

### **Market Context**

> “Here’s the world you operate in. Here’s how it’s changing.”
> 

**Goal:** Establish situational awareness for the CMO. Set up urgency and opportunity.

| **Module** | **Source** | **Output** |
| --- | --- | --- |
| **1. Market Demand & Seasonality** | Google Trends | What consumers are searching for — and when demand spikes. |
| **2. Breakout Terms & Trend Alerts** | Trends, Ahrefs | What’s emerging? Where is interest accelerating? |
| **3. Category Visibility Benchmark** | Ahrefs, DataForSEO | Who is winning share of search in your category? (Table + Radar chart) |
| **4. Emerging Competitor Watch** | SERPAPI, Ahrefs | Who is rising fast that you’re not tracking yet? |

👆 This section answers:

- What are consumers searching for?
- When do they search?
- Who’s capturing that attention?
- What’s changing?

### **🔍 SECTION 2:**

### **Brand Positioning in Market**

> “Here’s where you sit — and how you’re showing up (or not).”
> 

**Goal:** Reflect the client’s visibility, authority, and gaps in the context of competitors.

| **Module** | **Source** | **Output** |
| --- | --- | --- |
| **5. Keyword Gap & Visibility** | Ahrefs | Missed keyword demand + estimated value. |
| **6. Share of Voice vs Competitors** | SERPAPI, Ahrefs | Percentage of owned results per core category keyword cluster. |
| **7. Link Authority & Technical SEO** | Ahrefs | Domain rating, referring domains, link decay rate. |

👆 This section answers:

- What demand are you missing?
- Where are you weak or invisible?
- Is your site structurally strong enough to compete?

---

### **🩺 SECTION 3:**

### **Experience & Execution Layer (Optional if only external)**

This section is normally internal (Pulse Layer), but some insights can still be externally inferred:

| **Module** | **Source** | **Output** |
| --- | --- | --- |
| **8. Branded vs Non-Branded Demand Capture** | Ahrefs | Do people only find you by name, or through category terms? |
| **9. Paid vs Organic Overlap (SERP cannibalization)** | SERPAPI, BrightData | Are you paying for what you already rank for? |
| **10. Competitor Ad & Landing Page Strategy** | BrightData, SERPAPI | What are competitors saying and showing in-market? |

### **🎯 SECTION 4:**

### **Strategic Recommendations**

> “Here’s how to win from here — based on what we’ve seen.”
> 

| **Type** | **Output** |
| --- | --- |
| Strategic Summary | Plain-language narrative from modules 1–10 |
| Action Cards | Each tied to a module: keyword clusters to target, TOF content to launch, SOV gaps to close, etc. |
| Priority Score | (Optional) Stack-ranked actions by impact vs effort |
| OS Drop | TL;DR with executive visuals — 1-pager export |

### **🧺 From API → Persistent Asset**

- You build a **Master Dataset** from Ahrefs, Google Trends, BrightData, etc.
- Store all keyword data, SOV snapshots, domain metrics weekly/monthly.
- Reuse across reports and agent queries without re-hitting APIs.

**✅ Updated Master Report Structure (By Section, Not Just Modules)**

| **Section** | **Name** | **Primary Modules** | **Data Sources** |
| --- | --- | --- | --- |
| **1** | Market Context | Market Demand, Breakout Terms, Category SOV | Google Trends, Ahrefs |
| **2** | Brand Positioning | Keyword Gap, Link Authority, Visibility Map | Ahrefs, SERPAPI |
| **3** | Execution Signals | Branded Capture, Paid/Organic, Competitor Ads | Ahrefs, SERPAPI, BrightData |
| **4** | Strategic Actions | Synthesized Action Cards | Gemini (from JSON) |