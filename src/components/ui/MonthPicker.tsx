import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { Language } from '../../types'
import { formatMonth, shiftMonth } from '../../lib/months'

export function MonthPicker({ value, language, onChange }: { value: string; language: Language; onChange: (month: string) => void }) {
  const [open, setOpen] = useState(false)
  return <div className="month-picker"><button className="month-button" type="button" onClick={() => setOpen((current) => !current)}>{formatMonth(value, language)}</button>{open && <div className="month-picker__menu"><button type="button" aria-label="Previous month" onClick={() => onChange(shiftMonth(value, -1))}><ChevronLeft size={16}/></button><strong>{formatMonth(value, language)}</strong><button type="button" aria-label="Next month" onClick={() => onChange(shiftMonth(value, 1))}><ChevronRight size={16}/></button></div>}</div>
}
