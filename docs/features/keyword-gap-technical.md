# Keyword Gap Analysis - Technical Implementation Guide

## Overview

This document describes the technical implementation of keyword gap analysis in the Brand Intelligence Platform. The system supports multiple SEO data providers (DataForSEO, Ahrefs) through a unified provider architecture.

---

## 1. Architecture

### 1.1 Provider Interface

All keyword data providers implement the `KeywordDataProvider` interface:

```typescript
interface KeywordDataProvider {
  readonly name: string;
  readonly displayName: string;
  
  isConfigured(): boolean;
  
  getGapKeywords(
    brandDomain: string,
    competitorDomain: string,
    options?: {
      locationCode?: number;
      languageName?: string;
      limit?: number;
    }
  ): Promise<GapResult>;
  
  getRankedKeywords(
    domain: string,
    options?: {
      locationCode?: number;
      languageName?: string;
      limit?: number;
    }
  ): Promise<RankedKeywordsResult>;
}
```

### 1.2 Core Types

```typescript
interface GapKeyword {
  keyword: string;
  searchVolume: number;
  competitorPosition: number;
  cpc?: number;
  competition?: number;
  keywordDifficulty?: number;
}

interface GapResult {
  brandDomain: string;
  competitorDomain: string;
  gapKeywords: GapKeyword[];
  totalCount: number;
  error?: string;
}
```

---

## 2. DataForSEO Implementation

### 2.1 Primary Method: Domain Intersection

**Endpoint:** `POST /dataforseo_labs/google/domain_intersection/live`

**Concept:** Compares two domains directly using DataForSEO's intersection API to find keywords where one domain ranks but the other doesn't.

**Request Structure:**
```typescript
const body = [{
  target1: brandDomain,      // Brand domain (cleaned)
  target2: competitorDomain, // Competitor domain (cleaned)
  language_name: "English",
  location_code: 2840,       // US location code
  intersections: false,      // false = get NON-overlapping keywords
  limit: 200,
  order_by: ["keyword_data.keyword_info.search_volume,desc"]
}];
```

**Response Processing:**
```typescript
// Filter for gap keywords: competitor ranks, brand doesn't
const gapKeywords = result.items.filter(item => {
  const brandPos = item.first_domain_serp_element?.serp_item?.rank_absolute;
  const compPos = item.second_domain_serp_element?.serp_item?.rank_absolute;
  return !brandPos && compPos; // Brand not ranking, competitor is
});
```

**Key Parameters:**
| Parameter | Value | Purpose |
|-----------|-------|---------|
| `intersections` | `false` | Returns keywords where domains DON'T overlap |
| `order_by` | `search_volume,desc` | Prioritize high-volume keywords |
| `limit` | 200-1000 | API limit per request |

### 2.2 Fallback Method: Ranked Keywords Differential

**When Used:** When `domain_intersection` returns empty results (common for smaller domains)

**Endpoint:** `POST /dataforseo_labs/google/ranked_keywords/live`

**Concept:** Fetch ranked keywords for both domains separately, then calculate the difference programmatically.

**Flow Diagram:**
```
┌─────────────────────┐     ┌─────────────────────┐
│  Brand Domain       │     │  Competitor Domain  │
│  ranked_keywords    │     │  ranked_keywords    │
└─────────┬───────────┘     └─────────┬───────────┘
          │                           │
          ▼                           ▼
    ┌─────────────┐             ┌─────────────┐
    │ Keywords A  │             │ Keywords B  │
    └─────────────┘             └─────────────┘
          │                           │
          └───────────┬───────────────┘
                      ▼
              ┌───────────────┐
              │  Set Diff:    │
              │  B - A = Gap  │
              └───────────────┘
```

**Implementation:**
```typescript
async getGapKeywordsFallback(brandDomain, competitorDomain, options) {
  // 1. Fetch keywords for both domains in parallel
  const [brandResult, competitorResult] = await Promise.all([
    this.getRankedKeywords(brandDomain, options),
    this.getRankedKeywords(competitorDomain, options),
  ]);

  // 2. Create set of brand keywords (lowercase for matching)
  const brandKeywordSet = new Set(
    brandResult.items.map(k => k.keyword.toLowerCase())
  );

  // 3. Filter competitor keywords not in brand set
  const gapKeywords = competitorResult.items
    .filter(k => !brandKeywordSet.has(k.keyword.toLowerCase()))
    .map(k => ({
      keyword: k.keyword,
      searchVolume: k.searchVolume || 0,
      competitorPosition: k.position || 100,
      cpc: k.cpc,
      competition: k.competition,
    }));

  return { brandDomain, competitorDomain, gapKeywords, totalCount: gapKeywords.length };
}
```

