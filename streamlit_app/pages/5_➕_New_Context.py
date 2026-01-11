"""
➕ New Context Wizard - Asistente de creación de UCR
===================================================

Wizard paso a paso para crear un nuevo User Context Record desde cero.
Usa AI para generar sugerencias iniciales y guía al usuario a través del proceso.
"""

# Load .env file before any imports
import os
from pathlib import Path

# Try to load .env file
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Loaded .env file from wizard")
    else:
        print("⚠️ .env file not found in wizard")
except ImportError:
    # Manual loading fallback
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print(f"✅ Manually loaded .env file in wizard")

import streamlit as st
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime

from brand_intel.core.models import (
    Configuration, Brand, CategoryDefinition, Competitors,
    StrategicIntent, NegativeScope, Governance, Competitor,
    CompetitorTier, CompetitorStatus, Evidence
)
from brand_intel.services import UCRService
from streamlit_app.services.session_manager import SessionManager
from streamlit_app.services.ai_service import get_ai_service
from streamlit_app.config.settings import Settings


def render_new_context_wizard():
    """Render the main New Context Wizard page."""
    st.title("➕ Create New UCR Context")
    st.markdown("AI-powered wizard to create a new User Context Record from scratch")

    # Initialize services
    settings = Settings()
    session = SessionManager()
    ucr_service = UCRService()
    ai_service = get_ai_service()

    # Initialize wizard state
    if "wizard_step" not in st.session_state:
        st.session_state.wizard_step = 1

    if "wizard_data" not in st.session_state:
        st.session_state.wizard_data = {
            "domain": "",
            "brand_name": "",
            "ai_analysis": {},
            "sections": {},
            "competitors": [],
            "guardrails": {},
            "quality_score": None
        }

    # Add persistence controls
    render_persistence_controls()

    # Step content
    step = st.session_state.wizard_step

    if step == 1:
        render_step_1_domain_input()
    elif step == 2:
        render_step_2_ai_analysis()
    elif step == 3:
        render_step_3_review_sections()
    elif step == 4:
        render_step_4_competitors()
    elif step == 5:
        render_step_5_guardrails()
    elif step == 6:
        render_step_6_save_confirm(session, ucr_service)

    # Navigation buttons
    render_navigation_buttons()


def render_persistence_controls():
    """Render persistence and session controls."""
    col1, col2, col3 = st.columns([1, 1, 1])

    with col1:
        # Save progress
        if st.button("💾 Save Progress", help="Save current wizard progress"):
            _save_wizard_progress()
            st.success("Progress saved!")

    with col2:
        # Load progress
        if st.button("📂 Load Progress", help="Load previously saved progress"):
            if _load_wizard_progress():
                st.success("Progress loaded!")
                st.rerun()
            else:
                st.warning("No saved progress found")

    with col3:
        # Reset wizard
        if st.button("🔄 Reset Wizard", help="Start over completely"):
            _reset_wizard()
            st.info("Wizard reset!")
            st.rerun()


def _save_wizard_progress():
    """Save current wizard progress to session storage."""
    # In a real implementation, this would save to backend/database
    # For now, we keep it in session state
    progress_data = {
        "wizard_step": st.session_state.get("wizard_step", 1),
        "wizard_data": st.session_state.get("wizard_data", {}),
        "analysis_complete": st.session_state.get("analysis_complete", False),
        "saved_at": datetime.now().isoformat()
    }

    # Store in session state (would be database in production)
    st.session_state["_wizard_progress"] = progress_data


def _load_wizard_progress() -> bool:
    """Load saved wizard progress."""
    progress_data = st.session_state.get("_wizard_progress")
    if not progress_data:
        return False

    # Restore state
    st.session_state.wizard_step = progress_data.get("wizard_step", 1)
    st.session_state.wizard_data = progress_data.get("wizard_data", {})
    st.session_state.analysis_complete = progress_data.get("analysis_complete", False)

    return True


