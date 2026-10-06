import { BarChart3, CalendarDays, Goal, House, LogOut, Menu, Settings, Tags, WalletCards, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { Brand } from '../Brand'
import { useApp } from '../../context/AppContext'

const navigation = [
  { to: '/', key: 'home', icon: House },
  { to: '/transactions', key: 'transactions', icon: WalletCards },
  { to: '/budgets', key: 'budgets', icon: Tags },
  { to: '/goals', key: 'goals', icon: Goal },
  { to: '/analytics', key: 'analytics', icon: BarChart3 },
  { to: '/calendar', key: 'calendar', icon: CalendarDays },
] as const

export function AppShell() {
  const { t, user, logout } = useApp()
  const [open, setOpen] = useState(false)
  return (
    <div className="app-shell">
      <button className="mobile-menu" onClick={() => setOpen(true)} aria-label={t('menu')}><Menu /></button>
      {open && <button className="sidebar-backdrop" onClick={() => setOpen(false)} aria-label={t('closeMenu')} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <Brand compact />
          <button className="sidebar__close" onClick={() => setOpen(false)} aria-label={t('close')}><X /></button>
        </div>
        <nav className="sidebar__nav">
          {navigation.map(({ to, key, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              <Icon size={18} /><span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}><Settings size={18} /><span>{t('settings')}</span></NavLink>
          <div className="profile-chip">
            <div className="avatar">{user?.displayName.slice(0, 1).toUpperCase()}</div>
            <div><strong>{user?.displayName}</strong><span>{user?.email}</span></div>
            <button onClick={logout} aria-label={t('signOut')}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  )
}
