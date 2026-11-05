import type { Budget, ExpenseGroup, Transaction } from '../types'
import type { TranslationKey } from './i18n'

export const BUDGET_EXPENSE_GROUPS: Array<{ id: string; group: ExpenseGroup; labelKey: TranslationKey }> = [
  { id: 'fixed-expenses', group: 'fixed', labelKey: 'fixedCharges' },
  { id: 'daily-expenses', group: 'daily', labelKey: 'dailyExpenses' },
  { id: 'non-essential', group: 'nonEssential', labelKey: 'nonEssentialExpenses' },
  { id: 'unexpected-expenses', group: 'unexpected', labelKey: 'unexpectedExpenses' },
]

const expenseGroupBySelector = new Map(BUDGET_EXPENSE_GROUPS.map((item) => [item.id, item.group]))

export function getBudgetCategories(budget: Pick<Budget, 'category' | 'categories'>) {
  return budget.categories?.length ? budget.categories : [budget.category]
}

export function splitBudgetSelectors(budget: Pick<Budget, 'category' | 'categories'>) {
  const categories: string[] = []
  const expenseGroups: ExpenseGroup[] = []
  getBudgetCategories(budget).forEach((selection) => {
    const expenseGroup = expenseGroupBySelector.get(selection)
    if (expenseGroup) expenseGroups.push(expenseGroup)
    else categories.push(selection)
  })
  return { categories, expenseGroups }
}

export function budgetIncludesTransaction(budget: Pick<Budget, 'category' | 'categories'>, transaction: Pick<Transaction, 'type' | 'category' | 'expenseGroup'>) {
  if (transaction.type !== 'expense') return false
  const selectors = splitBudgetSelectors(budget)
  const matchesCategory = selectors.categories.length === 0 || selectors.categories.includes(transaction.category)
  const matchesExpenseGroup = selectors.expenseGroups.length === 0 || selectors.expenseGroups.includes(transaction.expenseGroup || 'daily')
  return matchesCategory && matchesExpenseGroup
}

export function getBudgetTransactions(
  budget: Pick<Budget, 'id' | 'category' | 'categories'>,
  budgets: Array<Pick<Budget, 'id' | 'category' | 'categories'>>,
  transactions: Transaction[],
) {
  const selectors = splitBudgetSelectors(budget)
  return transactions.filter((transaction) => {
    if (!budgetIncludesTransaction(budget, transaction)) return false
    // A precise category budget takes precedence over a broad type-only budget.
    // This keeps, for example, Fast food out of a general non-essential budget
    // when it has explicitly been assigned to an Alimentation budget.
    if (selectors.categories.length > 0) return true
    return !budgets.some((candidate) => candidate.id !== budget.id
      && splitBudgetSelectors(candidate).categories.length > 0
      && budgetIncludesTransaction(candidate, transaction))
  })
}

export function sameBudgetCategories(first: readonly string[], second: readonly string[]) {
  if (first.length !== second.length) return false
  const sortedFirst = [...first].sort()
  const sortedSecond = [...second].sort()
  return sortedFirst.every((item, index) => item === sortedSecond[index])
}
