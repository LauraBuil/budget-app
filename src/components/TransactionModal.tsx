import { localDate } from '../lib/months'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from './ui/Button'
import type { ExpenseGroup, Transaction, TransactionType } from '../types'
import { EXPENSE_CATEGORIES, EXPENSE_GROUPS, INCOME_CATEGORIES } from '../lib/categoryGroups'
import { InlineCategoryField } from './categories/InlineCategoryField'
import { IconPicker } from './ui/IconPicker'
import type { IconId } from '../lib/icons'
import { RecurrenceScope } from './transactions/RecurrenceScope'
import { getRecurrenceSettings } from '../lib/recurrenceSettings'

interface TransactionModalProps { open: boolean; onClose: () => void; initialDate?: string; transaction?: Transaction }

export function TransactionModal({ open, onClose, initialDate, transaction }: TransactionModalProps) {
  const { t, addTransaction, updateTransaction } = useApp()
  const [type, setType] = useState<TransactionType>('expense')
  const [expenseGroup, setExpenseGroup] = useState<ExpenseGroup>('daily')
  const [category, setCategory] = useState('groceries')
  const [recurring, setRecurring] = useState(false)
  const [stoppingRecurrence, setStoppingRecurrence] = useState(false)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [icon, setIcon] = useState<IconId>('other')
  const [submitting, setSubmitting] = useState(false)
  const [scope, setScope] = useState<'this' | 'future'>('this')
  const [error, setError] = useState('')
  const requestId = useRef('')
  const submittingRef = useRef(false)
  const isEditing = Boolean(transaction)

  useEffect(() => {
    if (!open) return
    requestId.current = crypto.randomUUID()
    setScope('this'); setError('')
    setType(transaction?.type || 'expense')
    setExpenseGroup(transaction?.expenseGroup || 'daily')
    setCategory(transaction?.category || 'groceries')
    setRecurring(Boolean(transaction?.isRecurring))
    setStoppingRecurrence(false)
    setLabel(transaction?.label || '')
    setAmount(transaction ? String(transaction.amount) : '')
    setDate(transaction?.date || initialDate || localDate())
    setNote(transaction?.note || '')
    setIcon(transaction?.icon || 'other')
  }, [open, transaction, initialDate])

  if (!open) return null

  function changeType(nextType: TransactionType) {
    if (nextType === type) return
    setType(nextType)
    setCategory(nextType === 'income' ? INCOME_CATEGORIES[0].slug : EXPENSE_CATEGORIES.find((item) => item.group === expenseGroup)?.slug || '')
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true); setError('')
    try {
      const recurrenceSettings = getRecurrenceSettings({ recurring, stopping: stoppingRecurrence, scope, date, transaction })
      const draft = { ...recurrenceSettings, clientRequestId: requestId.current, type, label: label.trim(), amount: Number(amount), category, expenseGroup, date, note: note.trim(), icon }
      if (transaction) await updateTransaction(transaction.id, draft)
      else await addTransaction(draft)
      onClose()
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setError(code === 'RECURRENCE_ALREADY_EXISTS' ? t('recurrenceAlreadyExists') : code === 'RECURRENCE_MONTH_CHANGE' ? t('recurrenceMonthChange') : t('cannotSave'))
    } finally { submittingRef.current = false; setSubmitting(false) }
  }

  return <div className="modal-layer" role="presentation" onMouseDown={(event) => !submitting && event.target === event.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-title">
      <header><h2 id="transaction-title">{type === 'income' ? isEditing ? t('editIncome') : t('addIncome') : isEditing ? t('editTransaction') : t('addTransaction')}</h2><button type="button" disabled={submitting} onClick={onClose} aria-label={t('close')}><X size={20} /></button></header>
      <div className="segmented"><button type="button" className={type === 'expense' ? 'active' : ''} onClick={() => changeType('expense')}>{t('expense')}</button><button type="button" className={type === 'income' ? 'active' : ''} onClick={() => changeType('income')}>{t('transactionIncome')}</button></div>
      <form onSubmit={onSubmit} className="form-grid">
        <label>{t('description')}<input required value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t('exampleGroceries')} /></label>
        <label>{t('amount')}<input required value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.01" step="0.01" placeholder="0,00 €" /></label>
        {type === 'expense' && <label>{t('expenseGroup')}<select value={expenseGroup} onChange={(event) => { setExpenseGroup(event.target.value as ExpenseGroup) }}>{EXPENSE_GROUPS.map((group) => <option key={group.id} value={group.id}>{t(group.labelKey)}</option>)}</select></label>}
        <div className="form-field"><span>{t('category')}</span><InlineCategoryField type={type} expenseGroup={expenseGroup} value={category} onChange={(value) => setCategory(value)}/></div>
        <div className="date-recurrence-field"><label>{t('date')}<input required value={date} onChange={(event) => setDate(event.target.value)} type="date" /></label>{transaction?.isRecurring ? <span className="monthly-recurrence-label">{t(stoppingRecurrence ? 'recurrenceStopping' : 'everyMonth')}</span> : <label className="monthly-recurrence-checkbox"><input type="checkbox" checked={recurring} disabled={submitting || stoppingRecurrence} onChange={(event) => setRecurring(event.target.checked)}/>{t('everyMonth')}</label>}</div>
        <div className="form-field form-grid__wide"><span>{t('icon')}</span><IconPicker value={icon} onChange={setIcon}/></div>
        <label className="form-grid__wide">{t('note')}<input value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('optional')} /></label>
        {transaction?.recurringId && !stoppingRecurrence && <RecurrenceScope value={scope} onChange={setScope}/>}
        {transaction?.recurringId && <div className="form-grid__wide recurrence-stop"><button type="button" className="inline-edit-button" disabled={submitting} onClick={() => setStoppingRecurrence((value) => !value)}>{t(stoppingRecurrence ? 'undoRecurrenceStop' : 'stopRecurrenceFromMonth')}</button>{stoppingRecurrence && <p className="form-hint" role="status">{t('stopRecurrenceHint')}</p>}</div>}
        {!transaction?.recurringId && recurring && <p className="form-grid__wide form-hint">{t('recurrenceWindowHint')}</p>}
        {error && <p className="form-grid__wide form-error" role="alert">{error}</p>}
        <div className="modal__actions"><Button type="button" variant="secondary" disabled={submitting} onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={submitting}>{isEditing ? t('save') : t('add')}</Button></div>
      </form>
    </section>
  </div>
}
