import {createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth'
import {auth, isFirebaseConfigured} from '../lib/firebase'
import {createBudget, createCategory, createGoal, createTransaction, deleteBudget as removeBudget, deleteCategory as removeCategory, deleteGoal as removeGoal, deleteTransaction as removeTransaction, getAuthSession, getBudgets, getCategories, getGoals, getOpeningBalance as fetchOpeningBalance, getTransactions, moveOpeningBalanceToGoal as persistOpeningBalanceToGoal, restoreOpeningBalance as restorePersistedOpeningBalance, saveOpeningBalance as persistOpeningBalance, type OpeningBalance, updateBudget as persistBudget, updateCategory as persistCategory, updateGoal as persistGoal, updateTransaction as persistTransaction} from '../lib/api'
import {translate, type TranslationKey} from '../lib/i18n'
import { useToast } from './ToastContext'
import type {AppData, BudgetDraft, Category, ExpenseGroup, GoalDraft, Language, Theme, TransactionDraft, TransactionType, UserProfile} from '../types'

interface AppContextValue {
  data: AppData
  categories: Category[]
  user: UserProfile | null
  isAuthReady: boolean
  language: Language
  theme: Theme
  t: (key: TranslationKey) => string
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
  login: (email: string, password: string, register?: boolean) => Promise<void>
  loginWithGoogle: () => Promise<void>
  resendVerificationEmail: () => Promise<void>
  refreshEmailVerification: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  addCategory: (name: string, group: ExpenseGroup, type: TransactionType) => Promise<Category>
  updateCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  refreshTransactions: (startMonth?: string, endMonth?: string) => Promise<void>
  logout: () => Promise<void>
  addTransaction: (transaction: TransactionDraft) => Promise<void>
  updateTransaction: (id: string, transaction: TransactionDraft) => Promise<void>
  deleteTransaction: (id: string, scope?: 'this' | 'future') => Promise<void>
  addBudget: (budget: BudgetDraft) => Promise<void>
  updateBudget: (id: string, budget: BudgetDraft) => Promise<void>
  addGoal: (goal: GoalDraft) => Promise<void>
  updateGoal: (id: string, goal: GoalDraft) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  getOpeningBalance: (month: string) => Promise<OpeningBalance>
  saveOpeningBalance: (month: string, value: number) => Promise<number>
  restoreOpeningBalance: (month: string) => Promise<OpeningBalance>
  moveOpeningBalanceToGoal: (month: string, goalId: string, amount: number) => Promise<number>
}

const AppContext = createContext<AppContextValue | null>(null)
const emptyAccountData: AppData = { transactions: [], budgets: [], goals: [], history: [] }
function accessErrorFrom(results: PromiseSettledResult<unknown>[]) {
  return results.find((result) => result.status === 'rejected'
    && result.reason instanceof Error
    && result.reason.message.startsWith('AUTH_'))
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast()
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('gasel-language') || 'fr') as Language)
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('gasel-theme') || 'light') as Theme)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(!auth)
  const [data, setData] = useState<AppData>(emptyAccountData)
  const [categories, setCategories] = useState<Category[]>([])
  const authEpoch = useRef(0)
  const transactionsRequestId = useRef(0)
  const activePeriod = useRef<{ start?: string; end?: string }>({})

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

  const loadTransactions = useCallback(async (startMonth?: string, endMonth?: string) => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) throw new Error('AUTH_REQUIRED')
    const requestId = ++transactionsRequestId.current
    activePeriod.current = { start: startMonth, end: endMonth }
    const transactions = await getTransactions(startMonth, endMonth)
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch || requestId !== transactionsRequestId.current) return
    setData((current) => ({ ...current, transactions }))
  }, [])

  const loadBudgets = useCallback(async () => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) return
    const budgets = await getBudgets()
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch) return
    setData((current) => ({ ...current, budgets }))
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
      const profile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Gasel',
      }

      if (!firebaseUser.emailVerified) {
        setUser({ ...profile, access: 'verificationRequired' })
        setIsAuthReady(true)
        return
      }

      void getAuthSession()
        .then(async (session) => {
          if (auth?.currentUser?.uid !== firebaseUser.uid || authEpoch.current !== epoch) return
          if (!session.emailVerified) {
            setUser({ ...profile, access: 'verificationRequired' })
            return
          }
          if (!session.emailAllowed) {
            setUser({ ...profile, access: 'emailDomainBlocked' })
            return
          }

          const [transactionsResult, categoriesResult, budgetsResult, goalsResult] = await Promise.allSettled([getTransactions(), getCategories(), getBudgets(), getGoals()])
          if (auth?.currentUser?.uid !== firebaseUser.uid || authEpoch.current !== epoch) return
          const authFailure = accessErrorFrom([transactionsResult, categoriesResult, budgetsResult, goalsResult])
          if (authFailure?.status === 'rejected') {
            if (authFailure.reason.message === 'AUTH_EMAIL_UNVERIFIED') setUser({ ...profile, access: 'verificationRequired' })
            else if (authFailure.reason.message === 'AUTH_EMAIL_DOMAIN_BLOCKED') setUser({ ...profile, access: 'emailDomainBlocked' })
            else await firebaseSignOut(auth)
            return
          }
          if (transactionsResult.status === 'fulfilled') setData((current) => ({ ...current, transactions: transactionsResult.value }))
          else console.error('Unable to load transactions', transactionsResult.reason instanceof Error ? transactionsResult.reason.message : 'Unknown error')
          if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value)
          else console.error('Unable to load categories', categoriesResult.reason instanceof Error ? categoriesResult.reason.message : 'Unknown error')
          setData((current) => ({ ...current,
            budgets: budgetsResult.status === 'fulfilled' ? budgetsResult.value : current.budgets,
            goals: goalsResult.status === 'fulfilled' ? goalsResult.value : current.goals,
          }))
          setUser({ ...profile, access: 'granted' })
        })
        .catch(async (error) => {
          console.error('Unable to validate account access', error instanceof Error ? error.message : 'Unknown error')
          if (auth?.currentUser?.uid === firebaseUser.uid && authEpoch.current === epoch) await firebaseSignOut(auth)
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
    if (register) {
      auth.languageCode = language
      await sendEmailVerification(result.user, { url: `${window.location.origin}/login` })
    }
    await result.user.getIdToken()
  }, [language])

  const loginWithGoogle = useCallback(async () => {
    if (!auth || !isFirebaseConfigured) throw new Error('FIREBASE_NOT_CONFIGURED')
    const result = await signInWithPopup(auth, new GoogleAuthProvider())
    await result.user.getIdToken()
  }, [])

  const resendVerificationEmail = useCallback(async () => {
    if (!auth?.currentUser) throw new Error('AUTH_REQUIRED')
    auth.languageCode = language
    await sendEmailVerification(auth.currentUser, { url: `${window.location.origin}/login` })
    showToast(translate(language, 'verificationEmailSent'))
  }, [language, showToast])

  const refreshEmailVerification = useCallback(async () => {
    const firebaseUser = auth?.currentUser
    if (!firebaseUser) throw new Error('AUTH_REQUIRED')
    await reload(firebaseUser)
    if (!firebaseUser.emailVerified) throw new Error('EMAIL_NOT_VERIFIED')
    await firebaseUser.getIdToken(true)
    window.location.assign('/')
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
    showToast(translate(language, 'changesSaved'))
  }, [language, showToast])

  const addCategory = useCallback(async (name: string, group: ExpenseGroup, type: TransactionType) => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) throw new Error('AUTH_REQUIRED')
    const category = await createCategory(name, group, type)
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch) return category
    setCategories((current) => current.some((item) => item.slug === category.slug && item.type === category.type) ? current.map((item) => item.slug === category.slug && item.type === category.type ? category : item) : [...current, category])
    showToast(translate(language, 'changesSaved'))
    return category
  }, [language, showToast])

  const updateCategory = useCallback(async (id: string, name: string) => {
    const category = await persistCategory(id, name)
    setCategories((current) => current.map((item) => item.id === id ? category : item))
    showToast(translate(language, 'changesSaved'))
  }, [language, showToast])

  const deleteCategory = useCallback(async (id: string) => {
    await removeCategory(id)
    setCategories((current) => current.filter((item) => item.id !== id))
    showToast(translate(language, 'itemDeleted'))
  }, [language, showToast])

  const addTransaction = useCallback(async (transaction: TransactionDraft) => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) throw new Error('AUTH_REQUIRED')
    const created = await createTransaction(transaction)
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch) return
    setData((current) => ({ ...current, transactions: [created, ...current.transactions.filter((item) => item.id !== created.id)] }))
    await Promise.all([loadBudgets(), loadTransactions(activePeriod.current.start, activePeriod.current.end)])
    showToast(translate(language, 'changesSaved'))
  }, [loadBudgets, loadTransactions, language, showToast])

  const updateTransaction = useCallback(async (id: string, transaction: TransactionDraft) => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) throw new Error('AUTH_REQUIRED')
    const updated = await persistTransaction(id, transaction)
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch) return
    setData((current) => ({ ...current, transactions: current.transactions.map((item) => item.id === id ? updated : item) }))
    await Promise.all([loadBudgets(), loadTransactions(activePeriod.current.start, activePeriod.current.end)])
    showToast(translate(language, 'changesSaved'))
  }, [language, loadBudgets, loadTransactions, showToast])

  const deleteTransaction = useCallback(async (id: string, scope: 'this' | 'future' = 'this') => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) throw new Error('AUTH_REQUIRED')
    ++transactionsRequestId.current
    const deleted = await removeTransaction(id, scope)
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch) return
    setData((current) => ({ ...current, transactions: current.transactions.filter((item) => !deleted.ids.includes(item.id)) }))
    await Promise.all([loadBudgets(), loadTransactions(activePeriod.current.start, activePeriod.current.end)])
    showToast(translate(language, 'itemDeleted'))
  }, [language, loadBudgets, loadTransactions, showToast])

  const addBudget = useCallback(async (budget: BudgetDraft) => {
    const created = auth?.currentUser ? await createBudget(budget) : { ...budget, id: `budget-${Date.now()}`, spent: 0 }
    setData((current) => ({ ...current, budgets: [...current.budgets.filter((item) => item.id !== created.id && item.category !== created.category), created] }))
  }, [])

  const updateBudget = useCallback(async (id: string, budget: BudgetDraft) => {
    const updated = auth?.currentUser ? await persistBudget(id, budget) : { ...budget, id, spent: data.budgets.find((item) => item.id === id)?.spent || 0 }
    setData((current) => ({ ...current, budgets: current.budgets.map((item) => item.id === id ? updated : item) }))
    showToast(translate(language, 'changesSaved'))
  }, [data.budgets, language, showToast])

  const addGoal = useCallback(async (goal: GoalDraft) => {
    const created = auth?.currentUser ? await createGoal(goal) : { ...goal, id: `goal-${Date.now()}`, saved: goal.saved || 0 }
    setData((current) => ({ ...current, goals: [...current.goals, created] }))
  }, [])

  const updateGoal = useCallback(async (id: string, goal: GoalDraft) => {
    const updated = auth?.currentUser ? await persistGoal(id, goal) : { ...goal, id, saved: goal.saved || 0 }
    setData((current) => ({ ...current, goals: current.goals.map((item) => item.id === id ? updated : item) }))
    showToast(translate(language, 'changesSaved'))
  }, [language, showToast])

  const deleteBudget = useCallback(async (id: string) => {
    if (auth?.currentUser) await removeBudget(id)
    setData((current) => ({ ...current, budgets: current.budgets.filter((item) => item.id !== id) }))
    showToast(translate(language, 'itemDeleted'))
  }, [language, showToast])

  const deleteGoal = useCallback(async (id: string) => {
    if (auth?.currentUser) await removeGoal(id)
    setData((current) => ({ ...current, goals: current.goals.filter((item) => item.id !== id) }))
    showToast(translate(language, 'itemDeleted'))
  }, [language, showToast])

  const getOpeningBalance = useCallback(async (month: string) => {
    if (auth?.currentUser) return fetchOpeningBalance(month)
    const stored = localStorage.getItem(`gasel-opening-balance-${month}`)
    const openingBalance = Number(stored || 0)
    return { openingBalance, automaticOpeningBalance: openingBalance, isManual: stored !== null }
  }, [])

  const saveOpeningBalance = useCallback(async (month: string, value: number) => {
    if (!Number.isFinite(value)) throw new Error('INVALID_BALANCE')
    if (auth?.currentUser) {
      const openingBalance = (await persistOpeningBalance(month, value)).openingBalance
      showToast(translate(language, 'changesSaved'))
      return openingBalance
    }
    localStorage.setItem(`gasel-opening-balance-${month}`, String(value))
    showToast(translate(language, 'changesSaved'))
    return value
  }, [language, showToast])

  const restoreOpeningBalance = useCallback(async (month: string) => {
    if (auth?.currentUser) return restorePersistedOpeningBalance(month)
    localStorage.removeItem(`gasel-opening-balance-${month}`)
    return { openingBalance: 0, automaticOpeningBalance: 0, isManual: false }
  }, [])

  const moveOpeningBalanceToGoal = useCallback(async (month: string, goalId: string, amount: number) => {
    if (!auth?.currentUser) {
      localStorage.setItem(`gasel-opening-balance-${month}`, '0')
      setData((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, saved: goal.saved + amount } : goal) }))
      return 0
    }
    const result = await persistOpeningBalanceToGoal(month, goalId, amount)
    setData((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === result.goal.id ? result.goal : goal) }))
    return result.openingBalance
  }, [])

  const value = useMemo<AppContextValue>(() => ({
    data, categories, user, isAuthReady, language, theme,
    t: (key) => translate(language, key), setLanguage, setTheme, login, loginWithGoogle, resendVerificationEmail, refreshEmailVerification, resetPassword, updateDisplayName, addCategory, updateCategory, deleteCategory, refreshTransactions: loadTransactions, logout, addTransaction, updateTransaction, deleteTransaction, addBudget, updateBudget, addGoal, updateGoal, deleteBudget, deleteGoal, getOpeningBalance, saveOpeningBalance, restoreOpeningBalance, moveOpeningBalanceToGoal,
  }), [data, categories, user, isAuthReady, language, theme, setLanguage, setTheme, login, loginWithGoogle, resendVerificationEmail, refreshEmailVerification, resetPassword, updateDisplayName, addCategory, updateCategory, deleteCategory, loadTransactions, logout, addTransaction, updateTransaction, deleteTransaction, addBudget, updateBudget, addGoal, updateGoal, deleteBudget, deleteGoal, getOpeningBalance, saveOpeningBalance, restoreOpeningBalance, moveOpeningBalanceToGoal])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
