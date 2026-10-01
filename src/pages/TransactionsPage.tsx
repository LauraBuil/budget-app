import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TransactionList } from '../components/TransactionList'
import { TransactionModal } from '../components/TransactionModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'

export function TransactionsPage() {
  const { data, t } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => data.transactions.filter((item) => (filter === 'all' || item.type === filter) && item.label.toLowerCase().includes(search.toLowerCase())), [data.transactions, filter, search])
  return <div className="page"><header className="page-header"><div><span className="eyebrow">{t('october2026')}</span><h1>{t('transactions')}</h1><p>{filtered.length} {t('operations')}</p></div><Button onClick={() => setOpen(true)} icon={<Plus size={17}/>}>{t('addTransaction')}</Button></header><Card className="panel table-panel"><div className="toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('search')}/></div><div className="filter-pills"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t('all')}</button><button className={filter === 'income' ? 'active' : ''} onClick={() => setFilter('income')}>{t('income')}</button><button className={filter === 'expense' ? 'active' : ''} onClick={() => setFilter('expense')}>{t('expenses')}</button></div></div><TransactionList transactions={filtered}/></Card><TransactionModal open={open} onClose={() => setOpen(false)}/></div>
}
