import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { onAuthChange, signIn, signUp, logOut } from './auth'
import { createUser } from './userService'

const AuthContext = createContext({
  user: null,
  userProfile: null, // microservice user object { user_id, name, email, role, ... }
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  logOut: async () => {},
  setUserProfile: () => {}
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('userProfile')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const unsub = onAuthChange((u) => {
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

        console.log('Creating user in microservice:', userData)
        const createdUser = await createUser(userData)
        setUserProfile(createdUser)
        console.log('User successfully created in microservice:', createdUser)
        
      } catch (error) {
        console.error('Failed to create user in microservice:', error)
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

  const value = { user, userProfile, setUserProfile, loading, signIn, signUp, logOut }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    // Disable BFCache for this protected page and ensure fresh auth check on restore
    const onPageshow = (e) => {
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
