"""
Unit Tests - Dynamic Modules System
====================================

Tests for the dynamic modules system including base module,
registry, and individual modules.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

# Add project paths
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "brand_intel"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "streamlit_app"))


class TestBaseModule:
    """Tests for the base module functionality."""

    @pytest.fixture
    def mock_ucr_service(self):
        """Mock UCR service for testing."""
        mock_service = Mock()
        mock_validation = Mock()
        mock_validation.sections_valid = {"A": True, "B": True, "C": True, "G": True}
        mock_validation.warnings = []
        mock_validation.blocked_reasons = []
        mock_service.validate.return_value = mock_validation
        return mock_service

    @pytest.fixture
    def sample_config(self):
        """Sample configuration for testing."""
        from brand_intel.core.models import (
            Configuration, Brand, CategoryDefinition, Competitors,
            StrategicIntent, NegativeScope, Governance
        )

        return Configuration(
            name="Test UCR",
            brand=Brand(name="Test Brand", domain="test.com", industry="Tech"),
            category_definition=CategoryDefinition(
                primary_category="Software",
                included=["Tools"],
                excluded=["Hardware"]
            ),
            competitors=Competitors(),
            strategic_intent=StrategicIntent(),
            negative_scope=NegativeScope(),
            governance=Governance()
        )

    def test_base_module_creation(self, mock_ucr_service):
        """Test base module can be instantiated."""
        from streamlit_app.modules.base_module import BaseModule

        # Create a concrete subclass for testing
        class TestModule(BaseModule):
            module_id = "test.module.v1"
            name = "Test Module"
            category = "Test"
            layer = "Signal"
            description = "Test module"
            strategic_question = "Test question?"
            required_sections = ["A", "B"]

        module = TestModule(mock_ucr_service)
        assert module.module_id == "test.module.v1"
        assert module.name == "Test Module"
        assert module.required_sections == ["A", "B"]

    def test_preflight_check_success(self, mock_ucr_service, sample_config):
        """Test successful preflight check."""
        from streamlit_app.modules.base_module import BaseModule

        class TestModule(BaseModule):
            required_sections = ["A", "B"]
            optional_sections = ["C"]

        module = TestModule(mock_ucr_service)

        result = module.preflight_check(sample_config)

        assert result.all_requirements_met is True
        assert result.status == "ready"
        assert len(result.section_checks) == 3  # A, B, C
        assert len(result.missing_required) == 0

    def test_preflight_check_missing_requirements(self, mock_ucr_service, sample_config):
        """Test preflight check with missing requirements."""
        from streamlit_app.modules.base_module import BaseModule

        # Mock validation with missing section
        mock_validation = Mock()
        mock_validation.sections_valid = {"A": True, "B": False, "C": True, "G": True}
        mock_validation.warnings = []
        mock_validation.blocked_reasons = []
        mock_ucr_service.validate.return_value = mock_validation

        class TestModule(BaseModule):
            required_sections = ["A", "B"]

        module = TestModule(mock_ucr_service)

        result = module.preflight_check(sample_config)

        assert result.all_requirements_met is False
        assert result.status == "missing_requirements"
        assert "B" in result.missing_required

    def test_get_module_info(self, mock_ucr_service):
        """Test getting module info."""
        from streamlit_app.modules.base_module import BaseModule

        class TestModule(BaseModule):
            module_id = "test.module.v1"
            name = "Test Module"
            category = "Test"
            layer = "Signal"
            description = "Test description"
            strategic_question = "Test question?"
            required_sections = ["A"]

        module = TestModule(mock_ucr_service)
        info = module.get_module_info()

        assert info["id"] == "test.module.v1"
        assert info["name"] == "Test Module"
        assert info["category"] == "Test"
        assert info["layer"] == "Signal"
        assert info["description"] == "Test description"
        assert info["strategic_question"] == "Test question?"

    def test_get_execution_estimate(self, mock_ucr_service, sample_config):
        """Test execution estimate calculation."""
        from streamlit_app.modules.base_module import BaseModule

        class TestModule(BaseModule):
            pass

        module = TestModule(mock_ucr_service)
        estimate = module.get_execution_estimate(sample_config)

        assert "time_estimate_seconds" in estimate
        assert "data_points_expected" in estimate
        assert "api_calls_required" in estimate
        assert isinstance(estimate["time_estimate_seconds"], (int, float))


class TestModuleRegistry:
    """Tests for the module registry."""

    def test_get_module_valid(self):
        """Test getting a valid module."""
        from streamlit_app.modules.registry import get_module
        from streamlit_app.services.session_manager import SessionManager

        # Mock UCR service
        mock_ucr_service = Mock()

        try:
            module = get_module("seo.keyword_gap_visibility.v1", mock_ucr_service)
            assert module is not None
            assert module.module_id == "seo.keyword_gap_visibility.v1"
        except ImportError:
            # Skip if modules not available
            pytest.skip("Module imports not available")

    def test_get_module_invalid(self):
        """Test getting an invalid module."""
        from streamlit_app.modules.registry import get_module

        mock_ucr_service = Mock()

        with pytest.raises(ValueError, match="Unknown module"):
            get_module("invalid.module.id", mock_ucr_service)

    def test_get_all_modules(self):
        """Test getting all modules."""
        from streamlit_app.modules.registry import get_all_modules

        try:
            modules = get_all_modules()
            assert isinstance(modules, list)

            # Should have at least some modules if imports work
            if len(modules) > 0:
                module = modules[0]
                assert "id" in module
                assert "name" in module
                assert "category" in module
                assert "layer" in module

        except ImportError:
            pytest.skip("Module imports not available")

    def test_get_modules_by_category(self):
        """Test getting modules by category."""
        from streamlit_app.modules.registry import get_modules_by_category

        try:
            categorized = get_modules_by_category()
            assert isinstance(categorized, dict)

            # Should have expected categories
            expected_categories = ["SEO Signal", "Market Trends", "Competitive", "Strategic", "Content"]
            for category in expected_categories:
                if category in categorized:
                    assert isinstance(categorized[category], list)

        except ImportError:
            pytest.skip("Module imports not available")

    def test_search_modules(self):
        """Test module search functionality."""
        from streamlit_app.modules.registry import search_modules

        try:
            # Search for a common term
            results = search_modules("keyword")
            assert isinstance(results, list)

            # Results should contain the search term
            for result in results:
                searchable = (
                    result.get("name", "").lower() +
                    result.get("description", "").lower() +
                    result.get("strategic_question", "").lower()
                )
                assert "keyword" in searchable.lower()

        except ImportError:
            pytest.skip("Module imports not available")

    def test_get_module_requirements(self):
        """Test getting module requirements."""
        from streamlit_app.modules.registry import get_module_requirements

        try:
            requirements = get_module_requirements("seo.keyword_gap_visibility.v1")

            if "error" not in requirements:
                assert "required_sections" in requirements
                assert "optional_sections" in requirements
                assert "data_sources" in requirements
                assert "risk_profile" in requirements
                assert isinstance(requirements["required_sections"], list)

        except ImportError:
            pytest.skip("Module imports not available")


class TestKeywordGapModule:
    """Tests for the Keyword Gap module."""

    @pytest.fixture
    def mock_ucr_service(self):
        """Mock UCR service for testing."""
        mock_service = Mock()
        return mock_service

    @pytest.fixture
    def sample_config(self):
        """Sample configuration for testing."""
        from brand_intel.core.models import (
            Configuration, Brand, CategoryDefinition, Competitors,
            StrategicIntent, NegativeScope, Governance
        )

        return Configuration(
            name="Test UCR",
            brand=Brand(name="Test Brand", domain="test.com", industry="Tech"),
            category_definition=CategoryDefinition(primary_category="Software"),
            competitors=Competitors(),
            strategic_intent=StrategicIntent(),
            negative_scope=NegativeScope(),
            governance=Governance()
        )

    def test_keyword_gap_module_creation(self, mock_ucr_service):
        """Test Keyword Gap module can be created."""
        try:
            from streamlit_app.modules.keyword_gap import KeywordGapModule

            module = KeywordGapModule(mock_ucr_service)
            assert module.module_id == "seo.keyword_gap_visibility.v1"
            assert module.name == "Keyword Gap & Visibility"
            assert module.category == "SEO Signal"
            assert module.required_sections == ["A", "B", "C"]

        except ImportError:
            pytest.skip("Keyword Gap module not available")

    @pytest.mark.asyncio
    async def test_keyword_gap_execution(self, mock_ucr_service, sample_config):
        """Test Keyword Gap module execution."""
        try:
            from streamlit_app.modules.keyword_gap import KeywordGapModule

            module = KeywordGapModule(mock_ucr_service)

            params = {
                "target_keyword": "test keyword",
                "min_search_volume": 500,
                "max_competitors": 3,
                "position_range": [1, 20]
            }

            result = await module.execute(sample_config, params)

            assert result is not None
            assert hasattr(result, 'envelope')
            assert hasattr(result, 'items')
            assert hasattr(result, 'summary')
            assert result.summary.get("target_keyword") == "test keyword"

        except ImportError:
            pytest.skip("Keyword Gap module not available")

    def test_keyword_gap_title_generation(self):
        """Test title generation logic."""
        try:
            from streamlit_app.modules.keyword_gap import KeywordGapModule

            module = KeywordGapModule(Mock())

            # Test different content types
            title_blog = module._generate_title("test keyword", "blog_post")
            assert isinstance(title_blog, str)
            assert len(title_blog) > 0

            title_landing = module._generate_title("test keyword", "landing_page")
            assert isinstance(title_landing, str)
            assert len(title_landing) > 0

        except ImportError:
            pytest.skip("Keyword Gap module not available")


class TestModuleIntegration:
    """Integration tests for module system."""

    def test_module_imports(self):
        """Test that all modules can be imported."""
        try:
            from streamlit_app.modules import (
                BaseModule, ModulePreflightResult, ModuleRunResult,
                get_module, get_all_modules
            )
            # If we get here, imports work
            assert True
        except ImportError as e:
            pytest.fail(f"Module imports failed: {e}")

    def test_registry_functionality(self):
        """Test registry provides expected functionality."""
        from streamlit_app.modules.registry import (
            get_all_modules, get_modules_by_category,
            MODULE_CATEGORIES
        )

        # Test basic registry functions
        assert callable(get_all_modules)
        assert callable(get_modules_by_category)
        assert isinstance(MODULE_CATEGORIES, dict)

        # Test category definitions
        assert "SEO Signal" in MODULE_CATEGORIES
        assert "icon" in MODULE_CATEGORIES["SEO Signal"]
        assert "description" in MODULE_CATEGORIES["SEO Signal"]

    def test_module_result_structure(self):
        """Test ModuleRunResult structure."""
        from streamlit_app.modules.base_module import ModuleRunResult

        result = ModuleRunResult(
            envelope={"test": "data"},
            items=[{"item": "data"}],
            summary={"summary": "data"}
        )

        assert result.envelope == {"test": "data"}
        assert result.items == [{"item": "data"}]
        assert result.summary == {"summary": "data"}

    def test_module_preflight_structure(self):
        """Test ModulePreflightResult structure."""
        from streamlit_app.modules.base_module import ModulePreflightResult

        result = ModulePreflightResult(
            status="ready",
            section_checks=[],
            entity_checks=[],
            missing_required=[],
            all_requirements_met=True,
            summary="Test summary"
        )

        assert result.status == "ready"
        assert result.all_requirements_met is True
        assert result.summary == "Test summary"

    def test_module_system_cohesion(self):
        """Test that the module system components work together."""
        from streamlit_app.modules.base_module import BaseModule
        from streamlit_app.modules.registry import get_all_modules

        # Test that we can get modules
        try:
            modules = get_all_modules()
            assert isinstance(modules, list)

            # If we have modules, test that they have required attributes
            for module_info in modules:
                assert "id" in module_info
                assert "name" in module_info
                assert "category" in module_info

        except ImportError:
            pytest.skip("Module system not fully available")
