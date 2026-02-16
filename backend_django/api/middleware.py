"""Audit logging middleware: logs all API requests to ActivityLog."""
import json
from django.utils import timezone
from .models import ActivityLog, User
from .services import get_client_ip, get_user_agent
from .auth_utils import decode_token

class AuditLoggingMiddleware:
    """Middleware to log all API requests with user, action, and status."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Routes that shouldn't be logged (to reduce noise)
        self.skip_logging_paths = {
            '/api/health-check',
            '/api/auth/health',
            '/static/',
            '/admin/',
        }

    def __call__(self, request):
        # Check if this is an API request we should log
        should_log = self._should_log(request)
        
        response = self.get_response(request)
        
        if should_log:
            self._log_activity(request, response)
        
        return response

    def _should_log(self, request):
        """Check if request should be logged."""
        path = request.path
        for skip_path in self.skip_logging_paths:
            if path.startswith(skip_path):
                return False
        return path.startswith('/api/')

    def _log_activity(self, request, response):
        """Log the activity to database."""
        try:
            user_id = None
            user_email = ""
            user_name = ""
            
            # Try to extract user from JWT token
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
                try:
                    decoded = decode_token(token)
                    if decoded:
                        user_id = decoded.get('sub')
                        user = User.objects.filter(id=user_id).first()
                        if user:
                            user_email = user.email
                            user_name = user.full_name or ""
                except:
                    pass
            
            # Determine action type from method and path
            method = request.method
            path = request.path
            action = self._get_action_type(method, path)
            
            # Determine status from response
            status = 'Success' if response.status_code < 400 else 'Failed'
            
            # Extract details
            details = self._extract_details(request, response, method, path)
            
            # Log to database
            ActivityLog.objects.create(
                user_id=user_id,
                user_email=user_email,
                user_name=user_name,
                action=action,
                ip_address=get_client_ip(request),
                device=get_user_agent(request),
                status=status,
                details=details[:2000],  # Limit to 2000 chars
            )
        except Exception as e:
            # Silently fail if logging fails
            print(f"Error logging activity: {e}")

    def _get_action_type(self, method, path):
        """Determine action type from HTTP method and path."""
        if method == 'GET':
            if 'admin' in path:
                return 'VIEW_ADMIN'
            return 'VIEW'
        elif method == 'POST':
            if 'login' in path:
                return 'LOGIN'
            elif 'logout' in path:
                return 'LOGOUT'
            elif 'password-reset' in path:
                return 'PASSWORD_RESET'
            elif 'password-change' in path:
                return 'PASSWORD_CHANGED'
            else:
                return 'CREATE'
        elif method == 'PUT' or method == 'PATCH':
            return 'UPDATE'
        elif method == 'DELETE':
            return 'DELETE'
        return 'OTHER'

    def _extract_details(self, request, response, method, path):
        """Extract relevant details from request/response."""
        details = f"{method} {path}"
        
        # Add response status
        details += f" → {response.status_code}"
        
        # For error responses, try to add error message
        if response.status_code >= 400:
            try:
                data = json.loads(response.content.decode())
                if 'detail' in data:
                    details += f": {data['detail']}"
            except:
                pass
        
        return details
