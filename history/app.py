"""
History Service - Flask Application
Routes layer only - business logic moved to service layer
Follows Single Responsibility Principle
"""
from flask import Flask, jsonify, request, g
from flask_migrate import Migrate
from urllib.parse import quote_plus
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv
import os
import sys

# Ensure current directory is in path (works both locally and in Docker)
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
for path in [current_dir, parent_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

from shared.firebase_auth import initialize_firebase, require_jwt, verify_user_ownership

# Import our refactored modules
from models import db
from services.history_service import HistoryService

# Initialize Flask app
app = Flask(__name__)
CORS(app)
load_dotenv()

# Initialize Firebase Admin SDK for JWT verification
initialize_firebase()

# Database configuration
ENV = os.getenv('ENV', 'local')
user = os.getenv("DB_USER")
pwd = quote_plus(os.getenv("DB_PASSWORD", ""))
host = os.getenv("DB_HOST", "localhost")
port = os.getenv("DB_PORT", "5432")
dbname = os.getenv("DB_NAME", "default")

if ENV == 'aws':
    dbsslmode = os.getenv('DB_SSLMODE', 'require')
else:
    dbsslmode = 'disable'

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{dbname}?sslmode={dbsslmode}&connect_timeout=10"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
    'pool_size': 5,
    'max_overflow': 2,
    'connect_args': {
        'connect_timeout': 10,
        'sslmode': dbsslmode,
    }
}

# Initialize database and migrations
db.init_app(app)
migrate = Migrate(app, db, version_table="history_alembic_version")

# Initialize service (Dependency Injection)
history_service = HistoryService()


# ============= Health Check =============
@app.route("/health", methods=["GET"])
def healthcheck():
    """Health check endpoint for load balancer"""
    return jsonify({
        "status": "healthy",
        "service": "history",
        "timestamp": datetime.utcnow().isoformat()
    }), 200


# ============= API Routes =============
@app.route("/history/user/<string:user_id>", methods=["GET"])
@require_jwt
def get_user_history(user_id):
    """
    Get calculation history for a user
    Users can only access their own history
    """
    # Authorization check
    if not verify_user_ownership(user_id):
        return jsonify({
            "code": 403,
            "error": "Forbidden: You can only access your own history"
        }), 403
    
    # Get pagination params
    page = request.args.get("page", 1, type=int)
    size = request.args.get("size", 20, type=int)
    
    # Delegate to service layer
    try:
        result = history_service.get_user_history(user_id, page, size)
        return jsonify(result), result["code"]
    except Exception as e:
        return jsonify({
            "code": 500,
            "message": str(e)
        }), 500


@app.route("/history/<string:history_id>", methods=["GET"])
@require_jwt
def get_specific_user_history(history_id):
    """
    Get specific calculation history with details
    Users can only access their own records
    """
    # Get pagination params for tariff lines
    page = request.args.get("page", 1, type=int)
    size = request.args.get("size", 20, type=int)
    
    # Delegate to service layer
    try:
        result, status_code = history_service.get_history_detail(history_id, page, size)
        
        # If found, check ownership
        if status_code == 200:
            history_user_id = result["data"]["history"]["user_id"]
            if not verify_user_ownership(history_user_id):
                return jsonify({
                    "code": 403,
                    "error": "Forbidden: You can only access your own history"
                }), 403
        
        return jsonify(result), status_code
        
    except Exception as e:
        return jsonify({
            "code": 500,
            "message": str(e)
        }), 500


@app.route("/history/create", methods=["POST"])
@require_jwt
def save_calculation():
    """
    Save new calculation history
    Users can only create their own records
    """
    data = request.get_json()
    
    # Get authenticated user ID from JWT
    user_id = g.user_id
    
    # Delegate to service layer
    try:
        result, status_code = history_service.create_history(data, user_id)
        
        # For debugging: add request data to error responses
        if status_code >= 400 and data:
            result['debug_info'] = {
                'received_keys': list(data.keys()),
                'user_id': data.get('user_id'),
                'tariff_lines_count': len(data.get('tariff_lines', [])),
                'agreement_lines_count': len(data.get('agreement_lines', [])),
                'sample_data': {k: str(v)[:100] if isinstance(v, str) else type(v).__name__ for k, v in data.items() if k not in ['tariff_lines', 'agreement_lines']}
            }
        
        return jsonify(result), status_code
        
    except Exception as e:
        import traceback
        return jsonify({
            "code": 500,
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500


@app.route("/history/<string:history_id>", methods=["DELETE"])
@require_jwt
def delete_history(history_id):
    """
    Delete calculation history
    Users can only delete their own records
    """
    # Get authenticated user ID
    user_id = g.user_id
    
    try:
        # Get history to check ownership
        history, status_code = history_service.delete_history(history_id, user_id)
        
        if status_code != 200:
            return jsonify(history), status_code
        
        # Check ownership
        if not verify_user_ownership(history.user_id):
            return jsonify({
                "code": 403,
                "error": "Forbidden: You can only delete your own history"
            }), 403
        
        # Perform deletion
        result, status_code = history_service.perform_delete(history)
        return jsonify(result), status_code
        
    except Exception as e:
        return jsonify({
            "code": 500,
            "message": str(e)
        }), 500


# ============= Database Initialization =============
with app.app_context():
    try:
        if os.getenv("AUTO_CREATE_DB") == "1":
            db.create_all()
            print("✅ History service: Database tables created/verified (AUTO_CREATE_DB=1)")
        else:
            print("ℹ️ History service: Skipping db.create_all(); use Alembic migrations (set AUTO_CREATE_DB=1 to enable)")
    except Exception as e:
        print(f"⚠️ History service: Database table creation check failed: {e}")


# ============= Application Entry Point =============
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, debug=True)
