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
  expenseGroup?: ExpenseGroup
}

export interface TransactionDraft extends Omit<Transaction, 'id'> {
  recurrence?: { day: number } | null
}

export interface Budget {
  id: string
  category: string
  limit: number
  spent: number
  color: string
}

export type BudgetDraft = Pick<Budget, 'category' | 'limit' | 'color'>

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  dueDate?: string
  icon: 'travel' | 'tech' | 'safety'
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
