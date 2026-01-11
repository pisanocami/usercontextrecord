"""
Domain Normalizer - UCR FIRST
==============================

Utilities for normalizing and processing domain names.
Consistent domain handling is critical for UCR competitor matching.
"""

import re
from typing import Optional
from urllib.parse import urlparse


def normalize_domain(domain: str) -> str:
    """
    Normalize a domain to a consistent format.
    
    Removes:
    - Protocol (http://, https://)
    - www. prefix
    - Trailing slashes
    - Query parameters
    - Paths
    
    Args:
        domain: Raw domain string
        
    Returns:
        Normalized domain (e.g., "example.com")
        
    Examples:
        >>> normalize_domain("https://www.example.com/page?q=1")
        "example.com"
        >>> normalize_domain("WWW.EXAMPLE.COM")
        "example.com"
    """
    if not domain:
        return ""
    
    domain = domain.strip().lower()
    
    # Remove protocol
    if "://" in domain:
        try:
            parsed = urlparse(domain)
            domain = parsed.netloc or parsed.path
        except Exception:
            domain = domain.split("://", 1)[-1]
    
    # Remove www.
    if domain.startswith("www."):
        domain = domain[4:]
    
    # Remove path and query
    domain = domain.split("/")[0]
    domain = domain.split("?")[0]
    domain = domain.split("#")[0]
    
    # Remove port
    domain = domain.split(":")[0]
    
    return domain.strip()


def extract_root_domain(domain: str) -> str:
    """
    Extract the root domain (without subdomains).
    
    Args:
        domain: Domain string (can include subdomains)
        
    Returns:
        Root domain (e.g., "example.com" from "blog.example.com")
        
    Examples:
        >>> extract_root_domain("blog.example.com")
        "example.com"
        >>> extract_root_domain("shop.store.example.co.uk")
        "example.co.uk"
    """
    domain = normalize_domain(domain)
    
    if not domain:
        return ""
    
    # Common TLDs that have two parts
    two_part_tlds = {
        "co.uk", "com.au", "co.nz", "co.za", "com.br",
        "co.jp", "co.kr", "com.mx", "com.ar", "com.cn",
        "org.uk", "net.au", "gov.uk", "ac.uk", "edu.au"
    }
    
    parts = domain.split(".")
    
    if len(parts) <= 2:
        return domain
    
    # Check for two-part TLD
    potential_tld = ".".join(parts[-2:])
    if potential_tld in two_part_tlds:
        return ".".join(parts[-3:])
    
    return ".".join(parts[-2:])


def is_valid_domain(domain: str) -> bool:
    """
    Check if a string is a valid domain.
    
    Args:
        domain: Domain string to validate
        
    Returns:
        True if valid domain format
    """
    domain = normalize_domain(domain)
    
    if not domain:
        return False
    
    # Basic domain pattern
    pattern = r'^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$'
    
    return bool(re.match(pattern, domain))


def domains_match(domain1: str, domain2: str) -> bool:
    """
    Check if two domains match (after normalization).
    
    Args:
        domain1: First domain
        domain2: Second domain
        
    Returns:
        True if domains match
    """
    return normalize_domain(domain1) == normalize_domain(domain2)


def get_domain_parts(domain: str) -> dict:
    """
    Parse domain into its components.
    
    Args:
        domain: Domain string
        
    Returns:
        Dictionary with subdomain, name, and tld
    """
    domain = normalize_domain(domain)
    root = extract_root_domain(domain)
    
    parts = root.split(".")
    
    if len(parts) >= 2:
        # Check for two-part TLD
        if len(parts) == 3:
            return {
                "subdomain": domain.replace(root, "").rstrip("."),
                "name": parts[0],
                "tld": ".".join(parts[1:])
            }
        return {
            "subdomain": domain.replace(root, "").rstrip("."),
            "name": parts[0],
            "tld": parts[-1]
        }
    
    return {
        "subdomain": "",
        "name": domain,
        "tld": ""
    }
