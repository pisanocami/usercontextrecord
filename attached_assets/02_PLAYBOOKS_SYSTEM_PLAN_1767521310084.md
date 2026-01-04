# 📘 Phase 2: Playbooks System Implementation Plan

**Duración:** 2 semanas  
**Prioridad:** P0 - Crítico  
**Gap:** 100% - Sistema no implementado

---

## 🎯 Objetivo

Implementar sistema de playbooks que cargue y ejecute la lógica documentada.

---

## 🏗️ Arquitectura

```
backend/apps/playbooks/
├── models.py           # PlaybookConfig, PlaybookExecution
├── services.py         # PlaybookLoader, PlaybookExecutor
├── validators.py       # PlaybookValidator
├── playbooks/          # YAML files (16 playbooks)
```

---

## 📋 Modelo PlaybookConfig

```python
class PlaybookConfig(models.Model):
    module_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    version = models.CharField(max_length=20)
    
    # Strategic Context
    strategic_role = models.TextField()
    primary_question = models.CharField(max_length=500)
    owner_council = models.CharField(max_length=100)
    supporting_councils = ArrayField(models.CharField(max_length=100))
    
    # Core Logic
    processing_steps = models.JSONField()
    council_reasoning_prompt = models.TextField()
    confidence_factors = models.JSONField()
    
    # Outputs
    insight_templates = models.JSONField()
    recommendation_templates = models.JSONField()
    deprioritization_rules = models.JSONField()
```

---

## 📄 YAML Structure

```yaml
module_id: market-demand
name: Market Demand & Seasonality
version: "1.0"

strategic_role: "Answers 'When should we move?'"
primary_question: "When does demand actually happen?"
owner_council: strategic_intelligence

processing_steps:
  - step: fetch_trends
    api: google_trends
  - step: normalize_data
  - step: detect_seasonality
  - step: calculate_forecast

council_reasoning_prompt: |
  Analyze market demand for {{brand.name}}...

confidence_factors:
  data_freshness: {weight: 0.25}
  keyword_coverage: {weight: 0.25}

insight_templates:
  - id: peak_timing
    condition: "seasonality_index > 1.5"
    template: "Peak demand in {{peak_months}}"

deprioritization_rules:
  - condition: "confidence < 0.4"
    action: "Flag for validation"
```

---

## 🔧 PlaybookExecutor Service

```python
class PlaybookExecutor:
    def execute(self, playbook: PlaybookConfig, brand: Brand, inputs: dict):
        # 1. Validate inputs
        # 2. Execute processing steps
        # 3. Apply council reasoning
        # 4. Generate insights from templates
        # 5. Calculate confidence
        # 6. Apply deprioritization rules
        # 7. Return structured output
```

---

## 📅 Cronograma

| Semana | Tarea |
|--------|-------|
| 3.1 | Models + YAML loader |
| 3.2 | PlaybookExecutor core |
| 4.1 | 8 playbooks YAML |
| 4.2 | 8 playbooks YAML + tests |

---

## ✅ Entregables

- [ ] PlaybookConfig model
- [ ] PlaybookExecution model
- [ ] YAML loader service
- [ ] PlaybookExecutor service
- [ ] 16 playbook YAML files
- [ ] Integration with ReportService
- [ ] Unit tests
