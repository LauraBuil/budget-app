import dotenv from 'dotenv'
import crypto from 'node:crypto'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { neon } from '@neondatabase/serverless'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { currentMonth, dateForMonth, getRecurrenceWindow, isSupportedMonth, shiftMonthValue } from './months.mjs'

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

async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL,
      expense_group TEXT NOT NULL DEFAULT 'daily',
      date DATE NOT NULL,
      note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
      is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
      recurring_id TEXT,
      recurrence_month TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check`
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE`
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expense_group TEXT NOT NULL DEFAULT 'daily'`
  await sql`UPDATE transactions SET expense_group = 'fixed' WHERE category IN ('housing', 'rent', 'electricity', 'insurance', 'credit')`
  await sql`UPDATE transactions SET expense_group = 'nonEssential' WHERE category IN ('leisure', 'dining')`
  await sql`UPDATE transactions SET expense_group = 'unexpected' WHERE category IN ('unexpected', 'other')`
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_id TEXT`
  await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence_month TEXT`
  await sql`CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions (user_id, date DESC, created_at DESC)`
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
      slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]{1,80}$'),
      expense_group TEXT NOT NULL DEFAULT 'daily',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, slug)
    )
  `
  await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS expense_group TEXT NOT NULL DEFAULT 'daily'`
  await sql`
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
      category TEXT NOT NULL,
      expense_group TEXT NOT NULL DEFAULT 'daily',
      recurrence_day SMALLINT NOT NULL CHECK (recurrence_day BETWEEN 1 AND 31),
      window_start TEXT NOT NULL DEFAULT '',
      window_end TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS expense_group TEXT NOT NULL DEFAULT 'daily'`
  await sql`ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS window_start TEXT NOT NULL DEFAULT ''`
  await sql`ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS window_end TEXT NOT NULL DEFAULT ''`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS transactions_recurring_month_idx ON transactions (recurring_id, recurrence_month) WHERE recurring_id IS NOT NULL`
}

async function syncRecurringExpenses(uid, requestedMonth = currentMonth()) {
  const recurring = await sql`SELECT id, label, amount, category, expense_group, recurrence_day, note, window_start, window_end FROM recurring_expenses WHERE user_id = ${uid} AND active = TRUE ORDER BY created_at ASC LIMIT 100`
  for (const item of recurring) {
    const window = getRecurrenceWindow(requestedMonth, item.window_start, item.window_end)
    for (const month of window.months) {
      await sql`
        INSERT INTO transactions (id, user_id, label, amount, type, category, expense_group, date, note, is_recurring, recurring_id, recurrence_month)
        SELECT ${crypto.randomUUID()}, ${uid}, ${item.label}, ${item.amount}, 'expense', ${item.category}, ${item.expense_group}, ${dateForMonth(month, item.recurrence_day)}, ${item.note}, TRUE, ${item.id}, ${month}
        WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE recurring_id = ${item.id} AND recurrence_month = ${month})
      `
    }
    if (item.window_start !== window.start || item.window_end !== window.end) {
      await sql`UPDATE recurring_expenses SET window_start = ${window.start}, window_end = ${window.end} WHERE id = ${item.id} AND user_id = ${uid}`
    }
  }
}

async function authenticate(request, response, next) {
  const header = request.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return response.status(401).json({ error: 'AUTH_REQUIRED' })

  try {
    const { payload } = await jwtVerify(token, firebaseKeys, { issuer: firebaseIssuer, audience: firebaseProjectId })
    if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Invalid subject')
    request.user = { uid: payload.sub }
    return next()
  } catch {
    return response.status(401).json({ error: 'AUTH_INVALID' })
  }
}

app.get('/api/health', (_request, response) => response.json({ ok: true }))

app.get('/api/transactions', authenticate, async (request, response, next) => {
  try {
    const requestedMonth = request.query.month === undefined ? currentMonth() : request.query.month
    if (typeof requestedMonth !== 'string' || !isSupportedMonth(requestedMonth)) return response.status(400).json({ error: 'INVALID_MONTH' })
    await syncRecurringExpenses(request.user.uid, requestedMonth)
    const rows = await sql`
      SELECT id, label, amount::float8 AS amount, type, category, expense_group AS "expenseGroup", date::text AS date, note, is_recurring AS "isRecurring", CASE WHEN is_recurring THEN EXTRACT(DAY FROM date)::int END AS "recurrenceDay"
      FROM transactions
      WHERE user_id = ${request.user.uid}
      ORDER BY date DESC, created_at DESC
    `
    return response.json(rows)
  } catch (error) {
    return next(error)
  }
})

