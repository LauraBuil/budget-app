import { useApp } from '../../context/AppContext'

export function RecurrenceScope({ value, onChange }: { value: 'this' | 'future'; onChange: (value: 'this' | 'future') => void }) {
  const { t } = useApp()
  return <fieldset className="recurrence-scope form-grid__wide">
    <legend>{t('applyTo')}</legend>
    <label><input type="radio" name="recurrence-scope" checked={value === 'this'} onChange={() => onChange('this')}/>{t('thisOccurrence')}</label>
    <label><input type="radio" name="recurrence-scope" checked={value === 'future'} onChange={() => onChange('future')}/>{t('thisAndFollowing')}</label>
    <small>{t('recurrenceScopeHint')}</small>
  </fieldset>
}
