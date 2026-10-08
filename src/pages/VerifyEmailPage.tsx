import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AccountStatusCard } from '../components/auth/AccountStatusCard'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'

export function VerifyEmailPage() {
  const { t, user, isAuthReady, resendVerificationEmail, refreshEmailVerification, logout } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isAuthReady) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.access === 'granted') return <Navigate to="/" replace />
  if (user.access === 'emailDomainBlocked') return <Navigate to="/access-denied" replace />

  async function run(action: () => Promise<void>) {
    setLoading(true)
    setError('')
    try { await action() }
    catch (cause) { setError(cause instanceof Error && cause.message === 'EMAIL_NOT_VERIFIED' ? t('emailStillUnverified') : t('cannotConnect')) }
    finally { setLoading(false) }
  }

  return (
    <AccountStatusCard eyebrow="Gasel" title={t('verifyEmailTitle')} description={t('verifyEmailDescription')} email={user.email} error={error}>
      <Button disabled={loading} onClick={() => run(refreshEmailVerification)}>{t('checkVerification')}</Button>
      <Button disabled={loading} variant="secondary" onClick={() => run(resendVerificationEmail)}>{t('resendVerification')}</Button>
      <Button disabled={loading} variant="ghost" onClick={logout}>{t('signOut')}</Button>
    </AccountStatusCard>
  )
}
