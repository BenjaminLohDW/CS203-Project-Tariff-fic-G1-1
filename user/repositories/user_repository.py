"""
User Service - Repository Layer
Handles data access operations for User entity
Abstracts database operations following Repository Pattern
"""
from typing import Optional, Tuple, List
from models import User, db


class UserRepository:
    """Repository for User entity data access operations."""
    
    def __init__(self, db_session=None):
        """Initialize repository with database session."""
        self.db = db_session or db

    def find_by_id(self, user_id: str) -> Optional[User]:
        """
        Find user by ID.
        
        Args:
            user_id: The user's unique identifier
            
        Returns:
            User object if found, None otherwise
        """
        return User.query.filter_by(user_id=user_id).first()

    def find_by_email(self, email: str) -> Optional[User]:
        """
        Find user by email address.
        
        Args:
            email: The user's email address
            
        Returns:
            User object if found, None otherwise
        """
        return User.query.filter_by(email=email.strip().lower()).first()

    def find_all(self, page: int = 1, size: int = 20) -> Tuple[List[User], dict]:
        """
        Find all users with pagination.
        
        Args:
            page: Page number (1-indexed)
            size: Number of records per page
            
        Returns:
            Tuple of (list of User objects, pagination metadata)
        """
        query = User.query.order_by(User.created_at.desc())
        paginated = query.paginate(page=page, per_page=size, error_out=False)
        
        pagination_data = {
            "page": paginated.page,
            "size": paginated.per_page,
            "total": paginated.total
        }
        
        return paginated.items, pagination_data

    def save(self, user: User) -> User:
        """
        Save or update user record.
        
        Args:
            user: User object to save
            
        Returns:
            Saved User object
        """
        self.db.session.add(user)
        self.db.session.flush()  # Get user_id before commit
        return user

    def delete(self, user: User):
        """
        Delete user record.
        
        Args:
            user: User object to delete
        """
        self.db.session.delete(user)

    def commit(self):
        """Commit current transaction."""
        self.db.session.commit()

    def rollback(self):
        """Rollback current transaction."""
        self.db.session.rollback()
