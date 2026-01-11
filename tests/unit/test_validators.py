"""
Unit Tests - Validators
========================

Tests for validation utilities.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "brand_intel"))

from brand_intel.utils.validators import (
    validate_domain,
    validate_email,
    validate_url,
    validate_api_key,
    validate_competitor_name,
    validate_category,
)
from brand_intel.utils.domain_normalizer import (
    normalize_domain,
    extract_root_domain,
    is_valid_domain,
    domains_match,
)


class TestDomainValidation:
    """Tests for domain validation."""
    
    def test_valid_domain(self):
        """Test valid domain passes."""
        is_valid, error = validate_domain("example.com")
        assert is_valid
        assert error is None
    
    def test_valid_domain_with_subdomain(self):
        """Test domain with subdomain passes."""
        is_valid, error = validate_domain("www.example.com")
        assert is_valid
    
    def test_valid_domain_with_protocol(self):
        """Test domain with protocol passes."""
        is_valid, error = validate_domain("https://example.com")
        assert is_valid
    
    def test_invalid_domain_empty(self):
        """Test empty domain fails."""
        is_valid, error = validate_domain("")
        assert not is_valid
        assert "required" in error.lower()
    
    def test_invalid_domain_format(self):
        """Test invalid format fails."""
        is_valid, error = validate_domain("not-a-domain")
        assert not is_valid


class TestDomainNormalizer:
    """Tests for domain normalization."""
    
    def test_normalize_simple(self):
        """Test simple domain normalization."""
        assert normalize_domain("example.com") == "example.com"
    
    def test_normalize_with_www(self):
        """Test www removal."""
        assert normalize_domain("www.example.com") == "example.com"
    
    def test_normalize_with_protocol(self):
        """Test protocol removal."""
        assert normalize_domain("https://example.com") == "example.com"
        assert normalize_domain("http://example.com") == "example.com"
    
    def test_normalize_with_path(self):
        """Test path removal."""
        assert normalize_domain("example.com/path/to/page") == "example.com"
    
    def test_normalize_with_query(self):
        """Test query string removal."""
        assert normalize_domain("example.com?query=1") == "example.com"
    
    def test_normalize_uppercase(self):
        """Test case normalization."""
        assert normalize_domain("EXAMPLE.COM") == "example.com"
    
    def test_normalize_full_url(self):
        """Test full URL normalization."""
        result = normalize_domain("https://www.example.com/path?query=1#hash")
        assert result == "example.com"
    
    def test_extract_root_domain(self):
        """Test root domain extraction."""
        assert extract_root_domain("blog.example.com") == "example.com"
        assert extract_root_domain("shop.store.example.com") == "example.com"
    
    def test_extract_root_domain_two_part_tld(self):
        """Test root domain with two-part TLD."""
        assert extract_root_domain("shop.example.co.uk") == "example.co.uk"
    
    def test_is_valid_domain(self):
        """Test domain validity check."""
        assert is_valid_domain("example.com") is True
        assert is_valid_domain("sub.example.com") is True
        assert is_valid_domain("not-valid") is False
        assert is_valid_domain("") is False
    
    def test_domains_match(self):
        """Test domain matching."""
        assert domains_match("example.com", "www.example.com") is True
        assert domains_match("EXAMPLE.COM", "example.com") is True
        assert domains_match("https://example.com", "example.com") is True
        assert domains_match("example.com", "other.com") is False


class TestEmailValidation:
    """Tests for email validation."""
    
    def test_valid_email(self):
        """Test valid email passes."""
        is_valid, error = validate_email("user@example.com")
        assert is_valid
        assert error is None
    
    def test_valid_email_with_plus(self):
        """Test email with plus sign passes."""
        is_valid, error = validate_email("user+tag@example.com")
        assert is_valid
    
    def test_invalid_email_empty(self):
        """Test empty email fails."""
        is_valid, error = validate_email("")
        assert not is_valid
    
    def test_invalid_email_no_at(self):
        """Test email without @ fails."""
        is_valid, error = validate_email("userexample.com")
        assert not is_valid
    
    def test_invalid_email_no_domain(self):
        """Test email without domain fails."""
        is_valid, error = validate_email("user@")
        assert not is_valid


class TestURLValidation:
    """Tests for URL validation."""
    
    def test_valid_url_https(self):
        """Test valid HTTPS URL passes."""
        is_valid, error = validate_url("https://example.com")
        assert is_valid
    
    def test_valid_url_http(self):
        """Test valid HTTP URL passes."""
        is_valid, error = validate_url("http://example.com")
        assert is_valid
    
    def test_valid_url_with_path(self):
        """Test URL with path passes."""
        is_valid, error = validate_url("https://example.com/path/to/page")
        assert is_valid
    
    def test_invalid_url_no_protocol(self):
        """Test URL without protocol fails."""
        is_valid, error = validate_url("example.com")
        assert not is_valid
        assert "protocol" in error.lower()
    
    def test_invalid_url_empty(self):
        """Test empty URL fails."""
        is_valid, error = validate_url("")
        assert not is_valid


class TestAPIKeyValidation:
    """Tests for API key validation."""
    
    def test_valid_anthropic_key(self):
        """Test valid Anthropic key passes."""
        is_valid, error = validate_api_key(
            "sk-ant-api03-" + "x" * 50,
            provider="anthropic"
        )
        assert is_valid
    
    def test_invalid_anthropic_key_prefix(self):
        """Test Anthropic key with wrong prefix fails."""
        is_valid, error = validate_api_key(
            "wrong-prefix-" + "x" * 50,
            provider="anthropic"
        )
        assert not is_valid
        assert "sk-ant-" in error
    
    def test_valid_openai_key(self):
        """Test valid OpenAI key passes."""
        is_valid, error = validate_api_key(
            "sk-proj-" + "x" * 50,
            provider="openai"
        )
        assert is_valid
    
    def test_invalid_openai_key_prefix(self):
        """Test OpenAI key with wrong prefix fails."""
        is_valid, error = validate_api_key(
            "wrong-" + "x" * 50,
            provider="openai"
        )
        assert not is_valid
    
    def test_generic_key_validation(self):
        """Test generic key validation."""
        is_valid, error = validate_api_key("some-api-key-12345")
        assert is_valid
        
        is_valid, error = validate_api_key("short")
        assert not is_valid


class TestCompetitorNameValidation:
    """Tests for competitor name validation."""
    
    def test_valid_name(self):
        """Test valid competitor name passes."""
        is_valid, error = validate_competitor_name("Adidas")
        assert is_valid
    
    def test_valid_name_with_spaces(self):
        """Test name with spaces passes."""
        is_valid, error = validate_competitor_name("Under Armour")
        assert is_valid
    
    def test_invalid_name_empty(self):
        """Test empty name fails."""
        is_valid, error = validate_competitor_name("")
        assert not is_valid
    
    def test_invalid_name_too_short(self):
        """Test too short name fails."""
        is_valid, error = validate_competitor_name("A")
        assert not is_valid


class TestCategoryValidation:
    """Tests for category validation."""
    
    def test_valid_category(self):
        """Test valid category passes."""
        is_valid, error = validate_category("Athletic Footwear")
        assert is_valid
    
    def test_invalid_category_empty(self):
        """Test empty category fails."""
        is_valid, error = validate_category("")
        assert not is_valid
    
    def test_invalid_category_too_short(self):
        """Test too short category fails."""
        is_valid, error = validate_category("A")
        assert not is_valid
