"""
Section H: Governance
=====================

Implementación de la Sección H del UCR: Governance.
Umbrales de calidad y modelo de capacidad.
"""

import streamlit as st
from datetime import datetime, timedelta
from typing import Tuple, Optional
from brand_intel.core.models import Configuration, Governance


def render_section_h_content(config: Configuration) -> Tuple[Configuration, bool]:
    """
    Render Section H: Governance.

    Returns:
        Tuple of (updated_config, changes_made)
    """
    changes_made = False

    # Current governance data
    governance = config.governance

    st.markdown("""
    **⚖️ Governance defines quality thresholds and capability models.**

    These settings control:
    - Minimum quality scores required for analysis
    - Data freshness requirements
    - Human validation requirements
    - Context validity periods
    """)

    # Human Validation
    st.subheader("👤 Human Validation")
    st.markdown("**Requirements for human oversight and approval.**")

    human_verified = st.checkbox(
        "Human Verified",
        value=getattr(governance, 'human_verified', False),
        help="Has this UCR been reviewed and approved by a human",
        key="human_verified"
    )

    if human_verified != getattr(governance, 'human_verified', False):
        changes_made = True

    # Validation Status
    status_options = ["needs_review", "in_progress", "approved", "rejected"]
    status_display = ["Needs Review", "In Progress", "Approved", "Rejected"]

    current_status = getattr(governance, 'validation_status', 'needs_review')
    status_index = status_options.index(current_status) if current_status in status_options else 0

    validation_status = st.selectbox(
        "Validation Status",
        options=status_display,
        index=status_index,
        help="Current validation status of this UCR",
        key="validation_status"
    )
    validation_status_value = status_options[status_display.index(validation_status)]

    if validation_status_value != getattr(governance, 'validation_status', 'needs_review'):
        changes_made = True

    # Context Validity
    st.subheader("⏰ Context Validity")
    st.markdown("**How long this UCR remains valid before requiring review.**")

    validity_options = [
        ("1_week", "1 Week"),
        ("1_month", "1 Month"),
        ("3_months", "3 Months"),
        ("6_months", "6 Months"),
        ("1_year", "1 Year"),
        ("indefinite", "Indefinite")
    ]

    current_valid_until = getattr(governance, 'context_valid_until', None)
    if current_valid_until:
        # Calculate which option matches
        now = datetime.now()
        if current_valid_until > now + timedelta(days=365):
            default_index = 5  # indefinite
        elif current_valid_until > now + timedelta(days=180):
            default_index = 4  # 1 year
        elif current_valid_until > now + timedelta(days=90):
            default_index = 3  # 6 months
        elif current_valid_until > now + timedelta(days=30):
            default_index = 2  # 3 months
        elif current_valid_until > now + timedelta(days=7):
            default_index = 1  # 1 month
        else:
            default_index = 0  # 1 week
    else:
        default_index = 2  # 3 months default

    validity_selection = st.selectbox(
        "Context Valid Until",
        options=[opt[1] for opt in validity_options],
        index=default_index,
        help="How long this UCR configuration remains valid",
        key="context_valid_until"
    )

    # Calculate actual date
    validity_value = validity_options[[opt[1] for opt in validity_options].index(validity_selection)][0]
    if validity_value == "indefinite":
        context_valid_until = None
    else:
        days_map = {
            "1_week": 7,
            "1_month": 30,
            "3_months": 90,
            "6_months": 180,
            "1_year": 365
        }
        context_valid_until = datetime.now() + timedelta(days=days_map[validity_value])

    if context_valid_until != getattr(governance, 'context_valid_until', None):
        changes_made = True

    # Quality Thresholds
    st.subheader("📊 Quality Thresholds")
    st.markdown("**Minimum quality scores required for different operations.**")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### Signal Detection")
        signal_threshold = st.slider(
            "Signal Detection Threshold",
            min_value=0,
            max_value=100,
            value=getattr(governance, 'signal_detection_threshold', 60),
            help="Minimum quality score required for signal detection",
            key="signal_threshold"
        )

        st.markdown("#### Keyword Gap Analysis")
        keyword_threshold = st.slider(
            "Keyword Gap Threshold",
            min_value=0,
            max_value=100,
            value=getattr(governance, 'keyword_gap_threshold', 70),
            help="Minimum quality score required for keyword gap analysis",
            key="keyword_threshold"
        )

    with col2:
        st.markdown("#### Market Analysis")
        market_threshold = st.slider(
            "Market Analysis Threshold",
            min_value=0,
            max_value=100,
            value=getattr(governance, 'market_analysis_threshold', 65),
            help="Minimum quality score required for market analysis",
            key="market_threshold"
        )

        st.markdown("#### Content Generation")
        content_threshold = st.slider(
            "Content Generation Threshold",
            min_value=0,
            max_value=100,
            value=getattr(governance, 'content_generation_threshold', 75),
            help="Minimum quality score required for content generation",
            key="content_threshold"
        )

    # Check if thresholds changed
    current_thresholds = {
        'signal_detection_threshold': getattr(governance, 'signal_detection_threshold', 60),
        'keyword_gap_threshold': getattr(governance, 'keyword_gap_threshold', 70),
        'market_analysis_threshold': getattr(governance, 'market_analysis_threshold', 65),
        'content_generation_threshold': getattr(governance, 'content_generation_threshold', 75)
    }

    new_thresholds = {
        'signal_detection_threshold': signal_threshold,
        'keyword_gap_threshold': keyword_threshold,
        'market_analysis_threshold': market_threshold,
        'content_generation_threshold': content_threshold
    }

    if current_thresholds != new_thresholds:
        changes_made = True

    # Context Hash & Version
    st.subheader("🔐 Context Integrity")
    st.markdown("**Versioning and integrity tracking.**")

    col1, col2 = st.columns(2)

    with col1:
        context_version = st.number_input(
            "Context Version",
            min_value=1,
            value=getattr(governance, 'context_version', 1),
            help="Version number of this UCR configuration",
            key="context_version"
        )

        if context_version != getattr(governance, 'context_version', 1):
            changes_made = True

    with col2:
        context_hash = getattr(governance, 'context_hash', '')
        if context_hash:
            st.text_input(
                "Context Hash",
                value=context_hash,
                disabled=True,
                help="SHA256 hash of the UCR configuration for integrity checking"
            )
        else:
            st.info("Context hash will be generated on save")

    # Context Status
    context_status_options = ["DRAFT", "REVIEW", "APPROVED", "LOCKED"]
    current_context_status = getattr(governance, 'context_status', 'DRAFT')

    context_status_index = context_status_options.index(current_context_status) if current_context_status in context_status_options else 0

    context_status = st.selectbox(
        "Context Status",
        options=context_status_options,
        index=context_status_index,
        help="Overall status of this UCR context",
        key="context_status"
    )

    if context_status != getattr(governance, 'context_status', 'DRAFT'):
        changes_made = True

    # Governance Summary
    render_governance_summary(
        human_verified, validation_status, context_valid_until,
        new_thresholds, context_version, context_status
    )

    # AI Enhancement
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("### 🤖 AI Enhancement")
        st.markdown("Get AI recommendations for quality thresholds based on your industry.")

    with col2:
        if st.button("⚖️ Optimize Thresholds", use_container_width=True):
            with st.spinner("Analyzing optimal thresholds..."):
                # TODO: Integrate with AI service
                st.info("AI threshold optimization coming in Gap 3. For now, configure manually.")

    # Validation
    if st.checkbox("Show validation", value=False):
        render_validation_feedback(human_verified, validation_status, context_status)

    # Update config if changes were made
    if changes_made:
        updated_governance = Governance(
            human_verified=human_verified,
            context_hash=context_hash,  # Will be updated on save
            context_version=context_version,
            validation_status=validation_status_value,
            context_valid_until=context_valid_until,
            context_status=context_status,
            # Add threshold fields
            signal_detection_threshold=signal_threshold,
            keyword_gap_threshold=keyword_threshold,
            market_analysis_threshold=market_threshold,
            content_generation_threshold=content_threshold
        )

        updated_config = config.copy()
        updated_config.governance = updated_governance
        return updated_config, True

    return config, False


