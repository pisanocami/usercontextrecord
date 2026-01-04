# 📦 Phase 1: Module Executors Implementation Plan

**Duración:** 2 semanas  
**Prioridad:** P0 - Crítico  
**Gap:** 14/16 módulos sin lógica real (87%)

---

## 🎯 Objetivo

Implementar ejecutores completos para los 14 módulos que actualmente usan fallback stub.

---

## 📊 Estado Actual

### ✅ Implementados (2)
- `_execute_market_demand()` - Google Trends integration
- `_execute_share_of_voice()` - Ahrefs integration

### ❌ Pendientes (14)

| # | Módulo | Data Sources | Complejidad | Días Est. |
|---|--------|--------------|-------------|-----------|
| 1 | keyword-gap | Ahrefs | Alta | 2 |
| 2 | category-visibility | DataForSEO, Ahrefs | Alta | 2 |
| 3 | branded-demand | Google Trends | Media | 1 |
| 4 | breakout-terms | Google Trends | Media | 1 |
| 5 | emerging-competitor | Ahrefs | Alta | 2 |
| 6 | competitor-ads | Bright Data | Alta | 2 |
| 7 | link-authority | Ahrefs | Media | 1 |
| 8 | paid-organic-overlap | DataForSEO | Alta | 2 |
| 9 | priority-scoring | Internal | Media | 1 |
| 10 | deprioritization | Internal | Media | 1 |
| 11 | strategic-summary | Internal | Media | 1 |
| 12 | os-drop | Internal | Baja | 0.5 |
| 13 | market-momentum | Google Trends | Media | 1 |
| 14 | action-cards | Internal | Baja | 0.5 |

---

## 🏗️ Arquitectura

### Estructura de un Executor

```python
def _execute_{module_id}(
    self,
    brand: Brand,
    period_start: datetime,
    period_end: datetime,
    inputs: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Execute {module_name} analysis.
    
    Args:
        brand: Brand object with domain and keywords
        period_start: Analysis period start
        period_end: Analysis period end
        inputs: Module-specific inputs from modules.yaml
        
    Returns:
        Dict with:
            - has_data: bool
            - confidence: float (0-1)
            - data_sources: List[str]
            - raw_data: Dict (API responses)
            - insights: List[Dict]
            - recommendations: List[Dict]
            - charts_data: Dict (for frontend)
            - council_context: Dict (for council analysis)
    """
```

### Output Structure (Obligatorio)

```python
{
    'has_data': True,
    'confidence': 0.85,
    'data_sources': ['Ahrefs', 'DataForSEO'],
    'raw_data': {
        'api_response_1': {...},
        'api_response_2': {...}
    },
    'insights': [
        {
            'id': 'insight-001',
            'title': 'Keyword Gap Opportunity',
            'content': 'You are missing 45 high-volume keywords...',
            'data_point': '45 keywords, 125K monthly volume',
            'source': 'Ahrefs Keyword Gap',
            'why_it_matters': 'This represents $50K/month in missed revenue',
            'severity': 'high',  # high, medium, low
            'category': 'opportunity'  # opportunity, risk, observation
        }
    ],
    'recommendations': [
        {
            'id': 'rec-001',
            'action': 'Create content targeting top 10 gap keywords',
            'priority': 'high',
            'estimated_impact': 'High - $20K/month potential',
            'effort': 'medium',
            'timeline': '2-4 weeks',
            'with_access_cta': 'Get full keyword list with Ahrefs Pro'
        }
    ],
    'charts_data': {
        'keyword_gap_chart': {...},
        'volume_distribution': {...}
    },
    'council_context': {
        'key_findings': [...],
        'data_quality': 'high',
        'analysis_depth': 'comprehensive'
    }
}
```

---

## 📋 Implementación Detallada por Módulo

### 1. Keyword Gap & SEO Visibility (`keyword-gap`)

**Data Sources:** Ahrefs API

**Inputs (from modules.yaml):**
- `competitor_domains`: List[str] (required)
- `ahrefs_csv`: File (optional)

