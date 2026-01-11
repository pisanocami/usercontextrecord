"""
Data Access Layer - UCR FIRST
==============================

Database connections and repository pattern implementation.
All data access is UCR-aware.
"""

from brand_intel.data.database import Database, get_database
from brand_intel.data.cache import CacheManager

__all__ = [
    "Database",
    "get_database",
    "CacheManager",
]
