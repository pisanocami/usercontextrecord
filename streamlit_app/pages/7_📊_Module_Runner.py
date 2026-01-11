"""
Module Runner Page
==================

Execution interface for dynamic modules.
Handles module selection, parameter input, and result display.
"""

import streamlit as st
import asyncio
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from streamlit_app.modules.registry import get_module, validate_module_availability
from streamlit_app.services.session_manager import SessionManager
from brand_intel.services import UCRService

st.set_page_config(
    page_title="Module Runner | Execute Analysis",
    page_icon="📊",
    layout="wide"
)

session = SessionManager()
ucr_service = UCRService()

# Header
st.title("📊 Module Runner")
st.markdown("Execute dynamic analysis modules with your UCR context")

# UCR Check
ucr = session.get_current_ucr()

if not ucr:
    st.error("""
    ⚠️ **No UCR Selected**

    Module execution requires a valid User Context Record.
    Please select a UCR from the sidebar on the Home page.
    """)
    st.stop()

# Get selected module
selected_module_id = st.session_state.get("selected_module")

if not selected_module_id:
    st.warning("""
    🎯 **No Module Selected**

    Choose a module from the Module Center to begin analysis.
    """)

    # Quick navigation
    if st.button("🧩 Browse Module Center", use_container_width=True):
        st.session_state.active_page = "6_🧩_Module_Center"
        st.rerun()

    st.stop()

# Load module
try:
    module = get_module(selected_module_id, ucr_service)
    module_info = module.get_module_info()
except Exception as e:
    st.error(f"❌ Failed to load module {selected_module_id}: {str(e)}")
    st.stop()

# Module header
st.subheader(f"🎯 {module_info['name']}")
st.markdown(f"**{module_info['description']}**")

# Strategic question
st.info(f"💡 **Strategic Question:** {module_info['strategic_question']}")

# Module metadata
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("Category", module_info['category'])

with col2:
    st.metric("Layer", module_info['layer'])

with col3:
    execution_estimate = module.get_execution_estimate(ucr)
    st.metric("Est. Time", f"~{execution_estimate['time_estimate_seconds']}s")

with col4:
    st.metric("Data Sources", len(module_info.get('data_sources', [])))

# Preflight check
st.markdown("---")
st.subheader("🔍 Preflight Check")

preflight = module.preflight_check(ucr)

# Overall status
if preflight.all_requirements_met:
    st.success("✅ **Ready to Execute** - All requirements met")
else:
    st.error("❌ **Cannot Execute** - Missing requirements")
    st.error(preflight.summary)

# Section requirements
if preflight.section_checks:
    st.markdown("#### 📋 Section Requirements")

    required_sections = [check for check in preflight.section_checks if check.get("required")]
    optional_sections = [check for check in preflight.section_checks if not check.get("required")]

    if required_sections:
        st.markdown("**Required Sections:**")
        for check in required_sections:
            icon = "✅" if check["available"] else "❌"
            st.write(f"{icon} Section {check['section']} - {check['name']}")

    if optional_sections:
        st.markdown("**Optional Sections:**")
        for check in optional_sections:
            icon = "✅" if check["available"] else "⏸️"
            st.caption(f"{icon} Section {check['section']} - {check['name']}")

# Entity requirements
if preflight.entity_checks:
    st.markdown("#### 🏢 Entity Requirements")

    for check in preflight.entity_checks:
        icon = "✅" if check["available"] else "❌"
        entity_type = check.get("entity", "Unknown")
        count = check.get("count", 0)
        message = check.get("message", "")

        if check["available"]:
            st.success(f"{icon} {entity_type.replace('_', ' ').title()}: {message}")
        else:
            st.error(f"{icon} {entity_type.replace('_', ' ').title()}: {message}")

# Execution parameters
if preflight.all_requirements_met:
    st.markdown("---")
    st.subheader("⚙️ Execution Parameters")

    # Module-specific parameter input
    try:
        params = module.render_inputs(key_prefix=f"module_{selected_module_id}_")
    except Exception as e:
        st.error(f"❌ Failed to render parameters: {str(e)}")
        params = None

    # Execution controls
    if params is not None:
        st.markdown("---")
        st.subheader("🚀 Execute Module")

        col1, col2, col3 = st.columns([2, 1, 1])

        with col1:
            execute_button = st.button(
                "▶️ Run Analysis",
                type="primary",
                use_container_width=True,
                key="execute_module"
            )

        with col2:
            # Save parameters for later
            if st.button("💾 Save Parameters", use_container_width=True):
                save_module_parameters(selected_module_id, params)
                st.success("Parameters saved!")

        with col3:
            # Reset parameters
            if st.button("🔄 Reset", use_container_width=True):
                reset_module_parameters(selected_module_id)
                st.rerun()

        # Execution
        if execute_button:
            execute_module_analysis(module, ucr, params)

else:
    st.markdown("---")
    st.subheader("🔧 Fix Requirements")

    st.markdown("""
    To run this module, you need to complete the missing requirements:

    1. **Missing Sections:** Add the required sections to your UCR
    2. **Missing Entities:** Ensure you have the required data (competitors, keywords, etc.)
    3. **UCR Updates:** Make sure your UCR is up to date

    Return to the UCR Editor to make the necessary changes.
    """)

    if st.button("📝 Open UCR Editor", use_container_width=True):
        st.session_state.active_page = "4_📋_UCR_Editor"
        st.info("Navigate to UCR Editor to fix requirements")
        st.rerun()

# Previous results (if any)
st.markdown("---")
st.subheader("📋 Previous Results")

