import asyncio
import json
from datetime import datetime
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    WebSocket connection manager for tracking online users.
    Maintains active connections and broadcasts user status updates.
    """
    
    def __init__(self):
        # {user_id: {"websocket": WebSocket, "connected_at": datetime, "last_seen": datetime}}
        self.active_connections: Dict[int, Dict] = {}
        # {user_id: WebSocket} - for faster lookup
        self.connection_map: Dict[int, WebSocket] = {}
    
    async def connect(self, user_id: int, websocket: WebSocket):
        """Register a new WebSocket connection for a user"""
        await websocket.accept()
        self.active_connections[user_id] = {
            "websocket": websocket,
            "connected_at": datetime.utcnow(),
            "last_seen": datetime.utcnow(),
            "ip_address": websocket.client[0] if websocket.client else "unknown"
        }
        self.connection_map[user_id] = websocket
        
        # Broadcast user online status
        await self.broadcast_status(user_id, "online")
        logger.info(f"User {user_id} connected. Total active: {len(self.active_connections)}")
    
    async def disconnect(self, user_id: int):
        """Remove a user's WebSocket connection"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            del self.connection_map[user_id]
            
            # Broadcast user offline status
            await self.broadcast_status(user_id, "offline")
            logger.info(f"User {user_id} disconnected. Total active: {len(self.active_connections)}")
    
    async def broadcast_status(self, user_id: int, status: str):
        """
        Broadcast user status change to all connected clients.
        
        Args:
            user_id: User who's status changed
            status: "online" or "offline"
        """
        message = {
            "type": "user_status",
            "user_id": user_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to all connected clients
        disconnected_users = []
        for other_user_id, connection_data in self.active_connections.items():
            try:
                await connection_data["websocket"].send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to user {other_user_id}: {str(e)}")
                disconnected_users.append(other_user_id)
        
        # Clean up disconnected clients
        for user_id_to_remove in disconnected_users:
            await self.disconnect(user_id_to_remove)
    
    async def send_personal_message(self, user_id: int, message: dict):
        """Send a message to a specific user"""
        if user_id in self.connection_map:
            try:
                await self.connection_map[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {str(e)}")
                await self.disconnect(user_id)
    
    async def update_last_seen(self, user_id: int):
        """Update user's last seen timestamp"""
        if user_id in self.active_connections:
            self.active_connections[user_id]["last_seen"] = datetime.utcnow()
    
    def get_online_users(self) -> list:
        """
        Get list of currently online users.
        
        Returns:
            List of dicts with user_id, connected_at, last_seen
        """
        return [
            {
                "user_id": user_id,
                "connected_at": data["connected_at"].isoformat(),
                "last_seen": data["last_seen"].isoformat(),
                "ip_address": data["ip_address"]
            }
            for user_id, data in self.active_connections.items()
        ]
    
    def get_online_count(self) -> int:
        """Get count of currently online users"""
        return len(self.active_connections)
    
    def is_user_online(self, user_id: int) -> bool:
        """Check if a specific user is online"""
        return user_id in self.active_connections
    
    async def broadcast_online_list(self):
        """
        Broadcast current list of online users to all clients.
        Useful for periodic updates or when a user connects.
        """
        online_users = self.get_online_users()
        message = {
            "type": "online_users_list",
            "users": online_users,
            "count": len(online_users),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        disconnected_users = []
        for user_id, connection_data in self.active_connections.items():
            try:
                await connection_data["websocket"].send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting online list to user {user_id}: {str(e)}")
                disconnected_users.append(user_id)
        
        # Clean up disconnected clients
        for user_id_to_remove in disconnected_users:
            await self.disconnect(user_id_to_remove)

# Global connection manager instance
manager = ConnectionManager()
