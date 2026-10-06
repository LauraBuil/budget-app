import type { ExpenseGroup, TransactionType } from '../types'
import type { TranslationKey } from './i18n'

export interface BuiltInCategory {
  slug: string
  labelKey: TranslationKey
  group: ExpenseGroup
  type: TransactionType
}

export const EXPENSE_GROUPS: Array<{ id: ExpenseGroup; labelKey: TranslationKey }> = [
  { id: 'fixed', labelKey: 'fixedCharges' },
  { id: 'daily', labelKey: 'dailyExpenses' },
  { id: 'nonEssential', labelKey: 'nonEssentialExpenses' },
  { id: 'unexpected', labelKey: 'unexpectedExpenses' },
]

export const EXPENSE_CATEGORIES: BuiltInCategory[] = [
  { slug: 'rent', labelKey: 'rent', group: 'fixed', type: 'expense' },
  { slug: 'electricity', labelKey: 'electricity', group: 'fixed', type: 'expense' },
  { slug: 'insurance', labelKey: 'insurance', group: 'fixed', type: 'expense' },
  { slug: 'credit', labelKey: 'credit', group: 'fixed', type: 'expense' },
  { slug: 'housing', labelKey: 'housing', group: 'fixed', type: 'expense' },
  { slug: 'food', labelKey: 'groceries', group: 'daily', type: 'expense' },
  { slug: 'groceries', labelKey: 'groceries', group: 'daily', type: 'expense' },
  { slug: 'fuel', labelKey: 'fuel', group: 'daily', type: 'expense' },
  { slug: 'transport', labelKey: 'transport', group: 'daily', type: 'expense' },
  { slug: 'leisure', labelKey: 'leisure', group: 'nonEssential', type: 'expense' },
  { slug: 'dining', labelKey: 'dining', group: 'nonEssential', type: 'expense' },
  { slug: 'unexpected', labelKey: 'unexpected', group: 'unexpected', type: 'expense' },
]

export const INCOME_CATEGORIES: BuiltInCategory[] = [
  { slug: 'salary', labelKey: 'salary', group: 'daily', type: 'income' },
  { slug: 'benefit', labelKey: 'benefit', group: 'daily', type: 'income' },
  { slug: 'refund', labelKey: 'refund', group: 'daily', type: 'income' },
]

export const BUILT_IN_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

export function getCategoryGroup(slug: string): ExpenseGroup {
  return BUILT_IN_CATEGORIES.find((category) => category.slug === slug)?.group || 'daily'
}