# Check for cached results
previous_results = get_previous_module_results(selected_module_id)

if previous_results:
    st.info(f"Found {len(previous_results)} previous execution(s)")

    for i, result in enumerate(previous_results[-3:]):  # Show last 3
        timestamp = result.get("timestamp", "Unknown")
        status = result.get("status", "completed")

        with st.expander(f"📅 Execution {timestamp} ({status})", expanded=(i == 0)):
            if status == "completed":
                # Show summary
                summary = result.get("summary", {})
                col1, col2, col3 = st.columns(3)

                with col1:
                    st.metric("Items Generated", summary.get("total_items", 0))

                with col2:
                    execution_time = result.get("execution_time_seconds", 0)
                    st.metric("Execution Time", f"{execution_time:.1f}s")

                with col3:
                    st.metric("Status", "✅ Completed")

                # Option to view full results
                if st.button("View Full Results", key=f"view_result_{i}"):
                    display_previous_result(result)

            else:
                st.error(f"Execution failed: {result.get('error', 'Unknown error')}")

else:
    st.info("No previous executions found for this module")

# Navigation
st.markdown("---")
st.subheader("🧭 Navigation")

col1, col2, col3 = st.columns(3)

with col1:
    if st.button("🧩 Module Center", use_container_width=True):
        st.session_state.active_page = "6_🧩_Module_Center"
        st.rerun()

with col2:
    if st.button("🏠 Home", use_container_width=True):
        st.session_state.active_page = "home"
        st.rerun()

with col3:
    if st.button("📈 Quality Score", use_container_width=True):
        st.session_state.active_page = "8_📈_Quality_Score"
        st.rerun()

def execute_module_analysis(module, ucr, params):
    """Execute the module analysis."""
    progress_bar = st.progress(0)
    status_text = st.empty()

    try:
        # Start execution
        status_text.text("🚀 Initializing module execution...")
        progress_bar.progress(10)

        # Record start time
        start_time = asyncio.get_event_loop().time()

        status_text.text("⚙️ Running analysis...")
        progress_bar.progress(30)

        # Execute module
        result = asyncio.run(module.execute(ucr, params))

        progress_bar.progress(90)
        status_text.text("📊 Processing results...")

        # Record execution time
        end_time = asyncio.get_event_loop().time()
        execution_time = end_time - start_time

        # Store results
        save_module_result(selected_module_id, result, execution_time)

        progress_bar.progress(100)
        status_text.text("✅ Analysis complete!")

        # Show results
        st.success("🎉 Module execution completed successfully!")
        module.render_results(result)

        # Add to run trace
        session.add_run_trace({
            "operation": "module_execution",
            "module_id": selected_module_id,
            "module_name": module_info['name'],
            "ucr_id": ucr.get("id"),
            "execution_time_seconds": execution_time,
            "result_summary": result.summary,
            "timestamp": result.envelope.get("execution_time")
        })

    except Exception as e:
        progress_bar.progress(0)
        status_text.text("❌ Execution failed")

        error_msg = f"Module execution failed: {str(e)}"
        st.error(error_msg)

        # Store error result
        save_module_result(selected_module_id, None, 0, error=str(e))

        # Add error to run trace
        session.add_run_trace({
            "operation": "module_execution_failed",
            "module_id": selected_module_id,
            "module_name": module_info['name'],
            "error": str(e),
            "timestamp": asyncio.get_event_loop().time()
        })

def save_module_parameters(module_id: str, params: Dict[str, Any]):
    """Save module parameters for later use."""
    key = f"module_params_{module_id}"
    st.session_state[key] = params

def get_saved_module_parameters(module_id: str) -> Optional[Dict[str, Any]]:
    """Get saved module parameters."""
    key = f"module_params_{module_id}"
    return st.session_state.get(key)

def reset_module_parameters(module_id: str):
    """Reset saved module parameters."""
    key = f"module_params_{module_id}"
    if key in st.session_state:
        del st.session_state[key]

def save_module_result(module_id: str, result, execution_time: float, error: str = None):
    """Save module execution result."""
    result_data = {
        "module_id": module_id,
        "timestamp": asyncio.get_event_loop().time(),
        "execution_time_seconds": execution_time,
        "status": "failed" if error else "completed"
    }

    if error:
        result_data["error"] = error
    else:
        result_data["result"] = result
        result_data["summary"] = result.summary

    # Store in session state (would be database in production)
    results_key = f"module_results_{module_id}"
    if results_key not in st.session_state:
        st.session_state[results_key] = []

    st.session_state[results_key].append(result_data)

    # Keep only last 10 results
    if len(st.session_state[results_key]) > 10:
        st.session_state[results_key] = st.session_state[results_key][-10:]

def get_previous_module_results(module_id: str) -> list:
    """Get previous execution results for a module."""
    results_key = f"module_results_{module_id}"
    return st.session_state.get(results_key, [])

def display_previous_result(result_data: Dict[str, Any]):
    """Display a previous module execution result."""
    if result_data.get("status") == "completed":
        # This would render the stored result using the module's render_results method
        st.info("Previous result display not implemented yet")
        st.json(result_data.get("summary", {}))
    else:
        st.error(f"Previous execution failed: {result_data.get('error', 'Unknown error')}")

# Footer
st.markdown("---")
st.caption("💡 **Tip:** Module results are cached for faster re-execution. Use saved parameters to quickly rerun analyses.")
st.caption("🎯 **UCR FIRST:** Module execution is blocked if UCR requirements aren't met.")
