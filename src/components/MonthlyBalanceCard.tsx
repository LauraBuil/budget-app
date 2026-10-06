import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'
import { Card } from './ui/Card'

export function MonthlyBalanceCard({ month, income, expenses, onChange }: { month: string; income: number; expenses: number; onChange?: (value: number) => void }) {
  const { t, language, getOpeningBalance, saveOpeningBalance } = useApp()
  const [openingBalance, setOpeningBalance] = useState(0)
  const [value, setValue] = useState('0')

  useEffect(() => {
    let active = true
    void getOpeningBalance(month).then((balance) => { if (active) { setOpeningBalance(balance); setValue(String(balance)); onChange?.(balance) } })
    return () => { active = false }
  }, [getOpeningBalance, month, onChange])

  async function save() {
    const next = Number(value)
    if (!Number.isFinite(next)) { setValue(String(openingBalance)); return }
    const saved = await saveOpeningBalance(month, next)
    setOpeningBalance(saved); setValue(String(saved)); onChange?.(saved)
  }

  const currentBalance = openingBalance + income - expenses
  return <Card className="monthly-balance-card"><div><span>{t('previousMonthBalance')}</span><input aria-label={t('previousMonthBalance')} type="number" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => void save()} onKeyDown={(event) => { if (event.key === 'Enter') { event.currentTarget.blur() } }}/></div><div><span>{t('currentBalance')}</span><strong>{formatCurrency(currentBalance, language)}</strong></div></Card>
}
