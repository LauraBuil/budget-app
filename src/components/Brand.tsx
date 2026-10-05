import { useApp } from '../context/AppContext'

export function Brand({ compact = false }: { compact?: boolean }) {
  const { theme } = useApp()
  const logo = compact ? (theme === 'dark' ? '/brand/logo-sombre.png' : '/brand/logo-clair.png') : '/brand/logo-normal.png'
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="Gasel">
      <img className="brand__logo" src={logo} alt="Gasel" />
    </div>
  )
}
