"""
Unit Tests - AI Service
========================

Tests for the AI service integration.
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

# Add project paths
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "brand_intel"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "streamlit_app"))


class TestAIService:
    """Tests for AI service functionality."""

    @pytest.fixture
    def mock_ai_clients(self):
        """Mock AI clients for testing."""
        with patch('streamlit_app.services.ai_service.ClaudeClient') as mock_claude, \
             patch('streamlit_app.services.ai_service.OpenAIClient') as mock_openai, \
             patch('streamlit_app.services.ai_service.GeminiClient') as mock_gemini:

            # Mock client instances
            mock_claude_instance = Mock()
            mock_openai_instance = Mock()
            mock_gemini_instance = Mock()

            mock_claude.return_value = mock_claude_instance
            mock_openai.return_value = mock_openai_instance
            mock_gemini.return_value = mock_gemini_instance

            yield {
                'claude': mock_claude_instance,
                'openai': mock_openai_instance,
                'gemini': mock_gemini_instance
            }

    def test_ai_service_initialization(self, mock_ai_clients):
        """Test AI service initializes correctly."""
        from streamlit_app.services.ai_service import AIService

        with patch.dict('os.environ', {
            'ANTHROPIC_API_KEY': 'test-key',
            'OPENAI_API_KEY': 'test-key',
            'GEMINI_API_KEY': 'test-key'
        }):
            service = AIService()
            assert service.claude is not None
            assert service.openai is not None
            assert service.gemini is not None

    def test_ai_service_no_keys(self):
        """Test AI service handles missing keys gracefully."""
        from streamlit_app.services.ai_service import AIService

        with patch.dict('os.environ', {}, clear=True):
            service = AIService()
            assert service.claude is None
            assert service.openai is None
            assert service.gemini is None

            providers = service.get_available_providers()
            assert providers == []

    def test_get_available_providers(self, mock_ai_clients):
        """Test getting available providers."""
        from streamlit_app.services.ai_service import AIService

        with patch.dict('os.environ', {
            'ANTHROPIC_API_KEY': 'test-key',
            'GEMINI_API_KEY': 'test-key'
        }):
            service = AIService()
            providers = service.get_available_providers()
            assert 'claude' in providers
            assert 'gemini' in providers
            assert 'openai' not in providers

    def test_get_best_provider_preferred(self, mock_ai_clients):
        """Test getting preferred provider."""
        from streamlit_app.services.ai_service import AIService

        with patch.dict('os.environ', {
            'ANTHROPIC_API_KEY': 'test-key',
            'OPENAI_API_KEY': 'test-key'
        }):
            service = AIService()
            provider = service._get_best_provider("openai")
            assert provider == mock_ai_clients['openai']

    def test_get_best_provider_fallback(self, mock_ai_clients):
        """Test provider fallback when preferred not available."""
        from streamlit_app.services.ai_service import AIService

        with patch.dict('os.environ', {
            'ANTHROPIC_API_KEY': 'test-key'
        }):
            service = AIService()
            provider = service._get_best_provider("openai")  # Not available
            assert provider == mock_ai_clients['claude']  # Fallback

    @pytest.mark.asyncio
    async def test_generate_insights(self, mock_ai_clients):
        """Test insight generation."""
        from streamlit_app.services.ai_service import AIService

        mock_claude = mock_ai_clients['claude']
        mock_claude.generate_completion = AsyncMock(return_value="# Executive Insights\n\nTest insights")

        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}):
            service = AIService()

            signals = [{"type": "ranking_shift", "description": "Test signal"}]
            config = {"brand": {"name": "Test Brand"}}

            result = await service.generate_insights(signals, config, "claude")

            assert "Executive Insights" in result
            mock_claude.generate_completion.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_content_brief(self, mock_ai_clients):
        """Test content brief generation."""
        from streamlit_app.services.ai_service import AIService

        mock_claude = mock_ai_clients['claude']
        mock_claude.generate_completion = AsyncMock(return_value='{"title": "Test Brief"}')

        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}):
            service = AIService()

            result = await service.generate_content_brief(
                "test keyword",
                {"brand": {"name": "Test"}},
                "claude"
            )

            assert result["title"] == "Test Brief"
            mock_claude.generate_completion.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_guardrails(self, mock_ai_clients):
        """Test guardrail validation."""
        from streamlit_app.services.ai_service import AIService

        mock_claude = mock_ai_clients['claude']
        mock_claude.generate_completion = AsyncMock(return_value='{"is_valid": true}')

        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}):
            service = AIService()

            result = await service.validate_guardrails(
                "test content",
                {"excluded_keywords": ["test"]},
                "claude"
            )

            assert result["is_valid"] is True
            mock_claude.generate_completion.assert_called_once()

    @pytest.mark.asyncio
    async def test_analyze_domain_claude(self, mock_ai_clients):
        """Test domain analysis with Claude."""
        from streamlit_app.services.ai_service import AIService

        mock_claude = mock_ai_clients['claude']
        mock_claude.generate_completion = AsyncMock(return_value='{"brand": {"name": "Test"}}')

        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}):
            service = AIService()

            result = await service.analyze_domain("example.com", "Test Brand")

            assert result["brand"]["name"] == "Test"
            mock_claude.generate_completion.assert_called_once()

    @pytest.mark.asyncio
    async def test_analyze_domain_gemini(self, mock_ai_clients):
        """Test domain analysis with Gemini."""
        from streamlit_app.services.ai_service import AIService

        mock_gemini = mock_ai_clients['gemini']
        mock_gemini.generate_with_search = AsyncMock(return_value='{"brand": {"name": "Test"}}')

        with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-key'}):
            service = AIService()

            result = await service.analyze_domain("example.com", "Test Brand", "gemini")

            assert result["brand"]["name"] == "Test"
            mock_gemini.generate_with_search.assert_called_once()

    def test_format_signals_for_insights(self):
        """Test signal formatting for insights."""
        from streamlit_app.services.ai_service import AIService

        service = AIService()

        signals = [
            {"signal_type": "ranking_shift", "description": "Test signal 1", "competitor": "comp1"},
            {"signal_type": "new_keyword", "description": "Test signal 2", "competitor": "comp2"}
        ]

        formatted = service._format_signals_for_insights(signals)

        assert "ranking_shift" in formatted
        assert "comp1" in formatted
        assert "Test signal 1" in formatted

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
    async def test_generate_insights_error_handling(self, mock_ai_clients):
        """Test error handling in insight generation."""
        from streamlit_app.services.ai_service import AIService, AIClientError

        mock_claude = mock_ai_clients['claude']
        mock_claude.generate_completion = AsyncMock(side_effect=Exception("API Error"))

        with patch.dict('os.environ', {'ANTHROPIC_API_KEY': 'test-key'}):
            service = AIService()

            with pytest.raises(AIClientError) as exc_info:
                await service.generate_insights([], {}, "claude")

            assert "Insight generation failed" in str(exc_info.value)

    def test_global_ai_service_instance(self):
        """Test global AI service instance."""
        from streamlit_app.services.ai_service import get_ai_service

        # Test that we can get the service instance
        service = get_ai_service()
        assert service is not None
        assert hasattr(service, 'get_available_providers')
