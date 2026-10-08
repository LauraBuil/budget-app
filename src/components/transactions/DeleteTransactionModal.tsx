import { useState } from 'react'
import { X } from 'lucide-react'
import type { Transaction } from '../../types'
import { useApp } from '../../context/AppContext'
import { Button } from '../ui/Button'
import { RecurrenceScope } from './RecurrenceScope'

export function DeleteTransactionModal({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  const { t, deleteTransaction } = useApp()
  const [scope, setScope] = useState<'this' | 'future'>('this')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  async function remove() {
    if (saving) return
    setSaving(true); setError(false)
    try { await deleteTransaction(transaction.id, scope); onClose() }
    catch { setError(true) }
    finally { setSaving(false) }
  }
  return <div className="modal-layer"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-transaction-title">
    <header><h2 id="delete-transaction-title">{t('delete')} · {transaction.label}</h2><button type="button" onClick={onClose} disabled={saving} aria-label={t('close')}><X size={20}/></button></header>
    {transaction.recurringId && <RecurrenceScope value={scope} onChange={setScope}/>}
    <p>{t('deleteTransactionHint')}</p>
    {error && <p role="alert">{t('cannotSave')}</p>}
    <div className="modal__actions"><Button variant="secondary" onClick={onClose} disabled={saving}>{t('cancel')}</Button><Button onClick={() => void remove()} disabled={saving}>{t('delete')}</Button></div>
  </section></div>
}
