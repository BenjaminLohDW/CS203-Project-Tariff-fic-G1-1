/**
 * Admin Tariff Service
 * Handles admin operations for tariff management
 */

export interface TariffCreateRequest {
  hsCode: string;
  importerId: string;      // Country code e.g., "SG"
  exporterId: string;      // Country code e.g., "MY"
  tariffType: 'Ad Valorem' | 'Specific' | 'Compound';
  tariffRate: number | null;
  specificAmt: number | null;
  specificUnit: string | null;
  minTariffAmt: number | null;
  maxTariffAmt: number | null;
  startDate: string;       // ISO date format "YYYY-MM-DD"
  endDate: string;         // ISO date format "YYYY-MM-DD"
}

export interface TariffResponse {
  id: number;
  hsCode: string;
  importerId: string;       // Country code like "SG", "CN"
  exporterId: string;       // Country code like "MY", "US"
  tariffType: string;       // "Ad Valorem", "Specific", "Compound"
  tariffRate: number | null;
  specificAmt: number | null;
  specificUnit: string | null;
  minTariffAmt: number | null;
  maxTariffAmt: number | null;
  startDate: string;
  endDate: string;
}

class AdminTariffService {
  private static instance: AdminTariffService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_TARIFF_API_URL || 'http://localhost:5004';
  }

  public static getInstance(): AdminTariffService {
    if (!AdminTariffService.instance) {
      AdminTariffService.instance = new AdminTariffService();
    }
    return AdminTariffService.instance;
  }

  /**
   * Get Basic Auth header for tariff service
   */
  private getAuthHeader(): HeadersInit {
    const username = 'tariff_admin';
    const password = 'tariff_admin';
    const credentials = btoa(`${username}:${password}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a new tariff record
   */
  async createTariff(tariff: TariffCreateRequest): Promise<TariffResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tariffs`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(tariff),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create tariff: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating tariff:', error);
      throw error;
    }
  }

  /**
   * Get all tariffs
   */
  async getAllTariffs(): Promise<TariffResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tariffs/all`, {
        method: 'GET',
        headers: this.getAuthHeader(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tariffs: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching tariffs:', error);
      throw error;
    }
  }

  /**
   * Update tariff (placeholder for when backend endpoint is ready)
   * TODO: Implement when teammate creates PUT /api/tariffs/{id} endpoint
   */
  async updateTariff(_id: number, _tariff: Partial<TariffCreateRequest>): Promise<TariffResponse> {
    throw new Error('Update endpoint not yet implemented by backend team');
    // Future implementation:
    // const response = await fetch(`${this.baseUrl}/api/tariffs/${id}`, {
    //   method: 'PUT',
    //   headers: this.getAuthHeader(),
    //   body: JSON.stringify(tariff),
    // });
    // return await response.json();
  }
}

export default AdminTariffService.getInstance();
