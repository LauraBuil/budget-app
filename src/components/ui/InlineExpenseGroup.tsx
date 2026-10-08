import { EXPENSE_GROUPS } from '../../lib/categoryGroups'
import { useApp } from '../../context/AppContext'
import type { ExpenseGroup } from '../../types'

interface InlineExpenseGroupProps {
  value: ExpenseGroup
  onChange: (group: ExpenseGroup) => void
}

export function InlineExpenseGroup({ value, onChange }: InlineExpenseGroupProps) {
  const { t } = useApp()
  return <select className="inline-expense-group" value={value} onChange={(event) => onChange(event.target.value as ExpenseGroup)} aria-label={t('expenseGroup')}>{EXPENSE_GROUPS.map((group) => <option key={group.id} value={group.id}>{t(group.labelKey)}</option>)}</select>
}
