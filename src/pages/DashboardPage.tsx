import { localDate } from '../lib/months'
import { ArrowUpRight, CircleDollarSign, Landmark, PiggyBank, Plus, TrendingDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BudgetRow } from '../components/BudgetRow'
import { CategoryBreakdownChart } from '../components/CategoryBreakdownChart'
import { InlineEditableName } from '../components/profile/InlineEditableName'
import { FinancialChart } from '../components/FinancialChart'
import { TransactionList } from '../components/TransactionList'
import { TransactionModal } from '../components/TransactionModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { MonthPicker } from '../components/ui/MonthPicker'
import { useApp } from '../context/AppContext'
import { formatCurrency, formatDate } from '../lib/format'
import { formatMonth, shiftMonth } from '../lib/months'
import { MonthlyBalanceCard } from '../components/MonthlyBalanceCard'
import { DashboardDetailModal } from '../components/DashboardDetailModal'
import { InlineEditableText } from '../components/ui/InlineEditableText'
import { getCategoryTotalsForRange, getFinancialHistoryForRange } from '../lib/financialData'

export function DashboardPage() {
  const { data, t, language, user, updateDisplayName, refreshTransactions, categories, updateGoal } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState<'income' | 'expense' | 'savings' | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(() => localDate().slice(0, 7))
  const [analysisStart, setAnalysisStart] = useState(() => shiftMonth(localDate().slice(0, 7), -5))
  const [analysisEnd, setAnalysisEnd] = useState(() => localDate().slice(0, 7))
  const [openingBalance, setOpeningBalance] = useState(0)
  const analysisPeriod = analysisStart <= analysisEnd ? { start: analysisStart, end: analysisEnd } : { start: analysisEnd, end: analysisStart }
  const loadedPeriod = { start: analysisPeriod.start < selectedMonth ? analysisPeriod.start : selectedMonth, end: analysisPeriod.end > selectedMonth ? analysisPeriod.end : selectedMonth }
  useEffect(() => { void refreshTransactions(loadedPeriod.start, loadedPeriod.end) }, [loadedPeriod.end, loadedPeriod.start, refreshTransactions])
  const monthTransactions = useMemo(() => data.transactions.filter((item) => item.date.startsWith(selectedMonth)), [data.transactions, selectedMonth])
  const today = localDate()
  const passedTransactions = useMemo(() => monthTransactions.filter((item) => item.date <= today), [monthTransactions, today])
  const totals = useMemo(() => {
    const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    const currentIncome = passedTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const currentExpenses = passedTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    const savings = data.goals.reduce((sum, goal) => sum + goal.saved, 0)
    return { income, expenses, savings, balance: openingBalance + currentIncome - currentExpenses, forecastBalance: openingBalance + income - expenses }
  }, [data, monthTransactions, passedTransactions, openingBalance])
  const history = useMemo(() => getFinancialHistoryForRange(data.transactions, analysisPeriod.start, analysisPeriod.end, language), [data.transactions, analysisPeriod.end, analysisPeriod.start, language])
  const expenseByCategory = useMemo(() => getCategoryTotalsForRange(data.transactions, data.budgets, selectedMonth, selectedMonth, 'expense'), [data.budgets, data.transactions, selectedMonth])
  const incomeByCategory = useMemo(() => getCategoryTotalsForRange(data.transactions, data.budgets, selectedMonth, selectedMonth, 'income'), [data.budgets, data.transactions, selectedMonth])
  const expenseDetails = useMemo(() => monthTransactions.filter((item) => item.type === 'expense'), [monthTransactions])
  const incomeDetails = useMemo(() => monthTransactions.filter((item) => item.type === 'income'), [monthTransactions])
  const carryOver = totals.forecastBalance
  const categoryName = (slug: string) => categories.find((category) => category.slug === slug)?.name || t(slug as Parameters<typeof t>[0])

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div><span className="eyebrow">{formatMonth(selectedMonth, language)}</span><h1>{t('hello')} <InlineEditableName name={user?.displayName || ''} ariaLabel={t('editName')} onSave={updateDisplayName} /> !</h1><p>{t('welcome')}</p></div>
        <div className="page-header__actions"><MonthPicker value={selectedMonth} language={language} onChange={(month) => { setSelectedMonth(month); setAnalysisStart(shiftMonth(month, -5)); setAnalysisEnd(month) }}/><Button onClick={() => setModalOpen(true)} icon={<Plus size={17}/>}>{t('addTransaction')}</Button></div>
      </header>
      <MonthlyBalanceCard key={selectedMonth} month={selectedMonth} income={passedTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)} expenses={passedTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)} onChange={setOpeningBalance}/>
      <section className="stats-grid">
        <Card className="stat-card stat-card--balance"><span className="stat-icon"><CircleDollarSign /></span><div><span>{t('currentBalance')}</span><strong>{formatCurrency(totals.balance, language)}</strong><small>{formatDate(today, language)}</small></div></Card>
        <Card className="stat-card"><span className="stat-icon stat-icon--gold"><ArrowUpRight /></span><div><span>{t('forecastBalance')}</span><strong>{formatCurrency(totals.forecastBalance, language)}</strong><small>{formatMonth(selectedMonth, language)}</small></div></Card>
        <button type="button" className="card stat-card stat-card--interactive" onClick={() => setDetail('income')}><span className="stat-icon stat-icon--olive"><Landmark /></span><div><span>{t('income')}</span><strong>{formatCurrency(totals.income, language)}</strong><small>{formatMonth(selectedMonth, language)}</small></div></button>
        <button type="button" className="card stat-card stat-card--interactive" onClick={() => setDetail('expense')}><span className="stat-icon stat-icon--rose"><TrendingDown /></span><div><span>{t('expenses')}</span><strong>{formatCurrency(totals.expenses, language)}</strong><small>{formatMonth(selectedMonth, language)}</small></div></button>
        <button type="button" className="card stat-card stat-card--interactive" onClick={() => setDetail('savings')}><span className="stat-icon stat-icon--gold"><PiggyBank /></span><div><span>{t('savings')}</span><strong>{formatCurrency(totals.savings, language)}</strong><small>{data.goals.length} {t('goals').toLowerCase()}</small></div></button>
      </section>
      <section className="dashboard-top-grid">
        <Card className="panel panel--chart"><div className="panel__header dashboard-chart__header"><h2>{t('overview')}</h2><div className="analytics-period"><label>{t('startMonth')}<input type="month" value={analysisStart} onChange={(event) => setAnalysisStart(event.target.value)} /></label><label>{t('endMonth')}<input type="month" value={analysisEnd} onChange={(event) => setAnalysisEnd(event.target.value)} /></label></div></div><FinancialChart data={history} language={language} labels={{ income: t('income'), expense: t('expenses') }}/><div className="legend dashboard-chart__legend"><span className="legend--income">{t('income')}</span><span className="legend--expense">{t('expenses')}</span></div></Card>
        <div className="dashboard-insights"><section className="dashboard-insights__charts"><Card className="panel analytics-category-chart"><div className="panel__header"><h2>{t('expenseByCategory')}</h2></div><CategoryBreakdownChart data={expenseByCategory} details={expenseDetails} language={language} categoryName={categoryName} centerLabel={t('expenses')} /></Card><Card className="panel analytics-category-chart"><div className="panel__header"><h2>{t('incomeByCategory')}</h2></div><CategoryBreakdownChart data={incomeByCategory} details={incomeDetails} language={language} categoryName={categoryName} centerLabel={t('income')} /></Card></section><Card className="panel dashboard-comparison"><h2>{t('comparison')}</h2><p>{t('carryOver')} <strong className={carryOver < 0 ? 'is-negative' : ''}>{carryOver >= 0 ? '+' : ''}{formatCurrency(carryOver, language)}</strong></p></Card></div>
      </section>
      <section className="dashboard-grid">
        <Card className="panel"><div className="panel__header"><h2>{t('monthlyBudgets')}</h2><Link to="/budgets">{t('seeAll')}</Link></div><div className="budget-list">{data.budgets.map((budget) => <BudgetRow key={budget.id} budget={{ ...budget, spent: monthTransactions.filter((item) => item.type === 'expense' && (item.category === budget.category || (budget.category === 'non-essential' && item.expenseGroup === 'nonEssential'))).reduce((sum, item) => sum + item.amount, 0) }}/>)}</div></Card>
        <Card className="panel"><div className="panel__header"><h2>{t('recentTransactions')}</h2><Link to="/transactions">{t('seeAll')}</Link></div><TransactionList transactions={monthTransactions} limit={4}/></Card>
        <Card className="panel goals-panel"><div className="panel__header"><h2>{t('myGoals')}</h2><Link to="/goals">{t('seeAll')}</Link></div>{data.goals.map((goal) => { const progress = Math.round((goal.saved / goal.target) * 100); return <div className="goal-mini" key={goal.id}><div><strong><InlineEditableText value={goal.name} display={t(goal.name as Parameters<typeof t>[0])} label={t('goalName')} onSave={(name) => updateGoal(goal.id, { name, target: goal.target, saved: goal.saved, dueDate: goal.dueDate, icon: goal.icon })}/></strong><span>{formatCurrency(goal.saved, language)} / {formatCurrency(goal.target, language)}</span></div><div className="progress"><span style={{ width: `${progress}%` }}/></div><b>{progress}%</b></div>})}</Card>
      </section>
      <TransactionModal initialDate={selectedMonth === today.slice(0, 7) ? today : `${selectedMonth}-01`} open={modalOpen} onClose={() => setModalOpen(false)}/>
      <DashboardDetailModal kind={detail} transactions={monthTransactions} goals={data.goals} onClose={() => setDetail(null)}/>
    </div>
  )
}
