"""
Validation Panel Component
==========================

Real-time validation panel for UCR configurations.
"""

import streamlit as st
from typing import Optional, Dict, Any, List
from brand_intel.core.models import Configuration
from brand_intel.services import UCRService


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

    # Overall status badge with enhanced styling
    status_info = {
        "COMPLETE": {
            "color": "#28a745",
            "icon": "✅",
            "title": "Ready for Analysis",
            "description": "All requirements met. Ready to run competitive analysis."
        },
        "NEEDS_REVIEW": {
            "color": "#ffc107",
            "icon": "⚠️",
            "title": "Review Required",
            "description": "Some issues need attention before full analysis."
        },
        "BLOCKED": {
            "color": "#dc3545",
            "icon": "❌",
            "title": "Critical Issues",
            "description": "Must fix blocking issues before proceeding."
        }
    }

    status_data = status_info.get(result.status.value, {
        "color": "#666",
        "icon": "❓",
        "title": "Unknown Status",
        "description": "Validation status unclear."
    })

    st.markdown(f"""
    <div style="background: {status_data['color']}15; border: 2px solid {status_data['color']}30;
                border-radius: 12px; padding: 20px; margin: 10px 0;">
        <div style="display: flex; align-items: center;">
            <div style="font-size: 32px; margin-right: 15px; color: {status_data['color']};">
                {status_data['icon']}
            </div>
            <div style="flex: 1;">
                <div style="font-size: 18px; font-weight: bold; color: {status_data['color']}; margin-bottom: 4px;">
                    {status_data['title']}
                </div>
                <div style="color: #555; font-size: 14px;">
                    {status_data['description']}
                </div>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Progress indicator
    if hasattr(result, 'completion_percentage'):
        progress = result.completion_percentage / 100
        st.progress(progress)
        st.caption(f"Configuration completeness: {result.completion_percentage}%")

    # Critical Issues (blocking)
    if hasattr(result, 'blocked_reasons') and result.blocked_reasons:
        st.error("**🚫 Critical Issues (Must Fix):**")
        for reason in result.blocked_reasons:
            st.error(f"• {reason}")

        st.markdown("""
        **💡 Quick Fixes:**
        - Complete missing required sections
        - Add at least one approved competitor
        - Ensure brand domain is valid
        - Review guardrails configuration
        """)

    # Review Items (warnings)
    if hasattr(result, 'warnings') and result.warnings:
        st.warning("**⚠️ Review Required:**")
        for warning in result.warnings:
            st.warning(f"• {warning}")

        with st.expander("💡 Improvement Suggestions"):
            st.markdown("""
            **Consider:**
            - Adding more competitor evidence
            - Completing optional sections for better analysis
            - Reviewing strategic intent alignment
            - Enhancing category fence definition
            """)

    # Section-by-section validation
    if hasattr(result, 'sections_valid') and result.sections_valid:
        st.markdown("### 📋 Section Validation")

        # Create a grid layout
        section_info = {
            'A': {'name': 'Brand Context', 'required': True, 'description': 'Brand identity and domain'},
            'B': {'name': 'Category Definition', 'required': True, 'description': 'Market category and boundaries'},
            'C': {'name': 'Competitive Set', 'required': True, 'description': 'Direct and indirect competitors'},
            'D': {'name': 'Demand Definition', 'required': False, 'description': 'Search demand themes'},
            'E': {'name': 'Strategic Intent', 'required': True, 'description': 'Business goals and risk tolerance'},
            'F': {'name': 'Channel Context', 'required': False, 'description': 'Marketing channel strategy'},
            'G': {'name': 'Negative Scope', 'required': True, 'description': 'Guardrails and restrictions'},
            'H': {'name': 'Governance', 'required': True, 'description': 'Quality thresholds and approval'}
        }

        # Group by completion status
        complete_sections = []
        incomplete_sections = []
        optional_sections = []

        for section_key, is_valid in result.sections_valid.items():
            section_key = str(section_key).upper()
            info = section_info.get(section_key, {'name': section_key, 'required': False, 'description': 'Unknown'})

            if info['required']:
                if is_valid:
                    complete_sections.append((section_key, info))
                else:
                    incomplete_sections.append((section_key, info))
            else:
                optional_sections.append((section_key, info, is_valid))

        # Required sections
        if complete_sections or incomplete_sections:
            st.markdown("#### Required Sections")

            col1, col2 = st.columns(2)

            with col1:
                st.markdown("**✅ Complete**")
                for section_key, info in complete_sections:
                    st.success(f"**{section_key}** - {info['name']}")
                    st.caption(info['description'])

            with col2:
                if incomplete_sections:
                    st.markdown("**❌ Incomplete**")
                    for section_key, info in incomplete_sections:
                        st.error(f"**{section_key}** - {info['name']}")
                        st.caption(info['description'])
                else:
                    st.success("All required sections complete!")

        # Optional sections
        if optional_sections:
            st.markdown("#### Optional Sections")

            cols = st.columns(3)
            for i, (section_key, info, is_complete) in enumerate(optional_sections):
                with cols[i % 3]:
                    icon = "✅" if is_complete else "⏳"
                    color = "green" if is_complete else "gray"
                    st.markdown(f"""
                    <div style="background: {color}20; color: {color};
                                padding: 8px; border-radius: 6px; margin: 2px; text-align: center;">
                        <div>{icon}</div>
                        <div style="font-weight: bold;">{section_key}</div>
                        <div style="font-size: 10px;">{info['name']}</div>
                    </div>
                    """, unsafe_allow_html=True)

    # Validation summary
    _render_validation_summary(result)


def _render_validation_summary(result):
    """Render validation summary with metrics."""
    st.markdown("---")
    st.markdown("### 📊 Validation Summary")

    # Calculate metrics
    total_sections = len(getattr(result, 'sections_valid', {}))
    valid_sections = sum(1 for v in getattr(result, 'sections_valid', {}).values() if v)
    blocking_issues = len(getattr(result, 'blocked_reasons', []))
    warnings = len(getattr(result, 'warnings', []))

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        completeness = int((valid_sections / max(total_sections, 1)) * 100)
        st.metric("Completeness", f"{completeness}%", f"{valid_sections}/{total_sections}")

    with col2:
        if blocking_issues == 0:
            st.metric("Blocking Issues", "0", "✅")
        else:
            st.metric("Blocking Issues", blocking_issues, "❌")

    with col3:
        if warnings == 0:
            st.metric("Warnings", "0", "✅")
        else:
            st.metric("Warnings", warnings, "⚠️")

    with col4:
        status_score = {
            "COMPLETE": 100,
            "NEEDS_REVIEW": 75,
            "BLOCKED": 25
        }.get(result.status.value, 0)
        st.metric("Status Score", f"{status_score}%")

    # Overall assessment
    if result.status.value == "COMPLETE":
        st.success("🎉 **Configuration is production-ready!**")
    elif result.status.value == "NEEDS_REVIEW":
        st.info("📋 **Configuration is usable but could be improved.**")
    else:
        st.error("🚫 **Configuration has critical issues that must be resolved.**")


def render_validation_status_badge(result) -> str:
    """
    Render a compact validation status badge.

    Returns:
        HTML string for the badge
    """
    status_info = {
        "COMPLETE": {"color": "#28a745", "icon": "✅", "text": "Ready"},
        "NEEDS_REVIEW": {"color": "#ffc107", "icon": "⚠️", "text": "Review"},
        "BLOCKED": {"color": "#dc3545", "icon": "❌", "text": "Blocked"}
    }

    status_data = status_info.get(result.status.value, {
        "color": "#666", "icon": "❓", "text": "Unknown"
    })

    return f"""
    <span style="background: {status_data['color']}20; color: {status_data['color']};
                 padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
        {status_data['icon']} {status_data['text']}
    </span>
    """


def render_quick_validation_check(config: Configuration) -> Dict[str, Any]:
    """
    Perform a quick validation check and return results.

    Args:
        config: Configuration to check

    Returns:
        Dictionary with validation results
    """
    service = UCRService()
    result = service.validate(config)

    return {
        "status": result.status.value,
        "is_valid": result.status.value == "COMPLETE",
        "blocking_issues": len(getattr(result, 'blocked_reasons', [])),
        "warnings": len(getattr(result, 'warnings', [])),
        "sections_complete": sum(1 for v in getattr(result, 'sections_valid', {}).values() if v),
        "total_sections": len(getattr(result, 'sections_valid', {})),
        "badge_html": render_validation_status_badge(result)
    }
