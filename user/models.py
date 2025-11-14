"""
User Service - Model Layer
Contains database model definitions for User entity
Follows Single Responsibility Principle
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from uuid import uuid4

db = SQLAlchemy()


class User(db.Model):
    """User model representing application users."""
    __tablename__ = "users"

    user_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    name = db.Column(db.String(100), nullable=False, index=True)
    email = db.Column(db.String(200), nullable=False, unique=True, index=True)
    role = db.Column(db.String(32), default="user")
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    __table_args__ = (
        db.Index("ix_users_created_at", "created_at"),
    )
    
    def to_dict(self):
        """Convert model to dictionary representation."""
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
