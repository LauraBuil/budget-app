import { useApp } from '../../context/AppContext'
import { EXPENSE_GROUPS } from '../../lib/categoryGroups'
import { CheckboxFilter } from '../ui/CheckboxFilter'

export function ExpenseGroupFilter({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const { t } = useApp()
  return <CheckboxFilter label={t('expenseGroup')} emptyLabel={t('allExpenseGroups')} selectedLabel={t('selected')} value={value} onChange={onChange} options={EXPENSE_GROUPS.map((group) => ({ label: t(group.labelKey), values: [group.id] }))}/>
}
