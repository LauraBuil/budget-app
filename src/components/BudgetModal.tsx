import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from './ui/Button'
import type { Budget, BudgetDraft } from '../types'
import { IconPicker } from './ui/IconPicker'
import type { IconId } from '../lib/icons'
import { EXPENSE_CATEGORIES } from '../lib/categoryGroups'
import { capitalizeFirst } from '../lib/format'
import { BUDGET_EXPENSE_GROUPS, getBudgetCategories } from '../lib/budgets'

const categoryOptions = Array.from(new Set([...EXPENSE_CATEGORIES.map((item) => item.slug), 'other']))
const colors = ['#c87d78', '#dca39b', '#9c9b86', '#e8b7ad', '#8ca6a0', '#b89cc5']

export function BudgetModal({ open, budget, onClose }: { open: boolean; budget?: Budget; onClose: () => void }) {
  const { t, language, categories, addBudget, updateBudget } = useApp()
  const categoryChoices = Array.from(new Set([...categoryOptions, ...categories.filter((item) => item.type === 'expense').map((item) => item.slug)]))
  const categoryLabel = (slug: string) => capitalizeFirst(categories.find((item) => item.type === 'expense' && item.slug === slug)?.name || t(slug as Parameters<typeof t>[0]), language)
  const groupedCategoryChoices = [...categoryChoices.reduce((groups, slug) => {
    const label = categoryLabel(slug)
    const key = label.normalize('NFKC').trim().toLowerCase()
    const existing = groups.get(key)
    if (existing) existing.slugs.push(slug)
    else groups.set(key, { label, slugs: [slug] })
    return groups
  }, new Map<string, { label: string; slugs: string[] }>()).values()]
  const [name, setName] = useState(budget?.name || '')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(budget ? getBudgetCategories(budget) : [categoryOptions[0]])
  const [limit, setLimit] = useState(String(budget?.limit || ''))
  const [color, setColor] = useState(budget?.color || colors[0])
  const [note, setNote] = useState(budget?.note || '')
  const [icon, setIcon] = useState<IconId>(budget?.icon || 'other')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setName(budget?.name || ''); setSelectedCategories(budget ? getBudgetCategories(budget) : [categoryOptions[0]]); setLimit(budget ? String(budget.limit) : ''); setColor(budget?.color || colors[0]); setNote(budget?.note || ''); setIcon(budget?.icon || 'other') }, [budget, open])
  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true)
    const normalizedCategories = [...selectedCategories].sort()
    const draft: BudgetDraft = { name: name.trim(), category: normalizedCategories[0], categories: normalizedCategories, limit: Number(limit), color, note: note.trim(), icon }
    try { if (budget) await updateBudget(budget.id, draft); else await addBudget(draft) } finally { setSaving(false); onClose() }
  }

  const toggleCategory = (value: string) => setSelectedCategories((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  const toggleCategoryGroup = (values: string[]) => setSelectedCategories((current) => values.some((value) => current.includes(value)) ? current.filter((item) => !values.includes(item)) : [...current, ...values])

  return <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="budget-title"><header><h2 id="budget-title">{budget ? t('editBudget') : t('addBudget')}</h2><button type="button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></header><form onSubmit={submit} className="form-grid"><label>{t('budgetName')}<input maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder={t('optional')}/></label><label>{t('budgetAmount')}<input required type="number" min="0.01" step="0.01" value={limit} onChange={(event) => setLimit(event.target.value)}/></label><fieldset className="budget-category-picker form-grid__wide"><legend>{t('includedCategories')}</legend><small>{t('budgetSelectionHelp')}</small><strong>{t('expenseTypes')}</strong><div>{BUDGET_EXPENSE_GROUPS.map((item) => <label key={item.id}><input type="checkbox" checked={selectedCategories.includes(item.id)} onChange={() => toggleCategory(item.id)}/><span>{t(item.labelKey)}</span></label>)}</div><strong>{t('specificCategories')}</strong><div>{groupedCategoryChoices.map((item) => <label key={item.label}><input type="checkbox" checked={item.slugs.some((slug) => selectedCategories.includes(slug))} onChange={() => toggleCategoryGroup(item.slugs)}/><span>{item.label}</span></label>)}</div></fieldset><div className="form-field form-grid__wide"><span>{t('icon')}</span><IconPicker value={icon} onChange={setIcon}/></div><label className="form-grid__wide">{t('budgetColor')}<div className="color-options">{colors.map((item) => <button type="button" key={item} className={color === item ? 'active' : ''} style={{ background: item }} onClick={() => setColor(item)} aria-label={item}/>)}</div></label><label className="form-grid__wide">{t('budgetNote')}<textarea value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder={t('budgetNotePlaceholder')}/></label><div className="modal__actions"><Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={saving || selectedCategories.length === 0}>{budget ? t('save') : t('add')}</Button></div></form></section></div>
}
