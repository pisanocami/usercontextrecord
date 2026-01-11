"""
Keyword Gap & Visibility Module
==============================

SEO Signal module that identifies search demand competitors capture that the brand doesn't.
"""

import streamlit as st
import asyncio
from typing import Dict, Any, List
from brand_intel.core.models import Configuration, Competitor
from streamlit_app.modules.base_module import BaseModule, ModuleRunResult
import pandas as pd
from datetime import datetime


class KeywordGapModule(BaseModule):
    """Keyword Gap & Visibility Analysis Module."""

    module_id = "seo.keyword_gap_visibility.v1"
    name = "Keyword Gap & Visibility"
    category = "SEO Signal"
    layer = "Signal"
    description = "Identifies commercially meaningful search demand competitors capture that you don't"
    strategic_question = "What high-intent demand are competitors capturing today that we are structurally positioned to pursue?"

    required_sections = ["A", "B", "C"]
    optional_sections = ["D", "E", "F", "G", "H"]
    data_sources = ["DataForSEO", "Ahrefs", "Internal"]

    risk_profile = {
        "confidence": "medium",
        "risk_if_wrong": "medium",
        "inference_type": "external"
    }

    caching = {
        "cadence": "weekly",
        "bust_on_changes": ["competitor_set", "category_scope", "negative_scope"]
    }

    def render_inputs(self, key_prefix: str = "") -> Dict[str, Any]:
        """Render input form for keyword gap parameters."""
        st.subheader("🔍 Analysis Parameters")

        col1, col2 = st.columns(2)

        with col1:
            min_volume = st.slider(
                "Minimum Search Volume",
                min_value=0,
                max_value=10000,
                value=500,
                step=100,
                help="Filter out long-tail noise below this threshold",
                key=f"{key_prefix}min_volume"
            )

            max_competitors = st.slider(
                "Max Competitors to Analyze",
                min_value=1,
                max_value=10,
                value=5,
                help="Limit analysis to top competitors",
                key=f"{key_prefix}max_competitors"
            )

        with col2:
            position_range = st.slider(
                "SERP Position Range",
                min_value=1,
                max_value=50,
                value=(1, 20),
                help="Only count competitor visibility within this position band",
                key=f"{key_prefix}position_range"
            )

            include_branded = st.checkbox(
                "Include Branded Keywords",
                value=False,
                help="Include competitor-branded keywords in analysis",
                key=f"{key_prefix}include_branded"
            )

        # Advanced options
        with st.expander("⚙️ Advanced Options"):
            ctr_assumption = st.slider(
                "CTR Assumption (%)",
                min_value=1,
                max_value=50,
                value=10,
                help="Estimated click-through rate for traffic calculations",
                key=f"{key_prefix}ctr_assumption"
            )

            exclude_competitor_brands = st.checkbox(
                "Exclude Competitor Brand Terms",
                value=True,
                help="Remove competitor brand names from keyword analysis",
                key=f"{key_prefix}exclude_competitor_brands"
            )

        return {
            "min_search_volume": min_volume,
            "max_competitors": max_competitors,
            "position_range": list(position_range),
            "include_branded": include_branded,
            "ctr_assumption": ctr_assumption / 100,  # Convert to decimal
            "exclude_competitor_brands": exclude_competitor_brands
        }

    async def execute(self, config: Configuration, params: Dict[str, Any]) -> ModuleRunResult:
        """Execute keyword gap analysis."""
        # Get approved competitors
        competitors = config.competitors.get_approved()

        # Limit to max_competitors
        max_competitors = params.get("max_competitors", 5)
        competitors = competitors[:max_competitors]

        if not competitors:
            return ModuleRunResult(
                envelope={"error": "No approved competitors available"},
                items=[],
                summary={"error": "No approved competitors"}
            )

        # Simulate keyword gap analysis
        # In real implementation, this would call DataForSEO API
        keyword_gaps = await self._analyze_keyword_gaps(
            config, competitors, params
        )

        # Calculate summary metrics
        total_gaps = len(keyword_gaps)
        total_estimated_traffic = sum(gap.get("estimated_traffic", 0) for gap in keyword_gaps)
        avg_difficulty = sum(gap.get("difficulty", 50) for gap in keyword_gaps) / max(total_gaps, 1)

        summary = {
            "total_keyword_gaps": total_gaps,
            "total_estimated_traffic": total_estimated_traffic,
            "average_difficulty": round(avg_difficulty, 1),
            "competitors_analyzed": len(competitors),
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "parameters_used": params
        }

        envelope = {
            "module_id": self.module_id,
            "execution_time": datetime.utcnow().isoformat(),
            "data_sources": self.data_sources,
            "filters_applied": params
        }

        return ModuleRunResult(
            envelope=envelope,
            items=keyword_gaps,
            summary=summary
        )

    async def _analyze_keyword_gaps(
        self,
        config: Configuration,
        competitors: List[Competitor],
        params: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Analyze keyword gaps for competitors."""
        # Simulate API call delay
        await asyncio.sleep(1)

        gaps = []
        min_volume = params.get("min_search_volume", 500)
        position_range = params.get("position_range", [1, 20])
        ctr_assumption = params.get("ctr_assumption", 0.1)

        # Mock keyword gaps based on competitors
        competitor_names = [comp.name.lower() for comp in competitors]

        mock_keywords = [
            {"keyword": "best running shoes 2024", "volume": 2400, "difficulty": 65},
            {"keyword": "athletic sneakers review", "volume": 1800, "difficulty": 55},
            {"keyword": "performance footwear", "volume": 1200, "difficulty": 70},
            {"keyword": "training shoes comparison", "volume": 980, "difficulty": 60},
            {"keyword": "running gear essentials", "volume": 2100, "difficulty": 45},
            {"keyword": "sports footwear brands", "volume": 1600, "difficulty": 75},
            {"keyword": "comfortable workout shoes", "volume": 2900, "difficulty": 40},
            {"keyword": "durable athletic shoes", "volume": 1350, "difficulty": 50},
            {"keyword": "lightweight running shoes", "volume": 3200, "difficulty": 55},
            {"keyword": "breathable sports shoes", "volume": 1100, "difficulty": 45}
        ]

        for keyword_data in mock_keywords:
            if keyword_data["volume"] >= min_volume:
                # Simulate competitor rankings
                competitor_rankings = {}
                for comp in competitors[:3]:  # Top 3 competitors
                    position = position_range[0] + (hash(comp.name + keyword_data["keyword"]) % (position_range[1] - position_range[0] + 1))
                    competitor_rankings[comp.name] = position

                # Find best competitor position
                best_position = min(competitor_rankings.values()) if competitor_rankings else 50

                # Calculate gap metrics
                estimated_traffic = keyword_data["volume"] * ctr_assumption * (1 / best_position) if best_position <= 10 else 0

                gaps.append({
                    "keyword": keyword_data["keyword"],
                    "search_volume": keyword_data["volume"],
                    "difficulty_score": keyword_data["difficulty"],
                    "best_competitor_position": best_position,
                    "competitor_rankings": competitor_rankings,
                    "estimated_traffic": round(estimated_traffic),
                    "opportunity_score": round((keyword_data["volume"] / 1000) * (100 - keyword_data["difficulty"]) / 10),
                    "primary_competitor": min(competitor_rankings, key=competitor_rankings.get) if competitor_rankings else None,
                    "category_relevance": "high",
                    "commercial_intent": "high"
                })

        # Sort by opportunity score (descending)
        gaps.sort(key=lambda x: x.get("opportunity_score", 0), reverse=True)

        return gaps[:20]  # Return top 20 opportunities

    def render_results(self, result: ModuleRunResult):
        """Render keyword gap analysis results."""
        st.subheader("🎯 Keyword Gap Analysis Results")

        if result.summary.get("error"):
            st.error(f"Analysis failed: {result.summary['error']}")
            return

        # Summary metrics
        summary = result.summary

        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric(
                "Keyword Gaps Found",
                summary.get("total_keyword_gaps", 0)
            )

        with col2:
            traffic = summary.get("total_estimated_traffic", 0)
            st.metric(
                "Estimated Traffic",
                f"{traffic:,}" if traffic > 1000 else str(traffic)
            )

        with col3:
            st.metric(
                "Avg Difficulty",
                f"{summary.get('average_difficulty', 0):.1f}"
            )

        with col4:
            st.metric(
                "Competitors Analyzed",
                summary.get("competitors_analyzed", 0)
            )

        # Results table
        if result.items:
            st.subheader("📊 Keyword Opportunities")

            # Convert to DataFrame for better display
            df_data = []
            for item in result.items:
                df_data.append({
                    "Keyword": item["keyword"],
                    "Search Volume": f"{item['search_volume']:,}",
                    "Difficulty": item["difficulty_score"],
                    "Best Position": item["best_competitor_position"],
                    "Est. Traffic": f"{item['estimated_traffic']:,}",
                    "Opportunity Score": item["opportunity_score"],
                    "Primary Competitor": item.get("primary_competitor", "N/A")
                })

            df = pd.DataFrame(df_data)
            st.dataframe(df, use_container_width=True, hide_index=True)

            # Top opportunities
            st.subheader("🏆 Top Opportunities")

            top_opportunities = sorted(result.items, key=lambda x: x.get("opportunity_score", 0), reverse=True)[:5]

            for i, opp in enumerate(top_opportunities, 1):
                with st.expander(f"{i}. {opp['keyword']} (Score: {opp['opportunity_score']})"):
                    col1, col2 = st.columns(2)

                    with col1:
                        st.write(f"**Search Volume:** {opp['search_volume']:,}")
                        st.write(f"**Difficulty:** {opp['difficulty_score']}/100")
                        st.write(f"**Best Competitor Position:** #{opp['best_competitor_position']}")

                    with col2:
                        st.write(f"**Estimated Traffic:** {opp['estimated_traffic']:,}")
                        st.write(f"**Primary Competitor:** {opp.get('primary_competitor', 'N/A')}")
                        st.write(f"**Commercial Intent:** {opp.get('commercial_intent', 'medium')}")

                    # Action buttons
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        if st.button(f"🎯 Create Content Brief", key=f"brief_{opp['keyword']}"):
                            st.info("Content brief generation will be available in Gap 3")
                    with col2:
                        if st.button(f"📊 Add to Tracking", key=f"track_{opp['keyword']}"):
                            st.success(f"Added {opp['keyword']} to tracking list")
                    with col3:
                        if st.button(f"🔍 Analyze SERP", key=f"serp_{opp['keyword']}"):
                            st.info("SERP analysis will be available in future modules")

        # Export options
        if result.items:
            st.subheader("📄 Export Results")

            col1, col2 = st.columns(2)

            with col1:
                csv_data = pd.DataFrame([{
                    "keyword": item["keyword"],
                    "search_volume": item["search_volume"],
                    "difficulty": item["difficulty_score"],
                    "best_position": item["best_competitor_position"],
                    "estimated_traffic": item["estimated_traffic"],
                    "opportunity_score": item["opportunity_score"],
                    "primary_competitor": item.get("primary_competitor", "")
                } for item in result.items])

                csv_string = csv_data.to_csv(index=False)
                st.download_button(
                    label="📊 Download CSV",
                    data=csv_string,
                    file_name=f"keyword_gaps_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                    mime="text/csv",
                    use_container_width=True
                )

            with col2:
                # JSON export
                import json
                json_data = {
                    "summary": result.summary,
                    "results": result.items,
                    "metadata": result.envelope
                }

                st.download_button(
                    label="📋 Download JSON",
                    data=json.dumps(json_data, indent=2),
                    file_name=f"keyword_gaps_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                    mime="application/json",
                    use_container_width=True
                )

        # Analysis insights
        if result.items:
            st.subheader("💡 Analysis Insights")

            # Calculate insights
            high_volume_keywords = [item for item in result.items if item["search_volume"] > 2000]
            easy_opportunities = [item for item in result.items if item["difficulty_score"] < 50]
            competitor_concentration = {}

            for item in result.items:
                comp = item.get("primary_competitor", "Unknown")
                competitor_concentration[comp] = competitor_concentration.get(comp, 0) + 1

            col1, col2, col3 = st.columns(3)

            with col1:
                st.metric("High Volume Keywords", len(high_volume_keywords))
                if high_volume_keywords:
                    st.caption(f"Top: {high_volume_keywords[0]['keyword']}")

            with col2:
                st.metric("Easy Opportunities", len(easy_opportunities))
                if easy_opportunities:
                    st.caption(f"Difficulty: {easy_opportunities[0]['difficulty_score']}")

            with col3:
                top_competitor = max(competitor_concentration.items(), key=lambda x: x[1])
                st.metric("Top Competitor", top_competitor[0])
                st.caption(f"{top_competitor[1]} keywords dominated")
