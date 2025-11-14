"""
Unit tests for UserService business logic
Tests service layer in isolation using mocks
"""
import pytest
from unittest.mock import Mock, MagicMock
from sqlalchemy.exc import IntegrityError

from services.user_service import UserService
from models import User


class TestUserService:
    """Test suite for UserService."""
    
    @pytest.fixture
    def mock_repos(self):
        """Create mock repository and validator."""
        return {
            'user_repo': Mock(),
            'validator': Mock()
        }
    
    @pytest.fixture
    def service(self, mock_repos):
        """Create service with mocked dependencies."""
        return UserService(
            user_repo=mock_repos['user_repo'],
            validator=mock_repos['validator']
        )
    
    @pytest.fixture
    def sample_user(self):
        """Create sample user object."""
        user = Mock()
        user.user_id = "user123"
        user.name = "john doe"
        user.email = "john@example.com"
        user.role = "user"
        user.to_dict.return_value = {
            "user_id": "user123",
            "name": "john doe",
            "email": "john@example.com",
            "role": "user"
        }
        return user
    
    # Test get_all_users
    def test_get_all_users_success(self, service, mock_repos, sample_user):
        """Test successful retrieval of all users."""
        # Arrange
        mock_repos['validator'].validate_pagination_params.return_value = (1, 20)
        mock_repos['user_repo'].find_all.return_value = (
            [sample_user],
            {"page": 1, "size": 20, "total": 1}
        )
        
        # Act
        result, status = service.get_all_users(1, 20)
        
        # Assert
        assert status == 200
        assert result["code"] == 200
        assert result["total"] == 1
        assert len(result["data"]) == 1
        mock_repos['user_repo'].find_all.assert_called_once_with(1, 20)
    
    def test_get_all_users_empty(self, service, mock_repos):
        """Test retrieving users when none exist."""
        # Arrange
        mock_repos['validator'].validate_pagination_params.return_value = (1, 20)
        mock_repos['user_repo'].find_all.return_value = (
            [],
            {"page": 1, "size": 20, "total": 0}
        )
        
        # Act
        result, status = service.get_all_users(1, 20)
        
        # Assert
        assert status == 404
        assert result["code"] == 404
        assert "No user found" in result["error"]
    
    # Test get_user
    def test_get_user_success(self, service, mock_repos, sample_user):
        """Test successful user retrieval by ID."""
        # Arrange
        mock_repos['user_repo'].find_by_id.return_value = sample_user
        
        # Act
        result, status = service.get_user("user123")
        
        # Assert
        assert status == 200
        assert result["code"] == 200
        assert result["data"]["user_id"] == "user123"
        mock_repos['user_repo'].find_by_id.assert_called_once_with("user123")
    
    def test_get_user_not_found(self, service, mock_repos):
        """Test user not found scenario."""
        # Arrange
        mock_repos['user_repo'].find_by_id.return_value = None
        
        # Act
        result, status = service.get_user("nonexistent")
        
        # Assert
        assert status == 404
        assert result["code"] == 404
        assert "User not found" in result["error"]
    
    # Test create_user
    def test_create_user_validation_error(self, service, mock_repos):
        """Test user creation with validation error."""
        # Arrange
        mock_repos['validator'].validate_create_request.return_value = "Missing required fields"
        
        # Act
        result, status = service.create_user({"name": "John"})
        
        # Assert
        assert status == 400
        assert result["code"] == 400
        assert "Missing required fields" in result["message"]
        mock_repos['user_repo'].save.assert_not_called()
    
    def test_create_user_email_exists(self, service, mock_repos, sample_user):
        """Test user creation with duplicate email."""
        # Arrange
        mock_repos['validator'].validate_create_request.return_value = None
        mock_repos['user_repo'].find_by_email.return_value = sample_user
        
        data = {"name": "John Doe", "email": "john@example.com"}
        
        # Act
        result, status = service.create_user(data)
        
        # Assert
        assert status == 409
        assert result["code"] == 409
        assert "Email already exists" in result["error"]
        mock_repos['user_repo'].save.assert_not_called()
    
    def test_create_user_success(self, service, mock_repos, sample_user):
        """Test successful user creation."""
        # Arrange
        mock_repos['validator'].validate_create_request.return_value = None
        mock_repos['user_repo'].find_by_email.return_value = None
        mock_repos['user_repo'].save.return_value = sample_user
        
        data = {"name": "John Doe", "email": "john@example.com"}
        
        # Act
        result, status = service.create_user(data)
        
        # Assert
        assert status == 200
        assert result["code"] == 200
        assert "successfully created" in result["message"]
        mock_repos['user_repo'].save.assert_called_once()
        mock_repos['user_repo'].commit.assert_called_once()
    
    def test_create_user_integrity_error(self, service, mock_repos):
        """Test user creation with database integrity error."""
        # Arrange
        mock_repos['validator'].validate_create_request.return_value = None
        mock_repos['user_repo'].find_by_email.return_value = None
        mock_repos['user_repo'].save.side_effect = IntegrityError("", "", "")
        
        data = {"name": "John Doe", "email": "john@example.com"}
        
        # Act
        result, status = service.create_user(data)
        
        # Assert
        assert status == 409
        assert result["code"] == 409
        mock_repos['user_repo'].rollback.assert_called_once()
    
    # Test update_user
    def test_update_user_not_found(self, service, mock_repos):
        """Test updating non-existent user."""
        # Arrange
        mock_repos['user_repo'].find_by_id.return_value = None
        
        # Act
        result, status = service.update_user("nonexistent", {"name": "New Name"})
        
        # Assert
        assert status == 404
        assert result["code"] == 404
        assert "User not found" in result["error"]
    
    def test_update_user_validation_error(self, service, mock_repos, sample_user):
        """Test user update with validation error."""
        # Arrange
        mock_repos['user_repo'].find_by_id.return_value = sample_user
        mock_repos['validator'].validate_update_request.return_value = "Invalid email format"
        
        # Act
        result, status = service.update_user("user123", {"email": "invalid"})
        
        # Assert
        assert status == 400
        assert result["code"] == 400
        assert "Invalid email format" in result["message"]
        mock_repos['user_repo'].commit.assert_not_called()
    
    def test_update_user_success(self, service, mock_repos, sample_user):
        """Test successful user update."""
        # Arrange
        mock_repos['user_repo'].find_by_id.return_value = sample_user
        mock_repos['validator'].validate_update_request.return_value = None
        
        data = {"name": "Jane Doe", "email": "jane@example.com"}
        
        # Act
        result, status = service.update_user("user123", data)
        
        # Assert
        assert status == 200
        assert result["code"] == 200
        assert "successfully updated" in result["message"]
        mock_repos['user_repo'].commit.assert_called_once()
    
    # Test delete_user
    def test_delete_user_not_found(self, service, mock_repos):
        """Test deleting non-existent user."""
        # Arrange
        mock_repos['user_repo'].find_by_id.return_value = None
        
        # Act
        result, status = service.delete_user("nonexistent")
        
        # Assert
        assert status == 404
        assert result["code"] == 404
        assert "User not found" in result["error"]
    
    def test_delete_user_success(self, service, mock_repos, sample_user):
        """Test successful user deletion."""
        # Arrange
        mock_repos['user_repo'].find_by_id.return_value = sample_user
        
        # Act
        result, status = service.delete_user("user123")
        
        # Assert
        assert status == 204
        assert result["code"] == 204
        mock_repos['user_repo'].delete.assert_called_once_with(sample_user)
        mock_repos['user_repo'].commit.assert_called_once()
    
    def test_delete_user_with_related_records(self, service, mock_repos, sample_user):
        """Test deleting user with related records (foreign key constraint)."""
        # Arrange
        mock_repos['user_repo'].find_by_id.return_value = sample_user
        mock_repos['user_repo'].delete.side_effect = lambda x: None
        mock_repos['user_repo'].commit.side_effect = IntegrityError("", "", "")
        
        # Act
        result, status = service.delete_user("user123")
        
        # Assert
        assert status == 409
        assert result["code"] == 409
        assert "related records" in result["error"]
        mock_repos['user_repo'].rollback.assert_called_once()
    
    # Test promote_to_admin
    def test_promote_to_admin_not_found(self, service, mock_repos):
        """Test promoting non-existent user."""
        # Arrange
        mock_repos['user_repo'].find_by_id.return_value = None
        
        # Act
        result, status = service.promote_to_admin("nonexistent")
        
        # Assert
        assert status == 404
        assert result["code"] == 404
        assert "User not found" in result["error"]
    
    def test_promote_to_admin_success(self, service, mock_repos, sample_user):
        """Test successful promotion to admin."""
        # Arrange
        mock_repos['user_repo'].find_by_id.return_value = sample_user
        
        # Act
        result, status = service.promote_to_admin("user123")
        
        # Assert
        assert status == 200
        assert result["code"] == 200
        assert "promoted to admin" in result["message"]
        assert sample_user.role == "admin"
        mock_repos['user_repo'].commit.assert_called_once()
