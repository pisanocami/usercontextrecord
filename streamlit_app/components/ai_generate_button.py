"""
AI Generation Button Component
==============================

Reusable button component for AI-powered actions in Streamlit.
"""

import streamlit as st
from typing import Callable, Any, Optional
import asyncio


def render_ai_generate_button(
    label: str,
    on_click: Callable,
    key: str,
    help_text: Optional[str] = None,
    button_type: str = "secondary",
    use_container_width: bool = False,
    **kwargs
) -> Optional[Any]:
    """
    Render an AI generation button with consistent styling and error handling.

    Args:
        label: Button label (without emoji, will be added)
        on_click: Async function to call when clicked
        key: Unique key for the button
        help_text: Help text for the button
        button_type: Streamlit button type ("primary", "secondary")
        use_container_width: Whether to use full container width
        **kwargs: Additional arguments to pass to on_click

    Returns:
        Result of on_click if successful, None otherwise
    """
    # Create columns for button and status
    col1, col2 = st.columns([3, 1])

    result = None

    with col1:
        # Button with AI emoji
        button_label = f"🤖 {label}"

        if st.button(
            button_label,
            type=button_type,
            use_container_width=use_container_width,
            help=help_text,
            key=key
        ):
            with st.spinner(f"Generating {label.lower()}..."):
                try:
                    # Call the async function
                    if asyncio.iscoroutinefunction(on_click):
                        result = asyncio.run(on_click(**kwargs))
                    else:
                        result = on_click(**kwargs)

                    # Success feedback
                    st.success(f"✅ {label} generated successfully!")

                except Exception as e:
                    error_msg = str(e)
                    if "API key" in error_msg.lower():
                        st.error("🔑 API key not configured. Please check your environment variables.")
                    elif "rate limit" in error_msg.lower():
                        st.warning("⏱️ Rate limit reached. Please wait before trying again.")
                    elif "not available" in error_msg.lower():
                        st.error("🤖 AI service not available. Please configure AI providers.")
                    else:
                        st.error(f"❌ Generation failed: {error_msg}")

                    # Log error for debugging
                    st.error(f"Debug info: {type(e).__name__}")

    with col2:
        # BYOK indicator
        st.caption("🔐 BYOK")
        if help_text:
            st.caption("(?)", help=help_text)

    return result


def render_ai_progress_indicator(current: int, total: int, status: str = "Processing..."):
    """Render a progress indicator for multi-step AI operations."""
    progress = min(current / total, 1.0) if total > 0 else 0

    col1, col2 = st.columns([3, 1])

    with col1:
        st.progress(progress)
        st.caption(f"{status} ({current}/{total})")

    with col2:
        if progress < 1.0:
            st.spinner("Working...")
        else:
            st.success("Complete!")


def render_ai_result_display(result: Any, result_type: str = "text"):
    """
    Render AI result in an appropriate format.

    Args:
        result: The AI-generated result
        result_type: Type of result ("text", "json", "markdown", "code")
    """
    if result is None:
        return

    st.subheader("🎯 AI Result")

    if result_type == "markdown":
        st.markdown(result)
    elif result_type == "json":
        if isinstance(result, (dict, list)):
            st.json(result)
        else:
            st.code(result, language="json")
    elif result_type == "code":
        st.code(result, language="python")
    else:  # text
        st.write(result)

    # Copy to clipboard option
    if st.button("📋 Copy Result", key=f"copy_{hash(str(result))}"):
        # Note: Streamlit doesn't have direct clipboard access
        # This would need a custom component or JavaScript
        st.info("Copy functionality requires custom component")


def render_ai_error_boundary(func: Callable) -> Callable:
    """
    Decorator to add error boundaries around AI functions.

    Usage:
        @render_ai_error_boundary
        async def my_ai_function():
            # AI code here
            pass
    """
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)

            # Categorize errors
            if "API key" in error_msg.lower() or "authentication" in error_msg.lower():
                st.error("🔑 **Authentication Error**: Please check your API keys in the environment variables.")
            elif "rate limit" in error_msg.lower() or "quota" in error_msg.lower():
                st.warning("⏱️ **Rate Limit Exceeded**: The AI service is temporarily unavailable. Please wait and try again.")
            elif "network" in error_msg.lower() or "connection" in error_msg.lower():
                st.error("🌐 **Network Error**: Unable to connect to AI service. Check your internet connection.")
            elif "timeout" in error_msg.lower():
                st.warning("⏰ **Timeout**: The AI request took too long. Try again or use a different provider.")
            else:
                st.error(f"🤖 **AI Error**: {error_msg}")

            # Debug info for developers
            with st.expander("🐛 Debug Information", expanded=False):
                st.code(f"Error Type: {error_type}")
                st.code(f"Error Message: {error_msg}")
                st.code(f"Function: {func.__name__}")

            return None

    # Handle both sync and async functions
    if asyncio.iscoroutinefunction(func):
        return wrapper
    else:
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Same error handling as async version
                error_type = type(e).__name__
                error_msg = str(e)

                if "API key" in error_msg.lower():
                    st.error("🔑 **Authentication Error**: Please check your API keys.")
                elif "rate limit" in error_msg.lower():
                    st.warning("⏱️ **Rate Limit Exceeded**: Please wait and try again.")
                else:
                    st.error(f"🤖 **AI Error**: {error_msg}")

                return None

        return sync_wrapper
