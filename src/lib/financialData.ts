import type { Budget, Language, MonthPoint, Transaction } from '../types'
import { shiftMonth } from './months'

const categoryPalette = ['#c87d78', '#9c9b86', '#8ca6a0', '#b89cc5', '#dca39b', '#c49b67']

export interface CategoryTotal { category: string; amount: number; color: string; percentage: number }

export function getFinancialHistory(transactions: Transaction[], month: string, language: Language): MonthPoint[] {
  return Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5)).map((value) => {
    const values = transactions.filter((item) => item.date.startsWith(value))
    const label = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short' }).format(new Date(`${value}-01T12:00:00`))
    return { month: label.replace('.', ''), income: values.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0), expense: values.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0) }
  })
}

export function getCategoryTotals(transactions: Transaction[], budgets: Budget[], month: string): CategoryTotal[] {
  const totals = new Map<string, number>()
  transactions.filter((item) => item.type === 'expense' && item.date.startsWith(month)).forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + item.amount))
  const total = [...totals.values()].reduce((sum, amount) => sum + amount, 0)
  return [...totals.entries()].sort(([, first], [, second]) => second - first).map(([category, amount], index) => ({ category, amount, color: budgets.find((budget) => budget.category === category)?.color || categoryPalette[index % categoryPalette.length], percentage: total ? Math.round((amount / total) * 100) : 0 }))
}
