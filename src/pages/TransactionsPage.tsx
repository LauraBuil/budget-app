import { Plus, Search } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { TransactionList } from '../components/TransactionList'
import { TransactionModal } from '../components/TransactionModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { PageBlock, PageBlockSelector, usePageBlocks } from '../components/ui/PageBlocks'
import { MonthlyBalanceCard } from '../components/MonthlyBalanceCard'
import { MonthPicker } from '../components/ui/MonthPicker'

export function TransactionsPage() {
  const { data, t, deleteTransaction, language, refreshTransactions } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const deferredSearch = useDeferredValue(search)
  const [open, setOpen] = useState(false)
  const blocks = usePageBlocks('transactions', [{ id: 'list', label: 'transactionList' }])
  const [startMonth, setStartMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [endMonth, setEndMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const period = startMonth <= endMonth ? { start: startMonth, end: endMonth } : { start: endMonth, end: startMonth }
  useEffect(() => { void refreshTransactions(period.start, period.end, { type: filter, search: deferredSearch }) }, [deferredSearch, filter, period.end, period.start, refreshTransactions])
  const monthTransactions = useMemo(() => data.transactions.filter((item) => item.date.slice(0, 7) >= period.start && item.date.slice(0, 7) <= period.end), [data.transactions, period.end, period.start])
  const filtered = monthTransactions
  const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  const showFullYear = () => { const year = period.end.slice(0, 4); setStartMonth(`${year}-01`); setEndMonth(`${year}-12`) }
  return <div className="page"><header className="page-header"><div><span className="eyebrow"><MonthPicker value={period.end} language={language} onChange={(nextMonth) => { setStartMonth(nextMonth); setEndMonth(nextMonth) }}/></span><h1>{t('transactions')}</h1><p>{filtered.length} {t('operations')}</p></div><div className="page-header__actions"><PageBlockSelector controller={blocks}/><Button onClick={() => setOpen(true)} icon={<Plus size={17}/>}>{t('addTransaction')}</Button></div></header><div className="transaction-period"><label>{t('startMonth')}<input type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} /></label><label>{t('endMonth')}<input type="month" value={endMonth} onChange={(event) => setEndMonth(event.target.value)} /></label><Button variant="secondary" onClick={showFullYear}>{t('viewFullYear')}</Button></div><MonthlyBalanceCard month={period.end} income={income} expenses={expenses}/>{blocks.isVisible('list') && <PageBlock><Card className="panel table-panel"><div className="toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('search')}/></div><div className="filter-pills"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t('all')}</button><button className={filter === 'income' ? 'active' : ''} onClick={() => setFilter('income')}>{t('income')}</button><button className={filter === 'expense' ? 'active' : ''} onClick={() => setFilter('expense')}>{t('expenses')}</button></div></div><TransactionList transactions={filtered} onDelete={deleteTransaction}/></Card></PageBlock>}<TransactionModal open={open} onClose={() => setOpen(false)} initialDate={`${period.end}-01`}/></div>
}
