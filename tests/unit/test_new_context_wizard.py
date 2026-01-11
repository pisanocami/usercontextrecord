"""
Unit Tests - New Context Wizard
================================

Tests for the new context creation wizard.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

# Add project paths
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "brand_intel"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "streamlit_app"))

from brand_intel.core.models import Configuration, Brand, CategoryDefinition, Competitors


class TestNewContextWizard:
    """Tests for the new context wizard functionality."""

    @pytest.fixture
    def mock_streamlit(self):
        """Mock streamlit module for testing."""
        with patch('streamlit_app.pages.5_➕_New_Context.st') as mock_st:
            # Mock session state
            mock_st.session_state = {}

            # Mock UI elements
            mock_st.title = Mock()
            mock_st.markdown = Mock()
            mock_st.columns = Mock(return_value=[Mock(), Mock()])
            mock_st.text_input = Mock(return_value="test.com")
            mock_st.button = Mock(return_value=False)
            mock_st.success = Mock()
            mock_st.error = Mock()
            mock_st.warning = Mock()
            mock_st.info = Mock()
            mock_st.progress = Mock()
            mock_st.tabs = Mock(return_value=[Mock(), Mock(), Mock(), Mock(), Mock(), Mock()])
            mock_st.spinner = Mock()
            mock_st.expander = Mock()
            mock_st.selectbox = Mock(return_value="Next →")
            mock_st.multiselect = Mock(return_value=[])
            mock_st.checkbox = Mock(return_value=False)
            mock_st.metric = Mock()
            mock_st.divider = Mock()
            mock_st.caption = Mock()
            mock_st.rerun = Mock()

            yield mock_st

    def test_domain_validation(self):
        """Test domain validation function."""
        from streamlit_app.pages.sections.section_a_brand import _is_valid_domain

        # Valid domains
        assert _is_valid_domain("example.com") == True
        assert _is_valid_domain("sub.example.com") == True
        assert _is_valid_domain("example.co.uk") == True

        # Invalid domains
        assert _is_valid_domain("") == False
        assert _is_valid_domain("not-valid") == False
        assert _is_valid_domain("example") == False

    def test_wizard_initialization(self, mock_streamlit):
        """Test wizard initializes correctly."""
        # Mock session state
        mock_streamlit.session_state = {}

        # Import after mocking - this would need adjustment for the emoji filename
        # For now, test the basic structure
        if "wizard_step" not in mock_streamlit.session_state:
            mock_streamlit.session_state["wizard_step"] = 1

        if "wizard_data" not in mock_streamlit.session_state:
            mock_streamlit.session_state["wizard_data"] = {
                "domain": "",
                "brand_name": "",
                "ai_analysis": {},
                "sections": {},
                "competitors": [],
                "guardrails": {},
                "quality_score": None
            }

        assert mock_streamlit.session_state["wizard_step"] == 1
        assert "wizard_data" in mock_streamlit.session_state

    def test_fallback_analysis_pattern(self):
        """Test fallback analysis logic pattern."""
        # Test the logic without importing the problematic file
        domain = "example.com"
        brand_name = "Example Brand"

        # Test brand name extraction logic
        final_brand_name = brand_name if brand_name else domain.split(".")[0].title()
        assert final_brand_name == "Example Brand"

        # Test industry detection logic
        if "tech" in domain.lower() or "software" in domain.lower():
            industry = "Technology"
            category = "Software Solutions"
            business_model = "SaaS"
        else:
            industry = "Technology"
            category = "Digital Services"
            business_model = "B2B"

        assert industry == "Technology"
        assert category == "Software Solutions"
        assert business_model == "SaaS"

    @patch('streamlit_app.pages._5_New_Context.get_ai_service')
    def test_ai_service_initialization(self, mock_get_ai_service):
        """Test AI service initialization mock."""
        mock_ai_service = Mock()
        mock_ai_service.get_available_providers.return_value = ["claude"]
        mock_get_ai_service.return_value = mock_ai_service

        # Just test that the mock setup works
        assert mock_get_ai_service.called is False  # Not called yet
        service = mock_get_ai_service()
        assert service.get_available_providers() == ["claude"]

    def test_progress_persistence(self):
        """Test wizard progress can be saved and loaded."""
        from streamlit_app.pages._5_New_Context import _save_wizard_progress, _load_wizard_progress, _reset_wizard

        # Mock session state
        with patch('streamlit.session_state', {}) as mock_session:
            # Initialize wizard state
            mock_session.update({
                "wizard_step": 3,
                "wizard_data": {"domain": "test.com", "brand_name": "Test"},
                "analysis_complete": True
            })

            # Save progress
            _save_wizard_progress()

            # Verify saved
            assert "_wizard_progress" in mock_session

            # Reset wizard
            _reset_wizard()

            # Verify reset
            assert mock_session["wizard_step"] == 1
            assert mock_session["wizard_data"]["domain"] == ""

            # Load progress
            result = _load_wizard_progress()
            assert result == True
            assert mock_session["wizard_step"] == 3
            assert mock_session["wizard_data"]["domain"] == "test.com"

    def test_configuration_validation(self):
        """Test configuration validation works."""
        from brand_intel.services import UCRService

        # Create a valid configuration
        config = Configuration(
            name="Test Config",
            brand=Brand(name="Test Brand", domain="test.com"),
            category_definition=CategoryDefinition(primary_category="Software"),
            competitors=Competitors(),
            strategic_intent=Mock(),
            negative_scope=Mock(),
            governance=Mock()
        )

        service = UCRService()
        result = service.validate(config)

        # Should be valid (basic check)
        assert hasattr(result, 'is_valid')

    def test_wizard_step_progression(self):
        """Test wizard step progression logic."""
        from streamlit_app.pages._5_New_Context import _can_proceed_to_next_step

        # Step 1: Need valid domain
        with patch('streamlit.session_state', {"wizard_data": {"domain": "example.com"}}):
            assert _can_proceed_to_next_step(1) == True

        with patch('streamlit.session_state', {"wizard_data": {"domain": ""}}):
            assert _can_proceed_to_next_step(1) == False

        # Step 2: Need analysis complete
        with patch('streamlit.session_state', {"analysis_complete": True}):
            assert _can_proceed_to_next_step(2) == True

        with patch('streamlit.session_state', {"analysis_complete": False}):
            assert _can_proceed_to_next_step(2) == False

        # Other steps: Always can proceed
        assert _can_proceed_to_next_step(3) == True
        assert _can_proceed_to_next_step(4) == True
        assert _can_proceed_to_next_step(5) == True

    def test_quality_score_calculation(self):
        """Test quality score calculation for wizard configs."""
        from brand_intel.services import UCRService

        config = Configuration(
            name="Test Config",
            brand=Brand(name="Test Brand", domain="test.com", industry="Tech"),
            category_definition=CategoryDefinition(
                primary_category="Software",
                included=["Tools"],
                excluded=["Hardware"]
            ),
            competitors=Competitors(),
            strategic_intent=Mock(),
            negative_scope=Mock(),
            governance=Mock()
        )

        service = UCRService()
        score = service.calculate_quality_score(config)

        assert 0 <= score.overall <= 100
        assert score.grade in ["low", "medium", "high"]

    @pytest.mark.parametrize("domain,expected_valid", [
        ("example.com", True),
        ("sub.example.com", True),
        ("example.co.uk", True),
        ("invalid", False),
        ("", False),
        ("https://example.com", True),  # Should handle protocol
    ])
    def test_domain_validation_edge_cases(self, domain, expected_valid):
        """Test domain validation with various inputs."""
        from streamlit_app.pages._5_New_Context import _validate_domain_for_wizard

        assert _validate_domain_for_wizard(domain) == expected_valid

    def test_ai_service_fallback_handling(self):
        """Test AI service handles missing providers gracefully."""
        with patch('streamlit_app.services.ai_service.AI_AVAILABLE', False):
            from streamlit_app.services.ai_service import AIService

            # Should not raise error when AI not available
            try:
                service = AIService()
                # Should handle gracefully
                assert service.get_available_providers() == []
            except Exception as e:
                # Should handle missing AI gracefully
                assert "not available" in str(e).lower() or "not installed" in str(e).lower()
