---
description: Implementar Quality Score interactivo con breakdown y sugerencias
---

# Gap 4: Validación y Quality Score Interactivo

## Objetivo
Crear componentes visuales para mostrar el Quality Score con breakdown detallado y sugerencias de mejora.

## Pasos

### 1. Crear componente Quality Score Card
Crear `streamlit_app/components/quality_score_card.py`:
```python
import plotly.graph_objects as go

def create_gauge_chart(score: int, grade: str) -> go.Figure:
    """Create a circular gauge chart for quality score."""
    colors = {"high": "#28a745", "medium": "#ffc107", "low": "#dc3545"}
    
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=score,
        domain={'x': [0, 1], 'y': [0, 1]},
        gauge={
            'axis': {'range': [0, 100]},
            'bar': {'color': colors.get(grade, "#666")},
            'steps': [
                {'range': [0, 50], 'color': "#ffebee"},
                {'range': [50, 75], 'color': "#fff8e6"},
                {'range': [75, 100], 'color': "#e8f5e9"}
            ]
        }
    ))
    fig.update_layout(height=200, margin=dict(l=20, r=20, t=20, b=20))
    return fig
```

### 2. Implementar breakdown visual
```python
def render_score_breakdown(score: QualityScore):
    st.markdown("### Score Breakdown")
    
    dimensions = [
        ("Completeness", score.completeness, "Sections A, B, E"),
        ("Competitor Confidence", score.competitor_confidence, "Section C"),
        ("Negative Strength", score.negative_strength, "Section G"),
        ("Evidence Coverage", score.evidence_coverage, "Section C evidence"),
    ]
    
    for name, value, source in dimensions:
        col1, col2, col3 = st.columns([2, 3, 1])
        with col1:
            st.write(name)
        with col2:
            st.progress(value / 100)
        with col3:
            st.write(f"{value}%")
        st.caption(f"Source: {source}")
```

### 3. Implementar sugerencias de mejora
```python
def render_improvement_suggestions(config: Configuration):
    from brand_intel.services import QualityScorer, UCRService
    
    scorer = QualityScorer(UCRService())
    suggestions = scorer.get_improvement_suggestions(config)
    
    if not suggestions:
        st.success("✅ UCR is fully optimized!")
        return
    
    st.markdown("### 💡 Improvement Suggestions")
    
    priority_icons = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}
    
    for s in suggestions[:5]:
        with st.expander(f"{priority_icons[s['priority']]} {s['field']}"):
            st.write(s['suggestion'])
            st.caption(f"Impact: {s['impact']}")
            st.caption(f"Section: {s['section']}")
            
            if st.button(f"Fix now", key=f"fix_{s['field']}"):
                # Navigate to section
                st.session_state.active_section = s['section']
                st.rerun()
```

### 4. Crear panel de validación en tiempo real
Crear `streamlit_app/components/validation_panel.py`:
```python
def render_validation_panel(config: Configuration):
    from brand_intel.services import UCRService
    
    service = UCRService()
    result = service.validate(config)
    
    # Status badge
    status_colors = {
        "COMPLETE": "green",
        "NEEDS_REVIEW": "orange",
        "BLOCKED": "red"
    }
    
    st.markdown(f"""
    <div style="background: {status_colors.get(result.status.value, 'gray')}20; 
                padding: 10px; border-radius: 8px;">
        <strong>Status:</strong> {result.status.value}
    </div>
    """, unsafe_allow_html=True)
    
    # Errors
    if result.blocked_reasons:
        st.error("**Blocked Reasons:**")
        for reason in result.blocked_reasons:
            st.write(f"- {reason}")
    
    # Warnings
    if result.warnings:
        st.warning("**Warnings:**")
        for warning in result.warnings:
            st.write(f"- {warning}")
    
    # Section status
    st.markdown("### Section Status")
    for section, valid in result.sections_valid.items():
        icon = "✅" if valid else "⚠️"
        st.write(f"{icon} Section {section.value}")
```

### 5. Integrar en sidebar
Actualizar `streamlit_app/app.py`:
```python
def render_sidebar():
    # ... existing code ...
    
    if ucr:
        from streamlit_app.components.quality_score_card import render_quality_score_mini
        render_quality_score_mini(ucr)
```

### 6. Crear página dedicada de Quality Score
Crear `streamlit_app/pages/8_📈_Quality_Score.py`:
- Gauge chart grande
- Breakdown completo
- Sugerencias de mejora
- Historial de score
- Comparación con benchmarks

### 7. Agregar animaciones
```python
# Animación cuando score mejora
if new_score > old_score:
    st.balloons()
    st.success(f"Score improved! +{new_score - old_score} points")
```

### 8. Agregar tests
Crear `tests/unit/test_quality_score_components.py`

## Verificación
- [ ] Gauge chart funcionando
- [ ] Breakdown visual implementado
- [ ] Sugerencias de mejora funcionando
- [ ] Panel de validación en tiempo real
- [ ] Integración en sidebar
- [ ] Página dedicada creada
- [ ] Tests pasando