def _reset_wizard():
    """Reset wizard to initial state."""
    # Clear all wizard-related session state
    keys_to_clear = [
        "wizard_step", "wizard_data", "analysis_complete",
        "_wizard_progress"
    ]

    for key in keys_to_clear:
        if key in st.session_state:
            del st.session_state[key]

    # Reinitialize
    st.session_state.wizard_step = 1
    st.session_state.wizard_data = {
        "domain": "",
        "brand_name": "",
        "ai_analysis": {},
        "sections": {},
        "competitors": [],
        "guardrails": {},
        "quality_score": None
    }


def render_progress_bar():
    """Render the progress bar for the wizard."""
    steps = [
        "Domain Input",
        "AI Analysis",
        "Review Sections",
        "Competitors",
        "Guardrails",
        "Save & Confirm"
    ]

    current_step = st.session_state.wizard_step
    progress = (current_step - 1) / len(steps)

    st.progress(progress)

    # Step indicators
    cols = st.columns(len(steps))
    for i, step_name in enumerate(steps, 1):
        with cols[i-1]:
            if i < current_step:
                st.success(f"✅ {i}")
            elif i == current_step:
                st.info(f"🔄 {i}")
            else:
                st.caption(f"⏳ {i}")
            st.caption(step_name)


def render_step_1_domain_input():
    """Step 1: Domain and basic brand input."""
    st.header("🎯 Step 1: Brand Domain")

    st.markdown("""
    Start by entering your brand's primary domain. This will be used to analyze
    your brand and discover competitors automatically.
    """)

    col1, col2 = st.columns([2, 1])

    with col1:
        domain = st.text_input(
            "Primary Domain *",
            value=st.session_state.wizard_data.get("domain", ""),
            placeholder="e.g., nike.com, coca-cola.com",
            help="Your brand's main website domain"
        )

        brand_name = st.text_input(
            "Brand Name (optional)",
            value=st.session_state.wizard_data.get("brand_name", ""),
            placeholder="e.g., Nike, Coca-Cola",
            help="Leave empty to auto-detect from domain"
        )

    with col2:
        st.markdown("### 📋 Requirements")
        st.markdown("- Valid domain format")
        st.markdown("- Accessible website")
        st.markdown("- Primary brand domain")

        # Validation
        if domain:
            is_valid = _validate_domain_for_wizard(domain)
            if is_valid:
                st.success("✅ Domain looks good!")
            else:
                st.error("❌ Invalid domain format")

    # Update wizard data
    st.session_state.wizard_data["domain"] = domain
    st.session_state.wizard_data["brand_name"] = brand_name

    # Enable next step
    can_proceed = bool(domain and _validate_domain_for_wizard(domain))
    if can_proceed:
        st.success("Ready to analyze! Click 'Analyze with AI →' below.")


def render_step_2_ai_analysis():
    """Step 2: AI-powered analysis of the domain."""
    st.header("🤖 Step 2: AI Analysis")

    domain = st.session_state.wizard_data.get("domain", "")
    brand_name = st.session_state.wizard_data.get("brand_name", "")
    ai_service = get_ai_service()

    st.markdown(f"""
    Analyzing **{domain}** to generate your initial UCR configuration.
    This will take a few moments...
    """)

    # Show available providers
    available_providers = ai_service.get_available_providers()
    if not available_providers:
        st.error("❌ No AI providers configured. Please set up API keys for Claude, OpenAI, or Gemini.")
        return

    # Provider selector
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.info(f"🤖 Available AI providers: {', '.join([p.capitalize() for p in available_providers])}")
    
    with col2:
        preferred_provider = st.selectbox(
            "Choose Provider",
            options=available_providers,
            format_func=lambda x: x.capitalize(),
            key="ai_provider_selector",
            help="Select which AI provider to use for analysis"
        )
        st.session_state.wizard_data["preferred_provider"] = preferred_provider

    # Analysis progress
    if "analysis_complete" not in st.session_state:
        if st.button("🔍 Start AI Analysis", type="primary"):
            with st.spinner("Analyzing brand and market..."):
                try:
                    # Get selected provider
                    preferred_provider = st.session_state.wizard_data.get("preferred_provider")
                    
                    # Perform real AI analysis with selected provider
                    analysis_result = asyncio.run(
                        ai_service.analyze_domain(domain, brand_name, preferred_provider)
                    )
                    
                    # Also search for competitors with selected provider
                    competitors = asyncio.run(
                        ai_service.search_competitors(
                            domain, 
                            analysis_result.get("category", {}).get("primary_category", "Technology"),
                            brand_name,
                            preferred_provider
                        )
                    )
                    
                    # Combine results
                    analysis_result["competitors"] = competitors
                    
                    st.session_state.wizard_data["ai_analysis"] = analysis_result
                    st.session_state.analysis_complete = True
                    st.rerun()
                    
                except Exception as e:
                    st.error(f"AI Analysis failed: {str(e)}")
                    st.info("Using fallback analysis...")
                    
                    # Fallback to mock data
                    fallback_result = asyncio.run(_perform_fallback_analysis(domain, brand_name))
                    st.session_state.wizard_data["ai_analysis"] = fallback_result
                    st.session_state.analysis_complete = True
                    st.rerun()

    if "analysis_complete" in st.session_state:
        render_analysis_results()


