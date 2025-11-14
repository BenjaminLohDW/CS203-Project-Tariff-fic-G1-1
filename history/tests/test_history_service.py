"""
Unit tests for HistoryService
Tests business logic in isolation using mocks
"""
import pytest
from unittest.mock import Mock, MagicMock
from services.history_service import HistoryService
from models import History, HistoryTariffLine, HistoryAgreementLine
from sqlalchemy.exc import IntegrityError


class TestHistoryService:
    """Test suite for HistoryService business logic"""
    
    @pytest.fixture
    def mock_repos(self):
        """Create mock repositories"""
        return {
            'history_repo': Mock(),
            'tariff_repo': Mock(),
            'agreement_repo': Mock(),
            'validator': Mock()
        }
    
    @pytest.fixture
    def service(self, mock_repos):
        """Create service instance with mocked dependencies"""
        return HistoryService(
            history_repo=mock_repos['history_repo'],
            tariff_repo=mock_repos['tariff_repo'],
            agreement_repo=mock_repos['agreement_repo'],
            validator=mock_repos['validator']
        )
    
    def test_get_user_history_success(self, service, mock_repos):
        """Test successful retrieval of user history"""
        # Arrange
        user_id = "test-user-123"
        mock_history = Mock()
        mock_history.to_dict.return_value = {"history_id": "h1", "user_id": user_id}
        
        mock_repos['validator'].validate_pagination_params.return_value = (1, 20)
        mock_repos['history_repo'].find_by_user_id.return_value = (
            [mock_history],
            {"page": 1, "size": 20, "total": 1}
        )
        
        # Act
        result = service.get_user_history(user_id, 1, 20)
        
        # Assert
        assert result["code"] == 200
        assert result["total"] == 1
        assert len(result["data"]) == 1
        mock_repos['history_repo'].find_by_user_id.assert_called_once_with(user_id, 1, 20)
    
    def test_get_history_detail_not_found(self, service, mock_repos):
        """Test getting details for non-existent history"""
        # Arrange
        mock_repos['history_repo'].find_by_id.return_value = None
        
        # Act
        result, status_code = service.get_history_detail("invalid-id", 1, 20)
        
        # Assert
        assert status_code == 404
        assert result["code"] == 404
        assert "not found" in result["message"].lower()
    
    def test_get_history_detail_success(self, service, mock_repos):
        """Test successful retrieval of history details"""
        # Arrange
        history_id = "h123"
        mock_history = Mock()
        mock_history.to_dict.return_value = {"history_id": history_id}
        
        mock_tariff = Mock()
        mock_tariff.to_dict.return_value = {"line_id": "t1"}
        
        mock_agreement = Mock()
        mock_agreement.to_dict.return_value = {"line_id": "a1"}
        
        mock_repos['validator'].validate_pagination_params.return_value = (1, 20)
        mock_repos['history_repo'].find_by_id.return_value = mock_history
        mock_repos['tariff_repo'].find_by_history_id.return_value = (
            [mock_tariff],
            {"page": 1, "size": 20, "total": 1}
        )
        mock_repos['agreement_repo'].find_by_history_id.return_value = [mock_agreement]
        
        # Act
        result, status_code = service.get_history_detail(history_id, 1, 20)
        
        # Assert
        assert status_code == 200
        assert result["code"] == 200
        assert result["data"]["history"]["history_id"] == history_id
        assert len(result["data"]["tariff_lines"]) == 1
        assert len(result["data"]["agreement_lines"]) == 1
    
    def test_create_history_validation_error(self, service, mock_repos):
        """Test create with invalid data"""
        # Arrange
        mock_repos['validator'].validate_create_request.return_value = "Missing required fields"
        
        # Act
        result, status_code = service.create_history({}, "user123")
        
        # Assert
        assert status_code == 400
        assert result["code"] == 400
        assert "Missing required fields" in result["message"]
    
    def test_create_history_ownership_violation(self, service, mock_repos):
        """Test create with mismatched user_id"""
        # Arrange
        data = {"user_id": "other-user"}
        mock_repos['validator'].validate_create_request.return_value = None
        
        # Act
        result, status_code = service.create_history(data, "current-user")
        
        # Assert
        assert status_code == 403
        assert result["code"] == 403
        assert "forbidden" in result["error"].lower()
    
    def test_create_history_success(self, service, mock_repos):
        """Test successful history creation"""
        # Arrange
        data = {
            "user_id": "user123",
            "product_type": "Electronics",
            "total_qty": "10",
            "base_cost": "1000",
            "final_cost": "1200",
            "import_country": "US",
            "export_country": "CN",
            "tariff_lines": [
                {"description": "Tariff 1", "type": "ad_valorem", "rate": "20", "amount": "200"}
            ]
        }
        
        mock_history = Mock()
        mock_history.history_id = "h123"
        mock_history.to_dict.return_value = {"history_id": "h123"}
        
        mock_repos['validator'].validate_create_request.return_value = None
        mock_repos['history_repo'].save.return_value = mock_history
        mock_repos['tariff_repo'].find_all_by_history_id.return_value = []
        mock_repos['agreement_repo'].find_by_history_id.return_value = []
        
        # Act
        result, status_code = service.create_history(data, "user123")
        
        # Assert
        assert status_code == 201
        assert result["code"] == 201
        assert "successfully saved" in result["message"].lower()
        mock_repos['history_repo'].save.assert_called_once()
        mock_repos['history_repo'].commit.assert_called_once()
    
    def test_create_history_integrity_error(self, service, mock_repos):
        """Test handling of database integrity errors"""
        # Arrange
        data = {
            "user_id": "user123",
            "product_type": "Electronics",
            "total_qty": "10",
            "base_cost": "1000",
            "final_cost": "1200",
            "import_country": "US",
            "export_country": "CN",
            "tariff_lines": [{"description": "T", "type": "ad", "rate": "20", "amount": "200"}]
        }
        
        mock_repos['validator'].validate_create_request.return_value = None
        mock_repos['history_repo'].save.side_effect = IntegrityError("", "", "")
        
        # Act
        result, status_code = service.create_history(data, "user123")
        
        # Assert
        assert status_code == 409
        assert result["code"] == 409
        assert "integrity error" in result["message"].lower()
        mock_repos['history_repo'].rollback.assert_called_once()
    
    def test_delete_history_not_found(self, service, mock_repos):
        """Test delete for non-existent history"""
        # Arrange
        mock_repos['history_repo'].find_by_id.return_value = None
        
        # Act
        result, status_code = service.delete_history("invalid-id", "user123")
        
        # Assert
        assert status_code == 404
        assert result["code"] == 404
    
    def test_perform_delete_success(self, service, mock_repos):
        """Test successful deletion"""
        # Arrange
        mock_history = Mock()
        mock_history.history_id = "h123"
        
        # Act
        result, status_code = service.perform_delete(mock_history)
        
        # Assert
        assert status_code == 200
        assert result["code"] == 200
        assert "deleted successfully" in result["message"].lower()
        mock_repos['history_repo'].delete.assert_called_once_with(mock_history)
        mock_repos['history_repo'].commit.assert_called_once()
    
    def test_perform_delete_error(self, service, mock_repos):
        """Test deletion error handling"""
        # Arrange
        mock_history = Mock()
        mock_repos['history_repo'].delete.side_effect = Exception("DB Error")
        
        # Act
        result, status_code = service.perform_delete(mock_history)
        
        # Assert
        assert status_code == 500
        assert result["code"] == 500
        mock_repos['history_repo'].rollback.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
