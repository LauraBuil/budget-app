import { PiggyBank, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { parseAmount } from '../lib/amount'
import { formatCurrency } from '../lib/format'
import { Card } from './ui/Card'
import { useCommitOnOutsidePress } from './ui/useCommitOnOutsidePress'

export function MonthlyBalanceCard({ month, income, expenses, onChange }: { month: string; income: number; expenses: number; onChange?: (value: number) => void }) {
  const { t, language, data, getOpeningBalance, saveOpeningBalance, restoreOpeningBalance, moveOpeningBalanceToGoal } = useApp()
  const [openingBalance, setOpeningBalance] = useState(0)
  const [automaticBalance, setAutomaticBalance] = useState(0)
  const [value, setValue] = useState('0')
  const [editing, setEditing] = useState(false)
  const [savingMenuOpen, setSavingMenuOpen] = useState(false)
  const [movingToSavings, setMovingToSavings] = useState(false)
  const inputContainerRef = useRef<HTMLSpanElement>(null)
  const savingRef = useRef(false)

  useEffect(() => {
    let active = true
    void getOpeningBalance(month).then((balance) => { if (active) { setOpeningBalance(balance.openingBalance); setAutomaticBalance(balance.automaticOpeningBalance); setValue(String(balance.openingBalance)); onChange?.(balance.openingBalance) } })
    return () => { active = false }
  }, [getOpeningBalance, month, onChange])

  const save = useCallback(async () => {
    if (savingRef.current) return
    const next = parseAmount(value)
    if (next === null) { setValue(String(openingBalance)); setEditing(false); return }
    savingRef.current = true
    try {
      const saved = await saveOpeningBalance(month, next)
      setOpeningBalance(saved); setValue(String(saved)); onChange?.(saved)
    } finally { savingRef.current = false; setEditing(false) }
  }, [month, onChange, openingBalance, saveOpeningBalance, value])

  useCommitOnOutsidePress(editing, inputContainerRef, () => { void save() })

  const restorePreviousBalance = useCallback(async () => {
    const restored = await restoreOpeningBalance(month)
    setOpeningBalance(restored.openingBalance)
    setAutomaticBalance(restored.automaticOpeningBalance)
    setValue(String(restored.openingBalance))
    setEditing(false)
    onChange?.(restored.openingBalance)
  }, [month, onChange, restoreOpeningBalance])

  const moveToSavings = useCallback(async (goalId: string) => {
    const amount = Math.max(parseAmount(value) ?? openingBalance, 0)
    if (!data.goals.some((item) => item.id === goalId) || amount === 0) return
    setMovingToSavings(true)
    try {
      const saved = await moveOpeningBalanceToGoal(month, goalId, amount)
      setOpeningBalance(saved); setValue(String(saved)); onChange?.(saved)
      setSavingMenuOpen(false)
    } finally { setMovingToSavings(false) }
  }, [data.goals, month, moveOpeningBalanceToGoal, onChange, openingBalance, value])

  const currentBalance = openingBalance + income - expenses
  const transferableAmount = Math.max(parseAmount(value) ?? openingBalance, 0)
  return <Card className="monthly-balance-card"><div><span>{t('previousMonthBalance')}</span><span className="opening-balance-field" ref={inputContainerRef}><input aria-label={t('previousMonthBalance')} type="text" inputMode="decimal" value={value} onFocus={() => setEditing(true)} onChange={(event) => setValue(event.target.value)} onBlur={() => void save()} onKeyDown={(event) => { if (event.key === 'Enter') void save(); if (event.key === 'Escape') { setValue(String(openingBalance)); setEditing(false) } }}/><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void restorePreviousBalance()} aria-label={t('restorePreviousBalance')} title={t('restorePreviousBalance')} disabled={openingBalance === automaticBalance}><RotateCcw size={14}/></button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setSavingMenuOpen((current) => !current)} aria-label={t('moveToSavings')} title={t('moveToSavings')} disabled={transferableAmount <= 0 || !data.goals.length}><PiggyBank size={14}/></button>{savingMenuOpen && <span className="opening-balance-savings-menu">{data.goals.map((goal) => <button key={goal.id} type="button" disabled={movingToSavings} onMouseDown={(event) => event.preventDefault()} onClick={() => void moveToSavings(goal.id)}>{goal.name}</button>)}</span>}</span></div><div><span>{t('currentBalance')}</span><strong>{formatCurrency(currentBalance, language)}</strong></div></Card>
}
