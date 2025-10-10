// Tariff Service - API calls to the tariff microservice
const TARIFF_BASE_URL = import.meta.env.VITE_TARIFF_API_URL || 'http://localhost:5004'

/**
 * Tariff Service for connecting to the tariff microservice
 */
class TariffService {
  
  /**
   * Get tariffs by HS Code only
   * @param {string} hsCode - The HS Code to search for
   * @returns {Promise<any[]>} Array of tariff objects
   */
  async getTariffsByHsCode(hsCode: string): Promise<any[]> {
    try {
      const response = await fetch(`${TARIFF_BASE_URL}/api/tariffs/by-hs/${encodeURIComponent(hsCode)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const tariffs = await response.json()
      return tariffs
    } catch (error) {
      console.error('Error fetching tariffs by HS code:', error)
      throw new Error(`Failed to fetch tariffs: ${(error as any).message}`)
    }
  }

  /**
   * Get tariffs by HS Code, importer, and exporter
   * @param {string} hsCode - The HS Code
   * @param {string} importer - Importer country name
   * @param {string} exporter - Exporter country name
   * @returns {Promise<any[]>} Array of tariff objects
   */
  async getTariffsByCombo(hsCode: string, importer: string, exporter: string): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        hs_code: hsCode,
        importer: importer,
        exporter: exporter
      })

      const response = await fetch(`${TARIFF_BASE_URL}/api/tariffs?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const tariffs = await response.json()
      return tariffs
    } catch (error) {
      console.error('Error fetching tariffs by combo:', error)
      throw new Error(`Failed to fetch tariffs: ${(error as any).message}`)
    }
  }

  /**
   * Get effective tariff for a specific date
   * @param {string} hsCode - The HS Code
   * @param {string} importer - Importer country name
   * @param {string} exporter - Exporter country name
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<any|null>} Single tariff object or null
   */
  async getEffectiveTariff(hsCode: string, importer: string, exporter: string, date: string): Promise<any | null> {
    try {
      const params = new URLSearchParams({
        hs_code: hsCode,
        importer: importer,
        exporter: exporter,
        date: date
      })

      const response = await fetch(`${TARIFF_BASE_URL}/api/tariffs/effective?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status === 404) {
        return null // No tariff found
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const tariff = await response.json()
      return tariff
    } catch (error) {
      console.error('Error fetching effective tariff:', error)
      throw new Error(`Failed to fetch effective tariff: ${(error as any).message}`)
    }
  }

  /**
   * Get effective tariff by names (POST request)
   * @param {any} request - Request object with hsCode, importerName, exporterName, date
   * @returns {Promise<any|null>} Single tariff object or null
   */
  async getEffectiveTariffByNames(request: any): Promise<any | null> {
    try {
      const response = await fetch(`${TARIFF_BASE_URL}/api/tariffs/effective/by-names`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      if (response.status === 404) {
        return null // No tariff found
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const tariff = await response.json()
      return tariff
    } catch (error) {
      console.error('Error fetching effective tariff by names:', error)
      throw new Error(`Failed to fetch effective tariff: ${(error as any).message}`)
    }
  }

  /**
   * Calculate tariff amount based on tariff data and value
   * @param {any} tariff - Tariff object from API
   * @param {number} goodsValue - Value of goods
   * @returns {any} Calculation result with breakdown
   */
  // qty is optional number of units; used for specific tariffs (per-unit)
  calculateTariffAmount(tariff: any, goodsValue: number, qty = 1): any {
    if (!tariff) {
      return {
        tariffAmount: 0,
        effectiveRate: 0,
        calculation: 'No tariff data available'
      }
    }

    let tariffAmount = 0
    let calculation = ''

    // Handle different tariff types
    switch (tariff.tariffType?.toLowerCase()) {
      case 'ad_valorem':
      case 'percentage': // Note: percentage should typically be classified as ad_valorem
        // Ad valorem tariffs are percentage-based on the value of goods
        tariffAmount = goodsValue * (tariff.tariffRate / 100)
        calculation = `Ad Valorem: ${goodsValue} × ${tariff.tariffRate}% = ${tariffAmount.toFixed(2)}`
        break
        
      case 'specific':
        // Specific tariffs are fixed amount per unit - multiply by quantity
        const perUnit = tariff.specificAmt || 0
        tariffAmount = perUnit * (Number(qty) || 0)
        calculation = `Specific tariff: ${perUnit} per ${tariff.specificUnit || 'unit'} × ${qty} = ${tariffAmount.toFixed(2)}`
        break
        
      case 'compound':
        // Combination of ad valorem and specific
  const adValoremPart = goodsValue * (tariff.tariffRate / 100)
  const specificPartPerUnit = tariff.specificAmt || 0
  const specificPart = specificPartPerUnit * (Number(qty) || 0)
  tariffAmount = adValoremPart + specificPart
  calculation = `Compound: Ad Valorem ${adValoremPart.toFixed(2)} + Specific ${specificPart.toFixed(2)} = ${tariffAmount.toFixed(2)}`
        break
        
      default:
        // Default to ad valorem calculation for unknown types
        tariffAmount = goodsValue * (tariff.tariffRate / 100)
        calculation = `Default (Ad Valorem): ${goodsValue} × ${tariff.tariffRate}% = ${tariffAmount.toFixed(2)}`
    }

    // Apply min/max caps if they exist
    if (tariff.minTariffAmt && tariffAmount < tariff.minTariffAmt) {
      tariffAmount = tariff.minTariffAmt
      calculation += ` (minimum applied: ${tariff.minTariffAmt})`
    }

    if (tariff.maxTariffAmt && tariffAmount > tariff.maxTariffAmt) {
      tariffAmount = tariff.maxTariffAmt
      calculation += ` (maximum applied: ${tariff.maxTariffAmt})`
    }

    return {
      tariffAmount: Math.round(tariffAmount * 100) / 100, // Round to 2 decimal places
      effectiveRate: goodsValue > 0 ? (tariffAmount / goodsValue * 100) : 0,
      calculation: calculation,
      tariffType: tariff.tariffType,
      originalRate: tariff.tariffRate
    }
  }

  /**
   * Format tariff data for display
   * @param {any} tariff - Tariff object from API
   * @returns {any} Formatted tariff data
   */
  formatTariffForDisplay(tariff: any): any {
    if (!tariff) return null

    return {
      id: tariff.id,
      hsCode: tariff.hsCode,
      importer: tariff.importerId,
      exporter: tariff.exporterId,
      type: tariff.tariffType,
      rate: tariff.tariffRate ? `${tariff.tariffRate}%` : 'N/A',
      specificAmount: tariff.specificAmt || null,
      specificUnit: tariff.specificUnit || null,
      minAmount: tariff.minTariffAmt || null,
      maxAmount: tariff.maxTariffAmt || null,
      validFrom: tariff.startDate,
      validTo: tariff.endDate,
      isActive: this.isTariffActive(tariff)
    }
  }

  /**
   * Check if tariff is currently active
   * @param {any} tariff - Tariff object
   * @returns {boolean} True if tariff is active
   */
  isTariffActive(tariff: any): boolean {
    if (!tariff.startDate) return true // No start date means always active
    
    const today = new Date()
    const startDate = new Date(tariff.startDate)
    const endDate = tariff.endDate ? new Date(tariff.endDate) : null

    const isAfterStart = today >= startDate
    const isBeforeEnd = !endDate || today <= endDate

    return isAfterStart && isBeforeEnd
  }
}

// Export singleton instance
export default new TariffService()

// Export the class for testing purposes
export { TariffService }