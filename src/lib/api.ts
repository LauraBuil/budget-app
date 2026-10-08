import { auth } from './firebase'
import type { Budget, BudgetDraft, Category, Goal, GoalDraft, Transaction, TransactionDraft } from '../types'

export interface TransactionsQuery { type?: Transaction['type'] | 'all'; search?: string; category?: string; categories?: string[]; expenseGroups?: string[]; sort?: 'asc' | 'desc' }

async function authorizedRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error('AUTH_REQUIRED')
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  }).catch((error) => {
    window.dispatchEvent(new CustomEvent('gasel:api-error', { detail: 'NETWORK_ERROR' }))
    throw error
  })
  if (!response.ok) {
    const code = (await response.json().catch(() => null))?.error || 'API_ERROR'
    window.dispatchEvent(new CustomEvent('gasel:api-error', { detail: code }))
    throw new Error(code)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const getTransactions = async (startMonth?: string, endMonth?: string, filters: TransactionsQuery = {}) => {
  const query = new URLSearchParams()
  if (startMonth) query.set('startMonth', startMonth)
  if (endMonth) query.set('endMonth', endMonth)
  if (filters.type && filters.type !== 'all') query.set('type', filters.type)
  if (filters.search?.trim()) query.set('search', filters.search.trim())
  if (filters.category?.trim()) query.set('category', filters.category.trim())
  if (filters.categories?.length) query.set('categories', filters.categories.join(','))
  if (filters.expenseGroups?.length) query.set('expenseGroups', filters.expenseGroups.join(','))
  if (filters.sort) query.set('sort', filters.sort)
  const transactions: Transaction[] = []
  for (let offset = 0; offset < 50_000; offset += 1000) {
    query.set('offset', String(offset))
    const page = await authorizedRequest<Transaction[]>(`/api/transactions?${query}`)
    transactions.push(...page)
    if (page.length < 1000) break
  }
  return [...new Map(transactions.map((item) => [item.id, item])).values()]
}
export const createTransaction = (transaction: TransactionDraft) => authorizedRequest<Transaction>('/api/transactions', {
  method: 'POST',
  body: JSON.stringify(transaction),
})
export const updateTransaction = (id: string, transaction: TransactionDraft) => authorizedRequest<Transaction>(`/api/transactions/${encodeURIComponent(id)}`, {
  method: 'PATCH',
  body: JSON.stringify(transaction),
})
export const deleteTransaction = (id: string, scope: 'this' | 'future' = 'this') => authorizedRequest<{ ids: string[] }>(`/api/transactions/${encodeURIComponent(id)}?scope=${scope}`, { method: 'DELETE' })
export const getCategories = () => authorizedRequest<Category[]>('/api/categories')
export const createCategory = (name: string, expenseGroup: Category['group'], type: Category['type']) => authorizedRequest<Category>('/api/categories', {
  method: 'POST',
  body: JSON.stringify({ name, expenseGroup, type }),
})
export const updateCategory = (id: string, name: string) => authorizedRequest<Category>(`/api/categories/${encodeURIComponent(id)}`, {
  method: 'PATCH',
  body: JSON.stringify({ name }),
})
export const deleteCategory = (id: string) => authorizedRequest<void>(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const getBudgets = () => authorizedRequest<Budget[]>('/api/budgets')
export const createBudget = (budget: BudgetDraft) => authorizedRequest<Budget>('/api/budgets', { method: 'POST', body: JSON.stringify(budget) })
export const updateBudget = (id: string, budget: BudgetDraft) => authorizedRequest<Budget>(`/api/budgets/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(budget) })
export const deleteBudget = (id: string) => authorizedRequest<void>(`/api/budgets/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const getGoals = () => authorizedRequest<Goal[]>('/api/goals')
export const createGoal = (goal: GoalDraft) => authorizedRequest<Goal>('/api/goals', { method: 'POST', body: JSON.stringify(goal) })
export const updateGoal = (id: string, goal: GoalDraft) => authorizedRequest<Goal>(`/api/goals/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(goal) })
export const deleteGoal = (id: string) => authorizedRequest<void>(`/api/goals/${encodeURIComponent(id)}`, { method: 'DELETE' })
export interface OpeningBalance { openingBalance: number; automaticOpeningBalance: number; isManual: boolean }
export const getOpeningBalance = (month: string) => authorizedRequest<OpeningBalance>(`/api/monthly-balances/${encodeURIComponent(month)}`)
export const saveOpeningBalance = (month: string, openingBalance: number) => authorizedRequest<{ openingBalance: number }>(`/api/monthly-balances/${encodeURIComponent(month)}`, { method: 'PUT', body: JSON.stringify({ openingBalance }) })
export const restoreOpeningBalance = (month: string) => authorizedRequest<OpeningBalance>(`/api/monthly-balances/${encodeURIComponent(month)}`, { method: 'DELETE' })
export const moveOpeningBalanceToGoal = (month: string, goalId: string, amount: number) => authorizedRequest<{ goal: Goal; openingBalance: number }>(`/api/monthly-balances/${encodeURIComponent(month)}/move-to-goal`, { method: 'POST', body: JSON.stringify({ goalId, amount }) })
