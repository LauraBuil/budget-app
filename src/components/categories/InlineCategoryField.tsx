import { ChevronDown, Plus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { categoryOptions } from '../../lib/categoryOptions'
import type { ExpenseGroup, TransactionType } from '../../types'
import { useCommitOnOutsidePress } from '../ui/useCommitOnOutsidePress'
import { EditableCategoryOption } from './EditableCategoryOption'

interface InlineCategoryFieldProps {
  type: TransactionType
  expenseGroup: ExpenseGroup
  value: string
  onChange: (value: string, group?: ExpenseGroup) => void | Promise<void>
  compact?: boolean
}

export function InlineCategoryField({ type, expenseGroup, value, onChange, compact = false }: InlineCategoryFieldProps) {
  const { t, categories, addCategory } = useApp()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const options = useMemo(() => categoryOptions(categories,t,type), [categories,t,type])
  const selected = options.find((option) => option.slugs.includes(value))?.label || value
  const filtered = options.filter((option) => option.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  useCommitOnOutsidePress(open, containerRef, () => {
    const focused = document.activeElement
    // Commit a renamed category before unmounting its input (also on touch).
    if (focused instanceof HTMLInputElement && containerRef.current?.contains(focused)) focused.blur()
    setOpen(false)
  })

  async function select(slug: string) {
    if (busy.current) return
    busy.current = true; setSaving(true)
    try { await onChange(slug); setOpen(false) }
    catch { /* The shared toast displays the request error. */ }
    finally { busy.current = false; setSaving(false) }
  }
  async function create() {
    if (!search.trim() || busy.current) return
    busy.current = true; setSaving(true)
    try {
      const category = await addCategory(search.trim(),expenseGroup,type)
      await onChange(category.slug)
      setSearch(''); setOpen(false)
    } catch { /* Keep the search text so the user can retry. */ }
    finally { busy.current = false; setSaving(false) }
  }

  return <div className={`category-selector${compact ? ' category-selector--compact' : ''}`} ref={containerRef}>
    <button type="button" className="category-selector__trigger" onClick={() => { setOpen(!open); setSearch('') }} aria-label={t('category')} aria-expanded={open}>{selected}<ChevronDown size={16}/></button>
    {open && <div className="category-selector__menu">
      <input className="category-selector__input" aria-label={t('categoryName')} placeholder={t('searchOrCreateCategory')} value={search} maxLength={60} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if(event.key==='Enter') { event.preventDefault(); if(filtered.length===1) void select(filtered[0].slugs.includes(value) ? value : filtered[0].slugs[0]); else if(!filtered.length) void create() } }}/>
      {filtered.map((option) => {
        const custom = categories.find((category) => category.type===type && option.slugs.includes(category.slug))
        const slug = option.slugs.includes(value) ? value : option.slugs[0]
        return custom ? <EditableCategoryOption key={option.label} category={custom} selected={option.slugs.includes(value)} onSelect={() => void select(custom.slug)}/>
          : <button type="button" key={option.label} className={option.slugs.includes(value) ? 'selected' : ''} disabled={saving} onClick={() => void select(slug)}>{option.label}</button>
      })}
      {search.trim() && !options.some((option) => option.label.toLocaleLowerCase()===search.trim().toLocaleLowerCase()) && <button type="button" className="category-selector__create" disabled={saving} onClick={() => void create()}><Plus size={15}/>{t('add')} « {search.trim()} »</button>}
    </div>}
  </div>
}
