"""
Quality Score Components
=========================

Interactive components for displaying and analyzing UCR quality scores.
"""

import streamlit as st
import plotly.graph_objects as go
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from brand_intel.core.models import Configuration, QualityScore
from brand_intel.services import UCRService, QualityScorer


def create_gauge_chart(score: int, grade: str) -> go.Figure:
    """
    Create a circular gauge chart for quality score.

    Args:
        score: Quality score (0-100)
        grade: Grade label ("low", "medium", "high")

    Returns:
        Plotly gauge chart figure
    """
    colors = {
        "high": "#28a745",
        "medium": "#ffc107",
        "low": "#dc3545"
    }

    # Determine color zones based on score
    if score >= 75:
        bar_color = colors["high"]
    elif score >= 50:
        bar_color = colors["medium"]
    else:
        bar_color = colors["low"]

    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=score,
        domain={'x': [0, 1], 'y': [0, 1]},
        title={'text': f"Quality Score - {grade.upper()}", 'font': {'size': 16}},
        gauge={
            'axis': {
                'range': [0, 100],
                'tickwidth': 1,
                'tickcolor': "darkblue"
            },
            'bar': {'color': bar_color, 'thickness': 0.3},
            'bgcolor': "white",
            'borderwidth': 2,
            'bordercolor': "gray",
            'steps': [
                {'range': [0, 50], 'color': "#ffebee", 'name': "Low"},
                {'range': [50, 75], 'color': "#fff8e6", 'name': "Medium"},
                {'range': [75, 100], 'color': "#e8f5e9", 'name': "High"}
            ],
            'threshold': {
                'line': {'color': "red", 'width': 4},
                'thickness': 0.75,
                'value': 50  # Minimum threshold for analysis
            }
        }
    ))

    fig.update_layout(
        height=300,
        margin=dict(l=20, r=20, t=50, b=20),
        font={'color': "darkblue", 'family': "Arial"}
    )

    return fig


def render_score_breakdown(score: QualityScore):
    """
    Render detailed score breakdown with progress bars.

    Args:
        score: QualityScore object with breakdown details
    """
    st.markdown("### 📊 Score Breakdown")

    dimensions = [
        ("Completeness", score.completeness, "Sections A, B, E - Core UCR data completeness"),
        ("Competitor Confidence", score.competitor_confidence, "Section C - Competitor data quality and evidence"),
        ("Negative Strength", score.negative_strength, "Section G - Guardrails and restrictions strength"),
        ("Evidence Coverage", score.evidence_coverage, "Section C - Supporting evidence for competitors"),
    ]

    for name, value, description in dimensions:
        col1, col2, col3 = st.columns([2, 3, 1])

        with col1:
            st.markdown(f"**{name}**")
            st.caption(description)

        with col2:
            # Progress bar with color coding
            if value >= 75:
                color = "🟢"
            elif value >= 50:
                color = "🟡"
            else:
                color = "🔴"

            st.progress(value / 100)
            st.caption(f"{color} {value}%")

        with col3:
            # Add improvement indicator
            if value >= 80:
                st.success("✅")
            elif value >= 60:
                st.warning("⚠️")
            else:
                st.error("❌")


