from flask import Flask, jsonify, request, g
from flask_cors import CORS
from urllib.parse import quote_plus
from dotenv import load_dotenv
from datetime import datetime
import os
import sys

# Add parent directory to path for shared module import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from shared.firebase_auth import initialize_firebase, require_jwt, require_admin, verify_user_ownership

# Import refactored components
from models import db, User
from services.user_service import UserService
from flask_migrate import Migrate

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

# Initialize database with app
db.init_app(app)
migrate = Migrate(app, db, version_table="user_alembic_version")

# Initialize service
user_service = UserService()


# ---- Healthcheck API for ALB ----
@app.route("/health", methods=["GET"])
def healthcheck():
    """Health check endpoint for load balancer."""
    return jsonify({
        "status": "healthy",
        "service": "user",
        "timestamp": datetime.utcnow().isoformat()
    }), 200


# ---- API Routes ----
@app.route("/user/all", methods=["GET"])
def get_all_users():
    """
    Get all users with pagination.
    Public endpoint for demo purposes.
    """
    page = int(request.args.get("page", 1))
    size = int(request.args.get("size", 20))
    
    result, status = user_service.get_all_users(page, size)
    return jsonify(result), status


@app.route("/user/<string:user_id>", methods=["GET"])
@require_jwt
def get_user(user_id):
    """
    Get user profile.
    Users can only access their own profile unless they are admin.
    """
    # Verify user can only access their own data (unless admin)
    if not verify_user_ownership(user_id):
        # Check if current user is admin
        current_user_result, status = user_service.get_user(g.user_id)
        if status != 200 or current_user_result.get("data", {}).get("role") != 'admin':
            return jsonify({
                "code": 403,
                "error": "Forbidden: You can only access your own profile"
            }), 403
    
    result, status = user_service.get_user(user_id)
    return jsonify(result), status


@app.route("/user/create", methods=["POST"])
def create_user():
    """
    Create new user.
    Public endpoint for user registration.
    """
    data = request.get_json()
    result, status = user_service.create_user(data)
    return jsonify(result), status


@app.route("/user/<string:user_id>", methods=["PATCH"])
@require_jwt
def update_user(user_id):
    """
    Update user profile.
    Users can only update their own profile unless they are admin.
    """
    # Verify user can only update their own data (unless admin)
    if not verify_user_ownership(user_id):
        # Check if current user is admin
        current_user_result, status = user_service.get_user(g.user_id)
        if status != 200 or current_user_result.get("data", {}).get("role") != 'admin':
            return jsonify({
                "code": 403,
                "error": "Forbidden: You can only update your own profile"
            }), 403
    
    data = request.get_json()
    result, status = user_service.update_user(user_id, data)
    return jsonify(result), status


@app.route("/user/<string:user_id>", methods=["DELETE"])
@require_admin(db)
def delete_user(user_id):
    """
    Delete a user.
    Admin-only operation.
    """
    result, status = user_service.delete_user(user_id)
    return jsonify(result), status


@app.route("/user/<string:user_id>/promote-admin", methods=["POST"])
def promote_to_admin(user_id):
    """
    Promote a user to admin role.
    PUBLIC endpoint - no authentication required (for demo purposes).
    Security: Requires knowledge of user's Firebase UID.
    """
    result, status = user_service.promote_to_admin(user_id)
    return jsonify(result), status


# ---- Database Initialization ----
with app.app_context():
    try:
        if os.getenv("AUTO_CREATE_DB") == "1":
            db.create_all()
            print("✅ Database tables created/verified (AUTO_CREATE_DB=1)")
        else:
            print("ℹ️ Skipping db.create_all(); use Alembic migrations (set AUTO_CREATE_DB=1 to enable)")
    except Exception as e:
        print(f"⚠️ Database table creation check failed: {e}")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
