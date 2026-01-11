"""
Section C: Competitive Set
===========================

Implementación de la Sección C del UCR: Competitive Set.
Define competidores directos e indirectos con evidencia.
"""

import streamlit as st
from typing import Tuple, List, Dict, Any
from brand_intel.core.models import (
    Configuration, Competitors, Competitor, CompetitorTier,
    CompetitorStatus, Evidence
)


def render_section_c_content(config: Configuration) -> Tuple[Configuration, bool]:
    """
    Render Section C: Competitive Set.

    Returns:
        Tuple of (updated_config, changes_made)
    """
    changes_made = False

    # Current competitors data
    competitors = config.competitors

    st.markdown("""
    This section defines your competitive landscape.
    Competitor analysis requires **evidence** - not just names.
    """)

    # Overview metrics
    render_competitor_overview(competitors)

    # Competitor management tabs
    tab1, tab2, tab3 = st.tabs(["🏆 Direct Competitors", "🔄 Indirect Competitors", "🏪 Marketplaces"])

    # Direct Competitors
    with tab1:
        updated_direct, direct_changed = render_competitor_list(
            "Direct Competitors",
            competitors.competitors or [],
            CompetitorTier.TIER1,
            "Direct competitors offer the same core product/service"
        )
        if direct_changed:
            changes_made = True

    # Indirect Competitors
    with tab2:
        updated_indirect, indirect_changed = render_competitor_list(
            "Indirect Competitors",
            competitors.competitors or [],  # Filter by tier in the function
            CompetitorTier.TIER2,
            "Indirect competitors serve adjacent markets or use cases"
        )
        if indirect_changed:
            changes_made = True

    # Marketplaces
    with tab3:
        marketplaces = render_marketplaces_list(competitors.marketplaces or [])
        if set(marketplaces) != set(competitors.marketplaces or []):
            changes_made = True

    # AI Competitor Search
    render_ai_competitor_search()

    # Validation feedback
    if st.checkbox("Show validation", value=False):
        render_validation_feedback(competitors)

    # Manual add competitor
    render_manual_competitor_add()

    # Update config if changes were made
    if changes_made:
        # Combine all competitors
        all_competitors = []
        if updated_direct:
            all_competitors.extend(updated_direct)
        if updated_indirect:
            all_competitors.extend(updated_indirect)

        updated_competitors = Competitors(
            direct=competitors.direct,
            indirect=competitors.indirect,
            marketplaces=marketplaces,
            competitors=all_competitors,
            approved_count=sum(1 for c in all_competitors if c.status == CompetitorStatus.APPROVED),
            rejected_count=sum(1 for c in all_competitors if c.status == CompetitorStatus.REJECTED),
            pending_review_count=sum(1 for c in all_competitors if c.status == CompetitorStatus.PENDING_REVIEW)
        )

        updated_config = config.copy()
        updated_config.competitors = updated_competitors
        return updated_config, True

    return config, False


def render_competitor_overview(competitors: Competitors):
    """Render competitor overview metrics."""
    st.subheader("🏆 Competitive Overview")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        total_competitors = len(competitors.competitors or [])
        st.metric("Total Competitors", total_competitors)

    with col2:
        approved = sum(1 for c in (competitors.competitors or []) if c.status == CompetitorStatus.APPROVED)
        st.metric("Approved", approved)

    with col3:
        pending = sum(1 for c in (competitors.competitors or []) if c.status == CompetitorStatus.PENDING_REVIEW)
        st.metric("Pending Review", pending)

    with col4:
        marketplaces = len(competitors.marketplaces or [])
        st.metric("Marketplaces", marketplaces)


def render_competitor_list(
    title: str,
    all_competitors: List[Competitor],
    target_tier: CompetitorTier,
    description: str
) -> Tuple[List[Competitor], bool]:
    """Render a list of competitors for a specific tier."""
    st.markdown(f"### {title}")
    st.markdown(description)

    # Filter competitors by tier
    tier_competitors = [c for c in all_competitors if c.tier == target_tier]
    changes_made = False

    # Add new competitor button
    if st.button(f"➕ Add {title[:-1]}", key=f"add_{target_tier.value}"):
        st.session_state[f"show_add_{target_tier.value}"] = True

    # Add competitor form
    if st.session_state.get(f"show_add_{target_tier.value}", False):
        new_competitor, added = render_add_competitor_form(target_tier)
        if added and new_competitor:
            tier_competitors.append(new_competitor)
            changes_made = True
            st.session_state[f"show_add_{target_tier.value}"] = False
            st.rerun()

    # Display existing competitors
    for i, competitor in enumerate(tier_competitors):
        with st.expander(f"{competitor.name} ({competitor.domain})", expanded=False):
            updated_competitor, comp_changed = render_competitor_card(competitor, i, target_tier)
            if comp_changed:
                tier_competitors[i] = updated_competitor
                changes_made = True

    return tier_competitors, changes_made


