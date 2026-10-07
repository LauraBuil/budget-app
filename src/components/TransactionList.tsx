import { ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/format'
import { transactionDraftWithAmount, transactionDraftWithLabel } from '../lib/transactionDraft'
import type { Transaction } from '../types'
import { InlineEditableAmount } from './ui/InlineEditableAmount'
import { InlineEditableText } from './ui/InlineEditableText'

export function TransactionList({ transactions, limit, onDelete }: { transactions: Transaction[]; limit?: number; onDelete?: (id: string) => void }) {
  const { language, t, categories, updateTransaction } = useApp()
  const translatedLabels: Record<string, Parameters<typeof t>[0]> = { Salaire: 'salary', Loyer: 'rent', Courses: 'groceries', Restaurant: 'dining', Transport: 'transport' }
  return (
    <div className="transaction-list">
      {transactions.slice(0, limit).map((item) => (
        <article className="transaction-item" key={item.id}>
          <div className={`transaction-icon transaction-icon--${item.type}`}>{item.type === 'income' ? <ArrowDownLeft /> : <ArrowUpRight />}</div>
          <div className="transaction-item__label"><strong><InlineEditableText value={item.label} display={translatedLabels[item.label] ? t(translatedLabels[item.label]) : item.label} label={t('description')} onSave={(label) => updateTransaction(item.id, transactionDraftWithLabel(item, label))}/></strong><span>{formatDate(item.date, language)} · {item.category === 'income' ? t('income') : categories.find((category) => category.slug === item.category)?.name || t(item.category as Parameters<typeof t>[0])}{item.isRecurring ? ` · ${t('recurring')}` : ''}</span></div>
          <div className="transaction-item__actions"><strong className={`transaction-amount transaction-amount--${item.type}`}>{item.type === 'income' ? '+' : '−'} <InlineEditableAmount value={item.amount} language={language} label={t('amount')} onSave={(amount) => updateTransaction(item.id, transactionDraftWithAmount(item, amount))}/></strong>{onDelete && <button className="delete-button" type="button" onClick={() => onDelete(item.id)} aria-label={t('delete')}><Trash2 size={15}/></button>}</div>
        </article>
      ))}
    </div>
  )
}
