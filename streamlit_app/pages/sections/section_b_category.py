"""
Section B: Category Definition
==============================

Implementación de la Sección B del UCR: Category Definition.
Define el category fence y el alcance válido de queries.
"""

import streamlit as st
from typing import Tuple, List
from brand_intel.core.models import Configuration, CategoryDefinition


def render_section_b_content(config: Configuration) -> Tuple[Configuration, bool]:
    """
    Render Section B: Category Definition.

    Returns:
        Tuple of (updated_config, changes_made)
    """
    changes_made = False

    # Current category definition data
    category_def = config.category_definition

    st.markdown("""
    This section defines your category boundaries and query scope.
    The **Category Fence** determines what keywords and topics are considered valid for analysis.
    """)

    # Primary Category (required)
    st.subheader("🎯 Primary Category")
    primary_category = st.text_input(
        "Primary Category *",
        value=category_def.primary_category,
        help="Your core business category (e.g., 'Athletic Footwear', 'Consumer Electronics')",
        placeholder="e.g., Athletic Footwear, Consumer Electronics"
    )
    if primary_category != category_def.primary_category:
        changes_made = True

    # Category Fence Visualization
    if primary_category.strip():
        st.markdown("### 🏗️ Category Fence")
        st.info(f"**Primary Category:** {primary_category}")

        # Category fence explanation
        st.markdown("""
        The category fence determines what keywords are **IN** vs **OUT** for analysis:
        - **Included**: Keywords that are clearly part of your category
        - **Excluded**: Keywords that are clearly outside your category
        - **Ambiguous**: Keywords that may need review (not explicitly included/excluded)
        """)

    # Included Categories
    st.subheader("✅ Included Categories")
    st.markdown("Categories that are clearly part of your business scope.")

    included_categories = st.multiselect(
        "Included Categories",
        options=get_category_suggestions(primary_category),
        default=category_def.included,
        help="Select or add categories that are part of your business",
        key="included_categories"
    )

    # Allow custom addition
    custom_included = st.text_input(
        "Add custom included category",
        placeholder="e.g., Sports Equipment, Fitness Accessories",
        key="custom_included"
    )
    if custom_included and custom_included not in included_categories:
        included_categories.append(custom_included)
        custom_included = ""  # Clear the input

    if set(included_categories) != set(category_def.included):
        changes_made = True

    # Excluded Categories
    st.subheader("❌ Excluded Categories")
    st.markdown("Categories that are clearly outside your business scope.")

    excluded_categories = st.multiselect(
        "Excluded Categories",
        options=get_category_suggestions(primary_category),
        default=category_def.excluded,
        help="Select categories that are NOT part of your business",
        key="excluded_categories"
    )

    # Allow custom addition
    custom_excluded = st.text_input(
        "Add custom excluded category",
        placeholder="e.g., Gambling, Adult Content",
        key="custom_excluded"
    )
    if custom_excluded and custom_excluded not in excluded_categories:
        excluded_categories.append(custom_excluded)
        custom_excluded = ""  # Clear the input

    if set(excluded_categories) != set(category_def.excluded):
        changes_made = True

    # Check for overlaps
    overlap = set(included_categories) & set(excluded_categories)
    if overlap:
        st.error(f"⚠️ Categories cannot be both included and excluded: {', '.join(overlap)}")

    # Approved Categories
    st.subheader("✅ Approved Categories")
    st.markdown("Broader categories that are approved for analysis (includes sub-categories).")

    approved_categories = st.multiselect(
        "Approved Categories",
        options=get_broader_category_suggestions(primary_category),
        default=category_def.approved_categories,
        help="Broader category groups that are approved",
        key="approved_categories"
    )
    if set(approved_categories) != set(category_def.approved_categories):
        changes_made = True

    # Alternative Categories
    st.subheader("🔄 Alternative Categories")
    st.markdown("Related categories that could be considered for expansion.")

    alternative_categories = st.multiselect(
        "Alternative Categories",
        options=get_alternative_category_suggestions(primary_category),
        default=category_def.alternative_categories,
        help="Related categories for potential expansion",
        key="alternative_categories"
    )
    if set(alternative_categories) != set(category_def.alternative_categories):
        changes_made = True

    # Semantic Extensions
    st.subheader("🔍 Semantic Extensions")
    st.markdown("Additional terms that extend your category understanding.")

    semantic_extensions = st.multiselect(
        "Semantic Extensions",
        options=get_semantic_extensions(primary_category),
        default=category_def.semantic_extensions,
        help="Terms that are semantically related to your category",
        key="semantic_extensions"
    )

    # Allow custom addition
    custom_semantic = st.text_input(
        "Add custom semantic extension",
        placeholder="e.g., workout gear, fitness apparel",
        key="custom_semantic"
    )
    if custom_semantic and custom_semantic not in semantic_extensions:
        semantic_extensions.append(custom_semantic)
        custom_semantic = ""  # Clear the input

    if set(semantic_extensions) != set(category_def.semantic_extensions):
        changes_made = True

    # Fence Summary
    if primary_category.strip():
        st.subheader("📊 Category Fence Summary")

        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric("Included", len(included_categories))
        with col2:
            st.metric("Excluded", len(excluded_categories))
        with col3:
            st.metric("Extensions", len(semantic_extensions))

        # Visual fence representation
        st.markdown("### 🎯 Fence Visualization")
        fence_data = {
            "Included": included_categories[:5],  # Show first 5
            "Excluded": excluded_categories[:5],
            "Extensions": semantic_extensions[:5]
        }

        for fence_type, items in fence_data.items():
            if items:
                st.markdown(f"**{fence_type}:** {', '.join(items)}")
                if len(items) > 5:
                    st.caption(f"... and {len(items) - 5} more")

    # AI Enhancement
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("### 🤖 AI Enhancement")
        st.markdown("Use AI to suggest category boundaries based on your primary category.")

    with col2:
        if st.button("🎯 Generate Fence with AI", use_container_width=True):
            with st.spinner("Analyzing category boundaries..."):
                # TODO: Integrate with AI service
                st.info("AI integration coming in Gap 3. For now, please configure manually.")

    # Validation
    if st.checkbox("Show validation", value=False):
        st.markdown("### ✅ Validation")
        errors = []
        warnings = []

        if not primary_category.strip():
            errors.append("Primary category is required")

        if not included_categories and not approved_categories:
            warnings.append("Consider adding included categories to define your scope clearly")

        overlap = set(included_categories) & set(excluded_categories)
        if overlap:
            errors.append(f"Categories cannot be both included and excluded: {', '.join(overlap)}")

        if errors:
            for error in errors:
                st.error(f"❌ {error}")
        if warnings:
            for warning in warnings:
                st.warning(f"⚠️ {warning}")

        if not errors and not warnings:
            st.success("✅ Category definition looks good!")

    # Update config if changes were made
    if changes_made:
        updated_category_def = CategoryDefinition(
            primary_category=primary_category,
            included=included_categories,
            excluded=excluded_categories,
            approved_categories=approved_categories,
            alternative_categories=alternative_categories,
            semantic_extensions=semantic_extensions
        )

        updated_config = config.copy()
        updated_config.category_definition = updated_category_def
        return updated_config, True

    return config, False


