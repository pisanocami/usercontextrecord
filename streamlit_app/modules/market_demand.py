"""
Market Demand & Trends Module
=============================

Market Trends module that analyzes category demand patterns and trends.
"""

import streamlit as st
import asyncio
from typing import Dict, Any, List
from brand_intel.core.models import Configuration
from streamlit_app.modules.base_module import BaseModule, ModuleRunResult
import pandas as pd
from datetime import datetime, timedelta
import random


class MarketDemandModule(BaseModule):
    """Market Demand & Trends Analysis Module."""

    module_id = "market.category_demand_trend.v1"
    name = "Category Demand Trend (5-Year)"
    category = "Market Trends"
    layer = "Signal"
    description = "Shows how consumer interest in a category evolved over 5 years; detects growth vs stagnation vs decline"
    strategic_question = "Is this a category worth being in, and is demand expanding or contracting?"

    required_sections = ["B"]
    optional_sections = ["A", "C", "D", "E", "F", "G", "H"]
    data_sources = ["Google Trends", "SERP API", "Internal"]

    risk_profile = {
        "confidence": "medium",
        "risk_if_wrong": "medium",
        "inference_type": "external"
    }

    caching = {
        "cadence": "weekly",
        "bust_on_changes": ["category_scope", "market"]
    }

    def render_inputs(self, key_prefix: str = "") -> Dict[str, Any]:
        """Render input form for market demand parameters."""
        st.subheader("📈 Analysis Parameters")

        col1, col2 = st.columns(2)

        with col1:
            timeframe = st.selectbox(
                "Analysis Timeframe",
                options=["3_years", "5_years", "10_years"],
                index=1,
                format_func=lambda x: x.replace("_", " ").title(),
                help="How far back to analyze demand trends",
                key=f"{key_prefix}timeframe"
            )

            granularity = st.selectbox(
                "Data Granularity",
                options=["monthly", "quarterly"],
                index=0,
                help="How detailed the trend data should be",
                key=f"{key_prefix}granularity"
            )

        with col2:
            include_seasonality = st.checkbox(
                "Include Seasonality Analysis",
                value=True,
                help="Analyze seasonal patterns in demand",
                key=f"{key_prefix}seasonality"
            )

            compare_regions = st.checkbox(
                "Compare Regional Trends",
                value=False,
                help="Compare demand trends across different regions",
                key=f"{key_prefix}regions"
            )

        # Advanced options
        with st.expander("⚙️ Advanced Options"):
            smoothing_factor = st.slider(
                "Trend Smoothing",
                min_value=1,
                max_value=12,
                value=3,
                help="Months to smooth trend data (reduces noise)",
                key=f"{key_prefix}smoothing"
            )

            outlier_threshold = st.slider(
                "Outlier Threshold",
                min_value=1.0,
                max_value=3.0,
                value=2.0,
                step=0.1,
                help="Standard deviations for outlier detection",
                key=f"{key_prefix}outliers"
            )

        return {
            "timeframe": timeframe,
            "granularity": granularity,
            "include_seasonality": include_seasonality,
            "compare_regions": compare_regions,
            "smoothing_factor": smoothing_factor,
            "outlier_threshold": outlier_threshold
        }

    async def execute(self, config: Configuration, params: Dict[str, Any]) -> ModuleRunResult:
        """Execute market demand trend analysis."""
        category = config.category_definition.primary_category

        if not category:
            return ModuleRunResult(
                envelope={"error": "No primary category defined"},
                items=[],
                summary={"error": "No primary category"}
            )

        # Simulate market demand analysis
        # In real implementation, this would call Google Trends API
        demand_trends = await self._analyze_demand_trends(category, params)

        # Calculate summary metrics
        overall_trend = self._calculate_overall_trend(demand_trends)
        seasonality_score = self._calculate_seasonality_score(demand_trends) if params.get("include_seasonality") else None
        growth_acceleration = self._calculate_growth_acceleration(demand_trends)

        summary = {
            "category": category,
            "timeframe_analyzed": params.get("timeframe", "5_years"),
            "overall_trend": overall_trend,
            "seasonality_score": seasonality_score,
            "growth_acceleration": growth_acceleration,
            "total_data_points": len(demand_trends),
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "trend_direction": "growing" if overall_trend > 0 else "declining" if overall_trend < -5 else "stable",
            "parameters_used": params
        }

        envelope = {
            "module_id": self.module_id,
            "execution_time": datetime.utcnow().isoformat(),
            "data_sources": self.data_sources,
            "category_analyzed": category,
            "trend_summary": summary
        }

        return ModuleRunResult(
            envelope=envelope,
            items=demand_trends,
            summary=summary
        )

    async def _analyze_demand_trends(self, category: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze demand trends for the category."""
        # Simulate API call delay
        await asyncio.sleep(1.5)

        timeframe = params.get("timeframe", "5_years")
        granularity = params.get("granularity", "monthly")

        # Calculate date range
        years_back = int(timeframe.split("_")[0])
        start_date = datetime.now() - timedelta(days=years_back*365)

        trends = []
        current_date = start_date

        # Generate mock trend data
        base_interest = 50  # Base interest level (0-100)
        trend_slope = random.uniform(-0.5, 1.0)  # Random trend direction
        seasonal_amplitude = 15 if params.get("include_seasonality") else 0

        while current_date <= datetime.now():
            # Calculate trend component
            months_elapsed = (current_date - start_date).days / 30
            trend_component = base_interest + (trend_slope * months_elapsed * 0.1)

            # Add seasonal component
            if params.get("include_seasonality"):
                seasonal_component = seasonal_amplitude * (1 + 0.5 * (months_elapsed / 12))  # Growing seasonality
                day_of_year = current_date.timetuple().tm_yday
                seasonal_component *= (1 + 0.3 * (day_of_year / 365.25) * 3.14159).sin()  # Seasonal variation
            else:
                seasonal_component = 0

            # Add some noise
            noise = random.uniform(-5, 5)

            # Calculate final interest
            interest = max(0, min(100, trend_component + seasonal_component + noise))

            trends.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "interest_score": round(interest, 1),
                "trend_component": round(trend_component, 1),
                "seasonal_component": round(seasonal_component, 1) if params.get("include_seasonality") else 0,
                "year": current_date.year,
                "month": current_date.month,
                "quarter": (current_date.month - 1) // 3 + 1
            })

            # Move to next period
            if granularity == "monthly":
                # Add approximately 1 month
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
            else:  # quarterly
                current_date = current_date.replace(month=current_date.month + 3)
                if current_date.month > 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=current_date.month - 12)

        return trends

    def _calculate_overall_trend(self, trends: List[Dict[str, Any]]) -> float:
        """Calculate overall trend direction and magnitude."""
        if len(trends) < 2:
            return 0

        # Simple linear regression slope
        x_values = list(range(len(trends)))
        y_values = [t["interest_score"] for t in trends]

        # Calculate slope using least squares
        n = len(x_values)
        sum_x = sum(x_values)
        sum_y = sum(y_values)
        sum_xy = sum(x * y for x, y in zip(x_values, y_values))
        sum_x2 = sum(x * x for x in x_values)

        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)

        # Convert to percentage change over the period
        avg_interest = sum_y / n
        trend_percentage = (slope * n / avg_interest) * 100 if avg_interest > 0 else 0

        return round(trend_percentage, 1)

    def _calculate_seasonality_score(self, trends: List[Dict[str, Any]]) -> float:
        """Calculate seasonality score (0-100)."""
        if len(trends) < 12:
            return 0

        # Calculate monthly averages
        monthly_avg = {}
        for trend in trends:
            month = trend["month"]
            if month not in monthly_avg:
                monthly_avg[month] = []
            monthly_avg[month].append(trend["interest_score"])

        monthly_means = {month: sum(scores)/len(scores) for month, scores in monthly_avg.items()}

        # Calculate seasonality as coefficient of variation
        if monthly_means:
            values = list(monthly_means.values())
            mean = sum(values) / len(values)
            variance = sum((x - mean) ** 2 for x in values) / len(values)
            std_dev = variance ** 0.5
            cv = (std_dev / mean) * 100 if mean > 0 else 0

            # Scale to 0-100 (higher = more seasonal)
            seasonality_score = min(100, cv * 2)
            return round(seasonality_score, 1)

        return 0

    def _calculate_growth_acceleration(self, trends: List[Dict[str, Any]]) -> str:
        """Calculate if growth is accelerating, decelerating, or linear."""
        if len(trends) < 6:
            return "insufficient_data"

        # Split into two halves
        midpoint = len(trends) // 2
        first_half = trends[:midpoint]
        second_half = trends[midpoint:]

        first_trend = self._calculate_overall_trend(first_half)
        second_trend = self._calculate_overall_trend(second_half)

        # Compare trends
        if abs(second_trend - first_trend) < 5:
            return "linear"
        elif second_trend > first_trend:
            return "accelerating"
        else:
            return "decelerating"

    def render_results(self, result: ModuleRunResult):
        """Render market demand trend analysis results."""
        st.subheader("📈 Market Demand Trend Analysis")

        if result.summary.get("error"):
            st.error(f"Analysis failed: {result.summary['error']}")
            return

        summary = result.summary

        # Key metrics
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            trend = summary.get("overall_trend", 0)
            trend_icon = "📈" if trend > 0 else "📉" if trend < 0 else "📊"
            st.metric(
                "Overall Trend",
                f"{trend:+.1f}%",
                delta=f"{trend:+.1f}%" if trend != 0 else None
            )

        with col2:
            direction = summary.get("trend_direction", "stable")
            direction_colors = {
                "growing": "🟢",
                "stable": "🟡",
                "declining": "🔴"
            }
            st.metric(
                "Trend Direction",
                direction.title(),
                delta=None
            )

        with col3:
            seasonality = summary.get("seasonality_score")
            if seasonality is not None:
                st.metric(
                    "Seasonality",
                    f"{seasonality:.1f}/100"
                )
            else:
                st.metric("Seasonality", "Not analyzed")

        with col4:
            acceleration = summary.get("growth_acceleration", "unknown")
            accel_icons = {
                "accelerating": "🚀",
                "linear": "➡️",
                "decelerating": "⏬",
                "insufficient_data": "❓"
            }
            st.metric(
                "Growth Pattern",
                acceleration.title(),
                delta=None
            )

        # Trend visualization
        if result.items:
            st.subheader("📊 Demand Trend Over Time")

            # Convert to DataFrame
            df = pd.DataFrame(result.items)
            df['date'] = pd.to_datetime(df['date'])

            # Create trend chart
            import plotly.graph_objects as go

            fig = go.Figure()

            # Main trend line
            fig.add_trace(go.Scatter(
                x=df['date'],
                y=df['interest_score'],
                mode='lines+markers',
                name='Interest Score',
                line=dict(color='#007bff', width=2),
                marker=dict(size=4)
            ))

            # Add trend line if we have enough data
            if len(df) > 3:
                # Simple moving average
                df['trend'] = df['interest_score'].rolling(window=min(12, len(df)), center=True).mean()
                fig.add_trace(go.Scatter(
                    x=df['date'],
                    y=df['trend'],
                    mode='lines',
                    name='Trend Line',
                    line=dict(color='#28a745', width=3, dash='dash')
                ))

            fig.update_layout(
                title=f"Demand Trend for '{summary.get('category', 'Category')}'",
                xaxis_title="Date",
                yaxis_title="Interest Score (0-100)",
                height=400,
                showlegend=True
            )

            st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})

        # Insights and recommendations
        st.subheader("💡 Strategic Insights")

        trend = summary.get("overall_trend", 0)
        direction = summary.get("trend_direction", "stable")
        acceleration = summary.get("growth_acceleration", "unknown")

        insights = []

        if direction == "growing":
            if trend > 20:
                insights.append("**Strong growth category** - High potential for investment and expansion")
            elif trend > 5:
                insights.append("**Moderate growth** - Steady opportunity with manageable risk")
            else:
                insights.append("**Slow but positive growth** - Consider monitoring before major investment")

        elif direction == "declining":
            if trend < -20:
                insights.append("**Rapidly declining category** - Consider exit or pivot strategies")
            elif trend < -5:
                insights.append("**Moderate decline** - Monitor closely and prepare contingency plans")
            else:
                insights.append("**Slight decline** - May be cyclical; investigate further")

        else:  # stable
            insights.append("**Stable category** - Consistent demand with low volatility")

        # Acceleration insights
        if acceleration == "accelerating":
            insights.append("**Accelerating growth** - Category momentum is building; consider early entry")
        elif acceleration == "decelerating":
            insights.append("**Slowing growth** - Monitor for potential peak or cyclical downturn")

        # Seasonality insights
        seasonality = summary.get("seasonality_score")
        if seasonality and seasonality > 30:
            insights.append("**High seasonality** - Plan marketing and inventory around peak periods")
        elif seasonality and seasonality > 15:
            insights.append("**Moderate seasonality** - Some seasonal variation to consider")

        # Display insights
        for insight in insights:
            st.info(insight)

        # Strategic recommendations
        st.subheader("🎯 Strategic Recommendations")

        recommendations = self._generate_recommendations(summary)

        for rec in recommendations:
            priority_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(rec["priority"], "⚪")
            with st.expander(f"{priority_icon} {rec['title']}", expanded=rec["priority"] == "high"):
                st.write(rec["description"])
                if rec.get("actions"):
                    st.markdown("**Recommended Actions:**")
                    for action in rec["actions"]:
                        st.markdown(f"• {action}")

    def _generate_recommendations(self, summary: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate strategic recommendations based on analysis."""
        recommendations = []

        trend = summary.get("overall_trend", 0)
        direction = summary.get("trend_direction", "stable")
        acceleration = summary.get("growth_acceleration", "unknown")

        # Growth recommendations
        if direction == "growing":
            if acceleration == "accelerating":
                recommendations.append({
                    "priority": "high",
                    "title": "Capitalize on Accelerating Growth",
                    "description": "Category demand is growing rapidly. This represents a high-potential opportunity.",
                    "actions": [
                        "Increase marketing investment in this category",
                        "Expand product line to capture growing demand",
                        "Monitor competitor entry and competitive intensity",
                        "Consider strategic partnerships or acquisitions"
                    ]
                })
            else:
                recommendations.append({
                    "priority": "medium",
                    "title": "Maintain Position in Growing Category",
                    "description": "Category is growing steadily. Focus on maintaining and improving market position.",
                    "actions": [
                        "Optimize current marketing and sales efforts",
                        "Monitor for competitive threats",
                        "Consider incremental expansion opportunities"
                    ]
                })

        # Decline recommendations
        elif direction == "declining":
            recommendations.append({
                "priority": "high",
                "title": "Evaluate Category Exit Strategy",
                "description": "Category demand is declining. Assess whether to maintain, reduce, or exit position.",
                "actions": [
                    "Conduct portfolio analysis to evaluate category fit",
                    "Develop exit or pivot strategies",
                    "Focus on high-margin segments within the category",
                    "Explore adjacent categories with growth potential"
                ]
            })

        # Stable category
        else:
            recommendations.append({
                "priority": "low",
                "title": "Optimize for Stability",
                "description": "Category demand is stable. Focus on efficiency and competitive advantage.",
                "actions": [
                    "Optimize operational efficiency",
                    "Strengthen competitive positioning",
                    "Monitor for emerging trends or disruptions",
                    "Consider diversification strategies"
                ]
            })

        # Seasonality recommendations
        seasonality = summary.get("seasonality_score")
        if seasonality and seasonality > 30:
            recommendations.append({
                "priority": "medium",
                "title": "Address High Seasonality",
                "description": "Category exhibits strong seasonal patterns. Plan operations accordingly.",
                "actions": [
                    "Develop seasonal marketing campaigns",
                    "Optimize inventory management for peak periods",
                    "Staff appropriately for seasonal demand",
                    "Consider counter-seasonal product diversification"
                ]
            })

        return recommendations
