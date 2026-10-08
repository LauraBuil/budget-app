import { useApp } from '../../context/AppContext'
import { categoryOptions } from '../../lib/categoryOptions'
import { CheckboxFilter } from '../ui/CheckboxFilter'

export function CategoryFilter({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const { categories, t } = useApp()
  return <CheckboxFilter label={t('category')} emptyLabel={t('allCategories')} selectedLabel={t('selected')} value={value} onChange={onChange} options={categoryOptions(categories, t).map((option) => ({ label: option.label, values: option.slugs }))}/>
}
