import { localDate } from '../lib/months'
import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { TransactionList } from '../components/TransactionList'
import { TransactionModal } from '../components/TransactionModal'
import { DeleteTransactionModal } from '../components/transactions/DeleteTransactionModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { MonthlyBalanceCard } from '../components/MonthlyBalanceCard'
import { MonthPicker } from '../components/ui/MonthPicker'
import { CategoryFilter } from '../components/categories/CategoryFilter'
import { ExpenseGroupFilter } from '../components/transactions/ExpenseGroupFilter'
import { getTransactions } from '../lib/api'
import { getPeriodComparison } from '../lib/financialData'
import { formatMonth } from '../lib/months'
import type { Transaction } from '../types'

export function TransactionsPage() {
  const { data, t, language, refreshTransactions } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [expenseGroups, setExpenseGroups] = useState<string[]>([])
  const [sort, setSort] = useState<'asc' | 'desc'>('desc')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction>()
  const [deleting, setDeleting] = useState<Transaction>()
  const [showPeriod, setShowPeriod] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [filtered, setFiltered] = useState<Transaction[]>([])
  const [startMonth, setStartMonth] = useState(() => localDate().slice(0, 7))
  const [endMonth, setEndMonth] = useState(startMonth)
  const period = startMonth <= endMonth ? { start: startMonth, end: endMonth } : { start: endMonth, end: startMonth }
  const categoryKey = categories.join(',')
  const groupKey = expenseGroups.join(',')

  useEffect(() => { void refreshTransactions(period.start, period.end).catch(() => setFailed(true)) }, [period.start, period.end, refreshTransactions])
  useEffect(() => {
    let active = true
    setLoading(true); setFailed(false)
    const timer = window.setTimeout(() => {
      void getTransactions(period.start, period.end, { type: filter, search, categories: categoryKey ? categoryKey.split(',') : [], expenseGroups: groupKey ? groupKey.split(',') : [], sort })
        .then((rows) => { if (active) setFiltered(rows) })
        .catch(() => { if (active) setFailed(true) })
        .finally(() => { if (active) setLoading(false) })
    }, 200)
    return () => { active = false; window.clearTimeout(timer) }
  }, [period.start, period.end, search, filter, categoryKey, groupKey, sort, data.transactions])

  const totals = useMemo(() => getPeriodComparison(data.transactions.filter((item) => item.date <= localDate()), period.end, period.end), [data.transactions, period.end])
  const closeModal = () => { setOpen(false); setEditing(undefined) }
  const edit = (transaction: Transaction) => { setEditing(transaction); setOpen(true) }
  const changeMonth = (month: string) => { setStartMonth(month); setEndMonth(month) }

  return <div className="page transactions-page">
    <header className="page-header">
      <div><span className="eyebrow"><MonthPicker value={period.end} language={language} onChange={changeMonth}/></span><h1>{t('transactions')}</h1><p>{loading ? t('loading') : `${filtered.length} ${t(filtered.length === 1 ? 'operation' : 'operations')}`}</p></div>
      <div className="page-header__actions"><Button onClick={() => { setEditing(undefined); setOpen(true) }} icon={<Plus size={17}/>}>{t('addTransaction')}</Button></div>
    </header>
    <div className="transaction-period-actions"><Button variant="secondary" onClick={() => setShowPeriod(!showPeriod)}>{t('showPeriod')}</Button><Button variant="secondary" onClick={() => { setStartMonth(`${period.end.slice(0,4)}-01`); setEndMonth(`${period.end.slice(0,4)}-12`); setShowPeriod(true) }}>{t('viewFullYear')}</Button></div>
    {showPeriod && <div className="transaction-period"><label>{t('startMonth')}<input type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)}/></label><label>{t('endMonth')}<input type="month" value={endMonth} onChange={(event) => setEndMonth(event.target.value)}/></label></div>}
    <p className="form-hint">{formatMonth(period.end, language)} · {t('balanceMonthHint')}</p>
    <MonthlyBalanceCard key={period.end} month={period.end} income={totals.income} expenses={totals.expense}/>
    <Card className="panel table-panel">
      <div className="toolbar"><div className="search-box"><Search size={17}/><input aria-label={t('searchTransactions')} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('searchTransactions')}/></div><div className="filter-pills">{(['all','income','expense'] as const).map((kind) => <button key={kind} type="button" aria-pressed={filter === kind} className={filter === kind ? 'active' : ''} onClick={() => { setFilter(kind); if (kind === 'income') setExpenseGroups([]) }}>{t(kind === 'expense' ? 'expenses' : kind)}</button>)}</div></div>
      <div className="transaction-filter-row"><ExpenseGroupFilter value={expenseGroups} onChange={(groups) => { setExpenseGroups(groups); if (groups.length && filter === 'income') setFilter('expense') }}/><CategoryFilter value={categories} onChange={setCategories}/><label className="transaction-sort">{t('sortByDate')}<select value={sort} onChange={(event) => setSort(event.target.value as 'asc' | 'desc')}><option value="desc">{t('dateDescending')}</option><option value="asc">{t('dateAscending')}</option></select></label></div>
      <p className="form-hint">{t('inlineEditHint')}</p>
      {(search || categories.length > 0 || expenseGroups.length > 0 || filter !== 'all' || sort !== 'desc') && <button className="inline-edit-button" onClick={() => { setSearch(''); setCategories([]); setExpenseGroups([]); setSort('desc'); setFilter('all') }}>{t('clearFilters')}</button>}
      {failed ? <p role="alert">{t('cannotConnect')}</p> : <div aria-busy={loading} className={loading ? 'transaction-results--loading' : ''}><TransactionList transactions={filtered} onEdit={edit} onDelete={async (id) => setDeleting(filtered.find((item) => item.id === id))}/>{!loading && !filtered.length && <p>{t('noMatchingTransactions')}</p>}</div>}
    </Card>
    <TransactionModal open={open} transaction={editing} onClose={closeModal} initialDate={period.end === localDate().slice(0,7) ? undefined : `${period.end}-01`}/>
    {deleting && <DeleteTransactionModal transaction={deleting} onClose={() => setDeleting(undefined)}/>}
  </div>
}
