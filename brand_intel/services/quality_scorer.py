"""
Quality Scorer - UCR FIRST Quality Assessment
==============================================

Calculates UCR quality scores based on all sections.
Quality determines if UCR is ready for analysis operations.

UCR FIRST: Quality score is derived ONLY from UCR sections.
"""

from typing import Dict, Any, List
from datetime import datetime

from brand_intel.core.models import (
    Configuration,
    QualityScore,
    QualityScoreBreakdown,
    CompetitorStatus,
)
from brand_intel.services.ucr_service import UCRService, UCRSection


class QualityScorer:
    """
    UCR Quality Scorer.
    
    Evaluates UCR completeness and readiness for analysis.
    All scoring is based on UCR sections only.
    """
    
    REQUIRED_SECTIONS = [
        UCRSection.A,  # Brand Identity
        UCRSection.B,  # Category Definition
        UCRSection.C,  # Competitive Set
        UCRSection.D,  # Demand Definition
        UCRSection.E,  # Strategic Intent
        UCRSection.G,  # Negative Scope
    ]
    
    # Weights for overall score calculation
    WEIGHTS = {
        "completeness": 0.25,
        "competitor_confidence": 0.25,
        "negative_strength": 0.30,
        "evidence_coverage": 0.20,
    }
    
    def __init__(self, ucr_service: UCRService):
        self.ucr_service = ucr_service
    
    def calculate(self, config: Configuration) -> QualityScore:
        """
        Calculate comprehensive quality score for UCR.
        
        Dimensions:
        - Completeness: Required fields from Sections A, B, E
        - Competitor Confidence: Section C quality
        - Negative Strength: Section G coverage
        - Evidence Coverage: Section C evidence packs
        
        Args:
            config: UCR Configuration
            
        Returns:
            QualityScore with breakdown by dimension
        """
        return self.ucr_service.calculate_quality_score(config)
    
    def get_improvement_suggestions(
        self,
        config: Configuration
    ) -> List[Dict[str, Any]]:
        """
        Get actionable suggestions to improve UCR quality.
        
        Returns prioritized list of improvements.
        """
        suggestions = []
        score = self.calculate(config)
        
        # Section A improvements
        if score.completeness < 80:
            if not config.brand.name:
                suggestions.append({
                    "section": "A",
                    "priority": "high",
                    "field": "brand.name",
                    "suggestion": "Add brand name for better identification",
                    "impact": "+5 completeness"
                })
            if not config.brand.industry:
                suggestions.append({
                    "section": "A",
                    "priority": "medium",
                    "field": "brand.industry",
                    "suggestion": "Specify industry for better categorization",
                    "impact": "+5 completeness"
                })
        
        # Section B improvements
        if not config.category_definition.has_category_fence:
            suggestions.append({
                "section": "B",
                "priority": "high",
                "field": "category_definition",
                "suggestion": "Define included AND excluded categories for fail-closed validation",
                "impact": "+15 completeness"
            })
        
        # Section C improvements
        if score.competitor_confidence < 60:
            approved = len(config.competitors.get_approved())
            if approved < 3:
                suggestions.append({
                    "section": "C",
                    "priority": "high",
                    "field": "competitors",
                    "suggestion": f"Approve more competitors (currently {approved}, recommend 3+)",
                    "impact": "+20 competitor_confidence"
                })
            
            # Check evidence
            with_evidence = len([
                c for c in config.competitors.competitors 
                if c.evidence_strength >= 50
            ])
            if with_evidence < approved:
                suggestions.append({
                    "section": "C",
                    "priority": "medium",
                    "field": "competitors.evidence",
                    "suggestion": "Add evidence packs to competitors (why_selected, keywords, examples)",
                    "impact": "+15 evidence_coverage"
                })
        
        # Section G improvements
        if score.negative_strength < 50:
            suggestions.append({
                "section": "G",
                "priority": "critical",
                "field": "negative_scope",
                "suggestion": "Add exclusion rules for fail-closed validation",
                "impact": "+20 negative_strength"
            })
            
            if not config.negative_scope.enforcement_rules.hard_exclusion:
                suggestions.append({
                    "section": "G",
                    "priority": "high",
                    "field": "negative_scope.enforcement_rules",
                    "suggestion": "Enable hard_exclusion for strict guardrail enforcement",
                    "impact": "+10 negative_strength"
                })
        
        # Section E improvements
        if not config.strategic_intent.primary_goal:
            suggestions.append({
                "section": "E",
                "priority": "medium",
                "field": "strategic_intent.primary_goal",
                "suggestion": "Define primary strategic goal for better signal prioritization",
                "impact": "+5 completeness"
            })
        
        # Sort by priority
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        suggestions.sort(key=lambda x: priority_order.get(x["priority"], 99))
        
        return suggestions
    
    def is_analysis_ready(self, config: Configuration) -> bool:
        """
        Check if UCR quality is sufficient for analysis operations.
        
        Minimum requirements:
        - Overall score >= 50
        - At least 1 approved competitor
        - Primary category defined
        """
        score = self.calculate(config)
        has_competitors = len(config.competitors.get_approved()) > 0
        has_category = bool(config.category_definition.primary_category)
        
        return (
            score.overall >= 50 and
            has_competitors and
            has_category
        )
