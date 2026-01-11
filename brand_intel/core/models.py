"""
Core Domain Models for Brand Intelligence Platform
===================================================

Pydantic models that mirror the TypeScript schema from shared/schema.ts
These models are the single source of truth for Python services.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


# ============================================================================
# ENUMERATIONS
# ============================================================================

class FundingStage(str, Enum):
    """Company funding stage classification."""
    UNKNOWN = "unknown"
    BOOTSTRAP = "bootstrap"
    SEED = "seed"
    SERIES_A = "series_a"
    SERIES_B = "series_b"
    SERIES_C_PLUS = "series_c_plus"
    PUBLIC = "public"


class CompetitorTier(str, Enum):
    """Competitor tier classification."""
    TIER1 = "tier1"  # Direct competitors
    TIER2 = "tier2"  # Adjacent/indirect competitors
    TIER3 = "tier3"  # Aspirational competitors


class CompetitorStatus(str, Enum):
    """Competitor approval status."""
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class SignalType(str, Enum):
    """Types of competitive signals."""
    RANKING_SHIFT = "ranking_shift"
    NEW_KEYWORD = "new_keyword"
    DEMAND_INFLECTION = "demand_inflection"
    SERP_ENTRANT = "serp_entrant"
    CONTENT_GAP = "content_gap"
    MARKET_EXPANSION = "market_expansion"


class SignalSeverity(str, Enum):
    """Signal severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ============================================================================
# EVIDENCE & COMPETITOR MODELS
# ============================================================================

class Evidence(BaseModel):
    """Evidence pack for competitor selection."""
    why_selected: str = ""
    top_overlap_keywords: List[str] = Field(default_factory=list)
    serp_examples: List[str] = Field(default_factory=list)
    
    class Config:
        extra = "allow"


class Competitor(BaseModel):
    """
    Competitor entity with full evidence and scoring.
    Maps to CompetitorEntry in TypeScript schema.
    """
    name: str
    domain: str = ""
    tier: CompetitorTier = CompetitorTier.TIER1
    status: CompetitorStatus = CompetitorStatus.PENDING_REVIEW
    similarity_score: int = Field(default=50, ge=0, le=100)
    serp_overlap: int = Field(default=0, ge=0, le=100)
    size_proximity: int = Field(default=50, ge=0, le=100)
    revenue_range: str = ""
    employee_count: str = ""
    funding_stage: FundingStage = FundingStage.UNKNOWN
    geo_overlap: List[str] = Field(default_factory=list)
    evidence: Evidence = Field(default_factory=Evidence)
    added_by: str = "ai"  # "ai" | "human"
    added_at: datetime = Field(default_factory=datetime.utcnow)
    rejected_reason: str = ""
    
    @property
    def evidence_strength(self) -> int:
        """Calculate evidence strength percentage (0-100)."""
        score = 0
        if self.evidence.why_selected:
            score += 25
        if len(self.evidence.top_overlap_keywords) > 0:
            score += 25
        if len(self.evidence.serp_examples) > 0:
            score += 25
        if self.serp_overlap > 0:
            score += 25
        return score
    
    @property
    def has_size_mismatch(self) -> bool:
        """Check if competitor has significant size mismatch."""
        return self.size_proximity < 40
    
    class Config:
        extra = "allow"


class Competitors(BaseModel):
    """Competitors section of configuration."""
    direct: List[str] = Field(default_factory=list)
    indirect: List[str] = Field(default_factory=list)
    marketplaces: List[str] = Field(default_factory=list)
    competitors: List[Competitor] = Field(default_factory=list)
    approved_count: int = 0
    rejected_count: int = 0
    pending_review_count: int = 0
    
    def get_by_tier(self, tier: CompetitorTier) -> List[Competitor]:
        """Get competitors filtered by tier."""
        return [c for c in self.competitors if c.tier == tier and c.status != CompetitorStatus.REJECTED]
    
    def get_approved(self) -> List[Competitor]:
        """Get all approved competitors."""
        return [c for c in self.competitors if c.status == CompetitorStatus.APPROVED]
    
    def get_pending(self) -> List[Competitor]:
        """Get all pending review competitors."""
        return [c for c in self.competitors if c.status == CompetitorStatus.PENDING_REVIEW]


