interface LoadingStateProps {
  label: string
  fullPage?: boolean
  compact?: boolean
}

export function LoadingState({ label, fullPage = false, compact = false }: LoadingStateProps) {
  return (
    <div className={`loading-state${fullPage ? ' loading-state--page' : ''}${compact ? ' loading-state--compact' : ''}`} role="status" aria-live="polite">
      <span className="loading-state__mark" aria-hidden="true"><i/><i/><i/></span>
      <span>{label}</span>
    </div>
  )
}
