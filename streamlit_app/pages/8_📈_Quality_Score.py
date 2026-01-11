"""
Quality Score Analysis Page
============================

Dedicated page for comprehensive quality score analysis,
improvement suggestions, and historical tracking.
"""

import streamlit as st
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from streamlit_app.services.session_manager import SessionManager
from streamlit_app.components.quality_score_card import (
    create_gauge_chart, render_score_breakdown, render_improvement_suggestions,
    render_score_history, render_benchmark_comparison, render_score_animations
)
from streamlit_app.components.validation_panel import render_validation_panel

st.set_page_config(
    page_title="Quality Score Analysis | UCR FIRST",
    page_icon="📈",
    layout="wide"
)

session = SessionManager()

# Header
st.title("📈 Quality Score Analysis")
st.markdown("Comprehensive analysis of your User Context Record quality and improvement opportunities")

# UCR Check
ucr = session.get_current_ucr()

if not ucr:
    st.error("""
    ⚠️ **No UCR Selected**

    Please select a User Context Record from the sidebar to view quality analysis.
    """)
    st.stop()

# Main content
col1, col2 = st.columns([2, 1])

with col1:
    # Quality Score Gauge
    st.subheader("🎯 Overall Quality Score")

    # Get quality score
    quality_score = ucr.quality_score

    # Create and display gauge
    fig = create_gauge_chart(quality_score.overall, quality_score.grade)
    st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})

    # Score interpretation
    if quality_score.overall >= 90:
        st.success("🎉 **Exceptional Quality!** Your UCR is optimized for Fortune 500-grade analysis.")
    elif quality_score.overall >= 75:
        st.success("✅ **High Quality.** Ready for advanced competitive analysis.")
    elif quality_score.overall >= 60:
        st.info("📊 **Good Quality.** Suitable for most analysis tasks.")
    elif quality_score.overall >= 40:
        st.warning("⚠️ **Needs Improvement.** Basic analysis possible but results may be limited.")
    else:
        st.error("❌ **Critical Issues.** UCR requires immediate attention before analysis.")

with col2:
    # Quick metrics
    st.subheader("📊 Key Metrics")

    col2a, col2b = st.columns(2)

    with col2a:
        st.metric("Grade", quality_score.grade.upper())

        completeness_pct = quality_score.completeness
        st.metric("Completeness", f"{completeness_pct}%")

    with col2b:
        competitor_score = quality_score.competitor_confidence
        st.metric("Competitor Confidence", f"{competitor_score}%")

        guardrail_score = quality_score.negative_strength
        st.metric("Guardrail Strength", f"{guardrail_score}%")

    # Last calculated
    st.caption(f"Last updated: {quality_score.calculated_at.strftime('%Y-%m-%d %H:%M')}")

st.markdown("---")

# Detailed Breakdown
st.subheader("📊 Detailed Score Breakdown")
render_score_breakdown(quality_score)

st.markdown("---")

# Validation Status
st.subheader("✅ Real-time Validation")
render_validation_panel(ucr)

st.markdown("---")

# Improvement Suggestions
st.subheader("💡 Improvement Opportunities")
render_improvement_suggestions(ucr)

st.markdown("---")

# Historical Analysis
col1, col2 = st.columns(2)

with col1:
    st.subheader("📈 Score History")
    render_score_history(ucr)

with col2:
    st.subheader("🏆 Benchmark Comparison")
    render_benchmark_comparison(ucr)

st.markdown("---")

# Quality Insights
st.subheader("🔍 Quality Insights")

col1, col2 = st.columns(2)

with col1:
    # Strengths
    st.markdown("### ✅ Strengths")

    strengths = []

    if quality_score.completeness >= 80:
        strengths.append("**Complete Configuration:** All core sections well-defined")

    if quality_score.competitor_confidence >= 80:
        strengths.append("**Strong Competitive Intelligence:** Excellent competitor data")

    if quality_score.negative_strength >= 80:
        strengths.append("**Robust Guardrails:** Comprehensive restrictions in place")

    if quality_score.evidence_coverage >= 80:
        strengths.append("**Evidence-Based:** Strong supporting data for all claims")

    if not strengths:
        st.info("Analyzing your strengths...")

    for strength in strengths[:4]:  # Show top 4
        st.success(f"• {strength}")

