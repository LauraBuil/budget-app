import { Languages, Moon, Sun } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { InlineEditableName } from '../components/profile/InlineEditableName'
import { useApp } from '../context/AppContext'

export function SettingsPage() {
  const { t, theme, setTheme, language, setLanguage, user, updateDisplayName, logout } = useApp()
  return <div className="page settings-page"><header className="page-header"><div><h1>{t('settings')}</h1><p>{t('profile')}</p></div></header><Card className="settings-card"><div className="settings-profile"><div className="avatar avatar--large">{user?.displayName[0]}</div><div><InlineEditableName name={user?.displayName || ''} ariaLabel={t('editName')} onSave={updateDisplayName}/><span>{user?.email}</span></div></div><div className="setting-row"><div><strong>{t('appearance')}</strong><span>{theme === 'light' ? t('light') : t('dark')}</span></div><div className="setting-options"><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><Sun size={17}/>{t('light')}</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><Moon size={17}/>{t('dark')}</button></div></div><div className="setting-row"><div><strong>{t('language')}</strong><span>{language === 'fr' ? 'Français' : 'English'}</span></div><div className="setting-options"><button className={language === 'fr' ? 'active' : ''} onClick={() => setLanguage('fr')}><Languages size={17}/>FR</button><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}><Languages size={17}/>EN</button></div></div><Button variant="secondary" onClick={logout}>{t('signOut')}</Button></Card></div>
}
