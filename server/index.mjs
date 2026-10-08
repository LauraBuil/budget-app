import dotenv from 'dotenv'
import crypto from 'node:crypto'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { neon } from '@neondatabase/serverless'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { currentMonth, isSupportedMonth, shiftMonthValue } from './months.mjs'
import { ensureSchema } from './schema.mjs'
import { withAccountTransaction } from './transactions/database.mjs'
import { transactionService, TransactionError } from './transactions/service.mjs'
import { resolveBalance, transferToSavings } from './transactions/balances.mjs'
import { buildTransactionListQuery } from './transactions/list-query.mjs'
import { validateTransaction } from './transactions/validation.mjs'

dotenv.config({ path: '.env.local' })

const port = Number(process.env.API_PORT || 8787)
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const databaseUrl = process.env.DATABASE_URL
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID

if (!databaseUrl) throw new Error('DATABASE_URL is missing from .env.local')
if (!firebaseProjectId) throw new Error('FIREBASE_PROJECT_ID is missing from .env.local')

const sql = neon(databaseUrl)
const firebaseKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
const firebaseIssuer = `https://securetoken.google.com/${firebaseProjectId}`
const MAX_TRANSACTIONS_PER_USER = 50_000
const MAX_TRANSACTIONS_PER_RESPONSE = 1_000
const allowedIconIds = new Set(['travel', 'car', 'subscription', 'tech', 'pets', 'house', 'internet', 'credit', 'games', 'food', 'fastFood', 'rent', 'electricity', 'insurance', 'health', 'leisure', 'shopping', 'toll', 'fuel', 'safety', 'income', 'other'])

const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: clientOrigin }))
app.use(express.json({ limit: '32kb' }))
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }))
app.use('/api', (_request, response, next) => {
  response.set('Cache-Control', 'no-store')
  next()
})

const accountWork = (uid, work) => withAccountTransaction(databaseUrl, uid, (db) => work(transactionService(db, uid)))

async function syncRecurringExpenses(uid, month = currentMonth()) {
  await accountWork(uid, (service) => service.sync(month))
  return true
}

async function authenticate(request, response, next) {
  const header = request.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return response.status(401).json({ error: 'AUTH_REQUIRED' })

  try {
    const { payload } = await jwtVerify(token, firebaseKeys, { issuer: firebaseIssuer, audience: firebaseProjectId })
    if (typeof payload.sub !== 'string' || !payload.sub) return response.status(401).json({ error: 'AUTH_INVALID' })
    request.user = { uid: payload.sub }
    return next()
  } catch {
    return response.status(401).json({ error: 'AUTH_INVALID' })
  }
}

app.get('/api/health', (_request, response) => response.json({ ok: true }))

app.get('/api/transactions', authenticate, async (request, response, next) => {
  try {
    const { startMonth, endMonth } = request.query
    if ((startMonth === undefined) !== (endMonth === undefined)) return response.status(400).json({ error: 'INVALID_MONTH_RANGE' })
    if (startMonth !== undefined && (typeof startMonth !== 'string' || typeof endMonth !== 'string' || !isSupportedMonth(startMonth) || !isSupportedMonth(endMonth))) return response.status(400).json({ error: 'INVALID_MONTH' })
    const firstMonth = startMonth && endMonth ? (startMonth <= endMonth ? startMonth : endMonth) : undefined
    const lastMonth = startMonth && endMonth ? (startMonth <= endMonth ? endMonth : startMonth) : undefined
    if (firstMonth && lastMonth && shiftMonthValue(firstMonth, 24) < lastMonth) return response.status(400).json({ error: 'MONTH_RANGE_TOO_LARGE' })
    const query = buildTransactionListQuery(request.user.uid, request.query, firstMonth, lastMonth, MAX_TRANSACTIONS_PER_RESPONSE)
    if (query.offset === 0) await syncRecurringExpenses(request.user.uid, lastMonth || currentMonth())
    return response.json(await sql.query(query.text, query.values))
  } catch (error) { return next(error) }
})

app.post('/api/transactions', authenticate, async (request, response, next) => {
  try {
    const draft = validateTransaction(request.body, allowedIconIds)
    const row = await accountWork(request.user.uid, (service) => service.create(draft))
    return response.status(201).json(row)
  } catch (error) { return next(error) }
})

app.patch('/api/transactions/:id', authenticate, async (request, response, next) => {
  try {
    const draft = validateTransaction(request.body, allowedIconIds)
    const row = await accountWork(request.user.uid, (service) => service.update(request.params.id, draft))
    return response.json(row)
  } catch (error) { return next(error) }
})

