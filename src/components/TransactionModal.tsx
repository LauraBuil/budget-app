import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from './ui/Button'
import type { ExpenseGroup, TransactionType } from '../types'
import { BUILT_IN_CATEGORIES, EXPENSE_GROUPS } from '../lib/categoryGroups'

export function TransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, addTransaction, categories } = useApp()
  const [type, setType] = useState<TransactionType>('expense')
  const [expenseGroup, setExpenseGroup] = useState<ExpenseGroup>('daily')
  const [category, setCategory] = useState('groceries')
  const [recurring, setRecurring] = useState(false)
  const [recurrenceDay, setRecurrenceDay] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  if (!open) return null

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    try {
      await addTransaction({
        type,
        label: String(form.get('label')),
        amount: Number(form.get('amount')),
        category,
        expenseGroup,
        date: String(form.get('date')),
        note: String(form.get('note') || ''),
        recurrence: recurring ? { day: Number(recurrenceDay) } : undefined,
      })
      onClose()
    } finally { setSubmitting(false) }
  }

  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-title">
        <header><h2 id="transaction-title">{t('addTransaction')}</h2><button onClick={onClose} aria-label={t('close')}><X size={20} /></button></header>
        <div className="segmented">
          <button type="button" className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>{t('expense')}</button>
          <button type="button" className={type === 'income' ? 'active' : ''} onClick={() => { setType('income'); setRecurring(false) }}>{t('transactionIncome')}</button>
        </div>
        <form onSubmit={onSubmit} className="form-grid">
          <label>{t('description')}<input name="label" required placeholder={t('exampleGroceries')} /></label>
          <label>{t('amount')}<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0,00 €" /></label>
          {type === 'expense' && <label>{t('expenseGroup')}<select value={expenseGroup} onChange={(event) => { const nextGroup = event.target.value as ExpenseGroup; setExpenseGroup(nextGroup); setRecurring(nextGroup === 'fixed' ? recurring : false); setCategory(BUILT_IN_CATEGORIES.find((item) => item.group === nextGroup)?.slug || '__new__') }}>{EXPENSE_GROUPS.map((group) => <option key={group.id} value={group.id}>{t(group.labelKey)}</option>)}</select></label>}
          <label>{t('category')}<select name="category" value={category} onChange={(event) => setCategory(event.target.value)}>{BUILT_IN_CATEGORIES.filter((item) => type === 'income' || item.group === expenseGroup).map((item) => <option key={item.slug} value={item.slug}>{t(item.labelKey)}</option>)}{categories.filter((item) => type === 'income' || item.group === expenseGroup).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
          <label>{t('date')}<input name="date" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label className="form-grid__wide">Note<input name="note" placeholder={t('optional')} /></label>
          {type === 'expense' && expenseGroup === 'fixed' && <div className="recurring-field form-grid__wide"><label className="checkbox-label"><input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)}/><span>{t('recurring')}</span></label>{recurring && <label>{t('recurringDay')}<input type="number" min="1" max="31" value={recurrenceDay} onChange={(event) => setRecurrenceDay(event.target.value)}/></label>}</div>}
          <div className="modal__actions"><Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={submitting}>{t('add')}</Button></div>
        </form>
      </section>
    </div>
  )
}
