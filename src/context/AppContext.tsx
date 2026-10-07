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
import {createBudget, createCategory, createGoal, createTransaction, deleteBudget as removeBudget, deleteGoal as removeGoal, deleteTransaction as removeTransaction, getBudgets, getCategories, getGoals, getOpeningBalance as fetchOpeningBalance, getTransactions, saveOpeningBalance as persistOpeningBalance, updateBudget as persistBudget, updateGoal as persistGoal, updateTransaction as persistTransaction} from '../lib/api'
import {translate, type TranslationKey} from '../lib/i18n'
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
  resetPassword: (email: string) => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  addCategory: (name: string, group: ExpenseGroup, type: TransactionType) => Promise<Category>
  refreshTransactions: (month?: string) => Promise<void>
  logout: () => Promise<void>
  addTransaction: (transaction: TransactionDraft) => Promise<void>
  updateTransaction: (id: string, transaction: TransactionDraft) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  addBudget: (budget: BudgetDraft) => Promise<void>
  updateBudget: (id: string, budget: BudgetDraft) => Promise<void>
  addGoal: (goal: GoalDraft) => Promise<void>
  updateGoal: (id: string, goal: GoalDraft) => Promise<void>
  deleteBudget: (id: string) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  getOpeningBalance: (month: string) => Promise<number>
  saveOpeningBalance: (month: string, value: number) => Promise<number>
}

const AppContext = createContext<AppContextValue | null>(null)
const emptyAccountData: AppData = { transactions: [], budgets: [], goals: [], history: [] }

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
      const nextUser = { uid: firebaseUser.uid, email: firebaseUser.email || '', displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Gasel' }
      void Promise.allSettled([getTransactions(), getCategories(), getBudgets(), getGoals()])
        .then(([transactionsResult, categoriesResult, budgetsResult, goalsResult]) => {
          if (auth?.currentUser?.uid !== firebaseUser.uid || authEpoch.current !== epoch) return
          if (transactionsResult.status === 'fulfilled') setData((current) => ({ ...current, transactions: transactionsResult.value }))
          else console.error('Unable to load transactions', transactionsResult.reason instanceof Error ? transactionsResult.reason.message : 'Unknown error')
          if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value)
          else console.error('Unable to load categories', categoriesResult.reason instanceof Error ? categoriesResult.reason.message : 'Unknown error')
          setData((current) => ({ ...current,
            budgets: budgetsResult.status === 'fulfilled' ? budgetsResult.value : current.budgets,
            goals: goalsResult.status === 'fulfilled' ? goalsResult.value : current.goals,
          }))
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

  const addCategory = useCallback(async (name: string, group: ExpenseGroup, type: TransactionType) => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) throw new Error('AUTH_REQUIRED')
    const category = await createCategory(name, group, type)
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch) return category
    setCategories((current) => current.some((item) => item.slug === category.slug && item.type === category.type) ? current.map((item) => item.slug === category.slug && item.type === category.type ? category : item) : [...current, category])
    return category
  }, [])

  const addTransaction = useCallback(async (transaction: TransactionDraft) => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) throw new Error('AUTH_REQUIRED')
    const created = await createTransaction(transaction)
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch) return
    setData((current) => ({ ...current, transactions: [created, ...current.transactions] }))
    await loadBudgets()
  }, [loadBudgets])

  const updateTransaction = useCallback(async (id: string, transaction: TransactionDraft) => {
    const uid = auth?.currentUser?.uid
    const epoch = authEpoch.current
    if (!uid) throw new Error('AUTH_REQUIRED')
    const updated = await persistTransaction(id, transaction)
    if (auth?.currentUser?.uid !== uid || authEpoch.current !== epoch) return
    setData((current) => ({ ...current, transactions: current.transactions.map((item) => item.id === id ? updated : item) }))
    await loadBudgets()
  }, [loadBudgets])

  const deleteTransaction = useCallback(async (id: string) => {
    const deleted = auth?.currentUser ? await removeTransaction(id) : { ids: [id] }
    setData((current) => ({ ...current, transactions: current.transactions.filter((item) => !deleted.ids.includes(item.id)) }))
    await loadBudgets()
  }, [loadBudgets])

  const addBudget = useCallback(async (budget: BudgetDraft) => {
    const created = auth?.currentUser ? await createBudget(budget) : { ...budget, id: `budget-${Date.now()}`, spent: 0 }
    setData((current) => ({ ...current, budgets: [...current.budgets, created] }))
  }, [])

  const updateBudget = useCallback(async (id: string, budget: BudgetDraft) => {
    const updated = auth?.currentUser ? await persistBudget(id, budget) : { ...budget, id, spent: data.budgets.find((item) => item.id === id)?.spent || 0 }
    setData((current) => ({ ...current, budgets: current.budgets.map((item) => item.id === id ? updated : item) }))
  }, [data.budgets])

  const addGoal = useCallback(async (goal: GoalDraft) => {
    const created = auth?.currentUser ? await createGoal(goal) : { ...goal, id: `goal-${Date.now()}`, saved: goal.saved || 0 }
    setData((current) => ({ ...current, goals: [...current.goals, created] }))
  }, [])

  const updateGoal = useCallback(async (id: string, goal: GoalDraft) => {
    const updated = auth?.currentUser ? await persistGoal(id, goal) : { ...goal, id, saved: goal.saved || 0 }
    setData((current) => ({ ...current, goals: current.goals.map((item) => item.id === id ? updated : item) }))
  }, [])

  const deleteBudget = useCallback(async (id: string) => {
    if (auth?.currentUser) await removeBudget(id)
    setData((current) => ({ ...current, budgets: current.budgets.filter((item) => item.id !== id) }))
  }, [])

  const deleteGoal = useCallback(async (id: string) => {
    if (auth?.currentUser) await removeGoal(id)
    setData((current) => ({ ...current, goals: current.goals.filter((item) => item.id !== id) }))
  }, [])

  const getOpeningBalance = useCallback(async (month: string) => {
    if (auth?.currentUser) return (await fetchOpeningBalance(month)).openingBalance
    return Number(localStorage.getItem(`gasel-opening-balance-${month}`) || 0)
  }, [])

  const saveOpeningBalance = useCallback(async (month: string, value: number) => {
    if (!Number.isFinite(value)) throw new Error('INVALID_BALANCE')
    if (auth?.currentUser) return (await persistOpeningBalance(month, value)).openingBalance
    localStorage.setItem(`gasel-opening-balance-${month}`, String(value))
    return value
  }, [])

  const value = useMemo<AppContextValue>(() => ({
    data, categories, user, isAuthReady, language, theme,
    t: (key) => translate(language, key), setLanguage, setTheme, login, resetPassword, updateDisplayName, addCategory, refreshTransactions: loadTransactions, logout, addTransaction, updateTransaction, deleteTransaction, addBudget, updateBudget, addGoal, updateGoal, deleteBudget, deleteGoal, getOpeningBalance, saveOpeningBalance,
  }), [data, categories, user, isAuthReady, language, theme, setLanguage, setTheme, login, resetPassword, updateDisplayName, addCategory, loadTransactions, logout, addTransaction, updateTransaction, deleteTransaction, addBudget, updateBudget, addGoal, updateGoal, deleteBudget, deleteGoal, getOpeningBalance, saveOpeningBalance])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