app.delete('/api/transactions/:id', authenticate, async (request, response, next) => {
  const scope = request.query.scope || 'this'
  if (!['this', 'future'].includes(scope)) return response.status(400).json({ error: 'INVALID_SCOPE' })
  try {
    return response.json(await accountWork(request.user.uid, (service) => service.remove(request.params.id, scope)))
  } catch (error) { return next(error) }
})

app.get('/api/categories', authenticate, async (request, response, next) => {
  try {
    const rows = await sql`SELECT id, name, slug, expense_group AS "group", type FROM categories WHERE user_id = ${request.user.uid} ORDER BY name ASC`
    return response.json(rows)
  } catch (error) { return next(error) }
})

app.post('/api/categories', authenticate, async (request, response, next) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : ''
  const expenseGroup = request.body?.expenseGroup
  const type = request.body?.type
  const slug = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
  const builtInSlugs = new Set(['housing', 'groceries', 'transport', 'leisure', 'dining', 'other', 'income', 'rent', 'electricity', 'insurance', 'credit', 'fuel', 'food', 'unexpected', 'salary', 'benefit', 'refund'])
  if (name.length < 1 || name.length > 60 || !slug || builtInSlugs.has(slug) || !['income', 'expense'].includes(type) || !['fixed', 'daily', 'nonEssential', 'unexpected'].includes(expenseGroup)) return response.status(400).json({ error: 'INVALID_CATEGORY' })
  try {
    const [usage] = await sql`SELECT COUNT(*)::int AS count, COALESCE(BOOL_OR(slug = ${slug} AND type = ${type}), FALSE) AS exists FROM categories WHERE user_id = ${request.user.uid}`
    if (usage.count >= 200 && !usage.exists) return response.status(429).json({ error: 'CATEGORY_LIMIT_REACHED' })
    const rows = await sql`
      INSERT INTO categories (id, user_id, name, slug, expense_group, type)
      VALUES (${crypto.randomUUID()}, ${request.user.uid}, ${name}, ${slug}, ${expenseGroup}, ${type})
      ON CONFLICT (user_id, type, slug) DO UPDATE SET name = EXCLUDED.name, expense_group = EXCLUDED.expense_group
      RETURNING id, name, slug, expense_group AS "group", type
    `
    return response.status(201).json(rows[0])
  } catch (error) { return next(error) }
})

app.patch('/api/categories/:id', authenticate, async (request, response, next) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : ''
  if (name.length < 1 || name.length > 60) return response.status(400).json({ error: 'INVALID_CATEGORY' })
  try {
    const rows = await sql`UPDATE categories SET name = ${name} WHERE id = ${request.params.id} AND user_id = ${request.user.uid} RETURNING id, name, slug, expense_group AS "group", type`
    if (!rows[0]) return response.status(404).json({ error: 'CATEGORY_NOT_FOUND' })
    return response.json(rows[0])
  } catch (error) { return next(error) }
})

app.delete('/api/categories/:id', authenticate, async (request, response, next) => {
  try {
    const [used] = await sql`SELECT c.id FROM categories c WHERE c.id=${request.params.id} AND c.user_id=${request.user.uid} AND (
      EXISTS (SELECT 1 FROM transactions t WHERE t.user_id=c.user_id AND t.category=c.slug AND t.type=c.type)
      OR EXISTS (SELECT 1 FROM recurring_expenses r WHERE r.user_id=c.user_id AND r.category=c.slug AND r.type=c.type AND r.active)
      OR EXISTS (SELECT 1 FROM budgets b WHERE b.user_id=c.user_id AND b.category=c.slug AND c.type='expense'))`
    if (used) return response.status(409).json({ error: 'CATEGORY_IN_USE' })
    const rows = await sql`DELETE FROM categories WHERE id = ${request.params.id} AND user_id = ${request.user.uid} RETURNING id`
    if (!rows[0]) return response.status(404).json({ error: 'CATEGORY_NOT_FOUND' })
    return response.status(204).end()
  } catch (error) { return next(error) }
})

const budgetColors = new Set(['#c87d78', '#dca39b', '#9c9b86', '#e8b7ad', '#8ca6a0', '#b89cc5'])

async function budgetRows(uid) {
  return sql`
    SELECT b.id, b.name, b.category, b.monthly_limit::float8 AS limit, b.color, b.note, b.icon,
      COALESCE(SUM(t.amount), 0)::float8 AS spent
    FROM budgets b
    LEFT JOIN transactions t ON t.user_id = b.user_id
      AND (t.category = b.category OR (b.category = 'non-essential' AND t.expense_group = 'nonEssential'))
      AND t.type = 'expense'
      AND t.date >= date_trunc('month', CURRENT_DATE)::date
      AND t.date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date
    WHERE b.user_id = ${uid}
    GROUP BY b.id
    ORDER BY b.created_at ASC
  `
}

