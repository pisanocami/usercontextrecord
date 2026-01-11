"""
Section G: Negative Scope (Guardrails)
======================================

Implementación de la Sección G del UCR: Negative Scope.
Exclusiones hard que bloquean análisis.
"""

import streamlit as st
from typing import Tuple, List, Dict, Any
from brand_intel.core.models import Configuration, NegativeScope, EnforcementRules


def render_section_g_content(config: Configuration) -> Tuple[Configuration, bool]:
    """
    Render Section G: Negative Scope (Guardrails).

    Returns:
        Tuple of (updated_config, changes_made)
    """
    changes_made = False

    # Current negative scope data
    negative_scope = config.negative_scope

    st.markdown("""
    **🛡️ Guardrails define hard exclusions that block analysis.**

    These are **non-negotiable boundaries** - any content or opportunity that matches these rules
    will be **automatically rejected**. Use these for legal, brand, or strategic restrictions.
    """)

    st.warning("""
    ⚠️ **Important**: These rules are enforced automatically and cannot be overridden.
    Only add restrictions you are 100% committed to enforcing.
    """)

    # Excluded Categories
    st.subheader("🚫 Excluded Categories")
    st.markdown("**Categories completely off-limits for your brand.**")

    category_options = [
        "gambling", "alcohol", "tobacco", "weapons", "adult_content",
        "pharmaceuticals", "financial_services", "real_estate",
        "insurance", "legal_services", "adult_entertainment"
    ]

    excluded_categories = st.multiselect(
        "Excluded Categories",
        options=[opt.replace("_", " ").title() for opt in category_options],
        default=[opt.replace("_", " ").title() for opt in negative_scope.excluded_categories if opt in category_options],
        help="Categories you will NEVER operate in",
        key="excluded_categories"
    )
    excluded_categories_values = [category_options[[opt.replace("_", " ").title() for opt in category_options].index(c)] for c in excluded_categories]

    if set(excluded_categories_values) != set(negative_scope.excluded_categories):
        changes_made = True

    # Custom category exclusion
    custom_category = st.text_input(
        "Add custom excluded category",
        placeholder="e.g., Cryptocurrency, CBD products",
        key="custom_excluded_category"
    )
    if custom_category and custom_category not in excluded_categories:
        excluded_categories.append(custom_category)
        excluded_categories_values.append(custom_category.lower().replace(" ", "_"))

    # Exclusion Match Types
    if excluded_categories:
        st.markdown("### Match Type for Categories")
        category_match_type = st.selectbox(
            "Category Exclusion Match Type",
            options=["Exact Match", "Semantic Match"],
            index=0 if negative_scope.enforcement_rules.category_match_type == "exact" else 1,
            help="How strictly to match category exclusions",
            key="category_match_type"
        )

        category_match_value = "exact" if category_match_type == "Exact Match" else "semantic"
        if category_match_value != getattr(negative_scope.enforcement_rules, 'category_match_type', 'exact'):
            changes_made = True

    # Excluded Keywords
    st.subheader("🚫 Excluded Keywords")
    st.markdown("**Specific terms that trigger automatic rejection.**")

    excluded_keywords = st.multiselect(
        "Excluded Keywords",
        options=[],  # Start empty for custom keywords
        default=negative_scope.excluded_keywords,
        help="Keywords that will block any content or opportunity",
        key="excluded_keywords"
    )

    # Add common restricted keywords
    common_restricted = [
        "cheap", "fake", "knockoff", "counterfeit", "illegal",
        "unlicensed", "grey market", "black market", "scam"
    ]

    if st.button("Add Common Restricted Keywords", key="add_common_keywords"):
        for keyword in common_restricted:
            if keyword not in excluded_keywords:
                excluded_keywords.append(keyword)
        excluded_keywords = list(set(excluded_keywords))  # Remove duplicates

    # Custom keyword exclusion
    col1, col2 = st.columns([3, 1])
    with col1:
        custom_keyword = st.text_input(
            "Add custom excluded keyword",
            placeholder="e.g., pyramid scheme, MLM",
            key="custom_excluded_keyword"
        )
    with col2:
        if st.button("Add", key="add_custom_keyword") and custom_keyword:
            if custom_keyword not in excluded_keywords:
                excluded_keywords.append(custom_keyword)

    if set(excluded_keywords) != set(negative_scope.excluded_keywords):
        changes_made = True

    # Keyword Match Types
    if excluded_keywords:
        st.markdown("### Match Type for Keywords")
        keyword_match_type = st.selectbox(
            "Keyword Exclusion Match Type",
            options=["Exact Match", "Semantic Match"],
            index=0 if getattr(negative_scope.enforcement_rules, 'keyword_match_type', 'exact') == "exact" else 1,
            help="How strictly to match keyword exclusions",
            key="keyword_match_type"
        )

        keyword_match_value = "exact" if keyword_match_type == "Exact Match" else "semantic"
        if keyword_match_value != getattr(negative_scope.enforcement_rules, 'keyword_match_type', 'exact'):
            changes_made = True

    # Excluded Use Cases
    st.subheader("🚫 Excluded Use Cases")
    st.markdown("**Business models or tactics you will NEVER use.**")

    use_case_options = [
        "resale_arbitrage", "counterfeit_detection", "drop_shipping",
        "affiliate_marketing", "influencer_gifting", "viral_marketing",
        "celebrity_endorsements", "political_campaigning", "religious_content"
    ]

    excluded_use_cases = st.multiselect(
        "Excluded Use Cases",
        options=[opt.replace("_", " ").title() for opt in use_case_options],
        default=[opt.replace("_", " ").title() for opt in negative_scope.excluded_use_cases if opt in use_case_options],
        help="Business tactics you will never employ",
        key="excluded_use_cases"
    )
    excluded_use_cases_values = [use_case_options[[opt.replace("_", " ").title() for opt in use_case_options].index(c)] for c in excluded_use_cases]

    if set(excluded_use_cases_values) != set(negative_scope.excluded_use_cases):
        changes_made = True

    # Custom use case exclusion
    custom_use_case = st.text_input(
        "Add custom excluded use case",
        placeholder="e.g., Subscription traps, Upselling pressure",
        key="custom_excluded_use_case"
    )
    if custom_use_case and custom_use_case not in excluded_use_cases:
        excluded_use_cases.append(custom_use_case)
        excluded_use_cases_values.append(custom_use_case.lower().replace(" ", "_"))

    # Excluded Competitors
    st.subheader("🚫 Excluded Competitors")
    st.markdown("**Specific competitors you will NEVER partner with or reference.**")

    excluded_competitors = st.multiselect(
        "Excluded Competitors",
        options=[],  # Start empty
        default=negative_scope.excluded_competitors,
        help="Competitors you will never work with",
        key="excluded_competitors"
    )

    # Custom competitor exclusion
    custom_competitor = st.text_input(
        "Add excluded competitor domain",
        placeholder="e.g., competitor.com, bad-company.net",
        key="custom_excluded_competitor"
    )
    if custom_competitor and custom_competitor not in excluded_competitors:
        excluded_competitors.append(custom_competitor)

    if set(excluded_competitors) != set(negative_scope.excluded_competitors):
        changes_made = True

    # Enforcement Rules
    st.subheader("⚖️ Enforcement Rules")
    st.markdown("**How strictly to apply these guardrails.**")

    col1, col2 = st.columns(2)

    with col1:
        hard_exclusion = st.checkbox(
            "Hard Exclusion Mode",
            value=getattr(negative_scope.enforcement_rules, 'hard_exclusion', True),
            help="If enabled, violations are automatically blocked with no override",
            key="hard_exclusion"
        )

        allow_model_suggestion = st.checkbox(
            "Allow Model Suggestions",
            value=getattr(negative_scope.enforcement_rules, 'allow_model_suggestion', True),
            help="Allow AI to suggest exclusions based on your industry",
            key="allow_model_suggestion"
        )

    with col2:
        require_human_override = st.checkbox(
            "Require Human Override",
            value=getattr(negative_scope.enforcement_rules, 'require_human_override_for_expansion', True),
            help="Require human approval to expand exclusions",
            key="require_human_override"
        )

    # Check if enforcement rules changed
    current_rules = negative_scope.enforcement_rules
    new_rules = EnforcementRules(
        hard_exclusion=hard_exclusion,
        allow_model_suggestion=allow_model_suggestion,
        require_human_override_for_expansion=require_human_override
    )

    if (new_rules.hard_exclusion != getattr(current_rules, 'hard_exclusion', True) or
        new_rules.allow_model_suggestion != getattr(current_rules, 'allow_model_suggestion', True) or
        new_rules.require_human_override_for_expansion != getattr(current_rules, 'require_human_override_for_expansion', True)):
        changes_made = True

    # Guardrails Summary
    render_guardrails_summary(excluded_categories, excluded_keywords, excluded_use_cases, excluded_competitors)

    # Test Guardrails
    render_guardrails_tester(excluded_keywords, excluded_categories)

    # AI Enhancement
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown("### 🤖 AI Enhancement")
        st.markdown("Get AI suggestions for guardrails based on your industry and competitors.")

    with col2:
        if st.button("🛡️ Suggest Guardrails", use_container_width=True):
            with st.spinner("Analyzing industry restrictions..."):
                # TODO: Integrate with AI service
                st.info("AI guardrail suggestions coming in Gap 3. For now, configure manually.")

    # Validation
    if st.checkbox("Show validation", value=False):
        render_validation_feedback(excluded_categories, excluded_keywords, excluded_use_cases)

    # Update config if changes were made
    if changes_made:
        # Update enforcement rules with match types
        new_rules.category_match_type = locals().get('category_match_value', 'exact')
        new_rules.keyword_match_type = locals().get('keyword_match_value', 'exact')

        updated_negative_scope = NegativeScope(
            excluded_categories=excluded_categories_values,
            excluded_keywords=excluded_keywords,
            excluded_use_cases=excluded_use_cases_values,
            excluded_competitors=excluded_competitors,
            enforcement_rules=new_rules
        )

        updated_config = config.copy()
        updated_config.negative_scope = updated_negative_scope
        return updated_config, True

    return config, False


