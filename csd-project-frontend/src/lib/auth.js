import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail } from 'firebase/auth'
import { app } from './firebase'

const auth = app ? getAuth(app) : null

export const onAuthChange = (cb) => auth ? onAuthStateChanged(auth, cb) : () => {}
export const signIn = (email, password) => auth ? signInWithEmailAndPassword(auth, email, password) : Promise.reject(new Error('Firebase not initialized'))
export const signUp = (email, password) => auth ? createUserWithEmailAndPassword(auth, email, password) : Promise.reject(new Error('Firebase not initialized'))
export const logOut = () => auth ? signOut(auth) : Promise.resolve()
export const getSignInMethods = (email) => auth ? fetchSignInMethodsForEmail(auth, email) : Promise.resolve([])
