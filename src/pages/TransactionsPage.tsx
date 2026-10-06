import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const blocks = usePageBlocks('transactions', [{ id: 'list', label: 'transactionList' }])
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  useEffect(() => { void refreshTransactions(month) }, [month, refreshTransactions])
  const monthTransactions = useMemo(() => data.transactions.filter((item) => item.date.startsWith(month)), [data.transactions, month])
  const filtered = useMemo(() => monthTransactions.filter((item) => (filter === 'all' || item.type === filter) && item.label.toLowerCase().includes(search.toLowerCase())), [monthTransactions, filter, search])
  const income = monthTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
  const expenses = monthTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
  return <div className="page"><header className="page-header"><div><span className="eyebrow"><MonthPicker value={month} language={language} onChange={setMonth}/></span><h1>{t('transactions')}</h1><p>{filtered.length} {t('operations')}</p></div><div className="page-header__actions"><PageBlockSelector controller={blocks}/><Button onClick={() => setOpen(true)} icon={<Plus size={17}/>}>{t('addTransaction')}</Button></div></header><MonthlyBalanceCard month={month} income={income} expenses={expenses}/>{blocks.isVisible('list') && <PageBlock><Card className="panel table-panel"><div className="toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('search')}/></div><div className="filter-pills"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t('all')}</button><button className={filter === 'income' ? 'active' : ''} onClick={() => setFilter('income')}>{t('income')}</button><button className={filter === 'expense' ? 'active' : ''} onClick={() => setFilter('expense')}>{t('expenses')}</button></div></div><TransactionList transactions={filtered} onDelete={(id) => void deleteTransaction(id)}/></Card></PageBlock>}<TransactionModal open={open} onClose={() => setOpen(false)} initialDate={`${month}-01`}/></div>
}