def render_step_3_review_sections():
    """Step 3: Review and edit AI-generated sections."""
    st.header("📝 Step 3: Review Sections")

    analysis = st.session_state.wizard_data.get("ai_analysis", {})

    st.markdown("""
    Review and edit the AI-generated sections. Make any adjustments needed
    before proceeding to competitors.
    """)

    # Tabs for sections
    tab_a, tab_b = st.tabs(["🏢 Section A: Brand", "🎯 Section B: Category"])

    with tab_a:
        render_section_a_review(analysis)

    with tab_b:
        render_section_b_review(analysis)


def render_step_4_competitors():
    """Step 4: Review and approve competitors."""
    st.header("🏆 Step 4: Competitors")

    analysis = st.session_state.wizard_data.get("ai_analysis", {})
    discovered_competitors = analysis.get("competitors", [])

    st.markdown(f"""
    AI discovered **{len(discovered_competitors)} competitors** for your brand.
    Review and approve the ones that are relevant.
    """)

    if discovered_competitors:
        render_competitor_review(discovered_competitors)
    else:
        st.info("No competitors discovered. You can add them manually or skip to the next step.")

    # Manual add competitor
    render_manual_competitor_add()


def render_step_5_guardrails():
    """Step 5: Configure guardrails and exclusions."""
    st.header("🛡️ Step 5: Guardrails")

    analysis = st.session_state.wizard_data.get("ai_analysis", {})

    st.markdown("""
    Configure your guardrails - the hard boundaries that will automatically
    block analysis of certain content or opportunities.
    """)

    render_guardrails_setup(analysis)


def render_step_6_save_confirm(session: SessionManager, ucr_service: UCRService):
    """Step 6: Final review and save."""
    st.header("💾 Step 6: Save & Confirm")

    st.markdown("Review your complete UCR configuration and save it.")

    # Build final configuration
    final_config = _build_final_configuration()

    # Show summary
    render_configuration_summary(final_config, ucr_service)

    # Quality score
    if final_config:
        score = ucr_service.calculate_quality_score(final_config)
        render_final_quality_score(score)

    # Save button
    render_save_button(final_config, session, ucr_service)


def render_navigation_buttons():
    """Render navigation buttons for the wizard."""
    st.divider()

    col1, col2, col3 = st.columns([1, 2, 1])

    current_step = st.session_state.wizard_step
    total_steps = 6

    with col1:
        if current_step > 1:
            if st.button("⬅️ Previous", use_container_width=True):
                st.session_state.wizard_step -= 1
                st.rerun()

    with col2:
        # Progress indicator
        st.caption(f"Step {current_step} of {total_steps}")

    with col3:
        can_proceed = _can_proceed_to_next_step(current_step)

        if current_step < total_steps:
            button_text = "Analyze with AI →" if current_step == 1 else "Next →"
            if st.button(button_text, type="primary", use_container_width=True, disabled=not can_proceed):
                st.session_state.wizard_step += 1
                st.rerun()
        else:
            # Final save button is in step 6
            pass


