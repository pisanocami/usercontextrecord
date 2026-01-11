"""
Utilities - UCR FIRST
======================

Common utilities for the Brand Intelligence platform.
"""

from brand_intel.utils.domain_normalizer import normalize_domain, extract_root_domain
from brand_intel.utils.validators import (
    validate_domain,
    validate_email,
    validate_url,
    validate_api_key,
)
from brand_intel.utils.formatters import (
    format_number,
    format_percentage,
    format_currency,
    format_date,
)

__all__ = [
    # Domain utilities
    "normalize_domain",
    "extract_root_domain",
    # Validators
    "validate_domain",
    "validate_email",
    "validate_url",
    "validate_api_key",
    # Formatters
    "format_number",
    "format_percentage",
    "format_currency",
    "format_date",
]
