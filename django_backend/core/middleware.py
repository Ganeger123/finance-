import logging
import time

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("origin")
        logger.info(f"📡 Request: {request.method} {request.path} | Origin: {origin}")
        
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time
        
        logger.info(f"✅ Response: {response.status_code} | Duration: {duration:.4f}s")
        
        return response
