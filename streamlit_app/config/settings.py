"""
Settings - UCR FIRST Configuration
===================================

Application settings using Pydantic for validation.
All settings support BYOK (Bring Your Own Key) via environment variables.
"""

import os
from typing import Optional
from dataclasses import dataclass

# Try to load .env file
try:
    from dotenv import load_dotenv
    import os
    
    # Try multiple possible paths for .env file
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '..', '.env'),  # config/../.env
        os.path.join(os.path.dirname(__file__), '..', '..', '.env'),  # config/../../.env
        '.env',  # current directory
        os.path.join(os.getcwd(), '.env'),  # working directory
    ]
    
    env_loaded = False
    for env_path in possible_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            env_loaded = True
            break
    
    if not env_loaded:
        # Fallback: manually load from streamlit_app/.env
        manual_env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        if os.path.exists(manual_env_path):
            with open(manual_env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key] = value
            env_loaded = True
    
    # Debug: print loaded status
    if env_loaded:
        print(f"✅ Loaded .env file from: {env_path if 'env_path' in locals() else manual_env_path}")
    else:
        print("⚠️ No .env file found")
        
except ImportError:
    # python-dotenv not installed, try manual loading
    try:
        import os
        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        os.environ[key] = value
            print(f"✅ Manually loaded .env file from: {env_path}")
    except Exception as e:
        print(f"⚠️ Failed to load .env file: {e}")
except Exception as e:
    print(f"⚠️ Error loading .env file: {e}")


@dataclass
class Settings:
    """
    Application settings.
    
    All API keys support BYOK via environment variables.
    """
    
    # Application
    app_name: str = "Brand Intelligence Platform"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Database
    database_url: str = ""
    
    # Redis (for caching)
    redis_url: str = ""
    
    # AI Providers (BYOK)
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    
    # External APIs
    dataforseo_login: str = ""
    dataforseo_password: str = ""
    ahrefs_api_key: str = ""
    serpapi_key: str = ""
    
    # UCR Settings
    ucr_api_base_url: str = "http://localhost:3000"
    ucr_validation_strict: bool = True
    
    def __post_init__(self):
        """Load settings from environment variables."""
        self.debug = os.getenv("DEBUG", "false").lower() == "true"
        
        # Database
        self.database_url = os.getenv("DATABASE_URL", "")
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        
        # AI Providers (BYOK)
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("AI_INTEGRATIONS_GEMINI_API_KEY", "")
        
        # External APIs
        self.dataforseo_login = os.getenv("DATAFORSEO_LOGIN", "")
        self.dataforseo_password = os.getenv("DATAFORSEO_PASSWORD", "")
        self.ahrefs_api_key = os.getenv("AHREFS_API_KEY", "")
        self.serpapi_key = os.getenv("SERPAPI_KEY", "")
        
        # UCR Settings
        self.ucr_api_base_url = os.getenv("UCR_API_BASE_URL", "http://localhost:3000")
        self.ucr_validation_strict = os.getenv("UCR_VALIDATION_STRICT", "true").lower() == "true"
    
    def has_claude(self) -> bool:
        """Check if Claude API key is configured."""
        return bool(self.anthropic_api_key)
    
    def has_openai(self) -> bool:
        """Check if OpenAI API key is configured."""
        return bool(self.openai_api_key)
    
    def has_gemini(self) -> bool:
        """Check if Gemini API key is configured."""
        return bool(self.gemini_api_key)
    
    def get_available_ai_providers(self) -> list:
        """Get list of available AI providers."""
        providers = []
        if self.has_claude():
            providers.append("claude")
        if self.has_openai():
            providers.append("openai")
        if self.has_gemini():
            providers.append("gemini")
        return providers
