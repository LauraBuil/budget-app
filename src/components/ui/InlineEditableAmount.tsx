import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '../../lib/format'
import type { Language } from '../../types'

export function InlineEditableAmount({ value, language, label, onSave }: { value: number; language: Language; label: string; onSave: (value: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])
  useEffect(() => setDraft(String(value)), [value])

  async function save() {
    const next = Number(draft)
    if (!Number.isFinite(next) || next < 0) { setDraft(String(value)); setEditing(false); return }
    await onSave(next)
    setEditing(false)
  }

  if (!editing) return <button type="button" className="inline-amount-button" onClick={() => setEditing(true)} aria-label={label}>{formatCurrency(value, language)}</button>
  return <input ref={inputRef} className="inline-amount-input" type="number" min="0" step="0.01" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => void save()} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { setDraft(String(value)); setEditing(false) } }} aria-label={label}/>
}
