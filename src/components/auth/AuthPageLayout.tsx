import type { ReactNode } from 'react'
import { Brand } from '../Brand'
import { useApp } from '../../context/AppContext'

export function AuthPageLayout({ children }: { children: ReactNode }) {
  const { t } = useApp()

  return (
    <main className="login-page">
      <section className="login-art">
        <Brand />
        <div className="login-art__copy"><span>{t('yourMoney')}</span><span>{t('yourFreedom')}</span><span>{t('yourBeautifulLife')}</span></div>
        <div className="botanical" aria-hidden="true"><span>✦</span><span>❀</span><span>⌁</span></div>
      </section>
      <section className="login-panel">
        <div className="login-panel__top"><Brand compact /></div>
        {children}
      </section>
    </main>
  )
}
