"""Simple in-memory rate limit for login attempts (per IP)."""
from django.core.cache import cache

def check_rate_limit(key, limit=5, window_seconds=300):
    """Returns (allowed, current_count)."""
    count = cache.get(key, 0)
    if count >= limit:
        return False, count
    return True, count

def incr_rate_limit(key, window_seconds=300):
    count = cache.get(key, 0)
    count += 1
    cache.set(key, count, timeout=window_seconds)
    return count
