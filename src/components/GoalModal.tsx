import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Button } from './ui/Button'
import type { Goal, GoalDraft } from '../types'

const icons: Goal['icon'][] = ['travel', 'tech', 'safety']

export function GoalModal({ open, goal, onClose }: { open: boolean; goal?: Goal; onClose: () => void }) {
  const { t, addGoal, updateGoal } = useApp()
  const [name, setName] = useState(goal?.name || '')
  const [target, setTarget] = useState(String(goal?.target || ''))
  const [saved, setSaved] = useState(String(goal?.saved || '0'))
  const [dueDate, setDueDate] = useState(goal?.dueDate || '')
  const [icon, setIcon] = useState<Goal['icon']>(goal?.icon || 'safety')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setName(goal?.name || ''); setTarget(goal ? String(goal.target) : ''); setSaved(goal ? String(goal.saved) : '0'); setDueDate(goal?.dueDate || ''); setIcon(goal?.icon || 'safety') }, [goal, open])
  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true)
    const draft: GoalDraft = { name, target: Number(target), saved: Number(saved), dueDate: dueDate || undefined, icon }
    try { if (goal) await updateGoal(goal.id, draft); else await addGoal(draft) } finally { setSaving(false); onClose() }
  }

  return <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="goal-title"><header><h2 id="goal-title">{goal ? t('editGoal') : t('addGoal')}</h2><button type="button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></header><form onSubmit={submit} className="form-grid"><label className="form-grid__wide">{t('goalName')}<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder={t('goalNamePlaceholder')}/></label><label>{t('goalTarget')}<input required type="number" min="0.01" step="0.01" value={target} onChange={(event) => setTarget(event.target.value)}/></label><label>{t('saved')}<input type="number" min="0" step="0.01" value={saved} onChange={(event) => setSaved(event.target.value)}/></label><label>{t('dueDate')}<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)}/></label><label>{t('goalIcon')}<select value={icon} onChange={(event) => setIcon(event.target.value as Goal['icon'])}>{icons.map((item) => <option key={item} value={item}>{t(`goal${item[0].toUpperCase()}${item.slice(1)}` as Parameters<typeof t>[0])}</option>)}</select></label><div className="modal__actions"><Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button><Button type="submit" disabled={saving}>{goal ? t('save') : t('add')}</Button></div></form></section></div>
}
