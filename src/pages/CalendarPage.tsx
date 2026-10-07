import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/ui/Card'
import { MonthPicker } from '../components/ui/MonthPicker'
import { CalendarDayModal } from '../components/CalendarDayModal'
import { TransactionModal } from '../components/TransactionModal'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'
import { transactionDraftWithLabel } from '../lib/transactionDraft'
import type { Transaction } from '../types'
import { InlineEditableText } from '../components/ui/InlineEditableText'

const currentMonth = () => new Date().toISOString().slice(0, 7)

export function CalendarPage() {
  const { data, t, language, refreshTransactions, updateTransaction } = useApp()
  const [month, setMonth] = useState(currentMonth)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editor, setEditor] = useState<{ date: string; transaction?: Transaction } | null>(null)

  useEffect(() => { void refreshTransactions(month, month) }, [month, refreshTransactions])

  const daysInMonth = new Date(`${month}-01T12:00:00`).getMonth() + 1
  const days = Array.from({ length: new Date(new Date(`${month}-01T12:00:00`).getFullYear(), daysInMonth, 0).getDate() }, (_, index) => index + 1)
  const firstDay = (new Date(`${month}-01T12:00:00`).getDay() + 6) % 7
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short' }).format(new Date(2024, 0, 1 + index)))
  const transactions = useMemo(() => data.transactions.filter((item) => item.date.startsWith(month)), [data.transactions, month])
  const selectedTransactions = selectedDate ? transactions.filter((item) => item.date === selectedDate) : []
  const today = new Date().toISOString().slice(0, 10)
  const upcomingTransactions = useMemo(() => transactions.filter((item) => item.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5), [transactions, today])

  return <div className="page">
    <header className="page-header"><div><h1>{t('calendarTitle')}</h1><p><MonthPicker value={month} language={language} onChange={setMonth}/></p></div></header>
    <section className="calendar-layout">
      <Card className="calendar-card"><div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: firstDay }).map((_, index) => <span key={`blank-${index}`} />)}{days.map((day) => { const date = `${month}-${String(day).padStart(2, '0')}`; const entries = transactions.filter((item) => item.date === date); return <button key={day} type="button" className={entries.length ? 'has-payment' : ''} onClick={() => setSelectedDate(date)}><span>{day}</span><div className="calendar-day__entries">{entries.slice(0, 2).map((item) => <small key={item.id}>{item.type === 'income' ? '+' : '−'} {item.label}</small>)}{entries.length > 2 && <small>+{entries.length - 2}</small>}</div></button> })}</div></Card>
      <Card className="panel upcoming-panel"><div className="panel__header"><h2>{t('upcoming')}</h2></div>{upcomingTransactions.map((transaction) => <div className="upcoming-item" key={transaction.id}><span>{transaction.date.slice(-2)}</span><div><strong><InlineEditableText value={transaction.label} label={t('description')} onSave={(label) => updateTransaction(transaction.id, transactionDraftWithLabel(transaction, label))}/></strong><small className={`transaction-amount--${transaction.type}`}>{transaction.type === 'income' ? '+' : '−'} {formatCurrency(transaction.amount, language)}</small></div></div>)}</Card>
    </section>
    <CalendarDayModal date={selectedDate} transactions={selectedTransactions} onClose={() => setSelectedDate(null)} onAdd={() => { if (selectedDate) setEditor({ date: selectedDate }); setSelectedDate(null) }} onEdit={(transaction) => { setEditor({ date: transaction.date, transaction }); setSelectedDate(null) }}/>
    <TransactionModal open={Boolean(editor)} initialDate={editor?.date} transaction={editor?.transaction} onClose={() => setEditor(null)}/>
  </div>
}
