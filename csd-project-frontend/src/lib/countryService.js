// Country Service - API calls to the country microservice

const COUNTRY_API_URL = import.meta.env.VITE_COUNTRY_API_URL || 'http://localhost:5005'

/**
 * Fetch all countries from the country microservice
 * @returns {Promise<Array>} Array of country objects with id, name, and code
 */
export const fetchCountries = async () => {
  try {
    const response = await fetch(`${COUNTRY_API_URL}/api/countries`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // The API returns { code: 200, data: [...countries] }
    if (data.code === 200 && Array.isArray(data.data)) {
      // Transform the data to match the expected format for the frontend
      return data.data.map(country => ({
        id: country.country_id,
        name: country.name,
        code: country.code
      }))
    } else {
      throw new Error('Invalid response format from country API')
    }
  } catch (error) {
    console.error('Error fetching countries:', error)
    
    // Return fallback countries if API fails
    return [
      { id: 1, name: 'United States', code: 'US' },
      { id: 2, name: 'Singapore', code: 'SG' },
      { id: 3, name: 'China', code: 'CN' }
    ]
  }
}

/**
 * Get a specific country by ID
 * @param {number} countryId - The country ID
 * @returns {Promise<Object>} Country object
 */
export const fetchCountryById = async (countryId) => {
  try {
    const response = await fetch(`${COUNTRY_API_URL}/api/countries/${countryId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.code === 200 && data.data) {
      return {
        id: data.data.country_id,
        name: data.data.name,
        code: data.data.code
      }
    } else {
      throw new Error('Country not found')
    }
  } catch (error) {
    console.error('Error fetching country by ID:', error)
    throw error
  }
}

/**
 * Get a specific country by name
 * @param {string} countryName - The country name
 * @returns {Promise<Object>} Country object
 */
export const fetchCountryByName = async (countryName) => {
  try {
    const response = await fetch(`${COUNTRY_API_URL}/api/countries/by-name?name=${encodeURIComponent(countryName)}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.code === 200 && data.data) {
      return {
        id: data.data.country_id,
        name: data.data.name,
        code: data.data.code
      }
    } else {
      throw new Error('Country not found')
    }
  } catch (error) {
    console.error('Error fetching country by name:', error)
    throw error
  }
}