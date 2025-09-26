import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Login.module.css'
import { useAuth } from '../lib/AuthContext.jsx'

export default function Signup() {
  const navigate = useNavigate()
  const { signUp, setUserProfile, logOut, user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')

  // If a signed-in user lands on the signup page (e.g., via Back/Forward), force logout
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name || !email || !password) {
      setError('Please fill in name, email and password')
      return
    }

    try {
      setLoading(true)
  // Firebase create user
  await signUp(email, password)

      // Create user record in the user microservice
      const res = await fetch('/api/user/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      })
      let createdProfile = null
      if (res.ok) {
        const body = await res.json().catch(() => null)
        createdProfile = body && body.data ? body.data : null
      } else if (res.status === 409) {
        // Email already exists in microservice – treat as success
        createdProfile = { name, email: email.toLowerCase(), role: 'user' }
      } else {
        // Non-blocking failure: mark pending and allow navigation
        setWarning('Account created, but profile setup couldn\'t complete. We\'ll retry shortly.')
        try { localStorage.setItem('profileSetupPending', JSON.stringify({ name, email })) } catch {}
      }
  if (createdProfile) setUserProfile(createdProfile)

  // Require explicit login after signup: sign out and redirect to login
  try { await logOut() } catch {}
  try { setUserProfile(null) } catch {}
  try { localStorage.removeItem('profileSetupPending') } catch {}
  try { localStorage.setItem('signupMessage', 'Account created. Please sign in.') } catch {}
  navigate('/', { replace: true })
    } catch (err) {
      const code = err?.code || ''
      let msg = 'Signup failed. Please try again.'
      if (code === 'auth/email-already-in-use') msg = 'Email already in use.'
      else if (code === 'auth/invalid-email') msg = 'Invalid email address.'
      else if (code === 'auth/weak-password') msg = 'Password is too weak.'
      else if (code === 'auth/network-request-failed') msg = 'Network error. Please check your connection and try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create your account</h2>
          <p className={styles.subtitle}>Sign up to get started</p>
        </div>

  {error && <div className={styles.error}>{error}</div>}
  {warning && <div className={`${styles.error} bg-yellow-50 text-yellow-800 border-yellow-200`}>{warning}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div>
            <label className={styles.label} htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>

          <div>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className={styles.actions}>
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Sign up'}
            </button>
            <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={() => navigate('/') }>
              Back to login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
