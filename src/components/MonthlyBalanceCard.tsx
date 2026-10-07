import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { parseAmount } from '../lib/amount'
import { formatCurrency } from '../lib/format'
import { Card } from './ui/Card'
import { useCommitOnOutsidePress } from './ui/useCommitOnOutsidePress'

export function MonthlyBalanceCard({ month, income, expenses, onChange }: { month: string; income: number; expenses: number; onChange?: (value: number) => void }) {
  const { t, language, getOpeningBalance, saveOpeningBalance } = useApp()
  const [openingBalance, setOpeningBalance] = useState(0)
  const [value, setValue] = useState('0')
  const [editing, setEditing] = useState(false)
  const inputContainerRef = useRef<HTMLSpanElement>(null)
  const savingRef = useRef(false)

  useEffect(() => {
    let active = true
    void getOpeningBalance(month).then((balance) => { if (active) { setOpeningBalance(balance); setValue(String(balance)); onChange?.(balance) } })
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

  const currentBalance = openingBalance + income - expenses
  return <Card className="monthly-balance-card"><div><span>{t('previousMonthBalance')}</span><span ref={inputContainerRef}><input aria-label={t('previousMonthBalance')} type="text" inputMode="decimal" value={value} onFocus={() => setEditing(true)} onChange={(event) => setValue(event.target.value)} onBlur={() => void save()} onKeyDown={(event) => { if (event.key === 'Enter') void save(); if (event.key === 'Escape') { setValue(String(openingBalance)); setEditing(false) } }}/></span></div><div><span>{t('currentBalance')}</span><strong>{formatCurrency(currentBalance, language)}</strong></div></Card>
}
