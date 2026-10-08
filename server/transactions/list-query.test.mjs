import assert from 'node:assert/strict'
import dotenv from 'dotenv'
import { Client } from '@neondatabase/serverless'
import { buildTransactionListQuery } from './list-query.mjs'

dotenv.config({ path: '.env.local', quiet: true })
const db = new Client({ connectionString: process.env.DATABASE_URL })
await db.connect()
let checks = 0
const equal = (actual, expected) => { assert.deepEqual(actual, expected); checks++ }
try {
  await db.query('BEGIN')
  for (const name of ['transactions', 'categories', 'recurring_expenses']) await db.query(`CREATE TEMP TABLE ${name} (LIKE public.${name} INCLUDING ALL) ON COMMIT DROP`)
  await db.query(`INSERT INTO categories(id,user_id,slug,name,type) VALUES ('category-test','filter-test','subscription','Abonnement','expense'),('category-other','other-user','subscription','Secret','expense')`)
  const fixtures = [
    ['a','filter-test','Netflix','expense','subscription','fixed','2026-10-01'],
    ['b','filter-test','Restaurant','expense','dining','nonEssential','2026-10-05'],
    ['c','filter-test','Courses','expense','groceries','daily','2026-10-05'],
    ['d','filter-test','Garage','expense','unexpected','unexpected','2026-10-20'],
    ['e','filter-test','Salaire','income','salary','daily','2026-10-05'],
    ['f','other-user','Netflix','expense','subscription','fixed','2026-10-01'],
    ['g','filter-test','Netflix','expense','subscription','fixed','2026-11-01'],
    ['h','filter-test','EDF','expense','electricity','fixed','2026-10-09'],
  ]
  for (const row of fixtures) await db.query('INSERT INTO transactions(id,user_id,label,type,category,expense_group,date,amount) VALUES ($1,$2,$3,$4,$5,$6,$7,10)', row)
  const list = async (filters = {}, limit = 1000) => {
    const query = buildTransactionListQuery('filter-test', filters, '2026-10', '2026-10', limit)
    return (await db.query(query.text, query.values)).rows.map((row) => row.id)
  }
  equal(await list(), ['d','h','e','c','b','a'])
  equal(await list({ sort: 'asc' }), ['a','b','c','e','h','d'])
  equal(await list({ expenseGroups: 'fixed,nonEssential' }), ['h','b','a'])
  equal(await list({ expenseGroups: 'fixed,nonEssential', categories: 'subscription,dining' }), ['b','a'])
  equal(await list({ expenseGroups: 'fixed', categories: 'subscription,dining', search: 'abonnement' }), ['a'])
  equal(await list({ search: '05/10/2026' }), ['e','c','b'])
  equal(await list({ search: '5/10/2026' }), ['e','c','b'])
  equal(await list({ search: '2026-10-05' }), ['e','c','b'])
  equal(await list({ search: 'non essentiel' }), ['b'])
  equal(await list({ search: 'non essentiels' }), ['b'])
  equal(await list({ search: 'Dépenses du quotidien' }), ['c'])
  equal(await list({ search: 'charges fixes' }), ['h','a'])
  equal(await list({ search: 'électricité' }), ['h'])
  equal(await list({ search: 'electricite' }), ['h'])
  equal(await list({ search: 'alimentation' }), ['c'])
  equal(await list({ search: 'income' }), ['e'])
  equal(await list({ search: 'non-essential' }), ['b'])
  equal(await list({ search: 'Secret' }), [])
  equal(await list({ search: "' OR 1=1 --" }), [])
  equal(await list({ offset: '1', sort: 'asc' }, 2), ['b','c'])
  for (const filters of [{ sort: 'asc; DROP TABLE transactions' }, { expenseGroups: 'invalid' }, { search: ['bad'] }, { offset: '-1' }]) {
    assert.throws(() => buildTransactionListQuery('filter-test', filters)); checks++
  }
  console.log(`${checks} backend filter, search, sort, pagination and isolation checks passed (temporary tables only).`)
} finally { await db.query('ROLLBACK'); await db.end() }
