"""
Test suite for Agreement Service
Tests business logic, validation, and integration with repository layer
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import date
from services.agreement_service import AgreementService
from validators.agreement_validator import AgreementValidator
from repositories.agreement_repository import AgreementRepository


class TestAgreementService:
    """Test suite for AgreementService business logic"""

    @pytest.fixture
    def service(self):
        """Create AgreementService instance for testing"""
        return AgreementService(country_ms_url="http://test-country:5005")

    @pytest.fixture
    def mock_agreement(self):
        """Create mock agreement object"""
        agreement = Mock()
        agreement.id = 1
        agreement.importerId = "SG"
        agreement.exporterId = "US"
        agreement.start_date = date(2025, 1, 1)
        agreement.end_date = date(2025, 12, 31)
        agreement.kind = "override"
        agreement.value = 0.05
        agreement.note = "Test agreement"
        agreement.to_dict.return_value = {
            "id": 1,
            "importerId": "SG",
            "exporterId": "US",
            "start_date": "2025-01-01",
            "end_date": "2025-12-31",
            "kind": "override",
            "value": 0.05,
            "note": "Test agreement"
        }
        return agreement

    # ============================================================
    # Country Resolution Tests
    # ============================================================

    @patch('services.agreement_service.requests.get')
    def test_resolve_country_code_success(self, mock_get, service):
        """Test successful country code resolution"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": {"code": "SG", "name": "Singapore"}}
        mock_get.return_value = mock_response

        result = service.resolve_country_code("Singapore")
        
        assert result == "SG"
        mock_get.assert_called_once_with("http://test-country:5005/countries/by-name?name=Singapore")

    @patch('services.agreement_service.requests.get')
    def test_resolve_country_code_not_found(self, mock_get, service):
        """Test country code resolution when country not found"""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        result = service.resolve_country_code("InvalidCountry")
        
        assert result is None

    @patch('services.agreement_service.requests.get')
    def test_resolve_country_code_network_error(self, mock_get, service):
        """Test country code resolution handles network errors"""
        mock_get.side_effect = Exception("Network error")

        result = service.resolve_country_code("Singapore")
        
        assert result is None

    # ============================================================
    # Create Agreement Tests
    # ============================================================

    @patch.object(AgreementRepository, 'create')
    def test_create_agreement_success(self, mock_create, service, mock_agreement):
        """Test successful agreement creation"""
        mock_create.return_value = mock_agreement
        
        with patch.object(service, 'resolve_country_code') as mock_resolve:
            mock_resolve.side_effect = lambda name: "SG" if name == "Singapore" else "US"
            
            data = {
                'importerName': 'Singapore',
                'exporterName': 'United States',
                'start_date': '2025-01-01',
                'end_date': '2025-12-31',
                'kind': 'override',
                'value': 0.05,
                'note': 'Test agreement'
            }
            
            result, error, status_code = service.create_agreement(data)
            
            assert error is None
            assert status_code == 201
            assert result['id'] == 1
            assert result['importerId'] == "SG"
            assert result['exporterId'] == "US"

    def test_create_agreement_missing_fields(self, service):
        """Test agreement creation with missing required fields"""
        data = {
            'importerName': 'Singapore',
            'start_date': '2025-01-01'
        }
        
        result, error, status_code = service.create_agreement(data)
        
        assert result is None
        assert status_code == 400
        assert "Missing required fields" in error

    def test_create_agreement_invalid_kind(self, service):
        """Test agreement creation with invalid kind"""
        data = {
            'importerName': 'Singapore',
            'exporterName': 'United States',
            'start_date': '2025-01-01',
            'end_date': '2025-12-31',
            'kind': 'invalid_kind',
            'value': 0.05
        }
        
        result, error, status_code = service.create_agreement(data)
        
        assert result is None
        assert status_code == 400
        assert "Invalid kind" in error

    def test_create_agreement_invalid_dates(self, service):
        """Test agreement creation with end date before start date"""
        data = {
            'importerName': 'Singapore',
            'exporterName': 'United States',
            'start_date': '2025-12-31',
            'end_date': '2025-01-01',
            'kind': 'override',
            'value': 0.05
        }
        
        result, error, status_code = service.create_agreement(data)
        
        assert result is None
        assert status_code == 400
        assert "end_date must be after" in error

    def test_create_agreement_country_resolution_fails(self, service):
        """Test agreement creation when country resolution fails"""
        with patch.object(service, 'resolve_country_code', return_value=None):
            data = {
                'importerName': 'InvalidCountry',
                'exporterName': 'United States',
                'start_date': '2025-01-01',
                'end_date': '2025-12-31',
                'kind': 'override',
                'value': 0.05
            }
            
            result, error, status_code = service.create_agreement(data)
            
            assert result is None
            assert status_code == 400
            assert "Failed to resolve country" in error

    # ============================================================
    # List Agreements Tests
    # ============================================================

    @patch.object(AgreementRepository, 'find_all')
    def test_list_agreements_no_filters(self, mock_find_all, service, mock_agreement):
        """Test listing all agreements without filters"""
        mock_find_all.return_value = [mock_agreement]
        
        result, error, status_code = service.list_agreements()
        
        assert error is None
        assert status_code == 200
        assert len(result) == 1
        assert result[0]['id'] == 1

    @patch.object(AgreementRepository, 'find_all')
    def test_list_agreements_with_country_filters(self, mock_find_all, service, mock_agreement):
        """Test listing agreements with country filters"""
        mock_find_all.return_value = [mock_agreement]
        
        with patch.object(service, 'resolve_country_code') as mock_resolve:
            mock_resolve.side_effect = lambda name: "SG" if name == "Singapore" else "US"
            
            result, error, status_code = service.list_agreements(
                importer_name="Singapore",
                exporter_name="United States"
            )
            
            assert error is None
            assert status_code == 200
            assert len(result) == 1

    @patch.object(AgreementRepository, 'find_all')
    def test_list_agreements_with_date_filter(self, mock_find_all, service, mock_agreement):
        """Test listing agreements active on specific date"""
        mock_find_all.return_value = [mock_agreement]
        
        result, error, status_code = service.list_agreements(
            active_on="2025-06-01"
        )
        
        assert error is None
        assert status_code == 200
        assert len(result) == 1

    def test_list_agreements_invalid_date(self, service):
        """Test listing agreements with invalid date format"""
        result, error, status_code = service.list_agreements(
            active_on="invalid-date"
        )
        
        assert len(result) == 0
        assert status_code == 400
        assert "Invalid date format" in error

    # ============================================================
    # Get Active Agreements Tests
    # ============================================================

    @patch.object(AgreementRepository, 'find_active_for_pair')
    def test_get_active_agreements_success(self, mock_find_active, service, mock_agreement):
        """Test getting active agreements for a country pair"""
        mock_find_active.return_value = [mock_agreement]
        
        with patch.object(service, 'resolve_country_code') as mock_resolve:
            mock_resolve.side_effect = lambda name: "SG" if name == "Singapore" else "US"
            
            result, error, status_code = service.get_active_agreements(
                importer_name="Singapore",
                exporter_name="United States",
                on_date="2025-06-01"
            )
            
            assert error is None
            assert status_code == 200
            assert len(result) == 1

    @patch.object(AgreementRepository, 'find_active_for_pair')
    def test_get_active_agreements_defaults_to_today(self, mock_find_active, service, mock_agreement):
        """Test that on_date defaults to today when not provided"""
        mock_find_active.return_value = [mock_agreement]
        
        with patch.object(service, 'resolve_country_code') as mock_resolve:
            mock_resolve.side_effect = lambda name: "SG" if name == "Singapore" else "US"
            
            result, error, status_code = service.get_active_agreements(
                importer_name="Singapore",
                exporter_name="United States"
            )
            
            assert error is None
            assert status_code == 200

    def test_get_active_agreements_missing_importer(self, service):
        """Test active agreements query with missing importer"""
        result, error, status_code = service.get_active_agreements(
            importer_name=None,
            exporter_name="United States"
        )
        
        assert len(result) == 0
        assert status_code == 400
        assert "required" in error

    def test_get_active_agreements_missing_exporter(self, service):
        """Test active agreements query with missing exporter"""
        result, error, status_code = service.get_active_agreements(
            importer_name="Singapore",
            exporter_name=None
        )
        
        assert len(result) == 0
        assert status_code == 400
        assert "required" in error

    def test_get_active_agreements_country_resolution_fails(self, service):
        """Test active agreements when country resolution fails"""
        with patch.object(service, 'resolve_country_code', return_value=None):
            result, error, status_code = service.get_active_agreements(
                importer_name="InvalidCountry",
                exporter_name="United States"
            )
            
            assert len(result) == 0
            assert status_code == 400
            assert "Failed to resolve country" in error

    def test_get_active_agreements_invalid_date(self, service):
        """Test active agreements with invalid date format"""
        with patch.object(service, 'resolve_country_code') as mock_resolve:
            mock_resolve.side_effect = lambda name: "SG" if name == "Singapore" else "US"
            
            result, error, status_code = service.get_active_agreements(
                importer_name="Singapore",
                exporter_name="United States",
                on_date="invalid-date"
            )
            
            assert len(result) == 0
            assert status_code == 400
            assert "Invalid date format" in error
