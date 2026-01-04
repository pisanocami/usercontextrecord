# 🔄 Phase 6: Cross-Council Synthesis Plan

**Duración:** 1 semana  
**Prioridad:** P2 - Medio  
**Gap:** 100% - No implementado

---

## 🎯 Objetivo

Implementar síntesis entre councils para generar recomendaciones unificadas.

---

## 📊 Problema Actual

- Cada council genera perspectivas independientes
- No hay resolución de conflictos entre councils
- No hay weighted voting basado en expertise
- Executive Summary no sintetiza múltiples councils

---

## 🏗️ Arquitectura

### Master Synthesis Council

```python
# backend/apps/councils/synthesis.py

class MasterSynthesisCouncil:
    """
    Synthesizes perspectives from multiple councils into unified recommendations.
    Implements weighted voting and conflict resolution.
    """
    
    def synthesize(self, council_perspectives: Dict[str, dict]) -> dict:
        """
        Synthesize multiple council perspectives.
        
        Args:
            council_perspectives: Dict mapping council_id to perspective
            
        Returns:
            Unified synthesis with:
            - unified_recommendation
            - consensus_level
            - key_agreements
            - key_conflicts
            - resolution_rationale
        """
        # 1. Extract recommendations from each council
        recommendations = self._extract_recommendations(council_perspectives)
        
        # 2. Identify agreements and conflicts
        agreements, conflicts = self._analyze_alignment(recommendations)
        
        # 3. Apply weighted voting
        weighted_recs = self._apply_weights(recommendations)
        
        # 4. Resolve conflicts
        resolved = self._resolve_conflicts(conflicts, council_perspectives)
        
        # 5. Generate unified recommendation
        unified = self._generate_unified(weighted_recs, resolved)
        
        return {
            'unified_recommendation': unified,
            'consensus_level': self._calculate_consensus(agreements, conflicts),
            'key_agreements': agreements,
            'key_conflicts': conflicts,
            'resolution_rationale': resolved.get('rationale'),
            'contributing_councils': list(council_perspectives.keys())
        }
```

### Council Arbitrator

```python
class CouncilArbitrator:
    """Resolves conflicts between council recommendations."""
    
    COUNCIL_WEIGHTS = {
        'strategic_intelligence': 1.0,
        'seo_visibility_demand': 0.9,
        'performance_media_messaging': 0.85,
        'growth_strategy_planning': 1.0,
        'creative_funnel': 0.7,
        'ops_attribution': 0.8,
        'product_gtm_alignment': 0.75,
    }
    
    def resolve(self, conflict: dict, perspectives: dict) -> dict:
        """
        Resolve a conflict between councils.
        
        Strategies:
        1. Weight-based: Higher weight council wins
        2. Evidence-based: Council with more data support wins
        3. Scope-based: Council with domain expertise wins
        """
        strategy = self._select_strategy(conflict)
        
        if strategy == 'weight':
            return self._resolve_by_weight(conflict, perspectives)
        elif strategy == 'evidence':
            return self._resolve_by_evidence(conflict, perspectives)
        elif strategy == 'scope':
            return self._resolve_by_scope(conflict, perspectives)
        
        return self._resolve_by_consensus(conflict, perspectives)
```

---

## 📋 Conflict Types

| Type | Description | Resolution Strategy |
|------|-------------|---------------------|
| Priority Conflict | Councils disagree on action priority | Weight-based |
| Timing Conflict | Councils disagree on when to act | Evidence-based |
| Resource Conflict | Councils compete for same resources | Scope-based |
| Strategy Conflict | Fundamental disagreement on approach | Consensus |

---

## 🔧 Integration

### ReportService Integration

```python
# backend/apps/reports/services.py

class ReportService:
    def __init__(self):
        self.synthesis_council = MasterSynthesisCouncil()
        self.arbitrator = CouncilArbitrator()
    
    def generate_executive_summary(self, master_report):
        # Get individual council perspectives
        perspectives = self._get_council_perspectives(master_report.module_outputs)
        
        # Synthesize into unified view
        synthesis = self.synthesis_council.synthesize(perspectives)
        
        # Include in executive summary
        return ExecutiveSummary.objects.create(
            master_report=master_report,
            council_perspectives=perspectives,
            unified_synthesis=synthesis,
            consensus_level=synthesis['consensus_level'],
            ...
        )
```

---

## 📄 Output Structure

```python
{
    'unified_recommendation': {
        'primary_action': 'Focus on keyword gap opportunities',
        'supporting_actions': [...],
        'timing': 'Immediate - within 2 weeks',
        'expected_impact': 'High',
        'confidence': 0.85
    },
    'consensus_level': 0.78,  # 0-1 scale
    'key_agreements': [
        {
            'topic': 'Keyword opportunity exists',
            'councils': ['seo_visibility_demand', 'strategic_intelligence'],
            'strength': 'strong'
        }
    ],
    'key_conflicts': [
        {
            'topic': 'Timing of investment',
            'council_a': 'strategic_intelligence',
            'position_a': 'Wait for Q2',
            'council_b': 'performance_media_messaging',
            'position_b': 'Act now',
            'resolution': 'Act now with limited budget, scale in Q2',
            'rationale': 'Evidence supports immediate opportunity with manageable risk'
        }
    ],
    'contributing_councils': [
        'strategic_intelligence',
        'seo_visibility_demand',
        'performance_media_messaging'
    ]
}
```

---

## ✅ Entregables

- [ ] MasterSynthesisCouncil class
- [ ] CouncilArbitrator class
- [ ] Conflict detection logic
- [ ] Weighted voting system
- [ ] Integration with ReportService
- [ ] ExecutiveSummary model updates
- [ ] Unit tests
- [ ] Integration tests
