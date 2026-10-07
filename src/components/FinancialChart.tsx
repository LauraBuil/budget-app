import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../lib/format'
import type { Language, MonthPoint } from '../types'

function FinancialTooltip({ active, payload, label, language, labels }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string; language: Language; labels: { income: string; expense: string } }) {
  if (!active || !payload?.length) return null
  return <div className="financial-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.dataKey}>{item.dataKey === 'income' ? labels.income : labels.expense}<b>{formatCurrency(Number(item.value || 0), language)}</b></span>)}</div>
}

export function FinancialChart({ data, language, labels }: { data: MonthPoint[]; language: Language; labels: { income: string; expense: string } }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs><linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8f907c" stopOpacity=".28"/><stop offset="100%" stopColor="#8f907c" stopOpacity="0"/></linearGradient><linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cf7e78" stopOpacity=".22"/><stop offset="100%" stopColor="#cf7e78" stopOpacity="0"/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="rgba(146, 126, 121, .28)" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#927e79', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#927e79', fontSize: 11 }} />
          <Tooltip content={<FinancialTooltip language={language} labels={labels} />} />
          <Area type="monotone" dataKey="income" stroke="#8f907c" strokeWidth={2} fill="url(#incomeGradient)" />
          <Area type="monotone" dataKey="expense" stroke="#cf7e78" strokeWidth={2} fill="url(#expenseGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