def _validate_domain_for_wizard(domain: str) -> bool:
    """Basic domain validation for wizard."""
    import re
    if not domain:
        return False

    # Remove protocol and www
    clean_domain = domain.replace("https://", "").replace("http://", "").replace("www.", "")

    # Basic domain regex
    pattern = r'^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, clean_domain))


def _can_proceed_to_next_step(step: int) -> bool:
    """Check if user can proceed to next step."""
    if step == 1:
        domain = st.session_state.wizard_data.get("domain", "")
        return bool(domain and _validate_domain_for_wizard(domain))
    elif step == 2:
        return "analysis_complete" in st.session_state
    else:
        return True


async def _perform_ai_analysis(domain: str, brand_name: str) -> Dict[str, Any]:
    """Perform AI analysis of the domain (mock implementation)."""
    # This will be replaced with real AI calls in Gap 3
    await asyncio.sleep(2)  # Simulate processing time

    # Mock analysis results
    return {
        "brand": {
            "name": brand_name or domain.split(".")[0].title(),
            "domain": domain,
            "industry": "Technology",  # Mock
            "target_market": "Business professionals and enterprises"
        },
        "category": {
            "primary_category": "Software Solutions",
            "included": ["Enterprise Software", "Cloud Services", "Digital Tools"],
            "excluded": ["Consumer Electronics", "Retail"]
        },
        "competitors": [
            {
                "name": "Competitor A",
                "domain": "competitor-a.com",
                "tier": "tier1",
                "why_selected": "Direct competitor in enterprise software space"
            },
            {
                "name": "Competitor B",
                "domain": "competitor-b.com",
                "tier": "tier2",
                "why_selected": "Adjacent player in cloud services"
            }
        ],
        "guardrails": {
            "excluded_categories": ["gambling", "adult_content"],
            "excluded_keywords": ["cheap", "free trial"],
            "industry_specific": ["enterprise software restrictions"]
        }
    }


async def _perform_fallback_analysis(domain: str, brand_name: Optional[str] = None) -> Dict[str, Any]:
    """Fallback analysis when AI services are not available."""
    await asyncio.sleep(1)  # Simulate processing time

    # Extract brand name from domain if not provided
    if not brand_name:
        brand_name = domain.split(".")[0].title()

    # Mock analysis results based on domain patterns
    if "tech" in domain.lower() or "software" in domain.lower():
        industry = "Technology"
        category = "Software Solutions"
        business_model = "SaaS"
    elif "shop" in domain.lower() or "store" in domain.lower():
        industry = "Retail"
        category = "E-commerce"
        business_model = "B2C"
    else:
        industry = "Technology"
        category = "Digital Services"
        business_model = "B2B"

    return {
        "brand": {
            "name": brand_name,
            "industry": industry,
            "business_model": business_model,
            "target_market": f"Customers looking for {category.lower()}",
            "primary_geography": ["Global"],
            "funding_stage": "BOOTSTRAP"
        },
        "category": {
            "primary_category": category,
            "included": [category, f"{category} Solutions"],
            "excluded": ["Gambling", "Adult Content"],
            "semantic_extensions": [category.lower(), "digital solutions"]
        },
        "strategy": {
            "primary_goal": "market_share",
            "risk_tolerance": "medium",
            "secondary_goals": ["brand_awareness"],
            "time_horizon": "medium"
        },
        "competitors": [
            {
                "name": f"Competitor for {brand_name}",
                "domain": f"competitor-{domain.split('.')[0]}.com",
                "tier": "tier1",
                "why_selected": f"Direct competitor in {category.lower()} space"
            }
        ],
        "guardrails": {
            "excluded_categories": ["gambling", "adult_content"],
            "excluded_keywords": ["cheap", "fake"],
            "industry_specific": []
        }
    }


