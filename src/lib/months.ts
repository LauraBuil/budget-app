import type { Language } from '../types'

export function formatMonth(value: string, language: Language) {
  const label = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00:00`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function shiftMonth(value: string, amount: number) {
  const date = new Date(`${value}-01T12:00:00`)
  date.setMonth(date.getMonth() + amount)
  return date.toISOString().slice(0, 7)
}
