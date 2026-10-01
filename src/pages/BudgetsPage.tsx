import { BudgetRow } from '../components/BudgetRow'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'

export function BudgetsPage() {
  const { data, t, language } = useApp()
  const spent = data.budgets.reduce((sum, item) => sum + item.spent, 0)
  const limit = data.budgets.reduce((sum, item) => sum + item.limit, 0)
  return <div className="page"><header className="page-header"><div><span className="eyebrow">{t('october2026')}</span><h1>{t('budgets')}</h1><p>{t('budgetVsActual')}</p></div></header><section className="budget-summary"><Card><span>{t('spent')}</span><strong>{formatCurrency(spent, language)}</strong></Card><Card><span>{t('remaining')}</span><strong>{formatCurrency(limit - spent, language)}</strong></Card><Card><span>{t('totalBudget')}</span><strong>{formatCurrency(limit, language)}</strong></Card></section><Card className="panel"><div className="panel__header"><h2>{t('monthlyBudgets')}</h2><span>{Math.round((spent / limit) * 100)}%</span></div><div className="budget-list budget-list--large">{data.budgets.map((budget) => <BudgetRow key={budget.id} budget={budget}/>)}</div></Card></div>
}
