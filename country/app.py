from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flasgger import Swagger
from dotenv import load_dotenv
from urllib.parse import quote_plus
from uuid import uuid4
import os
import datetime
import csv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Swagger configuration
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/api/v1/apispec.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/v1/docs/"
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Country Microservice API",
        "description": "A microservice providing country data and relationships",
        "version": "1.0.0",
        "contact": {
            "name": "CS203 G1-T1",
            "email": "support@cs203.com"
        }
    },
    "host": "localhost:5005",
    "basePath": "/",
    "schemes": ["http", "https"],
    "consumes": ["application/json"],
    "produces": ["application/json"]
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

ENV = os.getenv('ENV', 'local')
DB_USER = os.getenv('DB_USER', 'pgsql')
DB_PASSWORD = quote_plus(os.getenv('DB_PASSWORD', ''))
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'default')
PRODUCT_MS_URL = os.getenv('PRODUCT_MS_BASE', 'http://product:5002')

if ENV == 'aws':
    DB_SSLMODE = os.getenv('DB_SSLMODE', 'require') #'disbale'
else:
    DB_SSLMODE = 'disable'

app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode={DB_SSLMODE}&connect_timeout=10"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,        # Verify connections before using
    'pool_recycle': 300,          # Recycle connections after 5 min
    'pool_size': 5,               # Small pool (proxy does pooling)
    'max_overflow': 2,
    'connect_args': {
        'connect_timeout': 10,
        'sslmode': DB_SSLMODE,    # ✅ Pass sslmode to psycopg2
    }
}

db = SQLAlchemy(app)
migrate = Migrate(app, db, version_table='country_alembic_version')


#----------------------- DB MODELS ----------------------- 
class Country(db.Model):
    __tablename__ = 'countries'
    country_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, unique=True, index=True)
    code = db.Column(db.String(10), nullable=True, index=True)

    def as_dict(self):
        return {
            'country_id': self.country_id,
            'name': self.name,
            'code': self.code,
        }
    
class CountryRelation(db.Model):
    __tablename__ = "country_relations"

    relation_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    pair_a         = db.Column(db.String(10), nullable=False, index=True)
    pair_b         = db.Column(db.String(10), nullable=False, index=True)
    weight         = db.Column(db.Numeric(4, 2), nullable=False)  # -1.00 .. +1.00
    effective_date = db.Column(db.Date, nullable=False, index=True)
    created_at     = db.Column(db.DateTime, server_default=db.func.now())

    __table_args__ = (
        db.UniqueConstraint("pair_a", "pair_b", "effective_date", name="uq_relations_pair_date"),
        db.Index("ix_relations_pair", "pair_a", "pair_b"),
    )

    def json(self):
        return {
            "pair": [self.pair_a, self.pair_b],
            "weight": float(self.weight),
            "effective_date": self.effective_date.isoformat()
        }
    

#----------------------- HELPER FUNCTIONS ----------------------- 
def get_weights(a: str, b: str, as_of=None) -> float:
    #query weights from db
    a = a.strip().upper()
    b = b.strip().upper()

    if a==b: return 1.0 #same country; should be avoided

    # normalize pair order
    pair_a, pair_b = sorted([a, b]) #follow size alphabetically; smaller on left larger on right
    qdate = as_of or db.func.current_date() #retrival date; as of current date

    #returns entire row of said country pair
    w = (CountryRelation.query
        .filter_by(pair_a=pair_a, pair_b=pair_b)
        .filter(CountryRelation.effective_date <= qdate)
        .order_by(CountryRelation.effective_date.desc())
        .first()
    )
    return float(w.weight) if w else 0.0

#----------------------- API ROUTES ----------------------- 

