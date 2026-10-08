import assert from 'node:assert/strict'
import test from 'node:test'
import { getRecurrenceSettings } from '../src/lib/recurrenceSettings.ts'

const settings = { recurring: true, stopping: false, scope: 'this', date: '2026-10-17' }

test('creation derives the monthly day from the chosen date', () => {
  assert.deepEqual(getRecurrenceSettings(settings), { scope: 'this', recurrence: { day: 17 } })
  assert.equal(getRecurrenceSettings({ ...settings, recurring: false }).recurrence, null)
})

test('editing a February occurrence preserves an unchanged end-of-month schedule', () => {
  const transaction = { recurringId: 'series', date: '2027-02-28', recurrenceDay: 31 }
  assert.equal(getRecurrenceSettings({ ...settings, date: transaction.date, transaction }).recurrence.day, 31)
  assert.equal(getRecurrenceSettings({ ...settings, date: '2027-02-20', transaction }).recurrence.day, 20)
})

test('stopping explicitly targets this month and following months', () => {
  const transaction = { recurringId: 'series', date: settings.date, recurrenceDay: 17 }
  assert.deepEqual(getRecurrenceSettings({ ...settings, stopping: true, transaction }), { scope: 'future', recurrence: null })
  assert.deepEqual(getRecurrenceSettings({ ...settings, stopping: false, transaction }), { scope: 'this', recurrence: { day: 17 } })
})
