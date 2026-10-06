import { auth } from './firebase'
import type { Budget, BudgetDraft, Category, Goal, GoalDraft, Transaction, TransactionDraft } from '../types'

async function authorizedRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error('AUTH_REQUIRED')
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'API_ERROR')
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const getTransactions = (month?: string) => authorizedRequest<Transaction[]>(`/api/transactions${month ? `?month=${encodeURIComponent(month)}` : ''}`)
export const createTransaction = (transaction: TransactionDraft) => authorizedRequest<Transaction>('/api/transactions', {
  method: 'POST',
  body: JSON.stringify(transaction),
})
export const updateTransaction = (id: string, transaction: TransactionDraft) => authorizedRequest<Transaction>(`/api/transactions/${encodeURIComponent(id)}`, {
  method: 'PATCH',
  body: JSON.stringify(transaction),
})
export const deleteTransaction = (id: string) => authorizedRequest<{ ids: string[] }>(`/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const getCategories = () => authorizedRequest<Category[]>('/api/categories')
export const createCategory = (name: string, expenseGroup: Category['group'], type: Category['type']) => authorizedRequest<Category>('/api/categories', {
  method: 'POST',
  body: JSON.stringify({ name, expenseGroup, type }),
})
export const getBudgets = () => authorizedRequest<Budget[]>('/api/budgets')
export const createBudget = (budget: BudgetDraft) => authorizedRequest<Budget>('/api/budgets', { method: 'POST', body: JSON.stringify(budget) })
export const updateBudget = (id: string, budget: BudgetDraft) => authorizedRequest<Budget>(`/api/budgets/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(budget) })
export const deleteBudget = (id: string) => authorizedRequest<void>(`/api/budgets/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const getGoals = () => authorizedRequest<Goal[]>('/api/goals')
export const createGoal = (goal: GoalDraft) => authorizedRequest<Goal>('/api/goals', { method: 'POST', body: JSON.stringify(goal) })
export const updateGoal = (id: string, goal: GoalDraft) => authorizedRequest<Goal>(`/api/goals/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(goal) })
export const deleteGoal = (id: string) => authorizedRequest<void>(`/api/goals/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const getOpeningBalance = (month: string) => authorizedRequest<{ openingBalance: number }>(`/api/monthly-balances/${encodeURIComponent(month)}`)
export const saveOpeningBalance = (month: string, openingBalance: number) => authorizedRequest<{ openingBalance: number }>(`/api/monthly-balances/${encodeURIComponent(month)}`, { method: 'PUT', body: JSON.stringify({ openingBalance }) })
