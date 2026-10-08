import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { AuthPageLayout } from '../components/auth/AuthPageLayout'
import { GoogleIcon } from '../components/icons/GoogleIcon'
import { Button } from '../components/ui/Button'
import { useApp } from '../context/AppContext'

export function LoginPage() {
  const { t, login, loginWithGoogle, user, isAuthReady } = useApp()
  const [register, setRegister] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isAuthReady) return null
  if (user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setLoading(true)
    setError('')
    try { await login(String(data.get('email')), String(data.get('password')), register) }
    catch (cause) { setError(cause instanceof Error && cause.message === 'FIREBASE_NOT_CONFIGURED' ? t('demoNotice') : t('cannotConnect')) }
    finally { setLoading(false) }
  }

  async function onGoogleSignIn() {
    setLoading(true)
    setError('')
    try { await loginWithGoogle() }
    catch (cause) {
      if (cause instanceof Error && cause.message.includes('popup-closed-by-user')) return
      setError(cause instanceof Error && cause.message === 'FIREBASE_NOT_CONFIGURED' ? t('demoNotice') : t('cannotConnectWithGoogle'))
    }
    finally { setLoading(false) }
  }

  return (
    <AuthPageLayout>
      <form className="login-card" onSubmit={onSubmit}>
          <div className="login-card__heading"><span className="eyebrow">Gasel</span><h1>{t('loginTitle')}</h1><p>{t('loginSubtitle')}</p></div>
          <label>{t('email')}<div className="input-with-icon"><Mail size={18}/><input required name="email" type="email" placeholder={t('emailPlaceholder')} autoComplete="email" /></div></label>
          <label>{t('password')}<div className="input-with-icon"><LockKeyhole size={18}/><input required minLength={6} name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete={register ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={t('showPassword')}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
          {!register && <Link className="forgot-password-link" to="/forgot-password">{t('forgotPassword')}</Link>}
          {error && <p className="form-error">{error}</p>}
          <Button type="submit" disabled={loading}>{register ? t('createAccount') : t('signIn')}</Button>
          <div className="auth-divider"><span>{t('or')}</span></div>
          <Button type="button" variant="secondary" disabled={loading} onClick={onGoogleSignIn}><GoogleIcon />{t('continueWithGoogle')}</Button>
          <p className="auth-switch">{register ? t('alreadyAccount') : t('noAccount')} <button type="button" onClick={() => setRegister(!register)}>{register ? t('signIn') : t('createAccount')}</button></p>
      </form>
    </AuthPageLayout>
  )
}
