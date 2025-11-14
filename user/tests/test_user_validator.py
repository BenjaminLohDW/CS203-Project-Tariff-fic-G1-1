"""
Unit tests for UserValidator
Tests validation logic in isolation
"""
import pytest
from validators.user_validator import UserValidator


class TestUserValidator:
    """Test suite for UserValidator."""
    
    # Test validate_create_request
    def test_validate_create_request_missing_fields(self):
        """Test validation with missing required fields."""
        data = {"name": "John"}
        error = UserValidator.validate_create_request(data)
        assert error is not None
        assert "Missing required fields" in error
        assert "email" in error
    
    def test_validate_create_request_empty_name(self):
        """Test validation with empty name."""
        data = {"name": "  ", "email": "john@example.com"}
        error = UserValidator.validate_create_request(data)
        assert error is not None
        assert "Name cannot be empty" in error
    
    def test_validate_create_request_invalid_email(self):
        """Test validation with invalid email format."""
        data = {"name": "John Doe", "email": "invalid-email"}
        error = UserValidator.validate_create_request(data)
        assert error is not None
        assert "Invalid email format" in error
    
    def test_validate_create_request_success(self):
        """Test validation with valid data."""
        data = {"name": "John Doe", "email": "john@example.com"}
        error = UserValidator.validate_create_request(data)
        assert error is None
    
    # Test validate_update_request
    def test_validate_update_request_no_fields(self):
        """Test validation with no fields to update."""
        data = {}
        error = UserValidator.validate_update_request(data)
        assert error is not None
        assert "At least one field" in error
    
    def test_validate_update_request_invalid_name(self):
        """Test validation with invalid name."""
        data = {"name": "J"}  # Too short
        error = UserValidator.validate_update_request(data)
        assert error is not None
        assert "at least 2 characters" in error
    
    def test_validate_update_request_invalid_role(self):
        """Test validation with invalid role."""
        data = {"role": "superuser"}  # Invalid role
        error = UserValidator.validate_update_request(data)
        assert error is not None
        assert "Invalid role" in error
    
    def test_validate_update_request_success(self):
        """Test validation with valid update data."""
        data = {"name": "Jane Doe", "email": "jane@example.com", "role": "admin"}
        error = UserValidator.validate_update_request(data)
        assert error is None
    
    # Test validate_name
    def test_validate_name_empty(self):
        """Test name validation with empty string."""
        error = UserValidator.validate_name("")
        assert error is not None
        assert "cannot be empty" in error
    
    def test_validate_name_too_short(self):
        """Test name validation with too short name."""
        error = UserValidator.validate_name("J")
        assert error is not None
        assert "at least 2 characters" in error
    
    def test_validate_name_too_long(self):
        """Test name validation with too long name."""
        error = UserValidator.validate_name("a" * 101)
        assert error is not None
        assert "must not exceed 100 characters" in error
    
    def test_validate_name_success(self):
        """Test name validation with valid name."""
        error = UserValidator.validate_name("John Doe")
        assert error is None
    
    # Test validate_email
    def test_validate_email_empty(self):
        """Test email validation with empty string."""
        error = UserValidator.validate_email("")
        assert error is not None
        assert "cannot be empty" in error
    
    def test_validate_email_invalid_format(self):
        """Test email validation with invalid formats."""
        invalid_emails = [
            "notanemail",
            "@example.com",
            "user@",
            "user@domain",
            "user domain@example.com"
        ]
        for email in invalid_emails:
            error = UserValidator.validate_email(email)
            assert error is not None
            assert "Invalid email format" in error
    
    def test_validate_email_too_long(self):
        """Test email validation with too long email."""
        error = UserValidator.validate_email("a" * 200 + "@example.com")
        assert error is not None
        assert "must not exceed 200 characters" in error
    
    def test_validate_email_success(self):
        """Test email validation with valid emails."""
        valid_emails = [
            "user@example.com",
            "john.doe@company.co.uk",
            "test+tag@domain.com",
            "user123@test-domain.org"
        ]
        for email in valid_emails:
            error = UserValidator.validate_email(email)
            assert error is None
    
    # Test validate_role
    def test_validate_role_empty(self):
        """Test role validation with empty string."""
        error = UserValidator.validate_role("")
        assert error is not None
        assert "cannot be empty" in error
    
    def test_validate_role_invalid(self):
        """Test role validation with invalid role."""
        error = UserValidator.validate_role("superuser")
        assert error is not None
        assert "Invalid role" in error
    
    def test_validate_role_success(self):
        """Test role validation with valid roles."""
        valid_roles = ["user", "admin", "USER", "ADMIN"]  # Case insensitive
        for role in valid_roles:
            error = UserValidator.validate_role(role)
            assert error is None
    
    # Test validate_pagination_params
    def test_validate_pagination_params_normalizes_values(self):
        """Test pagination parameter normalization."""
        # Test negative page
        page, size = UserValidator.validate_pagination_params(-1, 20)
        assert page == 1
        
        # Test zero page
        page, size = UserValidator.validate_pagination_params(0, 20)
        assert page == 1
        
        # Test size too large
        page, size = UserValidator.validate_pagination_params(1, 200)
        assert size == 100
        
        # Test size too small
        page, size = UserValidator.validate_pagination_params(1, 0)
        assert size == 1
        
        # Test valid values
        page, size = UserValidator.validate_pagination_params(5, 50)
        assert page == 5
        assert size == 50
