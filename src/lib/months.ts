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

// Calendar dates follow the user's local day, not UTC around midnight.
export function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
