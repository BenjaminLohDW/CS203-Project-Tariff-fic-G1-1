"""
Tests for Country Service API endpoints
Tests both Country and CountryRelation functionality
"""
import pytest
import os
from datetime import date, datetime

# Set environment to use SQLite BEFORE importing app
os.environ['DB_HOST'] = 'localhost'
os.environ['DB_NAME'] = ':memory:'
os.environ['TESTING'] = 'true'

from app import app, db, Country, CountryRelation, get_weights


@pytest.fixture
def client():
    """Create test client with in-memory database"""
    # Override database URI to use SQLite
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {}
    
    with app.test_client() as client:
        with app.app_context():
            # Dispose existing PostgreSQL engine and recreate with SQLite
            db.engine.dispose()
            # Force recreation of database with SQLite
            db.session.remove()
            db.drop_all()
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()


@pytest.fixture
def sample_countries(client):
    """Create sample countries for testing"""
    countries = [
        Country(name='Singapore', code='SGP'),
        Country(name='Malaysia', code='MYS'),
        Country(name='United States', code='USA'),
        Country(name='China', code='CHN')
    ]
    
    with app.app_context():
        for country in countries:
            db.session.add(country)
        db.session.commit()
        
        # Return IDs for reference
        return {c.code: c.country_id for c in countries}


@pytest.fixture
def sample_relations(client, sample_countries):
    """Create sample country relations"""
    relations = [
        CountryRelation(
            pair_a='MYS', 
            pair_b='SGP', 
            weight=0.85,
            effective_date=date(2024, 1, 1)
        ),
        CountryRelation(
            pair_a='CHN',
            pair_b='USA',
            weight=-0.30,
            effective_date=date(2024, 1, 1)
        )
    ]
    
    with app.app_context():
        for relation in relations:
            db.session.add(relation)
        db.session.commit()


