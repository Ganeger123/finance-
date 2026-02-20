import logging
from functools import wraps
from django.http import JsonResponse
from .auth_utils import decode_token
from .models import User

logger = logging.getLogger(__name__)

def get_user_from_request(request):
    """
    Extracts user from JWT token in the Authorization header.
    Returns the User object or None if invalid/missing.
    """
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header[7:]
    try:
        payload = decode_token(token)
        if not payload or payload.get('type') != 'access':
            return None
        
        user_email = payload.get('sub')
        user = User.objects.filter(email=user_email).first()
        
        # Security: Check if token version matches (for meaningful revocation)
        if user and user.token_version == payload.get('version'):
            return user
        return None
    except Exception as e:
        logger.error(f"Auth Error: {e}")
        return None

def require_auth(view_func):
    """Decorator to enforce authentication."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        user = get_user_from_request(request)
        if not user:
            return JsonResponse({"detail": "Authentication required"}, status=401)
        if not user.is_active:
             return JsonResponse({"detail": "User account is inactive"}, status=403)
        request.user = user
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def require_admin(view_func):
    """Decorator to enforce Admin role."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        user = get_user_from_request(request)
        if not user:
            return JsonResponse({"detail": "Authentication required"}, status=401)
        
        if not user.is_active:
             return JsonResponse({"detail": "User account is inactive"}, status=403)

        if user.role not in ('admin', 'super_admin'):
            return JsonResponse({"detail": "Admin privileges required"}, status=403)
        
        request.user = user
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def require_super_admin(view_func):
    """Decorator to enforce Super Admin role."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        user = get_user_from_request(request)
        if not user:
            return JsonResponse({"detail": "Authentication required"}, status=401)

        if user.role != 'super_admin':
            return JsonResponse({"detail": "Super Admin privileges required"}, status=403)
        
        request.user = user
        return view_func(request, *args, **kwargs)
    return _wrapped_view
