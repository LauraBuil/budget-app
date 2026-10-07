import { X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Goal, Transaction } from '../types'
import { TransactionList } from './TransactionList'
import { InlineEditableAmount } from './ui/InlineEditableAmount'
import { InlineEditableText } from './ui/InlineEditableText'

type DetailKind = 'income' | 'expense' | 'savings'

export function DashboardDetailModal({ kind, transactions, goals, onClose }: { kind: DetailKind | null; transactions: Transaction[]; goals: Goal[]; onClose: () => void }) {
  const { t, language, updateGoal } = useApp()
  if (!kind) return null
  const title = kind === 'income' ? t('income') : kind === 'expense' ? t('expenses') : t('savings')
  return <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal dashboard-detail-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-detail-title"><header><h2 id="dashboard-detail-title">{title}</h2><button type="button" onClick={onClose} aria-label={t('close')}><X size={20}/></button></header>{kind === 'savings' ? <div className="dashboard-detail-modal__goals">{goals.length ? goals.map((goal) => <div key={goal.id}><strong><InlineEditableText value={goal.name} display={t(goal.name as Parameters<typeof t>[0])} label={t('goalName')} onSave={(name) => updateGoal(goal.id, { name, target: goal.target, saved: goal.saved, dueDate: goal.dueDate, icon: goal.icon })}/></strong><span><InlineEditableAmount value={goal.saved} language={language} label={t('saved')} onSave={(saved) => updateGoal(goal.id, { name: goal.name, target: goal.target, saved, dueDate: goal.dueDate, icon: goal.icon })}/> / <InlineEditableAmount value={goal.target} language={language} label={t('goalTarget')} onSave={(target) => updateGoal(goal.id, { name: goal.name, target, saved: goal.saved, dueDate: goal.dueDate, icon: goal.icon })}/></span></div>) : <p>{t('noEntries')}</p>}</div> : transactions.length ? <TransactionList transactions={transactions.filter((item) => item.type === kind)}/> : <p className="dashboard-detail-modal__empty">{t('noEntries')}</p>}</section></div>
}
