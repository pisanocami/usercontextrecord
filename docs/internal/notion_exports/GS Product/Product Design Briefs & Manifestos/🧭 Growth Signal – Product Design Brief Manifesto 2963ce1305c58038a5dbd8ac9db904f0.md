# 🧭 Growth Signal – Product Design Brief / Manifesto

Date: 24 de octubre de 2025

## 01. 🧠 Core Thesis

> Growth Signal is AI-curated GTM intelligence from external public data — combined with an Action Library that tells you exactly what to do next.
> 

It’s not just dashboards.

Not just insights.

Not just raw data.

It’s signal → structured → translated into action.

A full-stack GTM intelligence system built to drive execution.

> ⚡️ Think: Ahrefs + Benchmarking + Tactical Operator in one.
> 

---

## 02. 🎯 What We’re Building (and Why)

| Layer | Core Function | What It Delivers | Who It’s For | What It Unlocks |
| --- | --- | --- | --- | --- |
| **Growth Signal** | Ingests and structures *external, public GTM data* (search, ad spend, seasonality, competitors) | AI-curated insights + personalized actions from Action Engine | ✅ **MVP**: Retail/eComm ($50M–$500M, $5M–$25M media spend)  🧪 **Next**: App-based or SEO/SEM-intensive verticals  🚀 **Future**: Any org with meaningful public GTM data | Understand category demand, seasonality, and competitive moves — and get clear, tactical GTM recommendations |
| **Growth Pulse** | Adds internal performance data to enrich the record (GA4, Ads, Meta, etc.) | Benchmarks internal vs. external performance + recommends high-ROI tactical changes | Growth leads, in-house marketers, agencies, consultants | Pinpoint misalignment in spend, timing, or messaging — and fix channel inefficiencies |
| **Growth Analysis** | Full strategic audit — human + AI collaboration across all data layers | Strategic roadmap, media mix reallocation, org design, budget modeling | Strategic partners, growth teams, PE/VC, enterprise GTM orgs | Build your next-stage GTM plan based on real data, custom forecasts, and industry-anchored strategy |

---

## 03. 🧬 How the System Works

Growth Signal builds a **progressively enriched GTM Intelligence Record** for each company, starting with public signal and layering in private context.

---

### 🔹 Growth Signal

**AI-curated external GTM signal + recommended actions**

**Ingests:**

- Public data sources including:
    - Google Trends
    - Data for SEO / Bright Data
    - Ahrefs, SEMrush
    - Meta Ad Library
    - YouTube / TV spots
    - Product feeds (GMC)
    - SERP features, reviews, influencers

**Structures via SignalDB:**

- Tags every data point across:
    - Channel
    - Funnel stage
    - Company type (retail, app, B2B, etc.)
    - Time horizon (seasonality, growth trajectory)
- Normalized format for AI reasoning
- Enables retrieval + pattern-matching over GTM categories

**Reasoning via Action Engine:**

- Data flows into **RAG-based Action Engine**
- Engine queries **Action Library** of tactical GTM moves
- Recs output as prioritized, contextualized, operator-facing suggestions

**Examples (OOFOS External Analysis):**

- You're missing top SEO keywords your competitors dominate
- Search interest is up 42% — your SEM spend is flat
- Brand demand uncaptured in paid
- Pinterest + CTV are underutilized vs. category leaders
- No enhanced shopping feed setup → missed dynamic product relevance

**Tactical Outputs (from Action Library):**

- “Move branded SEM spend to its own campaign with exclusions”
- “Add FAQ schema to improve SERP share vs. competitors”
- “Increase investment in top-funnel creative for Reels with whitelisted UGC”

---

### 🔹 Growth Pulse

**Adds internal data to the same record, enriches recommendations**

**Ingests:
MVP:** 

- Google Analytics (GA4)
- Google Ads

**FUTURE STATE:** 

