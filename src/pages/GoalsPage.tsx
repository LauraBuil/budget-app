import { Laptop, Plane, ShieldCheck } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'

const icons = { travel: Plane, tech: Laptop, safety: ShieldCheck }
export function GoalsPage() {
  const { data, t, language } = useApp()
  return <div className="page"><header className="page-header"><div><h1>{t('myGoals')}</h1><p>{t('goalsSubtitle')}</p></div></header><section className="goals-grid">{data.goals.map((goal) => { const Icon = icons[goal.icon]; const progress = Math.round((goal.saved / goal.target) * 100); return <Card className="goal-card" key={goal.id}><div className="goal-card__visual"><Icon size={34}/><span>{progress}%</span></div><div><h2>{t(goal.name as Parameters<typeof t>[0])}</h2><p>{formatCurrency(goal.saved, language)} {t('of')} {formatCurrency(goal.target, language)}</p><div className="progress"><span style={{ width: `${progress}%` }}/></div><strong>{formatCurrency(goal.target - goal.saved, language)} {t('remaining')}</strong></div></Card>})}</section></div>
}
