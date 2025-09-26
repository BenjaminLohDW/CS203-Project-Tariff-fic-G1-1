// Firebase initialization (client-side)
// Fill the VITE_ envs in a .env.local file at project root when ready
import { initializeApp } from 'firebase/app'
// Optional: Analytics only when measurementId is provided and in browser
let getAnalytics
try {
  // Lazy import to avoid SSR/build complaints when not configured
  // eslint-disable-next-line import/no-unresolved
  ;({ getAnalytics } = await import('firebase/analytics'))
} catch {}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Only initialize if required envs are present; otherwise fallback harmlessly
let app = null
let analytics = null
try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig)
    // Initialize analytics only if configured and in browser env
    if (
      typeof window !== 'undefined' &&
      firebaseConfig.measurementId &&
      typeof getAnalytics === 'function'
    ) {
      analytics = getAnalytics(app)
    }
  }
} catch (e) {
  // Ignore duplicate init in HMR/dev
}

export { app, analytics }