### 2.3 DataForSEO Request Flow

```
┌────────────────┐
│ getGapKeywords │
└───────┬────────┘
        │
        ▼
┌───────────────────────────┐
│ Try domain_intersection   │
│ with intersections=false  │
└───────────────┬───────────┘
        │
        ├──── Success + Results ───► Return GapResult
        │
        ├──── Empty Results ──────┐
        │                         │
        └──── API Error ──────────┤
                                  ▼
                    ┌───────────────────────┐
                    │ getGapKeywordsFallback│
                    │ (ranked_keywords diff)│
                    └───────────────────────┘
```

---

## 3. Ahrefs Implementation

### 3.1 Method: Organic Keywords Differential

**Endpoint:** `GET https://api.ahrefs.com/v3/site-explorer/organic-keywords`

**Concept:** Ahrefs doesn't have a direct "gap" endpoint, so we always calculate the gap by fetching organic keywords for both domains and computing the difference.

**Request Structure:**
```typescript
const params = new URLSearchParams();
params.set("target", domain);
params.set("mode", "domain");
params.set("country", "us");
params.set("limit", "2000");
params.set("order_by", "volume:desc");
params.set("select", "keyword,best_position,volume,keyword_difficulty,cpc");
params.set("date", "2026-01-09"); // Current date
params.set("output", "json");
```

**Response Structure:**
```typescript
interface AhrefsOrganicKeyword {
  keyword: string;
  best_position: number;  // Best ranking position
  volume: number;         // Monthly search volume
  keyword_difficulty: number; // 0-100 scale
  cpc: number;            // Cost per click
}
```

### 3.2 Gap Calculation with Filtering

```typescript
buildGapKeywords(clientKeywords, competitorKeywords, options) {
  const { minVolume = 100, maxKd = 60 } = options;

  // 1. Build set of client keywords (position ≤ 100)
  const clientKwSet = new Set(
    clientKeywords
      .filter(kw => kw.best_position <= 100)
      .map(kw => kw.keyword.toLowerCase())
  );

  const gapKeywords = [];

  // 2. Filter competitor keywords
  for (const compKw of competitorKeywords) {
    // Skip if client already ranks
    if (clientKwSet.has(compKw.keyword.toLowerCase())) continue;
    
    // Apply volume filter
    if (compKw.volume < minVolume) continue;
    
    // Apply difficulty filter
    if (compKw.keyword_difficulty > maxKd) continue;

    gapKeywords.push({
      keyword: compKw.keyword,
      searchVolume: compKw.volume,
      competitorPosition: compKw.best_position,
      cpc: compKw.cpc,
      keywordDifficulty: compKw.keyword_difficulty,
    });
  }

  // 3. Sort by opportunity score
  return gapKeywords.sort((a, b) => 
    calculateOpportunityScore(b) - calculateOpportunityScore(a)
  );
}
```

### 3.3 Opportunity Score Formula

Ahrefs implementation includes a proprietary opportunity scoring system:

```typescript
function calculateOpportunityScore(volume, kd, position) {
  if (volume <= 0) return 0;
  
  // Normalize KD to 0-1 scale
  const kdNorm = Math.min(kd, 100) / 100;
  
  // Position weighting
  const positionWeight = getPositionWeight(position);
  // position 1-5: 1.0
  // position 6-10: 0.7
  // position 11-20: 0.5
  // position 21+: 0.3
  
  // Final score: higher volume, lower KD, better position = higher score
  return Math.log10(volume + 1) * (1 - kdNorm) * positionWeight;
}
```

### 3.4 Caching Strategy

Ahrefs implementation includes in-memory caching to reduce API costs:

```typescript
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const organicKeywordsCache = new Map<string, CacheEntry>();

function getCacheKey(domain, country, limit) {
  return `ahrefs:organic:${domain}:${country}:${limit}`;
}
```

