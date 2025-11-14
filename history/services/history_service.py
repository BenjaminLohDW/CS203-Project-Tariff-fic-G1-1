"""
History Service - Business Logic Layer
Contains all business logic separated from routing and data access
Follows Single Responsibility Principle
"""
from typing import Dict, List, Tuple
from sqlalchemy.exc import IntegrityError

from models import History, HistoryTariffLine, HistoryAgreementLine
from repositories.history_repository import HistoryRepository, TariffLineRepository, AgreementLineRepository
from validators.history_validator import HistoryValidator


class HistoryService:
    """
    Business logic for calculation history operations
    Coordinates between validators and repositories
    """
    
    def __init__(self, 
                 history_repo: HistoryRepository = None,
                 tariff_repo: TariffLineRepository = None,
                 agreement_repo: AgreementLineRepository = None,
                 validator: HistoryValidator = None):
        """
        Initialize service with dependencies
        Args:
            history_repo: History repository instance
            tariff_repo: Tariff line repository instance
            agreement_repo: Agreement line repository instance
            validator: Validator instance
        """
        self.history_repo = history_repo or HistoryRepository()
        self.tariff_repo = tariff_repo or TariffLineRepository()
        self.agreement_repo = agreement_repo or AgreementLineRepository()
        self.validator = validator or HistoryValidator()
    
    def get_user_history(self, user_id: str, page: int = 1, size: int = 20) -> Dict:
        """
        Get paginated calculation history for a user
        Args:
            user_id: User's Firebase UID
            page: Page number (1-indexed)
            size: Items per page (max 100)
        Returns:
            Dict with history data and pagination metadata
        """
        # Validate and normalize pagination params
        page, size = self.validator.validate_pagination_params(page, size)
        
        # Fetch from repository
        histories, pagination = self.history_repo.find_by_user_id(user_id, page, size)
        
        return {
            "code": 200,
            "page": pagination["page"],
            "size": pagination["size"],
            "total": pagination["total"],
            "data": [h.to_dict() for h in histories]
        }
    
    def get_history_detail(self, history_id: str, page: int = 1, size: int = 20) -> Tuple[Dict, int]:
        """
        Get detailed history with tariff and agreement lines
        Args:
            history_id: UUID of history record
            page: Page number for tariff lines
            size: Items per page for tariff lines
        Returns:
            Tuple of (response_dict, http_status_code)
        """
        # Find history record
        history = self.history_repo.find_by_id(history_id)
        if not history:
            return {
                "code": 404,
                "message": "History record not found"
            }, 404
        
        # Validate pagination params
        page, size = self.validator.validate_pagination_params(page, size)
        
        # Get tariff lines (paginated)
        tariff_lines, tariff_pagination = self.tariff_repo.find_by_history_id(history_id, page, size)
        
        # Get agreement lines (no pagination, usually small)
        agreement_lines = self.agreement_repo.find_by_history_id(history_id)
        
        return {
            "code": 200,
            "page": tariff_pagination["page"],
            "size": tariff_pagination["size"],
            "total": tariff_pagination["total"],
            "data": {
                "history": history.to_dict(),
                "tariff_lines": [line.to_dict() for line in tariff_lines],
                "agreement_lines": [line.to_dict() for line in agreement_lines]
            }
        }, 200
    
    def create_history(self, data: Dict, user_id: str) -> Tuple[Dict, int]:
        """
        Create new calculation history record
        Args:
            data: Request data with history and line items
            user_id: User ID from JWT (for ownership verification)
        Returns:
            Tuple of (response_dict, http_status_code)
        """
        # Validate request data
        validation_error = self.validator.validate_create_request(data)
        if validation_error:
            import sys
            sys.stdout.flush()
            sys.stderr.write(f"[VALIDATION ERROR] {validation_error}\n")
            sys.stderr.write(f"[REQUEST DATA] {str(data)[:500]}\n")
            sys.stderr.flush()
            return {
                "code": 400,
                "error": validation_error,
                "message": validation_error
            }, 400
        
        # Verify user owns the data (security check)
        if data["user_id"] != user_id:
            return {
                "code": 403,
                "error": "Forbidden: You can only create history for yourself"
            }, 403
        
        try:
            # Create history record
            history = History(
                user_id=data["user_id"],
                product_type=data["product_type"],
                total_qty=str(data["total_qty"]),
                base_cost=str(data["base_cost"]),
                final_cost=str(data["final_cost"]),
                import_country=data["import_country"],
                export_country=data["export_country"]
            )
            
            # Save history (gets history_id)
            saved_history = self.history_repo.save(history)
            
            # Create tariff lines
            tariff_lines = []
            for idx, line_data in enumerate(data["tariff_lines"]):
                tariff_line = HistoryTariffLine(
                    history_id=saved_history.history_id,
                    line_order=idx,
                    tariff_desc=line_data["description"],
                    tariff_type=line_data["type"],
                    rate_str=str(line_data["rate"]),
                    amount_str=str(line_data["amount"])
                )
                tariff_lines.append(tariff_line)
            
            self.tariff_repo.save_batch(tariff_lines)
            
            # Create agreement lines (if present)
            if "agreement_lines" in data and data["agreement_lines"]:
                agreement_lines = []
                for idx, line_data in enumerate(data["agreement_lines"]):
                    agreement_line = HistoryAgreementLine(
                        history_id=saved_history.history_id,
                        line_order=idx,
                        kind=line_data["kind"],
                        value_str=str(line_data["value_str"]),
                        start_date=line_data["start_date"],
                        end_date=line_data.get("end_date"),
                        note=line_data.get("note")
                    )
                    agreement_lines.append(agreement_line)
                
                self.agreement_repo.save_batch(agreement_lines)
            
            # Commit transaction
            self.history_repo.commit()
            
            # Fetch complete data for response
            tariff_lines_all = self.tariff_repo.find_all_by_history_id(saved_history.history_id)
            agreement_lines_all = self.agreement_repo.find_by_history_id(saved_history.history_id)
            
            return {
                "code": 201,
                "data": {
                    "history": saved_history.to_dict(),
                    "tariff_lines": [line.to_dict() for line in tariff_lines_all],
                    "agreement_lines": [line.to_dict() for line in agreement_lines_all]
                },
                "message": "Calculation history successfully saved"
            }, 201
            
        except IntegrityError as e:
            self.history_repo.rollback()
            return {
                "code": 409,
                "message": "Database integrity error",
                "details": str(e)
            }, 409
        except Exception as e:
            self.history_repo.rollback()
            return {
                "code": 500,
                "message": str(e)
            }, 500
    
    def delete_history(self, history_id: str, user_id: str) -> Tuple[Dict, int]:
        """
        Delete calculation history record
        Args:
            history_id: UUID of history to delete
            user_id: User ID from JWT (for ownership verification)
        Returns:
            Tuple of (response_dict, http_status_code)
        """
        # Find history record
        history = self.history_repo.find_by_id(history_id)
        if not history:
            return {
                "code": 404,
                "message": "History record not found"
            }, 404
        
        # Verify ownership (returned separately for route-level check)
        # This is a helper method to get the owner
        return history, 200
    
    def perform_delete(self, history: History) -> Tuple[Dict, int]:
        """
        Perform actual deletion after ownership check
        Args:
            history: History object to delete
        Returns:
            Tuple of (response_dict, http_status_code)
        """
        try:
            self.history_repo.delete(history)
            self.history_repo.commit()
            
            return {
                "code": 200,
                "message": f"History {history.history_id} deleted successfully"
            }, 200
            
        except Exception as e:
            self.history_repo.rollback()
            return {
                "code": 500,
                "message": str(e)
            }, 500