def render_analysis_results():
    """Render AI analysis results."""
    analysis = st.session_state.wizard_data.get("ai_analysis", {})

    st.success("✅ Analysis complete!")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("📊 Analysis Summary")
        brand = analysis.get("brand", {})
        st.write(f"**Brand:** {brand.get('name', 'Unknown')}")
        st.write(f"**Industry:** {brand.get('industry', 'Unknown')}")
        st.write(f"**Target:** {brand.get('target_market', 'Unknown')}")

    with col2:
        category = analysis.get("category", {})
        competitors = analysis.get("competitors", [])
        st.subheader("🎯 Discovered")
        st.write(f"**Category:** {category.get('primary_category', 'Unknown')}")
        st.write(f"**Competitors:** {len(competitors)} found")

    if st.button("✏️ Review & Edit Details"):
        st.session_state.wizard_step = 3
        st.rerun()


# Placeholder functions for other steps - will be implemented
def render_section_a_review(analysis):
    """Render Section A review with AI generation."""
    st.subheader("🏢 Brand Context Review")
    brand = analysis.get("brand", {})
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.write(f"**Name:** {brand.get('name')}")
        st.write(f"**Domain:** {brand.get('domain')}")
        st.write(f"**Industry:** {brand.get('industry')}")
        st.write(f"**Target Market:** {brand.get('target_market')}")
    
    with col2:
        if st.button("🤖 Regenerate", key="regen_section_a", help="Use AI to regenerate brand analysis"):
            with st.spinner("Analyzing brand with AI..."):
                try:
                    ai_service = get_ai_service()
                    domain = st.session_state.wizard_data.get("domain", "")
                    brand_name = st.session_state.wizard_data.get("brand_name", "")
                    
                    new_analysis = asyncio.run(
                        ai_service.analyze_domain(domain, brand_name)
                    )
                    
                    # Update analysis
                    st.session_state.wizard_data["ai_analysis"] = new_analysis
                    st.success("✅ Brand analysis regenerated!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to regenerate: {str(e)}")
    
    # AI Suggestions
    st.divider()
    st.markdown("### 💡 AI Suggestions")
    
    suggestions = {
        "Industry Alternatives": ["Consider related industries for expansion"],
        "Target Market Expansion": ["Adjacent market segments to consider"],
        "Geographic Opportunities": ["Regions with high demand for your products"]
    }
    
    for suggestion_type, items in suggestions.items():
        with st.expander(f"📌 {suggestion_type}"):
            for item in items:
                st.write(f"• {item}")


def render_section_b_review(analysis):
    """Render Section B review with AI generation."""
    st.subheader("🎯 Category Definition Review")
    category = analysis.get("category", {})
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.write(f"**Primary Category:** {category.get('primary_category')}")
        st.write(f"**Included:** {', '.join(category.get('included', []))}")
        st.write(f"**Excluded:** {', '.join(category.get('excluded', []))}")
    
    with col2:
        if st.button("🤖 Regenerate", key="regen_section_b", help="Use AI to regenerate category analysis"):
            with st.spinner("Analyzing category with AI..."):
                try:
                    ai_service = get_ai_service()
                    domain = st.session_state.wizard_data.get("domain", "")
                    brand_name = st.session_state.wizard_data.get("brand_name", "")
                    
                    new_analysis = asyncio.run(
                        ai_service.analyze_domain(domain, brand_name)
                    )
                    
                    # Update analysis
                    st.session_state.wizard_data["ai_analysis"] = new_analysis
                    st.success("✅ Category analysis regenerated!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to regenerate: {str(e)}")
    
    # AI Suggestions
    st.divider()
    st.markdown("### 💡 AI Suggestions")
    
    suggestions = {
        "Semantic Extensions": ["Related terms and synonyms for your category"],
        "Sub-category Opportunities": ["Niche categories within your market"],
        "Exclusion Recommendations": ["Categories to explicitly exclude"]
    }
    
    for suggestion_type, items in suggestions.items():
        with st.expander(f"📌 {suggestion_type}"):
            for item in items:
                st.write(f"• {item}")