function validBudget(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const category = typeof body?.category === 'string' ? body.category.trim() : ''
  const limit = Number(body?.limit)
  const color = typeof body?.color === 'string' && budgetColors.has(body.color) ? body.color : '#c87d78'
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  const icon = allowedIconIds.has(body?.icon) ? body.icon : 'other'
  return name.length <= 80 && /^[a-z0-9-]{1,80}$/.test(category) && Number.isFinite(limit) && limit > 0 && limit <= 10_000_000 && note.length <= 1000 ? { name, category, limit, color, note, icon } : null
}

app.get('/api/budgets', authenticate, async (request, response, next) => {
  try { return response.json(await budgetRows(request.user.uid)) } catch (error) { return next(error) }
})

app.post('/api/budgets', authenticate, async (request, response, next) => {
  const budget = validBudget(request.body)
  if (!budget) return response.status(400).json({ error: 'INVALID_BUDGET' })
  try {
    await sql`
      INSERT INTO budgets (id, user_id, name, category, monthly_limit, color, note, icon)
      VALUES (${crypto.randomUUID()}, ${request.user.uid}, ${budget.name}, ${budget.category}, ${budget.limit}, ${budget.color}, ${budget.note}, ${budget.icon})
      ON CONFLICT (user_id, category) DO UPDATE SET name = EXCLUDED.name, monthly_limit = EXCLUDED.monthly_limit, color = EXCLUDED.color, note = EXCLUDED.note, icon = EXCLUDED.icon
    `
    const rows = await budgetRows(request.user.uid)
    return response.status(201).json(rows.find((item) => item.category === budget.category))
  } catch (error) { return next(error) }
})

app.patch('/api/budgets/:id', authenticate, async (request, response, next) => {
  const budget = validBudget(request.body)
  if (!budget) return response.status(400).json({ error: 'INVALID_BUDGET' })
  try {
    const rows = await sql`
      UPDATE budgets SET name = ${budget.name}, category = ${budget.category}, monthly_limit = ${budget.limit}, color = ${budget.color}, note = ${budget.note}, icon = ${budget.icon}
      WHERE id = ${request.params.id} AND user_id = ${request.user.uid}
      RETURNING id
    `
    if (!rows[0]) return response.status(404).json({ error: 'BUDGET_NOT_FOUND' })
    const budgets = await budgetRows(request.user.uid)
    return response.json(budgets.find((item) => item.id === request.params.id))
  } catch (error) { return next(error) }
})

app.delete('/api/budgets/:id', authenticate, async (request, response, next) => {
  try {
    const rows = await sql`DELETE FROM budgets WHERE id = ${request.params.id} AND user_id = ${request.user.uid} RETURNING id`
    return rows[0] ? response.status(204).end() : response.status(404).json({ error: 'BUDGET_NOT_FOUND' })
  } catch (error) { return next(error) }
})

async function goalRows(uid) {
  return sql`SELECT id, name, target::float8 AS target, saved::float8 AS saved, due_date::text AS "dueDate", icon FROM goals WHERE user_id = ${uid} ORDER BY created_at ASC`
}

function validGoal(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const target = Number(body?.target)
  const saved = body?.saved === undefined ? 0 : Number(body.saved)
  const dueDate = body?.dueDate === '' || body?.dueDate === undefined ? null : body.dueDate
  const icon = allowedIconIds.has(body?.icon) ? body.icon : 'safety'
  return name.length >= 1 && name.length <= 80 && Number.isFinite(target) && target > 0 && target <= 10_000_000 && Number.isFinite(saved) && saved >= 0 && saved <= 10_000_000 && (dueDate === null || typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) ? { name, target, saved, dueDate, icon } : null
}

app.get('/api/goals', authenticate, async (request, response, next) => {
  try { return response.json(await goalRows(request.user.uid)) } catch (error) { return next(error) }
})

app.post('/api/goals', authenticate, async (request, response, next) => {
  const goal = validGoal(request.body)
  if (!goal) return response.status(400).json({ error: 'INVALID_GOAL' })
  try {
    const rows = await sql`
      INSERT INTO goals (id, user_id, name, target, saved, due_date, icon)
      VALUES (${crypto.randomUUID()}, ${request.user.uid}, ${goal.name}, ${goal.target}, ${goal.saved}, ${goal.dueDate}, ${goal.icon})
      RETURNING id, name, target::float8 AS target, saved::float8 AS saved, due_date::text AS "dueDate", icon
    `
    return response.status(201).json(rows[0])
  } catch (error) { return next(error) }
})

