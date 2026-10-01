import type { Language, MonthPoint } from '../types'

export const formatCurrency = (value: number, language: Language = 'fr') =>
  new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value)

export const formatDate = (value: string, language: Language = 'fr') =>
  new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))

const monthLabels: Record<Language, Record<string, string>> = {
  fr: { May: 'Mai', Jun: 'Juin', Jul: 'Juil.', Aug: 'Août', Sep: 'Sept.', Oct: 'Oct.' },
  en: { May: 'May', Jun: 'Jun', Jul: 'Jul', Aug: 'Aug', Sep: 'Sep', Oct: 'Oct' },
}

export const localizeMonthPoints = (data: MonthPoint[], language: Language) =>
  data.map((point) => ({ ...point, month: monthLabels[language][point.month] || point.month }))