app.post('/api/transactions', authenticate, async (request, response, next) => {
  const { label, amount, type, category, expenseGroup = 'daily', date, note = '', recurrence } = request.body ?? {}
  const allowedTypes = new Set(['income', 'expense'])
  const allowedGroups = new Set(['fixed', 'daily', 'nonEssential', 'unexpected'])
  const numericAmount = typeof amount === 'number' ? amount : Number(amount)

  if (typeof label !== 'string' || label.trim().length < 1 || label.length > 200) return response.status(400).json({ error: 'INVALID_LABEL' })
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 10_000_000) return response.status(400).json({ error: 'INVALID_AMOUNT' })
  if (!allowedTypes.has(type) || typeof category !== 'string' || !/^[a-z0-9-]{1,80}$/.test(category)) return response.status(400).json({ error: 'INVALID_TRANSACTION' })
  if (!allowedGroups.has(expenseGroup)) return response.status(400).json({ error: 'INVALID_EXPENSE_GROUP' })
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return response.status(400).json({ error: 'INVALID_DATE' })
  if (typeof note !== 'string' || note.length > 1000) return response.status(400).json({ error: 'INVALID_NOTE' })
  if (recurrence && (type !== 'expense' || expenseGroup !== 'fixed' || !Number.isInteger(Number(recurrence.day)) || Number(recurrence.day) < 1 || Number(recurrence.day) > 31)) return response.status(400).json({ error: 'INVALID_RECURRENCE' })

  try {
    const [usage] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM transactions WHERE user_id = ${request.user.uid}) AS transaction_count,
        (SELECT COUNT(*)::int FROM recurring_expenses WHERE user_id = ${request.user.uid} AND active = TRUE) AS recurring_count
    `
    if (usage.transaction_count >= 50_000) return response.status(429).json({ error: 'TRANSACTION_LIMIT_REACHED' })
    if (recurrence && usage.recurring_count >= 100) return response.status(429).json({ error: 'RECURRENCE_LIMIT_REACHED' })
    let recurringId = null
    let recurrenceMonth = null
    let transactionDate = date
    if (recurrence) {
      recurringId = crypto.randomUUID()
      recurrenceMonth = currentMonth()
      transactionDate = dateForMonth(recurrenceMonth, Number(recurrence.day))
      await sql`
        INSERT INTO recurring_expenses (id, user_id, label, amount, category, expense_group, recurrence_day, note, window_start, window_end)
        VALUES (${recurringId}, ${request.user.uid}, ${label.trim()}, ${numericAmount}, ${category}, ${expenseGroup}, ${Number(recurrence.day)}, ${note.trim()}, ${currentMonth()}, ${shiftMonthValue(currentMonth(), 5)})
      `
    }
    const id = crypto.randomUUID()
    const rows = await sql`
      INSERT INTO transactions (id, user_id, label, amount, type, category, expense_group, date, note, is_recurring, recurring_id, recurrence_month)
      VALUES (${id}, ${request.user.uid}, ${label.trim()}, ${numericAmount}, ${type}, ${category}, ${expenseGroup}, ${transactionDate}, ${note.trim()}, ${Boolean(recurrence)}, ${recurringId}, ${recurrenceMonth})
      RETURNING id, label, amount::float8 AS amount, type, category, expense_group AS "expenseGroup", date::text AS date, note, is_recurring AS "isRecurring", CASE WHEN is_recurring THEN EXTRACT(DAY FROM date)::int END AS "recurrenceDay"
    `
    return response.status(201).json(rows[0])
  } catch (error) {
    return next(error)
  }
})

app.get('/api/categories', authenticate, async (request, response, next) => {
  try {
    const rows = await sql`SELECT id, name, slug, expense_group AS "group" FROM categories WHERE user_id = ${request.user.uid} ORDER BY name ASC`
    return response.json(rows)
  } catch (error) { return next(error) }
})

app.post('/api/categories', authenticate, async (request, response, next) => {
  const name = typeof request.body?.name === 'string' ? request.body.name.trim() : ''
  const expenseGroup = request.body?.expenseGroup
  const slug = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
  const builtInSlugs = new Set(['housing', 'groceries', 'transport', 'leisure', 'dining', 'other', 'income', 'rent', 'electricity', 'insurance', 'credit', 'fuel', 'food', 'unexpected'])
  if (name.length < 1 || name.length > 60 || !slug || builtInSlugs.has(slug) || !['fixed', 'daily', 'nonEssential', 'unexpected'].includes(expenseGroup)) return response.status(400).json({ error: 'INVALID_CATEGORY' })
  try {
    const [usage] = await sql`SELECT COUNT(*)::int AS count, COALESCE(BOOL_OR(slug = ${slug}), FALSE) AS exists FROM categories WHERE user_id = ${request.user.uid}`
    if (usage.count >= 200 && !usage.exists) return response.status(429).json({ error: 'CATEGORY_LIMIT_REACHED' })
    const rows = await sql`
      INSERT INTO categories (id, user_id, name, slug, expense_group)
      VALUES (${crypto.randomUUID()}, ${request.user.uid}, ${name}, ${slug}, ${expenseGroup})
      ON CONFLICT (user_id, slug) DO UPDATE SET name = EXCLUDED.name, expense_group = EXCLUDED.expense_group
      RETURNING id, name, slug, expense_group AS "group"
    `
    return response.status(201).json(rows[0])
  } catch (error) { return next(error) }
})

app.use((error, _request, response, _next) => {
  console.error('API error', error instanceof Error ? error.message : 'Unknown error')
  return response.status(500).json({ error: 'INTERNAL_ERROR' })
})

const schemaReady = ensureSchema().catch((error) => {
  console.error('Unable to initialize Neon schema', error instanceof Error ? error.message : 'Unknown error')
  throw error
})

if (process.env.VERCEL !== '1') {
  schemaReady
    .then(() => app.listen(port, () => console.log(`Gasel API listening on http://localhost:${port}`)))
    .catch(() => { process.exitCode = 1 })
}

export { app, schemaReady }
export default app
