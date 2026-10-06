import { BudgetRow } from '../components/BudgetRow'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'
import { Button } from '../components/ui/Button'
import { BudgetModal } from '../components/BudgetModal'
import { useState } from 'react'
import type { Budget } from '../types'
import { PageBlock, PageBlockSelector, usePageBlocks } from '../components/ui/PageBlocks'

export function BudgetsPage() {
  const { data, t, language, deleteBudget } = useApp()
  const [editing, setEditing] = useState<Budget | undefined>()
  const [open, setOpen] = useState(false)
  const blocks = usePageBlocks('budgets', [{ id: 'summary', label: 'budgetSummary' }, { id: 'list', label: 'monthlyBudgets' }])
  const spent = data.budgets.reduce((sum, item) => sum + item.spent, 0)
  const limit = data.budgets.reduce((sum, item) => sum + item.limit, 0)
  return <div className="page"><header className="page-header"><div><span className="eyebrow">{t('october2026')}</span><h1>{t('budgets')}</h1><p>{t('budgetVsActual')}</p></div><div className="page-header__actions"><PageBlockSelector controller={blocks}/><Button onClick={() => { setEditing(undefined); setOpen(true) }}>{t('addBudget')}</Button></div></header>{blocks.isVisible('summary') && <PageBlock><section className="budget-summary"><Card><span>{t('spent')}</span><strong>{formatCurrency(spent, language)}</strong></Card><Card><span>{t('remaining')}</span><strong>{formatCurrency(limit - spent, language)}</strong></Card><Card><span>{t('variance')}</span><strong>{formatCurrency(spent - limit, language)}</strong></Card><Card><span>{t('totalBudget')}</span><strong>{formatCurrency(limit, language)}</strong></Card></section></PageBlock>}{blocks.isVisible('list') && <PageBlock><Card className="panel"><div className="panel__header"><h2>{t('monthlyBudgets')}</h2><span>{limit ? Math.round((spent / limit) * 100) : 0}%</span></div><div className="budget-list budget-list--large">{data.budgets.map((budget) => <BudgetRow key={budget.id} budget={budget} onEdit={() => { setEditing(budget); setOpen(true) }} onDelete={() => void deleteBudget(budget.id)}/>)}</div></Card></PageBlock>}<BudgetModal open={open} budget={editing} onClose={() => setOpen(false)}/></div>
}
