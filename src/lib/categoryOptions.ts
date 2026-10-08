import { BUILT_IN_CATEGORIES } from './categoryGroups'
import type { Category, TransactionType } from '../types'
import type { TranslationKey } from './i18n'

export function categoryOptions(categories: Category[], t: (key: TranslationKey) => string, type?: TransactionType) {
  const grouped = new Map<string, { label: string; slugs: string[] }>()
  const entries = [
    ...BUILT_IN_CATEGORIES.map((item) => ({ ...item, name: t(item.labelKey) })),
    ...categories,
  ].filter((item) => !type || item.type === type)
  for (const entry of entries) {
    const key = entry.name.trim().toLocaleLowerCase()
    const group = grouped.get(key) || { label: entry.name, slugs: [] }
    if (!group.slugs.includes(entry.slug)) group.slugs.push(entry.slug)
    grouped.set(key, group)
  }
  return [...grouped.values()].sort((a,b) => a.label.localeCompare(b.label))
}
