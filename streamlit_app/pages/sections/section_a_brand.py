"""
Section A: Brand Context
=========================

Implementación de la Sección A del UCR: Brand Context.
Define la entidad de marca básica y atributos principales.
"""

import streamlit as st
from typing import Tuple
from brand_intel.core.models import Configuration, Brand, FundingStage


def render_section_a_content(config: Configuration) -> Tuple[Configuration, bool]:
    """
    Render Section A: Brand Context.

    Returns:
        Tuple of (updated_config, changes_made)
    """
    changes_made = False

    # Current brand data
    brand = config.brand

    st.markdown("""
    This section defines your brand's core identity and basic attributes.
    These details help AI systems understand your brand context for better analysis.
    """)

    # Form columns
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("🏢 Brand Identity")

        # Brand Name
        brand_name = st.text_input(
            "Brand Name *",
            value=brand.name,
            help="Your brand's display name (e.g., Nike, Coca-Cola)"
        )
        if brand_name != brand.name:
            changes_made = True

        # Domain
        domain = st.text_input(
            "Domain *",
            value=brand.domain,
            help="Your primary domain (e.g., nike.com)",
            placeholder="example.com"
        )
        if domain != brand.domain:
            changes_made = True

        # Industry
        industry = st.text_input(
            "Industry",
            value=brand.industry,
            help="Primary industry sector",
            placeholder="e.g., Athletic Footwear, Consumer Electronics"
        )
        if industry != brand.industry:
            changes_made = True

    with col2:
        st.subheader("💼 Business Profile")

        # Business Model
        business_model = st.selectbox(
            "Business Model",
            options=["B2B", "B2C", "B2B2C", "Marketplace", "SaaS"],
            index=["B2B", "B2C", "B2B2C", "Marketplace", "SaaS"].index(brand.business_model) if brand.business_model in ["B2B", "B2C", "B2B2C", "Marketplace", "SaaS"] else 0,
            help="Primary business model"
        )
        if business_model != brand.business_model:
            changes_made = True

        # Funding Stage
        funding_options = ["UNKNOWN", "BOOTSTRAP", "SEED", "SERIES_A", "SERIES_B", "SERIES_C", "PUBLIC", "ACQUIRED"]
        funding_stage_display = [opt.replace("_", " ").title() for opt in funding_options]

        current_index = funding_options.index(brand.funding_stage.value) if brand.funding_stage else 0

        funding_selection = st.selectbox(
            "Funding Stage",
            options=funding_stage_display,
            index=current_index,
            help="Current funding stage"
        )
        funding_stage = FundingStage(funding_options[funding_stage_display.index(funding_selection)])
        if funding_stage != brand.funding_stage:
            changes_made = True

        # Revenue Band
        revenue_band = st.selectbox(
            "Revenue Band",
            options=["", "<$1M", "$1M-$10M", "$10M-$50M", "$50M-$100M", "$100M-$500M", "$500M-$1B", "$1B+"],
            index=["", "<$1M", "$1M-$10M", "$10M-$50M", "$50M-$100M", "$100M-$500M", "$500M-$1B", "$1B+"].index(brand.revenue_band) if brand.revenue_band in ["", "<$1M", "$1M-$10M", "$10M-$50M", "$50M-$100M", "$100M-$500M", "$500M-$1B", "$1B+"] else 0,
            help="Annual revenue range"
        )
        if revenue_band != brand.revenue_band:
            changes_made = True

    # Target Market (full width)
    st.subheader("🎯 Target Market & Geography")

    target_market = st.text_area(
        "Target Market Description",
        value=brand.target_market,
        height=100,
        help="Describe your primary target audience, use cases, and market positioning",
        placeholder="e.g., Athletes and fitness enthusiasts aged 18-35 seeking premium athletic footwear and apparel"
    )
    if target_market != brand.target_market:
        changes_made = True

    # Primary Geography
    geography_options = [
        "Global", "North America", "South America", "Europe", "Asia Pacific",
        "US", "Canada", "UK", "Germany", "France", "Australia", "Japan", "China", "India"
    ]

    primary_geography = st.multiselect(
        "Primary Geography",
        options=geography_options,
        default=brand.primary_geography,
        help="Geographic markets where you have significant presence or focus"
    )
    if set(primary_geography) != set(brand.primary_geography):
        changes_made = True

    # AI Generation Button
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("### 🤖 AI Enhancement")
        st.markdown("Use AI to help complete or enhance your brand profile based on the domain.")

    with col2:
        if st.button("🎯 Generate with AI", use_container_width=True):
            with st.spinner("Analyzing brand..."):
                # TODO: Integrate with AI service
                st.info("AI integration coming in Gap 3. For now, please fill manually.")

    # Validation feedback
    if st.checkbox("Show validation", value=False):
        st.markdown("### ✅ Validation")
        errors = []
        warnings = []

        if not brand_name.strip():
            errors.append("Brand name is required")
        if not domain.strip():
            errors.append("Domain is required")
        elif not _is_valid_domain(domain):
            errors.append("Domain format is invalid")

        if not target_market.strip():
            warnings.append("Target market description helps improve AI analysis")

        if errors:
            for error in errors:
                st.error(f"❌ {error}")
        if warnings:
            for warning in warnings:
                st.warning(f"⚠️ {warning}")

        if not errors and not warnings:
            st.success("✅ All required fields completed!")

    # Update config if changes were made
    if changes_made:
        updated_brand = Brand(
            name=brand_name,
            domain=domain,
            industry=industry,
            business_model=business_model,
            funding_stage=funding_stage,
            revenue_band=revenue_band,
            target_market=target_market,
            primary_geography=primary_geography
        )

        updated_config = config.copy()
        updated_config.brand = updated_brand
        return updated_config, True

    return config, False


def _is_valid_domain(domain: str) -> bool:
    """Basic domain validation."""
    import re
    pattern = r'^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, domain.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]))
