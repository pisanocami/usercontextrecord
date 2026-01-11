"""
Insight Generation Prompts - UCR FIRST
=======================================

Prompts for generating strategic insights from competitive data.
"""

INSIGHT_GENERATION_PROMPT = """Generate strategic insights from competitive signals:

## UCR Context (Section A - Brand)
Brand: {brand_name}
Industry: {industry}
Target Market: {target_market}

## UCR Context (Section E - Strategic Intent)
Primary Goal: {primary_goal}
Risk Tolerance: {risk_tolerance}
Time Horizon: {time_horizon}

## Competitive Signals
{signals_json}

## Task
Analyze the signals and generate executive-level insights:

1. **Executive Summary** (2-3 sentences)
   - What's the most important takeaway?

2. **Key Threats** (prioritized)
   - What competitive threats need immediate attention?
   - Impact assessment for each

3. **Opportunities Identified**
   - What gaps or opportunities emerge from the signals?
   - Potential value of each opportunity

4. **Recommended Actions**
   - Specific, actionable recommendations
   - Prioritized by impact and effort

5. **Risk Assessment**
   - What are the risks of action vs inaction?

## UCR Guardrails (Section G)
Ensure recommendations DO NOT suggest:
- Excluded categories: {excluded_categories}
- Excluded keywords: {excluded_keywords}
- Excluded use cases: {excluded_use_cases}

Format as clean markdown with headers.
"""

SIGNAL_ANALYSIS_PROMPT = """Analyze this competitive signal in depth:

## Signal Details
Type: {signal_type}
Severity: {severity}
Competitor: {competitor}
Description: {description}

## UCR Context
Brand: {brand_name}
Category: {primary_category}
Strategic Goal: {primary_goal}

## Task
Provide deep analysis:

1. **Root Cause Analysis**
   - Why is this signal occurring?
   - What market dynamics are at play?

2. **Impact Assessment**
   - Short-term impact (0-3 months)
   - Medium-term impact (3-12 months)
   - Long-term impact (12+ months)

3. **Response Options**
   - Option A: [Aggressive response]
   - Option B: [Moderate response]
   - Option C: [Wait and monitor]

4. **Recommended Response**
   - Which option and why?
   - Implementation steps

Return as structured JSON:
{{
  "root_cause": "...",
  "impact": {{
    "short_term": "...",
    "medium_term": "...",
    "long_term": "..."
  }},
  "response_options": [...],
  "recommendation": {{
    "option": "A|B|C",
    "rationale": "...",
    "steps": [...]
  }}
}}
"""
