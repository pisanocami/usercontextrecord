"""
Brand Intelligence Platform - Streamlit Microservice
=====================================================

UCR FIRST Architecture - Every operation starts with UCR validation.

This is the main entry point for the Streamlit microservice.
All pages and components follow UCR FIRST principles:
1. Load UCR first
2. Validate UCR before any operation
3. Filter all outputs through UCR guardrails
4. Trace all operations to UCR sections

Fortune 500 Grade Competitive Intelligence Dashboard
"""

import streamlit as st
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from streamlit_app.services.data_service import get_data_service
from streamlit_app.services.session_manager import SessionManager
from streamlit_app.config.settings import Settings

# Page configuration
st.set_page_config(
    page_title="Brand Intelligence Platform | UCR FIRST",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'Get Help': 'https://docs.brandintel.io',
        'Report a bug': 'https://github.com/brandintel/issues',
        'About': '''
        # Brand Intelligence Platform
        
        **UCR FIRST Architecture**
        
        Fortune 500 Grade Competitive Intelligence powered by 
        User Context Record (UCR) as the single source of truth.
        '''
    }
)

# Initialize settings and session
settings = Settings()
session = SessionManager()

# Custom CSS
st.markdown("""
<style>
    /* UCR FIRST Branding */
    .ucr-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    
    /* Quality Score Gauge */
    .quality-gauge {
        text-align: center;
        padding: 20px;
        border-radius: 10px;
        background: #f8f9fa;
    }
    
    .quality-high { border-left: 4px solid #28a745; }
    .quality-medium { border-left: 4px solid #ffc107; }
    .quality-low { border-left: 4px solid #dc3545; }
    
    /* Signal Cards */
    .signal-critical { background: #fff5f5; border-left: 4px solid #dc3545; }
    .signal-high { background: #fff8e6; border-left: 4px solid #ffc107; }
    .signal-medium { background: #f0f9ff; border-left: 4px solid #17a2b8; }
    
    /* UCR Section Badges */
    .section-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        margin-right: 4px;
    }
    .section-a { background: #e3f2fd; color: #1565c0; }
    .section-b { background: #f3e5f5; color: #7b1fa2; }
    .section-c { background: #e8f5e9; color: #2e7d32; }
    .section-g { background: #ffebee; color: #c62828; }
</style>
""", unsafe_allow_html=True)


