import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from './ui/Button'
import type { TransactionType } from '../types'

export function TransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, addTransaction } = useApp()
  const [type, setType] = useState<TransactionType>('expense')
  const [submitting, setSubmitting] = useState(false)
  if (!open) return null

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    await addTransaction({
      type,
      label: String(form.get('label')),
      amount: Number(form.get('amount')),
      category: String(form.get('category')),
      date: String(form.get('date')),
      note: String(form.get('note') || ''),
    })
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-title">
        <header><h2 id="transaction-title">{t('addTransaction')}</h2><button onClick={onClose} aria-label={t('close')}><X size={20} /></button></header>
        <div className="segmented">
          <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>{t('expense')}</button>
          <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>{t('transactionIncome')}</button>
        </div>
        <form onSubmit={onSubmit} className="form-grid">
          <label>{t('description')}<input name="label" required placeholder={t('exampleGroceries')} /></label>
          <label>{t('amount')}<input name="amount" required type="number" min="0.01" step="0.01" placeholder="0,00 €" /></label>
          <label>{t('category')}<select name="category" defaultValue="groceries"><option value="housing">{t('housing')}</option><option value="groceries">{t('groceries')}</option><option value="transport">{t('transport')}</option><option value="leisure">{t('leisure')}</option><option value="dining">{t('dining')}</option><option value="other">{t('other')}</option></select></label>
          <label>{t('date')}<input name="date" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label className="form-grid__wide">Note<input name="note" placeholder={t('optional')} /></label>
          <div className="modal__actions"><Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={submitting}>{t('add')}</Button></div>
        </form>
      </section>
    </div>
  )
}
