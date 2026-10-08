import { useApp } from '../../context/AppContext'

interface RecurrenceToggleProps {
  recurring: boolean
  onChange: (recurring: boolean) => void
  compact?: boolean
}

export function RecurrenceToggle({ recurring, onChange, compact = false }: RecurrenceToggleProps) {
  const { t } = useApp()

  if (compact) return <button type="button" className={`recurrence-toggle--compact${recurring ? ' recurrence-toggle--active' : ''}`} aria-pressed={recurring} onClick={() => onChange(!recurring)}>{recurring ? t('recurring') : t('oneOff')}</button>

  return <div className="recurrence-toggle" role="group" aria-label={t('recurring')}>
    <button type="button" className={!recurring ? 'active' : ''} aria-pressed={!recurring} onClick={() => onChange(false)}>{t('oneOff')}</button>
    <button type="button" className={recurring ? 'active' : ''} aria-pressed={recurring} onClick={() => onChange(true)}>{t('recurring')}</button>
  </div>
}
