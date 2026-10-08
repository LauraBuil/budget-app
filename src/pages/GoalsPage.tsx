import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { GoalModal } from '../components/GoalModal'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'
import type { Goal } from '../types'
import { PageBlock, PageBlockSelector, usePageBlocks } from '../components/ui/PageBlocks'
import { InlineEditableAmount } from '../components/ui/InlineEditableAmount'
import { InlineEditableText } from '../components/ui/InlineEditableText'
import { iconById } from '../lib/icons'

export function GoalsPage() {
  const { data, t, language, deleteGoal, updateGoal } = useApp()
  const [editing, setEditing] = useState<Goal | undefined>()
  const [open, setOpen] = useState(false)
  const blocks = usePageBlocks('goals', [{ id: 'cards', label: 'goalsCards' }])
  return <div className="page"><header className="page-header"><div><h1>{t('myGoals')}</h1><p>{t('goalsSubtitle')}</p></div><div className="page-header__actions"><PageBlockSelector controller={blocks}/><Button onClick={() => { setEditing(undefined); setOpen(true) }}>{t('addGoal')}</Button></div></header>{blocks.isVisible('cards') && <PageBlock><section className="goals-grid">{data.goals.map((goal) => { const Icon = iconById[goal.icon]; const progress = Math.min(Math.round((goal.saved / goal.target) * 100), 100); const saveGoal = (changes: Partial<{ name: string; saved: number; target: number }>) => updateGoal(goal.id, { name: changes.name ?? goal.name, saved: changes.saved ?? goal.saved, target: changes.target ?? goal.target, dueDate: goal.dueDate, icon: goal.icon }); return <Card className="goal-card" key={goal.id}><div className="goal-card__visual"><Icon size={34}/><span>{progress}%</span></div><div><div className="goal-card__title"><h2><InlineEditableText value={goal.name} display={t(goal.name as Parameters<typeof t>[0])} label={t('goalName')} onSave={(name) => saveGoal({ name })}/></h2><span><button type="button" className="inline-edit-button" onClick={() => { setEditing(goal); setOpen(true) }} aria-label={t('edit')}><span>✎</span></button><button type="button" className="delete-button" onClick={() => void deleteGoal(goal.id)} aria-label={t('delete')}><Trash2 size={15}/></button></span></div><p><InlineEditableAmount value={goal.saved} language={language} label={t('saved')} onSave={(saved) => saveGoal({ saved })}/> {t('of')} <InlineEditableAmount value={goal.target} language={language} label={t('goalTarget')} onSave={(target) => saveGoal({ target })}/></p><div className="progress"><span style={{ width: `${progress}%` }}/></div><strong>{formatCurrency(Math.max(goal.target - goal.saved, 0), language)} {t('remaining')}</strong></div></Card>})}</section></PageBlock>}<GoalModal open={open} goal={editing} onClose={() => setOpen(false)}/></div>
}
