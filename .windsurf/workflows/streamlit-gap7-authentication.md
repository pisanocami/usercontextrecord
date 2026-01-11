---
description: Implementar autenticación para el microservicio Streamlit
---

# Gap 7: Autenticación

## Objetivo
Implementar autenticación para proteger el microservicio Streamlit.

## Opciones de Implementación

### Opción A: API Key Simple (Desarrollo)
Más simple, ideal para desarrollo y testing.

### Opción B: Compartir Sesión con React (Producción)
Usar cookies compartidas con la app React existente.

### Opción C: OAuth Standalone (Producción Alternativa)
Implementar OAuth propio si se necesita independencia.

## Pasos

### 1. Crear Auth Service
Crear `streamlit_app/services/auth_service.py`:
```python
import os
import streamlit as st
from typing import Optional
from dataclasses import dataclass

@dataclass
class User:
    id: str
    email: Optional[str] = None
    name: Optional[str] = None

class AuthService:
    def __init__(self, settings):
        self.settings = settings
        self.mode = os.getenv("AUTH_MODE", "api_key")  # api_key, cookie, oauth
    
    def get_current_user(self) -> Optional[User]:
        """Get current authenticated user."""
        if self.mode == "api_key":
            return self._auth_api_key()
        elif self.mode == "cookie":
            return self._auth_cookie()
        elif self.mode == "oauth":
            return self._auth_oauth()
        return None
    
    def _auth_api_key(self) -> Optional[User]:
        """Simple API key authentication."""
        # Check session state first
        if "user_id" in st.session_state:
            return User(id=st.session_state.user_id)
        
        # Check query params
        api_key = st.query_params.get("api_key")
        if api_key:
            # Validate API key (simple check)
            valid_key = os.getenv("STREAMLIT_API_KEY", "dev-key")
            if api_key == valid_key:
                user_id = st.query_params.get("user_id", "default_user")
                st.session_state.user_id = user_id
                return User(id=user_id)
        
        return None
    
    def _auth_cookie(self) -> Optional[User]:
        """Cookie-based authentication (shared with React app)."""
        # This requires streamlit-cookies-manager or similar
        # cookies = get_cookies()
        # session_token = cookies.get("session_token")
        # if session_token:
        #     user = validate_session_token(session_token)
        #     return user
        return None
    
    def _auth_oauth(self) -> Optional[User]:
        """OAuth authentication."""
        # Use streamlit-oauth or similar
        return None
    
    def require_auth(self) -> User:
        """Require authentication, show login if not authenticated."""
        user = self.get_current_user()
        if not user:
            self._show_login()
            st.stop()
        return user
    
    def _show_login(self):
        """Show login form."""
        st.title("🔐 Login Required")
        
        if self.mode == "api_key":
            st.markdown("""
            ### API Key Authentication
            
            Add `?api_key=YOUR_KEY&user_id=YOUR_ID` to the URL.
            
            Example: `http://localhost:8501?api_key=dev-key&user_id=user123`
            """)
        else:
            st.markdown("Please log in to continue.")
            # Show login form
```

### 2. Crear decorador de autenticación
```python
# auth_service.py (continuación)

def require_auth(func):
    """Decorator to require authentication."""
    def wrapper(*args, **kwargs):
        auth = AuthService(Settings())
        user = auth.require_auth()
        return func(user, *args, **kwargs)
    return wrapper
```

### 3. Integrar en app.py
```python
# app.py
from streamlit_app.services.auth_service import AuthService

def main():
    settings = Settings()
    auth = AuthService(settings)
    
    # Require authentication
    user = auth.require_auth()
    
    # Set user in data service
    data_service = get_data_service()
    data_service.set_user(user.id)
    
    # Continue with app
    render_sidebar()
    render_home()
```

### 4. Implementar logout
```python
def render_logout_button():
    if st.sidebar.button("🚪 Logout"):
        # Clear session
        for key in list(st.session_state.keys()):
            del st.session_state[key]
        st.rerun()
```

### 5. Agregar user info en sidebar
```python
def render_user_info(user: User):
    st.sidebar.markdown(f"""
    <div style="padding: 10px; background: #f0f0f0; border-radius: 8px;">
        👤 **{user.name or user.id}**
        <br>
        <small>{user.email or ''}</small>
    </div>
    """, unsafe_allow_html=True)
```

### 6. Implementar cookie sharing (Opción B)
Si se elige compartir sesión con React:
```python
# Requiere: pip install streamlit-cookies-manager

from streamlit_cookies_manager import EncryptedCookieManager

cookies = EncryptedCookieManager(
    prefix="brand_intel_",
    password=os.getenv("COOKIE_SECRET")
)

def get_session_from_cookie() -> Optional[str]:
    if not cookies.ready():
        st.stop()
    
    session_token = cookies.get("session_token")
    if session_token:
        # Validate with backend
        response = requests.get(
            f"{API_BASE}/api/auth/validate",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        if response.ok:
            return response.json()["user_id"]
    return None
```

### 7. Implementar OAuth (Opción C)
Si se elige OAuth standalone:
```python
# Requiere: pip install streamlit-oauth

from streamlit_oauth import OAuth2Component

oauth = OAuth2Component(
    client_id=os.getenv("OAUTH_CLIENT_ID"),
    client_secret=os.getenv("OAUTH_CLIENT_SECRET"),
    authorize_endpoint="https://accounts.google.com/o/oauth2/auth",
    token_endpoint="https://oauth2.googleapis.com/token",
)

def oauth_login():
    result = oauth.authorize_button(
        "Login with Google",
        redirect_uri="http://localhost:8501",
        scope="openid email profile"
    )
    if result:
        st.session_state.user_id = result["email"]
        st.rerun()
```

### 8. Agregar rate limiting
```python
from datetime import datetime, timedelta

def check_rate_limit(user_id: str, action: str, limit: int = 100) -> bool:
    """Check if user has exceeded rate limit."""
    cache = CacheManager()
    key = f"rate_limit:{user_id}:{action}"
    
    count = cache.get(key) or 0
    if count >= limit:
        return False
    
    cache.set(key, count + 1, ttl=timedelta(hours=1))
    return True
```

### 9. Agregar audit logging
```python
def log_user_action(user_id: str, action: str, details: dict):
    """Log user action for audit trail."""
    # Log to database or external service
    pass
```

### 10. Agregar tests
Crear `tests/unit/test_auth_service.py`

## Variables de Entorno

```env
# Authentication
AUTH_MODE=api_key  # api_key, cookie, oauth
STREAMLIT_API_KEY=your-secret-key

# For cookie mode
COOKIE_SECRET=your-cookie-secret

# For OAuth mode
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
```

## Verificación
- [ ] Auth Service creado
- [ ] API Key auth funcionando
- [ ] Login page implementada
- [ ] Logout funcionando
- [ ] User info en sidebar
- [ ] Rate limiting implementado
- [ ] Tests pasando
