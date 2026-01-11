"""
Guardrail Validator - UCR FIRST Fail-Closed Validation
=======================================================

Enforces UCR Section G (Negative Scope) guardrails.
Implements FAIL-CLOSED validation - if guardrails are violated, operation fails.

UCR FIRST: All content MUST pass through guardrail validation.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum

from brand_intel.core.models import Configuration, NegativeScope
from brand_intel.core.exceptions import GuardrailViolationError
from brand_intel.services.ucr_service import UCRService, UCRSection


class MatchType(str, Enum):
    """Match type for exclusion rules."""
    EXACT = "exact"
    SEMANTIC = "semantic"
    CONTAINS = "contains"


class ViolationSeverity(str, Enum):
    """Severity of guardrail violation."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class GuardrailValidator:
    """
    UCR Guardrail Validator.
    
    Enforces Section G (Negative Scope) rules with fail-closed validation.
    
    Usage:
        validator = GuardrailValidator(ucr_service)
        
        # Validate content before output
        result = validator.validate(config, ai_output)
        
        if result.is_blocked:
            raise GuardrailViolationError(result.violations)
    """
    
    def __init__(self, ucr_service: UCRService):
        self.ucr_service = ucr_service
    
    def validate(
        self,
        config: Configuration,
        content: str,
        strict: bool = True
    ) -> "ValidationResult":
        """
        Validate content against UCR guardrails.
        
        FAIL-CLOSED: If hard_exclusion is enabled and violations found,
        the content is blocked.
        
        Args:
            config: UCR Configuration
            content: Content to validate
            strict: If True, any violation blocks
            
        Returns:
            ValidationResult with violations and block status
        """
        return self.ucr_service.check_guardrails(config, content, strict)
    
    def validate_or_raise(
        self,
        config: Configuration,
        content: str
    ) -> None:
        """
        Validate content and raise exception if blocked.
        
        Use this for fail-closed operations where violations
        must stop execution.
        
        Args:
            config: UCR Configuration
            content: Content to validate
            
        Raises:
            GuardrailViolationError: If content violates guardrails
        """
        result = self.validate(config, content, strict=True)
        
        if result.is_blocked:
            violation_summary = ", ".join([
                f"{v['type']}:{v['value']}" for v in result.violations[:3]
            ])
            raise GuardrailViolationError(
                f"Content blocked by guardrails: {violation_summary}",
                rule="negative_scope",
                severity="high"
            )
    
    def get_exclusion_summary(
        self,
        config: Configuration
    ) -> Dict[str, Any]:
        """
        Get summary of all exclusion rules from UCR Section G.
        
        Returns:
            Summary of exclusion rules by type
        """
        neg = config.negative_scope
        
        return {
            "total_exclusions": neg.total_exclusions,
            "by_type": {
                "categories": len(neg.excluded_categories) + len(neg.category_exclusions),
                "keywords": len(neg.excluded_keywords) + len(neg.keyword_exclusions),
                "use_cases": len(neg.excluded_use_cases) + len(neg.use_case_exclusions),
                "competitors": len(neg.excluded_competitors) + len(neg.competitor_exclusions),
            },
            "enforcement": {
                "hard_exclusion": neg.enforcement_rules.hard_exclusion,
                "allow_model_suggestion": neg.enforcement_rules.allow_model_suggestion,
                "require_human_override": neg.enforcement_rules.require_human_override_for_expansion,
            },
            "audit_log_entries": len(neg.audit_log)
        }
    
    def add_exclusion(
        self,
        config: Configuration,
        exclusion_type: str,
        value: str,
        match_type: MatchType = MatchType.SEMANTIC,
        reason: str = ""
    ) -> Configuration:
        """
        Add a new exclusion rule to UCR Section G.
        
        Args:
            config: UCR Configuration
            exclusion_type: Type of exclusion (category, keyword, use_case, competitor)
            value: Value to exclude
            match_type: How to match (exact, semantic, contains)
            reason: Reason for exclusion
            
        Returns:
            Updated configuration
        """
        exclusion_entry = {
            "term": value,
            "match_type": match_type.value,
            "reason": reason,
            "added_at": datetime.utcnow().isoformat(),
            "added_by": "system"
        }
        
        if exclusion_type == "category":
            config.negative_scope.category_exclusions.append(exclusion_entry)
        elif exclusion_type == "keyword":
            config.negative_scope.keyword_exclusions.append(exclusion_entry)
        elif exclusion_type == "use_case":
            config.negative_scope.use_case_exclusions.append(exclusion_entry)
        elif exclusion_type == "competitor":
            config.negative_scope.competitor_exclusions.append(exclusion_entry)
        
        # Add to audit log
        config.negative_scope.audit_log.append({
            "action": "add_exclusion",
            "type": exclusion_type,
            "value": value,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return config
    
    def check_competitor_allowed(
        self,
        config: Configuration,
        competitor_name: str,
        competitor_domain: str
    ) -> bool:
        """
        Check if a competitor is allowed by UCR guardrails.
        
        Args:
            config: UCR Configuration
            competitor_name: Competitor name
            competitor_domain: Competitor domain
            
        Returns:
            True if competitor is allowed, False if excluded
        """
        neg = config.negative_scope
        
        # Check excluded competitors list
        name_lower = competitor_name.lower()
        domain_lower = competitor_domain.lower()
        
        for excluded in neg.excluded_competitors:
            if excluded.lower() in name_lower or excluded.lower() in domain_lower:
                return False
        
        # Check detailed exclusions
        for exclusion in neg.competitor_exclusions:
            term = exclusion.get("term", "").lower()
            match_type = exclusion.get("match_type", "semantic")
            
            if match_type == "exact":
                if term == name_lower or term == domain_lower:
                    return False
            else:
                if term in name_lower or term in domain_lower:
                    return False
        
        return True


class ValidationResult:
    """Result of guardrail validation."""
    
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
