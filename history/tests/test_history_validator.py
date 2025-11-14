"""
Unit tests for HistoryValidator
Tests validation logic in isolation
"""
import pytest
from validators.history_validator import HistoryValidator


class TestHistoryValidator:
    """Test suite for HistoryValidator"""
    
    def test_validate_create_request_missing_fields(self):
        """Test validation fails for missing required fields"""
        # Arrange
        data = {"user_id": "user123"}  # Missing many required fields
        
        # Act
        error = HistoryValidator.validate_create_request(data)
        
        # Assert
        assert error is not None
        assert "missing required fields" in error.lower()
    
    def test_validate_create_request_empty_tariff_lines(self):
        """Test validation allows empty tariff lines (for 0% tariff cases)"""
        # Arrange
        data = {
            "user_id": "user123",
            "product_type": "Electronics",
            "total_qty": "10",
            "base_cost": "1000",
            "final_cost": "1200",
            "import_country": "US",
            "export_country": "CN",
            "tariff_lines": []  # Empty is now allowed (0% tariff products)
        }
        
        # Act
        error = HistoryValidator.validate_create_request(data)
        
        # Assert - Should pass validation for empty tariff array
        assert error is None
    
    def test_validate_create_request_invalid_tariff_line(self):
        """Test validation fails for invalid tariff line"""
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
                {"description": "Tariff 1"}  # Missing type, rate, amount
            ]
        }
        
        # Act
        error = HistoryValidator.validate_create_request(data)
        
        # Assert
        assert error is not None
        assert "missing fields" in error.lower()
    
    def test_validate_create_request_invalid_agreement_kind(self):
        """Test validation fails for invalid agreement kind"""
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
                {"description": "T", "type": "ad", "rate": "20", "amount": "200"}
            ],
            "agreement_lines": [
                {"kind": "invalid_kind", "value_str": "10%", "start_date": "2025-01-01"}
            ]
        }
        
        # Act
        error = HistoryValidator.validate_create_request(data)
        
        # Assert
        assert error is not None
        assert "kind must be one of" in error.lower()
    
    def test_validate_create_request_success(self):
        """Test validation passes for valid data"""
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
            ],
            "agreement_lines": [
                {"kind": "override", "value_str": "10%", "start_date": "2025-01-01"}
            ]
        }
        
        # Act
        error = HistoryValidator.validate_create_request(data)
        
        # Assert
        assert error is None  # No error!
    
    def test_validate_pagination_params_normalizes_values(self):
        """Test pagination params are normalized correctly"""
        # Test minimum values
        page, size = HistoryValidator.validate_pagination_params(-5, -10)
        assert page == 1  # Minimum is 1
        assert size == 1  # Minimum is 1
        
        # Test maximum size
        page, size = HistoryValidator.validate_pagination_params(5, 200)
        assert page == 5
        assert size == 100  # Maximum is 100
        
        # Test normal values
        page, size = HistoryValidator.validate_pagination_params(3, 50)
        assert page == 3
        assert size == 50


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