- Google Analytics (GA4)
- Google Ecosystem (Ads, Programmatic, YouTube
- Social (Meta, TikTok, Pinterest, Reddit, etc)
- Retail Marketplace (Amazon, Walmart, Instacart)
- Retention (Email, SMS, etc)
- CRM

**Uses Agent Checklists:**

- Each channel has an agent-run media operations checklist
- Agents compares setup // performance to:
    - External trends
    - Benchmarks
    - Historical baselines
- Run through the same **Action Engine**

**Examples (Marine Layer Quick Look):**

- Meta: heavy DABA, No Reels or creator whitelisting
- Google Ads: outdated SKAG structure, no PMax, no segmentation
- Underperforming Dynamic Ads
- 22 campaigns → too much fragmentation → poor signal learning
- Shopping feed missing `[gender]`, `[color]`, `[cluster]` attributes

**Outputs:**

- Channel-level scores (5/10, 7/10)
- Tactical Recs:
    
    > “Segment your PMax by product price and ROAS tiers”
    > 
    > 
    > “Simplify Meta account to 3–4 campaigns with clear audience separation”
    > 
    > “Automate prospecting segments using Klaviyo + Meta API”
    > 

---

### 🔹 Growth Analysis

**Full GTM strategy, powered by all structured signal**

**Ingests:**

- Forecasts, media mix, org inputs
- Stakeholder interviews
- Margin model, LTV curves, audience segmentation
- Pulse + Signal layers

**Synthesizes:**

- Opportunity map
- Budget reallocation plan
- CAC/LTV target modeling
- Creative format benchmarking
- Paid mix forecast vs. seasonal demand

**Examples (OOFOS Opp Analysis):**

- 70% of spend is retargeting — reallocate to new audience cohorts
- TV driving <1 ROAS — move to high-CTR digital with incrementality tests
- Deconstruct brand vs. non-brand mix by SEM cohort
- Map 12-month LTV against CAC → set sustainable guardrails
- Layer in predictive seasonality per product category (Clogs, Slides, Sandals)

**Outputs:**

- Strategic report + slides
- 4–6 week GTM roadmap
- Optional: media model, resource shift, KPI dashboards

---

## 04. 🎛 The Intelligence Stack

| Layer | Function |
| --- | --- |
| **SignalDB** | Normalized GTM schema — unifies external & internal data |
| **Action Library** | Structured, growing database of GTM actions, tactics, and configurations — tagged by channel, stage, and performance |
| **Action Engine** | RAG + GPT framework that reasons over structured inputs and recommends prioritized actions from the library |
| **Agent Framework** | Smart checklists that analyze structured data for gaps, misalignment, and improvement opportunities |
| **Delivery Layer** | Output via Notion, email, Slack, PDF, or API — low-friction, high-leverage interfaces for operators and leaders |
|  |  |

---

## 05. 📍 ICP Strategy

| Stage | ICP Target |
| --- | --- |
| ✅ **MVP** | Retail / eCommerce brands with high paid spend and large SEM/SEO surface area |
| 🧪 **Next** | App-based, subscription, and performance-heavy verticals where GTM signal is public |
| 🚀 **Future** | Any business with a meaningful public GTM footprint: legal, franchise, healthcare, real estate, B2B SaaS |

> Public GTM signal = opportunity for structure → action → leverage
> 

---

## 06. 📏 Product Design Principles

| Principle | Why It Matters |
| --- | --- |
| **Insight + Action = Impact** | We don’t stop at insights. We prescribe the move. |
| **Operator-first** | Built for the person in the tools — not just the one reading the report |
| **Progressive enrichment** | Start public. Layer internal. Add human. |
| **Compounding system** | Every customer improves our benchmarks + Action Library |
| **Tactical by default** | Output must be specific, scoped, and immediately deployable |

---

## 07. 💸 Monetization

| Product Layer | Format | Pricing |
| --- | --- | --- |
| **Growth Signal** | Weekly recs, dashboards, content vault | Free tier + Pro ($29–$199/mo) |
| **Growth Pulse** | Structured audits, 3–5 tactical recs per channel | $1K–$3K per drop or subscription |
| **Growth Analysis** | Strategic GTM engagement (AI + human) | $15K–$50K+ per engagement or licensing model |

**Add-ons / Extensions**:

- Slackbot insight feed
- Reusable PRD template packs
- GTM calendar auto-sync
- SignalDB API access
- White-labeled consultant instances

---

## 08. 🔭 Vision: GTM Execution Intelligence

> We’re building the Bloomberg Terminal for GTM operators.
> 
- Ingest the signal
- Structure the truth
- Prescribe the move

**Why this matters:**

- The GTM data already exists.
- It’s just messy, distributed, and unstructured.
- Growth Signal makes it legible — and operational.

No more opinion-based strategy decks.

No more manual audits or wasted spend.

This is the age of structured, AI-led GTM execution.

---

## 09. 📍 Current Status (Q4 2025)

| Layer | Status |
| --- | --- |
| **Growth Signal** | ✅ Live (retail vertical), delivering email/Notion drops |
| **Growth Pulse** | 🛠 In prototyping (GA4, Ads ingestion, agent checklist) |
| **Growth Analysis** | ✅ Active with clients (OOFOS, Marine Layer) |
| **SignalDB** | ✅ Schema v0.9 defined and live |
| **Action Library** | ✅ 200+ tagged tactics across channels + GTM plays |
| **Action Engine** | 🧪 Early tests running with RAG + GPT-4 agent |
| **Delivery** | Notion, Slack, and email formats in live use |
| **Next Vertical** | Apps + marketplaces (SEO/SEM heavy), CPG, franchise |

---

### 🧱 TL;DR

> Structured GTM data + AI reasoning + prescriptive actions = operator advantage.
> 
> 
> Growth Signal isn’t just another tool. It’s the system that connects *what’s happening* to *what to do next* — in your category, in your company, in your channel.
> 
> Let’s make GTM actionable.
>