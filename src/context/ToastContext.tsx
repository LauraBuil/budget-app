import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { translate } from '../lib/i18n'

type ToastKind = 'success' | 'error'

interface ToastMessage {
  id: number
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    const next = { id: Date.now(), message, kind }
    setToast(next)
    timeoutRef.current = window.setTimeout(() => setToast((current) => current?.id === next.id ? null : current), 3200)
  }, [])

  useEffect(() => () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current) }, [])
  useEffect(() => {
    const onError = (event: Event) => {
      const code = (event as CustomEvent<string>).detail
      const key = code === 'NETWORK_ERROR' ? 'cannotConnect' : code === 'RECURRENCE_ALREADY_EXISTS' ? 'recurrenceAlreadyExists' : code === 'CATEGORY_IN_USE' ? 'categoryInUse' : code === 'RECURRENCE_MONTH_CHANGE' ? 'recurrenceMonthChange' : 'cannotSave'
      showToast(translate(localStorage.getItem('gasel-language') === 'en' ? 'en' : 'fr', key), 'error')
    }
    window.addEventListener('gasel:api-error', onError)
    return () => window.removeEventListener('gasel:api-error', onError)
  }, [showToast])

  return <ToastContext.Provider value={{ showToast }}>{children}{toast && <div className={`toast toast--${toast.kind}`} role="status" aria-live="polite">{toast.message}</div>}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