def get_category_suggestions(primary_category: str) -> List[str]:
    """Get category suggestions based on primary category."""
    # This would be expanded with a real taxonomy
    suggestions = {
        "athletic footwear": [
            "Running Shoes", "Basketball Shoes", "Soccer Cleats", "Tennis Shoes",
            "Training Shoes", "Walking Shoes", "Trail Running Shoes", "Cross Training Shoes"
        ],
        "consumer electronics": [
            "Smartphones", "Laptops", "Tablets", "Smart TVs", "Gaming Consoles",
            "Wearable Tech", "Audio Equipment", "Cameras"
        ],
        "e-commerce": [
            "Online Retail", "Marketplaces", "Dropshipping", "Subscription Boxes",
            "Flash Sales", "Loyalty Programs", "Customer Reviews"
        ]
    }

    # Default suggestions
    base_suggestions = [
        "Premium Products", "Budget Options", "Professional Services",
        "Consumer Goods", "B2B Solutions", "Luxury Items", "Mass Market"
    ]

    primary_lower = primary_category.lower()
    for key, values in suggestions.items():
        if key in primary_lower:
            return base_suggestions + values

    return base_suggestions


def get_broader_category_suggestions(primary_category: str) -> List[str]:
    """Get broader category suggestions."""
    return [
        "Sports & Fitness", "Fashion & Apparel", "Technology", "Home & Garden",
        "Health & Beauty", "Automotive", "Food & Beverage", "Business Services"
    ]


def get_alternative_category_suggestions(primary_category: str) -> List[str]:
    """Get alternative category suggestions for expansion."""
    return [
        "Sports Equipment", "Fitness Accessories", "Outdoor Gear",
        "Performance Nutrition", "Sports Apparel", "Training Equipment"
    ]


def get_semantic_extensions(primary_category: str) -> List[str]:
    """Get semantic extensions for the category."""
    extensions = {
        "athletic footwear": [
            "workout shoes", "running gear", "sports shoes", "athletic sneakers",
            "performance footwear", "training shoes", "gym shoes"
        ],
        "consumer electronics": [
            "gadgets", "tech devices", "smart devices", "electronics",
            "digital products", "tech accessories"
        ]
    }

    primary_lower = primary_category.lower()
    for key, values in extensions.items():
        if key in primary_lower:
            return values

    return ["performance gear", "professional equipment", "consumer products"]
