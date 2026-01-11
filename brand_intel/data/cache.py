"""
Cache Manager - UCR FIRST
==========================

Redis-based caching for performance optimization.
Cache keys are UCR-aware for proper invalidation.
"""

import os
import json
from typing import Optional, Any
from datetime import timedelta

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class CacheManager:
    """
    Redis cache manager with UCR-aware key prefixing.
    
    All cache keys include UCR context for proper invalidation.
    """
    
    DEFAULT_TTL = timedelta(hours=1)
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._client: Optional[Any] = None
    
    @property
    def client(self):
        """Lazy initialization of Redis client."""
        if self._client is None:
            if not REDIS_AVAILABLE:
                return None
            try:
                self._client = redis.from_url(self.redis_url, decode_responses=True)
                self._client.ping()
            except Exception:
                self._client = None
        return self._client
    
    def _make_key(self, key: str, ucr_id: Optional[int] = None) -> str:
        """Create UCR-aware cache key."""
        if ucr_id:
            return f"brand_intel:ucr:{ucr_id}:{key}"
        return f"brand_intel:{key}"
    
    def get(self, key: str, ucr_id: Optional[int] = None) -> Optional[Any]:
        """Get value from cache."""
        if not self.client:
            return None
        
        try:
            full_key = self._make_key(key, ucr_id)
            value = self.client.get(full_key)
            if value:
                return json.loads(value)
        except Exception:
            pass
        return None
    
    def set(
        self,
        key: str,
        value: Any,
        ucr_id: Optional[int] = None,
        ttl: Optional[timedelta] = None
    ) -> bool:
        """Set value in cache."""
        if not self.client:
            return False
        
        try:
            full_key = self._make_key(key, ucr_id)
            ttl = ttl or self.DEFAULT_TTL
            self.client.setex(
                full_key,
                int(ttl.total_seconds()),
                json.dumps(value)
            )
            return True
        except Exception:
            return False
    
    def delete(self, key: str, ucr_id: Optional[int] = None) -> bool:
        """Delete value from cache."""
        if not self.client:
            return False
        
        try:
            full_key = self._make_key(key, ucr_id)
            self.client.delete(full_key)
            return True
        except Exception:
            return False
    
    def invalidate_ucr(self, ucr_id: int) -> int:
        """
        Invalidate all cache entries for a UCR.
        
        Call this when UCR is updated to ensure fresh data.
        """
        if not self.client:
            return 0
        
        try:
            pattern = f"brand_intel:ucr:{ucr_id}:*"
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
        except Exception:
            pass
        return 0
    
    def health_check(self) -> bool:
        """Check if cache is available."""
        if not self.client:
            return False
        try:
            return self.client.ping()
        except Exception:
            return False