app.patch('/api/goals/:id', authenticate, async (request, response, next) => {
  const goal = validGoal(request.body)
  if (!goal) return response.status(400).json({ error: 'INVALID_GOAL' })
  try {
    const rows = await sql`
      UPDATE goals SET name = ${goal.name}, target = ${goal.target}, saved = ${goal.saved}, due_date = ${goal.dueDate}, icon = ${goal.icon}
      WHERE id = ${request.params.id} AND user_id = ${request.user.uid}
      RETURNING id, name, target::float8 AS target, saved::float8 AS saved, due_date::text AS "dueDate", icon
    `
    if (!rows[0]) return response.status(404).json({ error: 'GOAL_NOT_FOUND' })
    return response.json(rows[0])
  } catch (error) { return next(error) }
})

app.delete('/api/goals/:id', authenticate, async (request, response, next) => {
  try {
    const rows = await sql`DELETE FROM goals WHERE id = ${request.params.id} AND user_id = ${request.user.uid} RETURNING id`
    return rows[0] ? response.status(204).end() : response.status(404).json({ error: 'GOAL_NOT_FOUND' })
  } catch (error) { return next(error) }
})

const resolveOpeningBalance = (uid, month) => withAccountTransaction(databaseUrl, uid, (db) => resolveBalance(db, uid, month))

app.get('/api/monthly-balances/:month', authenticate, async (request, response, next) => {
  if (!isSupportedMonth(request.params.month)) return response.status(400).json({ error: 'INVALID_MONTH' })
  try {
    return response.json(await resolveOpeningBalance(request.user.uid, request.params.month))
  } catch (error) { return next(error) }
})

app.put('/api/monthly-balances/:month', authenticate, async (request, response, next) => {
  const openingBalance = Number(request.body?.openingBalance)
  if (!isSupportedMonth(request.params.month) || !Number.isFinite(openingBalance) || Math.abs(openingBalance) > 10_000_000) return response.status(400).json({ error: 'INVALID_BALANCE' })
  try {
    const result = await withAccountTransaction(databaseUrl, request.user.uid, async (db) => {
      const { rows } = await db.query(`INSERT INTO monthly_balances (user_id,month,opening_balance) VALUES ($1,$2,$3)
        ON CONFLICT (user_id,month) DO UPDATE SET opening_balance=EXCLUDED.opening_balance,updated_at=NOW()
        RETURNING opening_balance::float8 AS "openingBalance"`, [request.user.uid,request.params.month,openingBalance])
      return rows[0]
    })
    return response.json(result)
  } catch (error) { return next(error) }
})

app.delete('/api/monthly-balances/:month', authenticate, async (request, response, next) => {
  if (!isSupportedMonth(request.params.month)) return response.status(400).json({ error: 'INVALID_MONTH' })
  try {
    const result = await withAccountTransaction(databaseUrl, request.user.uid, async (db) => {
      await db.query('DELETE FROM monthly_balances WHERE user_id=$1 AND month=$2', [request.user.uid,request.params.month])
      return resolveBalance(db, request.user.uid, request.params.month)
    })
    return response.json(result)
  } catch (error) { return next(error) }
})

app.post('/api/monthly-balances/:month/move-to-goal', authenticate, async (request, response, next) => {
  const amount = Number(request.body?.amount)
  const goalId = request.body?.goalId
  if (!isSupportedMonth(request.params.month) || typeof goalId !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(goalId) || !Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return response.status(400).json({ error: 'INVALID_SAVINGS_TRANSFER' })
  try {
    return response.json(await withAccountTransaction(databaseUrl, request.user.uid,
      (db) => transferToSavings(db, request.user.uid, request.params.month, goalId, amount)))
  } catch (error) { return next(error) }
})

app.use((error, _request, response, _next) => {
  if (error instanceof TransactionError) return response.status(error.status).json({ error: error.message })
  console.error('API error', error instanceof Error ? error.message : 'Unknown error')
  return response.status(500).json({ error: 'INTERNAL_ERROR' })
})

let schemaReady = Promise.resolve()
let localServer

if (process.env.VERCEL !== '1') {
  schemaReady = ensureSchema(sql).catch((error) => {
    console.error('Unable to initialize Neon schema', error instanceof Error ? error.message : 'Unknown error')
    throw error
  })
  schemaReady
    .then(() => {
      localServer = app.listen(port, () => console.log(`Gasel API listening on http://localhost:${port}`))
      localServer.on('error', (error) => {
        console.error('Unable to start Gasel API', error.message)
        process.exitCode = 1
      })
    })
    .catch(() => { process.exitCode = 1 })
}

export { app, schemaReady }
export default app
