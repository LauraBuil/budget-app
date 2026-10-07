import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/format'
import { transactionDraftWithAmount, transactionDraftWithLabel } from '../lib/transactionDraft'
import type { Transaction } from '../types'
import { Button } from './ui/Button'
import { InlineEditableAmount } from './ui/InlineEditableAmount'
import { InlineEditableText } from './ui/InlineEditableText'

interface CalendarDayModalProps {
  date: string | null
  transactions: Transaction[]
  onClose: () => void
  onAdd: () => void
  onEdit: (transaction: Transaction) => void
}

export function CalendarDayModal({ date, transactions, onClose, onAdd, onEdit }: CalendarDayModalProps) {
  const { t, language, deleteTransaction, updateTransaction } = useApp()
  if (!date) return null

  return <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal calendar-day-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-day-title">
      <header><div><h2 id="calendar-day-title">{t('calendarDay')}</h2><p>{formatDate(date, language)}</p></div><button onClick={onClose} aria-label={t('close')}><X size={20}/></button></header>
      <div className="calendar-day-modal__list">
        {transactions.length === 0 && <p className="calendar-day-modal__empty">{t('noTransactionsOnDate')}</p>}
        {transactions.map((transaction) => <article key={transaction.id} className="calendar-day-modal__item"><div><strong><InlineEditableText value={transaction.label} label={t('description')} onSave={(label) => updateTransaction(transaction.id, transactionDraftWithLabel(transaction, label))}/></strong><span>{transaction.type === 'income' ? t('income') : t('expense')}</span></div><div><b className={`transaction-amount transaction-amount--${transaction.type}`}>{transaction.type === 'income' ? '+' : '−'} <InlineEditableAmount value={transaction.amount} language={language} label={t('amount')} onSave={(amount) => updateTransaction(transaction.id, transactionDraftWithAmount(transaction, amount))}/></b><button type="button" onClick={() => onEdit(transaction)} aria-label={t('edit')}><Pencil size={15}/></button><button type="button" onClick={() => void deleteTransaction(transaction.id)} aria-label={t('delete')}><Trash2 size={15}/></button></div></article>)}
      </div>
      <div className="modal__actions"><Button type="button" onClick={onAdd} icon={<Plus size={17}/>}>{t('add')}</Button></div>
    </section>
  </div>
}
