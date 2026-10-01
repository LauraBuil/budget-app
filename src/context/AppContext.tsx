import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addDoc, collection, getDocs, orderBy, query } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import { auth, db, isFirebaseConfigured } from '../lib/firebase'
import { demoData } from '../data/demo'
import { translate, type TranslationKey } from '../lib/i18n'
import type { AppData, Language, Theme, Transaction, UserProfile } from '../types'

interface AppContextValue {
  data: AppData
  user: UserProfile | null
  language: Language
  theme: Theme
  isDemo: boolean
  t: (key: TranslationKey) => string
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
  login: (email: string, password: string, register?: boolean) => Promise<void>
  loginDemo: () => void
  logout: () => Promise<void>
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('bloom-language') as Language) || 'fr')
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('bloom-theme') as Theme) || 'light')
  const [user, setUser] = useState<UserProfile | null>(() => {
    const stored = sessionStorage.getItem('bloom-user')
    return stored ? JSON.parse(stored) : null
  })
  const [data, setData] = useState<AppData>(demoData)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('bloom-theme', theme)
  }, [theme])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    localStorage.setItem('bloom-language', next)
    document.documentElement.lang = next
  }, [])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])

  const loadTransactions = useCallback(async (uid: string) => {
    if (!db) return
    const snapshot = await getDocs(query(collection(db, 'users', uid, 'transactions'), orderBy('date', 'desc')))
    if (!snapshot.empty) {
      setData((current) => ({ ...current, transactions: snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Transaction)) }))
    }
  }, [])

  const login = useCallback(async (email: string, password: string, register = false) => {
    if (!auth || !isFirebaseConfigured) throw new Error('FIREBASE_NOT_CONFIGURED')
    const result = register
      ? await createUserWithEmailAndPassword(auth, email, password)
      : await signInWithEmailAndPassword(auth, email, password)
    const nextUser = { uid: result.user.uid, email: result.user.email || email, displayName: result.user.displayName || email.split('@')[0] }
    setUser(nextUser)
    sessionStorage.setItem('bloom-user', JSON.stringify(nextUser))
    await loadTransactions(result.user.uid)
  }, [loadTransactions])

  const loginDemo = useCallback(() => {
    const demoUser = { uid: 'demo', email: 'demo@bloombudget.app', displayName: 'Chloé', isDemo: true }
    setUser(demoUser)
    sessionStorage.setItem('bloom-user', JSON.stringify(demoUser))
  }, [])

  const logout = useCallback(async () => {
    if (auth?.currentUser) await firebaseSignOut(auth)
    setUser(null)
    sessionStorage.removeItem('bloom-user')
  }, [])

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    const optimistic = { ...transaction, id: crypto.randomUUID() }
    setData((current) => ({ ...current, transactions: [optimistic, ...current.transactions] }))
    if (db && user && !user.isDemo) {
      await addDoc(collection(db, 'users', user.uid, 'transactions'), transaction)
    }
  }, [user])

  const value = useMemo<AppContextValue>(() => ({
    data, user, language, theme, isDemo: Boolean(user?.isDemo || !isFirebaseConfigured),
    t: (key) => translate(language, key), setLanguage, setTheme, login, loginDemo, logout, addTransaction,
  }), [data, user, language, theme, setLanguage, setTheme, login, loginDemo, logout, addTransaction])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
