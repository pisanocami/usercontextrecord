"""
Section D: Demand Definition
============================

Implementación de la Sección D del UCR: Demand Definition.
Agrupa queries de búsqueda en temas de demanda.
"""

import streamlit as st
from typing import Tuple, List, Dict, Any
from brand_intel.core.models import Configuration


def render_section_d_content(config: Configuration) -> Tuple[Configuration, bool]:
    """
    Render Section D: Demand Definition.

    Returns:
        Tuple of (updated_config, changes_made)
    """
    changes_made = False

    # Current demand definition data
    demand_def = config.demand_definition or {}

    st.markdown("""
    This section defines how search queries are grouped into demand themes.
    This helps translate raw keywords into business-relevant insights.
    """)

    # Brand Keywords
    st.subheader("🏢 Brand Keywords")
    st.markdown("Keywords that mention your brand specifically.")

    brand_keywords = demand_def.get("brand_keywords", {})

    seed_terms = st.multiselect(
        "Seed Terms",
        options=get_brand_suggestions(config.brand.name, config.brand.domain),
        default=brand_keywords.get("seed_terms", []),
        help="Core brand terms that drive branded search",
        key="brand_seed_terms"
    )

    if set(seed_terms) != set(brand_keywords.get("seed_terms", [])):
        changes_made = True

    # Allow custom addition
    custom_brand = st.text_input(
        "Add custom brand term",
        placeholder="e.g., Nike Air, Nike running",
        key="custom_brand_term"
    )
    if custom_brand and custom_brand not in seed_terms:
        seed_terms.append(custom_brand)
        custom_brand = ""  # Clear input

    # Category Terms
    st.subheader("📊 Category Terms")
    st.markdown("Keywords that represent your product category without mentioning specific brands.")

    category_keywords = demand_def.get("non_brand_keywords", {})

    category_terms = st.multiselect(
        "Category Terms",
        options=get_category_suggestions(config.category_definition.primary_category),
        default=category_terms.get("category_terms", []),
        help="Generic terms that represent your category",
        key="category_terms"
    )

    if set(category_terms) != set(category_keywords.get("category_terms", [])):
        changes_made = True

    # Allow custom addition
    custom_category = st.text_input(
        "Add custom category term",
        placeholder="e.g., athletic shoes, sports footwear",
        key="custom_category_term"
    )
    if custom_category and custom_category not in category_terms:
        category_terms.append(custom_category)
        custom_category = ""  # Clear input

    # Demand Themes
    st.subheader("🎯 Demand Themes")
    st.markdown("Group keywords into business-relevant themes.")

    themes = demand_def.get("themes", [])

    # Add new theme
    if st.button("➕ Add Demand Theme", key="add_theme"):
        st.session_state.show_add_theme = True

    if st.session_state.get("show_add_theme", False):
        new_theme, added = render_add_theme_form(themes)
        if added:
            themes.append(new_theme)
            changes_made = True
            st.session_state.show_add_theme = False
            st.rerun()

    # Display existing themes
    for i, theme in enumerate(themes):
        with st.expander(f"🎯 {theme['name']}", expanded=False):
            render_theme_details(theme, i)

    # Keyword Analysis
    if seed_terms or category_terms:
        render_keyword_analysis(seed_terms, category_terms)

    # AI Enhancement
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("### 🤖 AI Enhancement")
        st.markdown("Use AI to analyze search demand and suggest themes.")

    with col2:
        if st.button("📊 Analyze Demand", use_container_width=True):
            with st.spinner("Analyzing search demand..."):
                # TODO: Integrate with AI service
                st.info("AI demand analysis coming in Gap 3. For now, configure manually.")

    # Validation
    if st.checkbox("Show validation", value=False):
        render_validation_feedback(seed_terms, category_terms, themes)

    # Update config if changes were made
    if changes_made:
        updated_demand_def = {
            "brand_keywords": {
                "seed_terms": seed_terms
            },
            "non_brand_keywords": {
                "category_terms": category_terms
            },
            "themes": themes
        }

        updated_config = config.copy()
        updated_config.demand_definition = updated_demand_def
        return updated_config, True

    return config, False


def render_add_theme_form(existing_themes: List[Dict]) -> Tuple[Dict, bool]:
    """Render form to add a new demand theme."""
    st.markdown("### Add New Demand Theme")

    theme_name = st.text_input("Theme Name", key="new_theme_name")
    description = st.text_area("Description", key="new_theme_desc")

    keywords = st.multiselect(
        "Keywords in this Theme",
        options=[],  # Would be populated from existing keywords
        key="new_theme_keywords"
    )

    # Allow adding custom keywords
    custom_keyword = st.text_input("Add keyword to theme", key="new_theme_custom_kw")
    if custom_keyword and custom_keyword not in keywords:
        keywords.append(custom_keyword)
        custom_keyword = ""

    priority_options = ["High", "Medium", "Low"]
    priority = st.selectbox("Business Priority", priority_options, key="new_theme_priority")

    col1, col2 = st.columns(2)
    with col1:
        if st.button("✅ Save Theme", key="save_new_theme"):
            if theme_name and keywords:
                theme = {
                    "name": theme_name,
                    "description": description,
                    "keywords": keywords,
                    "priority": priority.lower(),
                    "search_volume_estimate": 0,
                    "competition_level": "medium"
                }
                return theme, True
            else:
                st.error("Theme name and at least one keyword are required")

    with col2:
        if st.button("❌ Cancel", key="cancel_new_theme"):
            st.session_state.show_add_theme = False
            st.rerun()

    return {}, False


