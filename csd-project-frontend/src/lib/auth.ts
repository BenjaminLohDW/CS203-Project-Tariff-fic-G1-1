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
