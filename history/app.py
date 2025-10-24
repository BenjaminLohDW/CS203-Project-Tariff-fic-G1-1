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

ENV = os.getenv('ENV', 'local')
user = os.getenv("DB_USER")
pwd  = quote_plus(os.getenv("DB_PASSWORD", ""))  # URL-escape if needed
host = os.getenv("DB_HOST", "localhost")
port = os.getenv("DB_PORT", "5432")
dbname = os.getenv("DB_NAME", "default")

if ENV == 'aws':
    dbsslmode = os.getenv('DB_SSLMODE', 'require') #'disbale'
else:
    dbsslmode = 'disable'

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{dbname}?sslmode={dbsslmode}&connect_timeout=10"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,        # Verify connections before using
    'pool_recycle': 300,          # Recycle connections after 5 min
    'pool_size': 5,               # Small pool (proxy does pooling)
    'max_overflow': 2,
    'connect_args': {
        'connect_timeout': 10,
        'sslmode': dbsslmode,    # ✅ Pass sslmode to psycopg2
    }
}

db = SQLAlchemy(app)
migrate = Migrate(app, db, version_table="history_alembic_version")


#----Models----
class History(db.Model):
    __tablename__ = "history"

    history_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), nullable=False, index=True)
    product_type = db.Column(db.String(50), nullable = False)
    total_qty = db.Column(db.String(36), nullable = False)
    base_cost = db.Column(db.String(36), nullable = False)
    final_cost = db.Column(db.String(36), nullable = False )
    import_country = db.Column(db.String(50), nullable=False)
    export_country = db.Column(db.String(50), nullable=False)
    last_retrieved = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    __table_args__ = (
        db.Index("ix_history_user_created", "user_id", "created_at"),
    )

    def json(self):
        return {
            "history_id": self.history_id,
            "user_id": self.user_id,
            "product_type": self.product_type,
            "total_qty": self.total_qty,
            "base_cost": self.base_cost,
            "final_cost": self.final_cost,
            "import_country": self.import_country,
            "export_country": self.export_country,
            "last_retrieved": self.last_retrieved.isoformat() if self.last_retrieved else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class HistoryTariffLine(db.Model):
    __tablename__ = "history_tariff_line"

    line_id     = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    history_id  = db.Column(db.String(36), db.ForeignKey("history.history_id", ondelete="CASCADE"), nullable=False, index=True)
    line_order  = db.Column(db.Integer, nullable=False)               # 0,1,2,...
    tariff_desc = db.Column(db.String(255), nullable=False)           # "US Import Duty on Electronics"
    tariff_type = db.Column(db.String(32),  nullable=False)           # "ad valorem" | "specific"
    rate_str    = db.Column(db.String(64),  nullable=False)           # "15.5%" or "$2.50/unit"
    amount_str  = db.Column(db.String(32),  nullable=False)           # "$62.00"

    __table_args__ = (
        db.Index("ix_line_history_order", "history_id", "line_order"),
    )
    
    def json(self):
        return {
            "line_id": self.line_id,
            "history_id": self.history_id,
            "line_order": self.line_order,
            "tariff_desc": self.tariff_desc,
            "tariff_type": self.tariff_type,
            "rate_str": self.rate_str,
            "amount_str": self.amount_str
        }


class HistoryAgreementLine(db.Model):
    __tablename__ = "history_agreement_line"

    line_id      = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    history_id   = db.Column(db.String(36), db.ForeignKey("history.history_id", ondelete="CASCADE"), nullable=False, index=True)
    line_order   = db.Column(db.Integer, nullable=False)               # 0,1,2,...
    kind         = db.Column(db.String(32), nullable=False)            # "override" | "surcharge" | "multiplier"
    value_str    = db.Column(db.String(64), nullable=False)            # "5.00%" or "×1.5"
    start_date   = db.Column(db.String(32), nullable=False)            # "2025-01-01"
    end_date     = db.Column(db.String(32), nullable=True)             # "2025-12-31"
    note         = db.Column(db.String(512), nullable=True)            # "Promotional override during 2025"

    __table_args__ = (
        db.Index("ix_agreement_history_order", "history_id", "line_order"),
    )
    
    def json(self):
        return {
            "line_id": self.line_id,
            "history_id": self.history_id,
            "line_order": self.line_order,
            "kind": self.kind,
            "value_str": self.value_str,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "note": self.note
        }

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
        "timestamp": datetime.utcnow().isoformat()
    }), 200

#--------------- api routes ---------------
@app.route("/user/<string:user_id>/history", methods=["GET"])
def get_user_history(user_id):
    try:
        #pagination of rows; max return 100 rows per page, default 20
        page = max(int(request.args.get("page", 1)), 1)
        size = min(max(int(request.args.get("size", 20)), 1), 100)
        q = History.query.filter_by(user_id=user_id).order_by(History.created_at.desc())
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
                "error": "No history exist for user"
            }), 404
    except Exception as e:
        return jsonify({
            "code": 500,
            "messsage": str(e)
        }), 500
    

