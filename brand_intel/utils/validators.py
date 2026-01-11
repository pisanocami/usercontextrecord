"""
Validators - UCR FIRST
=======================

Input validation utilities for the Brand Intelligence platform.
"""

import re
from typing import Optional, Tuple
from urllib.parse import urlparse


def validate_domain(domain: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a domain string.
    
    Args:
        domain: Domain to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not domain:
        return False, "Domain is required"
    
    domain = domain.strip().lower()
    
    # Remove protocol if present
    if "://" in domain:
        domain = domain.split("://", 1)[-1]
    
    # Remove www.
    if domain.startswith("www."):
        domain = domain[4:]
    
    # Remove path
    domain = domain.split("/")[0]
    
    # Check length
    if len(domain) > 253:
        return False, "Domain too long (max 253 characters)"
    
    # Check format
    pattern = r'^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$'
    
    if not re.match(pattern, domain):
        return False, "Invalid domain format"
    
    return True, None


def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    """
    Validate an email address.
    
    Args:
        email: Email to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not email:
        return False, "Email is required"
    
    email = email.strip().lower()
    
    # Basic email pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(pattern, email):
        return False, "Invalid email format"
    
    return True, None


def validate_url(url: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a URL.
    
    Args:
        url: URL to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not url:
        return False, "URL is required"
    
    try:
        result = urlparse(url)
        
        if not result.scheme:
            return False, "URL must include protocol (http:// or https://)"
        
        if result.scheme not in ["http", "https"]:
            return False, "URL must use http or https protocol"
        
        if not result.netloc:
            return False, "URL must include domain"
        
        return True, None
    except Exception as e:
        return False, f"Invalid URL: {str(e)}"


def validate_api_key(
    api_key: str,
    provider: str = "generic"
) -> Tuple[bool, Optional[str]]:
    """
    Validate an API key format.
    
    Args:
        api_key: API key to validate
        provider: API provider (anthropic, openai, generic)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not api_key:
        return False, "API key is required"
    
    api_key = api_key.strip()
    
    # Provider-specific validation
    if provider == "anthropic":
        if not api_key.startswith("sk-ant-"):
            return False, "Anthropic API key should start with 'sk-ant-'"
        if len(api_key) < 50:
            return False, "Anthropic API key appears too short"
    
    elif provider == "openai":
        if not (api_key.startswith("sk-") or api_key.startswith("sk-proj-")):
            return False, "OpenAI API key should start with 'sk-' or 'sk-proj-'"
        if len(api_key) < 40:
            return False, "OpenAI API key appears too short"
    
    else:
        # Generic validation
        if len(api_key) < 10:
            return False, "API key appears too short"
    
    return True, None


def validate_competitor_name(name: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a competitor name.
    
    Args:
        name: Competitor name to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not name:
        return False, "Competitor name is required"
    
    name = name.strip()
    
    if len(name) < 2:
        return False, "Competitor name too short"
    
    if len(name) > 200:
        return False, "Competitor name too long (max 200 characters)"
    
    return True, None


def validate_category(category: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a category name.
    
    Args:
        category: Category to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not category:
        return False, "Category is required"
    
    category = category.strip()
    
    if len(category) < 2:
        return False, "Category too short"
    
    if len(category) > 200:
        return False, "Category too long (max 200 characters)"
    
    return True, None
