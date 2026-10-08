import { ChevronDown } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useCommitOnOutsidePress } from './useCommitOnOutsidePress'

interface CheckboxFilterProps {
  label: string
  emptyLabel: string
  selectedLabel: string
  options: Array<{ label: string; values: string[] }>
  value: string[]
  onChange: (value: string[]) => void
}

export function CheckboxFilter({ label, emptyLabel, selectedLabel, options, value, onChange }: CheckboxFilterProps) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const id = useId()
  useCommitOnOutsidePress(open, container, () => setOpen(false))
  const count = options.filter((option) => option.values.some((item) => value.includes(item))).length
  function toggle(values: string[]) {
    onChange(values.every((item) => value.includes(item))
      ? value.filter((item) => !values.includes(item)) : [...new Set([...value, ...values])])
  }
  return <div className="category-filter" ref={container} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>
    <span id={`${id}-label`}>{label}</span>
    <button type="button" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-menu`} onClick={() => setOpen(!open)}><span id={`${id}-value`}>{count ? `${count} ${selectedLabel}` : emptyLabel}</span><ChevronDown size={15}/></button>
    {open && <div id={`${id}-menu`} className="category-filter__menu">{options.map((option) => <label key={option.label}><input type="checkbox" checked={option.values.every((item) => value.includes(item))} onChange={() => toggle(option.values)}/><span>{option.label}</span></label>)}</div>}
  </div>
}
