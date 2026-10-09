import { formatCurrency } from '../lib/format'
import { groupCategoryTotals } from '../lib/groupCategoryTotals'
import { useMemo, useState, type MouseEvent } from 'react'
import type { CategoryTotal } from '../lib/financialData'
import type { Language } from '../types'

export interface CategoryBreakdownDetail {
  id: string
  category: string
  label: string
  amount: number
}

interface CategoryBreakdownChartProps {
  data: CategoryTotal[]
  language: Language
  categoryName: (slug: string) => string
  centerLabel: string
  details?: CategoryBreakdownDetail[]
}

const normalizedCategoryName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()

export function CategoryBreakdownChart({ data: categoryTotals, language, categoryName, centerLabel, details = [] }: CategoryBreakdownChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const data = useMemo(() => groupCategoryTotals(categoryTotals, categoryName), [categoryName, categoryTotals])
  if (!data.length) return <p className="chart-empty">{language === 'fr' ? 'Aucune donnée pour cette période.' : 'No data for this period.'}</p>
  const total = data.reduce((sum, item) => sum + item.amount, 0)
  let progress = 0
  const segments = data.map((item) => {
    const start = progress
    progress += (item.amount / total) * 100
    return `${item.color} ${start}% ${progress}%`
  }).join(', ')
  const hovered = hoveredIndex === null ? null : data[hoveredIndex]
  const hoveredDetails = hovered
    ? details
      .filter((item) => normalizedCategoryName(categoryName(item.category)) === normalizedCategoryName(categoryName(hovered.category)))
      .sort((first, second) => second.amount - first.amount)
    : []
  const updateHoveredSegment = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2
    const radius = Math.hypot(x, y)
    if (radius > rect.width / 2 || radius < rect.width * .3) return setHoveredIndex(null)
    const angle = (Math.atan2(y, x) * 180 / Math.PI + 450) % 360
    let totalProgress = 0
    const index = data.findIndex((item) => {
      totalProgress += (item.amount / total) * 360
      return angle <= totalProgress
    })
    setHoveredIndex(index === -1 ? null : index)
  }

  return <div className="category-chart">
    <div className="donut-layout">
      <div className="donut category-chart__donut" style={{ background: `conic-gradient(${segments})` }} onMouseMove={updateHoveredSegment} onMouseLeave={() => setHoveredIndex(null)}>
        <div><strong>{formatCurrency(total, language)}</strong><span>{centerLabel}</span></div>
        {hovered && <div className="category-chart__tooltip" role="tooltip">
          <strong>{categoryName(hovered.category)}</strong>
          <span>{formatCurrency(hovered.amount, language)} · {hovered.percentage}%</span>
          {hoveredDetails.length > 0 && <div className="category-chart__tooltip-details">
            {hoveredDetails.map((item) => <div key={item.id}><span>{item.label}</span><b>{formatCurrency(item.amount, language)}</b></div>)}
          </div>}
        </div>}
      </div>
      <div className="category-legend">{data.map((item) => <div key={item.category}><span style={{ background: item.color }} /><span>{categoryName(item.category)}</span><strong>{item.percentage}%</strong></div>)}</div>
    </div>
  </div>
}
