import { ArrowUpRight, CalendarRange, CircleDollarSign, Landmark, PiggyBank, Plus, TrendingDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BudgetRow } from '../components/BudgetRow'
import { FinancialChart } from '../components/FinancialChart'
import { TransactionList } from '../components/TransactionList'
import { TransactionModal } from '../components/TransactionModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatCurrency, localizeMonthPoints } from '../lib/format'

export function DashboardPage() {
  const { data, t, language, user, isDemo } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const totals = useMemo(() => {
    const income = data.transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expenses = data.transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    const savings = data.goals.reduce((sum, goal) => sum + goal.saved, 0)
    return { income, expenses, savings, balance: income - expenses }
  }, [data])
  const categories = data.budgets.map((item) => ({ ...item, percentage: Math.round((item.spent / data.budgets.reduce((sum, budget) => sum + budget.spent, 0)) * 100) }))

  return (
    <div className="page dashboard-page">
      <header className="page-header">
        <div><span className="eyebrow">{t('october2026')}</span><h1>{t('hello')} {user?.displayName} !</h1><p>{t('welcome')}</p></div>
        <div className="page-header__actions"><button className="month-button"><CalendarRange size={17}/> {t('october2026')}</button><Button onClick={() => setModalOpen(true)} icon={<Plus size={17}/>}>{t('addTransaction')}</Button></div>
      </header>
      {isDemo && <div className="notice">{t('demoNotice')}</div>}
      <section className="stats-grid">
        <Card className="stat-card stat-card--balance"><span className="stat-icon"><CircleDollarSign /></span><div><span>{t('currentBalance')}</span><strong>{formatCurrency(totals.balance, language)}</strong><small><ArrowUpRight size={13}/> {t('growthMonth')}</small></div></Card>
        <Card className="stat-card"><span className="stat-icon stat-icon--olive"><Landmark /></span><div><span>{t('income')}</span><strong>{formatCurrency(totals.income, language)}</strong><small>{t('october2026')}</small></div></Card>
        <Card className="stat-card"><span className="stat-icon stat-icon--rose"><TrendingDown /></span><div><span>{t('expenses')}</span><strong>{formatCurrency(totals.expenses, language)}</strong><small>{t('october2026')}</small></div></Card>
        <Card className="stat-card"><span className="stat-icon stat-icon--gold"><PiggyBank /></span><div><span>{t('savings')}</span><strong>{formatCurrency(totals.savings, language)}</strong><small>{data.goals.length} {t('goals').toLowerCase()}</small></div></Card>
      </section>
      <section className="dashboard-grid">
        <Card className="panel panel--chart"><div className="panel__header"><div><h2>{t('overview')}</h2><div className="legend"><span className="legend--income">{t('income')}</span><span className="legend--expense">{t('expenses')}</span></div></div><select aria-label={t('period')}><option>{t('sixMonths')}</option></select></div><FinancialChart data={localizeMonthPoints(data.history, language)}/></Card>
        <Card className="panel panel--donut"><div className="panel__header"><h2>{t('spendingByCategory')}</h2></div><div className="donut-layout"><div className="donut" style={{ background: `conic-gradient(${categories.map((item, index) => `${item.color} ${categories.slice(0,index).reduce((sum,c)=>sum+c.percentage,0)}% ${categories.slice(0,index+1).reduce((sum,c)=>sum+c.percentage,0)}%`).join(',')})` }}><div><strong>{formatCurrency(totals.expenses, language)}</strong><span>{t('thisMonth').toLowerCase()}</span></div></div><div className="category-legend">{categories.map((item) => <div key={item.id}><span style={{ background: item.color }}/><span>{t(item.category as Parameters<typeof t>[0])}</span><strong>{item.percentage}%</strong></div>)}</div></div></Card>
        <Card className="panel"><div className="panel__header"><h2>{t('monthlyBudgets')}</h2><Link to="/budgets">{t('seeAll')}</Link></div><div className="budget-list">{data.budgets.map((budget) => <BudgetRow key={budget.id} budget={budget}/>)}</div></Card>
        <Card className="panel"><div className="panel__header"><h2>{t('recentTransactions')}</h2><Link to="/transactions">{t('seeAll')}</Link></div><TransactionList transactions={data.transactions} limit={4}/></Card>
        <Card className="panel goals-panel"><div className="panel__header"><h2>{t('myGoals')}</h2><Link to="/goals">{t('seeAll')}</Link></div>{data.goals.map((goal) => { const progress = Math.round((goal.saved / goal.target) * 100); return <div className="goal-mini" key={goal.id}><div><strong>{t(goal.name as Parameters<typeof t>[0])}</strong><span>{formatCurrency(goal.saved, language)} / {formatCurrency(goal.target, language)}</span></div><div className="progress"><span style={{ width: `${progress}%` }}/></div><b>{progress}%</b></div>})}</Card>
      </section>
      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)}/>
    </div>
  )
}
