"""
Content Brief Module
===================

Content module that generates comprehensive content briefs for keywords.
"""

import streamlit as st
import asyncio
from typing import Dict, Any, List
from brand_intel.core.models import Configuration
from streamlit_app.modules.base_module import BaseModule, ModuleRunResult
from datetime import datetime
import random


class ContentBriefModule(BaseModule):
    """Content Brief Generation Module."""

    module_id = "content.brief.v1"
    name = "Content Brief Generator"
    category = "Content"
    layer = "Action"
    description = "Creates detailed content briefs for keywords, incorporating brand context and competitive analysis"
    strategic_question = "What content will effectively capture this search demand?"

    required_sections = ["A", "B"]
    optional_sections = ["C", "D", "E", "F", "G", "H"]
    data_sources = ["Internal", "Keyword Research", "Competitive Analysis"]

    risk_profile = {
        "confidence": "medium",
        "risk_if_wrong": "low",
        "inference_type": "creative"
    }

    caching = {
        "cadence": "daily",
        "bust_on_changes": ["brand_context", "category_scope", "keyword_targets"]
    }

    def render_inputs(self, key_prefix: str = "") -> Dict[str, Any]:
        """Render input form for content brief parameters."""
        st.subheader("📝 Content Brief Parameters")

        col1, col2 = st.columns(2)

        with col1:
            target_keyword = st.text_input(
                "Target Keyword *",
                placeholder="e.g., best running shoes 2024",
                help="The primary keyword to create content for",
                key=f"{key_prefix}keyword"
            )

            content_type = st.selectbox(
                "Content Type",
                options=["blog_post", "landing_page", "social_media", "video_script", "podcast_script"],
                index=0,
                format_func=lambda x: x.replace("_", " ").title(),
                help="What type of content to create",
                key=f"{key_prefix}content_type"
            )

            target_audience = st.selectbox(
                "Target Audience",
                options=["general_public", "industry_professionals", "business_decision_makers", "consumers"],
                index=0,
                format_func=lambda x: x.replace("_", " ").title(),
                help="Who is the primary audience for this content",
                key=f"{key_prefix}audience"
            )

        with col2:
            content_goal = st.selectbox(
                "Primary Goal",
                options=["awareness", "consideration", "conversion", "retention", "brand_building"],
                index=0,
                format_func=lambda x: x.replace("_", " ").title(),
                help="What is the main objective of this content",
                key=f"{key_prefix}goal"
            )

            tone_style = st.selectbox(
                "Tone & Style",
                options=["professional", "conversational", "authoritative", "educational", "entertaining"],
                index=0,
                help="The voice and style for the content",
                key=f"{key_prefix}tone"
            )

            content_length = st.selectbox(
                "Content Length",
                options=["short", "medium", "long", "comprehensive"],
                index=1,
                help="How detailed should the content be",
                key=f"{key_prefix}length"
            )

        # Advanced options
        with st.expander("⚙️ Advanced Options"):
            include_competitive_analysis = st.checkbox(
                "Include Competitive Analysis",
                value=True,
                help="Analyze how competitors approach this keyword",
                key=f"{key_prefix}competitive"
            )

            include_cta_suggestions = st.checkbox(
                "Include CTA Suggestions",
                value=True,
                help="Suggest specific calls-to-action",
                key=f"{key_prefix}cta"
            )

            seo_optimization_level = st.slider(
                "SEO Optimization Level",
                min_value=1,
                max_value=5,
                value=3,
                help="How aggressively to optimize for SEO (1=minimal, 5=maximum)",
                key=f"{key_prefix}seo_level"
            )

        # Validation
        if target_keyword and not target_keyword.strip():
            st.error("Target keyword is required")
            target_keyword = None

        return {
            "target_keyword": target_keyword.strip() if target_keyword else None,
            "content_type": content_type,
            "target_audience": target_audience,
            "content_goal": content_goal,
            "tone_style": tone_style,
            "content_length": content_length,
            "include_competitive_analysis": include_competitive_analysis,
            "include_cta_suggestions": include_cta_suggestions,
            "seo_optimization_level": seo_optimization_level
        }

    async def execute(self, config: Configuration, params: Dict[str, Any]) -> ModuleRunResult:
        """Execute content brief generation."""
        target_keyword = params.get("target_keyword")
        if not target_keyword:
            return ModuleRunResult(
                envelope={"error": "No target keyword provided"},
                items=[],
                summary={"error": "Missing target keyword"}
            )

        # Generate comprehensive content brief
        content_brief = await self._generate_content_brief(config, params)

        summary = {
            "target_keyword": target_keyword,
            "content_type": params.get("content_type", "blog_post"),
            "brief_completeness_score": self._calculate_brief_completeness(content_brief),
            "estimated_word_count": content_brief.get("estimated_word_count", 0),
            "seo_keywords_count": len(content_brief.get("target_keywords", [])),
            "key_sections_count": len(content_brief.get("content_structure", [])),
            "analysis_timestamp": datetime.utcnow().isoformat(),
            "parameters_used": params
        }

        envelope = {
            "module_id": self.module_id,
            "execution_time": datetime.utcnow().isoformat(),
            "data_sources": self.data_sources,
            "keyword_analyzed": target_keyword,
            "content_brief_summary": summary
        }

        return ModuleRunResult(
            envelope=envelope,
            items=[content_brief],  # Single comprehensive brief
            summary=summary
        )

    async def _generate_content_brief(self, config: Configuration, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive content brief."""
        # Simulate generation time
        await asyncio.sleep(1)

        target_keyword = params.get("target_keyword", "")
        content_type = params.get("content_type", "blog_post")
        audience = params.get("target_audience", "general_public")
        goal = params.get("content_goal", "awareness")
        tone = params.get("tone_style", "professional")
        length = params.get("content_length", "medium")

        # Get brand context
        brand_name = config.brand.name if hasattr(config, 'brand') else "Your Brand"
        industry = config.brand.industry if hasattr(config, 'brand') else "Your Industry"
        category = config.category_definition.primary_category if hasattr(config, 'category_definition') else "Your Category"

        # Generate brief components
        brief = {
            "title": self._generate_title(target_keyword, content_type),
            "meta_description": self._generate_meta_description(target_keyword),
            "objective": self._generate_objective(goal, target_keyword, audience),
            "target_keywords": self._generate_target_keywords(target_keyword, params.get("seo_optimization_level", 3)),
            "target_audience": self._describe_audience(audience),
            "content_structure": self._generate_content_structure(target_keyword, content_type, length),
            "key_points": self._generate_key_points(target_keyword, content_type, audience),
            "tone_and_voice": self._generate_tone_guidelines(tone, brand_name),
            "brand_alignment": self._generate_brand_alignment(brand_name, industry, category),
            "competitive_angle": self._generate_competitive_angle(target_keyword, params.get("include_competitive_analysis", True)),
            "estimated_word_count": self._estimate_word_count(length, content_type),
            "estimated_read_time": self._estimate_read_time(length),
            "calls_to_action": self._generate_ctas(goal, params.get("include_cta_suggestions", True)),
            "success_metrics": self._generate_success_metrics(goal),
            "content_warnings": self._generate_content_warnings(target_keyword, config)
        }

        return brief

    def _generate_title(self, keyword: str, content_type: str) -> str:
        """Generate compelling title for the content."""
        title_templates = {
            "blog_post": [
                f"The Ultimate Guide to {keyword.title()}",
                f"{keyword.title()}: Everything You Need to Know",
                f"How to Choose the Best {keyword.title()} in 2024",
                f"{keyword.title()}: A Complete Beginner's Guide"
            ],
            "landing_page": [
                f"Discover the Perfect {keyword.title()}",
                f"Find Your Ideal {keyword.title()} Solution",
                f"The Best {keyword.title()} for Your Needs"
            ],
            "social_media": [
                f"🚀 The Truth About {keyword.title()}",
                f"💡 {keyword.title()}: What You Must Know",
                f"🎯 Best {keyword.title()} Tips & Tricks"
            ]
        }

        templates = title_templates.get(content_type, title_templates["blog_post"])
        return random.choice(templates)

    def _generate_meta_description(self, keyword: str) -> str:
        """Generate SEO-optimized meta description."""
        templates = [
            f"Discover everything you need to know about {keyword}. Expert insights, tips, and recommendations to help you make informed decisions.",
            f"Learn about {keyword} with our comprehensive guide. Find expert advice and practical tips for success.",
            f"Your complete resource for {keyword}. Get expert guidance and make better decisions today."
        ]
        return random.choice(templates)

    def _generate_objective(self, goal: str, keyword: str, audience: str) -> str:
        """Generate content objective."""
        objectives = {
            "awareness": f"Educate {audience.replace('_', ' ')} about {keyword} and establish thought leadership",
            "consideration": f"Help {audience.replace('_', ' ')} evaluate {keyword} options and build consideration",
            "conversion": f"Drive action and conversions by addressing {keyword} needs and pain points",
            "retention": f"Provide ongoing value to existing customers interested in {keyword}",
            "brand_building": f"Strengthen brand connection by addressing {keyword} in an authentic, valuable way"
        }
        return objectives.get(goal, objectives["awareness"])

    def _generate_target_keywords(self, primary_keyword: str, seo_level: int) -> List[str]:
        """Generate target keywords based on SEO optimization level."""
        base_keywords = [primary_keyword]

        # Add related keywords based on SEO level
        if seo_level >= 2:
            base_keywords.extend([
                f"best {primary_keyword}",
                f"{primary_keyword} guide",
                f"{primary_keyword} tips"
            ])

        if seo_level >= 3:
            base_keywords.extend([
                f"{primary_keyword} 2024",
                f"{primary_keyword} review",
                f"how to choose {primary_keyword}"
            ])

        if seo_level >= 4:
            base_keywords.extend([
                f"{primary_keyword} comparison",
                f"{primary_keyword} recommendations",
                f"top {primary_keyword}"
            ])

        if seo_level >= 5:
            base_keywords.extend([
                f"{primary_keyword} for beginners",
                f"{primary_keyword} expert guide",
                f"ultimate {primary_keyword} guide"
            ])

        return base_keywords[:min(len(base_keywords), seo_level * 3)]

    def _describe_audience(self, audience: str) -> str:
        """Describe the target audience."""
        descriptions = {
            "general_public": "General consumers and individuals looking for information about this topic",
            "industry_professionals": "Industry professionals, experts, and practitioners in the field",
            "business_decision_makers": "Business leaders, managers, and decision-makers evaluating solutions",
            "consumers": "End consumers researching purchases and making buying decisions"
        }
        return descriptions.get(audience, descriptions["general_public"])

    def _generate_content_structure(self, keyword: str, content_type: str, length: str) -> List[str]:
        """Generate content structure outline."""
        if content_type == "blog_post":
            if length == "short":
                return [
                    "Introduction and Hook",
                    "3-4 Key Points",
                    "Conclusion and Next Steps"
                ]
            elif length == "medium":
                return [
                    "Introduction and Context",
                    "Background and Importance",
                    "Key Considerations",
                    "Detailed Analysis",
                    "Practical Recommendations",
                    "Conclusion and Action Items"
                ]
            else:  # long/comprehensive
                return [
                    "Introduction and Overview",
                    "Historical Context",
                    "Current Market Landscape",
                    "Key Factors and Considerations",
                    "Detailed Analysis and Breakdown",
                    "Case Studies and Examples",
                    "Future Trends and Predictions",
                    "Practical Implementation Guide",
                    "Common Challenges and Solutions",
                    "Conclusion and Strategic Recommendations"
                ]

        elif content_type == "landing_page":
            return [
                "Hero Section with Value Proposition",
                "Problem Statement",
                "Solution Overview",
                "Key Benefits",
                "Social Proof/Testimonials",
                "Call-to-Action Section"
            ]

        else:  # social media, video, podcast
            return [
                "Hook and Attention Grabber",
                "Main Message and Key Points",
                "Call-to-Action",
                "Engagement Prompt"
            ]

    def _generate_key_points(self, keyword: str, content_type: str, audience: str) -> List[str]:
        """Generate key points to cover in the content."""
        if "guide" in keyword.lower():
            return [
                "Define what makes a good solution",
                "Compare different options available",
                "Provide practical selection criteria",
                "Include real-world examples",
                "Offer actionable next steps"
            ]
        elif "review" in keyword.lower():
            return [
                "Present honest assessment of options",
                "Highlight strengths and weaknesses",
                "Include user experiences and feedback",
                "Provide clear recommendations",
                "Address common concerns and objections"
            ]
        else:
            return [
                f"What {keyword} means and why it matters",
                f"Key factors to consider when evaluating {keyword}",
                f"Common challenges and how to overcome them",
                f"Best practices and expert recommendations",
                f"Future trends and what to expect"
            ]

    def _generate_tone_guidelines(self, tone: str, brand_name: str) -> str:
        """Generate tone and voice guidelines."""
        tone_guidelines = {
            "professional": f"Maintain a professional, authoritative tone that positions {brand_name} as an industry expert. Use industry terminology appropriately while remaining accessible.",
            "conversational": f"Adopt a friendly, conversational tone that builds rapport with readers. Write like you're having a knowledgeable discussion with a friend.",
            "authoritative": f"Establish authority and expertise throughout. Back claims with data and research. Position {brand_name} as the go-to resource.",
            "educational": f"Focus on teaching and informing. Break down complex concepts. Position {brand_name} as a trusted educator in the field.",
            "entertaining": f"Make the content engaging and enjoyable to read. Use storytelling, humor where appropriate, and relatable examples."
        }
        return tone_guidelines.get(tone, tone_guidelines["professional"])

    def _generate_brand_alignment(self, brand_name: str, industry: str, category: str) -> str:
        """Generate brand alignment guidelines."""
        return f"Ensure all content aligns with {brand_name}'s position as a trusted authority in {industry}. Emphasize our expertise in {category} while providing genuine value to readers. Avoid salesy language and focus on education and problem-solving."

    def _generate_competitive_angle(self, keyword: str, include_competitive: bool) -> str:
        """Generate competitive positioning angle."""
        if not include_competitive:
            return "Focus on providing unique value and insights rather than direct competitor comparisons."

        return f"Differentiate from competitors by providing unique insights about {keyword}. Highlight what sets our approach apart while acknowledging market alternatives. Position our content as the most comprehensive and actionable resource available."

    def _estimate_word_count(self, length: str, content_type: str) -> int:
        """Estimate word count for the content."""
        base_counts = {
            "short": 800,
            "medium": 1500,
            "long": 2500,
            "comprehensive": 4000
        }

        base_count = base_counts.get(length, 1500)

        # Adjust for content type
        if content_type == "landing_page":
            base_count *= 0.6  # Landing pages are typically shorter
        elif content_type in ["social_media", "video_script"]:
            base_count *= 0.3  # Much shorter formats

        return int(base_count)

    def _estimate_read_time(self, length: str) -> str:
        """Estimate read time."""
        word_counts = {
            "short": 800,
            "medium": 1500,
            "long": 2500,
            "comprehensive": 4000
        }

        words = word_counts.get(length, 1500)
        minutes = max(1, round(words / 200))  # Assume 200 words per minute

        return f"{minutes} minute{'s' if minutes != 1 else ''}"

    def _generate_ctas(self, goal: str, include_suggestions: bool) -> List[str]:
        """Generate call-to-action suggestions."""
        if not include_suggestions:
            return ["Contact us to learn more", "Subscribe to our newsletter"]

        cta_templates = {
            "awareness": [
                "Download our comprehensive guide",
                "Subscribe to our newsletter for more insights",
                "Follow us on social media for daily tips"
            ],
            "consideration": [
                "Schedule a consultation to discuss your options",
                "Request a personalized assessment",
                "Compare solutions with our interactive tool"
            ],
            "conversion": [
                "Start your free trial today",
                "Get your personalized quote now",
                "Contact our sales team for immediate assistance"
            ],
            "retention": [
                "Explore our additional resources",
                "Join our customer community",
                "Upgrade to premium features"
            ],
            "brand_building": [
                "Learn more about our story and values",
                "Connect with us on social media",
                "Share this content with your network"
            ]
        }

        return cta_templates.get(goal, cta_templates["awareness"])

    def _generate_success_metrics(self, goal: str) -> List[str]:
        """Generate success metrics for the content."""
        base_metrics = [
            "Page views and unique visitors",
            "Average time on page",
            "Bounce rate",
            "Social shares and engagement"
        ]

        goal_specific = {
            "awareness": ["Newsletter signups", "Social media followers gained"],
            "consideration": ["Lead generation", "Consultation requests"],
            "conversion": ["Conversion rate", "Revenue generated", "Cost per acquisition"],
            "retention": ["Repeat visits", "Customer satisfaction scores"],
            "brand_building": ["Brand awareness lift", "Brand sentiment improvement"]
        }

        return base_metrics + goal_specific.get(goal, [])

    def _generate_content_warnings(self, keyword: str, config: Configuration) -> List[str]:
        """Generate content warnings and considerations."""
        warnings = []

        # Check UCR guardrails
        if hasattr(config, 'negative_scope') and config.negative_scope:
            excluded_keywords = config.negative_scope.excluded_keywords or []
            for excluded in excluded_keywords:
                if excluded.lower() in keyword.lower():
                    warnings.append(f"Keyword '{keyword}' may conflict with guardrail '{excluded}'")

        # General warnings
        warnings.extend([
            "Ensure all claims are supported by data or research",
            "Avoid making unsubstantiated comparisons with competitors",
            "Include appropriate disclaimers where needed"
        ])

        return warnings

    def _calculate_brief_completeness(self, brief: Dict[str, Any]) -> float:
        """Calculate how complete the content brief is."""
        required_fields = [
            "title", "objective", "target_keywords", "content_structure",
            "key_points", "tone_and_voice", "calls_to_action"
        ]

        completed_fields = sum(1 for field in required_fields if brief.get(field))

        return (completed_fields / len(required_fields)) * 100

    def render_results(self, result: ModuleRunResult):
        """Render content brief results."""
        st.subheader("📝 Content Brief Results")

        if not result.items:
            st.error("No content brief generated")
            return

        brief = result.items[0]
        summary = result.summary

        # Brief overview metrics
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            completeness = summary.get("brief_completeness_score", 0)
            st.metric("Brief Completeness", f"{completeness:.1f}%")

        with col2:
            word_count = summary.get("estimated_word_count", 0)
            st.metric("Est. Word Count", f"{word_count:,}")

        with col3:
            keywords_count = summary.get("seo_keywords_count", 0)
            st.metric("Target Keywords", keywords_count)

        with col4:
            sections_count = summary.get("key_sections_count", 0)
            st.metric("Content Sections", sections_count)

        # Content Brief Display
        st.subheader("📋 Complete Content Brief")

        # Title and Meta
        st.markdown("### 🎯 Title & Meta")
        st.markdown(f"**Title:** {brief.get('title', 'No title generated')}")
        st.markdown(f"**Meta Description:** {brief.get('meta_description', 'No meta description')}")
        st.caption(f"Estimated read time: {brief.get('estimated_read_time', 'Unknown')}")

        # Objective and Audience
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("### 🎯 Objective")
            st.write(brief.get('objective', 'No objective defined'))

        with col2:
            st.markdown("### 👥 Target Audience")
            st.write(brief.get('target_audience', 'No audience defined'))

        # Target Keywords
        st.markdown("### 🔍 Target Keywords")
        keywords = brief.get('target_keywords', [])
        if keywords:
            for keyword in keywords:
                st.code(keyword, language="")
        else:
            st.info("No keywords generated")

        # Content Structure
        st.markdown("### 📑 Content Structure")
        structure = brief.get('content_structure', [])
        if structure:
            for i, section in enumerate(structure, 1):
                st.markdown(f"{i}. {section}")
        else:
            st.info("No structure defined")

        # Key Points
        st.markdown("### 💡 Key Points to Cover")
        key_points = brief.get('key_points', [])
        if key_points:
            for point in key_points:
                st.markdown(f"• {point}")
        else:
            st.info("No key points defined")

        # Tone and Voice
        st.markdown("### 🎭 Tone & Voice Guidelines")
        st.write(brief.get('tone_and_voice', 'No guidelines provided'))

        # Brand Alignment
        st.markdown("### 🏷️ Brand Alignment")
        st.write(brief.get('brand_alignment', 'No alignment guidelines'))

        # Competitive Angle
        if brief.get('competitive_angle'):
            st.markdown("### 🏆 Competitive Positioning")
            st.write(brief['competitive_angle'])

        # Calls to Action
        st.markdown("### 📢 Calls to Action")
        ctas = brief.get('calls_to_action', [])
        if ctas:
            for cta in ctas:
                st.success(f"• {cta}")
        else:
            st.info("No CTAs suggested")

        # Success Metrics
        st.markdown("### 📊 Success Metrics")
        metrics = brief.get('success_metrics', [])
        if metrics:
            for metric in metrics:
                st.info(f"• {metric}")
        else:
            st.info("No success metrics defined")

        # Content Warnings
        warnings = brief.get('content_warnings', [])
        if warnings:
            st.markdown("### ⚠️ Content Warnings")
            for warning in warnings:
                st.warning(f"• {warning}")

        # Export options
        st.subheader("📄 Export Content Brief")

        col1, col2 = st.columns(2)

        with col1:
            # Markdown Export
            brief_markdown = self._generate_brief_markdown(brief)

            st.download_button(
                label="📝 Download Markdown",
                data=brief_markdown,
                file_name=f"content_brief_{summary.get('target_keyword', 'keyword').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md",
                mime="text/markdown",
                use_container_width=True
            )

        with col2:
            # JSON Export
            export_data = {
                "summary": summary,
                "content_brief": brief,
                "metadata": result.envelope
            }

            import json
            st.download_button(
                label="📋 Download JSON",
                data=json.dumps(export_data, indent=2),
                file_name=f"content_brief_{summary.get('target_keyword', 'keyword').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json",
                use_container_width=True
            )

    def _generate_brief_markdown(self, brief: Dict[str, Any]) -> str:
        """Generate markdown version of the content brief."""
        markdown = f"""# Content Brief: {brief.get('title', 'Untitled')}

## Overview
- **Target Keyword:** {brief.get('target_keywords', [''])[0] if brief.get('target_keywords') else 'N/A'}
- **Estimated Word Count:** {brief.get('estimated_word_count', 'N/A')}
- **Read Time:** {brief.get('estimated_read_time', 'N/A')}

## Objective
{brief.get('objective', 'No objective defined')}

## Target Audience
{brief.get('target_audience', 'No audience defined')}

## Target Keywords
{chr(10).join(f"- {kw}" for kw in brief.get('target_keywords', []))}

## Content Structure
{chr(10).join(f"{i+1}. {section}" for i, section in enumerate(brief.get('content_structure', [])))}

## Key Points
{chr(10).join(f"- {point}" for point in brief.get('key_points', []))}

## Tone & Voice
{brief.get('tone_and_voice', 'No guidelines provided')}

## Brand Alignment
{brief.get('brand_alignment', 'No alignment guidelines')}

## Calls to Action
{chr(10).join(f"- {cta}" for cta in brief.get('calls_to_action', []))}

## Success Metrics
{chr(10).join(f"- {metric}" for metric in brief.get('success_metrics', []))}

---
*Generated by Brand Intelligence Platform on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""

        return markdown
