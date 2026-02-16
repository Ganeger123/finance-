from django.contrib.auth.hashers import BasePasswordHasher, BCryptSHA256PasswordHasher
from django.utils.crypto import constant_time_compare
import bcrypt

class PlainTextPasswordHasher(BasePasswordHasher):
    """
    A password hasher that handles plain text passwords.
    ONLY for migration/development purposes as seen in the original FastAPI code.
    """
    algorithm = "plain"

    def salt(self):
        return ''

    def encode(self, password, salt):
        return password

    def verify(self, password, encoded):
        # If it doesn't have a prefix, it might be a legacy plain text password
        if not encoded.startswith(self.algorithm + "$") and "$" not in encoded:
            return constant_time_compare(password, encoded)
        return super().verify(password, encoded)

    def safe_summary(self, encoded):
        return {'algorithm': self.algorithm}

class RawBCryptPasswordHasher(BCryptSHA256PasswordHasher):
    """
    A password hasher that handles raw bcrypt hashes (without Django's algorithm prefix).
    Used by FastAPI/Passlib.
    """
    algorithm = "bcrypt_raw"

    def verify(self, password, encoded):
        if encoded.startswith(('$2a$', '$2b$', '$2y$')):
            return bcrypt.checkpw(password.encode('utf-8'), encoded.encode('utf-8'))
        return super().verify(password, encoded)

    def encode(self, password, salt):
        # We don't really want to encode NEW passwords as raw bcrypt without prefix 
        # because Django's standard hasher is better for new ones.
        return super().encode(password, salt)
