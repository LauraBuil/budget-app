export function parseAmount(value: string) {
  const parsed = Number(value.trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}
