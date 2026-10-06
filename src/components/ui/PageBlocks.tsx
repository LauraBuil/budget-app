import { useState, type ReactNode } from 'react'
import { useApp } from '../../context/AppContext'
import type { TranslationKey } from '../../lib/i18n'

export interface PageBlockOption { id: string; label: TranslationKey }

export function usePageBlocks(page: string, options: PageBlockOption[]) {
  const key = `gasel-hidden-blocks-${page}`
  const [hidden, setHidden] = useState<string[]>(() => JSON.parse(localStorage.getItem(key) || '[]'))
  function setVisibility(id: string, visible: boolean) {
    setHidden((current) => {
      const next = visible ? current.filter((item) => item !== id) : [...new Set([...current, id])]
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }
  return { options, isVisible: (id: string) => !hidden.includes(id), setVisibility }
}

export function PageBlockSelector({ controller }: { controller: ReturnType<typeof usePageBlocks> }) {
  const { t } = useApp()
  return <details className="page-block-selector"><summary>{t('customize')}</summary><div>{controller.options.map((option) => <label key={option.id}><input type="checkbox" checked={controller.isVisible(option.id)} onChange={(event) => controller.setVisibility(option.id, event.target.checked)}/>{t(option.label)}</label>)}</div></details>
}

export function PageBlock({ children }: { children: ReactNode }) {
  return <section className="page-block">{children}</section>
}
