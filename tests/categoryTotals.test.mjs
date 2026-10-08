import assert from 'node:assert/strict'
import test from 'node:test'
import { groupCategoryTotals } from '../src/lib/groupCategoryTotals.ts'

const entry = (category, amount, percentage = 0) => ({ category, amount, percentage, color: '#c87d78' })

test('renamed Netflix and subscriptions share one slice without losing any amount', () => {
  const input = [entry('rent', 1655.73, 93), entry('abonnement', 104.99, 6), entry('netflix', 14.99, 1)]
  const names = { rent: 'Loyer', abonnement: 'Abonnement', netflix: 'Abonnement' }
  const snapshot = structuredClone(input)
  const result = groupCategoryTotals(input, (slug) => names[slug])
  assert.equal(result.length, 2)
  assert.equal(result[1].amount, 119.98)
  assert.equal(result[1].percentage, 7)
  assert.equal(Math.round(result.reduce((sum, item) => sum + item.amount, 0) * 100), 177571)
  assert.deepEqual(input, snapshot)
})

test('case and whitespace variations do not split the same label', () => {
  const result = groupCategoryTotals([entry('first', 10), entry('second', 20)],
    (slug) => slug === 'first' ? ' Abonnement ' : 'ABONNEMENT')
  assert.equal(result.length, 1)
  assert.equal(result[0].amount, 30)
  assert.equal(result[0].percentage, 100)
})

test('different labels remain separate, including income categories', () => {
  const data = [entry('salary', 1000), entry('benefit', 200)]
  const result = groupCategoryTotals(data, (slug) => slug === 'salary' ? 'Salary' : 'Benefits')
  assert.equal(result.length, 2)
  assert.deepEqual(result.map((item) => item.amount), [1000, 200])
  assert.equal(result[0].color, data[0].color)
})

test('empty data produces no chart groups', () => {
  assert.deepEqual(groupCategoryTotals([], (slug) => slug), [])
})
