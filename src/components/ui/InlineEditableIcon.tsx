import { useCallback, useRef, useState } from 'react'
import { ICON_OPTIONS, iconById, type IconId } from '../../lib/icons'
import { useCommitOnOutsidePress } from './useCommitOnOutsidePress'
import { useApp } from '../../context/AppContext'

interface InlineEditableIconProps {
  value: IconId
  label: string
  className?: string
  onSave: (icon: IconId) => Promise<void>
}

export function InlineEditableIcon({ value, label, className = '', onSave }: InlineEditableIconProps) {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLSpanElement>(null)
  const Icon = iconById[value || 'other']
  useCommitOnOutsidePress(open, containerRef, () => setOpen(false))

  const selectIcon = useCallback(async (icon: IconId) => {
    if (saving) return
    if (icon === value) return setOpen(false)
    setSaving(true)
    try {
      await onSave(icon)
      setOpen(false)
    } finally { setSaving(false) }
  }, [onSave, saving, value])

  return <span className="inline-icon" ref={containerRef}><button type="button" className={className} onClick={() => setOpen((current) => !current)} aria-label={label} aria-expanded={open}><Icon size={15}/></button>{open && <div className="inline-icon__menu">{ICON_OPTIONS.map(({ id, icon: OptionIcon, label: optionLabel }) => <button type="button" key={id} className={id === value ? 'active' : ''} disabled={saving} onClick={() => void selectIcon(id)} aria-label={t(optionLabel)} title={t(optionLabel)}><OptionIcon size={16}/></button>)}</div>}</span>
}
