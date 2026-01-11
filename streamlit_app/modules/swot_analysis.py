"""
SWOT Analysis Module
===================

Strategic module that performs comprehensive SWOT analysis.
"""

import streamlit as st
import asyncio
from typing import Dict, Any, List
from brand_intel.core.models import Configuration
from streamlit_app.modules.base_module import BaseModule, ModuleRunResult
from datetime import datetime
import random


class SWOTAnalysisModule(BaseModule):
    """SWOT Analysis Module."""

    module_id = "strategic.swot.v1"
    name = "SWOT Analysis"
    category = "Strategic"
    layer = "Synthesis"
    description = "Comprehensive strategic analysis identifying Strengths, Weaknesses, Opportunities, and Threats"
    strategic_question = "What are our strategic advantages and vulnerabilities?"

    required_sections = ["A", "B", "C"]
    optional_sections = ["D", "E", "F", "G", "H"]
    data_sources = ["Internal Analysis", "Market Research", "Competitive Intelligence"]

    risk_profile = {
        "confidence": "medium",
        "risk_if_wrong": "medium",
        "inference_type": "synthesis"
    }

    caching = {
        "cadence": "weekly",
        "bust_on_changes": ["brand_context", "category_scope", "competitor_set", "strategic_intent"]
    }

    def render_inputs(self, key_prefix: str = "") -> Dict[str, Any]:
        """Render input form for SWOT analysis parameters."""
        st.subheader("📊 Analysis Parameters")

        col1, col2 = st.columns(2)

        with col1:
            analysis_scope = st.selectbox(
                "Analysis Scope",
                options=["internal_only", "competitive", "market_wide"],
                index=1,
                format_func=lambda x: x.replace("_", " ").title(),
                help="How broad the SWOT analysis should be",
                key=f"{key_prefix}scope"
            )

            focus_areas = st.multiselect(
                "Strategic Focus Areas",
                options=[
                    "brand_positioning",
                    "market_positioning",
                    "operational_capabilities",
                    "financial_position",
                    "competitive_landscape",
                    "market_trends",
                    "regulatory_environment"
                ],
                default=["brand_positioning", "market_positioning", "competitive_landscape"],
                help="Which strategic areas to analyze",
                key=f"{key_prefix}focus"
            )

        with col2:
            include_quantitative = st.checkbox(
                "Include Quantitative Data",
                value=True,
                help="Include metrics and quantitative analysis",
                key=f"{key_prefix}quantitative"
            )

            stakeholder_perspective = st.selectbox(
                "Stakeholder Perspective",
                options=["executive", "operational", "investor", "customer"],
                index=0,
                help="Whose perspective to prioritize in the analysis",
                key=f"{key_prefix}perspective"
            )

        # Advanced options
        with st.expander("⚙️ Advanced Options"):
            confidence_threshold = st.slider(
                "Confidence Threshold",
                min_value=50,
                max_value=95,
                value=75,
                step=5,
                help="Minimum confidence level for insights to be included",
                key=f"{key_prefix}confidence"
            )

            include_recommendations = st.checkbox(
                "Generate Strategic Recommendations",
                value=True,
                help="Include actionable recommendations based on SWOT",
                key=f"{key_prefix}recommendations"
            )

        return {
            "analysis_scope": analysis_scope,
            "focus_areas": focus_areas,
            "include_quantitative": include_quantitative,
            "stakeholder_perspective": stakeholder_perspective,
            "confidence_threshold": confidence_threshold,
            "include_recommendations": include_recommendations
        }

    async def execute(self, config: Configuration, params: Dict[str, Any]) -> ModuleRunResult:
        """Execute SWOT analysis."""
        # Perform comprehensive SWOT analysis
        swot_analysis = await self._perform_swot_analysis(config, params)

        # Calculate strategic scores
        strategic_score = self._calculate_strategic_score(swot_analysis)
        risk_assessment = self._assess_strategic_risks(swot_analysis)

        summary = {
            "analysis_scope": params.get("analysis_scope", "competitive"),
            "stakeholder_perspective": params.get("stakeholder_perspective", "executive"),
            "strategic_score": strategic_score,
            "risk_assessment": risk_assessment,
            "swot_balance": self._calculate_swot_balance(swot_analysis),
            "key_insights_count": len(swot_analysis.get("key_insights", [])),
            "recommendations_count": len(swot_analysis.get("strategic_recommendations", [])),
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "parameters_used": params
        }

        envelope = {
            "module_id": self.module_id,
            "execution_time": datetime.utcnow().isoformat(),
            "data_sources": self.data_sources,
            "analysis_framework": "SWOT",
            "strategic_summary": summary
        }

        return ModuleRunResult(
            envelope=envelope,
            items=[swot_analysis],  # Single comprehensive analysis
            summary=summary
        )

    async def _perform_swot_analysis(self, config: Configuration, params: Dict[str, Any]) -> Dict[str, Any]:
        """Perform comprehensive SWOT analysis."""
        # Simulate analysis time
        await asyncio.sleep(1.5)

        focus_areas = params.get("focus_areas", [])
        analysis_scope = params.get("analysis_scope", "competitive")
        stakeholder_perspective = params.get("stakeholder_perspective", "executive")

        swot_results = {
            "strengths": [],
            "weaknesses": [],
            "opportunities": [],
            "threats": [],
            "key_insights": [],
            "strategic_recommendations": [],
            "quantitative_metrics": {},
            "confidence_levels": {}
        }

        # Analyze each focus area
        for area in focus_areas:
            area_analysis = await self._analyze_focus_area(area, config, analysis_scope)
            for category in ["strengths", "weaknesses", "opportunities", "threats"]:
                swot_results[category].extend(area_analysis.get(category, []))

        # Generate key insights and recommendations
        swot_results["key_insights"] = self._generate_key_insights(swot_results, stakeholder_perspective)
        swot_results["strategic_recommendations"] = self._generate_recommendations(swot_results, stakeholder_perspective)

        # Add quantitative metrics if requested
        if params.get("include_quantitative", True):
            swot_results["quantitative_metrics"] = self._calculate_quantitative_metrics(swot_results)

        return swot_results

    async def _analyze_focus_area(self, area: str, config: Configuration, scope: str) -> Dict[str, Any]:
        """Analyze a specific focus area for SWOT."""
        await asyncio.sleep(0.1)  # Small delay per area

        analysis_templates = {
            "brand_positioning": {
                "strengths": [
                    "Strong brand recognition in target market",
                    "Consistent brand messaging across channels",
                    "Positive brand perception among customers"
                ],
                "weaknesses": [
                    "Limited brand presence in emerging markets",
                    "Brand awareness lower than key competitors"
                ],
                "opportunities": [
                    "Expand brand into new market segments",
                    "Leverage brand strength for premium positioning",
                    "Develop brand partnerships with influencers"
                ],
                "threats": [
                    "Competitor brand campaigns gaining traction",
                    "Negative brand reviews impacting perception",
                    "Brand dilution from inconsistent messaging"
                ]
            },
            "market_positioning": {
                "strengths": [
                    "Strong market share in core segments",
                    "Established distribution channels",
                    "Customer loyalty and retention rates"
                ],
                "weaknesses": [
                    "Limited presence in high-growth segments",
                    "Higher price points than key competitors"
                ],
                "opportunities": [
                    "Enter high-growth market segments",
                    "Develop new distribution partnerships",
                    "Leverage market leadership for premium pricing"
                ],
                "threats": [
                    "New market entrants with disruptive pricing",
                    "Changing customer preferences",
                    "Economic downturns affecting discretionary spending"
                ]
            },
            "competitive_landscape": {
                "strengths": [
                    "Superior product quality vs competitors",
                    "Strong customer service reputation",
                    "Innovative product development pipeline"
                ],
                "weaknesses": [
                    "Higher costs than low-price competitors",
                    "Slower time-to-market than some competitors"
                ],
                "opportunities": [
                    "Capitalize on competitor weaknesses",
                    "Develop strategic partnerships",
                    "Invest in competitive intelligence"
                ],
                "threats": [
                    "Competitor mergers and acquisitions",
                    "New competitive entrants with innovative business models",
                    "Competitor pricing wars"
                ]
            }
        }

        # Get base analysis for the area
        base_analysis = analysis_templates.get(area, {
            "strengths": ["Area-specific strength to be analyzed"],
            "weaknesses": ["Area-specific weakness to be analyzed"],
            "opportunities": ["Area-specific opportunity to be analyzed"],
            "threats": ["Area-specific threat to be analyzed"]
        })

        # Adjust based on scope
        if scope == "internal_only":
            # Reduce external factors
            base_analysis["opportunities"] = base_analysis["opportunities"][:1]
            base_analysis["threats"] = base_analysis["threats"][:1]
        elif scope == "market_wide":
            # Add more external factors
            base_analysis["opportunities"].extend([
                "Market expansion opportunities",
                "New customer segment development"
            ])
            base_analysis["threats"].extend([
                "Regulatory changes",
                "Economic uncertainty"
            ])

        return base_analysis

    def _generate_key_insights(self, swot_results: Dict[str, Any], perspective: str) -> List[str]:
        """Generate key insights from SWOT analysis."""
        insights = []

        strengths_count = len(swot_results.get("strengths", []))
        weaknesses_count = len(swot_results.get("weaknesses", []))
        opportunities_count = len(swot_results.get("opportunities", []))
        threats_count = len(swot_results.get("threats", []))

        # Balance insights
        if strengths_count > weaknesses_count:
            insights.append("Strong internal capabilities provide competitive advantages")
        else:
            insights.append("Internal weaknesses may limit strategic options")

        if opportunities_count > threats_count:
            insights.append("Favorable external environment presents growth opportunities")
        else:
            insights.append("Challenging external environment requires defensive strategies")

        # Perspective-specific insights
        if perspective == "executive":
            insights.extend([
                "Strategic positioning shows clear differentiation opportunities",
                "Resource allocation should prioritize high-impact opportunities"
            ])
        elif perspective == "investor":
            insights.extend([
                "Risk-adjusted return profile suggests conservative growth strategy",
                "Competitive advantages may not be sustainable long-term"
            ])
        elif perspective == "operational":
            insights.extend([
                "Operational improvements needed in key weakness areas",
                "Process optimization can address capability gaps"
            ])

        return insights

    def _generate_recommendations(self, swot_results: Dict[str, Any], perspective: str) -> List[Dict[str, Any]]:
        """Generate strategic recommendations based on SWOT."""
        recommendations = []

        # Build on strengths
        if len(swot_results.get("strengths", [])) > 0:
            recommendations.append({
                "type": "leverage_strengths",
                "priority": "high",
                "title": "Leverage Core Strengths",
                "description": "Capitalize on identified strengths to gain competitive advantage",
                "actions": ["Double down on strength areas", "Use strengths to enter new markets"]
            })

        # Address weaknesses
        if len(swot_results.get("weaknesses", [])) > 0:
            recommendations.append({
                "type": "address_weaknesses",
                "priority": "high",
                "title": "Address Critical Weaknesses",
                "description": "Develop strategies to overcome identified weaknesses",
                "actions": ["Invest in weakness improvement", "Partner to compensate for gaps"]
            })

        # Pursue opportunities
        if len(swot_results.get("opportunities", [])) > 0:
            recommendations.append({
                "type": "pursue_opportunities",
                "priority": "medium",
                "title": "Pursue High-Value Opportunities",
                "description": "Actively pursue identified market opportunities",
                "actions": ["Prioritize opportunity development", "Allocate resources to opportunity pursuit"]
            })

        # Mitigate threats
        if len(swot_results.get("threats", [])) > 0:
            recommendations.append({
                "type": "mitigate_threats",
                "priority": "medium",
                "title": "Develop Threat Mitigation Strategies",
                "description": "Prepare contingency plans for identified threats",
                "actions": ["Monitor threat indicators", "Develop risk mitigation plans"]
            })

        return recommendations

    def _calculate_quantitative_metrics(self, swot_results: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate quantitative metrics for SWOT analysis."""
        metrics = {
            "swot_balance_score": 0,
            "strength_weighted_score": 0,
            "opportunity_potential": 0,
            "threat_severity": 0,
            "strategic_agility_index": 0
        }

        # SWOT Balance Score (ideal is balanced around 0)
        s_count = len(swot_results.get("strengths", []))
        w_count = len(swot_results.get("weaknesses", []))
        o_count = len(swot_results.get("opportunities", []))
        t_count = len(swot_results.get("threats", []))

        metrics["swot_balance_score"] = ((s_count - w_count) + (o_count - t_count)) / 4

        # Strength Weighted Score
        metrics["strength_weighted_score"] = s_count * 1.5 - w_count * 1.2

        # Opportunity Potential
        metrics["opportunity_potential"] = o_count * 2.0 - t_count * 1.5

        # Threat Severity
        metrics["threat_severity"] = t_count * 1.8 - s_count * 0.5

        # Strategic Agility Index (ability to adapt)
        internal_balance = abs(s_count - w_count)
        external_balance = abs(o_count - t_count)
        metrics["strategic_agility_index"] = 100 - (internal_balance + external_balance) * 5

        return metrics

    def _calculate_strategic_score(self, swot_analysis: Dict[str, Any]) -> float:
        """Calculate overall strategic score."""
        metrics = swot_analysis.get("quantitative_metrics", {})

        base_score = 50  # Neutral starting point

        # Adjust based on SWOT balance
        balance_adjustment = metrics.get("swot_balance_score", 0) * 10
        base_score += balance_adjustment

        # Adjust based on strengths and opportunities
        strength_adjustment = metrics.get("strength_weighted_score", 0) * 2
        base_score += strength_adjustment

        opportunity_adjustment = metrics.get("opportunity_potential", 0) * 1.5
        base_score += opportunity_adjustment

        # Adjust based on threats
        threat_adjustment = -metrics.get("threat_severity", 0) * 1.2
        base_score += threat_adjustment

        # Adjust based on agility
        agility_adjustment = (metrics.get("strategic_agility_index", 50) - 50) * 0.5
        base_score += agility_adjustment

        return max(0, min(100, base_score))

    def _assess_strategic_risks(self, swot_analysis: Dict[str, Any]) -> str:
        """Assess strategic risk level."""
        threat_count = len(swot_analysis.get("threats", []))
        weakness_count = len(swot_analysis.get("weaknesses", []))
        opportunity_count = len(swot_analysis.get("opportunities", []))

        risk_score = (threat_count * 2) + weakness_count - (opportunity_count * 0.5)

        if risk_score >= 8:
            return "high"
        elif risk_score >= 4:
            return "medium"
        else:
            return "low"

    def _calculate_swot_balance(self, swot_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate SWOT balance metrics."""
        s = len(swot_analysis.get("strengths", []))
        w = len(swot_analysis.get("weaknesses", []))
        o = len(swot_analysis.get("opportunities", []))
        t = len(swot_analysis.get("threats", []))

        return {
            "internal_balance": s - w,  # Positive = strengths dominate
            "external_balance": o - t,  # Positive = opportunities dominate
            "overall_balance": (s + o) - (w + t),  # Positive = favorable position
            "balance_ratio": (s + o) / max(1, w + t)  # Favorable factors vs challenges
        }

    def render_results(self, result: ModuleRunResult):
        """Render SWOT analysis results."""
        st.subheader("📊 SWOT Analysis Results")

        if not result.items:
            st.error("No SWOT analysis results available")
            return

        swot_analysis = result.items[0]
        summary = result.summary

        # Strategic overview metrics
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            strategic_score = summary.get("strategic_score", 0)
            st.metric(
                "Strategic Score",
                f"{strategic_score:.1f}/100",
                delta=f"{'Strong' if strategic_score >= 70 else 'Moderate' if strategic_score >= 50 else 'Weak'}"
            )

        with col2:
            risk_level = summary.get("risk_assessment", "medium")
            risk_colors = {"high": "🔴", "medium": "🟠", "low": "🟢"}
            st.metric("Risk Assessment", risk_level.title(), delta=risk_colors.get(risk_level, "⚪"))

        with col3:
            balance = summary.get("swot_balance", {})
            overall_balance = balance.get("overall_balance", 0)
            st.metric("SWOT Balance", f"{overall_balance:+d}")

        with col4:
            insights_count = summary.get("key_insights_count", 0)
            st.metric("Key Insights", insights_count)

        # SWOT Matrix
        st.subheader("🎯 SWOT Matrix")

        col1, col2 = st.columns(2)

        with col1:
            # Strengths and Weaknesses
            st.markdown("#### ✅ Strengths")
            strengths = swot_analysis.get("strengths", [])
            if strengths:
                for strength in strengths:
                    st.success(f"• {strength}")
            else:
                st.info("No strengths identified")

            st.markdown("#### ⚠️ Weaknesses")
            weaknesses = swot_analysis.get("weaknesses", [])
            if weaknesses:
                for weakness in weaknesses:
                    st.warning(f"• {weakness}")
            else:
                st.info("No weaknesses identified")

        with col2:
            # Opportunities and Threats
            st.markdown("#### 🚀 Opportunities")
            opportunities = swot_analysis.get("opportunities", [])
            if opportunities:
                for opportunity in opportunities:
                    st.info(f"• {opportunity}")
            else:
                st.info("No opportunities identified")

            st.markdown("#### ⚡ Threats")
            threats = swot_analysis.get("threats", [])
            if threats:
                for threat in threats:
                    st.error(f"• {threat}")
            else:
                st.info("No threats identified")

        # Key Insights
        if swot_analysis.get("key_insights"):
            st.subheader("💡 Key Strategic Insights")
            for insight in swot_analysis["key_insights"]:
                st.info(f"💡 {insight}")

        # Strategic Recommendations
        if swot_analysis.get("strategic_recommendations"):
            st.subheader("🎯 Strategic Recommendations")

            recommendations = swot_analysis["strategic_recommendations"]
            for rec in recommendations:
                priority_icon = {"high": "🔴", "medium": "🟠", "low": "🟢"}.get(rec["priority"], "⚪")

                with st.expander(f"{priority_icon} {rec['title']}", expanded=rec["priority"] == "high"):
                    st.write(rec["description"])

                    if rec.get("actions"):
                        st.markdown("**Recommended Actions:**")
                        for action in rec["actions"]:
                            st.markdown(f"• {action}")

        # Quantitative Metrics (if available)
        metrics = swot_analysis.get("quantitative_metrics", {})
        if metrics:
            st.subheader("📈 Quantitative Analysis")

            # Create metrics visualization
            import plotly.graph_objects as go

            categories = ["SWOT Balance", "Strength Weighted", "Opportunity Potential", "Threat Severity", "Strategic Agility"]
            values = [
                metrics.get("swot_balance_score", 0),
                metrics.get("strength_weighted_score", 0),
                metrics.get("opportunity_potential", 0),
                metrics.get("threat_severity", 0),
                metrics.get("strategic_agility_index", 0)
            ]

            fig = go.Figure(data=[
                go.Bar(
                    x=categories,
                    y=values,
                    marker_color=['#007bff', '#28a745', '#17a2b8', '#dc3545', '#ffc107']
                )
            ])

            fig.update_layout(
                title="Strategic Position Metrics",
                xaxis_title="Metric",
                yaxis_title="Score",
                height=400
            )

            st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})

        # Export options
        st.subheader("📄 Export SWOT Analysis")

        col1, col2 = st.columns(2)

        with col1:
            # SWOT Summary Export
            swot_summary = f"""
            SWOT Analysis Summary - {datetime.now().strftime('%Y-%m-%d')}

            Strengths ({len(swot_analysis.get('strengths', []))}):
            {chr(10).join(f"• {s}" for s in swot_analysis.get('strengths', []))}

            Weaknesses ({len(swot_analysis.get('weaknesses', []))}):
            {chr(10).join(f"• {w}" for w in swot_analysis.get('weaknesses', []))}

            Opportunities ({len(swot_analysis.get('opportunities', []))}):
            {chr(10).join(f"• {o}" for o in swot_analysis.get('opportunities', []))}

            Threats ({len(swot_analysis.get('threats', []))}):
            {chr(10).join(f"• {t}" for t in swot_analysis.get('threats', []))}

            Strategic Score: {summary.get('strategic_score', 0):.1f}/100
            Risk Assessment: {summary.get('risk_assessment', 'medium').title()}

            Generated by Brand Intelligence Platform
            """

            st.download_button(
                label="📋 Download SWOT Summary",
                data=swot_summary,
                file_name=f"swot_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
                mime="text/plain",
                use_container_width=True
            )

        with col2:
            # JSON Export
            export_data = {
                "summary": summary,
                "swot_analysis": swot_analysis,
                "metadata": result.envelope
            }

            import json
            st.download_button(
                label="📊 Download JSON",
                data=json.dumps(export_data, indent=2),
                file_name=f"swot_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json",
                use_container_width=True
            )