def render_add_competitor_form(tier: CompetitorTier) -> Tuple[Competitor, bool]:
    """Render form to add a new competitor."""
    st.markdown("### Add New Competitor")

    col1, col2 = st.columns(2)

    with col1:
        name = st.text_input("Company Name", key=f"name_{tier.value}")
        domain = st.text_input("Domain", key=f"domain_{tier.value}")

    with col2:
        status_options = ["Approved", "Pending Review", "Rejected"]
        status = st.selectbox("Status", status_options, key=f"status_{tier.value}")

        # Evidence inputs
        why_selected = st.text_area(
            "Why Selected",
            height=80,
            key=f"why_{tier.value}",
            help="Explain why this company is a competitor"
        )

    col1, col2 = st.columns(2)
    with col1:
        if st.button("✅ Save Competitor", key=f"save_{tier.value}"):
            if name and domain:
                status_map = {
                    "Approved": CompetitorStatus.APPROVED,
                    "Pending Review": CompetitorStatus.PENDING_REVIEW,
                    "Rejected": CompetitorStatus.REJECTED
                }

                competitor = Competitor(
                    name=name,
                    domain=domain,
                    tier=tier,
                    status=status_map[status],
                    evidence=Evidence(
                        why_selected=why_selected,
                        top_overlap_keywords=[],
                        serp_examples=[]
                    )
                )
                return competitor, True
            else:
                st.error("Name and domain are required")

    with col2:
        if st.button("❌ Cancel", key=f"cancel_{tier.value}"):
            st.session_state[f"show_add_{tier.value}"] = False
            st.rerun()

    return None, False


def render_competitor_card(competitor: Competitor, index: int, tier: CompetitorTier) -> Tuple[Competitor, bool]:
    """Render a competitor card with editable details."""
    changes_made = False

    col1, col2, col3 = st.columns([2, 1, 1])

    with col1:
        st.markdown(f"**{competitor.name}**")
        st.caption(competitor.domain)

        # Status badge
        status_colors = {
            CompetitorStatus.APPROVED: "green",
            CompetitorStatus.REJECTED: "red",
            CompetitorStatus.PENDING_REVIEW: "orange"
        }
        status_color = status_colors.get(competitor.status, "gray")

        st.markdown(f"""
        <span style="background: {status_color}20; color: {status_color};
                     padding: 2px 8px; border-radius: 12px; font-size: 12px;">
            {competitor.status.value.replace('_', ' ').title()}
        </span>
        """, unsafe_allow_html=True)

    with col2:
        # Evidence strength indicator
        strength = competitor.evidence_strength
        st.metric("Evidence", f"{strength}%")

        # Quick actions
        col2a, col2b = st.columns(2)
        with col2a:
            if st.button("✏️ Edit", key=f"edit_{tier.value}_{index}", use_container_width=True):
                st.session_state[f"edit_mode_{tier.value}_{index}"] = True

        with col2b:
            if st.button("🗑️ Remove", key=f"remove_{tier.value}_{index}", use_container_width=True):
                # Mark for removal (handled by parent)
                pass

    with col3:
        # Size indicators
        if competitor.similarity_score:
            st.metric("Similarity", f"{competitor.similarity_score}%")
        if competitor.serp_overlap:
            st.metric("SERP Overlap", f"{competitor.serp_overlap}%")

    # Evidence details
    if competitor.evidence:
        with st.expander("📋 Evidence Details", expanded=False):
            st.markdown("**Why Selected:**")
            st.write(competitor.evidence.why_selected or "No explanation provided")

            if competitor.evidence.top_overlap_keywords:
                st.markdown("**Top Overlap Keywords:**")
                st.write(", ".join(competitor.evidence.top_overlap_keywords))

            if competitor.evidence.serp_examples:
                st.markdown("**SERP Examples:**")
                for example in competitor.evidence.serp_examples:
                    st.code(example)

    # Edit mode
    if st.session_state.get(f"edit_mode_{tier.value}_{index}", False):
        changes_made = render_competitor_edit_form(competitor, index, tier)

    return competitor, changes_made


