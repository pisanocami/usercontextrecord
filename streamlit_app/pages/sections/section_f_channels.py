"""
Section F: Channel Context
==========================

Implementación de la Sección F del UCR: Channel Context.
Pesa prioridades de canales y niveles de inversión.
"""

import streamlit as st
from typing import Tuple, List, Dict, Any
from brand_intel.core.models import Configuration


def render_section_f_content(config: Configuration) -> Tuple[Configuration, bool]:
    """
    Render Section F: Channel Context.

    Returns:
        Tuple of (updated_config, changes_made)
    """
    changes_made = False

    # Current channel context data
    channel_context = config.channel_context or {}

    st.markdown("""
    This section defines your channel strategy and investment priorities.
    Different channels have different costs, reach, and conversion characteristics.
    """)

    # Active Channels
    st.subheader("📺 Active Channels")
    st.markdown("Channels where you currently have presence or plan to invest.")

    channel_options = [
        "organic_search",
        "paid_search",
        "social_media",
        "email_marketing",
        "content_marketing",
        "affiliate_marketing",
        "retail_partners",
        "wholesale_distribution",
        "direct_to_consumer",
        "marketplaces",
        "influencer_marketing",
        "display_advertising"
    ]

    channel_display = [opt.replace("_", " ").title() for opt in channel_options]
    active_channels = st.multiselect(
        "Active Channels",
        options=channel_display,
        default=[opt.replace("_", " ").title() for opt in channel_context.get("active_channels", []) if opt in channel_options],
        help="Select channels where you have active presence",
        key="active_channels"
    )
    active_channels_values = [channel_options[channel_display.index(c)] for c in active_channels]

    if set(active_channels_values) != set(channel_context.get("active_channels", [])):
        changes_made = True

    # Channel Investment Levels
    if active_channels:
        st.subheader("💰 Channel Investment Levels")
        st.markdown("Rate your current investment level in each active channel.")

        investment_levels = {}
        current_levels = channel_context.get("investment_levels", {})

        for channel in active_channels_values:
            channel_display_name = channel.replace("_", " ").title()

            level_options = ["None", "Minimal", "Moderate", "Significant", "Primary Focus"]
            current_level = current_levels.get(channel, "Moderate")
            level_index = level_options.index(current_level) if current_level in level_options else 2

            level = st.selectbox(
                f"{channel_display_name} Investment",
                options=level_options,
                index=level_index,
                key=f"investment_{channel}",
                help=f"Current investment level in {channel_display_name}"
            )
            investment_levels[channel] = level

        # Check if investment levels changed
        if investment_levels != current_levels:
            changes_made = True

        # Channel Performance Ratings
        st.subheader("📊 Channel Performance")
        st.markdown("Rate performance and potential for each channel.")

        performance_data = {}
        current_performance = channel_context.get("performance_ratings", {})

        cols = st.columns(2)
        for i, channel in enumerate(active_channels_values):
            with cols[i % 2]:
                channel_display_name = channel.replace("_", " ").title()

                st.markdown(f"**{channel_display_name}**")

                # Current performance
                perf_options = ["Poor", "Below Average", "Average", "Good", "Excellent"]
                current_perf = current_performance.get(channel, {}).get("performance", "Average")
                perf_index = perf_options.index(current_perf) if current_perf in perf_options else 2

                performance = st.selectbox(
                    "Performance",
                    options=perf_options,
                    index=perf_index,
                    key=f"perf_{channel}"
                )

                # Growth potential
                potential_options = ["Low", "Medium", "High", "Very High"]
                current_potential = current_performance.get(channel, {}).get("potential", "Medium")
                potential_index = potential_options.index(current_potential) if current_potential in potential_options else 1

                potential = st.selectbox(
                    "Growth Potential",
                    options=potential_options,
                    index=potential_index,
                    key=f"potential_{channel}"
                )

                performance_data[channel] = {
                    "performance": performance,
                    "potential": potential
                }

        # Check if performance data changed
        if performance_data != current_performance:
            changes_made = True

        # Channel Strategy Summary
        render_channel_summary(active_channels_values, investment_levels, performance_data)

    # Channel Priorities
    st.subheader("🎯 Channel Priorities")
    st.markdown("Rank your channels by strategic priority.")

    if active_channels:
        # Simple ranking interface
        priorities = st.multiselect(
            "Priority Order (select in order)",
            options=[c.replace("_", " ").title() for c in active_channels_values],
            default=[c.replace("_", " ").title() for c in channel_context.get("priority_order", [])],
            help="Order channels by strategic priority (first = highest priority)",
            key="channel_priorities"
        )

        current_priorities = [channel_options[channel_display.index(p)] for p in priorities]
        if set(current_priorities) != set(channel_context.get("priority_order", [])):
            changes_made = True
    else:
        priorities = []
        current_priorities = []

    # Future Channel Plans
    st.subheader("🚀 Future Channel Plans")
    st.markdown("Channels you're considering for future investment.")

    future_channels = st.multiselect(
        "Future Channels",
        options=channel_display,
        default=[opt.replace("_", " ").title() for opt in channel_context.get("future_channels", []) if opt in channel_options],
        help="Channels you're planning to explore",
        key="future_channels"
    )
    future_channels_values = [channel_options[channel_display.index(c)] for c in future_channels]

    if set(future_channels_values) != set(channel_context.get("future_channels", [])):
        changes_made = True

    # AI Enhancement
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("### 🤖 AI Enhancement")
        st.markdown("Get AI recommendations for channel strategy based on your industry and competitors.")

    with col2:
        if st.button("📊 Channel Strategy", use_container_width=True):
            with st.spinner("Analyzing channel opportunities..."):
                # TODO: Integrate with AI service
                st.info("AI channel analysis coming in Gap 3. For now, configure manually.")

    # Validation
    if st.checkbox("Show validation", value=False):
        render_validation_feedback(active_channels_values, investment_levels, current_priorities)

    # Update config if changes were made
    if changes_made:
        updated_channel_context = {
            "active_channels": active_channels_values,
            "investment_levels": investment_levels,
            "performance_ratings": performance_data if 'performance_data' in locals() else {},
            "priority_order": current_priorities,
            "future_channels": future_channels_values
        }

        updated_config = config.copy()
        updated_config.channel_context = updated_channel_context
        return updated_config, True

    return config, False


