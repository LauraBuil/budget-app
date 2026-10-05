const MAX_MONTH_DISTANCE = 1200

export function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function monthIndex(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null
  const [year, month] = value.split('-').map(Number)
  return year * 12 + month - 1
}

export function isSupportedMonth(value, referenceMonth = currentMonth()) {
  const index = monthIndex(value)
  const referenceIndex = monthIndex(referenceMonth)
  return index !== null && referenceIndex !== null && Math.abs(index - referenceIndex) <= MAX_MONTH_DISTANCE
}

export function shiftMonthValue(value, amount) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + amount, 1))
  return date.toISOString().slice(0, 7)
}

export function dateForMonth(month, day) {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

export function getRecurrenceWindow(requestedMonth, storedStart, storedEnd) {
  const start = isSupportedMonth(storedStart) ? storedStart : currentMonth()
  const previousEnd = isSupportedMonth(storedEnd) ? storedEnd : shiftMonthValue(start, 5)
  const shouldExtend = requestedMonth === previousEnd
  const generationStart = shouldExtend ? shiftMonthValue(previousEnd, 1) : shiftMonthValue(previousEnd, -5)
  const end = shouldExtend ? shiftMonthValue(previousEnd, 6) : previousEnd
  const months = Array.from({ length: 6 }, (_, offset) => shiftMonthValue(generationStart, offset))
  return { start, end, months }
}