class TestCountryEndpoints:
    """Test Country CRUD endpoints"""
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'
        assert data['service'] == 'Country Microservice API'
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns API info"""
        response = client.get('/')
        assert response.status_code == 200
        data = response.get_json()
        assert data['service'] == 'Country Microservice API'
        assert data['version'] == '1.0.0'
    
    def test_list_countries_empty(self, client):
        """Test listing countries when database is empty"""
        response = client.get('/countries/all')
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
        assert data['data'] == []
    
    def test_list_countries_with_data(self, client, sample_countries):
        """Test listing all countries"""
        response = client.get('/countries/all')
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
        assert len(data['data']) == 4
        
        # Check ordering (should be alphabetical by name)
        names = [c['name'] for c in data['data']]
        assert names == sorted(names)
    
    def test_get_country_by_id_success(self, client, sample_countries):
        """Test getting country by ID"""
        country_id = sample_countries['SGP']
        response = client.get(f'/countries/{country_id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
        assert data['data']['name'] == 'Singapore'
        assert data['data']['code'] == 'SGP'
    
    def test_get_country_by_id_not_found(self, client):
        """Test getting non-existent country by ID"""
        response = client.get('/countries/99999')
        assert response.status_code == 404
        data = response.get_json()
        assert data['code'] == 404
        assert 'not found' in data['error'].lower()
    
    def test_get_country_by_name_success(self, client, sample_countries):
        """Test getting country by name"""
        response = client.get('/countries/by-name?name=Singapore')
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
        assert data['data']['name'] == 'Singapore'
        assert data['data']['code'] == 'SGP'
    
    def test_get_country_by_name_case_insensitive(self, client, sample_countries):
        """Test country name search is case-insensitive"""
        response = client.get('/countries/by-name?name=singapore')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['name'] == 'Singapore'
    
    def test_get_country_by_name_missing_param(self, client):
        """Test getting country without name parameter"""
        response = client.get('/countries/by-name')
        assert response.status_code == 400
        data = response.get_json()
        assert 'name' in data['error'].lower()
    
    def test_get_country_by_name_not_found(self, client):
        """Test getting non-existent country by name"""
        response = client.get('/countries/by-name?name=Nonexistent')
        assert response.status_code == 404
        data = response.get_json()
        assert data['code'] == 404
    
    def test_create_country_success(self, client):
        """Test creating a new country"""
        new_country = {
            'name': 'Japan',
            'code': 'JPN'
        }
        response = client.post('/countries/insert', json=new_country)
        assert response.status_code == 201
        data = response.get_json()
        assert data['code'] == 201
        assert data['message'] == 'Country created successfully'
        assert data['data']['name'] == 'Japan'
        assert data['data']['code'] == 'JPN'
    
    def test_create_country_missing_fields(self, client):
        """Test creating country with missing fields"""
        incomplete = {'name': 'Japan'}
        response = client.post('/countries/insert', json=incomplete)
        assert response.status_code == 400
        data = response.get_json()
        assert 'required' in data['error'].lower()
    
    def test_create_country_duplicate(self, client, sample_countries):
        """Test creating duplicate country"""
        duplicate = {
            'name': 'Singapore',
            'code': 'SGP'
        }
        response = client.post('/countries/insert', json=duplicate)
        assert response.status_code == 409
        data = response.get_json()
        assert 'already exists' in data['error'].lower()
    
    def test_create_country_no_json(self, client):
        """Test creating country without JSON data"""
        response = client.post('/countries/insert')
        assert response.status_code == 400
        data = response.get_json()
        assert 'no json' in data['error'].lower()
    
    def test_bulk_create_countries_success(self, client):
        """Test bulk creating countries"""
        countries = {
            'countries': [
                {'name': 'Japan', 'code': 'JPN'},
                {'name': 'South Korea', 'code': 'KOR'},
                {'name': 'Thailand', 'code': 'THA'}
            ]
        }
        response = client.post('/countries/bulk', json=countries)
        assert response.status_code == 201
        data = response.get_json()
        assert data['created'] == 3
        assert data['skipped'] == 0
    
    def test_bulk_create_skip_duplicates(self, client, sample_countries):
        """Test bulk create with skip_duplicates flag"""
        countries = {
            'countries': [
                {'name': 'Singapore', 'code': 'SGP'},  # Duplicate
                {'name': 'Japan', 'code': 'JPN'}       # New
            ],
            'skip_duplicates': True
        }
        response = client.post('/countries/bulk', json=countries)
        assert response.status_code == 201
        data = response.get_json()
        assert data['created'] == 1
        assert data['skipped'] == 1
    
    def test_bulk_create_invalid_format(self, client):
        """Test bulk create with invalid format"""
        response = client.post('/countries/bulk', json={'invalid': 'data'})
        assert response.status_code == 400
        data = response.get_json()
        assert 'countries' in data['error'].lower()


class TestCountryRelations:
    """Test Country Relations endpoints"""
    
    def test_get_relation_success(self, client, sample_relations):
        """Test getting current relation between two countries"""
        response = client.get('/countries/relation/current?a=SGP&b=MYS')
        assert response.status_code == 200
        data = response.get_json()
        assert data['code'] == 200
        assert data['data']['weight'] == 0.85
        
        # Check pair normalization (alphabetically ordered)
        pair = data['data']['pair']
        assert pair == ['MYS', 'SGP']
    
    def test_get_relation_no_data(self, client):
        """Test getting relation with no data (returns 0.0)"""
        response = client.get('/countries/relation/current?a=XXX&b=YYY')
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['weight'] == 0.0
    
    def test_get_relation_missing_params(self, client):
        """Test getting relation without required parameters"""
        response = client.get('/countries/relation/current?a=SGP')
        assert response.status_code == 400
        data = response.get_json()
        assert 'required' in data['error'].lower()
    
    def test_get_relation_same_country(self, client):
        """Test getting relation where a==b"""
        response = client.get('/countries/relation/current?a=SGP&b=SGP')
        assert response.status_code == 400
        data = response.get_json()
        assert 'differ' in data['error'].lower()


class TestHelperFunctions:
    """Test helper functions"""
    
    def test_get_weights_same_country(self, client):
        """Test get_weights returns 1.0 for same country"""
        with app.app_context():
            weight = get_weights('SGP', 'SGP')
            assert weight == 1.0
    
    def test_get_weights_with_data(self, client, sample_relations):
        """Test get_weights retrieves correct weight"""
        with app.app_context():
            weight = get_weights('SGP', 'MYS')
            assert weight == 0.85
            
            # Test order doesn't matter (normalized alphabetically)
            weight2 = get_weights('MYS', 'SGP')
            assert weight2 == 0.85
    
    def test_get_weights_no_data(self, client):
        """Test get_weights returns 0.0 when no relation exists"""
        with app.app_context():
            weight = get_weights('XXX', 'YYY')
            assert weight == 0.0
    
    def test_get_weights_case_insensitive(self, client, sample_relations):
        """Test get_weights handles case normalization"""
        with app.app_context():
            weight = get_weights('sgp', 'mys')
            assert weight == 0.85
