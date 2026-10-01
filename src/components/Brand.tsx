export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label="Bloom Budget">
      <span className="brand__bloom">Bloom</span>
      <span className="brand__budget">Budget</span>
    </div>
  )
}
