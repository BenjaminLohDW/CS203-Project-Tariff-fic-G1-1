/**
 * User Service API Integration
 * Simple utility to create users in microservice with Firebase user_id
 */
import { UserProfile } from '../types'

// const API_BASE = '/api'
const USER_API_URL = import.meta.env.VITE_USER_API_URL || '/api'

interface CreateUserData {
  user_id: string
  name: string
  email: string
}

/**
 * Create a new user in the microservice with Firebase user_id
 * @param {CreateUserData} userData - User data from Firebase
 * @param {string} userData.user_id - Firebase user ID
 * @param {string} userData.name - User's name
 * @param {string} userData.email - User's email
 * @returns {Promise<UserProfile>} Created user object
 */
export async function createUser(userData: CreateUserData): Promise<UserProfile> {
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
    
    // If user already exists (409), fetch their existing profile instead
    if (response.status === 409) {
      console.log('User already exists in microservice, fetching existing profile...')
      return getUserProfile(userData.user_id)
    }
    
    throw new Error(error.message || error.error || `HTTP ${response.status}`)
  }

  const result = await response.json()
  return result.data
}

/**
 * Get user profile from microservice
 * @param {string} userId - User ID (Firebase UID)
 * @returns {Promise<UserProfile>} User profile object
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(`${USER_API_URL}/user/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('User not found')
    }
    const error = await response.json().catch(() => ({ message: 'Failed to fetch user' }))
    throw new Error(error.message || error.error || `HTTP ${response.status}`)
  }

  const result = await response.json()
  return result.data
}

/**
 * Promote a user to admin role
 * @param {string} userId - User ID (Firebase UID)
 * @returns {Promise<UserProfile>} Updated user profile
 */
export async function promoteToAdmin(userId: string): Promise<UserProfile> {
  const response = await fetch(`${USER_API_URL}/user/${userId}/promote-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('User not found')
    }
    const error = await response.json().catch(() => ({ message: 'Failed to promote user' }))
    throw new Error(error.message || error.error || `HTTP ${response.status}`)
  }

  const result = await response.json()
  return result.data
}