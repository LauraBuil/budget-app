import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from './ui/Button'
import type { Budget, BudgetDraft } from '../types'
import { IconPicker } from './ui/IconPicker'
import type { IconId } from '../lib/icons'
import { EXPENSE_CATEGORIES } from '../lib/categoryGroups'
import { capitalizeFirst } from '../lib/format'

const NON_ESSENTIAL_BUDGET_CATEGORY = 'non-essential'
const categoryOptions = Array.from(new Set([...EXPENSE_CATEGORIES.map((item) => item.slug), NON_ESSENTIAL_BUDGET_CATEGORY, 'other']))
const colors = ['#c87d78', '#dca39b', '#9c9b86', '#e8b7ad', '#8ca6a0', '#b89cc5']

export function BudgetModal({ open, budget, onClose }: { open: boolean; budget?: Budget; onClose: () => void }) {
  const { t, language, categories, addBudget, updateBudget } = useApp()
  const categoryChoices = Array.from(new Set([...categoryOptions, ...categories.filter((item) => item.type === 'expense').map((item) => item.slug)]))
  const categoryLabel = (slug: string) => capitalizeFirst(slug === NON_ESSENTIAL_BUDGET_CATEGORY ? t('nonEssentialExpenses') : categories.find((item) => item.type === 'expense' && item.slug === slug)?.name || t(slug as Parameters<typeof t>[0]), language)
  const [name, setName] = useState(budget?.name || '')
  const [category, setCategory] = useState(budget?.category || categoryOptions[0])
  const [limit, setLimit] = useState(String(budget?.limit || ''))
  const [color, setColor] = useState(budget?.color || colors[0])
  const [note, setNote] = useState(budget?.note || '')
  const [icon, setIcon] = useState<IconId>(budget?.icon || 'other')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setName(budget?.name || ''); setCategory(budget?.category || categoryChoices[0]); setLimit(budget ? String(budget.limit) : ''); setColor(budget?.color || colors[0]); setNote(budget?.note || ''); setIcon(budget?.icon || 'other') }, [budget, open])
  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true)
    const draft: BudgetDraft = { name: name.trim(), category, limit: Number(limit), color, note: note.trim(), icon }
    try { if (budget) await updateBudget(budget.id, draft); else await addBudget(draft) } finally { setSaving(false); onClose() }
  }

  return <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="budget-title"><header><h2 id="budget-title">{budget ? t('editBudget') : t('addBudget')}</h2><button type="button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></header><form onSubmit={submit} className="form-grid"><label>{t('budgetName')}<input maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder={t('optional')}/></label><label>{t('category')}<select value={category} onChange={(event) => setCategory(event.target.value)}>{categoryChoices.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}</select></label><label>{t('budgetAmount')}<input required type="number" min="0.01" step="0.01" value={limit} onChange={(event) => setLimit(event.target.value)}/></label><div className="form-field form-grid__wide"><span>{t('icon')}</span><IconPicker value={icon} onChange={setIcon}/></div><label className="form-grid__wide">{t('budgetColor')}<div className="color-options">{colors.map((item) => <button type="button" key={item} className={color === item ? 'active' : ''} style={{ background: item }} onClick={() => setColor(item)} aria-label={item}/>)}</div></label><label className="form-grid__wide">{t('budgetNote')}<textarea value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder={t('budgetNotePlaceholder')}/></label><div className="modal__actions"><Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={saving}>{budget ? t('save') : t('add')}</Button></div></form></section></div>
}
