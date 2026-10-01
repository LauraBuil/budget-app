import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'
import type { Budget } from '../types'

export function BudgetRow({ budget }: { budget: Budget }) {
  const { t, language } = useApp()
  const percentage = Math.min((budget.spent / budget.limit) * 100, 100)
  return (
    <div className="budget-row">
      <div className="budget-row__head"><strong>{t(budget.category as Parameters<typeof t>[0])}</strong><span>{formatCurrency(budget.spent, language)} / {formatCurrency(budget.limit, language)}</span></div>
      <div className="progress"><span style={{ width: `${percentage}%`, background: budget.color }} /></div>
      <span className="budget-row__percent">{Math.round(percentage)}%</span>
    </div>
  )
}
