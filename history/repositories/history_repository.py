"""
History Repository - Data Access Layer
Implements Repository Pattern for database operations
Follows Dependency Inversion Principle
"""
from typing import List, Optional, Tuple
from models import db, History, HistoryTariffLine, HistoryAgreementLine


class HistoryRepository:
    """Repository for History entity - handles all database operations"""
    
    def __init__(self, db_session=None):
        """
        Initialize repository with database session
        Args:
            db_session: SQLAlchemy database session (defaults to global db.session)
        """
        self.session = db_session or db.session
    
    def find_by_id(self, history_id: str) -> Optional[History]:
        """
        Find history record by ID
        Args:
            history_id: UUID of history record
        Returns:
            History object or None if not found
        """
        return History.query.filter_by(history_id=history_id).first()
    
    def find_by_user_id(self, user_id: str, page: int = 1, size: int = 20) -> Tuple[List[History], dict]:
        """
        Find all history records for a user with pagination
        Args:
            user_id: User's Firebase UID
            page: Page number (1-indexed)
            size: Number of records per page
        Returns:
            Tuple of (list of History objects, pagination metadata)
        """
        query = History.query.filter_by(user_id=user_id).order_by(History.created_at.desc())
        paginated = query.paginate(page=page, per_page=size, error_out=False)
        
        pagination_meta = {
            "page": paginated.page,
            "size": paginated.per_page,
            "total": paginated.total,
            "total_pages": paginated.pages
        }
        
        return paginated.items, pagination_meta
    
    def save(self, history: History) -> History:
        """
        Save new history record
        Args:
            history: History object to save
        Returns:
            Saved History object with generated ID
        """
        self.session.add(history)
        self.session.flush()  # Get history_id before commit
        return history
    
    def delete(self, history: History) -> None:
        """
        Delete history record (cascades to tariff/agreement lines)
        Args:
            history: History object to delete
        """
        self.session.delete(history)
    
    def commit(self) -> None:
        """Commit current transaction"""
        self.session.commit()
    
    def rollback(self) -> None:
        """Rollback current transaction"""
        self.session.rollback()


class TariffLineRepository:
    """Repository for HistoryTariffLine entity"""
    
    def __init__(self, db_session=None):
        self.session = db_session or db.session
    
    def find_by_history_id(self, history_id: str, page: int = 1, size: int = 20) -> Tuple[List[HistoryTariffLine], dict]:
        """
        Find all tariff lines for a history record with pagination
        Args:
            history_id: UUID of history record
            page: Page number (1-indexed)
            size: Number of records per page
        Returns:
            Tuple of (list of TariffLine objects, pagination metadata)
        """
        query = HistoryTariffLine.query.filter_by(history_id=history_id).order_by(HistoryTariffLine.line_order)
        paginated = query.paginate(page=page, per_page=size, error_out=False)
        
        pagination_meta = {
            "page": paginated.page,
            "size": paginated.per_page,
            "total": paginated.total
        }
        
        return paginated.items, pagination_meta
    
    def find_all_by_history_id(self, history_id: str) -> List[HistoryTariffLine]:
        """Get all tariff lines without pagination (for exports)"""
        return HistoryTariffLine.query.filter_by(history_id=history_id).order_by(HistoryTariffLine.line_order).all()
    
    def save_batch(self, tariff_lines: List[HistoryTariffLine]) -> None:
        """
        Save multiple tariff lines in batch
        Args:
            tariff_lines: List of TariffLine objects
        """
        self.session.bulk_save_objects(tariff_lines)


class AgreementLineRepository:
    """Repository for HistoryAgreementLine entity"""
    
    def __init__(self, db_session=None):
        self.session = db_session or db.session
    
    def find_by_history_id(self, history_id: str) -> List[HistoryAgreementLine]:
        """
        Find all agreement lines for a history record
        Args:
            history_id: UUID of history record
        Returns:
            List of AgreementLine objects (usually small, no pagination)
        """
        return HistoryAgreementLine.query.filter_by(history_id=history_id).order_by(HistoryAgreementLine.line_order).all()
    
    def save_batch(self, agreement_lines: List[HistoryAgreementLine]) -> None:
        """
        Save multiple agreement lines in batch
        Args:
            agreement_lines: List of AgreementLine objects
        """
        self.session.bulk_save_objects(agreement_lines)