# ============================================================================
# BRAND & CATEGORY MODELS
# ============================================================================

class Brand(BaseModel):
    """Brand entity - the core subject of analysis."""
    name: str
    domain: str
    industry: str = ""
    business_model: str = "B2B"
    primary_geography: List[str] = Field(default_factory=list)
    revenue_band: str = ""
    target_market: str = ""
    funding_stage: FundingStage = FundingStage.UNKNOWN
    
    @field_validator("domain")
    @classmethod
    def normalize_domain(cls, v: str) -> str:
        """Normalize domain to lowercase without protocol, path, or query."""
        if not v:
            return v
        domain = v.lower().strip()
        domain = domain.replace("https://", "").replace("http://", "")
        domain = domain.replace("www.", "")
        # Remove path
        domain = domain.split("/")[0]
        # Remove query string
        domain = domain.split("?")[0]
        # Remove hash
        domain = domain.split("#")[0]
        # Remove port
        domain = domain.split(":")[0]
        return domain.strip()
    
    class Config:
        extra = "allow"


class CategoryDefinition(BaseModel):
    """Category definition for brand positioning."""
    primary_category: str = ""
    included: List[str] = Field(default_factory=list)
    excluded: List[str] = Field(default_factory=list)
    approved_categories: List[str] = Field(default_factory=list)
    alternative_categories: List[str] = Field(default_factory=list)
    semantic_extensions: List[str] = Field(default_factory=list)
    
    @property
    def has_category_fence(self) -> bool:
        """Check if category fence is properly defined."""
        return len(self.included) > 0 and len(self.excluded) > 0


# ============================================================================
# STRATEGIC & GOVERNANCE MODELS
# ============================================================================

class StrategicIntent(BaseModel):
    """Strategic intent configuration."""
    growth_priority: str = ""
    risk_tolerance: str = "medium"
    primary_goal: str = ""
    secondary_goals: List[str] = Field(default_factory=list)
    avoid: List[str] = Field(default_factory=list)
    goal_type: str = "roi"
    time_horizon: str = "medium"
    constraint_flags: Dict[str, bool] = Field(default_factory=dict)


class EnforcementRules(BaseModel):
    """Enforcement rules for negative scope."""
    hard_exclusion: bool = True
    allow_model_suggestion: bool = True
    require_human_override_for_expansion: bool = True


class NegativeScope(BaseModel):
    """Negative scope / guardrails configuration."""
    excluded_categories: List[str] = Field(default_factory=list)
    excluded_keywords: List[str] = Field(default_factory=list)
    excluded_use_cases: List[str] = Field(default_factory=list)
    excluded_competitors: List[str] = Field(default_factory=list)
    category_exclusions: List[Dict[str, Any]] = Field(default_factory=list)
    keyword_exclusions: List[Dict[str, Any]] = Field(default_factory=list)
    use_case_exclusions: List[Dict[str, Any]] = Field(default_factory=list)
    competitor_exclusions: List[Dict[str, Any]] = Field(default_factory=list)
    enforcement_rules: EnforcementRules = Field(default_factory=EnforcementRules)
    audit_log: List[Dict[str, Any]] = Field(default_factory=list)
    
    @property
    def total_exclusions(self) -> int:
        """Get total number of exclusions."""
        return (
            len(self.excluded_categories) +
            len(self.excluded_keywords) +
            len(self.excluded_use_cases) +
            len(self.excluded_competitors) +
            len(self.category_exclusions) +
            len(self.keyword_exclusions) +
            len(self.use_case_exclusions) +
            len(self.competitor_exclusions)
        )


class QualityScoreBreakdown(BaseModel):
    """Breakdown details for quality score."""
    completeness_details: str = ""
    competitor_details: str = ""
    negative_details: str = ""
    evidence_details: str = ""


