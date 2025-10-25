import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail, sendPasswordResetEmail, type User, type Auth } from 'firebase/auth'
import { app } from './firebase'

const auth: Auth | null = app ? getAuth(app) : null

export const onAuthChange = (cb: (user: User | null) => void) => auth ? onAuthStateChanged(auth, cb) : () => {}
export const signIn = (email: string, password: string) => auth ? signInWithEmailAndPassword(auth, email, password) : Promise.reject(new Error('Firebase not initialized'))
export const signUp = (email: string, password: string) => auth ? createUserWithEmailAndPassword(auth, email, password) : Promise.reject(new Error('Firebase not initialized'))
export const logOut = () => auth ? signOut(auth) : Promise.resolve()
export const getSignInMethods = (email: string) => auth ? fetchSignInMethodsForEmail(auth, email) : Promise.resolve([])
export const resetPassword = (email: string) => {
  if (!auth) return Promise.reject(new Error('Firebase not initialized'))
  
  // Validate email format before sending to Firebase
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return Promise.reject({ code: 'auth/invalid-email' })
  }
  
  return sendPasswordResetEmail(auth, email)
}

/**
 * Get Firebase ID Token (JWT) for authenticated user
 * This token can be sent to backend APIs for authentication
 * @returns Promise<string> - Firebase JWT token
 */
export const getIdToken = async (): Promise<string | null> => {
  if (!auth?.currentUser) return null
  
  try {
    // Get fresh ID token (Firebase handles expiration automatically)
    const token = await auth.currentUser.getIdToken(false) // false = use cached if valid
    return token
  } catch (error) {
    console.error('Error getting ID token:', error)
    return null
  }
}

/**
 * Force refresh the Firebase ID Token
 * Useful when token might be expired or stale
 */
export const refreshIdToken = async (): Promise<string | null> => {
  if (!auth?.currentUser) return null
  
  try {
    const token = await auth.currentUser.getIdToken(true) // true = force refresh
    return token
  } catch (error) {
    console.error('Error refreshing ID token:', error)
    return null
  }
}

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): User | null => {
  return auth?.currentUser || null
}

