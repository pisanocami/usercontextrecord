"""
UCR Service - The Heart of UCR FIRST Architecture
==================================================

This service is the SINGLE SOURCE OF TRUTH for all UCR operations.
Every module, every analysis, every AI call MUST go through this service.

UCR FIRST Principles:
1. NO operation without a valid UCR
2. ALL outputs traced to UCR sections
3. ALL AI calls filtered through UCR guardrails
4. FAIL-CLOSED validation - if UCR is invalid, operation fails

UCR Sections (from module.contract.ts):
- A: Brand Identity
- B: Category Definition  
- C: Competitive Set
- D: Demand Definition
- E: Strategic Intent
- F: Channel Context
- G: Negative Scope (Guardrails)
- H: Governance
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from enum import Enum

from brand_intel.core.models import (
    Configuration,
    Brand,
    Competitor,
    CompetitorStatus,
    QualityScore,
    QualityScoreBreakdown,
    NegativeScope,
)
from brand_intel.core.exceptions import (
    ConfigurationError,
    ValidationError,
    GuardrailViolationError,
)


class UCRSection(str, Enum):
    """UCR Section identifiers matching module.contract.ts"""
    A = "A"  # Brand Identity
    B = "B"  # Category Definition
    C = "C"  # Competitive Set
    D = "D"  # Demand Definition
    E = "E"  # Strategic Intent
    F = "F"  # Channel Context
    G = "G"  # Negative Scope (Guardrails)
    H = "H"  # Governance


class UCRValidationStatus(str, Enum):
    """UCR validation status levels."""
    BLOCKED = "blocked"      # Cannot proceed - critical fields missing
    INCOMPLETE = "incomplete"  # Can proceed with warnings
    NEEDS_REVIEW = "needs_review"  # Human review required
    COMPLETE = "complete"    # Fully validated


class UCRService:
    """
    UCR Service - Central UCR management following UCR FIRST principles.
    
    This service ensures:
    - All operations have valid UCR context
    - All outputs are traced to UCR sections
    - All guardrails are enforced
    - Fail-closed validation
    
    Usage:
        ucr_service = UCRService()
        
        # Validate UCR before any operation
        validation = ucr_service.validate(config)
        if validation.status == UCRValidationStatus.BLOCKED:
            raise ConfigurationError(validation.blocked_reasons)
        
        # Get sections required for an operation
        sections = ucr_service.get_required_sections(["market_analysis"])
        
        # Check guardrails before AI output
        ucr_service.check_guardrails(config, ai_output)
    """
    
    # Section dependencies for different operations
    OPERATION_SECTIONS: Dict[str, List[UCRSection]] = {
        "competitor_analysis": [UCRSection.A, UCRSection.B, UCRSection.C, UCRSection.G],
        "keyword_gap": [UCRSection.A, UCRSection.B, UCRSection.C, UCRSection.D, UCRSection.G],
        "market_analysis": [UCRSection.A, UCRSection.B, UCRSection.D, UCRSection.E, UCRSection.G],
        "signal_detection": [UCRSection.A, UCRSection.B, UCRSection.C, UCRSection.E, UCRSection.G],
        "content_brief": [UCRSection.A, UCRSection.B, UCRSection.D, UCRSection.E, UCRSection.F, UCRSection.G],
        "guardrail_check": [UCRSection.G],
        "quality_score": [UCRSection.A, UCRSection.B, UCRSection.C, UCRSection.D, UCRSection.E, UCRSection.G],
    }
    
    def __init__(self):
        self._validation_cache: Dict[str, Tuple[UCRValidationStatus, datetime]] = {}
    
    def validate(self, config: Configuration) -> "UCRValidationResult":
        """
        Validate UCR configuration - MUST be called before any operation.
        
        Implements FAIL-CLOSED validation:
        - If critical fields missing -> BLOCKED
        - If optional fields missing -> INCOMPLETE (with warnings)
        - If human review needed -> NEEDS_REVIEW
        - If all good -> COMPLETE
        
        Args:
            config: UCR Configuration to validate
            
        Returns:
            UCRValidationResult with status and details
        """
        blocked_reasons: List[str] = []
        warnings: List[str] = []
        sections_valid: Dict[UCRSection, bool] = {}
        
        # Section A: Brand Identity - REQUIRED
        if not config.brand.domain or not config.brand.domain.strip():
            blocked_reasons.append("Domain is required (Section A)")
            sections_valid[UCRSection.A] = False
        else:
            sections_valid[UCRSection.A] = True
            if not config.brand.name:
                warnings.append("Brand name not specified (Section A)")
        
        # Section B: Category Definition - REQUIRED
        if not config.category_definition.primary_category:
            blocked_reasons.append("Primary category is required (Section B)")
            sections_valid[UCRSection.B] = False
        else:
            sections_valid[UCRSection.B] = True
            if not config.category_definition.has_category_fence:
                warnings.append("Category fence incomplete - add included/excluded categories (Section B)")
        
        # Section C: Competitive Set
        approved_competitors = config.competitors.get_approved()
        if len(approved_competitors) == 0:
            warnings.append("No approved competitors (Section C)")
            sections_valid[UCRSection.C] = len(config.competitors.competitors) > 0
        else:
            sections_valid[UCRSection.C] = True
        
        # Section D: Demand Definition
        has_demand = bool(config.demand_definition.get("brand_keywords", {}).get("seed_terms"))
        sections_valid[UCRSection.D] = has_demand
        if not has_demand:
            warnings.append("No demand keywords defined (Section D)")
        
        # Section E: Strategic Intent
        has_strategy = bool(config.strategic_intent.primary_goal)
        sections_valid[UCRSection.E] = has_strategy
        if not has_strategy:
            warnings.append("Primary strategic goal not defined (Section E)")
        
        # Section F: Channel Context
        sections_valid[UCRSection.F] = True  # Optional section
        
        # Section G: Negative Scope (Guardrails) - CRITICAL
        has_guardrails = config.negative_scope.total_exclusions > 0
        sections_valid[UCRSection.G] = has_guardrails
        if not has_guardrails:
            warnings.append("No guardrails defined - fail-closed validation may reject outputs (Section G)")
        if not config.negative_scope.enforcement_rules.hard_exclusion:
            warnings.append("Hard exclusion not enabled (Section G)")
        
        # Section H: Governance
        sections_valid[UCRSection.H] = True
        if not config.governance.human_verified:
            warnings.append("UCR not human-verified (Section H)")
        
        # Determine status
        if blocked_reasons:
            status = UCRValidationStatus.BLOCKED
        elif not config.governance.human_verified:
            status = UCRValidationStatus.NEEDS_REVIEW
        elif warnings:
            status = UCRValidationStatus.INCOMPLETE
        else:
            status = UCRValidationStatus.COMPLETE
        
        return UCRValidationResult(
            status=status,
            blocked_reasons=blocked_reasons,
            warnings=warnings,
            sections_valid=sections_valid,
            is_valid=status != UCRValidationStatus.BLOCKED
        )
    
    def get_required_sections(self, operations: List[str]) -> List[UCRSection]:
        """
        Get UCR sections required for given operations.
        
        Args:
            operations: List of operation names
            
        Returns:
            List of required UCR sections
        """
        sections = set()
        for op in operations:
            if op in self.OPERATION_SECTIONS:
                sections.update(self.OPERATION_SECTIONS[op])
        return list(sections)
    
    def check_guardrails(
        self,
        config: Configuration,
        content: str,
        strict: bool = True
    ) -> "GuardrailCheckResult":
        """
        Check content against UCR guardrails (Section G).
        
        This is the FAIL-CLOSED check - if guardrails are violated,
        the content MUST be rejected.
        
        Args:
            config: UCR Configuration
            content: Content to check
            strict: If True, any violation blocks; if False, returns warnings
            
        Returns:
            GuardrailCheckResult with violations
        """
        violations: List[Dict[str, Any]] = []
        content_lower = content.lower()
        
        negative_scope = config.negative_scope
        
        # Check excluded categories
        for category in negative_scope.excluded_categories:
            if category.lower() in content_lower:
                violations.append({
                    "type": "category",
                    "value": category,
                    "severity": "high",
                    "rule": "excluded_categories"
                })
        
        # Check excluded keywords
        for keyword in negative_scope.excluded_keywords:
            if keyword.lower() in content_lower:
                violations.append({
                    "type": "keyword",
                    "value": keyword,
                    "severity": "high",
                    "rule": "excluded_keywords"
                })
        
        # Check excluded competitors
        for competitor in negative_scope.excluded_competitors:
            if competitor.lower() in content_lower:
                violations.append({
                    "type": "competitor",
                    "value": competitor,
                    "severity": "medium",
                    "rule": "excluded_competitors"
                })
        
        # Check detailed exclusions with match types
        for exclusion in negative_scope.category_exclusions:
            term = exclusion.get("term", "").lower()
            match_type = exclusion.get("match_type", "semantic")
            if match_type == "exact" and term in content_lower:
                violations.append({
                    "type": "category_exclusion",
                    "value": term,
                    "severity": "high",
                    "rule": "category_exclusions",
                    "match_type": "exact"
                })
        
        is_blocked = len(violations) > 0 and (
            strict or negative_scope.enforcement_rules.hard_exclusion
        )
        
        return GuardrailCheckResult(
            is_valid=not is_blocked,
            violations=violations,
            is_blocked=is_blocked,
            checked_rules=[
                "excluded_categories",
                "excluded_keywords",
                "excluded_competitors",
                "category_exclusions"
            ]
        )
    
    def calculate_quality_score(self, config: Configuration) -> QualityScore:
        """
        Calculate UCR quality score based on all sections.
        
        Quality dimensions:
        - Completeness: Required fields filled
        - Competitor Confidence: Competitors with evidence
        - Negative Strength: Guardrail coverage
        - Evidence Coverage: Documentation quality
        
        Args:
            config: UCR Configuration
            
        Returns:
            QualityScore with breakdown
        """
        breakdown = QualityScoreBreakdown()
        
        # 1. Completeness Score (0-100)
        required_fields = [
            ("name", config.name),
            ("brand.name", config.brand.name),
            ("brand.domain", config.brand.domain),
            ("brand.industry", config.brand.industry),
            ("brand.target_market", config.brand.target_market),
            ("primary_category", config.category_definition.primary_category),
            ("primary_goal", config.strategic_intent.primary_goal),
        ]
        
        filled = sum(1 for _, v in required_fields if v and str(v).strip())
        completeness = int((filled / len(required_fields)) * 100)
        
        # Bonus for category fence
        if config.category_definition.has_category_fence:
            completeness = min(100, completeness + 15)
        
        missing = [name for name, v in required_fields if not v or not str(v).strip()]
        breakdown.completeness_details = f"Missing: {', '.join(missing)}" if missing else "All required fields complete"
        
        # 2. Competitor Confidence (0-100)
        competitors = config.competitors.competitors
        total = len(competitors)
        
        if total == 0:
            competitor_confidence = 0
            breakdown.competitor_details = "No competitors defined"
        else:
            approved = len([c for c in competitors if c.status == CompetitorStatus.APPROVED])
            with_evidence = len([c for c in competitors if c.evidence_strength >= 50])
            
            base_score = min(80, (total / 5) * 40 + (approved / max(total, 1)) * 40)
            evidence_bonus = (with_evidence / total) * 20
            competitor_confidence = int(min(100, base_score + evidence_bonus))
            
            breakdown.competitor_details = f"{total} competitors, {approved} approved, {with_evidence} with evidence"
        
        # 3. Negative Strength (0-100)
        neg = config.negative_scope
        exclusion_types = sum([
            1 if neg.excluded_categories else 0,
            1 if neg.excluded_keywords else 0,
            1 if neg.excluded_use_cases else 0,
            1 if neg.excluded_competitors else 0,
        ])
        
        negative_strength = min(100, exclusion_types * 20 + (neg.total_exclusions * 2))
        if neg.enforcement_rules.hard_exclusion:
            negative_strength = min(100, negative_strength + 10)
        
        breakdown.negative_details = f"{neg.total_exclusions} exclusions across {exclusion_types} types"
        
        # 4. Evidence Coverage (0-100)
        if total > 0:
            with_why = len([c for c in competitors if c.evidence.why_selected])
            with_keywords = len([c for c in competitors if c.evidence.top_overlap_keywords])
            with_examples = len([c for c in competitors if c.evidence.serp_examples])
            
            evidence_coverage = int(((with_why + with_keywords + with_examples) / (total * 3)) * 100)
            breakdown.evidence_details = f"Why: {with_why}/{total}, Keywords: {with_keywords}/{total}, Examples: {with_examples}/{total}"
        else:
            evidence_coverage = 0
            breakdown.evidence_details = "No competitors to evaluate"
        
        # Calculate overall (weighted)
        weights = {
            "completeness": 0.25,
            "competitor_confidence": 0.25,
            "negative_strength": 0.30,
            "evidence_coverage": 0.20,
        }
        
        overall = int(
            completeness * weights["completeness"] +
            competitor_confidence * weights["competitor_confidence"] +
            negative_strength * weights["negative_strength"] +
            evidence_coverage * weights["evidence_coverage"]
        )
        
        # Determine grade
        if overall >= 75:
            grade = "high"
        elif overall >= 50:
            grade = "medium"
        else:
            grade = "low"
        
        return QualityScore(
            completeness=completeness,
            competitor_confidence=competitor_confidence,
            negative_strength=negative_strength,
            evidence_coverage=evidence_coverage,
            overall=overall,
            grade=grade,
            breakdown=breakdown,
            calculated_at=datetime.utcnow()
        )
    
    def create_run_trace(
        self,
        operation: str,
        config: Configuration,
        sections_used: Optional[List[UCRSection]] = None
    ) -> "UCRRunTrace":
        """
        Create a trace for an operation showing UCR sections used.
        
        Every operation MUST create a trace for auditability.
        
        Args:
            operation: Operation name
            config: UCR Configuration used
            sections_used: Override sections (defaults to operation's required sections)
            
        Returns:
            UCRRunTrace for audit logging
        """
        if sections_used is None:
            sections_used = self.get_required_sections([operation])
        
        return UCRRunTrace(
            operation=operation,
            config_id=config.id,
            config_name=config.name,
            brand_domain=config.brand.domain,
            sections_used=sections_used,
            ucr_version=config.governance.context_hash,
            quality_score=config.governance.quality_score.overall,
            timestamp=datetime.utcnow()
        )


class UCRValidationResult:
    """Result of UCR validation."""
    
    def __init__(
        self,
        status: UCRValidationStatus,
        blocked_reasons: List[str],
        warnings: List[str],
        sections_valid: Dict[UCRSection, bool],
        is_valid: bool
    ):
        self.status = status
        self.blocked_reasons = blocked_reasons
        self.warnings = warnings
        self.sections_valid = sections_valid
        self.is_valid = is_valid
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value,
            "blocked_reasons": self.blocked_reasons,
            "warnings": self.warnings,
            "sections_valid": {k.value: v for k, v in self.sections_valid.items()},
            "is_valid": self.is_valid
        }


class GuardrailCheckResult:
    """Result of guardrail check."""
    
    def __init__(
        self,
        is_valid: bool,
        violations: List[Dict[str, Any]],
        is_blocked: bool,
        checked_rules: List[str]
    ):
        self.is_valid = is_valid
        self.violations = violations
        self.is_blocked = is_blocked
        self.checked_rules = checked_rules
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "violations": self.violations,
            "is_blocked": self.is_blocked,
            "checked_rules": self.checked_rules
        }


class UCRRunTrace:
    """Trace of an operation for audit logging."""
    
    def __init__(
        self,
        operation: str,
        config_id: Optional[int],
        config_name: str,
        brand_domain: str,
        sections_used: List[UCRSection],
        ucr_version: str,
        quality_score: int,
        timestamp: datetime
    ):
        self.operation = operation
        self.config_id = config_id
        self.config_name = config_name
        self.brand_domain = brand_domain
        self.sections_used = sections_used
        self.ucr_version = ucr_version
        self.quality_score = quality_score
        self.timestamp = timestamp
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "operation": self.operation,
            "config_id": self.config_id,
            "config_name": self.config_name,
            "brand_domain": self.brand_domain,
            "sections_used": [s.value for s in self.sections_used],
            "ucr_version": self.ucr_version,
            "quality_score": self.quality_score,
            "timestamp": self.timestamp.isoformat()
        }
