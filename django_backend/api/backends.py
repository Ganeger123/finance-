from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.utils.crypto import constant_time_compare
import bcrypt

User = get_user_model()

class PanaceAuthBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
        
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            return None

        # Try standard Django check_password (which handles hashers)
        if user.check_password(password):
            return user
        
        # Fallback for plain text (legacy FastAPI)
        if constant_time_compare(password, user.password):
            # Optionally upgrade the password to a hash here
            # user.set_password(password)
            # user.save()
            return user
            
        # Fallback for raw bcrypt (Passlib/FastAPI format: $2b$12$...)
        if user.password.startswith(('$2a$', '$2b$', '$2y$')):
            try:
                if bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
                    return user
            except Exception:
                pass
                
        return None
