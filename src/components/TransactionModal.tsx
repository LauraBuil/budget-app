import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from './ui/Button'
import type { ExpenseGroup, Transaction, TransactionType } from '../types'
import { EXPENSE_CATEGORIES, EXPENSE_GROUPS, INCOME_CATEGORIES } from '../lib/categoryGroups'
import { InlineCategoryField } from './categories/InlineCategoryField'

interface TransactionModalProps { open: boolean; onClose: () => void; initialDate?: string; transaction?: Transaction }

export function TransactionModal({ open, onClose, initialDate, transaction }: TransactionModalProps) {
  const { t, addTransaction, updateTransaction } = useApp()
  const [type, setType] = useState<TransactionType>('expense')
  const [expenseGroup, setExpenseGroup] = useState<ExpenseGroup>('daily')
  const [category, setCategory] = useState('groceries')
  const [recurring, setRecurring] = useState(false)
  const [recurrenceDay, setRecurrenceDay] = useState('1')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isEditing = Boolean(transaction)
  const canRecur = type === 'income' || expenseGroup === 'fixed'

  useEffect(() => {
    if (!open) return
    setType(transaction?.type || 'expense')
    setExpenseGroup(transaction?.expenseGroup || 'daily')
    setCategory(transaction?.category || 'groceries')
    setRecurring(Boolean(transaction?.isRecurring))
    setRecurrenceDay(String(transaction?.recurrenceDay || 1))
    setLabel(transaction?.label || '')
    setAmount(transaction ? String(transaction.amount) : '')
    setDate(transaction?.date || initialDate || new Date().toISOString().slice(0, 10))
    setNote(transaction?.note || '')
  }, [open, transaction, initialDate])

  if (!open) return null

  function changeType(nextType: TransactionType) {
    setType(nextType)
    setRecurring(false)
    setCategory(nextType === 'income' ? INCOME_CATEGORIES[0].slug : EXPENSE_CATEGORIES.find((item) => item.group === expenseGroup)?.slug || '')
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const draft = { type, label: label.trim(), amount: Number(amount), category, expenseGroup, date, note: note.trim(), recurrence: canRecur && recurring ? { day: Number(recurrenceDay) } : null }
      if (transaction) await updateTransaction(transaction.id, draft)
      else await addTransaction(draft)
      onClose()
    } finally { setSubmitting(false) }
  }

  return <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-title">
      <header><h2 id="transaction-title">{type === 'income' ? isEditing ? t('editIncome') : t('addIncome') : isEditing ? t('editTransaction') : t('addTransaction')}</h2><button onClick={onClose} aria-label={t('close')}><X size={20} /></button></header>
      <div className="segmented"><button type="button" className={type === 'expense' ? 'active' : ''} onClick={() => changeType('expense')}>{t('expense')}</button><button type="button" className={type === 'income' ? 'active' : ''} onClick={() => changeType('income')}>{t('transactionIncome')}</button></div>
      <form onSubmit={onSubmit} className="form-grid">
        <label>{t('description')}<input required value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t('exampleGroceries')} /></label>
        <label>{t('amount')}<input required value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.01" step="0.01" placeholder="0,00 €" /></label>
        {type === 'expense' && <label>{t('expenseGroup')}<select value={expenseGroup} onChange={(event) => { const nextGroup = event.target.value as ExpenseGroup; setExpenseGroup(nextGroup); setRecurring(nextGroup === 'fixed' ? recurring : false); setCategory(EXPENSE_CATEGORIES.find((item) => item.group === nextGroup)?.slug || '') }}>{EXPENSE_GROUPS.map((group) => <option key={group.id} value={group.id}>{t(group.labelKey)}</option>)}</select></label>}
        <div className="form-field"><span>{t('category')}</span><InlineCategoryField type={type} expenseGroup={expenseGroup} value={category} onChange={setCategory}/></div>
        <div className="date-recurrence-field"><label>{t('date')}<input required value={date} onChange={(event) => { const nextDate = event.target.value; setDate(nextDate); if (recurring) setRecurrenceDay(String(Number(nextDate.slice(-2)))) }} type="date" /></label>{canRecur && <label className="checkbox-label"><input type="checkbox" checked={recurring} onChange={(event) => { setRecurring(event.target.checked); if (event.target.checked) setRecurrenceDay(String(Number(date.slice(-2)))) }}/><span>{t('recurring')}</span></label>}</div>
        <label className="form-grid__wide">{t('note')}<input value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('optional')} /></label>
        {canRecur && recurring && <label className="form-grid__wide">{t('recurringDay')}<input type="number" min="1" max="31" value={recurrenceDay} onChange={(event) => setRecurrenceDay(event.target.value)}/></label>}
        <div className="modal__actions"><Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={submitting}>{isEditing ? t('save') : t('add')}</Button></div>
      </form>
    </section>
  </div>
}
