"""
AI Provider Selector Component
==============================

Component for selecting AI provider in Streamlit UI.
"""

import streamlit as st
from typing import Optional
from streamlit_app.services.ai_service import AIService


def render_ai_provider_selector(ai_service: AIService) -> Optional[str]:
    """
    Render AI provider selector component.

    Args:
        ai_service: AI service instance

    Returns:
        Selected provider name or None if none available
    """
    available_providers = ai_service.get_available_providers()

    if not available_providers:
        st.warning("⚠️ No AI providers configured. Add API keys to .env")
        st.info("""
        To enable AI features, add these environment variables:
        - `ANTHROPIC_API_KEY` for Claude
        - `OPENAI_API_KEY` for GPT
        - `GEMINI_API_KEY` for Gemini
        """)
        return None

    # Show available providers
    provider_display = {
        "claude": "🤖 Claude (Anthropic)",
        "gemini": "🔍 Gemini (Google)",
        "openai": "💬 GPT (OpenAI)"
    }

    options = [provider_display.get(p, p.title()) for p in available_providers]
    option_values = available_providers

    selected_display = st.selectbox(
        "🤖 AI Provider",
        options=options,
        help="Select which AI model to use for this task",
        key="ai_provider_selector"
    )

    # Find the corresponding provider value
    selected_index = options.index(selected_display) if selected_display in options else 0
    selected_provider = option_values[selected_index] if selected_index < len(option_values) else None

    # Show provider status
    if selected_provider:
        status_emoji = {
            "claude": "🟢",
            "gemini": "🟢",
            "openai": "🟢"
        }.get(selected_provider, "🟡")

        st.caption(f"{status_emoji} {selected_provider.title()} is ready")

    return selected_provider


def render_ai_provider_status(ai_service: AIService):
    """Render status of all AI providers."""
    st.subheader("🤖 AI Provider Status")

    providers = ["claude", "gemini", "openai"]
    provider_names = {
        "claude": "Claude (Anthropic)",
        "gemini": "Gemini (Google)",
        "openai": "GPT (OpenAI)"
    }

    available = ai_service.get_available_providers()

    for provider in providers:
        is_available = provider in available
        status = "🟢 Available" if is_available else "🔴 Not Configured"

        col1, col2 = st.columns([3, 2])
        with col1:
            st.write(f"**{provider_names[provider]}**")
        with col2:
            st.write(status)

    if not available:
        st.error("No AI providers configured. AI features will not work.")
    elif len(available) == 1:
        st.info(f"✅ {len(available)} AI provider available")
    else:
        st.success(f"✅ {len(available)} AI providers available")
