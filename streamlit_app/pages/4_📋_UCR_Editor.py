"""
📋 UCR Editor - Editor completo del User Context Record
==========================================================

Página principal para editar todas las secciones del UCR (A-H).
Incluye validación en tiempo real, Quality Score y navegación entre secciones.
"""

import streamlit as st
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime

from brand_intel.core.models import Configuration
from brand_intel.services import UCRService
from streamlit_app.services.session_manager import SessionManager
from streamlit_app.config.settings import Settings


def render_ucr_editor():
    """Render the main UCR Editor page."""
    st.title("📋 UCR Editor")
    st.markdown("Complete User Context Record with real-time validation")

    # Initialize services
    settings = Settings()
    session = SessionManager()
    ucr_service = UCRService()

    # Get current UCR
    config = session.get_current_ucr()
    if not config:
        st.error("No UCR selected. Please select a UCR from the sidebar.")
        return

    # Quality Score Header
    render_quality_score_header(config, ucr_service)

    # Main editor tabs
    section_tabs = st.tabs([
        "🏢 A: Brand Context",
        "🎯 B: Category Definition",
        "🏆 C: Competitive Set",
        "📊 D: Demand Definition",
        "🎯 E: Strategic Intent",
        "📺 F: Channel Context",
        "🛡️ G: Negative Scope",
        "⚖️ H: Governance"
    ])

    # Track changes for save button
    changes_made = False

    # Section A: Brand Context
    with section_tabs[0]:
        new_config_a, changed_a = render_section_a(config)
        if changed_a:
            config = new_config_a
            changes_made = True

    # Section B: Category Definition
    with section_tabs[1]:
        new_config_b, changed_b = render_section_b(config)
        if changed_b:
            config = new_config_b
            changes_made = True

    # Section C: Competitive Set
    with section_tabs[2]:
        new_config_c, changed_c = render_section_c(config)
        if changed_c:
            config = new_config_c
            changes_made = True

    # Section D: Demand Definition
    with section_tabs[3]:
        new_config_d, changed_d = render_section_d(config)
        if changed_d:
            config = new_config_d
            changes_made = True

    # Section E: Strategic Intent
    with section_tabs[4]:
        new_config_e, changed_e = render_section_e(config)
        if changed_e:
            config = new_config_e
            changes_made = True

    # Section F: Channel Context
    with section_tabs[5]:
        new_config_f, changed_f = render_section_f(config)
        if changed_f:
            config = new_config_f
            changes_made = True

    # Section G: Negative Scope
    with section_tabs[6]:
        new_config_g, changed_g = render_section_g(config)
        if changed_g:
            config = new_config_g
            changes_made = True

    # Section H: Governance
    with section_tabs[7]:
        new_config_h, changed_h = render_section_h(config)
        if changed_h:
            config = new_config_h
            changes_made = True

    # Save button
    render_save_section(config, changes_made, session, ucr_service)


