import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useApp } from '../../context/AppContext'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/categoryGroups'
import type { ExpenseGroup, TransactionType } from '../../types'

interface InlineCategoryFieldProps {
  type: TransactionType
  expenseGroup: ExpenseGroup
  value: string
  onChange: (value: string) => void
}

const CREATE_VALUE = '__create__'

export function InlineCategoryField({ type, expenseGroup, value, onChange }: InlineCategoryFieldProps) {
  const { t, categories, addCategory } = useApp()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const builtIn = useMemo(() => (
    type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES.filter((item) => item.group === expenseGroup)
  ), [type, expenseGroup])
  const custom = useMemo(() => categories.filter((item) => item.type === type && (type === 'income' || item.group === expenseGroup)), [categories, expenseGroup, type])

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function cancel() {
    setEditing(false)
    setName('')
  }

  async function save() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const category = await addCategory(name, type === 'income' ? 'daily' : expenseGroup, type)
      onChange(category.slug)
      cancel()
    } finally {
      setSaving(false)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') cancel()
    if (event.key === 'Enter') {
      event.preventDefault()
      void save()
    }
  }

  if (editing) {
    return <div className="inline-category-field"><input ref={inputRef} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={onKeyDown} placeholder={t('categoryName')} aria-label={t('categoryName')} maxLength={60}/><button type="button" onClick={() => void save()} disabled={saving} aria-label={t('add')}><Check size={16}/></button><button type="button" onClick={cancel} aria-label={t('cancel')}><X size={16}/></button></div>
  }

  return <select name="category" value={value} aria-label={t('category')} onChange={(event) => event.target.value === CREATE_VALUE ? setEditing(true) : onChange(event.target.value)}><optgroup label={type === 'income' ? t('income') : t('expenses')}>{builtIn.map((item) => <option key={item.slug} value={item.slug}>{t(item.labelKey)}</option>)}{custom.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</optgroup><option value={CREATE_VALUE}>＋ {t('customCategory')}</option></select>
}
