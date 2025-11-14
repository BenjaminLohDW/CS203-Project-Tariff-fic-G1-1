"""
Tests for Forecast Service API endpoints
Tests tariff prediction and simulation functionality
"""
import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from app import app
from model import TariffForecaster


@pytest.fixture
def client():
    """Create test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def mock_forecaster():
    """Create a mock forecaster with trained model"""
    forecaster = Mock(spec=TariffForecaster)
    forecaster.model = Mock()
    forecaster.model.predict = Mock(return_value=[15.5])
    return forecaster


class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_check(self, client):
        """Test health endpoint returns healthy status"""
        response = client.get('/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'


class TestPredictEndpoint:
    """Test /forecast/predict endpoint"""
    
    @patch('app.forecaster')
    def test_predict_with_explicit_rates(self, mock_forecaster, client):
        """Test prediction with explicit last_rates"""
        # Setup mock
        mock_forecaster.forecast.return_value = 16.2
        
        payload = {
            "import_country": "US",
            "export_country": "CN",
            "last_rates": [15.0, 15.5, 15.8],
            "horizon": 1
        }
        
        response = client.post('/forecast/predict', 
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
        assert 'predicted_tariff' in data
        assert data['import_country'] == 'US'
        assert data['export_country'] == 'CN'
        assert data['horizon_years'] == 1
        assert 'historical_context' in data
    
    @patch('app.forecaster')
    def test_predict_with_hs_code(self, mock_forecaster, client):
        """Test prediction with HS code (fetches historical data)"""
        # Setup mock
        mock_forecaster.get_recent_tariff_rates.return_value = [10.0, 12.0, 15.0]
        mock_forecaster.forecast.return_value = 16.5
        
        payload = {
            "hs_code": "85171300",
            "import_country": "US",
            "export_country": "CN",
            "horizon": 1
        }
        
        response = client.post('/forecast/predict',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
        assert 'hs_code' in data
        assert data['hs_code'] == '85171300'
        assert 'predicted_tariff' in data
    
    @patch('app.forecaster')
    def test_predict_insufficient_historical_data(self, mock_forecaster, client):
        """Test prediction fails with insufficient historical data"""
        # Setup mock to return only 1 year of data (need minimum 2)
        mock_forecaster.get_recent_tariff_rates.return_value = [15.0]
        
        payload = {
            "hs_code": "85171300",
            "import_country": "US",
            "export_country": "CN",
            "horizon": 1
        }
        
        response = client.post('/forecast/predict',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'insufficient' in data['error'].lower()
    
    def test_predict_missing_fields(self, client):
        """Test prediction fails with missing required fields"""
        payload = {
            "import_country": "US"
            # Missing export_country and horizon
        }
        
        response = client.post('/forecast/predict',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'missing required fields' in data['error'].lower()
    
    def test_predict_no_data_source(self, client):
        """Test prediction fails without hs_code, product_name, or last_rates"""
        payload = {
            "import_country": "US",
            "export_country": "CN",
            "horizon": 1
            # Missing any data source
        }
        
        response = client.post('/forecast/predict',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'product_name' in data['error'] or 'hs_code' in data['error']
    
    def test_predict_last_rates_too_few(self, client):
        """Test prediction fails with less than 2 historical rates"""
        payload = {
            "import_country": "US",
            "export_country": "CN",
            "last_rates": [15.0],  # Only 1 rate
            "horizon": 1
        }
        
        response = client.post('/forecast/predict',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'minimum 2' in data['error'].lower()
    
    def test_predict_last_rates_invalid_type(self, client):
        """Test prediction fails with non-array last_rates"""
        payload = {
            "import_country": "US",
            "export_country": "CN",
            "last_rates": "not an array",
            "horizon": 1
        }
        
        response = client.post('/forecast/predict',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'must be' in data['error'].lower() or 'minimum' in data['error'].lower()


class TestSimulateEndpoint:
    """Test /forecast/simulate endpoint"""
    
    @patch('app.forecaster')
    def test_simulate_success(self, mock_forecaster, client):
        """Test simulation with custom relationship score"""
        # Setup mock model
        mock_forecaster.model = Mock()
        mock_forecaster.model.predict = Mock(return_value=[18.5])
        
        payload = {
            "import_country": "US",
            "export_country": "CN",
            "hs_code": "85171300",
            "rel_score": -0.5,
            "last_rates": [15.0, 15.5],
            "horizon": 1
        }
        
        response = client.post('/forecast/simulate',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
        assert 'predicted_tariff' in data
        assert data['scenario_rel_score'] == -0.5
        assert 'explanation' in data
    
    def test_simulate_missing_fields(self, client):
        """Test simulation fails with missing required fields"""
        payload = {
            "import_country": "US",
            "export_country": "CN"
            # Missing hs_code, rel_score, last_rates, horizon
        }
        
        response = client.post('/forecast/simulate',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'missing required fields' in data['error'].lower()
    
    def test_simulate_invalid_rel_score(self, client):
        """Test simulation fails with rel_score outside [-1.0, 1.0]"""
        payload = {
            "import_country": "US",
            "export_country": "CN",
            "hs_code": "85171300",
            "rel_score": 1.5,  # Invalid: > 1.0
            "last_rates": [15.0, 15.5],
            "horizon": 1
        }
        
        response = client.post('/forecast/simulate',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'between -1.0 and 1.0' in data['error'].lower()
    
    def test_simulate_insufficient_last_rates(self, client):
        """Test simulation fails with less than 2 last_rates"""
        payload = {
            "import_country": "US",
            "export_country": "CN",
            "hs_code": "85171300",
            "rel_score": -0.3,
            "last_rates": [15.0],  # Only 1
            "horizon": 1
        }
        
        response = client.post('/forecast/simulate',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'at least 2 values' in data['error'].lower()
    
    @patch('app.forecaster')
    def test_simulate_model_not_trained(self, mock_forecaster, client):
        """Test simulation fails when model is not trained"""
        # Setup mock with no model
        mock_forecaster.model = None
        
        payload = {
            "import_country": "US",
            "export_country": "CN",
            "hs_code": "85171300",
            "rel_score": -0.3,
            "last_rates": [15.0, 15.5],
            "horizon": 1
        }
        
        response = client.post('/forecast/simulate',
                              data=json.dumps(payload),
                              content_type='application/json')
        
        assert response.status_code == 500
        data = response.get_json()
        assert 'model not trained' in data['error'].lower()


class TestTariffForecaster:
    """Test TariffForecaster model class"""
    
    def test_forecaster_initialization(self):
        """Test forecaster initializes with correct defaults"""
        forecaster = TariffForecaster()
        assert forecaster.model is None
        assert forecaster.graph is not None
        assert forecaster.min_historical_years >= 2
        assert forecaster.n_estimators > 0
        assert forecaster.learning_rate > 0
        assert forecaster.max_depth > 0
    
    @patch('model.requests.get')
    def test_fetch_all_countries_success(self, mock_get):
        """Test fetching countries from Country service"""
        # Setup mock response matching actual Country service format
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'code': 200,  # Country service includes status code in response
            'data': [
                {'code': 'SGP', 'name': 'Singapore'},
                {'code': 'MYS', 'name': 'Malaysia'}
            ]
        }
        mock_get.return_value = mock_response
        
        forecaster = TariffForecaster()
        countries = forecaster.fetch_all_countries()
        
        assert len(countries) == 2
        assert countries[0]['code'] == 'SGP'
    
    @patch('model.requests.get')
    def test_fetch_all_countries_error(self, mock_get):
        """Test fetching countries handles errors gracefully"""
        # Setup mock to raise exception
        mock_get.side_effect = Exception("Connection error")
        
        forecaster = TariffForecaster()
        countries = forecaster.fetch_all_countries()
        
        assert countries == []
    
    @patch('model.requests.get')
    def test_fetch_relationship_weight_success(self, mock_get):
        """Test fetching relationship weight"""
        # Setup mock response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': {'weight': 0.85}
        }
        mock_get.return_value = mock_response
        
        forecaster = TariffForecaster()
        weight = forecaster.fetch_relationship_weight('US', 'CN')
        
        assert weight == 0.85
    
    @patch('model.requests.get')
    def test_fetch_relationship_weight_no_data(self, mock_get):
        """Test fetching relationship weight with no data returns 0.0"""
        # Setup mock response with error
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        forecaster = TariffForecaster()
        weight = forecaster.fetch_relationship_weight('US', 'XX')
        
        assert weight == 0.0
