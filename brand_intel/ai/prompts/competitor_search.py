"""
Competitor Search Prompts - UCR FIRST
======================================

Prompts for competitor analysis and search operations.
All prompts include UCR context placeholders.
"""

COMPETITOR_ANALYSIS_PROMPT = """Analyze and identify competitors for this brand:

## UCR Context (Section A - Brand Identity)
Brand: {brand_name}
Domain: {domain}
Industry: {industry}
Business Model: {business_model}

## UCR Context (Section B - Category Definition)
Primary Category: {primary_category}
Included Categories: {included_categories}
Excluded Categories: {excluded_categories}

## Known Competitors (Section C)
Existing Competitors: {existing_competitors}

## Task
Identify competitors in three tiers:
1. **Tier 1 (Direct)**: Same product/service, same target market
2. **Tier 2 (Adjacent)**: Similar products, adjacent markets
3. **Tier 3 (Aspirational)**: Larger players to benchmark against

## Output Requirements
For each competitor provide:
- name: Company name
- domain: Website domain (must be real, verifiable)
- tier: "tier1", "tier2", or "tier3"
- why_selected: Brief explanation of competitive relationship
- similarity_score: 0-100 estimated similarity
- serp_overlap: 0-100 estimated SERP overlap
- top_overlap_keywords: List of 3-5 keywords where you compete

## UCR Guardrails (Section G)
DO NOT include competitors that match these exclusions:
{excluded_competitors}

Return ONLY valid JSON:
{{
  "competitors": [
    {{
      "name": "...",
      "domain": "...",
      "tier": "tier1",
      "why_selected": "...",
      "similarity_score": 75,
      "serp_overlap": 60,
      "top_overlap_keywords": ["keyword1", "keyword2"]
    }}
  ],
  "market_analysis": "Brief market context",
  "recommended_focus": ["competitor1", "competitor2"]
}}
"""

COMPETITOR_ENRICHMENT_PROMPT = """Enrich competitor data with additional context:

## Competitor to Enrich
Name: {competitor_name}
Domain: {competitor_domain}
Current Tier: {current_tier}

## UCR Context
Brand: {brand_name}
Category: {primary_category}

## Task
Research and provide:
1. Company size indicators (employee count, revenue range)
2. Funding stage (bootstrap, seed, series_a, series_b, series_c_plus, public)
3. Geographic presence
4. Key differentiators
5. Competitive threat level

## Output (JSON)
{{
  "employee_count": "1-50 | 51-200 | 201-500 | 501-1000 | 1000+",
  "revenue_range": "$0-1M | $1-10M | $10-50M | $50-100M | $100M+",
  "funding_stage": "bootstrap | seed | series_a | series_b | series_c_plus | public",
  "geo_overlap": ["US", "EU", "APAC"],
  "key_differentiators": ["differentiator1", "differentiator2"],
  "threat_level": "low | medium | high",
  "size_proximity": 0-100
}}
"""
