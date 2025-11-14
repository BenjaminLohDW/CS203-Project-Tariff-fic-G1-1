"""
Agreement Repository - Data Access Layer
Handles all database operations for Agreement entities
"""
from typing import List, Optional
from datetime import date
from models import Agreement, db


class AgreementRepository:
    """Repository for Agreement database operations following Repository pattern"""

    @staticmethod
    def create(agreement_data: dict) -> Agreement:
        """
        Create a new agreement in the database
        
        Args:
            agreement_data: Dictionary with agreement fields
            
        Returns:
            Created Agreement object
        """
        agreement = Agreement(**agreement_data)
        db.session.add(agreement)
        db.session.commit()
        return agreement

    @staticmethod
    def find_by_id(agreement_id: int) -> Optional[Agreement]:
        """
        Find agreement by ID
        
        Args:
            agreement_id: Agreement ID
            
        Returns:
            Agreement object or None if not found
        """
        return Agreement.query.get(agreement_id)

    @staticmethod
    def find_all(
        importer_id: Optional[str] = None,
        exporter_id: Optional[str] = None,
        active_on: Optional[date] = None
    ) -> List[Agreement]:
        """
        Find agreements with optional filters
        
        Args:
            importer_id: Optional importer country code filter
            exporter_id: Optional exporter country code filter
            active_on: Optional date filter for active agreements
            
        Returns:
            List of Agreement objects matching criteria
        """
        query = Agreement.query

        if importer_id:
            query = query.filter_by(importerId=importer_id.upper())
        if exporter_id:
            query = query.filter_by(exporterId=exporter_id.upper())
        if active_on:
            query = query.filter(
                Agreement.start_date <= active_on,
                Agreement.end_date >= active_on
            )

        return query.order_by(Agreement.start_date.desc()).all()

    @staticmethod
    def find_active_for_pair(
        importer_id: str,
        exporter_id: str,
        on_date: date
    ) -> List[Agreement]:
        """
        Find active agreements for a specific country pair on a date
        
        Args:
            importer_id: Importer country code
            exporter_id: Exporter country code
            on_date: Date to check for active agreements
            
        Returns:
            List of active Agreement objects for the pair
        """
        return Agreement.query.filter_by(
            importerId=importer_id,
            exporterId=exporter_id
        ).filter(
            Agreement.start_date <= on_date,
            Agreement.end_date >= on_date
        ).order_by(Agreement.start_date.desc()).all()

    @staticmethod
    def update(agreement: Agreement) -> Agreement:
        """
        Update an existing agreement
        
        Args:
            agreement: Agreement object with updated fields
            
        Returns:
            Updated Agreement object
        """
        db.session.commit()
        return agreement

    @staticmethod
    def delete(agreement: Agreement) -> None:
        """
        Delete an agreement
        
        Args:
            agreement: Agreement object to delete
        """
        db.session.delete(agreement)
        db.session.commit()
