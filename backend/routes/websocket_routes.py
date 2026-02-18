from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import user as user_model
from ..services.websocket_manager import manager
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter()

def get_current_user_token(token: str = None, db: Session = Depends(get_db)):
    """
    Helper to get current user from token (for REST endpoints).
    Used by REST endpoints that need authentication.
    """
    from fastapi import Header
    from ..services.auth import verify_token
    
    # This is a simplified version - in production, use proper Bearer token handling
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = verify_token(token)
        user_id = payload.get("id")
        user = db.query(user_model.User).filter(user_model.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    """
    WebSocket endpoint for real-time user presence tracking.
    
    Client connects with: ws://server/api/ws/{jwt_token}
    
    Server broadcasts:
    - user_status: When a user comes online/goes offline
    - online_users_list: List of all currently online users
    - keep_alive: Periodic pings to keep connection alive
    """
    
    # Verify JWT token and get user
    from ..services.auth import verify_token
    try:
        payload = verify_token(token)
        user_id = payload.get("id")
        user_email = payload.get("sub")
        
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return
        
        # Verify user exists
        user = db.query(user_model.User).filter(user_model.User.id == user_id).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
            return
    
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {str(e)}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return
    
    # Connect user
    await manager.connect(user_id, websocket)
    
    # Send current online users list to new user
    await manager.broadcast_online_list()
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            # Handle keep-alive/ping messages
            if data.get("type") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": __import__('datetime').datetime.utcnow().isoformat()
                })
                await manager.update_last_seen(user_id)
    
    except WebSocketDisconnect:
        await manager.disconnect(user_id)
        logger.info(f"User {user_id} websocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {str(e)}")
        await manager.disconnect(user_id)

@router.get("/online-users")
async def get_online_users(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user_token)
):
    """
    Get list of currently online users (REST endpoint).
    Returns list of users with their connection info.
    """
    online_users = manager.get_online_users()
    
    # Optionally, enrich with user details from database
    enriched_users = []
    for user_info in online_users:
        user = db.query(user_model.User).filter(
            user_model.User.id == user_info["user_id"]
        ).first()
        
        if user:
            enriched_users.append({
                "id": user.id,
                "email": user.email,
                "name": user.name or "User",
                "role": user.role,
                "photo_url": user.photo_url,
                "connected_at": user_info["connected_at"],
                "last_seen": user_info["last_seen"],
                "is_online": True
            })
    
    return {
        "count": len(enriched_users),
        "users": enriched_users,
        "timestamp": __import__('datetime').datetime.utcnow().isoformat()
    }

@router.get("/online-status/{user_id}")
async def get_user_online_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(get_current_user_token)
):
    """
    Check if a specific user is currently online.
    """
    is_online = manager.is_user_online(user_id)
    
    # Get user details
    user = db.query(user_model.User).filter(
        user_model.User.id == user_id
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "is_online": is_online
    }
