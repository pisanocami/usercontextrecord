"""
Section E: Strategic Intent
===========================

Implementación de la Sección E del UCR: Strategic Intent.
Define la postura estratégica y tolerancia al riesgo.
"""

import streamlit as st
from typing import Tuple, List
from brand_intel.core.models import Configuration, StrategicIntent


def render_section_e_content(config: Configuration) -> Tuple[Configuration, bool]:
    """
    Render Section E: Strategic Intent.

    Returns:
        Tuple of (updated_config, changes_made)
    """
    changes_made = False

    # Current strategic intent data
    strategy = config.strategic_intent

    st.markdown("""
    This section defines your strategic posture and risk tolerance.
    These settings influence how aggressively the system recommends opportunities.
    """)

    # Primary Goal
    st.subheader("🎯 Primary Goal")
    goal_options = [
        "market_share",
        "profit_maximization",
        "brand_awareness",
        "customer_acquisition",
        "customer_retention",
        "revenue_growth",
        "cost_reduction",
        "innovation_leadership"
    ]

    goal_display = [opt.replace("_", " ").title() for opt in goal_options]
    current_goal_index = goal_options.index(strategy.primary_goal) if strategy.primary_goal in goal_options else 0

    primary_goal = st.selectbox(
        "Primary Business Goal",
        options=goal_display,
        index=current_goal_index,
        help="Your main strategic objective",
        key="primary_goal"
    )
    primary_goal_value = goal_options[goal_display.index(primary_goal)]

    if primary_goal_value != strategy.primary_goal:
        changes_made = True

    # Secondary Goals
    st.subheader("🎯 Secondary Goals")
    st.markdown("Supporting objectives that align with your primary goal.")

    secondary_goal_options = [
        "brand_awareness",
        "customer_acquisition",
        "customer_retention",
        "revenue_growth",
        "profit_maximization",
        "market_expansion",
        "product_innovation",
        "operational_efficiency"
    ]

    secondary_display = [opt.replace("_", " ").title() for opt in secondary_goal_options]
    secondary_goals = st.multiselect(
        "Secondary Goals",
        options=secondary_display,
        default=[opt.replace("_", " ").title() for opt in strategy.secondary_goals if opt in secondary_goal_options],
        help="Select supporting objectives",
        key="secondary_goals"
    )
    secondary_goals_values = [secondary_goal_options[secondary_display.index(g)] for g in secondary_goals]

    if set(secondary_goals_values) != set(strategy.secondary_goals):
        changes_made = True

    # Risk Tolerance
    st.subheader("⚖️ Risk Tolerance")
    risk_options = ["low", "medium", "high"]
    risk_display = ["Conservative (Low Risk)", "Balanced (Medium Risk)", "Aggressive (High Risk)"]

    current_risk_index = risk_options.index(strategy.risk_tolerance) if strategy.risk_tolerance in risk_options else 1

    risk_tolerance = st.selectbox(
        "Risk Tolerance Level",
        options=risk_display,
        index=current_risk_index,
        help="How much risk you're willing to accept for opportunities",
        key="risk_tolerance"
    )
    risk_tolerance_value = risk_options[risk_display.index(risk_tolerance)]

    if risk_tolerance_value != strategy.risk_tolerance:
        changes_made = True

    # Risk tolerance explanation
    risk_explanations = {
        "low": "Focus on proven opportunities with minimal risk. Prefer established markets and conservative growth strategies.",
        "medium": "Balance between opportunity and risk. Consider moderate expansion and measured innovation.",
        "high": "Pursue high-growth opportunities even with higher risk. Comfortable with disruption and new market entry."
    }

    st.info(f"**{risk_tolerance}:** {risk_explanations[risk_tolerance_value]}")

    # Time Horizon
    st.subheader("⏱️ Time Horizon")
    time_options = ["short", "medium", "long"]
    time_display = ["Short-term (6-12 months)", "Medium-term (1-3 years)", "Long-term (3+ years)"]

    current_time_index = time_options.index(strategy.time_horizon) if strategy.time_horizon in time_options else 1

    time_horizon = st.selectbox(
        "Investment Time Horizon",
        options=time_display,
        index=current_time_index,
        help="How long you're willing to invest before seeing returns",
        key="time_horizon"
    )
    time_horizon_value = time_options[time_display.index(time_horizon)]

    if time_horizon_value != strategy.time_horizon:
        changes_made = True

    # Things to Avoid
    st.subheader("🚫 Strategic Avoids")
    st.markdown("Areas or strategies you want to avoid.")

    avoid_options = [
        "price_wars",
        "low_margin_products",
        "commodity_markets",
        "high_risk_innovation",
        "international_expansion",
        "large_acquisitions",
        "debt_financing",
        "short_term_focus"
    ]

    avoid_display = [opt.replace("_", " ").title() for opt in avoid_options]
    avoids = st.multiselect(
        "Strategic Avoids",
        options=avoid_display,
        default=[opt.replace("_", " ").title() for opt in strategy.avoid if opt in avoid_options],
        help="Select strategies or areas to avoid",
        key="strategic_avoids"
    )
    avoids_values = [avoid_options[avoid_display.index(a)] for a in avoids]

    if set(avoids_values) != set(strategy.avoid):
        changes_made = True

    # Custom avoid
    custom_avoid = st.text_input(
        "Add custom strategic avoid",
        placeholder="e.g., Celebrity endorsements, Viral marketing",
        key="custom_avoid"
    )
    if custom_avoid:
        if custom_avoid not in avoids:
            avoids.append(custom_avoid)
            avoids_values.append(custom_avoid.replace(" ", "_").lower())

    # Strategy Summary
    render_strategy_summary(primary_goal_value, secondary_goals_values, risk_tolerance_value, time_horizon_value, avoids_values)

    # AI Enhancement
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("### 🤖 AI Enhancement")
        st.markdown("Get AI recommendations for strategic positioning based on your industry and competitors.")

    with col2:
        if st.button("🎯 Strategic Analysis", use_container_width=True):
            with st.spinner("Analyzing strategic positioning..."):
                # TODO: Integrate with AI service
                st.info("AI strategic analysis coming in Gap 3. For now, configure manually.")

    # Validation
    if st.checkbox("Show validation", value=False):
        render_validation_feedback(primary_goal_value, secondary_goals_values, risk_tolerance_value, avoids_values)

    # Update config if changes were made
    if changes_made:
        updated_strategy = StrategicIntent(
            growth_priority=primary_goal_value,  # Map to growth_priority for compatibility
            risk_tolerance=risk_tolerance_value,
            primary_goal=primary_goal_value,
            secondary_goals=secondary_goals_values,
            avoid=avoids_values,
            goal_type=primary_goal_value,
            time_horizon=time_horizon_value
        )

        updated_config = config.copy()
        updated_config.strategic_intent = updated_strategy
        return updated_config, True

    return config, False


