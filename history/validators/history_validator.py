"""
History Validators - Input validation logic
Separated for Single Responsibility Principle
"""
from typing import Dict, List, Optional


class HistoryValidator:
    """Validates history creation and update requests"""
    
    # Required fields for creating history
    REQUIRED_FIELDS = [
        "user_id", 
        "product_type", 
        "total_qty", 
        "base_cost", 
        "final_cost", 
        "import_country", 
        "export_country", 
        "tariff_lines"
    ]
    
    # Required fields for tariff line
    TARIFF_LINE_REQUIRED_FIELDS = [
        "description",
        "type",
        "rate",
        "amount"
    ]
    
    # Required fields for agreement line
    AGREEMENT_LINE_REQUIRED_FIELDS = [
        "kind",
        "value_str",
        "start_date"
    ]
    
    @staticmethod
    def validate_create_request(data: Dict) -> Optional[str]:
        """
        Validate history creation request
        Args:
            data: Request data dictionary
        Returns:
            Error message if validation fails, None if valid
        """
        # Check for missing required fields
        missing_fields = [field for field in HistoryValidator.REQUIRED_FIELDS if field not in data]
        if missing_fields:
            return f"Missing required fields: {', '.join(missing_fields)}"
        
        # Validate tariff lines exist (can be empty array for 0% tariff products)
        tariff_lines = data.get("tariff_lines", [])
        if not isinstance(tariff_lines, list):
            return "tariff_lines must be an array"
        
        # Validate each tariff line (if any exist)
        for idx, line in enumerate(tariff_lines):
            error = HistoryValidator._validate_tariff_line(line, idx)
            if error:
                return error
        
        # Validate agreement lines (if present)
        agreement_lines = data.get("agreement_lines", [])
        if agreement_lines:
            if not isinstance(agreement_lines, list):
                return "agreement_lines must be an array"
            
            for idx, line in enumerate(agreement_lines):
                error = HistoryValidator._validate_agreement_line(line, idx)
                if error:
                    return error
        
        return None  # Valid
    
    @staticmethod
    def _validate_tariff_line(line: Dict, index: int) -> Optional[str]:
        """Validate single tariff line"""
        if not isinstance(line, dict):
            return f"Tariff line {index} must be an object"
        
        missing = [field for field in HistoryValidator.TARIFF_LINE_REQUIRED_FIELDS if field not in line]
        if missing:
            return f"Tariff line {index} missing fields: {', '.join(missing)}"
        
        return None
    
    @staticmethod
    def _validate_agreement_line(line: Dict, index: int) -> Optional[str]:
        """Validate single agreement line"""
        if not isinstance(line, dict):
            return f"Agreement line {index} must be an object"
        
        missing = [field for field in HistoryValidator.AGREEMENT_LINE_REQUIRED_FIELDS if field not in line]
        if missing:
            return f"Agreement line {index} missing fields: {', '.join(missing)}"
        
        # Validate kind is one of allowed values
        allowed_kinds = ["override", "surcharge", "multiplier"]
        if line.get("kind") not in allowed_kinds:
            return f"Agreement line {index}: kind must be one of {allowed_kinds}"
        
        return None
    
    @staticmethod
    def validate_pagination_params(page: int, size: int) -> tuple:
        """
        Validate and normalize pagination parameters
        Args:
            page: Page number
            size: Page size
        Returns:
            Tuple of (normalized_page, normalized_size)
        """
        # Ensure page is at least 1
        page = max(int(page), 1)
        
        # Ensure size is between 1 and 100
        size = min(max(int(size), 1), 100)
        
        return page, size
