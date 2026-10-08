import type { ReactNode } from 'react'
import { AuthPageLayout } from './AuthPageLayout'

interface AccountStatusCardProps {
  eyebrow: string
  title: string
  description: string
  email?: string
  error?: string
  children: ReactNode
}

export function AccountStatusCard({ eyebrow, title, description, email, error, children }: AccountStatusCardProps) {
  return (
    <AuthPageLayout>
      <section className="login-card account-status-card">
        <div className="login-card__heading">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {email ? <strong className="account-status-card__email">{email}</strong> : null}
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="account-status-card__actions">{children}</div>
      </section>
    </AuthPageLayout>
  )
}
