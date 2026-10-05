import {createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth'
import {auth, isFirebaseConfigured} from '../lib/firebase'
import {createCategory, createTransaction, getCategories, getTransactions} from '../lib/api'
import {demoData} from '../data/demo'
import {translate, type TranslationKey} from '../lib/i18n'
import type {AppData, Category, ExpenseGroup, Language, Theme, TransactionDraft, UserProfile} from '../types'

interface AppContextValue {
  data: AppData
  categories: Category[]
  user: UserProfile | null
  isAuthReady: boolean
  language: Language
  theme: Theme
  isDemo: boolean
  t: (key: TranslationKey) => string
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
  login: (email: string, password: string, register?: boolean) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  addCategory: (name: string, group: ExpenseGroup) => Promise<Category>
  refreshTransactions: (month?: string) => Promise<void>
  logout: () => Promise<void>
  addTransaction: (transaction: TransactionDraft) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)
const emptyAccountData: AppData = { ...demoData, transactions: [] }

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('gasel-language') || 'fr') as Language)
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('gasel-theme') || 'light') as Theme)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(!auth)
  const [data, setData] = useState<AppData>(emptyAccountData)
  const [categories, setCategories] = useState<Category[]>([])
  const authEpoch = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('gasel-theme', theme)
  }, [theme])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    localStorage.setItem('gasel-language', next)
    document.documentElement.lang = next
  }, [])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])

  const loadTransactions = useCallback(async (month?: string) => {
    const uid = auth?.currentUser?.uid
    if (!uid) throw new Error('AUTH_REQUIRED')
    const transactions = await getTransactions(month)
    if (auth?.currentUser?.uid !== uid) return
    setData((current) => ({ ...current, transactions }))
  }, [])

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (firebaseUser) => {
      const epoch = ++authEpoch.current
      setIsAuthReady(false)
      setUser(null)
      setData(emptyAccountData)
      setCategories([])
      sessionStorage.removeItem('gasel-user')

      if (!firebaseUser) {
        setIsAuthReady(true)
        return
      }
      const nextUser = { uid: firebaseUser.uid, email: firebaseUser.email || '', displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Gasel' }
      void Promise.allSettled([getTransactions(), getCategories()])
        .then(([transactionsResult, categoriesResult]) => {
          if (auth?.currentUser?.uid !== firebaseUser.uid || authEpoch.current !== epoch) return
          if (transactionsResult.status === 'fulfilled') setData((current) => ({ ...current, transactions: transactionsResult.value }))
          else console.error('Unable to load transactions', transactionsResult.reason instanceof Error ? transactionsResult.reason.message : 'Unknown error')
          if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value)
          else console.error('Unable to load categories', categoriesResult.reason instanceof Error ? categoriesResult.reason.message : 'Unknown error')
          setUser(nextUser)
        })
        .finally(() => {
          if (auth?.currentUser?.uid === firebaseUser.uid && authEpoch.current === epoch) setIsAuthReady(true)
        })
    })
  }, [])

  const login = useCallback(async (email: string, password: string, register = false) => {
    if (!auth || !isFirebaseConfigured) throw new Error('FIREBASE_NOT_CONFIGURED')
    const result = register
      ? await createUserWithEmailAndPassword(auth, email, password)
      : await signInWithEmailAndPassword(auth, email, password)
    await result.user.getIdToken()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    if (!auth || !isFirebaseConfigured) throw new Error('FIREBASE_NOT_CONFIGURED')
    await sendPasswordResetEmail(auth, email.trim())
  }, [])

  const logout = useCallback(async () => {
    ++authEpoch.current
    setUser(null)
    setData(emptyAccountData)
    setCategories([])
    setIsAuthReady(false)
    sessionStorage.removeItem('gasel-user')
    if (auth?.currentUser) await firebaseSignOut(auth)
    else setIsAuthReady(true)
  }, [])

  const updateDisplayName = useCallback(async (displayName: string) => {
    const nextName = displayName.trim()
    const firebaseUser = auth?.currentUser
    const epoch = authEpoch.current
    if (!firebaseUser || !nextName) throw new Error('NAME_REQUIRED')
    await updateProfile(firebaseUser, { displayName: nextName })
    if (auth?.currentUser?.uid !== firebaseUser.uid || authEpoch.current !== epoch) return
    setUser((current) => {
      if (!current) return current
      return {...current, displayName: nextName}
    })
  }, [])

  const addCategory = useCallback(async (name: string, group: ExpenseGroup) => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) throw new Error('AUTH_REQUIRED')
    const category = await createCategory(name, group)
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch) return category
    setCategories((current) => current.some((item) => item.slug === category.slug) ? current.map((item) => item.slug === category.slug ? category : item) : [...current, category])
    return category
  }, [])

  const addTransaction = useCallback(async (transaction: TransactionDraft) => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) throw new Error('AUTH_REQUIRED')
    const created = await createTransaction(transaction)
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch) return
    setData((current) => ({ ...current, transactions: [created, ...current.transactions] }))
  }, [])

  const value = useMemo<AppContextValue>(() => ({
    data, categories, user, isAuthReady, language, theme, isDemo: Boolean(user?.isDemo || !isFirebaseConfigured),
    t: (key) => translate(language, key), setLanguage, setTheme, login, resetPassword, updateDisplayName, addCategory, refreshTransactions: loadTransactions, logout, addTransaction,
  }), [data, categories, user, isAuthReady, language, theme, setLanguage, setTheme, login, resetPassword, updateDisplayName, addCategory, loadTransactions, logout, addTransaction])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
