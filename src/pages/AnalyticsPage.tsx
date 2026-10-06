import { FinancialChart } from '../components/FinancialChart'
import { Card } from '../components/ui/Card'
import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'
import { getCategoryTotals, getFinancialHistory } from '../lib/financialData'

export function AnalyticsPage() {
  const { data, t, language, categories } = useApp()
  const month = new Date().toISOString().slice(0, 7)
  const history = useMemo(() => getFinancialHistory(data.transactions, month, language), [data.transactions, month, language])
  const totals = useMemo(() => getCategoryTotals(data.transactions, data.budgets, month), [data.transactions, data.budgets, month])
  const categoryName = (slug: string) => categories.find((category) => category.slug === slug)?.name || t(slug as Parameters<typeof t>[0])
  return <div className="page"><header className="page-header"><div><h1>{t('analytics')}</h1><p>{t('cashFlow')}</p></div></header><Card className="panel analytics-chart"><div className="panel__header"><h2>{t('overview')}</h2><span>{t('sixMonths')}</span></div><FinancialChart data={history}/></Card><section className="analysis-grid">{totals.map((item) => <Card className="analysis-category" key={item.category}><span className="analysis-category__dot" style={{ background: item.color }}/><div><span>{categoryName(item.category)}</span><strong>{formatCurrency(item.amount, language)}</strong></div><b>{item.percentage}%</b></Card>)}</section></div>
}
