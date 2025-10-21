// Agreement Service - API calls to the agreement microservice
const AGREEMENT_API_URL = import.meta.env.VITE_AGREEMENT_API_URL || '/api'

/**
 * Agreement interface matching the backend response
 */
export interface Agreement {
  id: number
  importerId: string
  exporterId: string
  start_date: string
  end_date: string
  kind: 'override' | 'surcharge' | 'multiplier'
  value: number
  note?: string
}

/**
 * Agreement Service for connecting to the agreement microservice
 */
class AgreementService {
  
  /**
   * Get active agreements for a country pair on a specific date
   * @param {string} importerName - Importer country name (e.g., "Singapore")
   * @param {string} exporterName - Exporter country name (e.g., "China")
   * @param {string} date - Date in YYYY-MM-DD format (optional, defaults to today)
   * @returns {Promise<Agreement[]>} Array of active agreement objects
   */
  async getActiveAgreements(importerName: string, exporterName: string, date?: string): Promise<Agreement[]> {
    try {
      const params = new URLSearchParams({
        importer: importerName,
        exporter: exporterName
      })

      // Add date parameter if provided
      if (date) {
        params.append('on', date)
      }

      const response = await fetch(`${AGREEMENT_API_URL}/agreements/active?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          // No agreements found - return empty array
          return []
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Agreement service returned non-JSON response. Service may not be running correctly.')
        return []
      }

      const agreements: Agreement[] = await response.json()
      return agreements
    } catch (error) {
      console.error('Error fetching active agreements:', error)
      throw new Error(`Failed to fetch active agreements: ${(error as any).message}`)
    }
  }

  /**
   * Get all agreements (with optional filters)
   * @param {string} importerName - Optional importer country name filter
   * @param {string} exporterName - Optional exporter country name filter
   * @param {string} activeOn - Optional date to filter agreements active on this date
   * @returns {Promise<Agreement[]>} Array of agreement objects
   */
  async getAllAgreements(importerName?: string, exporterName?: string, activeOn?: string): Promise<Agreement[]> {
    try {
      const params = new URLSearchParams()

      if (importerName) params.append('importer', importerName)
      if (exporterName) params.append('exporter', exporterName)
      if (activeOn) params.append('active_on', activeOn)

      const url = params.toString() 
        ? `${AGREEMENT_API_URL}/agreements/all?${params}`
        : `${AGREEMENT_API_URL}/agreements/all`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const agreements: Agreement[] = await response.json()
      return agreements
    } catch (error) {
      console.error('Error fetching all agreements:', error)
      throw new Error(`Failed to fetch agreements: ${(error as any).message}`)
    }
  }

  /**
   * Create a new agreement
   * @param {any} agreementData - Agreement data object
   * @returns {Promise<Agreement>} Created agreement object
   */
  async createAgreement(agreementData: {
    importerName: string
    exporterName: string
    start_date: string
    end_date: string
    kind: 'override' | 'surcharge' | 'multiplier'
    value: number
    note?: string
  }): Promise<Agreement> {
    try {
      const response = await fetch(`${AGREEMENT_API_URL}/agreements/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agreementData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const agreement: Agreement = await response.json()
      return agreement
    } catch (error) {
      console.error('Error creating agreement:', error)
      throw new Error(`Failed to create agreement: ${(error as any).message}`)
    }
  }

  /**
   * Calculate the adjusted tariff based on agreements
   * @param {number} baseTariff - The base tariff amount
   * @param {Agreement[]} agreements - Array of active agreements
   * @returns {number} Adjusted tariff amount
   */
  calculateAdjustedTariff(baseTariff: number, agreements: Agreement[]): number {
    if (!agreements || agreements.length === 0) {
      return baseTariff
    }

    let adjustedTariff = baseTariff

    // Apply agreements in order
    agreements.forEach(agreement => {
      switch (agreement.kind) {
        case 'override':
          // Override replaces the tariff entirely
          adjustedTariff = agreement.value
          break
        case 'surcharge':
          // Surcharge adds to the tariff
          adjustedTariff += agreement.value
          break
        case 'multiplier':
          // Multiplier multiplies the tariff
          adjustedTariff *= agreement.value
          break
      }
    })

    return adjustedTariff
  }

  /**
   * Format agreement for display
   * @param {Agreement} agreement - Agreement object
   * @returns {string} Formatted description
   */
  formatAgreementDescription(agreement: Agreement): string {
    const kindDescriptions = {
      override: 'Override',
      surcharge: 'Surcharge',
      multiplier: 'Multiplier'
    }

    const kindDesc = kindDescriptions[agreement.kind] || agreement.kind
    const value = agreement.kind === 'multiplier' 
      ? `${agreement.value}x` 
      : `$${agreement.value.toFixed(4)}`

    return `${kindDesc}: ${value} (${agreement.start_date} to ${agreement.end_date})`
  }
}

// Export singleton instance
export default new AgreementService()

// Export the class for testing purposes
export { AgreementService }
