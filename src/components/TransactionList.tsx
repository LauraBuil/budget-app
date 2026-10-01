import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCurrency, formatDate } from '../lib/format'
import type { Transaction } from '../types'

export function TransactionList({ transactions, limit }: { transactions: Transaction[]; limit?: number }) {
  const { language, t } = useApp()
  const translatedLabels: Record<string, Parameters<typeof t>[0]> = { Salaire: 'salary', Loyer: 'rent', Courses: 'groceries', Restaurant: 'dining', Transport: 'transport' }
  return (
    <div className="transaction-list">
      {transactions.slice(0, limit).map((item) => (
        <article className="transaction-item" key={item.id}>
          <div className={`transaction-icon transaction-icon--${item.type}`}>{item.type === 'income' ? <ArrowDownLeft /> : <ArrowUpRight />}</div>
          <div className="transaction-item__label"><strong>{translatedLabels[item.label] ? t(translatedLabels[item.label]) : item.label}</strong><span>{formatDate(item.date, language)} · {item.category === 'income' ? t('income') : t(item.category as Parameters<typeof t>[0])}</span></div>
          <strong className={`transaction-amount transaction-amount--${item.type}`}>{item.type === 'income' ? '+' : '−'} {formatCurrency(item.amount, language)}</strong>
        </article>
      ))}
    </div>
  )
}
