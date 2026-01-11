"""
Unit Tests - Models
====================

Tests for Pydantic models in brand_intel.core.models
"""

import pytest
from datetime import datetime

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "brand_intel"))

from brand_intel.core.models import (
    Brand,
    Competitor,
    CompetitorTier,
    CompetitorStatus,
    FundingStage,
    Evidence,
    QualityScore,
    Signal,
    SignalType,
    SignalSeverity,
)


class TestBrand:
    """Tests for Brand model."""
    
    def test_create_brand(self, sample_brand):
        """Test brand creation with all fields."""
        assert sample_brand.name == "Nike"
        assert sample_brand.domain == "nike.com"
        assert sample_brand.industry == "Athletic Footwear"
        assert sample_brand.business_model == "B2C"
        assert "US" in sample_brand.primary_geography
    
    def test_domain_normalization(self):
        """Test domain is normalized correctly."""
        brand = Brand(
            name="Test",
            domain="HTTPS://WWW.EXAMPLE.COM/path?query=1"
        )
        assert brand.domain == "example.com"
    
    def test_domain_normalization_simple(self):
        """Test simple domain normalization."""
        brand = Brand(name="Test", domain="www.example.com")
        assert brand.domain == "example.com"
    
    def test_brand_defaults(self):
        """Test brand default values."""
        brand = Brand(name="Test", domain="test.com")
        assert brand.industry == ""
        assert brand.business_model == "B2B"
        assert brand.primary_geography == []
        assert brand.funding_stage == FundingStage.UNKNOWN


class TestCompetitor:
    """Tests for Competitor model."""
    
    def test_create_competitor(self, sample_competitor):
        """Test competitor creation."""
        assert sample_competitor.name == "Adidas"
        assert sample_competitor.domain == "adidas.com"
        assert sample_competitor.tier == CompetitorTier.TIER1
        assert sample_competitor.status == CompetitorStatus.APPROVED
    
    def test_evidence_strength_full(self, sample_competitor):
        """Test evidence strength calculation with full evidence."""
        # Has why_selected, keywords, serp_examples, and serp_overlap > 0
        assert sample_competitor.evidence_strength == 100
    
    def test_evidence_strength_partial(self):
        """Test evidence strength with partial evidence."""
        competitor = Competitor(
            name="Test",
            domain="test.com",
            tier=CompetitorTier.TIER1,
            evidence=Evidence(why_selected="Test reason")
        )
        assert competitor.evidence_strength == 25
    
    def test_evidence_strength_empty(self):
        """Test evidence strength with no evidence."""
        competitor = Competitor(
            name="Test",
            domain="test.com",
            tier=CompetitorTier.TIER1
        )
        assert competitor.evidence_strength == 0
    
    def test_has_size_mismatch(self):
        """Test size mismatch detection."""
        competitor = Competitor(
            name="Test",
            domain="test.com",
            tier=CompetitorTier.TIER1,
            size_proximity=30  # Below 40 threshold
        )
        assert competitor.has_size_mismatch is True
        
        competitor.size_proximity = 50
        assert competitor.has_size_mismatch is False


class TestEvidence:
    """Tests for Evidence model."""
    
    def test_create_evidence(self, sample_evidence):
        """Test evidence creation."""
        assert sample_evidence.why_selected != ""
        assert len(sample_evidence.top_overlap_keywords) > 0
        assert len(sample_evidence.serp_examples) > 0
    
    def test_evidence_defaults(self):
        """Test evidence default values."""
        evidence = Evidence()
        assert evidence.why_selected == ""
        assert evidence.top_overlap_keywords == []
        assert evidence.serp_examples == []


class TestSignal:
    """Tests for Signal model."""
    
    def test_create_signal(self, sample_signal):
        """Test signal creation."""
        assert sample_signal.signal_type == SignalType.RANKING_SHIFT
        assert sample_signal.severity == SignalSeverity.HIGH
        assert sample_signal.competitor == "adidas.com"
    
    def test_is_high_priority(self, sample_signal):
        """Test high priority detection."""
        assert sample_signal.is_high_priority is True
        
        low_signal = Signal(
            signal_type=SignalType.NEW_KEYWORD,
            severity=SignalSeverity.LOW,
            title="Test",
            description="Test"
        )
        assert low_signal.is_high_priority is False
    
    def test_signal_defaults(self):
        """Test signal default values."""
        signal = Signal(
            signal_type=SignalType.NEW_KEYWORD,
            title="Test",
            description="Test"
        )
        assert signal.severity == SignalSeverity.MEDIUM
        assert signal.dismissed is False
        assert signal.competitor is None


class TestQualityScore:
    """Tests for QualityScore model."""
    
    def test_create_quality_score(self):
        """Test quality score creation."""
        score = QualityScore(
            completeness=80,
            competitor_confidence=70,
            negative_strength=90,
            evidence_coverage=65,
            overall=76,
            grade="high"
        )
        assert score.overall == 76
        assert score.grade == "high"
    
    def test_is_analysis_ready(self):
        """Test analysis readiness check."""
        high_score = QualityScore(overall=75, grade="high")
        assert high_score.is_analysis_ready is True
        
        low_score = QualityScore(overall=40, grade="low")
        assert low_score.is_analysis_ready is False
    
    def test_quality_score_bounds(self):
        """Test quality score value bounds."""
        # Should accept values 0-100
        score = QualityScore(
            completeness=100,
            competitor_confidence=0,
            negative_strength=50,
            evidence_coverage=100,
            overall=62
        )
        assert 0 <= score.overall <= 100
