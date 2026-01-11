"""
Strategy Analysis Prompts - UCR FIRST
======================================

Prompts for strategic analysis and recommendations.
"""

STRATEGY_RECOMMENDATION_PROMPT = """Generate strategic recommendations based on UCR context:

## UCR Context (Section A - Brand Identity)
Brand: {brand_name}
Domain: {domain}
Industry: {industry}
Business Model: {business_model}

## UCR Context (Section B - Category Definition)
Primary Category: {primary_category}
Category Fence: {category_fence}

## UCR Context (Section C - Competitive Set)
Direct Competitors: {direct_competitors}
Indirect Competitors: {indirect_competitors}
Aspirational Competitors: {aspirational_competitors}

## UCR Context (Section E - Strategic Intent)
Primary Goal: {primary_goal}
Secondary Goals: {secondary_goals}
Risk Tolerance: {risk_tolerance}
Time Horizon: {time_horizon}
Avoid: {avoid_list}

## Current Market Position
Quality Score: {quality_score}
Market Share: {market_share}
Key Strengths: {strengths}
Key Weaknesses: {weaknesses}

## Task
Generate strategic recommendations that:
1. Align with the primary goal ({primary_goal})
2. Respect the risk tolerance ({risk_tolerance})
3. Fit the time horizon ({time_horizon})
4. Avoid the specified areas ({avoid_list})

## Output Structure
1. **Strategic Direction** - Overall recommended direction
2. **Priority Initiatives** - Top 3 initiatives with rationale
3. **Resource Allocation** - Where to invest
4. **Risk Mitigation** - How to manage risks
5. **Success Metrics** - How to measure progress

## UCR Guardrails (Section G)
Recommendations MUST NOT include:
{guardrail_exclusions}

Format as executive-ready markdown.
"""

MARKET_ANALYSIS_PROMPT = """Analyze market dynamics using UCR context:

## UCR Context
Brand: {brand_name}
Category: {primary_category}
Competitors: {competitors}

## Market Data
{market_data_json}

## Task
Provide comprehensive market analysis:

1. **Market Overview**
   - Total addressable market (TAM)
   - Serviceable addressable market (SAM)
   - Growth trajectory

2. **Competitive Dynamics**
   - Market concentration
   - Key players and their positions
   - Competitive intensity

3. **Trend Analysis**
   - Emerging trends
   - Declining trends
   - Disruption risks

4. **Opportunity Assessment**
   - White space opportunities
   - Underserved segments
   - Entry barriers

5. **Strategic Implications**
   - What this means for {brand_name}
   - Recommended positioning
   - Priority actions

Return as structured analysis with data points where available.
"""