@app.route("/history/<string:history_id>", methods=["GET"])
def get_specific_user_history(history_id):
    try:
        # Get the history record first
        history = History.query.filter_by(history_id=history_id).first()
        if not history:
            return jsonify({
                "code": 404,
                "message": "History record not found"
            }), 404

        # Get tariff lines (with pagination)
        page = max(int(request.args.get("page", 1)), 1)
        size = min(max(int(request.args.get("size", 20)), 1), 100)
        tariff_query = HistoryTariffLine.query.filter_by(history_id=history_id)
        tariff_items = tariff_query.paginate(page=page, per_page=size, error_out=False)

        # Get all agreement lines (usually small, no pagination needed)
        agreement_lines = HistoryAgreementLine.query.filter_by(history_id=history_id).order_by(HistoryAgreementLine.line_order).all()

        return jsonify({
            "code": 200,
            "page": tariff_items.page,
            "size": tariff_items.per_page,
            "total": tariff_items.total,
            "data": {
                "history": history.json(),
                "tariff_lines": [line.json() for line in tariff_items.items],
                "agreement_lines": [line.json() for line in agreement_lines]
            }
        }), 200
    
    except Exception as e:
        return jsonify({
            "code": 500,
            "message": str(e)
        }), 500
    

@app.route("/history/create", methods=["POST"])
def save_calculation():
    try:
        data = request.get_json()
        required = ["user_id", "product_type", "total_qty", "base_cost", "final_cost", "import_country", "export_country", "tariff_lines"]
        if not all(x in data for x in required):
            return jsonify({
                "code": 400,
                "message": "mising required fields"
            })

        history = History(
            user_id        = data["user_id"],
            product_type   = data["product_type"],
            total_qty      = str(data["total_qty"]),
            base_cost      = str(data["base_cost"]),
            final_cost     = str(data["final_cost"]),
            import_country = data["import_country"],
            export_country = data["export_country"],
        )
        db.session.add(history)
        db.session.flush()  # to get history.history_id before commit

        # Save tariff lines
        for idx, line in enumerate(data["tariff_lines"]):
            # expected keys per line: description, type, rate, amount
            tariff_line = HistoryTariffLine(
                history_id  = history.history_id,
                line_order  = idx,
                tariff_desc = line["description"],
                tariff_type = line["type"],
                rate_str    = str(line["rate"]),
                amount_str  = str(line["amount"])
            )
            db.session.add(tariff_line)

        # Save agreement lines (optional field)
        if "agreement_lines" in data and data["agreement_lines"]:
            for idx, agreement in enumerate(data["agreement_lines"]):
                # expected keys per agreement: kind, value_str, start_date, end_date (optional), note (optional)
                agreement_line = HistoryAgreementLine(
                    history_id  = history.history_id,
                    line_order  = idx,
                    kind        = agreement["kind"],
                    value_str   = str(agreement["value_str"]),
                    start_date  = agreement["start_date"],
                    end_date    = agreement.get("end_date"),
                    note        = agreement.get("note")
                )
                db.session.add(agreement_line)

        db.session.commit()

        return jsonify({
            "code": 201,
            "data": {
                "history": history.json(),
                "tariff_lines": [line.json() for line in history_tariff_lines(history.history_id)],
                "agreement_lines": [line.json() for line in history_agreement_lines(history.history_id)]
            },
            "message": "calculation history successfully saved"
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"code": 409, "message": "Database integrity error", "details": str(e)}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "message": str(e)}), 500

def history_tariff_lines(history_id):
    return HistoryTariffLine.query.filter_by(history_id=history_id).order_by(HistoryTariffLine.line_order).all()

def history_agreement_lines(history_id):
    return HistoryAgreementLine.query.filter_by(history_id=history_id).order_by(HistoryAgreementLine.line_order).all()


@app.route("/history/<string:history_id>", methods=["DELETE"])
def delete_history(history_id):
    try:
        history = History.query.filter_by(history_id=history_id).first()

        if not history:
            return jsonify({
                "code": 404,
                "message": "History record not found"
            }), 404

        db.session.delete(history)
        db.session.commit()

        # 204 is conventional for delete, but returning 200 with message is also fine
        return jsonify({
            "code": 200,
            "message": f"History {history_id} deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "code": 500,
            "message": str(e)
        }), 500
    
with app.app_context():
    try:
        if os.getenv("AUTO_CREATE_DB") == "1":
            db.create_all()
            print("✅ History service: Database tables created/verified (AUTO_CREATE_DB=1)")
        else:
            print("ℹ️ History service: Skipping db.create_all(); use Alembic migrations (set AUTO_CREATE_DB=1 to enable)")
    except Exception as e:
        print(f"⚠️ History service: Database table creation check failed: {e}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, debug=True)