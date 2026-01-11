"""
Competitive Signals Page - UCR FIRST Signal Detection
======================================================

Real-time competitive signal detection using UCR as the foundation.

UCR FIRST Flow:
1. Validate UCR before detection
2. Use only UCR-approved competitors (Section C)
3. Filter through UCR guardrails (Section G)
4. Trace all operations to UCR sections
"""

import streamlit as st
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from streamlit_app.services.session_manager import SessionManager

st.set_page_config(
    page_title="Competitive Signals | UCR FIRST",
    page_icon="🎯",
    layout="wide"
)

session = SessionManager()

# Header
st.title("🎯 Competitive Signal Detection")
st.markdown('<span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">UCR FIRST</span>', unsafe_allow_html=True)

# UCR Check
ucr = session.get_current_ucr()

if not ucr:
    st.error("""
    ⚠️ **No UCR Selected**
    
    Signal detection requires a valid User Context Record.
    Please select a UCR from the sidebar on the Home page.
    
    **UCR FIRST**: All operations start with UCR validation.
    """)
    st.stop()

# UCR Status
st.markdown("---")
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("UCR Quality", f"{ucr.get('quality_score', 0)}%")
with col2:
    st.metric("Competitors", ucr.get('competitor_count', 0))
with col3:
    st.metric("Guardrails", ucr.get('guardrail_count', 0))
with col4:
    st.metric("Current Signals", ucr.get('signal_count', 0))

st.markdown("---")

# Detection Controls
st.subheader("🔍 Signal Detection")

col1, col2, col3 = st.columns(3)

with col1:
    lookback_days = st.selectbox(
        "Lookback Period",
        options=[7, 14, 30, 60, 90],
        index=2,
        format_func=lambda x: f"{x} days"
    )

with col2:
    signal_types = st.multiselect(
        "Signal Types",
        options=["Ranking Shift", "New Keyword", "SERP Entrant", "Demand Inflection"],
        default=["Ranking Shift", "New Keyword"]
    )

with col3:
    min_severity = st.select_slider(
        "Minimum Severity",
        options=["Low", "Medium", "High", "Critical"],
        value="Medium"
    )

# UCR Sections Used
st.markdown("#### 📋 UCR Sections Used for Detection")
sections_used = ["A (Brand)", "B (Category)", "C (Competitors)", "E (Strategy)", "G (Guardrails)"]
st.markdown(" → ".join([f"`{s}`" for s in sections_used]))

# Run Detection
if st.button("🚀 Detect Signals", type="primary", use_container_width=True):
    with st.spinner("Validating UCR and detecting signals..."):
        # Simulate detection
        import time
        time.sleep(1)
        
        # Mock signals
        detected_signals = [
            {
                "type": "ranking_shift",
                "severity": "high",
                "title": "Competitor ranking surge detected",
                "competitor": "adidas.com",
                "description": "Adidas moved up 15 positions for 'running shoes'",
                "impact": "May affect visibility in athletic footwear category",
                "recommendation": "Review content strategy for running shoes keywords",
                "sections_used": ["A", "C", "G"]
            },
            {
                "type": "new_keyword",
                "severity": "medium",
                "title": "New keyword opportunity: 'sustainable sneakers'",
                "keyword": "sustainable sneakers",
                "description": "Emerging keyword with low competition",
                "impact": "Potential traffic opportunity in eco-friendly segment",
                "recommendation": "Create content targeting sustainable footwear",
                "sections_used": ["B", "D", "G"]
            },
            {
                "type": "serp_entrant",
                "severity": "medium",
                "title": "New competitor detected: allbirds.com",
                "competitor": "allbirds.com",
                "description": "Allbirds appearing in category SERPs",
                "impact": "New competitive pressure in sustainable footwear",
                "recommendation": "Add to UCR Section C for monitoring",
                "sections_used": ["B", "C", "G"]
            },
        ]
        
        session.set_signals(detected_signals)
        
        # Add run trace
        session.add_run_trace({
            "operation": "signal_detection",
            "ucr_id": ucr.get("id"),
            "ucr_name": ucr.get("name"),
            "sections_used": ["A", "B", "C", "E", "G"],
            "signals_detected": len(detected_signals),
            "filters": {
                "lookback_days": lookback_days,
                "signal_types": signal_types,
                "min_severity": min_severity
            }
        })
        
        st.success(f"✅ Detected {len(detected_signals)} signals")

# Display Signals
st.markdown("---")
st.subheader("🚨 Detected Signals")

signals = session.get_signals()

if not signals:
    st.info("No signals detected yet. Click 'Detect Signals' to analyze your competitive landscape.")
else:
    # Summary
    col1, col2, col3 = st.columns(3)
    
    critical_count = len([s for s in signals if s.get("severity") == "critical"])
    high_count = len([s for s in signals if s.get("severity") == "high"])
    
    with col1:
        st.metric("Total Signals", len(signals))
    with col2:
        st.metric("Critical", critical_count)
    with col3:
        st.metric("High Priority", high_count)
    
    st.markdown("---")
    
    # Signal Cards
    for i, signal in enumerate(signals):
        severity = signal.get("severity", "medium")
        
        # Color based on severity
        if severity == "critical":
            border_color = "#dc3545"
            bg_color = "#fff5f5"
        elif severity == "high":
            border_color = "#ffc107"
            bg_color = "#fff8e6"
        else:
            border_color = "#17a2b8"
            bg_color = "#f0f9ff"
        
        # Sections badges
        sections_html = " ".join([
            f'<span style="background: #e3f2fd; color: #1565c0; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 4px;">{s}</span>'
            for s in signal.get("sections_used", [])
        ])
        
        with st.container():
            st.markdown(f"""
            <div style="background: {bg_color}; border-left: 4px solid {border_color}; padding: 15px; margin: 10px 0; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-weight: bold; font-size: 16px;">{signal.get('title', 'Signal')}</div>
                        <div style="color: #666; font-size: 13px; margin-top: 4px;">
                            {signal.get('description', '')}
                        </div>
                        <div style="margin-top: 8px;">
                            <strong>Impact:</strong> {signal.get('impact', 'N/A')}
                        </div>
                        <div style="margin-top: 4px;">
                            <strong>Recommendation:</strong> {signal.get('recommendation', 'N/A')}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: {border_color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">
                            {severity}
                        </div>
                        <div style="margin-top: 8px;">
                            {sections_html}
                        </div>
                    </div>
                </div>
            </div>
            """, unsafe_allow_html=True)

# Run Trace
st.markdown("---")
st.subheader("📝 UCR Run Trace")

traces = session.get_run_traces()
if traces:
    latest_trace = traces[-1]
    st.json(latest_trace)
else:
    st.info("No operations traced yet.")
