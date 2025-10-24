import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { onAuthChange, signIn, signUp, logOut, resetPassword } from './auth'
import { createUser, getUserProfile } from './userService'
import { UserProfile } from '../types'

interface User {
  uid: string
  email: string | null
  displayName: string | null
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  logOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  setUserProfile: (profile: UserProfile | null) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null, // microservice user object { user_id, name, email, role, ... }
  loading: true,
  signIn: async () => { throw new Error('AuthProvider not initialized') },
  signUp: async () => { throw new Error('AuthProvider not initialized') },
  logOut: async () => { throw new Error('AuthProvider not initialized') },
  resetPassword: async () => { throw new Error('AuthProvider not initialized') },
  setUserProfile: () => { throw new Error('AuthProvider not initialized') }
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const raw = localStorage.getItem('userProfile')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const isInitialLoad = useRef(true) // Flag to prevent role check during initial load

  useEffect(() => {
    const unsub = onAuthChange((u: User | null) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    try {
      if (userProfile) localStorage.setItem('userProfile', JSON.stringify(userProfile))
      else localStorage.removeItem('userProfile')
    } catch {}
  }, [userProfile])

  // Periodically check if user role has changed on the server
  useEffect(() => {
    if (!user || !userProfile) return

    // Skip role check for 5 seconds after profile is loaded (during login)
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      const timer = setTimeout(() => {
        // After 5 seconds, role checks can proceed normally
      }, 5000)
      return () => clearTimeout(timer)
    }

    const checkRoleChange = async () => {
      try {
        const freshProfile = await getUserProfile(user.uid)
        
        // If role has changed, update profile and force logout/re-login
        if (freshProfile.role !== userProfile.role) {
          console.log(`Role changed from ${userProfile.role} to ${freshProfile.role}. Logging out...`)
          
          // Update localStorage with new role before logout
          setUserProfile(freshProfile)
          
          alert(`Your role has been updated to "${freshProfile.role}". Please login again.`)
          await logOut()
          window.location.href = '/'
        }
      } catch (error) {
        console.error('Failed to check role change:', error)
      }
    }

    // Check role every 30 seconds
    const interval = setInterval(checkRoleChange, 30000)

    // Also check on window focus
    const onFocus = () => {
      if (!isInitialLoad.current) {
        checkRoleChange()
      }
    }
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [user, userProfile, logOut])

  // Auto-create user in microservice after Firebase authentication
  const retryTimer = useRef(null)
  useEffect(() => {
    if (!user || userProfile) return

    const createUserInMicroservice = async () => {
      try {
        const userData = {
          user_id: user.uid,  // Use Firebase user ID
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || ''
        }

        if (!userData.email) {
          console.warn('No email found for user, skipping microservice creation')
          return
        }

        console.log('Creating/fetching user from microservice:', userData)
        
        // Try to create user (will return existing user if already exists)
        let createdUser: UserProfile
        try {
          createdUser = await createUser(userData)
        } catch (error: any) {
          // If creation fails, try to fetch existing user
          if (error.message?.includes('already exists') || error.message?.includes('409')) {
            console.log('User exists, fetching profile...')
            createdUser = await getUserProfile(user.uid)
          } else {
            throw error
          }
        }
        
        setUserProfile(createdUser)
        console.log('✅ User profile loaded from microservice:', createdUser)
        console.log('📝 Role:', createdUser.role)
        
      } catch (error) {
        console.error('Failed to create/fetch user in microservice:', error)
        // Set a basic profile so the app can still function
        setUserProfile({
          user_id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          role: 'user'
        })
      }
    }

    createUserInMicroservice()

    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [user, userProfile])

  const value = { user, userProfile, setUserProfile, loading, signIn, signUp, logOut, resetPassword }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    // Disable BFCache for this protected page and ensure fresh auth check on restore
    const onPageshow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Always reload if restored from bfcache to avoid showing stale protected content
        window.location.reload()
      }
    }
    const onVisibility = () => {
      // When tab becomes visible again, if logged out, redirect
      if (document.visibilityState === 'visible' && !user && !loading) {
        window.location.replace('/')
      }
    }
    const onUnload = () => {
      // Adding an unload handler makes many browsers skip BFCache for this page
      // (security: prevents restoring protected content without running JS)
    }
    window.addEventListener('pageshow', onPageshow)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('unload', onUnload)
    return () => {
      window.removeEventListener('pageshow', onPageshow)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('unload', onUnload)
    }
  }, [user, loading, location.key])

  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  return children
}
