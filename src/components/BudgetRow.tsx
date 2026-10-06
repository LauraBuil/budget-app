import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'
import { Pencil, Trash2 } from 'lucide-react'
import type { Budget } from '../types'
import { InlineEditableAmount } from './ui/InlineEditableAmount'

export function BudgetRow({ budget, onEdit, onDelete }: { budget: Budget; onEdit?: () => void; onDelete?: () => void }) {
  const { t, language, updateBudget } = useApp()
  const percentage = Math.min((budget.spent / budget.limit) * 100, 100)
  return (
    <div className="budget-row">
      <div className="budget-row__head"><strong>{t(budget.category as Parameters<typeof t>[0])}</strong><span>{formatCurrency(budget.spent, language)} / <InlineEditableAmount value={budget.limit} language={language} label={t('budgetAmount')} onSave={(limit) => updateBudget(budget.id, { category: budget.category, limit, color: budget.color })}/> {onEdit && <button className="inline-edit-button" type="button" onClick={onEdit} aria-label={t('edit')}><Pencil size={13}/></button>}{onDelete && <button className="delete-button" type="button" onClick={onDelete} aria-label={t('delete')}><Trash2 size={13}/></button>}</span></div>
      <div className="progress"><span style={{ width: `${percentage}%`, background: budget.color }} /></div>
      <span className="budget-row__percent">{Math.round(percentage)}%</span>
    </div>
  )
}