**Logic:**
1. Fetch organic keywords for brand domain
2. Fetch organic keywords for each competitor
3. Calculate gap (competitor has, brand doesn't)
4. Rank by volume and difficulty
5. Group by intent (informational, transactional, navigational)

**API Calls:**
```python
# Ahrefs Organic Keywords
GET /v3/site-explorer/organic-keywords
params: target={domain}, mode=domain, limit=1000

# For each competitor
GET /v3/site-explorer/organic-keywords
params: target={competitor}, mode=domain, limit=1000
```

**Insights to Generate:**
- Total gap keywords count
- Volume opportunity
- Top 10 gap keywords
- Intent distribution
- Difficulty distribution

**Charts:**
- Keyword gap Venn diagram
- Volume by intent pie chart
- Difficulty distribution histogram

---

### 2. Category Visibility Benchmark (`category-visibility`)

**Data Sources:** DataForSEO, Ahrefs

**Inputs:**
- `category_keywords`: List[str] (required)
- `competitor_domains`: List[str] (required)

**Logic:**
1. For each category keyword, get SERP results
2. Count appearances of brand vs competitors
3. Calculate visibility score per domain
4. Rank domains by category visibility

**API Calls:**
```python
# DataForSEO SERP
POST /v3/serp/google/organic/live/advanced
body: {keyword, location_code, language_code, depth: 100}

# Ahrefs Domain Rating
GET /v3/site-explorer/domain-rating
params: target={domain}
```

**Insights:**
- Brand visibility rank in category
- Top 3 category leaders
- Visibility trend (if historical data)
- Gap to leader

**Charts:**
- Radar chart: visibility by keyword cluster
- Bar chart: domain visibility comparison
- Table: keyword-level visibility

---

### 3. Branded vs Non-Branded Demand (`branded-demand`)

**Data Sources:** Google Trends

**Inputs:**
- `brand_keywords`: List[str] (required)
- `non_brand_keywords`: List[str] (required)

**Logic:**
1. Fetch trends for brand keywords
2. Fetch trends for non-brand keywords
3. Calculate ratio branded/non-branded
4. Identify dependency on brand awareness

**API Calls:**
```python
# Google Trends (pytrends)
pytrends.build_payload(brand_keywords, timeframe='today 12-m')
brand_data = pytrends.interest_over_time()

pytrends.build_payload(non_brand_keywords, timeframe='today 12-m')
nonbrand_data = pytrends.interest_over_time()
```

**Insights:**
- Brand dependency ratio
- Non-branded opportunity size
- Seasonal patterns difference
- Growth comparison

**Charts:**
- Dual line chart: branded vs non-branded over time
- Pie chart: current split
- Trend comparison

---

### 4. Breakout Terms & Trend Alerts (`breakout-terms`)

**Data Sources:** Google Trends

**Inputs:**
- `seed_keywords`: List[str] (required)
- `time_range`: str (default: '90d')

**Logic:**
1. For each seed keyword, get related queries
2. Filter for "breakout" and "rising" queries
3. Calculate acceleration rate
4. Rank by growth velocity

**API Calls:**
```python
# Google Trends Related Queries
pytrends.build_payload([keyword], timeframe='today 3-m')
related = pytrends.related_queries()
# Filter for 'rising' queries with 'Breakout' or >100% growth
```

**Insights:**
- Number of breakout terms
- Top 5 fastest growing
- Category of breakout (product, feature, trend)
- Actionability score

**Charts:**
- Bar chart: top breakout terms with growth %
- Timeline: when terms started rising
- Word cloud: emerging terms

---

### 5. Emerging Competitor Watch (`emerging-competitor`)

**Data Sources:** Ahrefs

**Inputs:**
- `industry_keywords`: List[str] (required)
- `known_competitors`: List[str] (optional)

**Logic:**
1. Get SERP results for industry keywords
2. Identify domains not in known_competitors
3. Check domain age and growth velocity
4. Rank by threat level

**API Calls:**
```python
# Ahrefs SERP Overview
GET /v3/keywords-explorer/serp-overview
params: keyword={keyword}, country=us

# For new domains found
GET /v3/site-explorer/metrics
params: target={domain}
```

**Insights:**
- Number of emerging competitors
- Top 3 threats with metrics
- Growth velocity of each
- Keywords they're winning

**Charts:**
- Table: emerging competitors with metrics
- Growth chart: visibility over time
- Threat matrix: size vs growth

---

### 6. Competitor Ad & Landing Strategy (`competitor-ads`)

**Data Sources:** Bright Data, DataForSEO

**Inputs:**
- `competitor_domains`: List[str] (required)

**Logic:**
1. Scrape competitor landing pages
2. Extract ad copy themes
3. Identify offers and CTAs
4. Analyze messaging patterns

**API Calls:**
```python
# Bright Data Web Scraper
POST /scrape
body: {url: competitor_landing_page, extract: ['headlines', 'ctas', 'offers']}

# DataForSEO Google Ads
POST /v3/dataforseo_labs/google/domain_ads_overview/live
body: {target: competitor_domain}
```

**Insights:**
- Common messaging themes
- Offer patterns (discounts, free shipping)
- CTA effectiveness indicators
- Landing page structure patterns

**Charts:**
- Word cloud: ad copy themes
- Table: competitor offers comparison
- Funnel diagram: landing page structure

---

### 7. Link Authority & Technical SEO (`link-authority`)

**Data Sources:** Ahrefs

**Inputs:**
- `target_domain`: str (required)
- `competitor_domains`: List[str] (optional)

**Logic:**
1. Get domain metrics (DR, backlinks, referring domains)
2. Analyze link profile quality
3. Compare with competitors
4. Identify link gaps

**API Calls:**
```python
# Ahrefs Domain Rating
GET /v3/site-explorer/domain-rating
params: target={domain}

# Ahrefs Backlinks
GET /v3/site-explorer/backlinks
params: target={domain}, mode=domain, limit=100

# Ahrefs Referring Domains
GET /v3/site-explorer/refdomains
params: target={domain}, mode=domain
```

**Insights:**
- Domain Rating vs competitors
- Link velocity (gaining/losing)
- Top referring domains
- Link quality distribution

**Charts:**
- Bar chart: DR comparison
- Line chart: backlink growth over time
- Pie chart: link quality distribution

---

### 8. Paid vs Organic Overlap (`paid-organic-overlap`)

**Data Sources:** DataForSEO

**Inputs:**
- `target_keywords`: List[str] (required)
- `gads_csv`: File (optional)

**Logic:**
1. For each keyword, check if brand appears in organic AND paid
2. Calculate overlap percentage
3. Estimate wasted spend on cannibalization
4. Identify optimization opportunities

**API Calls:**
```python
# DataForSEO SERP (organic + paid)
POST /v3/serp/google/organic/live/advanced
body: {keyword, depth: 100}

# Check both organic_results and paid_results
```

**Insights:**
- Overlap percentage
- Estimated wasted spend
- Keywords to pause paid
- Keywords needing paid support

**Charts:**
- Venn diagram: paid vs organic overlap
- Table: keyword-level analysis
- Bar chart: spend optimization potential

---

### 9. Priority Scoring (`priority-scoring`)

**Data Sources:** Internal (aggregates other modules)

**Inputs:** None (depends on other modules)

**Logic:**
1. Collect all recommendations from other modules
2. Score by: impact, effort, confidence, urgency
3. Calculate composite priority score
4. Rank and group into tiers

**Scoring Formula:**
```python
priority_score = (
    impact_score * 0.35 +
    confidence_score * 0.25 +
    urgency_score * 0.25 +
    (1 - effort_score) * 0.15
)
```

**Insights:**
- Top 5 priority actions
- Quick wins (high impact, low effort)
- Strategic bets (high impact, high effort)
- Deprioritization candidates

**Charts:**
- Impact vs Effort matrix
- Priority tier breakdown
- Action timeline

---

### 10. Deprioritization Flags (`deprioritization`)

**Data Sources:** Internal

**Inputs:** None (depends on other modules)

**Logic:**
1. Identify low-confidence recommendations
2. Flag structurally constrained opportunities
3. Mark actions requiring validation
4. Highlight diminishing returns

**Criteria:**
- Confidence < 50%
- Effort > Impact
- Data older than 30 days
- Conflicting council recommendations

**Insights:**
- Actions to deprioritize
- Reasons for deprioritization
- Validation requirements
- Alternative approaches

---

### 11. Strategic Summary (`strategic-summary`)

**Data Sources:** Internal (synthesizes all modules)

**Inputs:** None

**Logic:**
1. Aggregate key findings from all modules
2. Identify themes and patterns
3. Generate executive narrative
4. Highlight critical decisions

**Output Structure:**
- What's happening (market context)
- Where you stand (competitive position)
- What to do (prioritized actions)
- What to avoid (deprioritization)

---

### 12. OS Drop - Executive 1-Pager (`os-drop`)

**Data Sources:** Internal

**Inputs:**
- `executive_focus`: str (growth, competitive, efficiency, risk)

**Logic:**
1. Select top 3 insights based on focus
2. Generate TL;DR summary
3. Create visual summary
4. Format for sharing

**Output:**
- 1-page PDF-ready format
- Key charts (max 3)
- Decision summary
- Next steps

---

### 13. Market Momentum Index (`market-momentum`)

**Data Sources:** Google Trends

**Inputs:**
- `momentum_keywords`: List[str] (required)
- `time_period`: str (default: '6m')

**Logic:**
1. Calculate velocity of demand change
2. Compare to historical baseline
3. Classify: Heating / Stable / Shifting / Cooling
4. Generate momentum score

**Momentum Calculation:**
```python
# 30-day moving average slope
recent_avg = mean(last_30_days)
previous_avg = mean(previous_30_days)
velocity = (recent_avg - previous_avg) / previous_avg

# Classification
if velocity > 0.15: status = 'Heating'
elif velocity > 0.05: status = 'Stable-Up'
elif velocity > -0.05: status = 'Stable'
elif velocity > -0.15: status = 'Shifting'
else: status = 'Cooling'
```

**Insights:**
- Current momentum status
- Velocity trend
- Comparison to category
- Timing recommendation

---

### 14. Action Cards (`action-cards`)

**Data Sources:** Internal

**Logic:**
1. Collect all recommendations
2. Format as action cards
3. Link to source modules
4. Add context and evidence

**Card Structure:**
```python
{
    'id': 'action-001',
    'title': 'Target High-Volume Gap Keywords',
    'what': 'Create content for top 10 keyword gaps',
    'why_now': 'Competitors gaining visibility rapidly',
    'expected_impact': '+15% organic traffic in 90 days',
    'confidence': 0.82,
    'source_module': 'keyword-gap',
    'source_insight': 'insight-001',
    'effort': 'medium',
    'timeline': '4-6 weeks'
}
```

---

## 🧪 Testing Strategy

### Unit Tests (per executor)

```python
# tests/test_module_executors.py

class TestKeywordGapExecutor:
    def test_with_valid_inputs(self):
        """Test executor with valid competitor domains."""
        
    def test_with_missing_data(self):
        """Test graceful handling of API failures."""
        
    def test_insight_generation(self):
        """Test that insights have required fields."""
        
    def test_confidence_calculation(self):
        """Test confidence is calculated correctly."""
```

### Integration Tests

```python
# tests/test_module_integration.py

class TestModuleIntegration:
    def test_full_report_generation(self):
        """Test all modules execute in report flow."""
        
    def test_module_dependencies(self):
        """Test dependent modules receive correct data."""
```

---

## 📅 Cronograma Detallado

### Semana 1

| Día | Módulo | Desarrollador |
|-----|--------|---------------|
| L | keyword-gap | Backend |
| M | keyword-gap (cont) | Backend |
| X | category-visibility | Backend |
| J | category-visibility (cont) | Backend |
| V | branded-demand, breakout-terms | Backend |

### Semana 2

| Día | Módulo | Desarrollador |
|-----|--------|---------------|
| L | emerging-competitor | Backend |
| M | competitor-ads | Backend |
| X | link-authority, paid-organic-overlap | Backend |
| J | priority-scoring, deprioritization | Backend |
| V | strategic-summary, os-drop, market-momentum | Backend |

---

## ✅ Checklist de Completitud

Para cada módulo:

- [ ] Executor implementado en `services.py`
- [ ] Inputs validados según `modules.yaml`
- [ ] API calls implementados
- [ ] Insights generados con estructura correcta
- [ ] Recommendations generadas
- [ ] Charts data preparado
- [ ] Council context incluido
- [ ] Unit tests escritos
- [ ] Integration test pasando
- [ ] Documentación actualizada

---

## 🔗 Dependencias

- **Phase 5 (API Integrations):** Algunos ejecutores necesitan APIs completas
- **Phase 2 (Playbooks):** Ejecutores deben seguir playbook logic

---

*Documento de referencia para implementación de módulos*