with col2:
    # Areas for Focus
    st.markdown("### 🎯 Areas for Focus")

    focus_areas = []

    if quality_score.completeness < 70:
        focus_areas.append("**Complete Core Sections:** Fill in missing required fields")

    if quality_score.competitor_confidence < 70:
        focus_areas.append("**Enhance Competitor Data:** Add more evidence and details")

    if quality_score.negative_strength < 70:
        focus_areas.append("**Strengthen Guardrails:** Define clearer boundaries and restrictions")

    if quality_score.evidence_coverage < 70:
        focus_areas.append("**Add Supporting Evidence:** Provide data backing for all claims")

    if not focus_areas:
        st.info("Your UCR is well-balanced!")

    for area in focus_areas[:4]:  # Show top 4
        st.warning(f"• {area}")

st.markdown("---")

# Action Plan
st.subheader("🎯 Recommended Action Plan")

# Prioritize suggestions
from brand_intel.services import QualityScorer, UCRService

scorer = QualityScorer(UCRService())
suggestions = scorer.get_improvement_suggestions(ucr)

if suggestions:
    # Group by priority
    critical = [s for s in suggestions if s.get('priority') == 'critical']
    high = [s for s in suggestions if s.get('priority') == 'high']
    medium = [s for s in suggestions if s.get('priority') == 'medium']

    tabs = st.tabs(["🚨 Critical", "⚠️ High Priority", "📋 Medium Priority"])

    with tabs[0]:
        if critical:
            st.markdown("**Immediate Actions Required:**")
            for i, s in enumerate(critical[:5], 1):
                st.error(f"{i}. **{s.get('field')}**: {s.get('suggestion')}")
        else:
            st.success("No critical issues found!")

    with tabs[1]:
        if high:
            st.markdown("**High Impact Improvements:**")
            for i, s in enumerate(high[:5], 1):
                st.warning(f"{i}. **{s.get('field')}**: {s.get('suggestion')}")
        else:
            st.success("No high-priority improvements needed!")

    with tabs[2]:
        if medium:
            st.markdown("**Optional Enhancements:**")
            for i, s in enumerate(medium[:5], 1):
                st.info(f"{i}. **{s.get('field')}**: {s.get('suggestion')}")
        else:
            st.success("Configuration is fully optimized!")

else:
    st.success("🎉 **Perfect Score!** No improvements needed. Your UCR is Fortune 500-ready.")

st.markdown("---")

# Export Options
st.subheader("📄 Export Quality Report")

col1, col2, col3 = st.columns(3)

with col1:
    if st.button("📊 Export Summary", use_container_width=True):
        # Generate summary report
        summary = f"""
        UCR Quality Report - {datetime.now().strftime('%Y-%m-%d')}

        Overall Score: {quality_score.overall}/100 ({quality_score.grade.upper()})

        Breakdown:
        - Completeness: {quality_score.completeness}%
        - Competitor Confidence: {quality_score.competitor_confidence}%
        - Negative Strength: {quality_score.negative_strength}%
        - Evidence Coverage: {quality_score.evidence_coverage}%

        Generated by Brand Intelligence Platform
        """

        st.download_button(
            label="Download Summary",
            data=summary,
            file_name=f"ucr_quality_report_{datetime.now().strftime('%Y%m%d')}.txt",
            mime="text/plain"
        )

with col2:
    if st.button("📈 Export Trends", use_container_width=True):
        st.info("Trend export coming in future update")

with col3:
    if st.button("🔄 Recalculate Score", use_container_width=True):
        # Force recalculation
        from brand_intel.services import UCRService
        service = UCRService()

        # Recalculate and update
        new_score = service.calculate_quality_score(ucr)
        ucr.governance.quality_score = new_score

        # Show animation if score changed
        render_score_animations(quality_score.overall, new_score.overall)

# Footer
st.markdown("---")
st.caption("💡 **Tip:** Quality scores are recalculated automatically when you modify UCR sections. Higher scores enable more advanced analysis features.")
st.caption("🎯 **Goal:** Maintain scores above 75% for optimal competitive intelligence results.")
