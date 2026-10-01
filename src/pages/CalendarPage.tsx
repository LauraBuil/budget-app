import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/format'

export function CalendarPage() {
  const { t, language } = useApp()
  const days = Array.from({ length: 31 }, (_, index) => index + 1)
  const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short' }).format(new Date(2026, 9, 5 + index)))
  return <div className="page"><header className="page-header"><div><h1>{t('calendarTitle')}</h1><p>{t('october2026')}</p></div></header><section className="calendar-layout"><Card className="calendar-card"><div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: 3 }).map((_, index) => <span key={`blank-${index}`} />)}{days.map((day) => <button key={day} className={[1,2,4,5,6].includes(day) ? 'has-payment' : ''}><span>{day}</span>{day === 1 && <small>{t('salary')}</small>}{day === 2 && <small>{t('rent')}</small>}{day === 4 && <small>Spotify</small>}</button>)}</div></Card><Card className="panel upcoming-panel"><div className="panel__header"><h2>{t('upcoming')}</h2></div><div className="upcoming-item"><span>02</span><div><strong>{t('rent')}</strong><small>{formatCurrency(905, language)}</small></div></div><div className="upcoming-item"><span>04</span><div><strong>Spotify</strong><small>{formatCurrency(12.99, language)}</small></div></div><div className="upcoming-item"><span>15</span><div><strong>{t('electricity')}</strong><small>{formatCurrency(100, language)}</small></div></div></Card></section></div>
}
