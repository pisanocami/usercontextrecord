"""
Base Module Class
=================

Clase base abstracta para todos los módulos dinámicos del sistema.
Define la interfaz común y lógica de preflight checks.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from brand_intel.core.models import Configuration
from brand_intel.services import UCRService


@dataclass
class ModulePreflightResult:
    """Result of module preflight check."""
    status: str  # "ready", "missing_requirements", "error"
    section_checks: List[Dict[str, Any]]
    entity_checks: List[Dict[str, Any]]
    missing_required: List[str]
    all_requirements_met: bool
    summary: str


@dataclass
class ModuleRunResult:
    """Result of module execution."""
    envelope: Dict[str, Any]  # Metadata about the run
    items: List[Dict[str, Any]]  # Individual results
    summary: Dict[str, Any]  # Aggregated results


class BaseModule(ABC):
    """
    Base class for all dynamic modules.

    Each module implements specific business logic while following
    the common interface for preflight checks, execution, and rendering.
    """

    # Module metadata
    module_id: str
    name: str
    category: str  # "SEO Signal", "Market Trends", "Competitive", "Strategic", "Content"
    layer: str  # "Signal", "Synthesis", "Action"
    description: str
    strategic_question: str
    required_sections: List[str]
    optional_sections: List[str] = []
    data_sources: List[str] = []
    risk_profile: Dict[str, str] = {}  # confidence, risk_if_wrong, inference_type
    caching: Dict[str, str] = {}  # cadence, bust_on_changes

    def __init__(self, ucr_service: UCRService):
        self.ucr_service = ucr_service

    def preflight_check(self, config: Configuration) -> ModulePreflightResult:
        """
        Check if module can execute with current UCR.

        Performs validation of required sections and entities.
        Returns detailed status for UI rendering.
        """
        validation = self.ucr_service.validate(config)

        # Check required sections
        section_checks = []
        for section in self.required_sections:
            section_key = section.upper()
            is_valid = getattr(validation, 'sections_valid', {}).get(section_key, False)
            section_checks.append({
                "section": section_key,
                "required": True,
                "available": is_valid,
                "name": self._get_section_name(section_key)
            })

        # Check optional sections
        for section in self.optional_sections:
            section_key = section.upper()
            is_valid = getattr(validation, 'sections_valid', {}).get(section_key, False)
            section_checks.append({
                "section": section_key,
                "required": False,
                "available": is_valid,
                "name": self._get_section_name(section_key)
            })

        # Entity checks (competitors, keywords, etc.)
        entity_checks = self._perform_entity_checks(config)

        # Determine overall status
        missing_required = [
            check["section"] for check in section_checks
            if check["required"] and not check["available"]
        ]

        missing_entities = [
            check["entity"] for check in entity_checks
            if not check["available"]
        ]

        all_requirements_met = len(missing_required) == 0 and len(missing_entities) == 0

        if not all_requirements_met:
            missing_items = missing_required + missing_entities
            summary = f"Missing requirements: {', '.join(missing_items)}"
            status = "missing_requirements"
        else:
            summary = "Ready to execute"
            status = "ready"

        return ModulePreflightResult(
            status=status,
            section_checks=section_checks,
            entity_checks=entity_checks,
            missing_required=missing_required,
            all_requirements_met=all_requirements_met,
            summary=summary
        )

    def _perform_entity_checks(self, config: Configuration) -> List[Dict[str, Any]]:
        """
        Perform entity-specific checks (can be overridden by subclasses).

        Default implementation checks for approved competitors.
        """
        checks = []

        # Check competitors
        if hasattr(config, 'competitors') and config.competitors:
            approved_competitors = len(config.competitors.get_approved())
            checks.append({
                "entity": "approved_competitors",
                "required": True,
                "available": approved_competitors > 0,
                "count": approved_competitors,
                "message": f"{approved_competitors} approved competitors available"
            })

        # Check brand keywords (if needed)
        if hasattr(config, 'demand_definition') and config.demand_definition:
            brand_keywords = config.demand_definition.get("brand_keywords", {}).get("seed_terms", [])
            checks.append({
                "entity": "brand_keywords",
                "required": False,
                "available": len(brand_keywords) > 0,
                "count": len(brand_keywords),
                "message": f"{len(brand_keywords)} brand keywords defined"
            })

        return checks

    def _get_section_name(self, section_code: str) -> str:
        """Get human-readable section name."""
        section_names = {
            "A": "Brand Context",
            "B": "Category Definition",
            "C": "Competitive Set",
            "D": "Demand Definition",
            "E": "Strategic Intent",
            "F": "Channel Context",
            "G": "Negative Scope",
            "H": "Governance"
        }
        return section_names.get(section_code, section_code)

    @abstractmethod
    async def execute(self, config: Configuration, params: Dict[str, Any]) -> ModuleRunResult:
        """
        Execute the module with given configuration and parameters.

        Args:
            config: UCR configuration
            params: Module-specific parameters from UI

        Returns:
            ModuleRunResult with envelope, items, and summary
        """
        pass

    @abstractmethod
    def render_inputs(self, key_prefix: str = "") -> Dict[str, Any]:
        """
        Render input form for module parameters.

        Args:
            key_prefix: Prefix for Streamlit widget keys to avoid conflicts

        Returns:
            Dictionary of parameter values
        """
        pass

    @abstractmethod
    def render_results(self, result: ModuleRunResult):
        """
        Render module execution results in Streamlit.

        Args:
            result: Results from module execution
        """
        pass

    def get_module_info(self) -> Dict[str, Any]:
        """Get module metadata for display."""
        return {
            "id": self.module_id,
            "name": self.name,
            "category": self.category,
            "layer": self.layer,
            "description": self.description,
            "strategic_question": self.strategic_question,
            "required_sections": self.required_sections,
            "optional_sections": self.optional_sections,
            "data_sources": self.data_sources,
            "risk_profile": self.risk_profile,
            "caching": self.caching
        }

    def get_execution_estimate(self, config: Configuration) -> Dict[str, Any]:
        """
        Estimate execution time and resource requirements.

        Returns:
            Dictionary with time_estimate, data_points, api_calls, etc.
        """
        # Base estimates - can be overridden by subclasses
        estimates = {
            "time_estimate_seconds": 30,
            "data_points_expected": 100,
            "api_calls_required": 1,
            "caching_available": bool(self.caching)
        }

        # Adjust based on configuration size
        if hasattr(config, 'competitors') and config.competitors:
            competitor_count = len(config.competitors.get_approved())
            estimates["time_estimate_seconds"] += competitor_count * 2
            estimates["api_calls_required"] += competitor_count // 5

        return estimates
