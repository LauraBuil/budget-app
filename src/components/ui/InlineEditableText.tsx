import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useCommitOnOutsidePress } from './useCommitOnOutsidePress'

interface InlineEditableTextProps {
  value: string
  label: string
  onSave: (value: string) => Promise<void>
  display?: ReactNode
  maxLength?: number
  buttonClassName?: string
  inputClassName?: string
}

export function InlineEditableText({ value, label, onSave, display = value, maxLength = 80, buttonClassName = 'inline-text-button', inputClassName = 'inline-text-input' }: InlineEditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const containerRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)

  useEffect(() => setDraft(value), [value])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const cancel = useCallback(() => { setDraft(value); setEditing(false) }, [value])
  const save = useCallback(async () => {
    const next = draft.trim()
    if (!next || next === value || savingRef.current) return cancel()
    savingRef.current = true
    try { await onSave(next) } catch { setDraft(value) } finally { savingRef.current = false; setEditing(false) }
  }, [cancel, draft, onSave, value])

  useCommitOnOutsidePress(editing, containerRef, () => { void save() })

  return <span ref={containerRef}>{editing ? <input ref={inputRef} className={inputClassName} value={draft} maxLength={maxLength} onChange={(event) => setDraft(event.target.value)} onBlur={() => void save()} onKeyDown={(event) => { if (event.key === 'Enter') void save(); if (event.key === 'Escape') cancel() }} aria-label={label}/> : <button type="button" className={buttonClassName} onClick={() => setEditing(true)} aria-label={label}>{display}</button>}</span>
}
