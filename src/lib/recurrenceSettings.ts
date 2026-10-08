import type { Transaction, TransactionDraft } from '../types'

interface RecurrenceSettings {
  recurring: boolean
  stopping: boolean
  scope: 'this' | 'future'
  date: string
  transaction?: Transaction
}

export function getRecurrenceSettings({ recurring, stopping, scope, date, transaction }: RecurrenceSettings): Pick<TransactionDraft, 'scope' | 'recurrence'> {
  if (stopping && transaction?.recurringId) return { scope: 'future', recurrence: null }
  // Keep a series scheduled on the 31st when editing its clamped February date.
  const day = transaction?.date === date && transaction.recurrenceDay
    ? transaction.recurrenceDay : Number(date.slice(-2))
  return { scope, recurrence: recurring ? { day } : null }
}
