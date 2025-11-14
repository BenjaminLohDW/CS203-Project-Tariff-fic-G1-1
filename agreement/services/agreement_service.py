"""
Agreement Service - Business Logic Layer
Orchestrates validation, country resolution, and repository operations
"""
from typing import List, Dict, Optional, Tuple
from datetime import date
import requests

from repositories import AgreementRepository
from validators import AgreementValidator


class AgreementService:
    """Service layer handling Agreement business logic"""

    def __init__(self, country_ms_url: str):
        """
        Initialize the Agreement service
        
        Args:
            country_ms_url: Base URL for the Country microservice
        """
        self.country_ms_url = country_ms_url
        self.repository = AgreementRepository()
        self.validator = AgreementValidator()

    def resolve_country_code(self, name: str) -> Optional[str]:
        """
        Query the Country microservice to get ISO2 code by name
        
        Args:
            name: Country name
            
        Returns:
            ISO2 country code or None if not found
        """
        try:
            resp = requests.get(f"{self.country_ms_url}/countries/by-name?name={name}")
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", {}).get("code")
        except Exception as e:
            print(f"[WARN] Country lookup failed for {name}: {e}")
        return None

    def create_agreement(self, data: dict) -> Tuple[Optional[Dict], Optional[str], int]:
        """
        Create a new agreement
        
        Args:
            data: Agreement creation data
            
        Returns:
            Tuple of (agreement_dict, error_message, status_code)
        """
        # Validate input data
        is_valid, error_msg = self.validator.validate_creation_data(data)
        if not is_valid:
            return None, error_msg, 400

        # Resolve country names to ISO codes
        importer_code = self.resolve_country_code(data['importerName'])
        exporter_code = self.resolve_country_code(data['exporterName'])

        is_valid, error_msg = self.validator.validate_country_codes(importer_code, exporter_code)
        if not is_valid:
            return None, error_msg, 400

        # Prepare agreement data for database
        agreement_data = {
            'importerId': importer_code,
            'exporterId': exporter_code,
            'start_date': date.fromisoformat(data['start_date']),
            'end_date': date.fromisoformat(data['end_date']),
            'kind': data['kind'],
            'value': data['value'],
            'note': data.get('note'),
        }

        # Create agreement via repository
        agreement = self.repository.create(agreement_data)
        return agreement.to_dict(), None, 201

    def list_agreements(
        self,
        importer_name: Optional[str] = None,
        exporter_name: Optional[str] = None,
        active_on: Optional[str] = None
    ) -> Tuple[List[Dict], Optional[str], int]:
        """
        List agreements with optional filters
        
        Args:
            importer_name: Optional importer country name filter
            exporter_name: Optional exporter country name filter
            active_on: Optional date string (YYYY-MM-DD) for active agreements
            
        Returns:
            Tuple of (list_of_dicts, error_message, status_code)
        """
        # Validate filter parameters
        is_valid, error_msg = self.validator.validate_filter_params(
            importer_name, exporter_name, active_on
        )
        if not is_valid:
            return [], error_msg, 400

        # Resolve country names to codes if provided
        importer_code = self.resolve_country_code(importer_name) if importer_name else None
        exporter_code = self.resolve_country_code(exporter_name) if exporter_name else None

        # Parse active_on date if provided
        active_date = date.fromisoformat(active_on) if active_on else None

        # Query repository with filters
        agreements = self.repository.find_all(
            importer_id=importer_code,
            exporter_id=exporter_code,
            active_on=active_date
        )

        return [a.to_dict() for a in agreements], None, 200

    def get_active_agreements(
        self,
        importer_name: str,
        exporter_name: str,
        on_date: Optional[str] = None
    ) -> Tuple[List[Dict], Optional[str], int]:
        """
        Get active agreements for a specific country pair
        
        Args:
            importer_name: Importer country name
            exporter_name: Exporter country name
            on_date: Optional date string (defaults to today)
            
        Returns:
            Tuple of (list_of_dicts, error_message, status_code)
        """
        # Use today's date if not provided
        if not on_date:
            on_date = date.today().isoformat()

        # Validate query parameters
        is_valid, error_msg = self.validator.validate_active_query(
            importer_name, exporter_name, on_date
        )
        if not is_valid:
            return [], error_msg, 400

        # Resolve country names to ISO codes
        importer_code = self.resolve_country_code(importer_name)
        exporter_code = self.resolve_country_code(exporter_name)

        is_valid, error_msg = self.validator.validate_country_codes(importer_code, exporter_code)
        if not is_valid:
            return [], error_msg, 400

        # Parse date and query repository
        query_date = date.fromisoformat(on_date)
        agreements = self.repository.find_active_for_pair(
            importer_code, exporter_code, query_date
        )

        return [a.to_dict() for a in agreements], None, 200
