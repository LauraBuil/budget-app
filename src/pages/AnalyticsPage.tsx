import { useEffect, useMemo, useState } from 'react'
import { CategoryBreakdownChart } from '../components/CategoryBreakdownChart'
import { FinancialChart } from '../components/FinancialChart'
import { PeriodComparisonChart } from '../components/PeriodComparisonChart'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'
import { getCategoryTotalsForRange, getFinancialHistoryForRange, getPeriodComparison } from '../lib/financialData'
import { shiftMonth } from '../lib/months'

export function AnalyticsPage() {
  const { data, t, language, categories, refreshTransactions } = useApp()
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [startMonth, setStartMonth] = useState(() => shiftMonth(currentMonth, -5))
  const [endMonth, setEndMonth] = useState(currentMonth)
  const period = startMonth <= endMonth ? { start: startMonth, end: endMonth } : { start: endMonth, end: startMonth }
  useEffect(() => { void refreshTransactions(period.start, period.end) }, [period.end, period.start, refreshTransactions])
  const history = useMemo(() => getFinancialHistoryForRange(data.transactions, period.start, period.end, language), [data.transactions, period.start, period.end, language])
  const expenses = useMemo(() => getCategoryTotalsForRange(data.transactions, data.budgets, period.start, period.end, 'expense'), [data.transactions, data.budgets, period.start, period.end])
  const income = useMemo(() => getCategoryTotalsForRange(data.transactions, data.budgets, period.start, period.end, 'income'), [data.transactions, data.budgets, period.start, period.end])
  const comparison = useMemo(() => getPeriodComparison(data.transactions, period.start, period.end), [data.transactions, period.start, period.end])
  const categoryName = (slug: string) => categories.find((category) => category.slug === slug)?.name || t(slug as Parameters<typeof t>[0])

  return (
    <div className="page">
      <header className="page-header"><div><h1>{t('analytics')}</h1><p>{t('cashFlow')}</p></div></header>
      <Card className="panel analytics-chart">
        <div className="panel__header analytics-chart__header"><h2>{t('overview')}</h2><div className="analytics-period"><label>{t('startMonth')}<input type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} /></label><label>{t('endMonth')}<input type="month" value={endMonth} onChange={(event) => setEndMonth(event.target.value)} /></label></div></div>
        <FinancialChart data={history} language={language} labels={{ income: t('income'), expense: t('expenses') }}/>
      </Card>
      <section className="analytics-breakdown-grid">
        <Card className="panel analytics-category-chart"><div className="panel__header"><h2>{t('expenseByCategory')}</h2></div><CategoryBreakdownChart data={expenses} language={language} categoryName={categoryName} centerLabel={t('expenses')} /></Card>
        <Card className="panel analytics-category-chart"><div className="panel__header"><h2>{t('incomeByCategory')}</h2></div><CategoryBreakdownChart data={income} language={language} categoryName={categoryName} centerLabel={t('income')} /></Card>
      </section>
      <Card className="panel analytics-comparison"><div className="panel__header"><div><h2>{t('comparison')}</h2><span>{t('periodBalance')}</span></div><strong className={comparison.balance < 0 ? 'is-negative' : ''}>{formatCurrency(comparison.balance, language)}</strong></div><PeriodComparisonChart data={comparison} language={language} labels={{ income: t('income'), expense: t('expenses'), balance: t('variance') }} /></Card>
    </div>
  )
}
