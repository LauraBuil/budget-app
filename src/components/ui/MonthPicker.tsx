import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Language } from '../../types'
import { translate } from '../../lib/i18n'
import { formatMonth, shiftMonth } from '../../lib/months'
import { useCommitOnOutsidePress } from './useCommitOnOutsidePress'

export function MonthPicker({ value, language, onChange }: { value: string; language: Language; onChange: (month: string) => void }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useCommitOnOutsidePress(open, pickerRef, () => setOpen(false))
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  const changeMonth = (amount: number) => {
    onChange(shiftMonth(value, amount))
  }

  return <div ref={pickerRef} className="month-picker"><button className="month-button" type="button" onClick={() => setOpen((current) => !current)}>{formatMonth(value, language)}</button>{open && <div className="month-picker__menu"><button type="button" aria-label={translate(language, 'previousMonth')} onClick={() => changeMonth(-1)}><ChevronLeft size={16}/></button><strong>{formatMonth(value, language)}</strong><button type="button" aria-label={translate(language, 'nextMonth')} onClick={() => changeMonth(1)}><ChevronRight size={16}/></button></div>}</div>
}
