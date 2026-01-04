# ✅ Phase 4: Data Validation Plan (Zero Hallucination)

**Duración:** 1 semana  
**Prioridad:** P1 - Alto  
**Gap:** 100% - No implementado

---

## 🎯 Objetivo

Implementar el principio "Zero Hallucination" del FON Council Manifesto.

---

## 📊 Requisitos del Manifesto

> **Zero Hallucination:** Don't infer, guess, or invent if data is missing.
> Treat ambiguity as a diagnostic signal.

---

## 🏗️ Componentes

### 1. DataCitationValidator

```python
# backend/apps/validation/validators.py

class DataCitationValidator:
    """Validates that all insights have proper data citations."""
    
    REQUIRED_FIELDS = ['data_point', 'source', 'why_it_matters']
    
    def validate_insight(self, insight: dict) -> ValidationResult:
        errors = []
        warnings = []
        
        for field in self.REQUIRED_FIELDS:
            if not insight.get(field):
                errors.append(f"Missing required field: {field}")
        
        # Check source is valid
        if insight.get('source') not in VALID_DATA_SOURCES:
            warnings.append(f"Unknown data source: {insight.get('source')}")
        
        # Check data_point is specific
        if self._is_vague_data_point(insight.get('data_point', '')):
            warnings.append("Data point is too vague")
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    def _is_vague_data_point(self, data_point: str) -> bool:
        VAGUE_PATTERNS = ['some', 'many', 'few', 'several', 'approximately']
        return any(p in data_point.lower() for p in VAGUE_PATTERNS)
```

### 2. LanguageValidator

```python
class LanguageValidator:
    """Detects speculative language that violates Zero Hallucination."""
    
    SPECULATIVE_PATTERNS = [
        r'\bprobably\b',
        r'\bmight\b',
        r'\bcould be\b',
        r'\bperhaps\b',
        r'\bI think\b',
        r'\bmaybe\b',
        r'\bseems like\b',
        r'\bappears to\b',
    ]
    
    REQUIRED_FRAMING = [
        'Based on available data',
        'The data shows',
        'According to',
        'Analysis indicates',
    ]
    
    def validate_text(self, text: str) -> ValidationResult:
        issues = []
        
        # Check for speculative language
        for pattern in self.SPECULATIVE_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                issues.append(f"Speculative language detected: {pattern}")
        
        # Check for proper framing
        has_framing = any(f.lower() in text.lower() for f in self.REQUIRED_FRAMING)
        if not has_framing:
            issues.append("Missing data-grounded framing")
        
        return ValidationResult(
            valid=len(issues) == 0,
            issues=issues
        )
```

### 3. ConfidenceEnforcer

```python
class ConfidenceEnforcer:
    """Enforces confidence degradation for missing/stale data."""
    
    def calculate_confidence(self, module_output: dict) -> float:
        factors = []
        
        # Data completeness
        if module_output.get('has_data'):
            factors.append(1.0)
        else:
            factors.append(0.0)
        
        # Source count
        sources = module_output.get('data_sources', [])
        source_score = min(len(sources) / 2, 1.0)
        factors.append(source_score)
        
        # Data freshness
        data_age = self._get_data_age(module_output)
        freshness_score = self._calculate_freshness(data_age)
        factors.append(freshness_score)
        
        # Insight quality
        insights = module_output.get('insights', [])
        quality_score = self._assess_insight_quality(insights)
        factors.append(quality_score)
        
        return sum(factors) / len(factors)
    
    def _calculate_freshness(self, age_days: int) -> float:
        if age_days <= 7: return 1.0
        if age_days <= 30: return 0.8
        if age_days <= 90: return 0.5
        return 0.2
```

---

## 📋 Integration Points

### ReportService Integration

```python
# backend/apps/reports/services.py

class ReportService:
    def __init__(self):
        self.citation_validator = DataCitationValidator()
        self.language_validator = LanguageValidator()
        self.confidence_enforcer = ConfidenceEnforcer()
    
    def _validate_module_output(self, output: dict) -> dict:
        """Validate and potentially reject invalid outputs."""
        
        # Validate insights
        valid_insights = []
        for insight in output.get('insights', []):
            result = self.citation_validator.validate_insight(insight)
            if result.valid:
                valid_insights.append(insight)
            else:
                logger.warning(f"Rejected insight: {result.errors}")
        
        output['insights'] = valid_insights
        
        # Recalculate confidence
        output['confidence'] = self.confidence_enforcer.calculate_confidence(output)
        
        return output
```

---

## 🧪 Tests

```python
class TestDataValidation:
    def test_rejects_insight_without_source(self):
        """Insights without source should be rejected."""
        
    def test_detects_speculative_language(self):
        """Speculative language should be flagged."""
        
    def test_confidence_degrades_with_stale_data(self):
        """Confidence should decrease for old data."""
        
    def test_valid_insight_passes(self):
        """Properly formatted insights should pass."""
```

---

## ✅ Entregables

- [ ] DataCitationValidator class
- [ ] LanguageValidator class
- [ ] ConfidenceEnforcer class
- [ ] Integration with ReportService
- [ ] Unit tests (>80% coverage)
- [ ] Documentation