def render_competitor_edit_form(competitor: Competitor, index: int, tier: CompetitorTier) -> bool:
    """Render edit form for competitor."""
    st.markdown("### Edit Competitor")

    name = st.text_input("Name", value=competitor.name, key=f"edit_name_{index}")
    domain = st.text_input("Domain", value=competitor.domain, key=f"edit_domain_{index}")

    status_options = ["Approved", "Pending Review", "Rejected"]
    current_status = competitor.status.value.replace('_', ' ').title()
    status_index = status_options.index(current_status) if current_status in status_options else 0
    status = st.selectbox("Status", status_options, index=status_index, key=f"edit_status_{index}")

    why_selected = st.text_area(
        "Why Selected",
        value=competitor.evidence.why_selected if competitor.evidence else "",
        key=f"edit_why_{index}"
    )

    col1, col2 = st.columns(2)
    with col1:
        if st.button("💾 Save Changes", key=f"save_edit_{index}"):
            # Update competitor
            status_map = {
                "Approved": CompetitorStatus.APPROVED,
                "Pending Review": CompetitorStatus.PENDING_REVIEW,
                "Rejected": CompetitorStatus.REJECTED
            }

            competitor.name = name
            competitor.domain = domain
            competitor.status = status_map[status]
            if competitor.evidence:
                competitor.evidence.why_selected = why_selected

            st.session_state[f"edit_mode_{tier.value}_{index}"] = False
            st.success("Competitor updated!")
            return True

    with col2:
        if st.button("❌ Cancel Edit", key=f"cancel_edit_{index}"):
            st.session_state[f"edit_mode_{tier.value}_{index}"] = False
            st.rerun()

    return False


def render_marketplaces_list(current_marketplaces: List[str]) -> List[str]:
    """Render marketplaces list."""
    st.markdown("### 🏪 Marketplaces")
    st.markdown("Platforms where competitors can sell similar products.")

    marketplaces = st.multiselect(
        "Marketplaces",
        options=[
            "Amazon", "Walmart", "Target", "Best Buy", "Home Depot", "Lowe's",
            "eBay", "Etsy", "Wayfair", "Chewy", "Zappos", "Nordstrom"
        ],
        default=current_marketplaces,
        help="Select marketplaces where your category competes"
    )

    # Custom marketplace
    custom = st.text_input("Add custom marketplace", placeholder="e.g., Company Store")
    if custom and custom not in marketplaces:
        marketplaces.append(custom)

    return marketplaces


def render_ai_competitor_search():
    """Render AI competitor search section."""
    st.markdown("---")
    st.markdown("### 🤖 AI Competitor Discovery")

    col1, col2 = st.columns([3, 1])

    with col1:
        st.markdown("Use AI to discover competitors based on your brand and category.")
        search_domain = st.text_input(
            "Search Domain",
            placeholder="e.g., nike.com",
            help="Domain to analyze for competitor discovery"
        )

    with col2:
        if st.button("🔍 Search Competitors", use_container_width=True):
            with st.spinner("Searching for competitors..."):
                # TODO: Integrate with AI service
                st.info("AI competitor search coming in Gap 3. For now, add competitors manually.")


def render_validation_feedback(competitors: Competitors):
    """Render validation feedback for competitors section."""
    st.markdown("### ✅ Validation")

    errors = []
    warnings = []

    all_competitors = competitors.competitors or []

    if len(all_competitors) == 0:
        warnings.append("Consider adding at least 2-3 competitors for meaningful analysis")
    elif len(all_competitors) < 2:
        warnings.append("Having only 1 competitor limits competitive analysis accuracy")

    approved_competitors = [c for c in all_competitors if c.status == CompetitorStatus.APPROVED]
    if len(approved_competitors) == 0:
        errors.append("At least 1 competitor must be approved for analysis")

    # Check evidence quality
    competitors_without_evidence = [
        c.name for c in approved_competitors
        if not c.evidence or not c.evidence.why_selected
    ]
    if competitors_without_evidence:
        warnings.append(f"Competitors missing evidence: {', '.join(competitors_without_evidence[:3])}")

    if errors:
        for error in errors:
            st.error(f"❌ {error}")
    if warnings:
        for warning in warnings:
            st.warning(f"⚠️ {warning}")

    if not errors and not warnings:
        st.success("✅ Competitive set looks good!")
