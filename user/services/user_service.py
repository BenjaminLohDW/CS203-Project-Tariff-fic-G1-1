"""
User Service - Business Logic Layer
Contains all business logic separated from routing and data access
Follows Single Responsibility Principle
"""
from typing import Dict, Tuple
from sqlalchemy.exc import IntegrityError

from models import User
from repositories.user_repository import UserRepository
from validators.user_validator import UserValidator


class UserService:
    """
    Business logic for user management operations
    Coordinates between validators and repositories
    """
    
    def __init__(self, 
                 user_repo: UserRepository = None,
                 validator: UserValidator = None):
        """
        Initialize service with dependencies.
        
        Args:
            user_repo: User repository instance
            validator: Validator instance
        """
        self.user_repo = user_repo or UserRepository()
        self.validator = validator or UserValidator()
    
    def get_all_users(self, page: int = 1, size: int = 20) -> Tuple[Dict, int]:
        """
        Get paginated list of all users.
        
        Args:
            page: Page number (1-indexed)
            size: Items per page (max 100)
            
        Returns:
            Tuple of (response_dict, http_status_code)
        """
        # Validate and normalize pagination params
        page, size = self.validator.validate_pagination_params(page, size)
        
        # Fetch from repository
        users, pagination = self.user_repo.find_all(page, size)
        
        if pagination["total"] == 0:
            return {
                "code": 404,
                "error": "No user found"
            }, 404
        
        return {
            "code": 200,
            "page": pagination["page"],
            "size": pagination["size"],
            "total": pagination["total"],
            "data": [user.to_dict() for user in users]
        }, 200
    
    def get_user(self, user_id: str) -> Tuple[Dict, int]:
        """
        Get user by ID.
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            Tuple of (response_dict, http_status_code)
        """
        user = self.user_repo.find_by_id(user_id)
        
        if not user:
            return {
                "code": 404,
                "error": "User not found"
            }, 404
        
        return {
            "code": 200,
            "data": user.to_dict()
        }, 200
    
    def create_user(self, data: Dict) -> Tuple[Dict, int]:
        """
        Create new user.
        
        Args:
            data: Request data with user information
            
        Returns:
            Tuple of (response_dict, http_status_code)
        """
        # Validate request data
        validation_error = self.validator.validate_create_request(data)
        if validation_error:
            return {
                "code": 400,
                "message": validation_error
            }, 400
        
        # Check if email already exists
        existing_user = self.user_repo.find_by_email(data["email"])
        if existing_user:
            return {
                "code": 409,
                "error": "Email already exists"
            }, 409
        
        try:
            # Create user object
            user = User(
                user_id=data.get("user_id"),  # Accept Firebase user_id if provided
                name=data["name"].strip().lower(),
                email=data["email"].strip().lower()
            )
            
            # Save to repository
            saved_user = self.user_repo.save(user)
            self.user_repo.commit()
            
            return {
                "code": 200,
                "data": saved_user.to_dict(),
                "message": "user successfully created"
            }, 200
            
        except IntegrityError:
            self.user_repo.rollback()
            return {
                "code": 409,
                "error": "Email already exists"
            }, 409
        except Exception as e:
            self.user_repo.rollback()
            return {
                "code": 500,
                "message": str(e)
            }, 500
    
    def update_user(self, user_id: str, data: Dict) -> Tuple[Dict, int]:
        """
        Update user information.
        
        Args:
            user_id: User's unique identifier
            data: Fields to update
            
        Returns:
            Tuple of (response_dict, http_status_code)
        """
        # Find user
        user = self.user_repo.find_by_id(user_id)
        if not user:
            return {
                "code": 404,
                "error": "User not found"
            }, 404
        
        # Validate update data
        validation_error = self.validator.validate_update_request(data)
        if validation_error:
            return {
                "code": 400,
                "message": validation_error
            }, 400
        
        try:
            # Update fields
            for field in ("name", "email", "role"):
                if field in data:
                    setattr(user, field, data[field].strip().lower())
            
            self.user_repo.commit()
            
            return {
                "code": 200,
                "data": user.to_dict(),
                "message": "user successfully updated"
            }, 200
            
        except IntegrityError:
            self.user_repo.rollback()
            return {
                "code": 409,
                "error": "Email already exists"
            }, 409
        except Exception as e:
            self.user_repo.rollback()
            return {
                "code": 500,
                "message": str(e)
            }, 500
    
    def delete_user(self, user_id: str) -> Tuple[Dict, int]:
        """
        Delete user.
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            Tuple of (response_dict, http_status_code)
        """
        user = self.user_repo.find_by_id(user_id)
        if not user:
            return {
                "code": 404,
                "error": "User not found"
            }, 404
        
        try:
            self.user_repo.delete(user)
            self.user_repo.commit()
            
            return {
                "code": 204,
                "message": "deleted"
            }, 204
            
        except IntegrityError:
            self.user_repo.rollback()
            return {
                "code": 409,
                "error": "Cannot delete user due to related records"
            }, 409
        except Exception as e:
            self.user_repo.rollback()
            return {
                "code": 500,
                "message": str(e)
            }, 500
    
    def promote_to_admin(self, user_id: str) -> Tuple[Dict, int]:
        """
        Promote user to admin role.
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            Tuple of (response_dict, http_status_code)
        """
        user = self.user_repo.find_by_id(user_id)
        if not user:
            return {
                "code": 404,
                "error": "User not found"
            }, 404
        
        try:
            user.role = "admin"
            self.user_repo.commit()
            
            return {
                "code": 200,
                "data": user.to_dict(),
                "message": "User successfully promoted to admin"
            }, 200
            
        except Exception as e:
            self.user_repo.rollback()
            return {
                "code": 500,
                "error": "Failed to update user role",
                "message": str(e)
            }, 500
