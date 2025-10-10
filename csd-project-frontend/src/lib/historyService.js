// History Service - API calls to the history microservice

const HISTORY_API_URL = import.meta.env.VITE_HISTORY_API_URL || 'http://localhost:5003'

/**
 * Save a calculation to user's history
 * @param {Object} calculationData - The calculation data to save
 * @returns {Promise<Object>} Saved calculation with history_id
 */
export const saveCalculation = async (calculationData) => {
  try {
    const response = await fetch(`${HISTORY_API_URL}/history/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calculationData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.code === 201) {
      return data.data
    } else {
      throw new Error(data.message || 'Failed to save calculation')
    }
  } catch (error) {
    console.error('Error saving calculation to history:', error)
    throw error
  }
}

/**
 * Get user's calculation history
 * @param {string} userId - The user's ID
 * @param {number} page - Page number (default: 1)
 * @param {number} size - Page size (default: 20)
 * @returns {Promise<Object>} Paginated history data
 */
export const getUserHistory = async (userId, page = 1, size = 20) => {
  try {
    const response = await fetch(`${HISTORY_API_URL}/user/${userId}/history?page=${page}&size=${size}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.code === 200) {
      return data
    } else if (data.code === 404) {
      // No history found - return empty result
      return {
        code: 200,
        page: 1,
        size: size,
        total: 0,
        data: []
      }
    } else {
      throw new Error(data.message || 'Failed to fetch history')
    }
  } catch (error) {
    console.error('Error fetching user history:', error)
    throw error
  }
}

/**
 * Get detailed tariff lines for a specific calculation
 * @param {string} historyId - The history ID
 * @param {number} page - Page number (default: 1)
 * @param {number} size - Page size (default: 20)
 * @returns {Promise<Object>} Tariff line details
 */
export const getHistoryTariffLines = async (historyId, page = 1, size = 20) => {
  try {
    const response = await fetch(`${HISTORY_API_URL}/history/${historyId}?page=${page}&size=${size}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.code === 200) {
      return data
    } else {
      throw new Error(data.message || 'Failed to fetch tariff lines')
    }
  } catch (error) {
    console.error('Error fetching tariff lines:', error)
    throw error
  }
}

/**
 * Delete a calculation from history
 * @param {string} historyId - The history ID to delete
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteCalculationFromHistory = async (historyId) => {
  try {
    const response = await fetch(`${HISTORY_API_URL}/history/${historyId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.code === 200) {
      return data
    } else {
      throw new Error(data.message || 'Failed to delete calculation')
    }
  } catch (error) {
    console.error('Error deleting calculation:', error)
    throw error
  }
}