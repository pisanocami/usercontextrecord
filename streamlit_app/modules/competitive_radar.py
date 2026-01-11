"""
Competitive Radar Module
=======================

Competitive module that provides a 360° view of competitor landscape.
"""

import streamlit as st
import asyncio
from typing import Dict, Any, List
from brand_intel.core.models import Configuration, Competitor
from streamlit_app.modules.base_module import BaseModule, ModuleRunResult
import pandas as pd
from datetime import datetime
import random


class CompetitiveRadarModule(BaseModule):
    """Competitive Radar Analysis Module."""

    module_id = "competitive.radar.v1"
    name = "Competitive Radar"
    category = "Competitive"
    layer = "Synthesis"
    description = "360° competitive intelligence view combining signals, positioning, and threats"
    strategic_question = "What is our competitive position and what threats/opportunities exist?"

    required_sections = ["A", "C"]
    optional_sections = ["B", "D", "E", "F", "G", "H"]
    data_sources = ["Internal", "Web Scraping", "Social Media", "News APIs"]

    risk_profile = {
        "confidence": "high",
        "risk_if_wrong": "high",
        "inference_type": "synthesis"
    }

    caching = {
        "cadence": "daily",
        "bust_on_changes": ["competitor_set", "market_signals"]
    }

    def render_inputs(self, key_prefix: str = "") -> Dict[str, Any]:
        """Render input form for competitive radar parameters."""
        st.subheader("🎯 Analysis Parameters")

        col1, col2 = st.columns(2)

        with col1:
            analysis_depth = st.selectbox(
                "Analysis Depth",
                options=["basic", "comprehensive", "deep_dive"],
                index=1,
                format_func=lambda x: x.replace("_", " ").title(),
                help="How thorough the competitive analysis should be",
                key=f"{key_prefix}depth"
            )

            focus_areas = st.multiselect(
                "Focus Areas",
                options=[
                    "market_positioning",
                    "brand_strength",
                    "digital_presence",
                    "content_strategy",
                    "pricing_strategy",
                    "customer_satisfaction"
                ],
                default=["market_positioning", "digital_presence", "brand_strength"],
                help="Which competitive aspects to analyze",
                key=f"{key_prefix}focus"
            )

        with col2:
            include_market_signals = st.checkbox(
                "Include Market Signals",
                value=True,
                help="Analyze recent market signals and announcements",
                key=f"{key_prefix}signals"
            )

            benchmark_against = st.multiselect(
                "Benchmark Against",
                options=["industry_leaders", "direct_competitors", "emerging_players"],
                default=["direct_competitors", "industry_leaders"],
                help="Which competitors to benchmark against",
                key=f"{key_prefix}benchmark"
            )

        # Advanced options
        with st.expander("⚙️ Advanced Options"):
            time_range = st.selectbox(
                "Analysis Time Range",
                options=["3_months", "6_months", "1_year", "2_years"],
                index=2,
                format_func=lambda x: x.replace("_", " ").title(),
                help="How far back to analyze competitive activity",
                key=f"{key_prefix}time_range"
            )

            include_predictions = st.checkbox(
                "Include Predictive Analysis",
                value=False,
                help="Predict future competitive moves (experimental)",
                key=f"{key_prefix}predictions"
            )

        return {
            "analysis_depth": analysis_depth,
            "focus_areas": focus_areas,
            "include_market_signals": include_market_signals,
            "benchmark_against": benchmark_against,
            "time_range": time_range,
            "include_predictions": include_predictions
        }

    async def execute(self, config: Configuration, params: Dict[str, Any]) -> ModuleRunResult:
        """Execute competitive radar analysis."""
        # Get approved competitors
        competitors = config.competitors.get_approved()

        if not competitors:
            return ModuleRunResult(
                envelope={"error": "No approved competitors available"},
                items=[],
                summary={"error": "No approved competitors"}
            )

        # Perform comprehensive competitive analysis
        radar_data = await self._analyze_competitive_radar(config, competitors, params)

        # Calculate summary metrics
        threat_score = self._calculate_threat_score(radar_data)
        opportunity_score = self._calculate_opportunity_score(radar_data)
        competitive_position = self._determine_competitive_position(radar_data, config)

        summary = {
            "competitors_analyzed": len(competitors),
            "threat_score": threat_score,
            "opportunity_score": opportunity_score,
            "competitive_position": competitive_position,
            "analysis_depth": params.get("analysis_depth", "comprehensive"),
            "focus_areas_covered": len(params.get("focus_areas", [])),
            "key_insights": len([r for r in radar_data if r.get("priority") == "high"]),
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "parameters_used": params
        }

        envelope = {
            "module_id": self.module_id,
            "execution_time": datetime.utcnow().isoformat(),
            "data_sources": self.data_sources,
            "analysis_scope": params.get("focus_areas", []),
            "competitive_summary": summary
        }

        return ModuleRunResult(
            envelope=envelope,
            items=radar_data,
            summary=summary
        )

    async def _analyze_competitive_radar(
        self, config: Configuration, competitors: List[Competitor], params: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Analyze competitive radar for all competitors."""
        # Simulate comprehensive analysis
        await asyncio.sleep(2)

        focus_areas = params.get("focus_areas", [])
        analysis_depth = params.get("analysis_depth", "comprehensive")

        radar_results = []

        for competitor in competitors:
            competitor_analysis = await self._analyze_single_competitor(
                competitor, config, focus_areas, analysis_depth
            )
            radar_results.append(competitor_analysis)

        # Sort by threat level
        radar_results.sort(key=lambda x: x.get("threat_score", 0), reverse=True)

        return radar_results

    async def _analyze_single_competitor(
        self,
        competitor: Competitor,
        config: Configuration,
        focus_areas: List[str],
        analysis_depth: str
    ) -> Dict[str, Any]:
        """Analyze a single competitor comprehensively."""
        await asyncio.sleep(0.1)  # Small delay per competitor

        analysis = {
            "competitor_name": competitor.name,
            "competitor_domain": competitor.domain,
            "tier": competitor.tier.value,
            "threat_score": 0,
            "opportunity_score": 0,
            "strengths": [],
            "weaknesses": [],
            "recent_moves": [],
            "market_signals": [],
            "competitive_gaps": [],
            "recommendations": [],
            "priority": "medium",
            "last_updated": datetime.utcnow().isoformat()
        }

        # Analyze each focus area
        if "market_positioning" in focus_areas:
            market_data = self._analyze_market_positioning(competitor, config)
            analysis.update(market_data)

        if "brand_strength" in focus_areas:
            brand_data = self._analyze_brand_strength(competitor)
            analysis.update(brand_data)

        if "digital_presence" in focus_areas:
            digital_data = self._analyze_digital_presence(competitor)
            analysis.update(digital_data)

        if "content_strategy" in focus_areas:
            content_data = self._analyze_content_strategy(competitor)
            analysis.update(content_data)

        if "pricing_strategy" in focus_areas:
            pricing_data = self._analyze_pricing_strategy(competitor)
            analysis.update(pricing_data)

        if "customer_satisfaction" in focus_areas:
            satisfaction_data = self._analyze_customer_satisfaction(competitor)
            analysis.update(satisfaction_data)

        # Calculate overall scores
        analysis["threat_score"] = self._calculate_competitor_threat(analysis)
        analysis["opportunity_score"] = self._calculate_competitor_opportunity(analysis)

        # Determine priority
        if analysis["threat_score"] >= 80:
            analysis["priority"] = "critical"
        elif analysis["threat_score"] >= 60:
            analysis["priority"] = "high"
        elif analysis["opportunity_score"] >= 70:
            analysis["priority"] = "high"

        return analysis

    def _analyze_market_positioning(self, competitor: Competitor, config: Configuration) -> Dict[str, Any]:
        """Analyze competitor's market positioning."""
        # Mock analysis based on competitor data
        market_share = random.uniform(0.5, 15.0)  # Mock market share %
        growth_rate = random.uniform(-5.0, 25.0)  # Mock growth rate %
        positioning = random.choice(["Premium", "Value", "Mass Market", "Niche", "Disruptor"])

        strengths = []
        weaknesses = []

        if market_share > 10:
            strengths.append("Strong market presence")
        if growth_rate > 15:
            strengths.append("Rapid growth trajectory")
        if positioning == "Premium":
            strengths.append("Premium positioning")
        elif positioning == "Value":
            strengths.append("Competitive pricing strategy")

        if market_share < 2:
            weaknesses.append("Limited market presence")
        if growth_rate < 0:
            weaknesses.append("Declining market share")

        return {
            "market_share_percent": round(market_share, 1),
            "growth_rate_percent": round(growth_rate, 1),
            "market_positioning": positioning,
            "positioning_strengths": strengths,
            "positioning_weaknesses": weaknesses
        }

    def _analyze_brand_strength(self, competitor: Competitor) -> Dict[str, Any]:
        """Analyze competitor's brand strength."""
        brand_score = random.randint(30, 95)
        awareness = random.randint(20, 90)
        perception = random.choice(["Premium", "Reliable", "Innovative", "Budget", "Generic"])

        return {
            "brand_strength_score": brand_score,
            "brand_awareness_percent": awareness,
            "brand_perception": perception,
            "brand_signals": [
                f"Brand awareness: {awareness}%",
                f"Brand perception: {perception}",
                f"Overall strength: {brand_score}/100"
            ]
        }

    def _analyze_digital_presence(self, competitor: Competitor) -> Dict[str, Any]:
        """Analyze competitor's digital presence."""
        website_score = random.randint(40, 95)
        social_followers = random.randint(1000, 500000)
        content_quality = random.choice(["Excellent", "Good", "Average", "Poor"])

        return {
            "website_score": website_score,
            "social_followers": social_followers,
            "content_quality": content_quality,
            "digital_strengths": [
                f"Website quality: {website_score}/100",
                f"Social presence: {social_followers:,} followers",
                f"Content quality: {content_quality}"
            ]
        }

    def _analyze_content_strategy(self, competitor: Competitor) -> Dict[str, Any]:
        """Analyze competitor's content strategy."""
        content_volume = random.randint(10, 200)
        content_quality = random.choice(["High", "Medium", "Low"])
        topics = ["Product Reviews", "How-to Guides", "Industry News", "Customer Stories"]

        return {
            "content_volume_monthly": content_volume,
            "content_quality": content_quality,
            "content_topics": random.sample(topics, 2),
            "content_insights": [
                f"Content volume: {content_volume} posts/month",
                f"Content quality: {content_quality}",
                f"Topics covered: {', '.join(random.sample(topics, 2))}"
            ]
        }

    def _analyze_pricing_strategy(self, competitor: Competitor) -> Dict[str, Any]:
        """Analyze competitor's pricing strategy."""
        price_position = random.choice(["Premium", "Market Rate", "Value", "Discount"])
        price_consistency = random.randint(70, 95)

        return {
            "pricing_strategy": price_position,
            "price_consistency_percent": price_consistency,
            "pricing_signals": [
                f"Pricing position: {price_position}",
                f"Price consistency: {price_consistency}%"
            ]
        }

    def _analyze_customer_satisfaction(self, competitor: Competitor) -> Dict[str, Any]:
        """Analyze competitor's customer satisfaction."""
        satisfaction_score = random.randint(60, 95)
        review_count = random.randint(100, 5000)
        net_promoter_score = random.randint(10, 70)

        return {
            "customer_satisfaction_score": satisfaction_score,
            "total_reviews": review_count,
            "net_promoter_score": net_promoter_score,
            "satisfaction_insights": [
                f"Customer satisfaction: {satisfaction_score}/100",
                f"Review volume: {review_count:,}",
                f"Net Promoter Score: {net_promoter_score}"
            ]
        }

    def _calculate_competitor_threat(self, analysis: Dict[str, Any]) -> int:
        """Calculate threat score for a competitor."""
        threat_score = 0

        # Market positioning factors
        if analysis.get("market_share_percent", 0) > 5:
            threat_score += 25
        if analysis.get("growth_rate_percent", 0) > 10:
            threat_score += 20

        # Brand strength factors
        if analysis.get("brand_strength_score", 0) > 70:
            threat_score += 20

        # Digital presence factors
        if analysis.get("website_score", 0) > 70:
            threat_score += 15
        if analysis.get("social_followers", 0) > 50000:
            threat_score += 10

        # Customer satisfaction factors
        if analysis.get("customer_satisfaction_score", 0) > 80:
            threat_score += 10

        return min(100, threat_score)

    def _calculate_competitor_opportunity(self, analysis: Dict[str, Any]) -> int:
        """Calculate opportunity score for a competitor."""
        opportunity_score = 0

        # Weaknesses present opportunities
        weaknesses_count = len(analysis.get("positioning_weaknesses", []))
        opportunity_score += weaknesses_count * 15

        # Low market share = opportunity
        market_share = analysis.get("market_share_percent", 0)
        if market_share < 5:
            opportunity_score += 25

        # Growth challenges = opportunity
        growth_rate = analysis.get("growth_rate_percent", 0)
        if growth_rate < 5:
            opportunity_score += 20

        # Brand weaknesses = opportunity
        brand_score = analysis.get("brand_strength_score", 0)
        if brand_score < 60:
            opportunity_score += 20

        return min(100, opportunity_score)

    def _determine_competitive_position(
        self, radar_data: List[Dict[str, Any]], config: Configuration
    ) -> str:
        """Determine overall competitive position."""
        if not radar_data:
            return "unknown"

        avg_threat = sum(r.get("threat_score", 0) for r in radar_data) / len(radar_data)
        high_threat_competitors = len([r for r in radar_data if r.get("threat_score", 0) >= 70])

        if avg_threat >= 70 and high_threat_competitors >= 2:
            return "highly_competitive"
        elif avg_threat >= 50 or high_threat_competitors >= 1:
            return "moderately_competitive"
        elif avg_threat >= 30:
            return "somewhat_competitive"
        else:
            return "weak_competition"

    def render_results(self, result: ModuleRunResult):
        """Render competitive radar analysis results."""
        st.subheader("🎯 Competitive Radar Analysis")

        if result.summary.get("error"):
            st.error(f"Analysis failed: {result.summary['error']}")
            return

        summary = result.summary

        # Overview metrics
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            threat_score = summary.get("threat_score", 0)
            st.metric(
                "Overall Threat Level",
                f"{threat_score}/100",
                delta=f"{'High' if threat_score >= 70 else 'Medium' if threat_score >= 40 else 'Low'}"
            )

        with col2:
            opportunity_score = summary.get("opportunity_score", 0)
            st.metric(
                "Opportunity Score",
                f"{opportunity_score}/100",
                delta=f"{'High' if opportunity_score >= 70 else 'Medium' if opportunity_score >= 40 else 'Low'}"
            )

        with col3:
            position = summary.get("competitive_position", "unknown")
            position_display = position.replace("_", " ").title()
            st.metric("Market Position", position_display)

        with col4:
            competitors = summary.get("competitors_analyzed", 0)
            st.metric("Competitors Analyzed", competitors)

        # Competitive landscape visualization
        if result.items:
            st.subheader("📊 Competitive Landscape")

            # Create radar chart data
            competitors_data = []
            for item in result.items[:8]:  # Show top 8 competitors
                competitors_data.append({
                    "name": item["competitor_name"],
                    "threat": item.get("threat_score", 0),
                    "opportunity": item.get("opportunity_score", 0),
                    "priority": item.get("priority", "medium")
                })

            # Threat vs Opportunity Scatter Plot
            import plotly.express as px

            df = pd.DataFrame(competitors_data)

            fig = px.scatter(
                df,
                x="threat",
                y="opportunity",
                text="name",
                title="Competitive Threat vs Opportunity Matrix",
                labels={"threat": "Threat Level", "opportunity": "Opportunity Score"},
                color="priority",
                color_discrete_map={"critical": "red", "high": "orange", "medium": "blue", "low": "green"}
            )

            fig.update_traces(textposition="top center")
            fig.update_layout(height=500)

            st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})

        # Detailed competitor analysis
        if result.items:
            st.subheader("🔍 Detailed Competitor Analysis")

            # Sort by threat score for display
            sorted_competitors = sorted(result.items, key=lambda x: x.get("threat_score", 0), reverse=True)

            for i, competitor in enumerate(sorted_competitors[:5]):  # Show top 5
                priority = competitor.get("priority", "medium")
                priority_colors = {
                    "critical": "🔴",
                    "high": "🟠",
                    "medium": "🟡",
                    "low": "🟢"
                }

                with st.expander(
                    f"{priority_colors.get(priority, '⚪')} {competitor['competitor_name']} "
                    f"(Threat: {competitor.get('threat_score', 0)}, "
                    f"Opportunity: {competitor.get('opportunity_score', 0)})",
                    expanded=i == 0  # Expand first competitor
                ):
                    self._render_competitor_details(competitor)

        # Strategic recommendations
        st.subheader("🎯 Strategic Recommendations")

        recommendations = self._generate_radar_recommendations(result.summary)

        for rec in recommendations:
            priority_icon = {"high": "🔴", "medium": "🟠", "low": "🟢"}.get(rec["priority"], "⚪")
            with st.expander(f"{priority_icon} {rec['title']}", expanded=rec["priority"] == "high"):
                st.write(rec["description"])
                if rec.get("actions"):
                    st.markdown("**Recommended Actions:**")
                    for action in rec["actions"]:
                        st.markdown(f"• {action}")

    def _render_competitor_details(self, competitor: Dict[str, Any]):
        """Render detailed analysis for a single competitor."""
        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Market Positioning**")
            if "market_share_percent" in competitor:
                st.write(f"Market Share: {competitor['market_share_percent']}%")
            if "market_positioning" in competitor:
                st.write(f"Positioning: {competitor['market_positioning']}")

            st.markdown("**Brand Strength**")
            if "brand_strength_score" in competitor:
                st.write(f"Brand Score: {competitor['brand_strength_score']}/100")
            if "brand_perception" in competitor:
                st.write(f"Perception: {competitor['brand_perception']}")

        with col2:
            st.markdown("**Digital Presence**")
            if "website_score" in competitor:
                st.write(f"Website: {competitor['website_score']}/100")
            if "content_quality" in competitor:
                st.write(f"Content: {competitor['content_quality']}")

            st.markdown("**Customer Satisfaction**")
            if "customer_satisfaction_score" in competitor:
                st.write(f"Satisfaction: {competitor['customer_satisfaction_score']}/100")

        # Strengths and weaknesses
        if competitor.get("positioning_strengths"):
            st.markdown("**Strengths:**")
            for strength in competitor["positioning_strengths"]:
                st.success(f"✓ {strength}")

        if competitor.get("positioning_weaknesses"):
            st.markdown("**Weaknesses:**")
            for weakness in competitor["positioning_weaknesses"]:
                st.warning(f"⚠️ {weakness}")

        # Key insights
        insights = competitor.get("brand_signals", []) + \
                  competitor.get("digital_strengths", []) + \
                  competitor.get("satisfaction_insights", [])

        if insights:
            st.markdown("**Key Insights:**")
            for insight in insights[:5]:  # Show top 5 insights
                st.info(f"💡 {insight}")

    def _generate_radar_recommendations(self, summary: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate strategic recommendations based on radar analysis."""
        recommendations = []

        threat_score = summary.get("threat_score", 0)
        opportunity_score = summary.get("opportunity_score", 0)
        position = summary.get("competitive_position", "unknown")

        # High threat recommendations
        if threat_score >= 70:
            recommendations.append({
                "priority": "high",
                "title": "Address High Competitive Threats",
                "description": "Multiple high-threat competitors identified. Immediate action required to maintain market position.",
                "actions": [
                    "Conduct deep competitive analysis on top threats",
                    "Strengthen unique value propositions",
                    "Consider defensive marketing campaigns",
                    "Evaluate pricing and positioning strategies",
                    "Monitor competitor moves closely"
                ]
            })

        # High opportunity recommendations
        if opportunity_score >= 70:
            recommendations.append({
                "priority": "high",
                "title": "Capitalize on Competitive Weaknesses",
                "description": "Significant opportunities identified in competitor weaknesses. Consider offensive strategies.",
                "actions": [
                    "Target competitor weaknesses in marketing",
                    "Develop positioning against competitor gaps",
                    "Consider market share expansion",
                    "Monitor for competitor consolidation opportunities"
                ]
            })

        # Competitive position recommendations
        if position == "highly_competitive":
            recommendations.append({
                "priority": "medium",
                "title": "Navigate Highly Competitive Market",
                "description": "Operating in a highly competitive environment. Focus on differentiation and efficiency.",
                "actions": [
                    "Strengthen brand differentiation",
                    "Optimize operational efficiency",
                    "Consider niche positioning",
                    "Build customer loyalty programs",
                    "Monitor competitor pricing closely"
                ]
            })

        elif position == "weak_competition":
            recommendations.append({
                "priority": "medium",
                "title": "Exploit Weak Competitive Environment",
                "description": "Limited competitive pressure provides growth opportunities.",
                "actions": [
                    "Expand market share aggressively",
                    "Invest in brand building",
                    "Consider market expansion",
                    "Build comprehensive market coverage"
                ]
            })

        return recommendations
