export type Language = 'fr' | 'en'
export type Theme = 'light' | 'dark'
export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  label: string
  amount: number
  type: TransactionType
  category: string
  date: string
  note?: string
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
