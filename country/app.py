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

if ENV == 'aws':
    DB_SSLMODE = os.getenv('DB_SSLMODE', 'require')
else:
    DB_SSLMODE = 'disable'

app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode={DB_SSLMODE}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

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


def seed_country_rel(csv_path = None) -> int:
    default_csv = os.path.join(os.path.dirname(__file__), "country_relations_all.csv")
    if csv_path and os.path.exists(csv_path):
        path_to_use = csv_path
    elif os.path.exists(default_csv):
        path_to_use = default_csv
    else:
        raise FileNotFoundError("Relations CSV not found")

    seeded = 0
    with open(path_to_use, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            a = (r.get("country_a") or "").strip().upper()
            b = (r.get("country_b") or "").strip().upper()
            if not a or not b or a == b:
                continue

            # normalize pair order
            pair_a, pair_b = sorted([a, b]) #follow size alphabetically; smaller on left larger on right

            # clamp weight
            w = float(r.get("weight", 0.0))
            w = max(min(w, 1.0), -1.0) #weight falls within ranges of +ve 1 and -ve 1; anything outside will revert to default 1 or -1

            # parse date
            d = (r.get("effective_date") or "").strip() or "1970-01-01"
            try:
                dt = datetime.date.fromisoformat(d)
            except Exception:
                continue

            # upsert by (pair_a, pair_b, effective_date)
            existing = CountryRelation.query.filter_by(
                pair_a=pair_a, pair_b=pair_b, effective_date=dt
            ).first()
            if existing:
                if float(existing.weight) != w:
                    existing.weight = w
            else:
                db.session.add(CountryRelation(
                    pair_a=pair_a, pair_b=pair_b, weight=w, effective_date=dt
                ))
                seeded += 1

    db.session.commit()
    return seeded


@app.cli.command("seed") #seeding logic; seed with data from csv upon launch 
def seed_cmd():
    """Seed countries and relations from CSVs once."""
    with app.app_context():
        inserted_c = 0
        if Country.query.count() == 0:
            inserted_c = seed_countries()
            print(f"[seed] countries inserted: {inserted_c}")
        else:
            print("[seed] countries already present")

        inserted_r = 0
        count_r = CountryRelation.query.count()
        print(f"[seed] relations existing rows: {count_r}")
        if CountryRelation.query.count() == 0:
            # use the core seeder, not the HTTP endpoint
            inserted_r = seed_country_rel()
            print(f"[seed] relations inserted: {inserted_r}")
        else:
            print("[seed] relations already present")


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
@app.route('/countries', methods=['GET'])
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

#============================== SEEDING ENDPOINTS ==============================
# --------------- SEEDING NORMAL LIST OF COUNTRIES ---------------
@app.route('/countries/seed', methods=['POST'])
def seed_countries_endpoint():
    """
    Seed countries data from CSV file
    ---
    tags:
      - Data Management
    parameters:
      - name: body
        in: body
        required: false
        description: Optional CSV file path (uses default if not provided)
        schema:
          type: object
          properties:
            csv_path:
              type: string
              example: "countries_full.csv"
              description: Path to CSV file containing country data
    responses:
      200:
        description: Countries already exist, no new data added
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 200
            message:
              type: string
              example: "Countries already seeded"
            count:
              type: integer
              example: 0
      201:
        description: Countries successfully seeded
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 201
            message:
              type: string
              example: "Countries seeded successfully"
            count:
              type: integer
              example: 195
      500:
        description: Error during seeding process
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 500
            error:
              type: string
              example: "CSV file not found"
    """
    # Optional: accept CSV path in JSON body or use env var
    data = request.get_json(silent=True) or {}
    csv_path = data.get('csv_path') or os.getenv('COUNTRY_SEED_CSV')
    try:
        seeded = seed_countries(csv_path)
        status = 201 if seeded > 0 else 200
        return jsonify({'code': status, 'seeded': seeded}), status
    except Exception as e:
        return jsonify({'code': 500, 'error': str(e)}), 500

def seed_countries(csv_path=None):
    """Seed countries into the DB. If csv_path is None, use a small built-in list."""
    # Prefer a full CSV shipped with the project if available
    default_csv = os.path.join(os.path.dirname(__file__), 'countries_full.csv')
    rows = []
    if csv_path and os.path.exists(csv_path):
        path_to_use = csv_path
    elif os.path.exists(default_csv):
        path_to_use = default_csv
    else:
        path_to_use = None

    if path_to_use:
        with open(path_to_use, newline='', encoding='utf-8') as fh:
            reader = csv.DictReader(fh)
            for r in reader:
                rows.append({
                    'name': (r.get('name') or r.get('country') or r.get('Name') or '').strip(),
                    'code': (r.get('code') or r.get('iso2') or r.get('ISO2') or '').strip()
                })
    else:
        # Small fallback
        rows = [
            {'name': 'United States', 'code': 'US'},
            {'name': 'Singapore', 'code': 'SG'},
            {'name': 'China', 'code': 'CN'},
        ]

    seeded = 0
    for r in rows:
        if not r['name']:
            continue
        existing = Country.query.filter_by(name=r['name']).first()
        if existing:
            continue
        country = Country(name=r['name'], code=r.get('code'))
        db.session.add(country)
        seeded += 1
    db.session.commit()
    return seeded


# --------------- SEEDING COUNTRY RELATIONSHIPS (WEIGHTS BTWN COUNTRIES) ---------------
@app.route('/countries/relations/', methods=["POST"])
def seed_country_rel_endpoint():
    """
    Seed country relationships data from CSV file
    ---
    tags:
      - Data Management
    parameters:
      - name: body
        in: body
        required: false
        description: Optional CSV file path (uses default if not provided)
        schema:
          type: object
          properties:
            csv_path:
              type: string
              example: "country_relations_all.csv"
              description: Path to CSV file containing country relationships data
    responses:
      200:
        description: Country relationships successfully seeded
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 200
            message:
              type: string
              example: "sucessful seeding"
      500:
        description: Error during seeding process
        schema:
          type: object
          properties:
            code:
              type: integer
              example: 500
            error:
              type: string
              example: "CSV file not found or database error"
    """
    data = request.get_json(silent=True) or {}
    get_path = data.get("csv_path")
    try:
        n = seed_country_rel(get_path)
        return jsonify ({
            "code" : 200,
            "message" : "sucessful seeding"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify ({
            "code" : 500,
            "error" : str(e)
        }), 500


if __name__ == '__main__':
    # Try to auto-seed on startup if DB is empty
    # try:
    #     with app.app_context():
    #         if Country.query.count() == 0:
    #             print("[seed] countries ...")
    #             n = seed_countries()   # make this return count
    #             print(f"[seed] countries inserted: {n}")
    #         else:
    #             print("[seed] countries already present")

    #         # relations
    #         if CountryRelation.query.count() == 0:
    #             print("[seed] country_relations ...")
    #             m = seed_country_rel()  # use the core seeder
    #             print(f"[seed] relations inserted: {m}")
    #         else:
    #             print("[seed] relations already present")
    # except Exception as e:
    #     # DB might not be ready yet; ignore and continue
    #     # pass
    #     import traceback
    #     print("[auto-seed ERROR]", e)
    #     traceback.print_exc()

    # Run on container port 5005
    app.run(host='0.0.0.0', port=5005, debug=True)
