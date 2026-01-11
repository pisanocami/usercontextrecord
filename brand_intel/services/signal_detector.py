"""
Signal Detector - UCR FIRST Competitive Intelligence
=====================================================

Detects competitive signals using UCR as the single source of truth.

UCR FIRST Principles Applied:
1. REQUIRES valid UCR before any detection
2. ALL signals filtered through UCR guardrails (Section G)
3. ALL outputs traced to UCR sections used
4. Competitors from UCR Section C only
5. Categories from UCR Section B only
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum

from brand_intel.core.models import (
    Configuration,
    Competitor,
    CompetitorStatus,
    Signal,
    SignalType,
    SignalSeverity,
)
from brand_intel.core.exceptions import ConfigurationError, ValidationError
from brand_intel.services.ucr_service import (
    UCRService,
    UCRSection,
    UCRValidationStatus,
    UCRRunTrace,
)
from brand_intel.ai.base import BaseAIClient


class SignalDetector:
    """
    UCR-First Signal Detector.
    
    Detects competitive intelligence signals using UCR as the foundation.
    Every detection operation:
    1. Validates UCR first
    2. Uses only UCR-approved competitors
    3. Filters through UCR guardrails
    4. Creates audit trace
    
    Usage:
        ucr_service = UCRService()
        ai_client = ClaudeClient()
        detector = SignalDetector(ucr_service, ai_client)
        
        # Detect signals (UCR validation happens automatically)
        result = await detector.detect_signals(config, lookback_days=30)
        
        # Result includes trace of UCR sections used
        print(result.run_trace.sections_used)
    """
    
    REQUIRED_SECTIONS = [
        UCRSection.A,  # Brand Identity
        UCRSection.B,  # Category Definition
        UCRSection.C,  # Competitive Set
        UCRSection.E,  # Strategic Intent
        UCRSection.G,  # Negative Scope (Guardrails)
    ]
    
    def __init__(
        self,
        ucr_service: UCRService,
        ai_client: Optional[BaseAIClient] = None
    ):
        self.ucr_service = ucr_service
        self.ai_client = ai_client
    
    async def detect_signals(
        self,
        config: Configuration,
        signal_types: Optional[List[SignalType]] = None,
        lookback_days: int = 30,
        min_severity: SignalSeverity = SignalSeverity.LOW
    ) -> "SignalDetectionResult":
        """
        Detect competitive signals using UCR context.
        
        UCR FIRST Flow:
        1. Validate UCR configuration
        2. Get approved competitors from UCR Section C
        3. Apply category filters from UCR Section B
        4. Detect signals based on UCR strategic intent (Section E)
        5. Filter results through UCR guardrails (Section G)
        6. Create audit trace
        
        Args:
            config: UCR Configuration (REQUIRED)
            signal_types: Types of signals to detect (default: all)
            lookback_days: How far back to look
            min_severity: Minimum severity to return
            
        Returns:
            SignalDetectionResult with signals and UCR trace
            
        Raises:
            ConfigurationError: If UCR validation fails
        """
        # Step 1: UCR Validation (FAIL-CLOSED)
        validation = self.ucr_service.validate(config)
        if validation.status == UCRValidationStatus.BLOCKED:
            raise ConfigurationError(
                f"UCR validation failed: {', '.join(validation.blocked_reasons)}",
                config_id=config.id
            )
        
        # Step 2: Get approved competitors from UCR Section C
        approved_competitors = config.competitors.get_approved()
        if not approved_competitors:
            # Also check legacy format
            legacy_competitors = config.competitors.direct + config.competitors.indirect
            if not legacy_competitors:
                return SignalDetectionResult(
                    signals=[],
                    run_trace=self.ucr_service.create_run_trace(
                        "signal_detection", config, self.REQUIRED_SECTIONS
                    ),
                    summary=SignalSummary(
                        total_signals=0,
                        high_priority_count=0,
                        competitors_active=[],
                        top_signal_type=None,
                        ucr_quality_score=config.governance.quality_score.overall
                    ),
                    filters_applied=["no_competitors"],
                    rules_triggered=[]
                )
        
        # Step 3: Determine signal types to detect
        if signal_types is None:
            signal_types = [
                SignalType.RANKING_SHIFT,
                SignalType.NEW_KEYWORD,
                SignalType.SERP_ENTRANT,
                SignalType.DEMAND_INFLECTION,
            ]
        
        # Step 4: Detect signals
        all_signals: List[Signal] = []
        rules_triggered: List[str] = []
        filters_applied: List[str] = []
        
        # Apply UCR Section B category filter
        primary_category = config.category_definition.primary_category
        included_categories = config.category_definition.included
        filters_applied.append(f"category:{primary_category}")
        
        # Apply UCR Section E strategic intent
        strategic_goal = config.strategic_intent.primary_goal
        risk_tolerance = config.strategic_intent.risk_tolerance
        filters_applied.append(f"goal:{strategic_goal}")
        filters_applied.append(f"risk:{risk_tolerance}")
        
        # Detect by signal type
        if SignalType.RANKING_SHIFT in signal_types:
            ranking_signals = await self._detect_ranking_shifts(
                config, approved_competitors, lookback_days
            )
            all_signals.extend(ranking_signals)
            if ranking_signals:
                rules_triggered.append("RANKING_SHIFT_DETECTED")
        
        if SignalType.NEW_KEYWORD in signal_types:
            keyword_signals = await self._detect_new_keywords(
                config, approved_competitors, lookback_days
            )
            all_signals.extend(keyword_signals)
            if keyword_signals:
                rules_triggered.append("NEW_KEYWORD_DETECTED")
        
        if SignalType.SERP_ENTRANT in signal_types:
            entrant_signals = await self._detect_serp_entrants(
                config, approved_competitors, lookback_days
            )
            all_signals.extend(entrant_signals)
            if entrant_signals:
                rules_triggered.append("SERP_ENTRANT_DETECTED")
        
        if SignalType.DEMAND_INFLECTION in signal_types:
            demand_signals = await self._detect_demand_inflections(
                config, lookback_days
            )
            all_signals.extend(demand_signals)
            if demand_signals:
                rules_triggered.append("DEMAND_INFLECTION_DETECTED")
        
        # Step 5: Filter through UCR guardrails (Section G)
        filtered_signals = []
        for signal in all_signals:
            # Check signal content against guardrails
            content_to_check = f"{signal.title} {signal.description} {signal.keyword or ''}"
            guardrail_check = self.ucr_service.check_guardrails(
                config, content_to_check, strict=False
            )
            
            if not guardrail_check.is_blocked:
                filtered_signals.append(signal)
            else:
                rules_triggered.append(f"GUARDRAIL_BLOCKED:{signal.signal_type.value}")
        
        # Apply minimum severity filter
        filtered_signals = [
            s for s in filtered_signals 
            if self._severity_rank(s.severity) >= self._severity_rank(min_severity)
        ]
        filters_applied.append(f"min_severity:{min_severity.value}")
        
        # Step 6: Enrich with AI if available
        if self.ai_client and filtered_signals:
            filtered_signals = await self._enrich_signals_with_ai(
                config, filtered_signals
            )
            rules_triggered.append("AI_ENRICHMENT_APPLIED")
        
        # Create summary
        high_priority = [s for s in filtered_signals if s.is_high_priority]
        competitors_active = list(set(
            s.competitor for s in filtered_signals if s.competitor
        ))
        
        # Determine top signal type
        type_counts: Dict[SignalType, int] = {}
        for s in filtered_signals:
            type_counts[s.signal_type] = type_counts.get(s.signal_type, 0) + 1
        top_type = max(type_counts, key=type_counts.get) if type_counts else None
        
        summary = SignalSummary(
            total_signals=len(filtered_signals),
            high_priority_count=len(high_priority),
            competitors_active=competitors_active,
            top_signal_type=top_type,
            ucr_quality_score=config.governance.quality_score.overall
        )
        
        # Create UCR trace
        run_trace = self.ucr_service.create_run_trace(
            "signal_detection", config, self.REQUIRED_SECTIONS
        )
        
        return SignalDetectionResult(
            signals=filtered_signals,
            run_trace=run_trace,
            summary=summary,
            filters_applied=filters_applied,
            rules_triggered=rules_triggered
        )
    
    async def _detect_ranking_shifts(
        self,
        config: Configuration,
        competitors: List[Competitor],
        lookback_days: int
    ) -> List[Signal]:
        """Detect ranking shift signals for UCR-approved competitors."""
        signals = []
        
        # This would integrate with DataForSEO/Ahrefs in production
        # For now, generate based on competitor data
        for competitor in competitors:
            if competitor.serp_overlap > 50:
                # High overlap competitor - potential ranking threat
                severity = (
                    SignalSeverity.HIGH if competitor.serp_overlap > 70
                    else SignalSeverity.MEDIUM
                )
                
                signals.append(Signal(
                    signal_type=SignalType.RANKING_SHIFT,
                    severity=severity,
                    competitor=competitor.name,
                    title=f"High SERP overlap with {competitor.name}",
                    description=f"{competitor.name} has {competitor.serp_overlap}% SERP overlap. Monitor for ranking changes.",
                    impact=f"Could affect visibility in {config.category_definition.primary_category}",
                    recommendation=f"Review content strategy against {competitor.domain}",
                    change_data={
                        "competitor_domain": competitor.domain,
                        "serp_overlap": competitor.serp_overlap,
                        "tier": competitor.tier.value
                    }
                ))
        
        return signals
    
    async def _detect_new_keywords(
        self,
        config: Configuration,
        competitors: List[Competitor],
        lookback_days: int
    ) -> List[Signal]:
        """Detect new keyword signals from competitor evidence."""
        signals = []
        
        for competitor in competitors:
            if competitor.evidence.top_overlap_keywords:
                # Check for keywords that might be new opportunities
                for keyword in competitor.evidence.top_overlap_keywords[:5]:
                    signals.append(Signal(
                        signal_type=SignalType.NEW_KEYWORD,
                        severity=SignalSeverity.MEDIUM,
                        competitor=competitor.name,
                        keyword=keyword,
                        title=f"Keyword opportunity: {keyword}",
                        description=f"Competitor {competitor.name} ranks for '{keyword}'",
                        impact="Potential traffic opportunity",
                        recommendation=f"Evaluate content creation for '{keyword}'",
                        change_data={
                            "source_competitor": competitor.name,
                            "keyword": keyword
                        }
                    ))
        
        return signals
    
    async def _detect_serp_entrants(
        self,
        config: Configuration,
        competitors: List[Competitor],
        lookback_days: int
    ) -> List[Signal]:
        """Detect new SERP entrants in category."""
        signals = []
        
        # Check for pending review competitors (potential new entrants)
        pending = config.competitors.get_pending()
        for competitor in pending:
            signals.append(Signal(
                signal_type=SignalType.SERP_ENTRANT,
                severity=SignalSeverity.MEDIUM,
                competitor=competitor.name,
                title=f"New competitor detected: {competitor.name}",
                description=f"{competitor.name} ({competitor.domain}) identified as potential competitor",
                impact="New competitive pressure in category",
                recommendation="Review and approve/reject in UCR",
                change_data={
                    "competitor_domain": competitor.domain,
                    "tier": competitor.tier.value,
                    "status": "pending_review"
                }
            ))
        
        return signals
    
    async def _detect_demand_inflections(
        self,
        config: Configuration,
        lookback_days: int
    ) -> List[Signal]:
        """Detect demand inflection signals based on UCR demand definition."""
        signals = []
        
        # Check demand definition from UCR Section D
        demand_def = config.demand_definition
        brand_keywords = demand_def.get("brand_keywords", {}).get("seed_terms", [])
        category_terms = demand_def.get("non_brand_keywords", {}).get("category_terms", [])
        
        if category_terms:
            # Signal about category demand
            signals.append(Signal(
                signal_type=SignalType.DEMAND_INFLECTION,
                severity=SignalSeverity.LOW,
                title=f"Category demand tracking active",
                description=f"Monitoring {len(category_terms)} category terms for demand changes",
                impact="Early detection of market shifts",
                recommendation="Review demand trends weekly",
                change_data={
                    "tracked_terms": len(category_terms),
                    "sample_terms": category_terms[:5]
                }
            ))
        
        return signals
    
    async def _enrich_signals_with_ai(
        self,
        config: Configuration,
        signals: List[Signal]
    ) -> List[Signal]:
        """Use AI to enrich signals with strategic recommendations."""
        if not self.ai_client:
            return signals
        
        try:
            # Generate insights for high-priority signals
            high_priority = [s for s in signals if s.is_high_priority]
            
            if high_priority:
                brand_context = {
                    "name": config.brand.name,
                    "industry": config.brand.industry,
                    "primary_goal": config.strategic_intent.primary_goal,
                    "risk_tolerance": config.strategic_intent.risk_tolerance
                }
                
                insights = await self.ai_client.generate_insights(
                    signals=[s.model_dump() for s in high_priority],
                    brand_context=brand_context
                )
                
                # Add AI insights to first signal
                if high_priority and insights:
                    high_priority[0].recommendation = (
                        f"{high_priority[0].recommendation}\n\nAI Analysis:\n{insights[:500]}"
                    )
        except Exception:
            # Don't fail if AI enrichment fails
            pass
        
        return signals
    
    def _severity_rank(self, severity: SignalSeverity) -> int:
        """Get numeric rank for severity comparison."""
        ranks = {
            SignalSeverity.LOW: 1,
            SignalSeverity.MEDIUM: 2,
            SignalSeverity.HIGH: 3,
            SignalSeverity.CRITICAL: 4
        }
        return ranks.get(severity, 0)


class SignalSummary:
    """Summary of detected signals."""
    
    def __init__(
        self,
        total_signals: int,
        high_priority_count: int,
        competitors_active: List[str],
        top_signal_type: Optional[SignalType],
        ucr_quality_score: int
    ):
        self.total_signals = total_signals
        self.high_priority_count = high_priority_count
        self.competitors_active = competitors_active
        self.top_signal_type = top_signal_type
        self.ucr_quality_score = ucr_quality_score
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_signals": self.total_signals,
            "high_priority_count": self.high_priority_count,
            "competitors_active": self.competitors_active,
            "top_signal_type": self.top_signal_type.value if self.top_signal_type else None,
            "ucr_quality_score": self.ucr_quality_score
        }


class SignalDetectionResult:
    """Result of signal detection with UCR trace."""
    
    def __init__(
        self,
        signals: List[Signal],
        run_trace: UCRRunTrace,
        summary: SignalSummary,
        filters_applied: List[str],
        rules_triggered: List[str]
    ):
        self.signals = signals
        self.run_trace = run_trace
        self.summary = summary
        self.filters_applied = filters_applied
        self.rules_triggered = rules_triggered
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "signals": [s.model_dump() for s in self.signals],
            "run_trace": self.run_trace.to_dict(),
            "summary": self.summary.to_dict(),
            "filters_applied": self.filters_applied,
            "rules_triggered": self.rules_triggered
        }
