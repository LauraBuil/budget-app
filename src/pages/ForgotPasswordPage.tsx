import { useState, type FormEvent } from 'react'
import { ArrowLeft, Mail } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { AuthPageLayout } from '../components/auth/AuthPageLayout'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'

export function ForgotPasswordPage() {
  const { t, resetPassword, user, isAuthReady } = useApp()
  const [error, setError] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!isAuthReady) return null
  if (user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email'))
    setLoading(true)
    setError(false)
    try {
      await resetPassword(email)
      setSent(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPageLayout>
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-card__heading"><span className="eyebrow">Gasel</span><h1>{t('forgotPasswordTitle')}</h1><p>{t('forgotPasswordSubtitle')}</p></div>
        {sent ? <p className="form-success" role="status">{t('resetEmailSent')}</p> : <><label>{t('email')}<div className="input-with-icon"><Mail size={18}/><input required name="email" type="email" placeholder={t('emailPlaceholder')} autoComplete="email" /></div></label>{error && <p className="form-error">{t('cannotResetPassword')}</p>}<Button type="submit" disabled={loading}>{t('sendResetLink')}</Button></>}
        <Link className="back-to-login" to="/login"><ArrowLeft size={15}/>{t('backToLogin')}</Link>
      </form>
    </AuthPageLayout>
  )
}