def render_improvement_suggestions(config: Configuration):
    """
    Render improvement suggestions with actionable items.

    Args:
        config: Current configuration
    """
    from brand_intel.services import QualityScorer, UCRService

    scorer = QualityScorer(UCRService())
    suggestions = scorer.get_improvement_suggestions(config)

    if not suggestions:
        st.success("✅ **UCR is fully optimized!** All sections are complete and well-configured.")
        return

    st.markdown("### 💡 Improvement Suggestions")

    # Group suggestions by priority
    priority_groups = {
        "critical": [],
        "high": [],
        "medium": [],
        "low": []
    }

    for s in suggestions:
        priority = s.get('priority', 'medium')
        priority_groups[priority].append(s)

    priority_icons = {
        "critical": "🔴",
        "high": "🟠",
        "medium": "🟡",
        "low": "🟢"
    }

    priority_order = ["critical", "high", "medium", "low"]

    for priority in priority_order:
        if priority_groups[priority]:
            st.markdown(f"**{priority_icons[priority]} {priority.title()} Priority**")

            for s in priority_groups[priority][:3]:  # Show top 3 per priority
                with st.expander(f"{s.get('field', 'Unknown')}: {s.get('suggestion', '')[:50]}..."):
                    st.write(s.get('suggestion', ''))

                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.caption(f"**Impact:** {s.get('impact', 'Unknown')}")
                        st.caption(f"**Section:** {s.get('section', 'Unknown')}")

                    with col2:
                        # Action button to navigate to section
                        section_map = {
                            'A': '🏢 Brand Context',
                            'B': '🎯 Category Definition',
                            'C': '🏆 Competitive Set',
                            'D': '📊 Demand Definition',
                            'E': '🎯 Strategic Intent',
                            'F': '📺 Channel Context',
                            'G': '🛡️ Negative Scope',
                            'H': '⚖️ Governance'
                        }

                        section_name = section_map.get(s.get('section', ''), 'Unknown')
                        if st.button(f"Fix in {section_name}", key=f"fix_{s.get('field', '')}"):
                            # Store navigation intent
                            st.session_state.navigate_to_section = s.get('section', '')
                            st.success(f"Navigate to Section {s.get('section', '')} to fix this issue")
                            st.rerun()