def render_theme_details(theme: Dict, index: int):
    """Render details of a demand theme."""
    col1, col2 = st.columns(2)

    with col1:
        st.markdown(f"**Description:** {theme.get('description', 'No description')}")
        st.markdown(f"**Priority:** {theme.get('priority', 'medium').title()}")

    with col2:
        st.markdown(f"**Keywords:** {len(theme.get('keywords', []))}")
        st.markdown(f"**Est. Volume:** {theme.get('search_volume_estimate', 0):,}")
        st.markdown(f"**Competition:** {theme.get('competition_level', 'medium').title()}")

    # Keywords list
    if theme.get('keywords'):
        st.markdown("**Keywords:**")
        keywords_text = ", ".join(theme['keywords'][:10])  # Show first 10
        if len(theme['keywords']) > 10:
            keywords_text += f" ... and {len(theme['keywords']) - 10} more"
        st.write(keywords_text)


def render_keyword_analysis(brand_terms: List[str], category_terms: List[str]):
    """Render keyword analysis section."""
    st.subheader("📈 Keyword Analysis")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("Brand Terms", len(brand_terms))

    with col2:
        st.metric("Category Terms", len(category_terms))

    with col3:
        total = len(brand_terms) + len(category_terms)
        st.metric("Total Keywords", total)

    # Coverage analysis
    if brand_terms and category_terms:
        st.markdown("### 🎯 Coverage Analysis")

        # This would be enhanced with actual keyword data
        coverage_data = {
            "Brand Search": len(brand_terms),
            "Category Search": len(category_terms),
            "Total Coverage": total
        }

        st.bar_chart(coverage_data)


def get_brand_suggestions(brand_name: str, domain: str) -> List[str]:
    """Get brand keyword suggestions."""
    if not brand_name:
        return []

    brand_lower = brand_name.lower()
    domain_clean = domain.replace("https://", "").replace("http://", "").replace("www.", "").split(".")[0]

    suggestions = [
        brand_name,
        f"{brand_name} shoes",
        f"{brand_name} clothing",
        f"{brand_name} store",
        f"buy {brand_name}",
        f"{brand_name} official",
        f"{domain_clean} store"
    ]

    return suggestions


def get_category_suggestions(primary_category: str) -> List[str]:
    """Get category keyword suggestions."""
    if not primary_category:
        return []

    category_lower = primary_category.lower()

    suggestions = {
        "athletic footwear": [
            "running shoes", "basketball shoes", "tennis shoes", "training shoes",
            "walking shoes", "trail shoes", "soccer cleats", "sports shoes",
            "athletic sneakers", "gym shoes", "workout shoes", "performance shoes"
        ],
        "consumer electronics": [
            "smartphones", "laptops", "tablets", "smart tv", "gaming console",
            "wireless headphones", "smartwatch", "digital camera", "bluetooth speaker"
        ]
    }

    for key, values in suggestions.items():
        if key in category_lower:
            return values

    # Default suggestions
    return [
        "buy online", "best price", "reviews", "comparison", "deals",
        "discount", "sale", "new arrivals", "top rated", "customer reviews"
    ]


def render_validation_feedback(brand_terms: List[str], category_terms: List[str], themes: List[Dict]):
    """Render validation feedback for demand definition."""
    st.markdown("### ✅ Validation")

    errors = []
    warnings = []

    if not brand_terms:
        warnings.append("Consider adding brand-specific keywords for complete coverage")

    if not category_terms:
        warnings.append("Category terms help identify non-branded demand opportunities")

    if not themes:
        warnings.append("Grouping keywords into themes helps with business insights")

    total_keywords = len(brand_terms) + len(category_terms)
    if total_keywords < 5:
        warnings.append("More keywords provide better demand analysis")

    # Check theme coverage
    themed_keywords = set()
    for theme in themes:
        themed_keywords.update(theme.get('keywords', []))

    unthemed_brand = set(brand_terms) - themed_keywords
    unthemed_category = set(category_terms) - themed_keywords

    if unthemed_brand or unthemed_category:
        unthemed_count = len(unthemed_brand) + len(unthemed_category)
        warnings.append(f"{unthemed_count} keywords not assigned to themes")

    if errors:
        for error in errors:
            st.error(f"❌ {error}")
    if warnings:
        for warning in warnings:
            st.warning(f"⚠️ {warning}")

    if not errors and not warnings:
        st.success("✅ Demand definition looks comprehensive!")
