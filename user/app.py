from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from urllib.parse import quote_plus
from flask_cors import CORS
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB
from uuid import uuid4
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError
import os

app = Flask(__name__)
CORS(app)
load_dotenv()

user = os.getenv("DB_USER")
pwd  = quote_plus(os.getenv("DB_PASSWORD", ""))  # URL-escape if needed
host = os.getenv("DB_HOST", "localhost")
port = os.getenv("DB_PORT", "5440")
dbname = os.getenv("DB_NAME", "default")
app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{dbname}"
)

db = SQLAlchemy(app)
migrate = Migrate(app, db, version_table="user_alembic_version")


#----Models----
class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    name = db.Column(db.String(100), nullable=False, index=True)
    email =  db.Column(db.String(200), nullable=False, unique=True, index=True)
    role = db.Column(db.String(32), default="user")
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    __table_args__ = (
        db.Index("ix_users_created_at", "created_at"),
    )
    
    def json(self):
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    

#----api routes----
@app.route("/api/users", methods=["GET"])
def get_all_users():
    try:
        #pagination of rows; max return 100 rows per page, default 20
        page = max(int(request.args.get("page", 1)), 1)
        size = min(max(int(request.args.get("size", 20)), 1), 100)
        q = User.query.order_by(User.created_at.desc())
        items = q.paginate(page=page, per_page=size, error_out=False)
        
        if items.total != 0:
            return jsonify({
                "code": 200,
                "page": items.page,
                "size": items.per_page,
                "total": items.total,
                "data": [user.json() for user in items.items]
            }), 200
        else:
            return jsonify({
                "code": 404,
                "error": "No user found"
            }), 404
    except Exception as e:
        return jsonify({
            "code": 500,
            "messsage": str(e)
        }), 500
    

@app.route("/api/user/<string:user_id>", methods=["GET"])
def get_user(user_id):
    try:
        user = User.query.filter_by(user_id=user_id).first()

        if user:
            return jsonify({
                "code": 200,
                "data": user.json()
            }), 200
        else:
            return jsonify({
                "code": 404,
                "error": "User not found"
            }), 404
    except Exception as e:
        return jsonify({
            "code": 500,
            "message": str(e)
        }), 500
    

@app.route("/api/user/create", methods=["POST"])
def create_user():
    data = request.get_json()
    required = ['name', 'email']
    if not all(x in data for x in required):
        return jsonify({
            "code": 400,
            "message": "missing required fields"
        })
    
    user = User(
        user_id = data.get('user_id'),  # Accept Firebase user_id if provided
        name = data['name'].strip().lower(),
        email = data['email'].strip().lower()
    )

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(
            {"code": 409, "error": "Email already exists"}
        ), 409 

    return jsonify({
        "code": 200,
        "data": user.json(),
        "message": "user successfully created"
    }), 200


@app.route("/api/users/<string:user_id>", methods=["PATCH"])
def update_user(user_id):
    try:
        user = User.query.filter_by(user_id=user_id).first()
        if not user:
            return jsonify({
                "error": "User not found"
            }), 404
        
        data = request.get_json()
        for field in ("name", "email", "role"):
            if field in data and field:
                setattr(user, field, data[field].strip().lower())
            else:
                return jsonify({
                    "code": 400,
                    "message": f"{field} cannot be empty"
                }), 400

        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return jsonify({"code": 409, "error": "Email already exists"}), 409

        return jsonify({
            "code": 200,
            "data": user.json(),
            "message": "user successfully updated"
        }), 200
    
    except Exception as e:
        return jsonify({
            "code": 500,
            "message": str(e)
        }), 500
    

@app.route("/api/users/<string:user_id>", methods=["DELETE"])
def delete_user(user_id):
    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({
            "error": "User not found"
        }), 404
    db.session.delete(user)
    
    try:
        db.session.commit()
    except IntegrityError as e:
        db.session.rollback()
        # Typically triggered if there are referencing rows and no ON DELETE CASCADE
        return jsonify({"code": 409, "error": "Cannot delete user due to related records"}), 409
    
    return jsonify({
        "code" : 204,
        "message": "deleted"
    }), 204

    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)