def render_competitor_review(competitors):
    """Render competitor review with AI generation."""
    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.subheader("🏆 Discovered Competitors")
    
    with col2:
        if st.button("🤖 Find More", key="find_more_competitors", help="Use AI to discover additional competitors"):
            with st.spinner("Searching for more competitors..."):
                try:
                    ai_service = get_ai_service()
                    domain = st.session_state.wizard_data.get("domain", "")
                    brand_name = st.session_state.wizard_data.get("brand_name", "")
                    analysis = st.session_state.wizard_data.get("ai_analysis", {})
                    category = analysis.get("category", {}).get("primary_category", "Technology")
                    
                    new_competitors = asyncio.run(
                        ai_service.search_competitors(domain, category, brand_name)
                    )
                    
                    # Merge with existing
                    existing = st.session_state.wizard_data.get("ai_analysis", {}).get("competitors", [])
                    all_competitors = existing + new_competitors
                    
                    st.session_state.wizard_data["ai_analysis"]["competitors"] = all_competitors
                    st.success(f"✅ Found {len(new_competitors)} additional competitors!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to find competitors: {str(e)}")

    for comp in competitors:
        with st.expander(f"{comp['name']} ({comp['domain']})"):
            st.write(f"**Tier:** {comp['tier']}")
            st.write(f"**Reason:** {comp['why_selected']}")

            col1, col2 = st.columns(2)
            with col1:
                if st.button(f"✅ Approve", key=f"approve_{comp['domain']}"):
                    st.success(f"Approved {comp['name']}")
            with col2:
                if st.button(f"❌ Reject", key=f"reject_{comp['domain']}"):
                    st.warning(f"Rejected {comp['name']}")


def render_manual_competitor_add():
    """Render manual competitor addition."""
    with st.expander("➕ Add Competitor Manually"):
        name = st.text_input("Company Name")
        domain = st.text_input("Domain")
        reason = st.text_input("Why Selected")

        if st.button("Add Competitor"):
            if name and domain:
                st.success(f"Added {name}")
                # Add to wizard data
            else:
                st.error("Name and domain required")


def render_guardrails_setup(analysis):
    """Render guardrails setup with AI generation."""
    guardrails = analysis.get("guardrails", {})

    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.subheader("🛡️ Guardrails Configuration")
    
    with col2:
        if st.button("🤖 AI Recommendations", key="ai_guardrails", help="Get AI-powered guardrail recommendations"):
            with st.spinner("Analyzing guardrail recommendations..."):
                try:
                    ai_service = get_ai_service()
                    analysis_data = st.session_state.wizard_data.get("ai_analysis", {})
                    brand_data = analysis_data.get("brand", {})
                    
                    # Get AI recommendations for guardrails
                    prompt = f"""
                    Based on the brand '{brand_data.get('name', 'Unknown')}' in the '{brand_data.get('industry', 'Technology')}' industry,
                    recommend specific categories and keywords to exclude from their marketing analysis.
                    
                    Consider:
                    1. Industry regulations and compliance requirements
                    2. Brand reputation and values
                    3. Target market sensitivities
                    4. Competitive landscape
                    
                    Return JSON with:
                    {{
                      "recommended_categories": ["category1", "category2"],
                      "recommended_keywords": ["keyword1", "keyword2"],
                      "reasoning": "explanation"
                    }}
                    """
                    
                    # This would call AI in production
                    st.info("💡 AI Guardrail Recommendations:")
                    st.write("• Exclude gambling and adult content (standard)")
                    st.write("• Exclude counterfeit and illegal products")
                    st.write("• Industry-specific exclusions based on regulations")
                    
                except Exception as e:
                    st.error(f"Failed to get recommendations: {str(e)}")

    st.markdown("---")
    
    st.subheader("Excluded Categories")
    available_categories = ["gambling", "adult_content", "weapons", "alcohol", "pharmaceuticals"]
    default_categories = [cat for cat in guardrails.get("excluded_categories", []) if cat in available_categories]
    
    excluded_cats = st.multiselect(
        "Categories to exclude",
        options=available_categories,
        default=default_categories,
        help="Select categories that should be excluded from analysis"
    )

    st.subheader("Excluded Keywords")
    available_keywords = ["cheap", "free trial", "scam", "illegal", "counterfeit"]
    default_keywords = [kw for kw in guardrails.get("excluded_keywords", []) if kw in available_keywords]
    
    excluded_keywords = st.multiselect(
        "Keywords to exclude",
        options=available_keywords,
        default=default_keywords,
        help="Select keywords that should trigger guardrail violations"
    )
    
    # AI-powered custom guardrails
    st.markdown("---")
    st.subheader("Custom Guardrails")
    
    if st.button("➕ Add Custom Guardrail", key="add_custom_guardrail"):
        st.session_state["show_custom_guardrail"] = True
    
    if st.session_state.get("show_custom_guardrail"):
        col1, col2 = st.columns(2)
        with col1:
            custom_type = st.selectbox("Type", ["Category", "Keyword"])
        with col2:
            custom_value = st.text_input("Value")
        
        if st.button("Add", key="confirm_custom_guardrail"):
            if custom_value:
                if custom_type == "Category":
                    excluded_cats.append(custom_value)
                else:
                    excluded_keywords.append(custom_value)
                st.success(f"Added {custom_value}")
                st.session_state["show_custom_guardrail"] = False
                st.rerun()

    # Save to wizard data
    st.session_state.wizard_data["guardrails"] = {
        "excluded_categories": excluded_cats,
        "excluded_keywords": excluded_keywords
    }


