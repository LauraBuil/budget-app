import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../lib/format'
import type { Language } from '../types'
import type { PeriodComparison } from '../lib/financialData'

interface PeriodComparisonChartProps {
  data: PeriodComparison
  language: Language
  labels: { income: string; expense: string; balance: string }
}

export function PeriodComparisonChart({ data, language, labels }: PeriodComparisonChartProps) {
  const values = [
    { name: labels.income, amount: data.income, color: '#8f907c' },
    { name: labels.expense, amount: data.expense, color: '#cf7e78' },
    { name: labels.balance, amount: data.balance, color: data.balance >= 0 ? '#8ca6a0' : '#9a5a56' },
  ]
  return (
    <div className="comparison-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={values} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="rgba(146, 126, 121, .28)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#927e79', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#927e79', fontSize: 11 }} />
          <Tooltip formatter={(value) => formatCurrency(Number(value), language)} />
          <Bar dataKey="amount" radius={[7, 7, 0, 0]}>{values.map((item) => <Cell key={item.name} fill={item.color} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
