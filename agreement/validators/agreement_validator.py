"""
Agreement Validator - Business Rules Validation Layer
Validates agreement data and enforces business constraints
"""
from datetime import date
from typing import Dict, Tuple, Optional


class AgreementValidator:
    """Validator for Agreement business rules and data integrity"""

    VALID_KINDS = {'override', 'surcharge', 'multiplier'}

    @staticmethod
    def validate_creation_data(data: dict) -> Tuple[bool, Optional[str]]:
        """
        Validate data for creating a new agreement
        
        Args:
            data: Dictionary with agreement creation data
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        required_fields = ['importerName', 'exporterName', 'start_date', 'end_date', 'kind', 'value']
        
        # Check required fields
        if not data:
            return False, "No data provided"
        
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return False, f"Missing required fields: {', '.join(missing_fields)}"
        
        # Validate kind
        if data['kind'] not in AgreementValidator.VALID_KINDS:
            return False, f"Invalid kind. Must be one of: {', '.join(AgreementValidator.VALID_KINDS)}"
        
        # Validate dates
        try:
            start = date.fromisoformat(data['start_date'])
            end = date.fromisoformat(data['end_date'])
            
            if end < start:
                return False, "end_date must be after or equal to start_date"
        except (ValueError, TypeError) as e:
            return False, f"Invalid date format: {str(e)}"
        
        # Validate value
        try:
            value = float(data['value'])
            if value < 0:
                return False, "Value must be non-negative"
        except (ValueError, TypeError):
            return False, "Value must be a valid number"
        
        return True, None

    @staticmethod
    def validate_filter_params(
        importer: Optional[str],
        exporter: Optional[str],
        active_on: Optional[str]
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate filter parameters for listing agreements
        
        Args:
            importer: Importer country name
            exporter: Exporter country name
            active_on: Date string in ISO format
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if active_on:
            try:
                date.fromisoformat(active_on)
            except (ValueError, TypeError):
                return False, "Invalid date format for active_on. Use YYYY-MM-DD"
        
        return True, None

    @staticmethod
    def validate_active_query(
        importer: Optional[str],
        exporter: Optional[str],
        on_date: Optional[str]
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate parameters for active agreement query
        
        Args:
            importer: Importer country name
            exporter: Exporter country name
            on_date: Date string in ISO format
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not importer or not exporter:
            return False, "Both importer and exporter are required"
        
        if on_date:
            try:
                date.fromisoformat(on_date)
            except (ValueError, TypeError):
                return False, "Invalid date format. Use YYYY-MM-DD"
        
        return True, None

    @staticmethod
    def validate_country_codes(
        importer_code: Optional[str],
        exporter_code: Optional[str]
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate that country codes were successfully resolved
        
        Args:
            importer_code: Resolved importer country code
            exporter_code: Resolved exporter country code
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not importer_code or not exporter_code:
            return False, "Failed to resolve country name(s) to ISO codes"
        
        return True, None
