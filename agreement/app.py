"""
Agreement Microservice - Refactored with Clean Architecture
Follows SOLID principles with clear separation of concerns
"""
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus
import datetime
import sys
from flask import Flask, jsonify, request
from flask_migrate import Migrate
from flask_cors import CORS

# Ensure current directory is in path (works both locally and in Docker)
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
for path in [current_dir, parent_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

from shared.firebase_auth import initialize_firebase, require_admin
from models import db
from services import AgreementService

load_dotenv()

# Initialize Firebase Admin SDK for JWT verification
initialize_firebase()

# ============================================================
# Database Config
# ============================================================
ENV = os.getenv('ENV', 'local')
DB_USER = os.getenv('DB_USER', 'pgsql')
DB_PASSWORD = quote_plus(os.getenv('DB_PASSWORD', ''))
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'default')

if ENV == 'aws':
    DB_SSLMODE = os.getenv('DB_SSLMODE', 'require')
else:
    DB_SSLMODE = 'disable'

COUNTRY_MS_URL = os.getenv('COUNTRY_MS_BASE', 'http://country:5005')

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode={DB_SSLMODE}&connect_timeout=10"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
    'pool_size': 5,
    'max_overflow': 2,
    'connect_args': {
        'connect_timeout': 10,
        'sslmode': DB_SSLMODE,
    }
}

db.init_app(app)
migrate = Migrate(app, db, version_table='agreement_alembic_version')

# Initialize service layer
agreement_service = AgreementService(COUNTRY_MS_URL)

# ============================================================
# Routes
# ============================================================

@app.route("/health", methods=["GET"])
def healthcheck():
    """Health check endpoint for load balancer"""
    return jsonify({
        "status": "healthy",
        "service": "agreement",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }), 200


@app.route('/agreements/create', methods=['POST'])
@require_admin(db)
def create_agreement():
    """
    Create an agreement - Admin only
    ---
    tags:
      - Agreements
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [importerName, exporterName, start_date, end_date, kind, value]
          properties:
            importerName:
              type: string
              example: Singapore
            exporterName:
              type: string
              example: United States
            start_date:
              type: string
              format: date
              example: "2025-01-01"
            end_date:
              type: string
              format: date
              example: "2025-12-31"
            kind:
              type: string
              enum: [override, surcharge, multiplier]
              example: override
            value:
              type: number
              format: float
              example: 0.0500
            note:
              type: string
              example: Promotional override during 2025.
    responses:
      201:
        description: Created
        schema:
          $ref: '#/definitions/Agreement'
      400:
        description: Bad Request
        schema:
          $ref: '#/definitions/Error'
      403:
        description: Forbidden - Admin access required
        schema:
          $ref: '#/definitions/Error'
    """
    data = request.get_json()
    result, error, status_code = agreement_service.create_agreement(data)
    
    if error:
        return jsonify({"error": error}), status_code
    return jsonify(result), status_code


@app.route('/agreements/all', methods=['GET'])
def list_agreements():
    """
    List agreements (optionally filtered)
    ---
    tags:
      - Agreements
    parameters:
      - in: query
        name: importer
        type: string
        required: false
        description: Importer name
        example: Singapore
      - in: query
        name: exporter
        type: string
        required: false
        description: Exporter name
        example: United States
      - in: query
        name: active_on
        type: string
        format: date
        required: false
        description: Return only agreements active on this date (YYYY-MM-DD)
        example: "2025-05-01"
    responses:
      200:
        description: OK
        schema:
          type: array
          items:
            $ref: '#/definitions/Agreement'
    """
    importer_name = request.args.get('importer')
    exporter_name = request.args.get('exporter')
    active_on = request.args.get('active_on')
    
    result, error, status_code = agreement_service.list_agreements(
        importer_name, exporter_name, active_on
    )
    
    if error:
        return jsonify({"error": error}), status_code
    return jsonify(result), status_code


@app.route('/agreements/active', methods=['GET'])
def get_active_agreements():
    """
    Get active agreements for a pair on a date
    ---
    tags:
      - Agreements
    parameters:
      - in: query
        name: importer
        type: string
        required: true
        description: Importer name
        example: Singapore
      - in: query
        name: exporter
        type: string
        required: true
        description: Exporter name
        example: United States
      - in: query
        name: on
        type: string
        format: date
        required: false
        description: Date to check (defaults to today)
        example: "2025-05-01"
    responses:
      200:
        description: OK
        schema:
          type: array
          items:
            $ref: '#/definitions/Agreement'
      400:
        description: Missing parameters
        schema:
          $ref: '#/definitions/Error'
    """
    importer_name = request.args.get('importer')
    exporter_name = request.args.get('exporter')
    on_date = request.args.get('on')
    
    result, error, status_code = agreement_service.get_active_agreements(
        importer_name, exporter_name, on_date
    )
    
    if error:
        return jsonify({"error": error}), status_code
    return jsonify(result), status_code


# ============================================================
# Swagger Documentation
# ============================================================
from flasgger import Swagger

swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec",
            "route": "/api/v1/apispec.json",
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
        "title": "Agreement Microservice API",
        "description": "A microservice providing agreement data between countries",
        "version": "1.0.0",
        "contact": {"name": "CS203 G1-T1", "email": "support@cs203.com"}
    },
    "basePath": "/",
    "schemes": ["http"],
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "definitions": {
        "Agreement": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "example": 1},
                "importerId": {"type": "string", "example": "SG"},
                "exporterId": {"type": "string", "example": "US"},
                "start_date": {"type": "string", "format": "date", "example": "2025-01-01"},
                "end_date": {"type": "string", "format": "date", "example": "2025-12-31"},
                "kind": {"type": "string", "enum": ["override", "surcharge", "multiplier"], "example": "override"},
                "value": {"type": "number", "format": "float", "example": 0.0500},
                "note": {"type": "string", "example": "Promotional override during 2025."}
            }
        },
        "Error": {
            "type": "object",
            "properties": {
                "error": {"type": "string", "example": "Missing required fields"}
            }
        }
    }
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

with app.app_context():
    try:
        if os.getenv("AUTO_CREATE_DB") == "1":
            db.create_all()
            print("✅ Agreement service: Database tables created/verified (AUTO_CREATE_DB=1)")
        else:
            print("ℹ️ Agreement service: Skipping db.create_all(); use Alembic migrations (set AUTO_CREATE_DB=1 to enable)")
    except Exception as e:
        print(f"⚠️ Agreement service: Database table creation check failed: {e}")

# ============================================================
# Run
# ============================================================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5006)), debug=True)
