# 🔌 Phase 5: API Integrations Plan

**Duración:** 1 semana  
**Prioridad:** P1 - Alto  
**Gap:** 60% - Integraciones parciales

---

## 🎯 Objetivo

Completar integraciones con todas las APIs externas requeridas por los módulos.

---

## 📊 Estado Actual

| API | Estado | Módulos que la usan |
|-----|--------|---------------------|
| Google Trends | ✅ Completo | market-demand, branded-demand, breakout-terms, market-momentum |
| Ahrefs | ⚠️ Parcial | keyword-gap, share-of-voice, link-authority, emerging-competitor, category-visibility |
| DataForSEO | ⚠️ Parcial | category-visibility, paid-organic-overlap, breakout-terms |
| Bright Data | ❌ No implementado | competitor-ads |
| SERPAPI | ❌ No implementado | emerging-competitor, share-of-voice |

---

## 🔧 Implementaciones Requeridas

### 1. Ahrefs Service (Completar)

```python
# backend/apps/ahrefs/services.py

class AhrefsService:
    """Complete Ahrefs API integration."""
    
    BASE_URL = "https://api.ahrefs.com/v3"
    
    # ✅ Ya implementado
    def get_domain_rating(self, domain: str) -> dict: ...
    def get_backlinks(self, domain: str, limit: int = 100) -> dict: ...
    
    # ❌ Por implementar
    def get_organic_keywords(self, domain: str, limit: int = 1000) -> dict:
        """Get organic keywords for a domain."""
        return self._request(
            '/site-explorer/organic-keywords',
            params={'target': domain, 'mode': 'domain', 'limit': limit}
        )
    
    def get_keyword_gap(self, target: str, competitors: List[str]) -> dict:
        """Get keyword gap analysis."""
        return self._request(
            '/keywords-explorer/keywords-gap',
            params={
                'target': target,
                'competitors': ','.join(competitors),
                'mode': 'domain'
            }
        )
    
    def get_referring_domains(self, domain: str, limit: int = 100) -> dict:
        """Get referring domains."""
        return self._request(
            '/site-explorer/refdomains',
            params={'target': domain, 'mode': 'domain', 'limit': limit}
        )
    
    def get_serp_overview(self, keyword: str, country: str = 'us') -> dict:
        """Get SERP overview for a keyword."""
        return self._request(
            '/keywords-explorer/serp-overview',
            params={'keyword': keyword, 'country': country}
        )
```

### 2. DataForSEO Service (Completar)

```python
# backend/apps/dataforseo/services.py

class DataForSEOService:
    """Complete DataForSEO API integration."""
    
    BASE_URL = "https://api.dataforseo.com/v3"
    
    # ✅ Ya implementado
    def get_serp_results(self, keyword: str, location: int = 2840) -> dict: ...
    
    # ❌ Por implementar
    def get_domain_ads(self, domain: str) -> dict:
        """Get domain ads overview."""
        return self._post(
            '/dataforseo_labs/google/domain_ads_overview/live',
            data=[{'target': domain}]
        )
    
    def get_keyword_suggestions(self, keyword: str, limit: int = 100) -> dict:
        """Get keyword suggestions."""
        return self._post(
            '/dataforseo_labs/google/keyword_suggestions/live',
            data=[{'keyword': keyword, 'limit': limit}]
        )
    
    def get_serp_competitors(self, keywords: List[str]) -> dict:
        """Get SERP competitors for keywords."""
        return self._post(
            '/dataforseo_labs/google/serp_competitors/live',
            data=[{'keywords': keywords}]
        )
    
    def get_historical_serp(self, keyword: str, date: str) -> dict:
        """Get historical SERP data."""
        return self._post(
            '/serp/google/organic/task_post',
            data=[{'keyword': keyword, 'date': date}]
        )
```

### 3. Bright Data Service (Nuevo)

```python
# backend/apps/brightdata/services.py

class BrightDataService:
    """Bright Data web scraping integration."""
    
    BASE_URL = "https://api.brightdata.com"
    
    def scrape_landing_page(self, url: str) -> dict:
        """Scrape competitor landing page."""
        return self._request('/scrape', params={
            'url': url,
            'extract': ['headlines', 'ctas', 'offers', 'images']
        })
    
    def scrape_ad_library(self, domain: str) -> dict:
        """Scrape ad library for a domain."""
        return self._request('/scrape', params={
            'url': f'https://www.facebook.com/ads/library/?q={domain}',
            'extract': ['ad_copy', 'creative', 'cta']
        })
    
    def get_competitor_prices(self, urls: List[str]) -> dict:
        """Scrape competitor pricing."""
        return self._batch_scrape(urls, extract=['price', 'currency', 'product_name'])
```

### 4. SERPAPI Service (Nuevo)

```python
# backend/apps/serpapi/services.py

class SERPAPIService:
    """SERPAPI integration for SERP analysis."""
    
    BASE_URL = "https://serpapi.com/search"
    
    def get_google_serp(self, query: str, location: str = 'United States') -> dict:
        """Get Google SERP results."""
        return self._request({
            'q': query,
            'location': location,
            'google_domain': 'google.com',
            'gl': 'us',
            'hl': 'en'
        })
    
    def get_google_ads(self, query: str) -> dict:
        """Get Google Ads for a query."""
        response = self.get_google_serp(query)
        return {
            'ads': response.get('ads', []),
            'shopping_results': response.get('shopping_results', [])
        }
    
    def get_local_results(self, query: str, location: str) -> dict:
        """Get local pack results."""
        response = self.get_google_serp(query, location)
        return response.get('local_results', {})
```

---

## 📋 Rate Limiting & Caching

### Rate Limiter

```python
# backend/apps/core/rate_limiter.py

class APIRateLimiter:
    """Rate limiter for external APIs."""
    
    LIMITS = {
        'ahrefs': {'requests': 100, 'period': 60},  # 100/min
        'dataforseo': {'requests': 2000, 'period': 60},  # 2000/min
        'brightdata': {'requests': 50, 'period': 60},  # 50/min
        'serpapi': {'requests': 100, 'period': 3600},  # 100/hour
    }
    
    def can_request(self, api: str) -> bool: ...
    def record_request(self, api: str): ...
    def wait_if_needed(self, api: str): ...
```

### Response Caching

```python
# backend/apps/core/cache.py

class APIResponseCache:
    """Cache API responses to reduce costs."""
    
    TTL = {
        'ahrefs_domain_rating': 86400,  # 24 hours
        'ahrefs_keywords': 43200,  # 12 hours
        'dataforseo_serp': 3600,  # 1 hour
        'google_trends': 21600,  # 6 hours
    }
    
    def get(self, key: str) -> Optional[dict]: ...
    def set(self, key: str, value: dict, ttl: int = None): ...
    def invalidate(self, pattern: str): ...
```

---

## 📅 Cronograma

| Día | Tarea |
|-----|-------|
| 1 | Completar AhrefsService |
| 2 | Completar DataForSEOService |
| 3 | Implementar BrightDataService |
| 4 | Implementar SERPAPIService |
| 5 | Rate limiting + caching + tests |

---

## ✅ Entregables

- [ ] AhrefsService completo (5 métodos nuevos)
- [ ] DataForSEOService completo (4 métodos nuevos)
- [ ] BrightDataService nuevo
- [ ] SERPAPIService nuevo
- [ ] Rate limiter
- [ ] Response cache
- [ ] Unit tests
- [ ] Integration tests
