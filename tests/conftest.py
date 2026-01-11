"""
Test Fixtures - UCR FIRST
==========================

Shared fixtures for all tests.
"""

import pytest
import sys
from pathlib import Path

# Add brand_intel to path
sys.path.insert(0, str(Path(__file__).parent.parent / "brand_intel"))

from brand_intel.core.models import (
    Brand,
    Competitor,
    CompetitorTier,
    CompetitorStatus,
    FundingStage,
    Evidence,
    Configuration,
    CategoryDefinition,
    Competitors,
    StrategicIntent,
    NegativeScope,
    EnforcementRules,
    Governance,
    QualityScore,
    Signal,
    SignalType,
    SignalSeverity,
)


@pytest.fixture
def sample_brand():
    """Sample brand for testing."""
    return Brand(
        name="Nike",
        domain="nike.com",
        industry="Athletic Footwear",
        business_model="B2C",
        primary_geography=["US", "EU", "APAC"],
        revenue_band="$10B+",
        target_market="Athletes and fitness enthusiasts",
        funding_stage=FundingStage.PUBLIC
    )


@pytest.fixture
def sample_evidence():
    """Sample evidence pack for testing."""
    return Evidence(
        why_selected="Direct competitor in athletic footwear market",
        top_overlap_keywords=["running shoes", "athletic footwear", "sports shoes"],
        serp_examples=["nike.com/running", "adidas.com/running"]
    )


@pytest.fixture
def sample_competitor(sample_evidence):
    """Sample competitor for testing."""
    return Competitor(
        name="Adidas",
        domain="adidas.com",
        tier=CompetitorTier.TIER1,
        status=CompetitorStatus.APPROVED,
        similarity_score=75,
        serp_overlap=65,
        size_proximity=80,
        revenue_range="$10B+",
        employee_count="50000+",
        funding_stage=FundingStage.PUBLIC,
        geo_overlap=["US", "EU"],
        evidence=sample_evidence,
        added_by="ai"
    )


@pytest.fixture
def sample_competitor_pending():
    """Sample pending competitor for testing."""
    return Competitor(
        name="Puma",
        domain="puma.com",
        tier=CompetitorTier.TIER2,
        status=CompetitorStatus.PENDING_REVIEW,
        similarity_score=60,
        serp_overlap=45,
        evidence=Evidence(
            why_selected="Indirect competitor in sportswear"
        )
    )


@pytest.fixture
def sample_category_definition():
    """Sample category definition for testing."""
    return CategoryDefinition(
        primary_category="Athletic Footwear",
        included=["Running Shoes", "Basketball Shoes", "Training Shoes"],
        excluded=["Formal Shoes", "Sandals"],
        approved_categories=["Athletic Footwear", "Sportswear"],
        alternative_categories=["Sports Equipment"],
        semantic_extensions=["fitness gear", "workout shoes"]
    )


@pytest.fixture
def sample_competitors(sample_competitor, sample_competitor_pending):
    """Sample competitors section for testing."""
    return Competitors(
        direct=["adidas.com", "underarmour.com"],
        indirect=["puma.com", "newbalance.com"],
        marketplaces=["amazon.com", "zappos.com"],
        competitors=[sample_competitor, sample_competitor_pending],
        approved_count=1,
        rejected_count=0,
        pending_review_count=1
    )


@pytest.fixture
def sample_strategic_intent():
    """Sample strategic intent for testing."""
    return StrategicIntent(
        growth_priority="market_share",
        risk_tolerance="medium",
        primary_goal="market_share",
        secondary_goals=["brand_awareness", "customer_retention"],
        avoid=["price_wars", "low_margin_products"],
        goal_type="market_share",
        time_horizon="medium"
    )


@pytest.fixture
def sample_negative_scope():
    """Sample negative scope (guardrails) for testing."""
    return NegativeScope(
        excluded_categories=["gambling", "adult_content", "weapons"],
        excluded_keywords=["cheap", "fake", "knockoff", "counterfeit"],
        excluded_use_cases=["resale_arbitrage", "counterfeit_detection"],
        excluded_competitors=["fake-shoes.com", "knockoff-brand.com"],
        enforcement_rules=EnforcementRules(
            hard_exclusion=True,
            allow_model_suggestion=True,
            require_human_override_for_expansion=True
        )
    )


@pytest.fixture
def sample_governance():
    """Sample governance for testing."""
    return Governance(
        model_suggested=True,
        human_verified=True,
        context_hash="abc123def456",
        context_version=1,
        validation_status="complete",
        context_status="APPROVED"
    )


@pytest.fixture
def sample_configuration(
    sample_brand,
    sample_category_definition,
    sample_competitors,
    sample_strategic_intent,
    sample_negative_scope,
    sample_governance
):
    """Complete sample configuration for testing."""
    return Configuration(
        id=1,
        user_id="user_123",
        brand_id=1,
        name="Nike Brand Context",
        brand=sample_brand,
        category_definition=sample_category_definition,
        competitors=sample_competitors,
        demand_definition={
            "brand_keywords": {"seed_terms": ["nike", "nike shoes"]},
            "non_brand_keywords": {"category_terms": ["running shoes", "athletic footwear"]}
        },
        strategic_intent=sample_strategic_intent,
        channel_context={"active_channels": ["organic_search", "paid_search"]},
        negative_scope=sample_negative_scope,
        governance=sample_governance
    )


@pytest.fixture
def incomplete_configuration(sample_brand):
    """Configuration with missing required fields."""
    incomplete_brand = Brand(
        name="",
        domain="",  # Missing required field
        industry=""
    )
    
    return Configuration(
        id=2,
        name="Incomplete Context",
        brand=incomplete_brand,
        category_definition=CategoryDefinition(
            primary_category=""  # Missing required field
        ),
        competitors=Competitors(),
        strategic_intent=StrategicIntent(),
        negative_scope=NegativeScope(),
        governance=Governance()
    )


@pytest.fixture
def sample_signal():
    """Sample competitive signal for testing."""
    return Signal(
        signal_type=SignalType.RANKING_SHIFT,
        severity=SignalSeverity.HIGH,
        competitor="adidas.com",
        keyword="running shoes",
        title="Competitor ranking increase detected",
        description="Adidas moved up 15 positions for 'running shoes'",
        impact="May affect visibility in athletic footwear category",
        recommendation="Review content strategy for running shoes keywords",
        change_data={
            "previous_position": 20,
            "current_position": 5,
            "position_change": 15
        }
    )
