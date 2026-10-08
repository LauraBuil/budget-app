import { ICON_OPTIONS, type IconId } from '../../lib/icons'
import { useApp } from '../../context/AppContext'

interface IconPickerProps {
  value: IconId
  onChange: (icon: IconId) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const { t } = useApp()
  return <div className="icon-picker">{ICON_OPTIONS.map(({ id, icon: Icon, label }) => <button key={id} type="button" className={value === id ? 'active' : ''} onClick={() => onChange(id)} aria-label={t(label)} title={t(label)}><Icon size={17}/></button>)}</div>
}
