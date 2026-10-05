import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

interface InlineEditableNameProps {
  name: string
  ariaLabel: string
  onSave: (name: string) => Promise<void>
}

export function InlineEditableName({ name, ariaLabel, onSave }: InlineEditableNameProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)

  useEffect(() => setDraft(name), [name])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function cancel() {
    setDraft(name)
    setEditing(false)
  }

  async function save() {
    const nextName = draft.trim()
    if (!nextName || nextName === name) return cancel()
    if (savingRef.current) return
    savingRef.current = true
    try { await onSave(nextName); setEditing(false) } catch { cancel() } finally { savingRef.current = false }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') cancel()
    if (event.key === 'Enter') { event.preventDefault(); void save() }
  }

  if (editing) return <input ref={inputRef} className="inline-name-input" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => void save()} onKeyDown={onKeyDown} maxLength={80} aria-label={ariaLabel} autoComplete="name" />
  return <button type="button" className="inline-name-button" onClick={() => setEditing(true)} aria-label={ariaLabel}>{name}</button>
}