def render_quality_score_header(config: Configuration, ucr_service: UCRService):
    """Render the quality score header with mini gauge."""
    col1, col2, col3 = st.columns([2, 1, 1])

    with col1:
        st.markdown(f"**UCR:** {config.name}")
        st.caption(f"Last modified: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    with col2:
        # Calculate quality score
        score = ucr_service.calculate_quality_score(config)
        st.metric("Quality Score", f"{score.overall}/100", score.grade.upper())

    with col3:
        # Validation status
        validation = ucr_service.validate(config)
        status_color = {
            "COMPLETE": "green",
            "NEEDS_REVIEW": "orange",
            "BLOCKED": "red"
        }.get(validation.status.value, "gray")

        st.markdown(f"""
        <div style="background: {status_color}20; color: {status_color};
                    padding: 8px; border-radius: 4px; text-align: center;">
            <strong>{validation.status.value}</strong>
        </div>
        """, unsafe_allow_html=True)


def render_section_a(config: Configuration) -> tuple[Configuration, bool]:
    """Render Section A: Brand Context."""
    st.header("🏢 Section A: Brand Context")
    st.markdown("*Defines the core brand entity and basic attributes*")

    # Import here to avoid circular imports
    from streamlit_app.pages.sections.section_a_brand import render_section_a_content

    return render_section_a_content(config)


def render_section_b(config: Configuration) -> tuple[Configuration, bool]:
    """Render Section B: Category Definition."""
    st.header("🎯 Section B: Category Definition")
    st.markdown("*Defines the category fence and valid query scope*")

    # Import here to avoid circular imports
    from streamlit_app.pages.sections.section_b_category import render_section_b_content

    return render_section_b_content(config)


def render_section_c(config: Configuration) -> tuple[Configuration, bool]:
    """Render Section C: Competitive Set."""
    st.header("🏆 Section C: Competitive Set")
    st.markdown("*Defines direct and indirect competitors for analysis*")

    # Import here to avoid circular imports
    from streamlit_app.pages.sections.section_c_competitors import render_section_c_content

    return render_section_c_content(config)


def render_section_d(config: Configuration) -> tuple[Configuration, bool]:
    """Render Section D: Demand Definition."""
    st.header("📊 Section D: Demand Definition")
    st.markdown("*Groups search queries into demand themes*")

    # Import here to avoid circular imports
    from streamlit_app.pages.sections.section_d_demand import render_section_d_content

    return render_section_d_content(config)


def render_section_e(config: Configuration) -> tuple[Configuration, bool]:
    """Render Section E: Strategic Intent."""
    st.header("🎯 Section E: Strategic Intent")
    st.markdown("*Sets strategic posture and risk tolerance*")

    # Import here to avoid circular imports
    from streamlit_app.pages.sections.section_e_strategy import render_section_e_content

    return render_section_e_content(config)


def render_section_f(config: Configuration) -> tuple[Configuration, bool]:
    """Render Section F: Channel Context."""
    st.header("📺 Section F: Channel Context")
    st.markdown("*Weights channel priorities and investment levels*")

    # Import here to avoid circular imports
    from streamlit_app.pages.sections.section_f_channels import render_section_f_content

    return render_section_f_content(config)


def render_section_g(config: Configuration) -> tuple[Configuration, bool]:
    """Render Section G: Negative Scope."""
    st.header("🛡️ Section G: Negative Scope (Guardrails)")
    st.markdown("*Hard exclusions that block analysis*")

    # Import here to avoid circular imports
    from streamlit_app.pages.sections.section_g_guardrails import render_section_g_content

    return render_section_g_content(config)


def render_section_h(config: Configuration) -> tuple[Configuration, bool]:
    """Render Section H: Governance."""
    st.header("⚖️ Section H: Governance")
    st.markdown("*Quality thresholds and capability model*")

    # Import here to avoid circular imports
    from streamlit_app.pages.sections.section_h_governance import render_section_h_content

    return render_section_h_content(config)


def render_save_section(
    config: Configuration,
    changes_made: bool,
    session: SessionManager,
    ucr_service: UCRService
):
    """Render the save section at the bottom."""
    st.divider()

    col1, col2, col3 = st.columns([1, 2, 1])

    with col1:
        if changes_made:
            if st.button("💾 Save Changes", type="primary", use_container_width=True):
                with st.spinner("Saving UCR..."):
                    # Validate before saving
                    validation = ucr_service.validate(config)
                    if validation.status == "BLOCKED":
                        st.error("Cannot save: UCR has blocking validation errors")
                        return

                    # Save to session (in real implementation, save to backend)
                    session.set_current_ucr(config)
                    st.success("✅ UCR saved successfully!")

                    # Rerun to refresh the page
                    st.rerun()
        else:
            st.info("No changes to save")

    with col2:
        # Export options
        col2a, col2b = st.columns(2)
        with col2a:
            if st.button("📄 Export JSON", use_container_width=True):
                st.download_button(
                    label="Download",
                    data=config.json(indent=2),
                    file_name=f"ucr_{config.name.lower().replace(' ', '_')}.json",
                    mime="application/json"
                )

        with col2b:
            if st.button("🔄 Reset Changes", use_container_width=True):
                st.rerun()

    with col3:
        # Quality score summary
        score = ucr_service.calculate_quality_score(config)
        st.metric("Final Score", f"{score.overall}/100", score.grade.upper())


# Main execution
if __name__ == "__main__":
    render_ucr_editor()