class QualityScore(BaseModel):
    """Quality score for configuration."""
    completeness: int = Field(default=0, ge=0, le=100)
    competitor_confidence: int = Field(default=0, ge=0, le=100)
    negative_strength: int = Field(default=0, ge=0, le=100)
    evidence_coverage: int = Field(default=0, ge=0, le=100)
    overall: int = Field(default=0, ge=0, le=100)
    grade: str = "low"  # low, medium, high
    breakdown: QualityScoreBreakdown = Field(default_factory=QualityScoreBreakdown)
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @property
    def is_analysis_ready(self) -> bool:
        """Check if quality is sufficient for analysis."""
        return self.overall >= 50


class Governance(BaseModel):
    """Governance and approval tracking."""
    model_suggested: bool = True
    human_overrides: Dict[str, List[str]] = Field(default_factory=dict)
    context_confidence: Dict[str, Any] = Field(default_factory=dict)
    last_reviewed: str = ""
    reviewed_by: str = ""
    context_valid_until: str = ""
    cmo_safe: bool = False
    context_hash: str = ""
    context_version: int = 1
    validation_status: str = "needs_review"
    human_verified: bool = False
    blocked_reasons: List[str] = Field(default_factory=list)
    context_status: str = "DRAFT_AI"
    quality_score: QualityScore = Field(default_factory=QualityScore)
    ai_behavior: Dict[str, Any] = Field(default_factory=dict)
    section_approvals: Dict[str, Dict[str, Any]] = Field(default_factory=dict)


# ============================================================================
# SIGNAL MODELS
# ============================================================================

class Signal(BaseModel):
    """Competitive intelligence signal."""
    id: Optional[int] = None
    signal_type: SignalType
    severity: SignalSeverity = SignalSeverity.MEDIUM
    competitor: Optional[str] = None
    keyword: Optional[str] = None
    title: str
    description: str
    impact: Optional[str] = None
    recommendation: Optional[str] = None
    change_data: Dict[str, Any] = Field(default_factory=dict)
    dismissed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    @property
    def is_high_priority(self) -> bool:
        """Check if signal is high priority."""
        return self.severity in [SignalSeverity.HIGH, SignalSeverity.CRITICAL]


# ============================================================================
# CONFIGURATION MODEL
# ============================================================================

class Configuration(BaseModel):
    """
    Complete brand intelligence configuration.
    Maps to InsertConfiguration in TypeScript schema.
    """
    id: Optional[int] = None
    user_id: Optional[str] = None
    brand_id: Optional[int] = None
    name: str = ""
    brand: Brand
    category_definition: CategoryDefinition = Field(default_factory=CategoryDefinition)
    competitors: Competitors = Field(default_factory=Competitors)
    demand_definition: Dict[str, Any] = Field(default_factory=dict)
    strategic_intent: StrategicIntent = Field(default_factory=StrategicIntent)
    channel_context: Dict[str, Any] = Field(default_factory=dict)
    negative_scope: NegativeScope = Field(default_factory=NegativeScope)
    governance: Governance = Field(default_factory=Governance)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    @property
    def quality_score(self) -> QualityScore:
        """Get quality score from governance."""
        return self.governance.quality_score
    
    @property
    def is_valid(self) -> bool:
        """Check if configuration is valid for use."""
        return (
            bool(self.brand.domain) and
            bool(self.category_definition.primary_category)
        )
    
    @property
    def is_analysis_ready(self) -> bool:
        """Check if configuration is ready for analysis."""
        return (
            self.is_valid and
            self.quality_score.is_analysis_ready and
            len(self.competitors.get_approved()) > 0
        )
    
    def copy(self) -> 'Configuration':
        """Create a deep copy of the configuration."""
        return Configuration(
            id=self.id,
            user_id=self.user_id,
            brand_id=self.brand_id,
            name=self.name,
            brand=self.brand.model_copy(),  # Use model_copy for proper deep copy
            category_definition=self.category_definition.model_copy(),
            competitors=self.competitors.model_copy(),
            demand_definition=self.demand_definition.copy() if self.demand_definition else {},
            strategic_intent=self.strategic_intent.model_copy(),
            channel_context=self.channel_context.copy() if self.channel_context else {},
            negative_scope=self.negative_scope.model_copy(),
            governance=self.governance.model_copy(),
            created_at=self.created_at,
            updated_at=self.updated_at
        )
    
    class Config:
        extra = "allow"
