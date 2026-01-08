# Market Demand & Seasonality Forecast
 Market Demand & Seasonality Forecast

Description: Provide operators a real-time view of demand cycles across product categories to inform media timing, content prioritization, and market readiness.
Last Updated : 10 de diciembre de 2025
Module ID: market.demand_seasonality.forecast
Status: Ready for Development
Status 1: Draft

**Category:** Market Trends

**Layer:** Signal Layer

**Data Source:** Google Trends via automated SER or PythonAnywhere-based scraper

**Purpose:** Provide operators a real-time view of demand cycles across product categories to inform media timing, content prioritization, and market readiness.

---

## **🧠 What This Module Does**

This module surfaces historical and forecasted demand curves for selected **product category queries**, based on **Google Trends data**. It visualizes **weekly demand patterns over the past 5 years** and projects future seasonality using a lightweight forecasting model.

We use this module to answer:

- **When do consumers start searching for this category?**
- **How consistent is demand year-over-year?**
- **When should ad budgets or content drops ramp up?**

The output enables **strategic GTM timing decisions** for media, landing pages, creative, and product pushes.

---

## **🔍 Plain-English Operator Narrative**

> “If your product category spikes in April and you’re launching in June, you’re already late. This module shows exactly when your market wakes up — and when you should show up.”
> 

---

## **📐 Inputs (Configured per client/category)**

| **Field** | **Type** | **Description** |
| --- | --- | --- |
| query_groups | array[string[]] | Array of keyword clusters representing product categories (e.g. ["recovery sandals", "walking shoes"]) |
| country_code | string | Country to localize demand (e.g. "US") |
| time_range | string | Google Trends-compatible (e.g. "today 5-y", "now 7-d") |
| interval | string | "weekly" (default) or "monthly" |
| source | string | "Google Trends via SER" or "PythonAnywhere" |

## **⚙️ Processing & Logic**

### **🔄 Data Collection**

- Uses Google Trends scraper via [SER API](https://serpapi.com/google-trends-api) or PythonAnywhere script
- Pulls **weekly search index (0–100)** for each keyword over last 5 years
- Uses “Compare” mode in Google Trends to align multiple queries in one matrix
- Handles Google Trends limitations (e.g., 90-day limit on daily data) by grouping to **weekly timeframes**

### **🔮 Forecasting**

- Applies simple time series regression (linear/exponential smoothing) or Prophet to project demand 8–12 weeks forward
- Forecasting optional — flagged via toggle
- Future values plotted with dotted line to differentiate from actuals

---

## **📊 Output Format**

### **A. Dataset JSON**

```json
{
  "category": "recovery sandals",
  "queries": ["recovery sandals", "support sandals", "OOFOS sandals"],
  "time_range": "today 5-y",
  "country": "US",
  "interval": "weekly",
  "data_points": [
    {
      "date": "2020-03-01",
      "value": 44
    },
    ...
  ],
  "forecast_points": [
    {
      "date": "2025-01-01",
      "forecast": 68
    }
  ]
}
```

**B. Visual Output**

| **Chart** | **Purpose** |
| --- | --- |
| 📈 **Trendline (5y)** | Line graph of demand by week, color-coded per query group |
| 🔮 **Forecast Extension** | Dashed line projecting demand 8–12 weeks forward |
| 🔥 **Seasonality Heatmap** | Year-over-year monthly average demand (e.g. April = spike month) |
| 💡 **Executive Callout** | “Q2 is historically your peak — ramp media before March.” |
|  |  |

**🧠 Gemini Prompt (Governed by Market Trends Council)**

```json
You are an operator in the Force of Nature Growth Operating System, guided by the Market Trends & Forecasting Council.

Your goal is to interpret demand curves from Google Trends and produce a forward-looking recommendation based on seasonality and projected demand spikes.

You are speaking to a Head of Marketing or VP of Growth. Your language should be strategic, calendar-aware, and focused on action timing.

---

Input:
{
  "category": "recovery sandals",
  "peak_months": ["April", "May", "June"],
  "forecast_peak": "March 2025",
  "yoy_trend": "demand spikes consistently in Q2 over 5 years",
  "queries": ["recovery sandals", "OOFOS sandals", "arch support sandals"]
}

---

Respond in this format:

**Trend Insight:**  
[Summarize the historic demand pattern and trend shape]

**Forecast Narrative:**  
[When is demand projected to spike? Has it shifted? Any recent anomalies?]

**Timing Recommendation:**  
[What to do — and when. Media start? LP launch? Creative prep?]

---

Example Output:

Trend Insight:  
Demand for recovery sandals consistently builds from March and peaks in May, year-over-year. Search volume doubles between February and April.

Forecast Narrative:  
March 2025 is expected to be the new inflection point, slightly earlier than previous years. Expect a strong Q2.

Timing Recommendation:  
Launch TOF campaigns no later than Feb 15. Landing pages should be live by March 1. Creative refresh should be finalized by mid-February.
```

**🧱 Module Summary Card**

| **Attribute** | **Value** |
| --- | --- |
| **ID** | market.demand_seasonality.v1 |
| **Category** | Market Trends |
| **Used In** | Master OS Report, Media Planning, Creative Timelines |
| **Powered By** | Google Trends + Forecast Model |
| **Primary Output** | Trendline chart + Peak month insight + Action card |
| **Runs** | Weekly or Monthly |
| **Forecasting** | Optional toggle |
| **Tech Stack** | PythonAnywhere, Google Trends API/SER, Google Sheets |