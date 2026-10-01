import { FinancialChart } from '../components/FinancialChart'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatCurrency, localizeMonthPoints } from '../lib/format'

export function AnalyticsPage() {
  const { data, t, language } = useApp()
  const total = data.budgets.reduce((sum, item) => sum + item.spent, 0)
  return <div className="page"><header className="page-header"><div><h1>{t('analytics')}</h1><p>{t('cashFlow')}</p></div></header><Card className="panel analytics-chart"><div className="panel__header"><h2>{t('overview')}</h2><span>{t('sixMonths')}</span></div><FinancialChart data={localizeMonthPoints(data.history, language)}/></Card><section className="analysis-grid">{data.budgets.map((item) => <Card className="analysis-category" key={item.id}><span className="analysis-category__dot" style={{ background: item.color }}/><div><span>{t(item.category as Parameters<typeof t>[0])}</span><strong>{formatCurrency(item.spent, language)}</strong></div><b>{Math.round((item.spent / total) * 100)}%</b></Card>)}</section></div>
}
