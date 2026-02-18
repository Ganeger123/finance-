#!/usr/bin/env python
"""
Database seeding script to create default admin users
Run this after starting the backend for the first time
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

def seed_database():
    """Create default admin users"""
    print("🌱 Seeding database with default admin users...")
    
    # Import after path is set
    from backend.database import SessionLocal, engine, Base
    from backend.models.user import User
    
    try:
        from werkzeug.security import generate_password_hash
        hasher = lambda pwd: generate_password_hash(pwd, method='pbkdf2:sha256')
    except:
        # Fallback: use simple hash
        import hashlib
        hasher = lambda pwd: hashlib.sha256(pwd.encode()).hexdigest()
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created")
    
    db = SessionLocal()
    
    # Admin credentials
    admins = [
        {
            "email": "hachllersocials@gmail.com",
            "password": "12122007",
            "name": "Administrator",
            "role": "super_admin"
        },
        {
            "email": "staff@finsys.ht",
            "password": "staff123",
            "name": "Staff Admin",
            "role": "admin"
        }
    ]
    
    for admin_data in admins:
        existing = db.query(User).filter(User.email == admin_data["email"]).first()
        
        if not existing:
            # Hash password using werkzeug
            hashed_pwd = hasher(admin_data["password"])
            user = User(
                email=admin_data["email"],
                password=hashed_pwd,
                name=admin_data["name"],
                role=admin_data["role"],
                status="approved"
            )
            db.add(user)
            print(f"✓ Created {admin_data['role']}: {admin_data['email']}")
        else:
            print(f"✓ Already exists: {admin_data['email']} (role: {existing.role}, status: {existing.status})")
    
    db.commit()
    db.close()
    
    print("\n✅ Database seeding complete!")
    print("\n📝 You can now login with:")
    for admin_data in admins:
        print(f"   Email: {admin_data['email']}")
        print(f"   Password: {admin_data['password']}")
        print()

if __name__ == "__main__":
    try:
        seed_database()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