def render_validation_panel(config: Configuration):
    """
    Render real-time validation panel.

    Args:
        config: Current configuration
    """
    from brand_intel.services import UCRService

    service = UCRService()
    result = service.validate(config)

    st.markdown("### ✅ Real-time Validation")

    # Overall status badge
    status_colors = {
        "COMPLETE": "#28a745",
        "NEEDS_REVIEW": "#ffc107",
        "BLOCKED": "#dc3545"
    }

    status_color = status_colors.get(result.status.value, "#666")

    st.markdown(f"""
    <div style="background: {status_color}20; color: {status_color};
                padding: 15px; border-radius: 8px; border-left: 4px solid {status_color};">
        <div style="display: flex; align-items: center;">
            <div style="font-size: 24px; margin-right: 10px;">
                {"✅" if result.status.value == "COMPLETE" else "⚠️" if result.status.value == "NEEDS_REVIEW" else "❌"}
            </div>
            <div>
                <strong style="font-size: 16px;">{result.status.value.replace("_", " ").title()}</strong>
                <br>
                <span style="font-size: 14px;">
                    {"Ready for analysis" if result.status.value == "COMPLETE"
                     else "Some issues need attention" if result.status.value == "NEEDS_REVIEW"
                     else "Critical issues must be fixed"}
                </span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Errors (blocking)
    if result.blocked_reasons:
        st.error("**🚫 Blocking Issues:**")
        for reason in result.blocked_reasons:
            st.error(f"• {reason}")

    # Warnings (non-blocking)
    if result.warnings:
        st.warning("**⚠️ Review Required:**")
        for warning in result.warnings:
            st.warning(f"• {warning}")

    # Section status grid
    if hasattr(result, 'sections_valid') and result.sections_valid:
        st.markdown("### 📋 Section Status")

        cols = st.columns(4)
        section_names = {
            'A': 'Brand',
            'B': 'Category',
            'C': 'Competitors',
            'D': 'Demand',
            'E': 'Strategy',
            'F': 'Channels',
            'G': 'Guardrails',
            'H': 'Governance'
        }

        section_items = list(result.sections_valid.items())

        for i, (section, valid) in enumerate(section_items):
            with cols[i % 4]:
                icon = "✅" if valid else "⚠️"
                color = "green" if valid else "orange"
                section_name = section_names.get(str(section).upper(), str(section))

                st.markdown(f"""
                <div style="background: {color}20; color: {color};
                            padding: 8px; border-radius: 6px; text-align: center; margin: 2px;">
                    <div style="font-size: 18px;">{icon}</div>
                    <div style="font-size: 12px; font-weight: bold;">Section {section}</div>
                    <div style="font-size: 10px;">{section_name}</div>
                </div>
                """, unsafe_allow_html=True)


def render_quality_score_mini(config: Configuration):
    """
    Render mini quality score for sidebar.

    Args:
        config: Current configuration
    """
    if not config:
        return

    score = config.quality_score

    st.markdown("### 📊 Quality Score")

    # Mini gauge
    fig = create_gauge_chart(score.overall, score.grade)
    fig.update_layout(height=150, margin=dict(l=10, r=10, t=20, b=10))
    st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})

    # Quick status
    if score.overall >= 75:
        st.success("Ready for analysis")
    elif score.overall >= 50:
        st.warning("Needs improvement")
    else:
        st.error("Critical issues")

    # Link to full analysis
    if st.button("View Details", use_container_width=True):
        st.session_state.active_page = "8_📈_Quality_Score"


def render_score_history(config: Configuration):
    """Render quality score history chart."""
    st.markdown("### 📈 Score History")

    # Mock historical data (would come from database in real implementation)
    dates = []
    scores = []

    # Generate last 30 days of mock data
    for i in range(30, 0, -1):
        date = datetime.now() - timedelta(days=i)
        # Simulate improving scores over time
        base_score = min(100, config.quality_score.overall + (30 - i) * 2)
        score_variation = (i % 5) - 2  # Some random variation
        final_score = max(0, min(100, base_score + score_variation))

        dates.append(date.strftime('%m/%d'))
        scores.append(final_score)

    # Add current score
    dates.append("Today")
    scores.append(config.quality_score.overall)

    # Create line chart
    import plotly.express as px

    fig = px.line(
        x=dates,
        y=scores,
        title="Quality Score Trend",
        labels={'x': 'Date', 'y': 'Score'},
        markers=True
    )

    fig.update_layout(
        height=250,
        margin=dict(l=20, r=20, t=40, b=20),
        showlegend=False
    )

    fig.update_traces(
        line=dict(color='#007bff', width=3),
        marker=dict(size=6, color='#007bff')
    )

    st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})


def render_benchmark_comparison(config: Configuration):
    """Render benchmark comparison."""
    st.markdown("### 🏆 Benchmark Comparison")

    current_score = config.quality_score.overall

    # Mock benchmark data
    benchmarks = {
        "Industry Average": 65,
        "Top Quartile": 85,
        "Excellent": 95,
        "Your Score": current_score
    }

    # Create horizontal bar chart
    categories = list(benchmarks.keys())
    values = list(benchmarks.values())

    import plotly.graph_objects as go

    fig = go.Figure()

    # Add bars
    for i, (category, value) in enumerate(zip(categories, values)):
        color = "#007bff" if category == "Your Score" else "#6c757d"
        fig.add_trace(go.Bar(
            x=[value],
            y=[category],
            orientation='h',
            marker_color=color,
            name=category,
            showlegend=False
        ))

    fig.update_layout(
        height=200,
        margin=dict(l=20, r=20, t=20, b=20),
        xaxis_title="Quality Score",
        xaxis_range=[0, 100]
    )

    st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})

    # Performance indicator
    if current_score >= 85:
        st.success("🏆 **Excellent performance!** Above top quartile.")
    elif current_score >= 65:
        st.info("📊 **Good performance.** At or above industry average.")
    else:
        st.warning("📈 **Room for improvement.** Below industry average.")


def render_score_animations(old_score: int, new_score: int):
    """
    Render score change animations.

    Args:
        old_score: Previous score
        new_score: New score
    """
    if new_score > old_score:
        improvement = new_score - old_score
        st.balloons()
        st.success(f"🎉 **Score improved by {improvement} points!**")

        # Show improvement breakdown
        st.markdown("### 🚀 What Improved")
        if improvement >= 20:
            st.markdown("**Major improvements detected!**")
        elif improvement >= 10:
            st.markdown("**Significant progress made.**")
        else:
            st.markdown("**Steady improvement continues.**")

    elif new_score < old_score:
        decline = old_score - new_score
        st.warning(f"⚠️ **Score decreased by {decline} points.** Review recent changes.")

    else:
        st.info("📊 **Score unchanged.** No significant changes detected.")
