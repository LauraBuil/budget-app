import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatDate } from '../lib/format'
import { transactionDraftWithAmount, transactionDraftWithCategory, transactionDraftWithExpenseGroup, transactionDraftWithIcon, transactionDraftWithLabel, transactionDraftWithRecurrence } from '../lib/transactionDraft'
import type { Transaction } from '../types'
import { InlineEditableAmount } from './ui/InlineEditableAmount'
import { InlineEditableText } from './ui/InlineEditableText'
import { InlineEditableIcon } from './ui/InlineEditableIcon'
import { InlineCategoryField } from './categories/InlineCategoryField'
import { InlineExpenseGroup } from './ui/InlineExpenseGroup'
import { RecurrenceToggle } from './ui/RecurrenceToggle'

interface TransactionListProps {
  transactions: Transaction[]
  limit?: number
  onEdit?: (transaction: Transaction) => void
  onDelete?: (id: string) => Promise<void>
}

export function TransactionList({ transactions, limit, onEdit, onDelete }: TransactionListProps) {
  const { language, t, updateTransaction } = useApp()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const translatedLabels: Record<string, Parameters<typeof t>[0]> = { Salaire: 'salary', Loyer: 'rent', Courses: 'groceries', Restaurant: 'dining', Transport: 'transport' }
  const handleDelete = async (id: string) => {
    if (!onDelete || deletingId) return
    setDeletingId(id)
    try { await onDelete(id) } finally { setDeletingId(null) }
  }
  return (
    <div className="transaction-list">
      {transactions.slice(0, limit).map((item) => (
        <article className="transaction-item" key={item.id}>
          <InlineEditableIcon value={item.icon || 'other'} label={t('icon')} className={`transaction-icon transaction-icon--${item.type}`} onSave={(icon) => updateTransaction(item.id, transactionDraftWithIcon(item, icon))}/>
          <div className="transaction-item__label"><strong><InlineEditableText value={item.label} display={translatedLabels[item.label] ? t(translatedLabels[item.label]) : item.label} label={t('description')} onSave={(label) => updateTransaction(item.id, transactionDraftWithLabel(item, label))}/></strong><div className="transaction-item__meta">{formatDate(item.date, language)} · {item.type === 'expense' ? <InlineExpenseGroup value={item.expenseGroup || 'daily'} onChange={(expenseGroup) => updateTransaction(item.id, transactionDraftWithExpenseGroup(item, expenseGroup))}/> : t('income')} · <InlineCategoryField compact type={item.type} expenseGroup={item.expenseGroup || 'daily'} value={item.category} onChange={(category, expenseGroup) => updateTransaction(item.id, transactionDraftWithCategory(item, category, expenseGroup))}/> · <RecurrenceToggle compact recurring={Boolean(item.isRecurring)} onChange={(recurring) => onEdit ? onEdit(item) : updateTransaction(item.id, transactionDraftWithRecurrence(item, recurring))}/></div></div>
          <div className="transaction-item__actions"><strong className={`transaction-amount transaction-amount--${item.type}`}>{item.type === 'income' ? '+' : '−'} <InlineEditableAmount value={item.amount} language={language} label={t('amount')} onSave={(amount) => updateTransaction(item.id, transactionDraftWithAmount(item, amount))}/></strong>{onEdit && <button className="inline-edit-button" type="button" onClick={() => onEdit(item)} aria-label={t('edit')}><Pencil size={15}/></button>}{onDelete && <button className="delete-button" type="button" disabled={deletingId === item.id} onClick={() => void handleDelete(item.id)} aria-label={t('delete')}><Trash2 size={15}/></button>}</div>
        </article>
      ))}
    </div>
  )
}
