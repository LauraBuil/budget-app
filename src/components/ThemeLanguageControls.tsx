import { Languages, Moon, Sun } from 'lucide-react'
import { useApp } from '../context/AppContext'

export function ThemeLanguageControls({ compact = false, floating = false }: { compact?: boolean; floating?: boolean }) {
  const { theme, language, setTheme, setLanguage, t } = useApp()
  return (
    <div className={`preference-controls ${compact ? 'preference-controls--compact' : ''} ${floating ? 'preference-controls--floating' : ''}`}>
      <button className="icon-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={t('changeTheme')}>
        {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
      </button>
      <button className="language-toggle" onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} aria-label={t('changeLanguage')}>
        <Languages size={16} /><span>{language.toUpperCase()}</span>
      </button>
    </div>
  )
}
