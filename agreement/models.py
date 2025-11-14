"""
Agreement Service Models
Extracted from monolithic app.py for better separation of concerns
"""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Agreement(db.Model):
    """
    Represents a trade agreement between two countries.
    Supports override, surcharge, and multiplier types.
    """
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
        """Convert model to dictionary for API responses"""
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