@app.route('/', methods=['GET'])
def root():
    """
    Root endpoint providing API information and links to documentation
    ---
    tags:
      - Information
    responses:
      200:
        description: API information and documentation links
        schema:
          type: object
          properties:
            service:
              type: string
              example: "Country Microservice API"
            version:
              type: string
              example: "1.0.0"
            description:
              type: string
              example: "A microservice providing country data and relationships"
            documentation:
              type: string
              example: "/api/v1/docs/"
    """
    return jsonify({
        'service': 'Country Microservice API',
        'version': '1.0.0',
        'description': 'A microservice providing country data and relationships',
        'documentation': '/api/v1/docs/'
    }), 200

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    ---
    tags:
      - Health
    responses:
      200:
        description: Service health status
        schema:
          type: object
          properties:
            service:
              type: string
              example: "Country Microservice API"
            status:
              type: string
              example: "healthy"
            timestamp:
              type: string
              example: "2025-09-26T10:17:47.022321"
    """
    return jsonify({
        'service': 'Country Microservice API',
        'status': 'healthy',
        'timestamp': datetime.datetime.utcnow().isoformat()
    }), 200


#======================== COUNTRY ==========================
@app.route('/countries/all', methods=['GET'])
def list_countries():
    """
    Get list of all countries
    ---
    tags:
      - Countries
    responses:
      200:
        description: List of all countries
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 200
            data:
              type: array
              items:
                type: object
                properties:
                  country_id:
                    type: integer
                    example: 1
                  name:
                    type: string
                    example: "Singapore"
                  code:
                    type: string
                    example: "SG"
      500:
        description: Internal server error
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 500
            error:
              type: string
              example: "Database connection failed"
    """
    try:
        countries = Country.query.order_by(Country.name).all()
        return jsonify({'code': 200, 'data': [c.as_dict() for c in countries]}), 200
    except Exception as e:
        return jsonify({'code': 500, 'error': str(e)}), 500

# I add 2 endpoints here, search by id or name - just delete the one you dont want :D or comment out 
# This returns the country object if found, else 404
@app.route('/countries/<int:country_id>', methods=['GET'])
def get_country_by_id(country_id):
    """
    Get country by ID
    ---
    tags:
      - Countries
    parameters:
      - name: country_id
        in: path
        type: integer
        required: true
        description: ID of the country to retrieve
        example: 153
    responses:
      200:
        description: Country found
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 200
            data:
              type: object
              properties:
                country_id:
                  type: integer
                  example: 153
                name:
                  type: string
                  example: "Singapore"
                code:
                  type: string
                  example: "SG"
      404:
        description: Country not found
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 404
            error:
              type: string
              example: "Country not found"
      500:
        description: Internal server error
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 500
            error:
              type: string
              example: "Database connection failed"
    """
    try:
        country = Country.query.get(country_id)
        if not country:
            return jsonify({'code': 404, 'error': 'Country not found'}), 404
        return jsonify({'code': 200, 'data': country.as_dict()}), 200
    except Exception as e:
        return jsonify({'code': 500, 'error': str(e)}), 500


@app.route('/countries/by-name', methods=['GET'])
def get_country_by_name():
    """
    Get country by name
    ---
    tags:
      - Countries
    parameters:
      - name: name
        in: query
        type: string
        required: true
        description: Name of the country to search for
        example: "Singapore"
    responses:
      200:
        description: Country found
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 200
            data:
              type: object
              properties:
                country_id:
                  type: integer
                  example: 1
                name:
                  type: string
                  example: "Singapore"
                code:
                  type: string
                  example: "SG"
      400:
        description: Missing name parameter
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 400
            error:
              type: string
              example: "Missing 'name' query parameter"
      404:
        description: Country not found
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 404
            error:
              type: string
              example: "Country not found"
    """
    try:
        name = request.args.get('name', '')
        if not name:
            return jsonify({'code': 400, 'error': "Missing 'name' query parameter"}), 400
        country = Country.query.filter(Country.name.ilike(name.strip())).first()
        if not country:
            return jsonify({'code': 404, 'error': 'Country not found'}), 404
        return jsonify({'code': 200, 'data': country.as_dict()}), 200
    except Exception as e:
        return jsonify({'code': 500, 'error': str(e)}), 500


#======================== COUNTRY RELATIONS ==========================
@app.route('/countries/relation/current', methods=["GET"])
def current_relation():
    """
    Get current relationship between two countries
    ---
    tags:
      - Country Relations
    parameters:
      - name: a
        in: query
        type: string
        required: true
        description: First country code (e.g., US, SG)
        example: "US"
      - name: b
        in: query
        type: string
        required: true
        description: Second country code (e.g., US, SG)
        example: "SG"
    responses:
      200:
        description: Country relationship found
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 200
            data:
              type: object
              properties:
                a:
                  type: string
                  example: "US"
                b:
                  type: string
                  example: "SG"
                weight_a_to_b:
                  type: number
                  format: float
                  example: 1.25
                weight_b_to_a:
                  type: number
                  format: float
                  example: 0.85
      400:
        description: Invalid query parameters
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 400
            error:
              type: string
              example: "Query params 'a' and 'b' required and must differ"
      500:
        description: Internal server error
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 500
            error:
              type: string
              example: "Database error"
    """
    a = request.args.get("a", "")
    b = request.args.get("b", "")
    if not a or not b or a.strip().upper() == b.strip().upper():
        return jsonify({"code": 400, "error": "Query params 'a' and 'b' required and must differ"}), 400
    w = get_weights(a, b)
    return jsonify({
        "code": 200, 
        "data": {"pair": [min(a.upper(), b.upper()), max(a.upper(), b.upper())], 
        "weight": w}
    }), 200


with app.app_context():
    # Database schema and data are managed exclusively via Alembic migrations.
    print("ℹ️ Country service: using Alembic migrations for schema and data; do not create/seed DB from the app.")


if __name__ == '__main__':
  # Run on container port 5005
  app.run(host='0.0.0.0', port=5005, debug=True)
