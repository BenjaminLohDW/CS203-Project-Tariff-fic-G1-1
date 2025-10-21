import os
from dotenv import load_dotenv
from urllib.parse import quote_plus
from datetime import date
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
import requests
import datetime

load_dotenv()

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
    DB_SSLMODE = os.getenv('DB_SSLMODE', 'require') #'disbale'
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
migrate = Migrate(app, db, version_table='agreement_alembic_version')

# Helper to fetch country ISO from country microservice
def resolve_country_code(name):
    """
    Query the Country microservice to get ISO2 code by name.
    Returns ISO2 code string, or None if not found.
    """
    try:
        resp = requests.get(f"{COUNTRY_MS_URL}/countries/by-name?name={name}")
        if resp.status_code == 200:
            data = resp.json()
            # expected: {'data': {'code': 'SG', 'name': 'Singapore'}}
            return data.get("data", {}).get("code")
    except Exception as e:
        print(f"[WARN] Country lookup failed for {name}: {e}")
    return None

# ============================================================
# Models
# ============================================================
class Agreement(db.Model):
    __tablename__ = 'agreements'

    id = db.Column(db.Integer, primary_key=True)
    importerId = db.Column(db.String(2), nullable=False, index=True)  # e.g. 'US'
    exporterId = db.Column(db.String(2), nullable=False, index=True)  # e.g. 'CN'
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    kind = db.Column(db.String(16), nullable=False)   # 'override' | 'surcharge' | 'multiplier'
    value = db.Column(db.Numeric(10, 4), nullable=False)
    note = db.Column(db.String, nullable=True)

    __table_args__ = (
        db.Index('ix_pair_window', 'importerId', 'exporterId', 'start_date', 'end_date'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "importerId": self.importerId,
            "exporterId": self.exporterId,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "kind": self.kind,
            "value": float(self.value),
            "note": self.note,
        }

# ============================================================
# Routes
# ============================================================

# ---- Healthcheck api for ALB ----
# @app.route("/health", methods=["GET"])
# def healthcheck():
#     #healthcheck for ALB target group
#     try:
#         # Quick DB connection check
#         db.session.execute(db.text("SELECT 1"))
#         return jsonify({
#             "status": "healthy",
#             "service": "history",
#             "timestamp": datetime.utcnow().isoformat()
#         }), 200
#     except Exception as e:
#         return jsonify({
#             "status": "unhealthy",
#             "service": "history",
#             "error": str(e)
#         }), 503
    
#updated health checks for faster deployment
@app.route("/health", methods=["GET"])
def healthcheck():
    return jsonify({
        "status": "healthy",
        "service": "user",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }), 200
    

@app.route('/agreements/create', methods=['POST'])
def create_agreement():
    """
    Create an agreement
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
    """
    data = request.get_json()
    required_fields = ['importerName', 'exporterName', 'start_date', 'end_date', 'kind', 'value']
    if not data or not all(f in data for f in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    importer_code = resolve_country_code(data['importerName'])
    exporter_code = resolve_country_code(data['exporterName'])

    if not importer_code or not exporter_code:
        return jsonify({"error": "Failed to resolve country name(s)"}), 400

    if data['kind'] not in ('override', 'surcharge', 'multiplier'):
        return jsonify({"error": "Invalid kind"}), 400

    ag = Agreement(
        importerId=importer_code,
        exporterId=exporter_code,
        start_date=date.fromisoformat(data['start_date']),
        end_date=date.fromisoformat(data['end_date']),
        kind=data['kind'],
        value=data['value'],
        note=data.get('note'),
    )
    db.session.add(ag)
    db.session.commit()
    return jsonify(ag.to_dict()), 201


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
    
    importer = resolve_country_code(importer_name) if importer_name else None
    exporter = resolve_country_code(exporter_name) if exporter_name else None

    query = Agreement.query
    if importer:
        query = query.filter_by(importerId=importer.upper())
    if exporter:
        query = query.filter_by(exporterId=exporter.upper())
    if active_on:
        d = date.fromisoformat(active_on)
        query = query.filter(Agreement.start_date <= d, Agreement.end_date >= d)

    results = query.order_by(Agreement.start_date.desc()).all()
    return jsonify([a.to_dict() for a in results])


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
    on = request.args.get('on', date.today().isoformat())
    
    if not importer_name or not exporter_name:
        return jsonify({"error": "importer and exporter are required"}), 400
    
    importer = resolve_country_code(importer_name) if importer_name else None
    exporter = resolve_country_code(exporter_name) if exporter_name else None

    if not importer or not exporter:
        return jsonify({"error": "Failed to resolve country name(s)"}), 400

    d = date.fromisoformat(on)
    rows = Agreement.query.filter_by(
        importerId=importer,
        exporterId=exporter
    ).filter(
        Agreement.start_date <= d,
        Agreement.end_date >= d
    ).order_by(Agreement.start_date.desc()).all()

    return jsonify([r.to_dict() for r in rows])


# ============================================================
# Swagger (move this AFTER routes so docs are visible)
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
        "contact": { "name": "CS203 G1-T1", "email": "support@cs203.com" }
    },
    # tip: omit "host" for portability behind proxies/load balancers
    "basePath": "/",
    "schemes": ["http"],
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "definitions": {
        "Agreement": {
            "type": "object",
            "properties": {
                "id":         {"type": "integer", "example": 1},
                "importerId": {"type": "string",  "example": "SG"},
                "exporterId": {"type": "string",  "example": "US"},
                "start_date": {"type": "string",  "format": "date", "example": "2025-01-01"},
                "end_date":   {"type": "string",  "format": "date", "example": "2025-12-31"},
                "kind":       {"type": "string",  "enum": ["override","surcharge","multiplier"], "example": "override"},
                "value":      {"type": "number",  "format": "float", "example": 0.0500},
                "note":       {"type": "string",  "example": "Promotional override during 2025."}
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
        db.create_all()
        print("✅ User service: Database tables created/verified")
    except Exception as e:
        print(f"⚠️ User service: Database table creation failed: {e}")

# ============================================================
# Run
# ============================================================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5006)), debug=True)
