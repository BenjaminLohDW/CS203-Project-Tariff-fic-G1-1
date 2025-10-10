// Country Service - API calls to the country microservice
import { Country } from '../types'

const COUNTRY_API_URL = import.meta.env.VITE_COUNTRY_API_URL || 'http://localhost:5005'

interface ApiCountry {
  country_id: number
  name: string
  code: string
}

interface ApiResponse {
  code: number
  data: ApiCountry[] | ApiCountry
}

/**
 * Fetch all countries from the country microservice
 * @returns {Promise<Country[]>} Array of country objects with id, name, and code
 */
export const fetchCountries = async (): Promise<Country[]> => {
  try {
    const response = await fetch(`${COUNTRY_API_URL}/api/countries`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data: ApiResponse = await response.json()
    
    // The API returns { code: 200, data: [...countries] }
    if (data.code === 200 && Array.isArray(data.data)) {
      // Transform the data to match the expected format for the frontend
      return data.data.map((country: ApiCountry) => ({
        id: country.country_id,
        name: country.name,
        code: country.code,
        fullName: country.name
      }))
    } else {
      throw new Error('Invalid response format from country API')
    }
  } catch (error) {
    console.error('Error fetching countries:', error)
    
    // Return fallback countries if API fails
    return [
      { id: 1, name: 'United States', code: 'US', fullName: 'United States of America' },
      { id: 2, name: 'Singapore', code: 'SG', fullName: 'Republic of Singapore' },
      { id: 3, name: 'China', code: 'CN', fullName: 'People\'s Republic of China' }
    ]
  }
}

/**
 * Get a specific country by ID
 * @param {string | number} countryId - The country ID
 * @returns {Promise<Country>} Country object
 */
export const fetchCountryById = async (countryId: string | number): Promise<Country> => {
  try {
    const response = await fetch(`${COUNTRY_API_URL}/api/countries/${countryId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data: { code: number; data: ApiCountry } = await response.json()
    
    if (data.code === 200 && data.data) {
      return {
        id: data.data.country_id,
        name: data.data.name,
        code: data.data.code,
        fullName: data.data.name
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
 * @returns {Promise<Country>} Country object
 */
export const fetchCountryByName = async (countryName: string): Promise<Country> => {
  try {
    const response = await fetch(`${COUNTRY_API_URL}/api/countries/by-name?name=${encodeURIComponent(countryName)}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data: { code: number; data: ApiCountry } = await response.json()
    
    if (data.code === 200 && data.data) {
      return {
        id: data.data.country_id,
        name: data.data.name,
        code: data.data.code,
        fullName: data.data.name
      }
    } else {
      throw new Error('Country not found')
    }
  } catch (error) {
    console.error('Error fetching country by name:', error)
    throw error
  }
}