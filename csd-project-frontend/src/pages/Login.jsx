import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const { signIn, user, logOut, setUserProfile } = useAuth()
  // If a signed-in user lands on the login page (e.g., via Back), force logout
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (mounted && user) {
          await logOut()
          try { setUserProfile(null) } catch {}
          try { localStorage.removeItem('profileSetupPending') } catch {}
        }
      } catch {}
    })()
    return () => { mounted = false }
  }, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Show one-time info message after redirect from signup
  useEffect(() => {
    try {
      const msg = localStorage.getItem('signupMessage')
      if (msg) {
        setInfo(msg)
        localStorage.removeItem('signupMessage')
      }
    } catch {}
  }, [])

  // Clear messages when user starts typing
  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    if (info) setInfo('') // Clear success message when user starts typing
    if (error) setError('') // Clear error message when user starts typing
  }

  const handlePasswordChange = (e) => {
    setPassword(e.target.value)
    if (info) setInfo('') // Clear success message when user starts typing  
    if (error) setError('') // Clear error message when user starts typing
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('') // Clear any success messages when attempting login

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    try {
      setLoading(true)
  // Firebase email/password sign-in
  await signIn(email, password)
  navigate('/app')
    } catch (err) {
      const code = err?.code || ''
      let msg = 'Login failed. Please try again.'
      if (code === 'auth/invalid-email') msg = 'Invalid email address.'
      else if (code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.'
      else if (code === 'auth/network-request-failed') msg = 'Network error. Please check your connection and try again.'
      else if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        msg = 'User does not exist or password is incorrect.'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Welcome back</h2>
          <p className={styles.subtitle}>Sign in to continue</p>
        </div>

        {info && (
          <div className={styles.success}>
            {info}
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={handleEmailChange}
              placeholder="you@example.com"
              autoComplete="username"
            />
          </div>

          <div>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <div className="mt-1 text-right">
              <Link to="/reset-password" className="text-sm text-blue-500 hover:text-blue-600">
                Forgot password?
              </Link>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
        <div className="mt-3 text-center">
          <Link to="/signup" className="text-blue-500 font-semibold">Create an account</Link>
        </div>
      </div>
    </div>
  )
}
