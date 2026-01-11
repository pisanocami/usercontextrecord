"""
Module Center Page
==================

Central hub for discovering and launching dynamic modules.
Provides categorized browsing and module selection.
"""

import streamlit as st
import sys
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from streamlit_app.modules.registry import (
    get_modules_by_category, search_modules, MODULE_CATEGORIES,
    get_module_requirements, validate_module_availability
)
from streamlit_app.services.session_manager import SessionManager

st.set_page_config(
    page_title="Module Center | Dynamic Analysis",
    page_icon="🧩",
    layout="wide"
)

session = SessionManager()

# Header
st.title("🧩 Module Center")
st.markdown("Discover and launch dynamic analysis modules powered by your UCR")

# UCR Check
ucr = session.get_current_ucr()

if not ucr:
    st.error("""
    ⚠️ **No UCR Selected**

    Dynamic modules require a valid User Context Record.
    Please select a UCR from the sidebar on the Home page.
    """)
    st.stop()

# Search and Filter Controls
st.subheader("🔍 Discover Modules")

col1, col2, col3 = st.columns([2, 1, 1])

with col1:
    search_query = st.text_input(
        "Search modules",
        placeholder="Search by name, description, or category...",
        key="module_search"
    )

with col2:
    category_filter = st.selectbox(
        "Filter by Category",
        options=["All Categories"] + list(MODULE_CATEGORIES.keys()),
        index=0,
        key="category_filter"
    )

with col3:
    layer_filter = st.selectbox(
        "Filter by Layer",
        options=["All Layers", "Signal", "Synthesis", "Action"],
        index=0,
        key="layer_filter"
    )

# Get modules based on filters
if search_query:
    modules_data = search_modules(search_query)
    display_title = f"🔍 Search Results for '{search_query}'"
else:
    categorized_modules = get_modules_by_category()
    if category_filter != "All Categories":
        modules_data = categorized_modules.get(category_filter, [])
        display_title = f"📂 {category_filter} Modules"
    else:
        modules_data = []
        for category, modules in categorized_modules.items():
            modules_data.extend(modules)
        display_title = "🧩 All Modules"

# Apply layer filter
if layer_filter != "All Layers":
    modules_data = [m for m in modules_data if m.get("layer") == layer_filter]

# Display modules
st.subheader(display_title)

if not modules_data:
    if search_query:
        st.info(f"No modules found matching '{search_query}'. Try different keywords.")
    else:
        st.info("No modules available in the selected category.")
else:
    st.caption(f"Showing {len(modules_data)} module{'s' if len(modules_data) != 1 else ''}")

    # Group by category for display
    modules_by_category = {}
    for module in modules_data:
        category = module.get("category", "Unknown")
        if category not in modules_by_category:
            modules_by_category[category] = []
        modules_by_category[category].append(module)

    # Display modules by category
    for category_name, category_modules in modules_by_category.items():
        category_info = MODULE_CATEGORIES.get(category_name, {
            "icon": "📦",
            "description": "Module category",
            "color": "#6c757d"
        })

        with st.expander(f"{category_info['icon']} {category_name} ({len(category_modules)} modules)", expanded=True):
            st.caption(category_info["description"])

            # Display modules in a grid
            cols = st.columns(min(3, len(category_modules)))

            for i, module in enumerate(category_modules):
                with cols[i % len(cols)]:
                    render_module_card(module)

# Module details sidebar
st.sidebar.markdown("---")
st.sidebar.markdown("### 📋 Module Details")

if st.sidebar.button("🔄 Refresh Module List", use_container_width=True):
    st.rerun()

# Quick stats
st.sidebar.markdown("### 📊 Module Statistics")
modules_by_category = get_modules_by_category()
total_modules = sum(len(modules) for modules in modules_by_category.values())

st.sidebar.metric("Total Modules", total_modules)
st.sidebar.metric("Categories", len(modules_by_category))

# Layer distribution
from streamlit_app.modules.registry import get_modules_by_layer
modules_by_layer = get_modules_by_layer()
for layer, modules in modules_by_layer.items():
    st.sidebar.metric(f"{layer} Layer", len(modules))

