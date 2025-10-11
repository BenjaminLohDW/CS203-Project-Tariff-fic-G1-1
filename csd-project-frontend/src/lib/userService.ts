/**
 * User Service API Integration
 * Simple utility to create users in microservice with Firebase user_id
 */
import { UserProfile } from '../types'

// const API_BASE = '/api'
const USER_API_URL = import.meta.env.VITE_USER_API_URL || 'http://localhost:5001'


/**
 * Create a new user in the microservice with Firebase user_id
 * @param {CreateUserData} userData - User data from Firebase
 * @param {string} userData.user_id - Firebase user ID
 * @param {string} userData.name - User's name
 * @param {string} userData.email - User's email
 * @returns {Promise<UserProfile>} Created user object
 */
export async function createUser(userData) {
  const response = await fetch(`${USER_API_URL}/user/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userData.user_id,
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase()
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create user' }))
    
    // If user already exists (409), that's okay - just return success
    if (response.status === 409) {
      console.log('User already exists in microservice, continuing...')
      return { user_id: userData.user_id, name: userData.name, email: userData.email, role: 'user' }
    }
    
    throw new Error(error.message || error.error || `HTTP ${response.status}`)
  }

  const result = await response.json()
  return result.data
}