def render_channel_summary(channels: List[str], investments: Dict[str, str], performance: Dict[str, Dict[str, str]]):
    """Render channel strategy summary."""
    st.subheader("📊 Channel Strategy Summary")

    # Investment distribution
    investment_counts = {}
    for level in ["None", "Minimal", "Moderate", "Significant", "Primary Focus"]:
        count = sum(1 for inv in investments.values() if inv == level)
        if count > 0:
            investment_counts[level] = count

    if investment_counts:
        st.markdown("### Investment Distribution")
        investment_chart = {level: investment_counts.get(level, 0) for level in ["None", "Minimal", "Moderate", "Significant", "Primary Focus"]}
        st.bar_chart(investment_chart)

    # Performance overview
    if performance:
        st.markdown("### Performance Overview")

        high_performers = [ch for ch, data in performance.items() if data.get("performance") in ["Good", "Excellent"]]
        high_potential = [ch for ch, data in performance.items() if data.get("potential") in ["High", "Very High"]]

        col1, col2 = st.columns(2)

        with col1:
            st.metric("High Performing Channels", len(high_performers))
            if high_performers:
                st.caption(", ".join(high_performers))

        with col2:
            st.metric("High Potential Channels", len(high_potential))
            if high_potential:
                st.caption(", ".join(high_potential))


def render_validation_feedback(active_channels: List[str], investments: Dict[str, str], priorities: List[str]):
    """Render validation feedback for channel context."""
    st.markdown("### ✅ Validation")

    errors = []
    warnings = []

    if not active_channels:
        warnings.append("Consider defining at least one active channel")

    if active_channels and not priorities:
        warnings.append("Consider ranking your channels by priority")

    # Check for over-investment
    primary_count = sum(1 for inv in investments.values() if inv == "Primary Focus")
    if primary_count > 2:
        warnings.append("Having more than 2 'Primary Focus' channels may spread resources too thin")

    # Check for under-investment
    none_count = sum(1 for inv in investments.values() if inv == "None")
    if none_count == len(active_channels) and len(active_channels) > 0:
        warnings.append("All channels marked as 'None' investment - consider resource allocation")

    # Check priority alignment
    if priorities and investments:
        # Primary focus should be in top priorities
        primary_channels = [ch for ch, inv in investments.items() if inv == "Primary Focus"]
        priority_mismatch = [ch for ch in primary_channels if ch not in priorities[:len(primary_channels)]]

        if priority_mismatch:
            warnings.append(f"Primary focus channels not in priority order: {', '.join(priority_mismatch)}")

    if errors:
        for error in errors:
            st.error(f"❌ {error}")
    if warnings:
        for warning in warnings:
            st.warning(f"⚠️ {warning}")

    if not errors and not warnings:
        st.success("✅ Channel strategy looks well-defined!")