---

## 4. Comparative Analysis

| Aspect | DataForSEO | Ahrefs |
|--------|------------|--------|
| **Primary Method** | `domain_intersection` API | Organic keywords differential |
| **Fallback** | `ranked_keywords` differential | N/A (single method) |
| **Data Source** | Multiple SERP providers | Proprietary AhrefsBot crawler |
| **Difficulty Metric** | Competition (0-1 scale) | Keyword Difficulty (0-100) |
| **Built-in Filtering** | Via API params | Client-side (minVolume, maxKd) |
| **Caching** | None (fresh per request) | 7-day in-memory cache |
| **Opportunity Scoring** | None (volume sort only) | Custom formula |
| **Error Handling** | Fallback to differential | Graceful per-competitor failure |

---

## 5. Multi-Competitor Aggregation

Both providers return results per-competitor. The `computeKeywordGap` function in `keyword-gap-lite.ts` aggregates results:

```typescript
async function computeKeywordGap(config, options) {
  const { specificCompetitors, maxCompetitors = 5 } = options;
  
  // 1. Determine competitors to analyze
  const competitors = specificCompetitors?.length 
    ? approvedCompetitors.filter(c => specificCompetitors.includes(c.domain))
    : approvedCompetitors.slice(0, maxCompetitors);

  // 2. Fetch gap keywords for each competitor
  const results = await Promise.all(
    competitors.map(comp => 
      provider.getGapKeywords(brandDomain, comp.domain, options)
    )
  );

  // 3. Merge and deduplicate across competitors
  const allGapKeywords = new Map<string, ScoredKeyword>();
  
  for (const result of results) {
    for (const kw of result.gapKeywords) {
      const existing = allGapKeywords.get(kw.keyword.toLowerCase());
      if (!existing || kw.searchVolume > existing.searchVolume) {
        allGapKeywords.set(kw.keyword.toLowerCase(), {
          ...kw,
          competitorDomains: [result.competitorDomain],
        });
      }
    }
  }

  // 4. Apply UCR guardrails and classification
  return classifyKeywords(Array.from(allGapKeywords.values()), config);
}
```

---

## 6. UCR Integration

After raw gap keywords are collected, they pass through UCR (User Context Record) guardrails:

```
Raw Gap Keywords
       │
       ▼
┌─────────────────────┐
│ G: Negative Scope   │ ← Hard gate (immediate reject)
│    Filter           │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ B: Category Fence   │ ← Soft gate (score penalty)
│    Check            │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ H: Scoring Model    │ ← Capability + Opportunity scores
│    Application      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ E/F: Strategic +    │ ← Intent alignment
│      Channel Gates  │
└─────────┬───────────┘
          │
          ▼
   Classified Keywords
   (Pass/Review/Out)
```

---

## 7. Configuration Requirements

### DataForSEO
```env
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password
```

### Ahrefs
```env
AHREFS_API_KEY=your_api_key
# or
AHREFS_API_TOKEN=your_api_token
```

---

## 8. Location Codes Reference

| Code | Country |
|------|---------|
| 2840 | United States |
| 2826 | United Kingdom |
| 2276 | Germany |
| 2250 | France |
| 2724 | Spain |
| 2484 | Mexico |

---

## 9. Error Handling Summary

| Scenario | DataForSEO | Ahrefs |
|----------|------------|--------|
| API credentials missing | Throws error | Throws error |
| Brand domain fetch fails | N/A (intersection) | `[FATAL]` error thrown |
| Competitor fetch fails | Falls back to ranked_keywords | Returns empty gap for that competitor |
| Empty results | Falls back to ranked_keywords | Returns empty array |
| Rate limiting | API error propagated | API error propagated |

---

## 10. Future Considerations

1. **Ahrefs Content Gap API**: If Ahrefs adds a native content gap endpoint, it could replace the differential method for better accuracy.

2. **Caching for DataForSEO**: Consider adding Redis-based caching to reduce API costs.

3. **Batch Processing**: For large competitor sets, implement queue-based processing to avoid rate limits.

4. **Historical Tracking**: Store gap analysis results to track SEO opportunity changes over time.
