# Keyword Gap & Visibility Overview

Category: SEO Signal
Data Source: Ahrefs
Description: Identifies high-value keywords your brand is missing compared to top competitors. Pulls from Ahrefs’ Content Gap Report to surface SEO visibility gaps — especially for high-volume, low-competition keywords where others rank and you don’t. Prioritizes opportunities with commercial intent and missed traffic value.
Last Updated : 10 de diciembre de 2025
Module ID: seo.keyword_gap_visibility.v1

Primary Output: Bar Chart: Total Missing Traffic Value by CompetitorTable: Top 10 Keyword Opportunities (KW, Vol, CPC, Diff, Missed $)Summary Insight: “You rank for 37% of high-intent terms your competitors own. You’re missing $355K/mo in search value.”
Status: Ready for Development
Status 1: Draft
Strategic Use Case: Used by SEO leads, growth marketers, and VPs of Paid to identify under-monetized demand. Drives top-of-funnel content strategy, landing page buildouts, and paid search efficiency. Powers OS Drops, content briefs, and TOF investment plans.

# **🧩 MODULE 1: Keyword Gap & Visibility**

> FON Growth OS | Signal Layer → External SEO Intelligence
> 

---

## **🧠 What This Module Does**

This module identifies **which keywords your competitors rank for, but you don’t** — and calculates how much traffic value you’re missing as a result.

The goal:

👉 Turn SEO from a “traffic channel” into a **revenue engine** by showing **where you’re bleeding demand** — and what to do about it.

---

## **🎯 Strategic Operator Use Case**

**For:** Heads of Growth, CMOs, SEO Leads

**Used to:**

- Prioritize content & landing page development
- Justify investment in TOF & MOF search terms
- Benchmark SEO vs competitors
- Support organic demand capture without over-relying on paid

---

## **🔧 Developer-Facing Spec**

### **✅ Summary**

This module uses Ahrefs’ content_gap API to compare a client’s domain against up to 5 competitors. It surfaces **keywords where the competitors rank in Google’s top 20**, and the client does not — filtered by search volume and commercial value (CPC).

It returns:

- A ranked list of keyword opportunities
- Total missed traffic value (in USD)
- Bar chart of missed value by competitor
- JSON-ready output for charting and Gemini insight generation

---

## **💡 Inputs (With API Optimization Tips)**

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| client_domain | string | The brand’s domain (e.g. oofos.com) |
| competitor_domains | array[string] | Up to 5 domains to compare against |
| min_search_volume | int | Default: 500. Skip junk keywords. |
| positions_to_include | array[int] | Default: [1–20]. Only count real visibility. |
| ctr_assumption | float | Default: 0.1 (used to estimate missed value) |

**⚡ API Call Logic (Ahrefs)**

### **Endpoint:**

GET /v3/site-explorer/content-gap

### **Params**

```bash
target=oofos.com
competitors=hoka.com,on.com
mode=domain
```

### **Optimization Strategy:**

- Use **one API call** for all competitors (Ahrefs allows this)
- Use mode=domain (don’t go to URL or path level = more expensive)
- Filter out low-volume and low-CPC terms **before processing**
- Cache results weekly (keyword gaps don’t change daily)

---

## **🧮 Keyword Filtering & Value Calculation**

After getting raw keyword gaps, apply the following:

```python
# Keyword-level filtering
if volume < min_search_volume:
    skip

if all(competitor_position > 20 for competitor in positions):
    skip

if cpc == 0:
    skip

# Estimate missed value
estimated_value_usd = volume * cpc * ctr_assumption
```

## **📤 Output Schema**

### **A. Summary Output**

```json
{
  "client": "oofos.com",
  "competitors": ["hoka.com", "on.com"],
  "total_missed_keywords": 966,
  "total_missed_value_usd": 355024
}
```

### **B. Keyword Opportunities Table**

Sorted by estimated value (top 10)

```json
[
  {
    "keyword": "recovery sandals",
    "volume": 6600,
    "cpc": 1.20,
    "kd": 24,
    "client_rank": null,
    "competitor_ranks": {
      "hoka.com": 4,
      "on.com": 7
    },
    "estimated_value_usd": 792
  }
]
```

**C. Competitor Value Breakdown (for chart)**

```json
[
  { "competitor": "hoka.com", "missed_value_usd": 158000 },
  { "competitor": "on.com", "missed_value_usd": 128000 }
]
```

## **📊 Visual Output**

**Primary Chart:**

📈 *Bar Chart – Missed Traffic Value by Competitor*

**Secondary Table:**

📋 *Top 10 Keyword Opportunities*

Columns: Keyword, Volume, CPC, KD, Estimated Value

---

## **🤖 Gemini Prompt: Governed by FON SEO Visibility & Demand Council**

### **Prompt Template:**

```
You are an organic growth strategist operating inside the Force of Nature Growth Operating System, guided by the FON SEO Visibility & Demand Council.

Your task is to interpret SEO visibility data through the lens of search intent, commercial opportunity, and structural performance — not vanity traffic.

You are NOT writing a generic SEO report. You are exposing where demand is bleeding due to missing search visibility, and how to turn that loss into growth.

Use this format:

Visibility Insight:
[What keyword/intent gaps exist and why they matter]

Actionable Fix:
[Specific tactic — launch content, optimize a page, fix linking, etc.]

Business Impact:
[Estimated value or outcome unlocked]

Context:
{
  "client": "oofos.com",
  "competitors": ["hoka.com", "on.com"],
  "total_missed_keywords": 966,
  "total_missed_value_usd": 355024,
  "top_keyword_opportunities": [
    { "keyword": "recovery sandals", "volume": 6600, "cpc": 1.2, "kd": 24 },
    { "keyword": "arch support shoes", "volume": 8100, "cpc": 0.95, "kd": 19 }
  ]
}
```

**✍️ Sample Gemini Output**

```
Visibility Insight:  
OOFOS is missing over $350K/month in high-intent search value across keywords like “recovery sandals” and “arch support shoes.” These queries signal active buyer intent, yet competitors like Hoka and On rank in the top 5, while OOFOS has no visibility.

Actionable Fix:  
Launch mid-funnel content and collection pages targeting “recovery footwear” themes — and internally link from existing product pages to boost relevance.

Business Impact:  
Closing these gaps can shift tens of thousands of monthly clicks into owned traffic — reducing paid search dependency and reclaiming competitive positioning in the recovery footwear category.
```

**🧠 Council Guidelines Used in Insight Layer**

| **Rule** | **Translation** |
| --- | --- |
| **Missed keywords = missed revenue** | Every gap is a business opportunity. |
| **Visibility ≠ traffic** | Only care about ranking where intent = value. |
| **Demand Mapping > Keyword Dumping** | Prioritize terms with commercial or mid-funnel impact. |
| **SEO = Structure + Strategy** | Fix the pages *and* the link paths. |

**✅ Summary: Implementation Checklist**

| **Task** | **Owner** | **Notes** |
| --- | --- | --- |
| Ahrefs integration | Dev / Analyst | Use batch content_gap API |
| Filtering logic | Dev | Volume >500, CPC > 0, competitor rank top 20 |
| CTR assumption | Configurable | Default = 10% |
| JSON output | Dev | Structured for dashboard or prompt use |
| Gemini call | Growth/LLM | Uses Council prompt + JSON |
| Visuals | Design or frontend | Bar chart + top keyword table |
| Storage | Growth OS or Notion | Store under /modules/seo/keyword_gap_visibility.json |