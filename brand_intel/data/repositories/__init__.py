"""
Repositories - UCR FIRST Data Access
=====================================

Repository pattern implementation for data access.
All repositories are UCR-aware.
"""

from brand_intel.data.repositories.brand_repository import BrandRepository
from brand_intel.data.repositories.config_repository import ConfigurationRepository
from brand_intel.data.repositories.analysis_repository import AnalysisRepository
from brand_intel.data.repositories.signal_repository import SignalRepository

__all__ = [
    "BrandRepository",
    "ConfigurationRepository",
    "AnalysisRepository",
    "SignalRepository",
]
