# Category Demand Trend (5-Year)

Module ID: market.category_demand_trend.v1
Status: Ready for Development
Status 1: Draft

# **🧩 MODULE A: Category Demand Trend (5-Year)**

**ID:** market.category_demand_trend.v1

**Category:** Market Trends

**Powered by:** Google Trends (SERPAPI or Trends API when available)

---

## **🧠 What This Module Does**

Shows how consumer interest in the product category has evolved over the past 5 years. Detects macro growth, stagnation, decline, or cyclical patterns.

Used to answer PE’s first question:

> “Is this a category worth being in?”
> 

---

## **🔧 Developer Spec**

### **Inputs**

```json
{
  "queries": ["recovery sandals", "walking shoes", "arch support footwear"],
  "country": "US",
  "time_range": "today 5-y",
  "interval": "weekly"
}
```

### **Data Source**

- Google Trends via **SERPAPI**
- Optionally fallback: pytrends (limited)

### **Process Flow**

1. Query Google Trends weekly search index for each category keyword.
2. Normalize trend values (0–100) across time.
3. Compute:
    - 5-year CAGR (Compound Annual Growth Rate)
    - Trend slope (linear regression)
    - Category-level composite index (mean across queries)
4. Output:
    - Trendline chart (5-year)
    - Growth/decline classification
    - Executive narrative

---

## **📊 Output (JSON)**

```json
{
  "category": "recovery footwear",
  "composite_trend": [
    {"date": "2020-01-01", "value": 44},
    ...
  ],
  "cagr_5y": 0.12,
  "trend_direction": "growing",
  "slope": 0.89,
  "supporting_queries": {
    "recovery sandals": 0.14,
    "arch support shoes": 0.18,
    "walking shoes": 0.09
  }
}
```

**🤖 Gemini Prompt (Market Trends Council)**

```json
You are part of the Force of Nature OS and guided by the Market Trends & Forecasting Council.

Interpret 5-year demand data through a PE lens:
- Is the category expanding or contracting?
- How reliable is demand?
- What does this imply for brand growth potential?

Output:
Trend Insight:
Strategic Implication:
Investment Signal:
```