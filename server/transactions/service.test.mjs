import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { Client } from '@neondatabase/serverless'
import { transactionService } from './service.mjs'
import { resolveBalance, transferToSavings } from './balances.mjs'
import { validateTransaction } from './validation.mjs'

// Real PostgreSQL semantics, isolated temporary tables, always rolled back.
dotenv.config({path:'.env.local',quiet:true})
const db = new Client({connectionString:process.env.DATABASE_URL})
await db.connect()
let checks = 0
const equal = (actual, expected) => { assert.deepEqual(actual, expected); checks++ }
const reject = async (work, message) => { await assert.rejects(work, {message}); checks++ }
try {
  await db.query('BEGIN')
  for (const name of ['transactions','recurring_expenses','monthly_balances','goals']) {
    await db.query(`CREATE TEMP TABLE ${name} (LIKE public.${name} INCLUDING ALL) ON COMMIT DROP`)
  }
  const service = transactionService(db,'test-owner')
  const other = transactionService(db,'other-owner')
  const base = {label:'Netflix',amount:14.99,type:'expense',category:'netflix',expenseGroup:'fixed',date:'2026-10-31',note:'',icon:'subscription',recurrence:{day:31},clientRequestId:crypto.randomUUID()}
  const all = async () => (await db.query('SELECT *,date::text AS date FROM transactions WHERE user_id=$1 ORDER BY transactions.date', ['test-owner'])).rows
  const first = await service.create(base)
  equal((await all()).length,6)
  equal((await all())[1].date,'2026-11-30')
  equal((await all())[4].date,'2027-02-28')
  const february = await service.update((await all())[4].id,{...base,date:'2027-02-28'})
  equal(february.recurrenceDay,31)
  equal((await service.create(base)).id,first.id)
  equal((await all()).length,6)
  await reject(() => service.create({...base,clientRequestId:crypto.randomUUID(),category:'abonnement'}),'RECURRENCE_ALREADY_EXISTS')
  await reject(() => other.update(first.id,base),'TRANSACTION_NOT_FOUND')
  const november = (await all())[1]
  await service.update(november.id,{...base,date:'2026-11-30',amount:20,scope:'this'})
  equal((await all()).map(row=>Number(row.amount)),[14.99,20,14.99,14.99,14.99,14.99])
  await service.update(november.id,{...base,date:'2026-11-30',category:'abonnement',scope:'future'})
  equal((await all()).map(row=>row.category),['netflix','abonnement','abonnement','abonnement','abonnement','abonnement'])
  await service.sync('2027-03'); await service.sync('2027-03')
  equal((await all()).length,12)
  equal((await all()).at(-1).category,'abonnement')
  equal((await all()).at(-1).date,'2027-09-30')
  const december = (await all())[2]
  await service.update(december.id,{...base,date:'2026-12-31',category:'abonnement',recurrence:null,scope:'this'})
  equal((await all()).length,12)
  equal((await all())[2].is_recurring,false)
  await service.update(december.id,{...base,date:'2026-12-31',category:'abonnement',scope:'this'})
  equal((await all()).length,12)
  await service.remove(november.id,'this'); await service.sync('2027-03')
  equal((await all()).length,11)
  equal((await all()).some(row=>row.id===november.id),false)
  await service.remove(december.id,'future'); await service.sync('2028-03')
  equal((await all()).length,1)

  // Monthly carry-over includes only prior months, and respects manual zero/negative overrides.
  const income = {...base,label:'Salary',type:'income',category:'salary',amount:1000,date:'2026-10-05',recurrence:{day:5},clientRequestId:crypto.randomUUID()}
  await service.create(income)
  equal((await resolveBalance(db,'test-owner','2026-11')).openingBalance,985.01)
  equal((await resolveBalance(db,'test-owner','2026-12')).openingBalance,1985.01)
  await db.query("INSERT INTO monthly_balances (user_id,month,opening_balance) VALUES ('test-owner','2026-11',0)")
  equal((await resolveBalance(db,'test-owner','2026-11')).openingBalance,0)
  equal((await resolveBalance(db,'test-owner','2026-12')).openingBalance,1000)
  await db.query("UPDATE monthly_balances SET opening_balance=-50 WHERE user_id='test-owner'")
  equal((await resolveBalance(db,'test-owner','2026-12')).openingBalance,950)
  equal((await resolveBalance(db,'other-owner','2026-12')).openingBalance,0)
  await reject(() => transferToSavings(db,'test-owner','2026-12','missing',20),'GOAL_NOT_FOUND')
  await db.query("INSERT INTO goals (id,user_id,name,target,saved,icon) VALUES ('test-goal','test-owner','Savings',5000,0,'other')")
  equal((await transferToSavings(db,'test-owner','2026-12','test-goal',950)).openingBalance,0)
  await reject(() => transferToSavings(db,'test-owner','2026-12','test-goal',950),'INVALID_SAVINGS_TRANSFER')

  // A connection failure after inserting the source rolls back the entire operation.
  await db.query('SAVEPOINT partial_write_test')
  const failingDb = { query: (text, values) => {
    if (text.startsWith('INSERT INTO transactions')) throw new Error('SIMULATED_FAILURE')
    return db.query(text, values)
  } }
  await reject(() => transactionService(failingDb,'failure-owner').create({...base,clientRequestId:crypto.randomUUID()}),'SIMULATED_FAILURE')
  equal((await db.query("SELECT COUNT(*)::int AS count FROM recurring_expenses WHERE user_id='failure-owner'")).rows[0].count,1)
  await db.query('ROLLBACK TO SAVEPOINT partial_write_test')
  equal((await db.query("SELECT COUNT(*)::int AS count FROM recurring_expenses WHERE user_id='failure-owner'")).rows[0].count,0)

  // Capacity checks leave no partial series.
  await db.query('SAVEPOINT capacity_test')
  const limited = transactionService(db,'limit-owner',{transactions:3,series:100})
  await reject(() => limited.create({...base,clientRequestId:crypto.randomUUID()}),'TRANSACTION_LIMIT_REACHED')
  await db.query('ROLLBACK TO SAVEPOINT capacity_test')
  equal((await db.query("SELECT COUNT(*)::int AS count FROM recurring_expenses WHERE user_id='limit-owner'")).rows[0].count,0)
  assert.throws(() => validateTransaction({...base,date:'2026-02-31'},new Set(['subscription'])), {message:'INVALID_DATE'}); checks++
  console.log(`${checks} recurrence, category, isolation and carry-over checks passed (temporary tables only).`)
} finally { await db.query('ROLLBACK'); await db.end() }