def render_ucr_status(ucr_loaded: bool, quality_score: int = 0):
    """Render UCR status indicator in sidebar."""
    if ucr_loaded:
        if quality_score >= 75:
            status_color = "🟢"
            quality_class = "high"
        elif quality_score >= 50:
            status_color = "🟡"
            quality_class = "medium"
        else:
            status_color = "🔴"
            quality_class = "low"
        
        st.sidebar.markdown("---")
        from streamlit_app.components.quality_score_card import render_quality_score_mini
        render_quality_score_mini(session.get_current_ucr())
        
        st.sidebar.markdown(f"""
        <div class="quality-gauge quality-{quality_class}">
            <div style="font-size: 24px;">{status_color}</div>
            <div style="font-size: 32px; font-weight: bold;">{quality_score}%</div>
            <div style="font-size: 12px; color: #666;">UCR Quality Score</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.sidebar.warning("⚠️ No UCR loaded")


async def render_sidebar():
    """Render sidebar with UCR selection and status."""
    with st.sidebar:
        st.markdown('<span class="ucr-badge">UCR FIRST</span>', unsafe_allow_html=True)
        st.title("🎯 Brand Intelligence")

        st.markdown("---")

        # UCR Selection
        st.subheader("📋 User Context Record")

        # Get available UCRs (from backend)
        available_ucrs = await session.get_available_ucrs()

        if available_ucrs:
            selected_ucr = st.selectbox(
                "Select UCR",
                options=[u["name"] for u in available_ucrs],
                index=0
            )

            # Load selected UCR
            ucr = await session.load_ucr(selected_ucr)
            if ucr:
                render_ucr_status(True, ucr.get("quality_score", 0))

                # UCR Sections Status
                st.markdown("### 📊 UCR Sections")
                sections = [
                    ("A", "Brand Identity", ucr.get("section_a_valid", True)),
                    ("B", "Category", ucr.get("section_b_valid", True)),
                    ("C", "Competitors", ucr.get("section_c_valid", True)),
                    ("G", "Guardrails", ucr.get("section_g_valid", True)),
                ]

                for code, name, valid in sections:
                    icon = "✅" if valid else "⚠️"
                    st.markdown(f"{icon} **{code}**: {name}")
        else:
            render_ucr_status(False)
            st.info("No UCRs available. Create one in the main app.")

        st.markdown("---")

        # Navigation info
        st.markdown("### 📍 Navigation")
        st.markdown("""
        - **Home**: Dashboard overview
        - **Signals**: Competitive signals
        - **Analysis**: Market analysis
        - **Guardrails**: Monitor Section G
        """)


def render_home():
    """Render home dashboard."""
    st.title("🎯 Brand Intelligence Dashboard")
    st.markdown("### UCR FIRST Competitive Intelligence Platform")
    
    # UCR Status Banner
    ucr = session.get_current_ucr()
    
    if not ucr:
        st.warning("""
        ⚠️ **No UCR Selected**
        
        Select a User Context Record from the sidebar to begin.
        All operations require a valid UCR.
        """)
        return
    
    # UCR Info
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label="UCR Quality",
            value=f"{ucr.get('quality_score', 0)}%",
            delta=None
        )
    
    with col2:
        st.metric(
            label="Competitors",
            value=str(ucr.get('competitor_count', 0)),
            delta=None
        )
    
    with col3:
        st.metric(
            label="Guardrails",
            value=str(ucr.get('guardrail_count', 0)),
            delta=None
        )
    
    with col4:
        st.metric(
            label="Signals",
            value=str(ucr.get('signal_count', 0)),
            delta="+3 new"
        )
    
    st.markdown("---")
    
    # UCR Sections Overview
    st.subheader("📋 UCR Sections Status")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        #### Core Sections
        
        | Section | Name | Status |
        |---------|------|--------|
        | **A** | Brand Identity | ✅ Complete |
        | **B** | Category Definition | ✅ Complete |
        | **C** | Competitive Set | ⚠️ 3 pending review |
        | **D** | Demand Definition | ✅ Complete |
        """)
    
    with col2:
        st.markdown("""
        #### Governance Sections
        
        | Section | Name | Status |
        |---------|------|--------|
        | **E** | Strategic Intent | ✅ Complete |
        | **F** | Channel Context | ✅ Complete |
        | **G** | Negative Scope | ⚠️ Review recommended |
        | **H** | Governance | 🔒 Human verified |
        """)
    
    st.markdown("---")
    
    # Recent Signals
    st.subheader("🚨 Recent Competitive Signals")
    
    signals = [
        {
            "type": "ranking_shift",
            "severity": "high",
            "title": "Competitor ranking increase detected",
            "competitor": "competitor.com",
            "sections": ["A", "C", "G"]
        },
        {
            "type": "new_keyword",
            "severity": "medium",
            "title": "New keyword opportunity identified",
            "keyword": "brand intelligence software",
            "sections": ["B", "D", "G"]
        },
    ]
    
    for signal in signals:
        severity_class = f"signal-{signal['severity']}"
        sections_html = " ".join([
            f'<span class="section-badge section-{s.lower()}">{s}</span>'
            for s in signal["sections"]
        ])
        
        st.markdown(f"""
        <div style="padding: 15px; margin: 10px 0; border-radius: 8px;" class="{severity_class}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>{signal['title']}</strong>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                        {signal.get('competitor', signal.get('keyword', ''))}
                    </div>
                </div>
                <div>
                    {sections_html}
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Quick Actions
    st.subheader("⚡ Quick Actions")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🔍 Detect Signals", use_container_width=True):
            st.info("Navigate to Signals page to run detection")
    
    with col2:
        if st.button("📊 Run Analysis", use_container_width=True):
            st.info("Navigate to Analysis page to run market analysis")
    
    with col3:
        if st.button("🛡️ Check Guardrails", use_container_width=True):
            st.info("Navigate to Guardrails page to review Section G")


async def main():
    """Main application entry point."""
    # Initialize data service
    data_service = get_data_service(settings)
    session_manager = SessionManager(data_service)

    # Override global session with async-enabled version
    global session
    session = session_manager

    # Page routing
    page = st.sidebar.selectbox(
        "Navigate",
        ["Home", "Signals", "Analysis", "Guardrails", "Module Center", "Quality Score"],
        key="main_navigation"
    )

    # Render sidebar
    await render_sidebar()

    # Page routing
    if page == "Home":
        render_home()
    elif page == "Signals":
        # Import and render signals page
        try:
            from pages.page_1_signals import render_signals_page
            render_signals_page()
        except ImportError:
            st.error("Signals page not available")
    elif page == "Analysis":
        st.info("Analysis page coming soon")
    elif page == "Guardrails":
        st.info("Guardrails page coming soon")
    elif page == "Module Center":
        try:
            from pages.page_6_module_center import render_module_center
            render_module_center()
        except ImportError:
            st.error("Module Center page not available")
    elif page == "Quality Score":
        try:
            from pages.page_8_quality_score import render_quality_score_page
            render_quality_score_page()
        except ImportError:
            st.error("Quality Score page not available")


if __name__ == "__main__":
    # Run async main
    import asyncio
    asyncio.run(main())
