"""
History Service - Database Models
Separated from app.py for Single Responsibility Principle
"""
from flask_sqlalchemy import SQLAlchemy
from uuid import uuid4

db = SQLAlchemy()


class History(db.Model):
    """Main calculation history record"""
    __tablename__ = "history"

    history_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(36), nullable=False, index=True)
    product_type = db.Column(db.String(50), nullable=False)
    total_qty = db.Column(db.String(36), nullable=False)
    base_cost = db.Column(db.String(36), nullable=False)
    final_cost = db.Column(db.String(36), nullable=False)
    import_country = db.Column(db.String(50), nullable=False)
    export_country = db.Column(db.String(50), nullable=False)
    last_retrieved = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    __table_args__ = (
        db.Index("ix_history_user_created", "user_id", "created_at"),
    )

    def to_dict(self):
        """Convert model to dictionary for JSON serialization"""
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
    """Tariff line items associated with a history record"""
    __tablename__ = "history_tariff_line"

    line_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    history_id = db.Column(db.String(36), db.ForeignKey("history.history_id", ondelete="CASCADE"), 
                          nullable=False, index=True)
    line_order = db.Column(db.Integer, nullable=False)
    tariff_desc = db.Column(db.String(255), nullable=False)
    tariff_type = db.Column(db.String(32), nullable=False)
    rate_str = db.Column(db.String(64), nullable=False)
    amount_str = db.Column(db.String(32), nullable=False)

    __table_args__ = (
        db.Index("ix_line_history_order", "history_id", "line_order"),
    )

    def to_dict(self):
        """Convert model to dictionary for JSON serialization"""
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
    """Agreement line items associated with a history record"""
    __tablename__ = "history_agreement_line"

    line_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid4()))
    history_id = db.Column(db.String(36), db.ForeignKey("history.history_id", ondelete="CASCADE"), 
                          nullable=False, index=True)
    line_order = db.Column(db.Integer, nullable=False)
    kind = db.Column(db.String(32), nullable=False)
    value_str = db.Column(db.String(64), nullable=False)
    start_date = db.Column(db.String(32), nullable=False)
    end_date = db.Column(db.String(32), nullable=True)
    note = db.Column(db.String(512), nullable=True)

    __table_args__ = (
        db.Index("ix_agreement_history_order", "history_id", "line_order"),
    )

    def to_dict(self):
        """Convert model to dictionary for JSON serialization"""
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
