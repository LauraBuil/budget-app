import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthPoint } from '../types'

export function FinancialChart({ data }: { data: MonthPoint[] }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs><linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8f907c" stopOpacity=".28"/><stop offset="100%" stopColor="#8f907c" stopOpacity="0"/></linearGradient><linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cf7e78" stopOpacity=".22"/><stop offset="100%" stopColor="#cf7e78" stopOpacity="0"/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="rgba(146, 126, 121, .28)" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#927e79', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#927e79', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#fffaf7', border: '1px solid rgba(146, 126, 121, .28)', borderRadius: 12 }} />
          <Area type="monotone" dataKey="income" stroke="#8f907c" strokeWidth={2} fill="url(#incomeGradient)" />
          <Area type="monotone" dataKey="expense" stroke="#cf7e78" strokeWidth={2} fill="url(#expenseGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
