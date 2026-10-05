export type Language = 'fr' | 'en'
export type Theme = 'light' | 'dark'
export type TransactionType = 'income' | 'expense'
export type ExpenseGroup = 'fixed' | 'daily' | 'nonEssential' | 'unexpected'

export interface Category {
  id: string
  name: string
  slug: string
  group: ExpenseGroup
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
  expenseGroup?: ExpenseGroup
}

export interface TransactionDraft extends Omit<Transaction, 'id'> {
  recurrence?: { day: number }
}

export interface Budget {
  id: string
  category: string
  limit: number
  spent: number
  color: string
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  dueDate?: string
  icon: 'travel' | 'tech' | 'safety'
}

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
