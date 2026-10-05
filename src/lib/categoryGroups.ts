import type { ExpenseGroup } from '../types'
import type { TranslationKey } from './i18n'

export const EXPENSE_GROUPS: Array<{ id: ExpenseGroup; labelKey: TranslationKey }> = [
  { id: 'fixed', labelKey: 'fixedCharges' },
  { id: 'daily', labelKey: 'dailyExpenses' },
  { id: 'nonEssential', labelKey: 'nonEssentialExpenses' },
  { id: 'unexpected', labelKey: 'unexpectedExpenses' },
]

export const BUILT_IN_CATEGORIES: Array<{ slug: string; labelKey: TranslationKey; group: ExpenseGroup }> = [
  { slug: 'rent', labelKey: 'rent', group: 'fixed' },
  { slug: 'electricity', labelKey: 'electricity', group: 'fixed' },
  { slug: 'insurance', labelKey: 'insurance', group: 'fixed' },
  { slug: 'credit', labelKey: 'credit', group: 'fixed' },
  { slug: 'housing', labelKey: 'housing', group: 'fixed' },
  { slug: 'food', labelKey: 'groceries', group: 'daily' },
  { slug: 'groceries', labelKey: 'groceries', group: 'daily' },
  { slug: 'fuel', labelKey: 'fuel', group: 'daily' },
  { slug: 'transport', labelKey: 'transport', group: 'daily' },
  { slug: 'leisure', labelKey: 'leisure', group: 'nonEssential' },
  { slug: 'dining', labelKey: 'dining', group: 'nonEssential' },
  { slug: 'unexpected', labelKey: 'unexpected', group: 'unexpected' },
]

export function getCategoryGroup(slug: string): ExpenseGroup {
  return BUILT_IN_CATEGORIES.find((category) => category.slug === slug)?.group || 'daily'
}
