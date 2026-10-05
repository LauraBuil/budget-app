import { auth } from './firebase'
import type { Category, Transaction, TransactionDraft } from '../types'

async function authorizedRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await auth?.currentUser?.getIdToken()
  if (!token) throw new Error('AUTH_REQUIRED')
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'API_ERROR')
  return response.json() as Promise<T>
}

export const getTransactions = (month?: string) => authorizedRequest<Transaction[]>(`/api/transactions${month ? `?month=${encodeURIComponent(month)}` : ''}`)
export const createTransaction = (transaction: TransactionDraft) => authorizedRequest<Transaction>('/api/transactions', {
  method: 'POST',
  body: JSON.stringify(transaction),
})
export const getCategories = () => authorizedRequest<Category[]>('/api/categories')
export const createCategory = (name: string, expenseGroup: Category['group']) => authorizedRequest<Category>('/api/categories', {
  method: 'POST',
  body: JSON.stringify({ name, expenseGroup }),
})
