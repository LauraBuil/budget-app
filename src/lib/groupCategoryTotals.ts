import type { CategoryTotal } from './financialData'

// Different stored identifiers can share a displayed name after a rename.
// Group before rendering so the legend, slices and tooltip use the same totals.
export function groupCategoryTotals(data: CategoryTotal[], categoryName: (slug: string) => string): CategoryTotal[] {
  const groups = new Map<string, CategoryTotal>()
  for (const item of data) {
    const key = categoryName(item.category).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
    const existing = groups.get(key)
    if (existing) existing.amount = Math.round((existing.amount + item.amount) * 100) / 100
    else groups.set(key, { ...item })
  }
  const total = [...groups.values()].reduce((sum, item) => sum + item.amount, 0)
  return [...groups.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({ ...item, percentage: total ? Math.round(item.amount / total * 100) : 0 }))
}
