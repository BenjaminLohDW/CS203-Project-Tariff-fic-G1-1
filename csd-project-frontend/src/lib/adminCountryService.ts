/**
 * Admin Country Service
 * Handles admin operations for country and relationship management
 */

export interface Country {
  country_id: number;
  name: string;
  code: string;
}

export interface CountryRelation {
  pair: [string, string];  // [country_code_a, country_code_b]
  weight: number;
  effective_date?: string;
}

class AdminCountryService {
  private static instance: AdminCountryService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_COUNTRY_API_URL || 'http://localhost:5005';
  }

  public static getInstance(): AdminCountryService {
    if (!AdminCountryService.instance) {
      AdminCountryService.instance = new AdminCountryService();
    }
    return AdminCountryService.instance;
  }

  /**
   * Get all countries
   */
  async getAllCountries(): Promise<Country[]> {
    try {
      const response = await fetch(`${this.baseUrl}/countries/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch countries: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching countries:', error);
      throw error;
    }
  }

  /**
   * Get country relationship
   */
  async getCountryRelation(countryA: string, countryB: string): Promise<CountryRelation | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/countries/relation/current?a=${countryA}&b=${countryB}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch country relation: ${response.status}`);
      }

      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('Error fetching country relation:', error);
      throw error;
    }
  }

  /**
   * Create country (placeholder for when backend endpoint is ready)
   * TODO: Implement when teammate creates POST /countries endpoint
   */
  async createCountry(_country: { name: string; code: string }): Promise<Country> {
    throw new Error('Create country endpoint not yet implemented by backend team');
  }

  /**
   * Update country (placeholder for when backend endpoint is ready)
   * TODO: Implement when teammate creates PUT /countries/{id} endpoint
   */
  async updateCountry(_id: number, _country: Partial<{ name: string; code: string }>): Promise<Country> {
    throw new Error('Update country endpoint not yet implemented by backend team');
  }

  /**
   * Create country relationship (placeholder for when backend endpoint is ready)
   * TODO: Implement when teammate creates POST /countries/relation endpoint
   */
  async createCountryRelation(_relation: {
    countryA: string;
    countryB: string;
    weight: number;
    effectiveDate: string;
  }): Promise<CountryRelation> {
    throw new Error('Create country relation endpoint not yet implemented by backend team');
  }

  /**
   * Update country relationship (placeholder for when backend endpoint is ready)
   * TODO: Implement when teammate creates PUT /countries/relation endpoint
   */
  async updateCountryRelation(
    _countryA: string,
    _countryB: string,
    _weight: number,
    _effectiveDate: string
  ): Promise<CountryRelation> {
    throw new Error('Update country relation endpoint not yet implemented by backend team');
  }
}

export default AdminCountryService.getInstance();