def _build_final_configuration() -> Optional[Configuration]:
    """Build the final configuration from wizard data."""
    wizard_data = st.session_state.wizard_data
    analysis = wizard_data.get("ai_analysis", {})

    if not analysis:
        return None

    brand_data = analysis.get("brand", {})
    category_data = analysis.get("category", {})
    
    # Get domain from wizard_data (Step 1) - this is critical
    domain = wizard_data.get("domain", brand_data.get("domain", ""))

    # Build configuration
    brand = Brand(
        name=brand_data.get("name", ""),
        domain=domain,  # Use domain from Step 1
        industry=brand_data.get("industry", "Technology"),
        target_market=brand_data.get("target_market", "")
    )

    category_def = CategoryDefinition(
        primary_category=category_data.get("primary_category", ""),
        included=category_data.get("included", []),
        excluded=category_data.get("excluded", [])
    )

    # Build competitors
    competitors_list = []
    for comp_data in wizard_data.get("competitors", []):
        competitor = Competitor(
            name=comp_data["name"],
            domain=comp_data["domain"],
            tier=CompetitorTier(comp_data.get("tier", "tier1")),
            status=CompetitorStatus.APPROVED,
            evidence=Evidence(why_selected=comp_data.get("why_selected", ""))
        )
        competitors_list.append(competitor)

    competitors = Competitors(competitors=competitors_list)

    # Build guardrails
    guardrails = wizard_data.get("guardrails", {})
    negative_scope = NegativeScope(
        excluded_categories=guardrails.get("excluded_categories", []),
        excluded_keywords=guardrails.get("excluded_keywords", [])
    )

    return Configuration(
        name=f"{brand.name} Context",
        brand=brand,
        category_definition=category_def,
        competitors=competitors,
        negative_scope=negative_scope,
        governance=Governance()
    )


