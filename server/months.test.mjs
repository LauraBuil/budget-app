import assert from 'node:assert/strict'
import { dateForMonth, getRecurrenceWindow, isSupportedMonth } from './months.mjs'

assert.equal(isSupportedMonth('2026-00', '2026-10'), false)
assert.equal(isSupportedMonth('2026-13', '2026-10'), false)
assert.equal(isSupportedMonth('9999-12', '2026-10'), false)
assert.equal(isSupportedMonth('2026-10', '2026-10'), true)

assert.deepEqual(getRecurrenceWindow('2026-10', '2026-10', '2027-03'), {
  start: '2026-10',
  end: '2027-03',
  months: [],
})
assert.deepEqual(getRecurrenceWindow('2027-03', '2026-10', '2027-03'), {
  start: '2026-10',
  end: '2027-09',
  months: ['2027-04', '2027-05', '2027-06', '2027-07', '2027-08', '2027-09'],
})
assert.equal(dateForMonth('2027-02', 31), '2027-02-28')

console.log('Month security checks passed')