def render_module_card(module: Dict[str, Any]):
    """Render a module card with key information."""
    module_id = module.get("id", "unknown")
    name = module.get("name", "Unknown Module")
    category = module.get("category", "Unknown")
    layer = module.get("layer", "Unknown")
    description = module.get("description", "No description available")
    strategic_question = module.get("strategic_question", "No strategic question")

    # Category styling
    category_info = MODULE_CATEGORIES.get(category, {"color": "#6c757d", "icon": "📦"})

    # Create card with HTML for better styling
    card_html = f"""
    <div style="
        border: 2px solid {category_info['color']}40;
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        background: linear-gradient(135deg, {category_info['color']}10 0%, {category_info['color']}05 100%);
        transition: all 0.3s ease;
    ">
        <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
            <div style="font-size: 24px; margin-right: 12px; color: {category_info['color']};">
                {category_info['icon']}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">
                    {name}
                </div>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <span style="
                        background: {category_info['color']}20;
                        color: {category_info['color']};
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 600;
                    ">
                        {category}
                    </span>
                    <span style="
                        background: #e9ecef;
                        color: #495057;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 600;
                    ">
                        {layer}
                    </span>
                </div>
            </div>
        </div>

        <div style="font-size: 14px; color: #666; margin-bottom: 12px; line-height: 1.4;">
            {description}
        </div>

        <div style="font-size: 13px; color: #495057; font-style: italic; margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
            "{strategic_question}"
        </div>
    </div>
    """

    st.markdown(card_html, unsafe_allow_html=True)

    # Module actions
    col1, col2, col3 = st.columns(3)

    with col1:
        if st.button("📖 Details", key=f"details_{module_id}", use_container_width=True):
            show_module_details(module)

    with col2:
        # Check availability
        availability = validate_module_availability(module_id, None, ucr)  # We'll handle UCR service later
        can_run = availability.get("available", False)

        if can_run:
            button_text = "▶️ Run"
            button_type = "primary"
        else:
            button_text = "⚠️ Check"
            button_type = "secondary"

        if st.button(button_text, key=f"run_{module_id}", type=button_type, use_container_width=True):
            if can_run:
                launch_module(module_id)
            else:
                show_availability_check(module_id, availability)

    with col3:
        if st.button("⭐ Favorite", key=f"favorite_{module_id}", use_container_width=True):
            st.info("Favorites feature coming soon!")

def show_module_details(module: Dict[str, Any]):
    """Show detailed information about a module."""
    module_id = module.get("id", "unknown")

    with st.expander(f"📖 {module.get('name', 'Module')} Details", expanded=True):
        # Basic info
        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Module ID:**")
            st.code(module_id, language="")

            st.markdown("**Category:**")
            st.write(module.get("category", "Unknown"))

            st.markdown("**Layer:**")
            st.write(module.get("layer", "Unknown"))

        with col2:
            st.markdown("**Strategic Question:**")
            st.info(module.get("strategic_question", "Not specified"))

        # Requirements
        requirements = get_module_requirements(module_id)

        if "error" not in requirements:
            st.markdown("### 📋 Requirements")

            col1, col2 = st.columns(2)

            with col1:
                st.markdown("**Required Sections:**")
                for section in requirements.get("required_sections", []):
                    st.code(f"A{section}", language="")

                st.markdown("**Optional Sections:**")
                for section in requirements.get("optional_sections", []):
                    st.caption(f"A{section}")

            with col2:
                st.markdown("**Data Sources:**")
                for source in requirements.get("data_sources", []):
                    st.info(f"• {source}")

                st.markdown("**Risk Profile:**")
                risk = requirements.get("risk_profile", {})
                st.write(f"**Confidence:** {risk.get('confidence', 'unknown')}")
                st.write(f"**Risk if Wrong:** {risk.get('risk_if_wrong', 'unknown')}")

            # Execution estimate
            estimate = requirements.get("estimated_execution_time", {})
            if estimate:
                st.markdown("### ⏱️ Execution Estimate")
                st.write(f"**Time:** ~{estimate.get('time_estimate_seconds', 30)} seconds")
                st.write(f"**API Calls:** {estimate.get('api_calls_required', 1)}")
                if estimate.get("caching_available"):
                    st.success("✅ Caching available for faster subsequent runs")

        # Availability check
        if st.button("🔍 Check Availability", key=f"check_avail_{module_id}"):
            availability = validate_module_availability(module_id, None, ucr)  # Simplified
            show_availability_check(module_id, availability)

def show_availability_check(module_id: str, availability: Dict[str, Any]):
    """Show module availability check results."""
    with st.expander("🔍 Availability Check Results", expanded=True):
        if availability.get("available"):
            st.success("✅ Module is ready to run!")
            st.info(availability.get("summary", "All requirements met"))

            if st.button("🚀 Launch Module", key=f"launch_{module_id}"):
                launch_module(module_id)
        else:
            st.error("❌ Module cannot be executed")
            st.error(availability.get("summary", "Requirements not met"))

            # Show missing requirements
            missing = availability.get("missing_required", [])
            if missing:
                st.warning("**Missing Required Sections:**")
                for req in missing:
                    st.write(f"• Section {req}")

def launch_module(module_id: str):
    """Launch a module by setting session state."""
    st.session_state.selected_module = module_id
    st.session_state.active_page = "7_📊_Module_Runner"
    st.success(f"Launching {module_id}...")
    st.info("Navigate to Module Runner page to execute the analysis")
    st.balloons()

# Footer
st.markdown("---")
st.caption("💡 **Tip:** Start with Signal layer modules for data gathering, then use Synthesis modules for analysis, and Action modules for implementation.")
st.caption("🎯 **UCR FIRST:** All modules validate against your User Context Record before execution.")