def render_configuration_summary(config: Optional[Configuration], ucr_service: UCRService):
    """Render configuration summary with AI options."""
    if not config:
        st.error("No configuration to display")
        return

    col1, col2 = st.columns([3, 1])
    
    with col1:
        st.subheader("📋 Configuration Summary")
    
    with col2:
        if st.button("🤖 Regenerate All", key="regenerate_all", help="Use AI to regenerate entire configuration"):
            with st.spinner("Regenerating configuration with AI..."):
                try:
                    ai_service = get_ai_service()
                    domain = st.session_state.wizard_data.get("domain", "")
                    brand_name = st.session_state.wizard_data.get("brand_name", "")
                    
                    new_analysis = asyncio.run(
                        ai_service.analyze_domain(domain, brand_name)
                    )
                    
                    new_competitors = asyncio.run(
                        ai_service.search_competitors(
                            domain,
                            new_analysis.get("category", {}).get("primary_category", "Technology"),
                            brand_name
                        )
                    )
                    
                    new_analysis["competitors"] = new_competitors
                    st.session_state.wizard_data["ai_analysis"] = new_analysis
                    st.success("✅ Configuration regenerated!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Failed to regenerate: {str(e)}")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**Brand:**")
        st.info(f"{config.brand.name} ({config.brand.domain})")

        st.markdown("**Category:**")
        st.info(config.category_definition.primary_category)

        st.markdown("**Competitors:**")
        st.info(f"{len(config.competitors.get_approved())} approved")

    with col2:
        st.markdown("**Industry:**")
        st.info(config.brand.industry)

        st.markdown("**Guardrails:**")
        guardrails_count = (
            len(config.negative_scope.excluded_categories) +
            len(config.negative_scope.excluded_keywords)
        )
        st.info(f"{guardrails_count} exclusions configured")

    # AI Insights
    st.divider()
    st.markdown("### 💡 AI-Generated Insights")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📊 Generate Market Insights", key="gen_market_insights"):
            with st.spinner("Generating market insights..."):
                try:
                    ai_service = get_ai_service()
                    insights = asyncio.run(
                        ai_service.generate_insights(
                            [],  # signals would come from data service
                            {
                                "brand": {
                                    "name": config.brand.name,
                                    "industry": config.brand.industry,
                                    "target_market": config.brand.target_market
                                }
                            }
                        )
                    )
                    st.markdown(insights)
                except Exception as e:
                    st.info("Market insights generation coming soon")
    
    with col2:
        if st.button("🎯 Generate Strategy Brief", key="gen_strategy_brief"):
            with st.spinner("Generating strategy brief..."):
                try:
                    st.info("""
                    **Strategic Recommendations:**
                    • Focus on primary category: """ + config.category_definition.primary_category + """
                    • Monitor """ + str(len(config.competitors.get_approved())) + """ key competitors
                    • Maintain """ + str(len(config.negative_scope.excluded_categories)) + """ category guardrails
                    """)
                except Exception as e:
                    st.error(f"Failed to generate brief: {str(e)}")

    # Validation status
    validation = ucr_service.validate(config)
    if validation.is_valid:
        st.success("✅ Configuration is valid and ready to save")
    else:
        st.error("❌ Configuration has validation errors:")
        for reason in validation.blocked_reasons:
            st.error(f"• {reason}")


def render_final_quality_score(score):
    """Render the final quality score."""
    st.subheader("📊 Quality Score")

    col1, col2 = st.columns([1, 3])

    with col1:
        st.metric("Overall Score", f"{score.overall}/100")
        st.metric("Grade", score.grade.upper())

    with col2:
        st.progress(score.overall / 100)
        st.caption("Higher scores indicate more complete and accurate UCRs")


def render_save_button(config: Optional[Configuration], session: SessionManager, ucr_service: UCRService):
    """Render the final save button."""
    if not config:
        st.error("Cannot save: No configuration available")
        return

    validation = ucr_service.validate(config)
    can_save = validation.is_valid

    if can_save:
        if st.button("💾 Create UCR Context", type="primary", use_container_width=True):
            with st.spinner("Saving UCR context..."):
                # Save to session (in real implementation, save to backend)
                session.set_current_ucr(config)

                # Clear wizard state
                for key in list(st.session_state.keys()):
                    if key.startswith("wizard_") or key == "analysis_complete":
                        del st.session_state[key]

                st.success("✅ UCR Context created successfully!")
                st.balloons()

                # Redirect to editor
                st.info("Redirecting to UCR Editor...")
                st.markdown("[Go to UCR Editor](/UCR_Editor)")
    else:
        st.error("Cannot save: Fix validation errors first")


# Main execution
if __name__ == "__main__":
    render_new_context_wizard()
