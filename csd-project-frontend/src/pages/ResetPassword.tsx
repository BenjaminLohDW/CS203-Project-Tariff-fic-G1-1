import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import styles from './Login.module.css'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  
  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  // Enhanced email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    // Enhanced validation
    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (email.length > 254) {
      setError('Email address is too long')
      return
    }

    try {
      setLoading(true)
      await resetPassword(email.trim().toLowerCase())
      setSuccess(true)
      setCooldown(60) // 60 second cooldown
    } catch (err: any) {
      const code = err?.code || ''
      let msg = 'Failed to send reset email. Please try again.'
      
      if (code === 'auth/invalid-email') {
        msg = 'Invalid email address format.'
      } else if (code === 'auth/user-not-found') {
        // Security: Don't reveal if user exists or not
        msg = 'If an account with this email exists, you will receive a reset link.'
      } else if (code === 'auth/too-many-requests') {
        msg = 'Too many reset attempts. Please wait a few minutes before trying again.'
      } else if (code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your connection and try again.'
      } else if (code === 'auth/invalid-recipient-email') {
        msg = 'Invalid email address.'
      } else if (code === 'auth/invalid-sender') {
        msg = 'Email service temporarily unavailable. Please try again later.'
      } else if (code === 'auth/invalid-message-payload') {
        msg = 'Service error. Please try again later.'
      } else {
        // Log unexpected errors for debugging while showing generic message
        console.error('Password reset error:', err)
        msg = 'Service temporarily unavailable. Please try again later.'
      }
      
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h2 className={styles.title}>Check your email</h2>
            <p className={styles.subtitle}>
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>

          <div className={`${styles.error} bg-green-50 border-green-200 text-green-900`}>
            <div>
              <p className="font-semibold mb-2">Next steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Check your email inbox (and spam/junk folder)</li>
                <li>Click the "Reset Password" link in the email</li>
                <li>Create a new password on the Firebase page</li>
                <li>Return here and log in with your new password</li>
              </ol>
              <p className="text-xs mt-3 text-gray-600">
                The reset link will expire in 1 hour for security.
              </p>
            </div>
          </div>

          <div className={styles.actions}>
            <Link to="/" className={styles.button}>
              Back to Login
            </Link>
          </div>

          <div className="mt-3 text-center">
            <button 
              onClick={() => {
                setSuccess(false)
                setEmail('')
                setCooldown(0)
              }}
              disabled={cooldown > 0}
              className={`font-semibold bg-none border-none cursor-pointer ${
                cooldown > 0 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-500 hover:text-blue-600'
              }`}
            >
              {cooldown > 0 
                ? `Resend available in ${cooldown}s` 
                : 'Send another reset email'
              }
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Reset Password</h2>
          <p className={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
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
              required
            />
          </div>

          <div className={styles.actions}>
            <button 
              className={styles.button} 
              type="submit" 
              disabled={loading || cooldown > 0 || !email.trim()}
            >
              {loading 
                ? 'Sending...' 
                : cooldown > 0 
                  ? `Wait ${cooldown}s` 
                  : 'Send Reset Email'
              }
            </button>
          </div>
        </form>

        <div className="mt-3 text-center">
          <Link to="/" className="text-blue-500 font-semibold">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}