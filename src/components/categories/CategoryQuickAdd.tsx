import { useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { EXPENSE_GROUPS } from '../../lib/categoryGroups'
import type { ExpenseGroup } from '../../types'

export function CategoryQuickAdd() {
  const { t, addCategory } = useApp()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [group, setGroup] = useState<ExpenseGroup>('daily')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function start() { setOpen(true); window.setTimeout(() => inputRef.current?.focus(), 0) }
  function cancel() { setOpen(false); setName('') }
  async function save() {
    if (!name.trim() || saving) return
    setSaving(true)
    try { await addCategory(name, group); cancel() } finally { setSaving(false) }
  }

  if (!open) return <button className="category-quick-add__trigger" type="button" onClick={start}>＋ {t('customCategory')}</button>
  return <div className="category-quick-add"><input ref={inputRef} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void save(); if (event.key === 'Escape') cancel() }} placeholder={t('categoryName')} maxLength={60}/><select value={group} onChange={(event) => setGroup(event.target.value as ExpenseGroup)} aria-label={t('expenseGroup')}>{EXPENSE_GROUPS.map((item) => <option key={item.id} value={item.id}>{t(item.labelKey)}</option>)}</select><button type="button" onClick={() => void save()} disabled={saving}>{t('add')}</button><button type="button" onClick={cancel} aria-label={t('cancel')}>×</button></div>
}
