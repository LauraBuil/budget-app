import { useApp } from '../context/AppContext'
import { capitalizeFirst, formatCurrency } from '../lib/format'
import { Pencil, Trash2 } from 'lucide-react'
import type { Budget } from '../types'
import { InlineEditableAmount } from './ui/InlineEditableAmount'
import { InlineEditableText } from './ui/InlineEditableText'
import { iconById } from '../lib/icons'
import { BUDGET_EXPENSE_GROUPS, getBudgetCategories, splitBudgetSelectors } from '../lib/budgets'

export interface BudgetDetail {
  id: string
  label: string
  amount: number
}

export function BudgetRow({ budget, details = [], onEdit, onDelete }: { budget: Budget; details?: BudgetDetail[]; onEdit?: () => void; onDelete?: () => void }) {
  const { t, language, categories, updateBudget } = useApp()
  const categoryLabel = (slug: string) => {
    const expenseGroup = BUDGET_EXPENSE_GROUPS.find((item) => item.id === slug)
    return expenseGroup ? t(expenseGroup.labelKey) : categories.find((item) => item.type === 'expense' && item.slug === slug)?.name || t(slug as Parameters<typeof t>[0])
  }
  const includedCategories = getBudgetCategories(budget)
  const selectors = splitBudgetSelectors(budget)
  const includedExpenseGroupLabels = [...new Set(BUDGET_EXPENSE_GROUPS.filter((item) => selectors.expenseGroups.includes(item.group)).map((item) => t(item.labelKey)))]
  const includedCategoryLabels = [...new Set(selectors.categories.map(categoryLabel))]
  const categoryName = includedCategories.length === 1 ? categoryLabel(includedCategories[0]) : t('expenses')
  const displayName = capitalizeFirst(budget.name || categoryName, language)
  const saveBudget = (changes: Partial<Pick<Budget, 'name' | 'limit' | 'note'>>) => updateBudget(budget.id, { name: changes.name ?? budget.name, category: budget.category, categories: includedCategories, limit: changes.limit ?? budget.limit, color: budget.color, note: changes.note ?? budget.note, icon: budget.icon })
  const actualPercentage = (budget.spent / budget.limit) * 100
  const percentage = Math.min(actualPercentage, 100)
  const isOverBudget = actualPercentage > 100
  const overBudgetPercentage = Math.min(actualPercentage - 100, 100)
  const Icon = iconById[budget.icon || 'other']
  return (
    <div className="budget-row">
      <div className="budget-row__head"><strong className="budget-row__name"><Icon size={15}/><InlineEditableText value={budget.name || displayName} display={displayName} label={t('budgetName')} onSave={(name) => saveBudget({ name })}/></strong><span>{formatCurrency(budget.spent, language)} / <InlineEditableAmount value={budget.limit} language={language} label={t('budgetAmount')} onSave={(limit) => saveBudget({ limit })}/> {onEdit && <button className="inline-edit-button" type="button" onClick={onEdit} aria-label={t('edit')}><Pencil size={13}/></button>}{onDelete && <button className="delete-button" type="button" onClick={onDelete} aria-label={t('delete')}><Trash2 size={13}/></button>}</span></div>
      <div className="budget-row__progress" tabIndex={details.length ? 0 : undefined} aria-label={`${displayName}: ${formatCurrency(budget.spent, language)}`}>
        <div className={`progress${isOverBudget ? ' progress--over-budget' : ''}`}><span style={{ width: `${percentage}%`, background: budget.color }} />{isOverBudget && <span className="progress__overage" style={{ width: `${overBudgetPercentage}%`, background: `color-mix(in srgb, ${budget.color} 62%, #000)` }} />}</div>
        {details.length > 0 && <div className="budget-row__tooltip" role="tooltip">
          <strong>{displayName}</strong>
          <span>{formatCurrency(budget.spent, language)}</span>
          {includedExpenseGroupLabels.length > 0 && <p><small>{t('expenseTypes')}</small><span>{includedExpenseGroupLabels.map((item) => <b key={item}>{item}</b>)}</span></p>}
          {includedCategoryLabels.length > 0 && <p><small>{t('specificCategories')}</small><span>{includedCategoryLabels.map((item) => <b key={item}>{item}</b>)}</span></p>}
          <div>{details.map((item) => <div key={item.id}><span>{item.label}</span><b>{formatCurrency(item.amount, language)}</b></div>)}</div>
        </div>}
      </div>
      <p className="budget-row__note"><InlineEditableText value={budget.note} display={budget.note || t('addComment')} label={t('budgetNote')} maxLength={1000} onSave={(note) => saveBudget({ note })}/></p>
      <span className="budget-row__percent">{Math.round(actualPercentage)}%</span>
    </div>
  )
}
