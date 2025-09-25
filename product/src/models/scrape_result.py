from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from datetime import datetime

@dataclass
class HSCodeResult:
    """Data class for HS Code lookup results"""
    
    # Search Input
    query: str
    search_timestamp: datetime
    
    # Results
    hs_code: Optional[str] = None
    description: Optional[str] = None
    unit_of_measure: Optional[str] = None
    
    # Additional Info
    ca_product_code: Optional[str] = None
    competent_authority: Optional[str] = None
    license_required: Optional[bool] = None
    
    # Alternative suggestions
    suggestions: List[Dict[str, str]] = field(default_factory=list)
    
    # Technical Details
    success: bool = True
    error_message: Optional[str] = None
    response_time_ms: int = 0
    source_url: Optional[str] = None
    
    # Raw text field for debugging purposes
    raw_text: Optional[str] = None  # For debugging/manual review
    
    def __post_init__(self):
        if self.suggestions is None:
            self.suggestions = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses"""
        return {
            'query': self.query,
            'search_timestamp': self.search_timestamp.isoformat(),
            'hs_code': self.hs_code,
            'description': self.description,
            'unit_of_measure': self.unit_of_measure,
            'suggestions': self._clean_suggestions(),
            'success': self.success,
            'error_message': self.error_message,
            'response_time_ms': self.response_time_ms,
            'source_url': self.source_url
        }
    
    def _clean_suggestions(self) -> List[Dict[str, Any]]:
        """Clean suggestions by removing disclaimers and licensing info"""
        if not self.suggestions:
            return []
        
        cleaned_suggestions = []
        seen_hs_codes = set()
        
        for suggestion in self.suggestions:
            hs_code = suggestion.get('hs_code')
            
            # Skip if we've already seen this HS code
            if hs_code in seen_hs_codes:
                continue
                
            cleaned_suggestion = {
                'hs_code': hs_code,
                'description': suggestion.get('description'),
                'unit': suggestion.get('unit')
            }
            
            # Remove None values
            cleaned_suggestion = {k: v for k, v in cleaned_suggestion.items() if v is not None}
            
            # Only add if we have meaningful data
            if cleaned_suggestion.get('hs_code'):
                cleaned_suggestions.append(cleaned_suggestion)
                seen_hs_codes.add(hs_code)
        
        return cleaned_suggestions
    
    def is_controlled_product(self) -> bool:
        """Check if product requires CA licensing"""
        return self.license_required is True and self.ca_product_code is not None