def render_strategy_summary(primary_goal: str, secondary_goals: List[str], risk_tolerance: str, time_horizon: str, avoids: List[str]):
    """Render strategy summary visualization."""
    st.subheader("📊 Strategy Summary")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### Primary Focus")
        st.markdown(f"**🎯 Goal:** {primary_goal.replace('_', ' ').title()}")

        if secondary_goals:
            st.markdown("**Supporting Goals:**")
            for goal in secondary_goals[:3]:  # Show first 3
                st.markdown(f"• {goal.replace('_', ' ').title()}")

        st.markdown(f"**⚖️ Risk Level:** {risk_tolerance.title()}")

    with col2:
        st.markdown("### Time & Constraints")
        st.markdown(f"**⏱️ Horizon:** {time_horizon.title()}-term")

        if avoids:
            st.markdown("**🚫 Avoid:**")
            for avoid in avoids[:3]:  # Show first 3
                st.markdown(f"• {avoid.replace('_', ' ').title()}")

    # Strategy archetype
    archetype = determine_strategy_archetype(primary_goal, risk_tolerance, time_horizon)
    st.markdown(f"### 🎭 Strategy Archetype: **{archetype}**")


def determine_strategy_archetype(primary_goal: str, risk_tolerance: str, time_horizon: str) -> str:
    """Determine strategy archetype based on settings."""
    archetypes = {
        ("market_share", "high", "short"): "Aggressive Disruptor",
        ("market_share", "high", "medium"): "Growth Hacker",
        ("market_share", "medium", "medium"): "Balanced Grower",
        ("profit_maximization", "low", "long"): "Defensive Optimizer",
        ("brand_awareness", "medium", "long"): "Brand Builder",
        ("innovation_leadership", "high", "long"): "Visionary Innovator",
    }

    key = (primary_goal, risk_tolerance, time_horizon)
    return archetypes.get(key, "Custom Strategy")


def render_validation_feedback(primary_goal: str, secondary_goals: List[str], risk_tolerance: str, avoids: List[str]):
    """Render validation feedback for strategic intent."""
    st.markdown("### ✅ Validation")

    errors = []
    warnings = []

    if not primary_goal:
        errors.append("Primary goal is required")

    if not secondary_goals:
        warnings.append("Consider adding secondary goals for balanced strategy")

    if not avoids:
        warnings.append("Consider defining what to avoid for clearer strategic boundaries")

    # Check for conflicting goals
    conflicts = check_goal_conflicts(primary_goal, secondary_goals)
    if conflicts:
        warnings.extend(conflicts)

    # Check risk alignment
    risk_alignment = check_risk_alignment(primary_goal, risk_tolerance)
    if risk_alignment:
        warnings.append(risk_alignment)

    if errors:
        for error in errors:
            st.error(f"❌ {error}")
    if warnings:
        for warning in warnings:
            st.warning(f"⚠️ {warning}")

    if not errors and not warnings:
        st.success("✅ Strategic intent looks well-defined!")


def check_goal_conflicts(primary_goal: str, secondary_goals: List[str]) -> List[str]:
    """Check for conflicting strategic goals."""
    conflicts = []

    # Price vs quality conflicts
    if primary_goal == "profit_maximization" and "brand_awareness" in secondary_goals:
        conflicts.append("Profit maximization and brand awareness may conflict - consider premium positioning")

    # Short-term vs long-term conflicts
    if primary_goal == "revenue_growth" and "customer_retention" in secondary_goals:
        conflicts.append("Revenue growth focus may compete with customer retention goals")

    return conflicts


def check_risk_alignment(primary_goal: str, risk_tolerance: str) -> str:
    """Check if risk tolerance aligns with primary goal."""
    high_risk_goals = ["market_share", "innovation_leadership"]
    low_risk_goals = ["profit_maximization", "cost_reduction"]

    if primary_goal in high_risk_goals and risk_tolerance == "low":
        return f"Low risk tolerance may limit {primary_goal.replace('_', ' ')} opportunities"

    if primary_goal in low_risk_goals and risk_tolerance == "high":
        return f"High risk tolerance may not align with {primary_goal.replace('_', ' ')} focus"

    return ""
