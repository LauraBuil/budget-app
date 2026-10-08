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
    icon: transaction.icon,
    recurrence: transaction.isRecurring ? { day: transaction.recurrenceDay || Number(transaction.date.slice(-2)) } : null,
  }
}

export function transactionDraftWithLabel(transaction: Transaction, label: string): TransactionDraft {
  return { ...transactionDraftWithAmount(transaction, transaction.amount), label }
}

export function transactionDraftWithIcon(transaction: Transaction, icon: Transaction['icon']): TransactionDraft {
  return { ...transactionDraftWithAmount(transaction, transaction.amount), icon }
}

export function transactionDraftWithCategory(transaction: Transaction, category: string, expenseGroup = transaction.expenseGroup || 'daily'): TransactionDraft {
  return { ...transactionDraftWithAmount(transaction, transaction.amount), category, expenseGroup }
}

export function transactionDraftWithExpenseGroup(transaction: Transaction, expenseGroup: Transaction['expenseGroup']): TransactionDraft {
  return { ...transactionDraftWithAmount(transaction, transaction.amount), expenseGroup: expenseGroup || 'daily' }
}

export function transactionDraftWithRecurrence(transaction: Transaction, recurring: boolean): TransactionDraft {
  return {
    ...transactionDraftWithAmount(transaction, transaction.amount),
    recurrence: recurring ? { day: transaction.recurrenceDay || Number(transaction.date.slice(-2)) } : null,
  }
}
