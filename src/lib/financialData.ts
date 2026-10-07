import type { Budget, Language, MonthPoint, Transaction } from '../types'
import { shiftMonth } from './months'

const categoryPalette = ['#c87d78', '#9c9b86', '#8ca6a0', '#b89cc5', '#dca39b', '#c49b67']

export interface CategoryTotal { category: string; amount: number; color: string; percentage: number }

export interface PeriodComparison { income: number; expense: number; balance: number }

export function getFinancialHistory(transactions: Transaction[], month: string, language: Language): MonthPoint[] {
  return Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5)).map((value) => {
    const values = transactions.filter((item) => item.date.startsWith(value))
    const label = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short' }).format(new Date(`${value}-01T12:00:00`))
    return { month: label.replace('.', ''), income: values.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0), expense: values.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0) }
  })
}

export function getCategoryTotals(transactions: Transaction[], budgets: Budget[], month: string): CategoryTotal[] {
  return getCategoryTotalsForRange(transactions, budgets, month, month, 'expense')
}

export function getCategoryTotalsForRange(
  transactions: Transaction[],
  budgets: Budget[],
  startMonth: string,
  endMonth: string,
  type: Transaction['type'],
): CategoryTotal[] {
  const totals = new Map<string, number>()
  transactions
    .filter((item) => item.type === type && isInMonthRange(item.date, startMonth, endMonth))
    .forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + item.amount))
  const total = [...totals.values()].reduce((sum, amount) => sum + amount, 0)
  return [...totals.entries()].sort(([, first], [, second]) => second - first).map(([category, amount], index) => ({ category, amount, color: budgets.find((budget) => budget.category === category)?.color || categoryPalette[index % categoryPalette.length], percentage: total ? Math.round((amount / total) * 100) : 0 }))
}

export function getFinancialHistoryForRange(transactions: Transaction[], startMonth: string, endMonth: string, language: Language): MonthPoint[] {
  const months = getMonthsInRange(startMonth, endMonth)
  return months.map((value) => {
    const values = transactions.filter((item) => item.date.startsWith(value))
    const label = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short', year: '2-digit' }).format(new Date(`${value}-01T12:00:00`))
    return { month: label.replace('.', ''), income: sumByType(values, 'income'), expense: sumByType(values, 'expense') }
  })
}

export function getPeriodComparison(transactions: Transaction[], startMonth: string, endMonth: string): PeriodComparison {
  const values = transactions.filter((item) => isInMonthRange(item.date, startMonth, endMonth))
  const income = sumByType(values, 'income')
  const expense = sumByType(values, 'expense')
  return { income, expense, balance: income - expense }
}

function getMonthsInRange(startMonth: string, endMonth: string) {
  const first = startMonth <= endMonth ? startMonth : endMonth
  const last = startMonth <= endMonth ? endMonth : startMonth
  const months: string[] = []
  for (let month = first; month <= last; month = shiftMonth(month, 1)) months.push(month)
  return months
}

function isInMonthRange(date: string, startMonth: string, endMonth: string) {
  const month = date.slice(0, 7)
  const first = startMonth <= endMonth ? startMonth : endMonth
  const last = startMonth <= endMonth ? endMonth : startMonth
  return month >= first && month <= last
}

function sumByType(transactions: Transaction[], type: Transaction['type']) {
  return transactions.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0)
}
