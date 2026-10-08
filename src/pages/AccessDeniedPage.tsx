import { Navigate } from 'react-router-dom'
import { AccountStatusCard } from '../components/auth/AccountStatusCard'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'

export function AccessDeniedPage() {
  const { t, user, isAuthReady, logout } = useApp()

  if (!isAuthReady) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.access === 'granted') return <Navigate to="/" replace />
  if (user.access === 'verificationRequired') return <Navigate to="/verify-email" replace />

  return (
    <AccountStatusCard eyebrow="Gasel" title={t('blockedEmailDomainTitle')} description={t('blockedEmailDomainDescription')} email={user.email}>
      <Button variant="secondary" onClick={logout}>{t('signOut')}</Button>
    </AccountStatusCard>
  )
}