def render_governance_summary(
    human_verified: bool,
    validation_status: str,
    valid_until: Optional[datetime],
    thresholds: dict,
    version: int,
    status: str
):
    """Render governance summary."""
    st.subheader("📊 Governance Summary")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("#### Status")
        status_icon = "✅" if human_verified else "⏳"
        st.write(f"{status_icon} Human Verified: {human_verified}")
        st.write(f"📋 Validation: {validation_status}")
        st.write(f"🔒 Context: {status}")

    with col2:
        st.markdown("#### Validity")
        if valid_until:
            days_left = (valid_until - datetime.now()).days
            if days_left > 0:
                st.write(f"⏰ Expires: {valid_until.strftime('%Y-%m-%d')}")
                st.write(f"📅 Days left: {days_left}")
            else:
                st.error("❌ Context expired!")
        else:
            st.write("♾️ No expiration")

        st.write(f"📝 Version: {version}")

    with col3:
        st.markdown("#### Quality Thresholds")
        avg_threshold = sum(thresholds.values()) / len(thresholds)
        st.metric("Average Threshold", f"{avg_threshold:.0f}%")

        # Show highest and lowest
        sorted_thresholds = sorted(thresholds.items(), key=lambda x: x[1])
        st.caption(f"Lowest: {sorted_thresholds[0][0].replace('_', ' ').title()} ({sorted_thresholds[0][1]}%)")
        st.caption(f"Highest: {sorted_thresholds[-1][0].replace('_', ' ').title()} ({sorted_thresholds[-1][1]}%)")


def render_validation_feedback(human_verified: bool, validation_status: str, context_status: str):
    """Render validation feedback for governance."""
    st.markdown("### ✅ Validation")

    errors = []
    warnings = []

    if not human_verified and context_status in ["APPROVED", "LOCKED"]:
        errors.append("Cannot approve or lock context without human verification")

    if validation_status == "approved" and not human_verified:
        errors.append("Cannot mark as approved without human verification")

    if context_status == "LOCKED" and validation_status != "approved":
        errors.append("Can only lock approved contexts")

    # Check for reasonable thresholds
    # This would check against the thresholds set above
    # For now, just basic checks

    if errors:
        for error in errors:
            st.error(f"❌ {error}")
    if warnings:
        for warning in warnings:
            st.warning(f"⚠️ {warning}")

    if not errors and not warnings:
        st.success("✅ Governance settings look good!")
