import { useCallback, useEffect, useRef, useState } from 'react'
import { parseAmount } from '../../lib/amount'
import { formatCurrency } from '../../lib/format'
import type { Language } from '../../types'
import { useCommitOnOutsidePress } from './useCommitOnOutsidePress'

export function InlineEditableAmount({ value, language, label, onSave }: { value: number; language: Language; label: string; onSave: (value: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLSpanElement>(null)
  const savingRef = useRef(false)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])
  useEffect(() => setDraft(String(value)), [value])

  const save = useCallback(async () => {
    if (savingRef.current) return
    const next = parseAmount(draft)
    if (next === null || next < 0) { setDraft(String(value)); setEditing(false); return }
    savingRef.current = true
    try { if (next !== value) await onSave(next) } catch { setDraft(String(value)) } finally { savingRef.current = false; setEditing(false) }
  }, [draft, onSave, value])

  useCommitOnOutsidePress(editing, containerRef, () => { void save() })

  return <span ref={containerRef}>{!editing ? <button type="button" className="inline-amount-button" onClick={() => setEditing(true)} aria-label={label}>{formatCurrency(value, language)}</button> : <input ref={inputRef} className="inline-amount-input" type="text" inputMode="decimal" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => void save()} onKeyDown={(event) => { if (event.key === 'Enter') void save(); if (event.key === 'Escape') { setDraft(String(value)); setEditing(false) } }} aria-label={label}/>}</span>
}
