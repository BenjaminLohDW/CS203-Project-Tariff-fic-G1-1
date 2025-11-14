"""
User Service - Validator Layer
Handles input validation for User operations
Follows Single Responsibility Principle
"""
import re
from typing import Optional, Tuple


class UserValidator:
    """Validator for User-related input data."""
    
    REQUIRED_CREATE_FIELDS = ["name", "email"]
    VALID_ROLES = ["user", "admin"]
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    
    @staticmethod
    def validate_create_request(data: dict) -> Optional[str]:
        """
        Validate user creation request data.
        
        Args:
            data: Dictionary containing user data
            
        Returns:
            Error message string if validation fails, None if valid
        """
        # Check required fields
        if not all(field in data for field in UserValidator.REQUIRED_CREATE_FIELDS):
            missing = [f for f in UserValidator.REQUIRED_CREATE_FIELDS if f not in data]
            return f"Missing required fields: {', '.join(missing)}"
        
        # Validate name
        name_error = UserValidator.validate_name(data.get("name"))
        if name_error:
            return name_error
        
        # Validate email
        email_error = UserValidator.validate_email(data.get("email"))
        if email_error:
            return email_error
        
        return None

    @staticmethod
    def validate_update_request(data: dict) -> Optional[str]:
        """
        Validate user update request data.
        
        Args:
            data: Dictionary containing user data to update
            
        Returns:
            Error message string if validation fails, None if valid
        """
        # At least one field must be provided
        if not data or not any(data.values()):
            return "At least one field must be provided for update"
        
        # Validate name if provided
        if "name" in data:
            name_error = UserValidator.validate_name(data["name"])
            if name_error:
                return name_error
        
        # Validate email if provided
        if "email" in data:
            email_error = UserValidator.validate_email(data["email"])
            if email_error:
                return email_error
        
        # Validate role if provided
        if "role" in data:
            role_error = UserValidator.validate_role(data["role"])
            if role_error:
                return role_error
        
        return None

    @staticmethod
    def validate_name(name: str) -> Optional[str]:
        """
        Validate user name.
        
        Args:
            name: User's name
            
        Returns:
            Error message if invalid, None if valid
        """
        if not name or not name.strip():
            return "Name cannot be empty"
        
        if len(name.strip()) < 2:
            return "Name must be at least 2 characters"
        
        if len(name.strip()) > 100:
            return "Name must not exceed 100 characters"
        
        return None

    @staticmethod
    def validate_email(email: str) -> Optional[str]:
        """
        Validate email address.
        
        Args:
            email: User's email address
            
        Returns:
            Error message if invalid, None if valid
        """
        if not email or not email.strip():
            return "Email cannot be empty"
        
        if not UserValidator.EMAIL_REGEX.match(email.strip()):
            return "Invalid email format"
        
        if len(email.strip()) > 200:
            return "Email must not exceed 200 characters"
        
        return None

    @staticmethod
    def validate_role(role: str) -> Optional[str]:
        """
        Validate user role.
        
        Args:
            role: User's role
            
        Returns:
            Error message if invalid, None if valid
        """
        if not role or not role.strip():
            return "Role cannot be empty"
        
        if role.strip().lower() not in UserValidator.VALID_ROLES:
            return f"Invalid role. Must be one of: {', '.join(UserValidator.VALID_ROLES)}"
        
        return None

    @staticmethod
    def validate_pagination_params(page: int, size: int) -> Tuple[int, int]:
        """
        Validate and normalize pagination parameters.
        
        Args:
            page: Page number (should be >= 1)
            size: Page size (should be 1-100)
            
        Returns:
            Tuple of (normalized_page, normalized_size)
        """
        normalized_page = max(int(page), 1)
        normalized_size = min(max(int(size), 1), 100)
        return normalized_page, normalized_size

