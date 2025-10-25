/**
 * Admin Agreement Service
 * Handles admin operations for agreement management
 */

export interface AgreementCreateRequest {
  importerName: string;    // country name e.g., "Singapore"
  exporterName: string;    // country name e.g., "United States"
  start_date: string;      // ISO date format "YYYY-MM-DD"
  end_date: string;        // ISO date format "YYYY-MM-DD"
  kind: 'override' | 'surcharge' | 'multiplier';
  value: number;
  note?: string;
}

export interface AgreementResponse {
  id: number;
  importerId: string;      // country code e.g., "SG"
  exporterId: string;      // country code e.g., "US"
  start_date: string;
  end_date: string;
  kind: string;
  value: number;
  note?: string;
}

class AdminAgreementService {
  private static instance: AdminAgreementService;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_AGREEMENT_API_URL || 'http://localhost:5006';
  }

  public static getInstance(): AdminAgreementService {
    if (!AdminAgreementService.instance) {
      AdminAgreementService.instance = new AdminAgreementService();
    }
    return AdminAgreementService.instance;
  }

  /**
   * Create a new agreement
   */
  async createAgreement(agreement: AgreementCreateRequest): Promise<AgreementResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/agreements/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agreement),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create agreement: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating agreement:', error);
      throw error;
    }
  }

  /**
   * Get all agreements (with optional filters)
   */
  async getAllAgreements(filters?: {
    importer?: string;
    exporter?: string;
    active_on?: string;
  }): Promise<AgreementResponse[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.importer) params.append('importer', filters.importer);
      if (filters?.exporter) params.append('exporter', filters.exporter);
      if (filters?.active_on) params.append('active_on', filters.active_on);

      const url = `${this.baseUrl}/agreements/all${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agreements: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching agreements:', error);
      throw error;
    }
  }

  /**
   * Update agreement (placeholder for when backend endpoint is ready)
   * TODO: Implement when teammate creates PUT /agreements/{id} endpoint
   */
  async updateAgreement(_id: number, _agreement: Partial<AgreementCreateRequest>): Promise<AgreementResponse> {
    throw new Error('Update endpoint not yet implemented by backend team');
    // Future implementation:
    // const response = await fetch(`${this.baseUrl}/agreements/${id}`, {
    //   method: 'PUT',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(agreement),
    // });
    // return await response.json();
  }
}

export default AdminAgreementService.getInstance();
