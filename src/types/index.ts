import type { IconId } from '../lib/icons'

export type { IconId }
export type Language = 'fr' | 'en'
export type Theme = 'light' | 'dark'
export type TransactionType = 'income' | 'expense'
export type ExpenseGroup = 'fixed' | 'daily' | 'nonEssential' | 'unexpected'

export interface Category {
  id: string
  name: string
  slug: string
  group: ExpenseGroup
  type: TransactionType
}

export interface Transaction {
  id: string
  label: string
  amount: number
  type: TransactionType
  category: string
  date: string
  note?: string
  isRecurring?: boolean
  recurrenceDay?: number
  recurringId?: string | null
  expenseGroup?: ExpenseGroup
  icon: IconId
}

export interface TransactionDraft extends Omit<Transaction, 'id'> {
  recurrence?: { day: number } | null
  scope?: 'this' | 'future'
  clientRequestId?: string
}

export interface Budget {
  id: string
  name: string
  category: string
  limit: number
  spent: number
  color: string
  note: string
  icon: IconId
}

export type BudgetDraft = Pick<Budget, 'name' | 'category' | 'limit' | 'color' | 'note' | 'icon'>

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  dueDate?: string
  icon: IconId
}

export type GoalDraft = Omit<Goal, 'id' | 'saved'> & { saved?: number }

export interface MonthPoint {
  month: string
  income: number
  expense: number
}

export interface AppData {
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  history: MonthPoint[]
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  isDemo?: boolean
}
