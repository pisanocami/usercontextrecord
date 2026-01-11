"""
Unit Tests - UCR Service
=========================

Tests for UCRService - the core of UCR FIRST architecture.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "brand_intel"))

from brand_intel.services.ucr_service import (
    UCRService,
    UCRSection,
    UCRValidationStatus,
    UCRValidationResult,
    GuardrailCheckResult,
)
from brand_intel.core.models import Configuration, Brand, CategoryDefinition


class TestUCRValidation:
    """Tests for UCR validation."""
    
    def test_validate_complete_config(self, sample_configuration):
        """Test validation of complete configuration."""
        service = UCRService()
        result = service.validate(sample_configuration)
        
        assert result.is_valid
        assert result.status != UCRValidationStatus.BLOCKED
        assert len(result.blocked_reasons) == 0
    
    def test_validate_missing_domain(self, sample_configuration):
        """Test validation fails when domain is missing."""
        sample_configuration.brand.domain = ""
        service = UCRService()
        result = service.validate(sample_configuration)
        
        assert not result.is_valid
        assert result.status == UCRValidationStatus.BLOCKED
        assert any("Domain" in r for r in result.blocked_reasons)
    
    def test_validate_missing_category(self, sample_configuration):
        """Test validation fails when primary category is missing."""
        sample_configuration.category_definition.primary_category = ""
        service = UCRService()
        result = service.validate(sample_configuration)
        
        assert not result.is_valid
        assert result.status == UCRValidationStatus.BLOCKED
        assert any("category" in r.lower() for r in result.blocked_reasons)
    
    def test_validate_incomplete_config(self, incomplete_configuration):
        """Test validation of incomplete configuration."""
        service = UCRService()
        result = service.validate(incomplete_configuration)
        
        assert not result.is_valid
        assert result.status == UCRValidationStatus.BLOCKED
        assert len(result.blocked_reasons) >= 2  # Missing domain and category
    
    def test_validate_sections_status(self, sample_configuration):
        """Test that sections are properly validated."""
        service = UCRService()
        result = service.validate(sample_configuration)
        
        # All critical sections should be valid
        assert result.sections_valid.get(UCRSection.A) is True  # Brand
        assert result.sections_valid.get(UCRSection.B) is True  # Category
    
    def test_validate_needs_review_status(self, sample_configuration):
        """Test needs_review status when human verification missing."""
        sample_configuration.governance.human_verified = False
        service = UCRService()
        result = service.validate(sample_configuration)
        
        # Should still be valid but needs review
        assert result.is_valid
        assert result.status == UCRValidationStatus.NEEDS_REVIEW


class TestGuardrailCheck:
    """Tests for guardrail validation (Section G)."""
    
    def test_guardrails_pass_clean_content(self, sample_configuration):
        """Test guardrails pass for clean content."""
        service = UCRService()
        content = "Nike running shoes are great for athletes"
        result = service.check_guardrails(sample_configuration, content)
        
        assert result.is_valid
        assert not result.is_blocked
        assert len(result.violations) == 0
    
    def test_guardrails_block_excluded_keyword(self, sample_configuration):
        """Test guardrails block excluded keywords."""
        service = UCRService()
        content = "Buy cheap Nike shoes at discount prices"
        result = service.check_guardrails(sample_configuration, content)
        
        assert not result.is_valid
        assert result.is_blocked
        assert any(v["value"] == "cheap" for v in result.violations)
    
    def test_guardrails_block_multiple_violations(self, sample_configuration):
        """Test guardrails detect multiple violations."""
        service = UCRService()
        content = "Get cheap fake knockoff Nike shoes"
        result = service.check_guardrails(sample_configuration, content)
        
        assert not result.is_valid
        assert result.is_blocked
        assert len(result.violations) >= 3  # cheap, fake, knockoff
    
    def test_guardrails_block_excluded_category(self, sample_configuration):
        """Test guardrails block excluded categories."""
        service = UCRService()
        content = "Nike shoes for gambling enthusiasts"
        result = service.check_guardrails(sample_configuration, content)
        
        assert not result.is_valid
        assert any(v["type"] == "category" for v in result.violations)
    
    def test_guardrails_block_excluded_competitor(self, sample_configuration):
        """Test guardrails block excluded competitors."""
        service = UCRService()
        content = "Compare with fake-shoes.com prices"
        result = service.check_guardrails(sample_configuration, content)
        
        assert not result.is_valid
        assert any(v["type"] == "competitor" for v in result.violations)
    
    def test_guardrails_case_insensitive(self, sample_configuration):
        """Test guardrails are case insensitive."""
        service = UCRService()
        content = "Buy CHEAP FAKE shoes"
        result = service.check_guardrails(sample_configuration, content)
        
        assert not result.is_valid
        assert len(result.violations) >= 2


class TestQualityScore:
    """Tests for quality score calculation."""
    
    def test_quality_score_complete_config(self, sample_configuration):
        """Test quality score for complete configuration."""
        service = UCRService()
        score = service.calculate_quality_score(sample_configuration)
        
        assert score.overall > 50
        assert score.grade in ["medium", "high"]
    
    def test_quality_score_incomplete_config(self, incomplete_configuration):
        """Test quality score for incomplete configuration."""
        service = UCRService()
        score = service.calculate_quality_score(incomplete_configuration)
        
        assert score.overall < 50
        assert score.grade == "low"
    
    def test_quality_score_dimensions(self, sample_configuration):
        """Test all quality score dimensions are calculated."""
        service = UCRService()
        score = service.calculate_quality_score(sample_configuration)
        
        assert 0 <= score.completeness <= 100
        assert 0 <= score.competitor_confidence <= 100
        assert 0 <= score.negative_strength <= 100
        assert 0 <= score.evidence_coverage <= 100
    
    def test_quality_score_breakdown(self, sample_configuration):
        """Test quality score breakdown is populated."""
        service = UCRService()
        score = service.calculate_quality_score(sample_configuration)
        
        assert score.breakdown is not None
        assert score.breakdown.completeness_details != ""


class TestRequiredSections:
    """Tests for required sections mapping."""
    
    def test_get_required_sections_signal_detection(self):
        """Test required sections for signal detection."""
        service = UCRService()
        sections = service.get_required_sections(["signal_detection"])
        
        assert UCRSection.A in sections  # Brand
        assert UCRSection.C in sections  # Competitors
        assert UCRSection.G in sections  # Guardrails
    
    def test_get_required_sections_keyword_gap(self):
        """Test required sections for keyword gap."""
        service = UCRService()
        sections = service.get_required_sections(["keyword_gap"])
        
        assert UCRSection.A in sections
        assert UCRSection.B in sections
        assert UCRSection.C in sections
        assert UCRSection.D in sections
        assert UCRSection.G in sections
    
    def test_get_required_sections_multiple_operations(self):
        """Test required sections for multiple operations."""
        service = UCRService()
        sections = service.get_required_sections(["signal_detection", "market_analysis"])
        
        # Should include sections from both operations
        assert UCRSection.A in sections
        assert UCRSection.B in sections
        assert UCRSection.C in sections
        assert UCRSection.D in sections
        assert UCRSection.E in sections
        assert UCRSection.G in sections


class TestRunTrace:
    """Tests for run trace creation."""
    
    def test_create_run_trace(self, sample_configuration):
        """Test run trace creation."""
        service = UCRService()
        trace = service.create_run_trace(
            "signal_detection",
            sample_configuration
        )
        
        assert trace.operation == "signal_detection"
        assert trace.config_id == sample_configuration.id
        assert trace.config_name == sample_configuration.name
        assert trace.brand_domain == sample_configuration.brand.domain
        assert len(trace.sections_used) > 0
    
    def test_run_trace_to_dict(self, sample_configuration):
        """Test run trace serialization."""
        service = UCRService()
        trace = service.create_run_trace(
            "test_operation",
            sample_configuration
        )
        
        trace_dict = trace.to_dict()
        
        assert "operation" in trace_dict
        assert "config_id" in trace_dict
        assert "sections_used" in trace_dict
        assert "timestamp" in trace_dict
