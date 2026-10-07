import type { Transaction, TransactionDraft } from '../types'

export function transactionDraftWithAmount(transaction: Transaction, amount: number): TransactionDraft {
  return {
    type: transaction.type,
    label: transaction.label,
    amount,
    category: transaction.category,
    expenseGroup: transaction.expenseGroup || 'daily',
    date: transaction.date,
    note: transaction.note || '',
    recurrence: transaction.isRecurring ? { day: transaction.recurrenceDay || Number(transaction.date.slice(-2)) } : null,
  }
}

export function transactionDraftWithLabel(transaction: Transaction, label: string): TransactionDraft {
  return { ...transactionDraftWithAmount(transaction, transaction.amount), label }
}
