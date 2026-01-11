"""
Module Registry
===============

Central registry for all dynamic modules in the system.
Provides module discovery, instantiation, and metadata access.
"""

from typing import Dict, List, Type, Optional
from streamlit_app.modules.base_module import BaseModule
from brand_intel.services import UCRService

# Import all module classes
from streamlit_app.modules.keyword_gap import KeywordGapModule
from streamlit_app.modules.market_demand import MarketDemandModule
from streamlit_app.modules.competitive_radar import CompetitiveRadarModule
from streamlit_app.modules.swot_analysis import SWOTAnalysisModule
from streamlit_app.modules.content_brief import ContentBriefModule

# Module registry mapping
MODULE_REGISTRY: Dict[str, Type[BaseModule]] = {
    # SEO Signal Layer
    "seo.keyword_gap_visibility.v1": KeywordGapModule,

    # Market Trends Layer
    "market.category_demand_trend.v1": MarketDemandModule,

    # Competitive Layer
    "competitive.radar.v1": CompetitiveRadarModule,

    # Strategic Layer
    "strategic.swot.v1": SWOTAnalysisModule,

    # Content Layer
    "content.brief.v1": ContentBriefModule,
}

# Module metadata for UI display
MODULE_CATEGORIES = {
    "SEO Signal": {
        "description": "Search engine optimization and keyword analysis modules",
        "color": "#007bff",
        "icon": "🔍"
    },
    "Market Trends": {
        "description": "Market analysis and demand trend modules",
        "color": "#28a745",
        "icon": "📈"
    },
    "Competitive": {
        "description": "Competitive intelligence and analysis modules",
        "color": "#dc3545",
        "icon": "🏆"
    },
    "Strategic": {
        "description": "Strategic analysis and planning modules",
        "color": "#6f42c1",
        "icon": "🎯"
    },
    "Content": {
        "description": "Content creation and marketing modules",
        "color": "#fd7e14",
        "icon": "📝"
    }
}

def get_module(module_id: str, ucr_service: UCRService) -> BaseModule:
    """
    Get a module instance by ID.

    Args:
        module_id: The unique identifier for the module
        ucr_service: UCR service instance

    Returns:
        Instantiated module

    Raises:
        ValueError: If module_id is not found in registry
    """
    module_class = MODULE_REGISTRY.get(module_id)
    if not module_class:
        available_modules = list(MODULE_REGISTRY.keys())
        raise ValueError(f"Unknown module: {module_id}. Available modules: {available_modules}")

    return module_class(ucr_service)

def get_all_modules() -> List[Dict[str, any]]:
    """
    Get all available modules with metadata.

    Returns:
        List of module metadata dictionaries
    """
    modules = []
    for module_id, module_class in MODULE_REGISTRY.items():
        # Create a temporary instance to get metadata (without UCR service)
        try:
            # We'll create a minimal instance just for metadata
            temp_instance = module_class.__new__(module_class)
            metadata = temp_instance.get_module_info()
            modules.append(metadata)
        except Exception:
            # Fallback metadata if instantiation fails
            modules.append({
                "id": module_id,
                "name": module_class.__name__.replace("Module", "").title(),
                "category": "Unknown",
                "layer": "Unknown",
                "description": "Module description not available",
                "strategic_question": "Strategic question not available"
            })

    return modules

def get_modules_by_category() -> Dict[str, List[Dict[str, any]]]:
    """
    Get modules organized by category.

    Returns:
        Dictionary with categories as keys and module lists as values
    """
    categorized = {}
    modules = get_all_modules()

    for module in modules:
        category = module.get("category", "Unknown")
        if category not in categorized:
            categorized[category] = []
        categorized[category].append(module)

    return categorized

def get_modules_by_layer() -> Dict[str, List[Dict[str, any]]]:
    """
    Get modules organized by layer (Signal, Synthesis, Action).

    Returns:
        Dictionary with layers as keys and module lists as values
    """
    layered = {}
    modules = get_all_modules()

    for module in modules:
        layer = module.get("layer", "Unknown")
        if layer not in layered:
            layered[layer] = []
        layered[layer].append(module)

    return layered

def search_modules(query: str) -> List[Dict[str, any]]:
    """
    Search modules by name, description, or strategic question.

    Args:
        query: Search query string

    Returns:
        List of matching modules
    """
    query_lower = query.lower()
    all_modules = get_all_modules()
    matches = []

    for module in all_modules:
        searchable_text = (
            module.get("name", "").lower() + " " +
            module.get("description", "").lower() + " " +
            module.get("strategic_question", "").lower() + " " +
            module.get("category", "").lower()
        )

        if query_lower in searchable_text:
            matches.append(module)

    return matches

def get_module_requirements(module_id: str) -> Dict[str, any]:
    """
    Get detailed requirements for a specific module.

    Args:
        module_id: Module identifier

    Returns:
        Dictionary with module requirements and metadata
    """
    try:
        module_class = MODULE_REGISTRY[module_id]
        temp_instance = module_class.__new__(module_class)

        return {
            "module_id": module_id,
            "required_sections": temp_instance.required_sections,
            "optional_sections": temp_instance.optional_sections,
            "data_sources": temp_instance.data_sources,
            "risk_profile": temp_instance.risk_profile,
            "caching": temp_instance.caching,
            "estimated_execution_time": temp_instance.get_execution_estimate(None)  # Will work without config
        }
    except (KeyError, AttributeError):
        return {
            "error": f"Module {module_id} not found or invalid",
            "module_id": module_id
        }

def validate_module_availability(module_id: str, ucr_service: UCRService, config) -> Dict[str, any]:
    """
    Check if a module can be executed with current UCR.

    Args:
        module_id: Module identifier
        ucr_service: UCR service instance
        config: Current configuration

    Returns:
        Dictionary with availability status and details
    """
    try:
        module = get_module(module_id, ucr_service)
        preflight = module.preflight_check(config)

        return {
            "module_id": module_id,
            "available": preflight.all_requirements_met,
            "status": preflight.status,
            "missing_requirements": preflight.missing_required,
            "section_status": preflight.section_checks,
            "entity_status": preflight.entity_checks,
            "summary": preflight.summary
        }
    except Exception as e:
        return {
            "module_id": module_id,
            "available": False,
            "error": str(e)
        }

# Export key functions
__all__ = [
    "get_module",
    "get_all_modules",
    "get_modules_by_category",
    "get_modules_by_layer",
    "search_modules",
    "get_module_requirements",
    "validate_module_availability",
    "MODULE_CATEGORIES"
]
