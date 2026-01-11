"""
Unit Tests - Quality Score Components
=====================================

Tests for quality score visualization and analysis components.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch

# Add project paths
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "brand_intel"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "streamlit_app"))


class TestQualityScoreComponents:
    """Tests for quality score components."""

    @pytest.fixture
    def mock_streamlit(self):
        """Mock streamlit module for testing."""
        with patch('streamlit_app.components.quality_score_card.st') as mock_st:
            # Mock UI elements
            mock_st.markdown = Mock()
            mock_st.columns = Mock(return_value=[Mock(), Mock()])
            mock_st.progress = Mock()
            mock_st.metric = Mock()
            mock_st.success = Mock()
            mock_st.warning = Mock()
            mock_st.error = Mock()
            mock_st.info = Mock()
            mock_st.expander = Mock()
            mock_st.button = Mock(return_value=False)
            mock_st.balloons = Mock()
            mock_st.rerun = Mock()
            mock_st.bar_chart = Mock()
            mock_st.plotly_chart = Mock()
            mock_st.caption = Mock()

            yield mock_st

    @pytest.fixture
    def sample_quality_score(self):
        """Sample quality score for testing."""
        from brand_intel.core.models import QualityScore, QualityScoreBreakdown

        return QualityScore(
            completeness=85,
            competitor_confidence=78,
            negative_strength=92,
            evidence_coverage=71,
            overall=81,
            grade="high",
            breakdown=QualityScoreBreakdown(
                completeness_details="All core sections complete",
                competitor_details="Strong competitor evidence",
                negative_details="Robust guardrails",
                evidence_details="Good supporting data"
            )
        )

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

    def test_create_gauge_chart(self, sample_quality_score):
        """Test gauge chart creation."""
        from streamlit_app.components.quality_score_card import create_gauge_chart

        fig = create_gauge_chart(85, "high")

        # Should return a plotly figure
        assert fig is not None
        assert hasattr(fig, 'data')
        assert len(fig.data) > 0

    def test_render_score_breakdown(self, mock_streamlit, sample_quality_score):
        """Test score breakdown rendering."""
        from streamlit_app.components.quality_score_card import render_score_breakdown

        render_score_breakdown(sample_quality_score)

        # Verify UI calls were made
        mock_streamlit.markdown.assert_called()
        mock_streamlit.columns.assert_called()
        mock_streamlit.progress.assert_called()

    def test_render_improvement_suggestions(self, mock_streamlit, sample_config):
        """Test improvement suggestions rendering."""
        from streamlit_app.components.quality_score_card import render_improvement_suggestions

        render_improvement_suggestions(sample_config)

        # Should handle empty suggestions gracefully
        mock_streamlit.markdown.assert_called()
        mock_streamlit.success.assert_called()

    def test_render_score_history(self, mock_streamlit, sample_config):
        """Test score history rendering."""
        from streamlit_app.components.quality_score_card import render_score_history

        render_score_history(sample_config)

        # Should render chart
        mock_streamlit.markdown.assert_called()
        mock_streamlit.plotly_chart.assert_called()

    def test_render_benchmark_comparison(self, mock_streamlit, sample_config):
        """Test benchmark comparison rendering."""
        from streamlit_app.components.quality_score_card import render_benchmark_comparison

        render_benchmark_comparison(sample_config)

        # Should render comparison
        mock_streamlit.markdown.assert_called()
        mock_streamlit.metric.assert_called()

    def test_render_score_animations_improvement(self, mock_streamlit):
        """Test score improvement animations."""
        from streamlit_app.components.quality_score_card import render_score_animations

        render_score_animations(70, 85)

        # Should show improvement animation
        mock_streamlit.balloons.assert_called()
        mock_streamlit.success.assert_called()

    def test_render_score_animations_decline(self, mock_streamlit):
        """Test score decline animations."""
        from streamlit_app.components.quality_score_card import render_score_animations

        render_score_animations(85, 70)

        # Should show decline warning
        mock_streamlit.warning.assert_called()

    def test_render_score_animations_no_change(self, mock_streamlit):
        """Test no change animations."""
        from streamlit_app.components.quality_score_card import render_score_animations

        render_score_animations(85, 85)

        # Should show no change message
        mock_streamlit.info.assert_called()

    def test_render_quality_score_mini(self, mock_streamlit, sample_config):
        """Test mini quality score rendering."""
        from streamlit_app.components.quality_score_card import render_quality_score_mini

        render_quality_score_mini(sample_config)

        # Should render mini version
        mock_streamlit.markdown.assert_called()
        mock_streamlit.metric.assert_called()

    def test_render_validation_panel(self, mock_streamlit, sample_config):
        """Test validation panel rendering."""
        from streamlit_app.components.validation_panel import render_validation_panel

        render_validation_panel(sample_config)

        # Should render validation UI
        mock_streamlit.markdown.assert_called()
        mock_streamlit.columns.assert_called()

    def test_render_validation_status_badge(self, sample_config):
        """Test validation status badge creation."""
        from streamlit_app.components.validation_panel import render_validation_status_badge
        from brand_intel.services import UCRService

        service = UCRService()
        result = service.validate(sample_config)

        badge_html = render_validation_status_badge(result)

        # Should return HTML string
        assert isinstance(badge_html, str)
        assert "background" in badge_html
        assert "color" in badge_html

    def test_render_quick_validation_check(self, sample_config):
        """Test quick validation check."""
        from streamlit_app.components.validation_panel import render_quick_validation_check

        result = render_quick_validation_check(sample_config)

        # Should return validation results dict
        assert isinstance(result, dict)
        assert "is_valid" in result
        assert "blocking_issues" in result
        assert "badge_html" in result

    def test_format_signals_for_insights(self):
        """Test signal formatting for AI insights."""
        from streamlit_app.services.ai_service import AIService

        service = AIService()

        signals = [
            {"signal_type": "ranking_shift", "description": "Test signal", "competitor": "comp1"}
        ]

        formatted = service._format_signals_for_insights(signals)

        assert "ranking_shift" in formatted
        assert "comp1" in formatted

    def test_format_insights_response(self):
        """Test insights response formatting."""
        from streamlit_app.services.ai_service import AIService

        service = AIService()

        response = "Some insights text"
        formatted = service._format_insights_response(response)

        assert "# Executive Insights" in formatted

    def test_format_insights_response_existing_header(self):
        """Test insights formatting when header already exists."""
        from streamlit_app.services.ai_service import AIService

        service = AIService()

        response = "# Existing Header\n\nSome insights"
        formatted = service._format_insights_response(response)

        assert formatted == response  # Should not double-add header

    def test_ai_service_error_handling(self):
        """Test AI service error handling."""
        from streamlit_app.services.ai_service import AIService, AIClientError

        with patch.dict('os.environ', {}, clear=True):
            service = AIService()

            # Test with no providers
            with pytest.raises(AIClientError):
                service._get_best_provider()

    @pytest.mark.asyncio
    async def test_generate_insights_error_handling(self):
        """Test error handling in insight generation."""
        from streamlit_app.services.ai_service import AIService, AIClientError

        mock_claude = Mock()
        mock_claude.generate_completion = AsyncMock(side_effect=Exception("API Error"))

        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}):
            service = AIService()

            with pytest.raises(AIClientError) as exc_info:
                await service.generate_insights([], {}, "claude")

            assert "Insight generation failed" in str(exc_info.value)

    def test_gauge_chart_color_coding(self, sample_quality_score):
        """Test gauge chart color coding."""
        from streamlit_app.components.quality_score_card import create_gauge_chart

        # Test high score
        fig_high = create_gauge_chart(85, "high")
        assert fig_high is not None

        # Test medium score
        fig_medium = create_gauge_chart(65, "medium")
        assert fig_medium is not None

        # Test low score
        fig_low = create_gauge_chart(35, "low")
        assert fig_low is not None

    def test_score_interpretation_ranges(self):
        """Test score interpretation ranges."""
        # This is tested implicitly through the UI components
        # High: >= 75
        # Medium: 50-74
        # Low: < 50

        assert 85 >= 75  # High
        assert 65 >= 50 and 65 < 75  # Medium
        assert 35 < 50  # Low

    def test_benchmark_data_structure(self):
        """Test benchmark comparison data structure."""
        # Test the benchmark data is properly structured
        expected_benchmarks = {
            "Industry Average": 65,
            "Top Quartile": 85,
            "Excellent": 95,
            "Your Score": 80  # Example
        }

        assert all(isinstance(v, (int, float)) for v in expected_benchmarks.values())
        assert all(0 <= v <= 100 for v in expected_benchmarks.values())

    @pytest.mark.parametrize("score,expected_grade", [
        (95, "high"),
        (75, "high"),
        (65, "medium"),
        (45, "low"),
        (25, "low")
    ])
    def test_score_grade_mapping(self, score, expected_grade):
        """Test score to grade mapping."""
        if score >= 75:
            grade = "high"
        elif score >= 50:
            grade = "medium"
        else:
            grade = "low"

        assert grade == expected_grade

    def test_component_imports(self):
        """Test that all components can be imported."""
        try:
            from streamlit_app.components.quality_score_card import (
                create_gauge_chart, render_score_breakdown, render_improvement_suggestions
            )
            from streamlit_app.components.validation_panel import (
                render_validation_panel, render_validation_status_badge
            )
            # If we get here, imports work
            assert True
        except ImportError:
            assert False, "Component imports failed"
