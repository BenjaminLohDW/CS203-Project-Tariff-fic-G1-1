// Forecast Service - API calls to the forecast microservice
const FORECAST_API_URL = import.meta.env.VITE_FORECAST_API_URL || 'http://localhost:5007'

/**
 * Forecast request/response interfaces
 */
export interface ForecastPredictRequest {
  import_country: string
  export_country: string
  last_rates: number[]
  horizon?: number
}

export interface ForecastPredictResponse {
  code: number
  import_country: string
  export_country: string
  last_rates: number[]
  predicted_tariff: number
}

export interface ForecastSimulateRequest {
  import_country: string
  export_country: string
  hs_code: string
  rel_score: number
  last_rates: number[]
  horizon?: number
}

export interface ForecastSimulateResponse {
  code: number
  import_country: string
  export_country: string
  hs_code: string
  scenario_rel_score: number
  horizon: number
  predicted_tariff: number
  explanation: string
}

/**
 * Forecast Service for connecting to the forecast microservice
 */
class ForecastService {
  
  /**
   * Get predicted tariff using product name
   * @param {string} productName - Name of the product
   * @param {string} importCountry - Import country code (e.g., "US", "SG")
   * @param {string} exportCountry - Export country code (e.g., "CN", "SG")
   * @param {number} horizon - Number of periods to forecast ahead (default: 1)
   * @returns {Promise<number>} Predicted tariff rate
   */
  async getPredictedTariff(
    productName: string,
    importCountry: string,
    exportCountry: string,
    horizon: number = 1
  ): Promise<number> {
    try {
      const requestBody = {
        product_name: productName,
        import_country: importCountry.toUpperCase(),
        export_country: exportCountry.toUpperCase(),
        horizon: horizon
      }

      const response = await fetch(`${FORECAST_API_URL}/forecast/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Invalid request parameters')
        } else if (response.status === 404) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Product or historical data not found')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.predicted_tariff
    } catch (error) {
      console.error('Error getting predicted tariff:', error)
      throw new Error(`Failed to get predicted tariff: ${(error as any).message}`)
    }
  }

  /**
   * Predict future tariff based on historical rates
   * @param {string} importCountry - Import country code (e.g., "US", "SG")
   * @param {string} exportCountry - Export country code (e.g., "CN", "SG")
   * @param {number[]} lastRates - Array of historical tariff rates (minimum 2 values)
   * @param {number} horizon - Number of periods to forecast ahead (default: 1)
   * @returns {Promise<ForecastPredictResponse>} Forecast prediction response
   */
  async predictTariff(
    importCountry: string,
    exportCountry: string,
    lastRates: number[],
    horizon: number = 1
  ): Promise<ForecastPredictResponse> {
    try {
      if (!lastRates || lastRates.length < 2) {
        throw new Error('At least 2 historical tariff rates are required for prediction')
      }

      const requestBody: ForecastPredictRequest = {
        import_country: importCountry.toUpperCase(),
        export_country: exportCountry.toUpperCase(),
        last_rates: lastRates,
        horizon: horizon
      }

      const response = await fetch(`${FORECAST_API_URL}/forecast/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Invalid request parameters')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const forecast: ForecastPredictResponse = await response.json()
      return forecast
    } catch (error) {
      console.error('Error predicting tariff:', error)
      throw new Error(`Failed to predict tariff: ${(error as any).message}`)
    }
  }

  /**
   * Simulate tariff prediction with a custom relationship score
   * @param {string} importCountry - Import country code
   * @param {string} exportCountry - Export country code
   * @param {string} hsCode - HS Code for the product
   * @param {number} relScore - Relationship score between countries (-1 to 1)
   * @param {number[]} lastRates - Array of historical tariff rates (minimum 2 values)
   * @param {number} horizon - Number of periods to forecast ahead (default: 1)
   * @returns {Promise<ForecastSimulateResponse>} Forecast simulation response
   */
  async simulateCountryRelation(
    importCountry: string,
    exportCountry: string,
    hsCode: string,
    relScore: number,
    lastRates: number[],
    horizon: number = 1
  ): Promise<ForecastSimulateResponse> {
    try {
      if (!lastRates || lastRates.length < 2) {
        throw new Error('At least 2 historical tariff rates are required for simulation')
      }

      const requestBody: ForecastSimulateRequest = {
        import_country: importCountry,
        export_country: exportCountry,
        hs_code: hsCode,
        rel_score: relScore,
        last_rates: lastRates,
        horizon: horizon
      }

      const response = await fetch(`${FORECAST_API_URL}/forecast/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Invalid request parameters')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const simulation: ForecastSimulateResponse = await response.json()
      return simulation
    } catch (error) {
      console.error('Error simulating country relation:', error)
      throw new Error(`Failed to simulate country relation: ${(error as any).message}`)
    }
  }

  /**
   * Check if the forecast service is healthy
   * @returns {Promise<boolean>} True if service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${FORECAST_API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      return data.status === 'healthy'
    } catch (error) {
      console.error('Error checking forecast service health:', error)
      return false
    }
  }

  /**
   * Format forecast prediction for display
   * @param {ForecastPredictResponse} forecast - Forecast prediction response
   * @returns {string} Formatted description
   */
  formatForecastDescription(forecast: ForecastPredictResponse): string {
    return `Predicted tariff for ${forecast.import_country} importing from ${forecast.export_country}: ${forecast.predicted_tariff}%`
  }

  /**
   * Format simulation result for display
   * @param {ForecastSimulateResponse} simulation - Forecast simulation response
   * @returns {string} Formatted description
   */
  formatSimulationDescription(simulation: ForecastSimulateResponse): string {
    return `${simulation.explanation}\nPredicted tariff: ${simulation.predicted_tariff}%`
  }
}

// Export singleton instance
export default new ForecastService()

// Export the class for testing purposes
export { ForecastService }