def render_guardrails_summary(categories: List[str], keywords: List[str], use_cases: List[str], competitors: List[str]):
    """Render guardrails summary."""
    st.subheader("📊 Guardrails Summary")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Excluded Categories", len(categories))
    with col2:
        st.metric("Excluded Keywords", len(keywords))
    with col3:
        st.metric("Excluded Use Cases", len(use_cases))
    with col4:
        st.metric("Excluded Competitors", len(competitors))

    # Show top restrictions
    if categories or keywords or use_cases:
        st.markdown("### Top Restrictions")

        restrictions = []
        restrictions.extend([f"🏷️ {cat}" for cat in categories[:3]])
        restrictions.extend([f"🔍 {kw}" for kw in keywords[:3]])
        restrictions.extend([f"💼 {uc}" for uc in use_cases[:3]])

        if restrictions:
            cols = st.columns(min(3, len(restrictions)))
            for i, restriction in enumerate(restrictions[:3]):
                with cols[i]:
                    st.caption(restriction)


def render_guardrails_tester(keywords: List[str], categories: List[str]):
    """Render guardrails testing interface."""
    st.subheader("🧪 Test Guardrails")

    test_content = st.text_area(
        "Test Content",
        placeholder="Enter content to test against your guardrails...",
        height=100,
        key="test_content"
    )

    if st.button("Test Against Guardrails", key="test_guardrails") and test_content:
        violations = []

        # Test keywords
        test_lower = test_content.lower()
        for keyword in keywords:
            if keyword.lower() in test_lower:
                violations.append(f"🚫 Keyword: '{keyword}'")

        # Test categories (simple check)
        for category in categories:
            category_lower = category.lower()
            if category_lower in test_lower:
                violations.append(f"🏷️ Category: '{category}'")

        if violations:
            st.error("**Violations Found:**")
            for violation in violations:
                st.write(violation)
        else:
            st.success("✅ No guardrail violations detected")


def render_validation_feedback(categories: List[str], keywords: List[str], use_cases: List[str]):
    """Render validation feedback for negative scope."""
    st.markdown("### ✅ Validation")

    errors = []
    warnings = []

    if not categories and not keywords and not use_cases:
        warnings.append("Consider defining at least some guardrails for brand protection")

    # Check for overly broad keywords
    broad_keywords = ["the", "and", "or", "but", "for", "are", "with", "this", "that"]
    broad_found = [kw for kw in keywords if kw.lower() in broad_keywords]

    if broad_found:
        warnings.append(f"Very broad keywords may block legitimate content: {', '.join(broad_found)}")

    # Check for conflicting categories
    conflicting_pairs = [
        ("alcohol", "adult_content"),
        ("gambling", "adult_content"),
        ("weapons", "adult_content")
    ]

    for cat1, cat2 in conflicting_pairs:
        if cat1 in categories and cat2 in categories:
            warnings.append(f"Consider if both '{cat1}' and '{cat2}' exclusions are necessary")

    if errors:
        for error in errors:
            st.error(f"❌ {error}")
    if warnings:
        for warning in warnings:
            st.warning(f"⚠️ {warning}")

    if not errors and not warnings:
        st.success("✅ Guardrails look well-defined!")
