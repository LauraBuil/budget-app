import dotenv from 'dotenv'
import crypto from 'node:crypto'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { neon } from '@neondatabase/serverless'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { currentMonth, dateForMonth, getRecurrenceWindow, isSupportedMonth, shiftMonthValue } from './months.mjs'
import { ensureSchema } from './schema.mjs'

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
const MAX_RECURRING_EXPENSES_PER_USER = 100

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

async function createRecurringOccurrence(uid, item, month) {
  const [, results] = await sql.transaction((transaction) => [
    transaction`SELECT pg_advisory_xact_lock(hashtext(${uid}))`,
    transaction`
    WITH existing AS (
      SELECT 1 FROM transactions WHERE recurring_id = ${item.id} AND recurrence_month = ${month}
    ), capacity AS (
      SELECT 1
      WHERE NOT EXISTS (SELECT 1 FROM existing)
        AND (SELECT COUNT(*) FROM transactions WHERE user_id = ${uid}) < ${MAX_TRANSACTIONS_PER_USER}
    ), created AS (
      INSERT INTO transactions (id, user_id, label, amount, type, category, expense_group, date, note, is_recurring, recurring_id, recurrence_month)
      SELECT ${crypto.randomUUID()}, ${uid}, ${item.label}, ${item.amount}, ${item.type}, ${item.category}, ${item.expense_group}, ${dateForMonth(month, item.recurrence_day)}, ${item.note}, TRUE, ${item.id}, ${month}
      FROM capacity
      ON CONFLICT (recurring_id, recurrence_month) WHERE recurring_id IS NOT NULL DO NOTHING
      RETURNING id
    )
    SELECT EXISTS (SELECT 1 FROM existing) AS "alreadyExists", EXISTS (SELECT 1 FROM created) AS created
  `,
  ], { isolationLevel: 'ReadCommitted' })
  return results[0]
}

async function insertTransactionWithinLimit(transaction) {
  const [, rows] = await sql.transaction((query) => [
    query`SELECT pg_advisory_xact_lock(hashtext(${transaction.uid}))`,
    query`
    WITH capacity AS (
      SELECT 1
      WHERE (SELECT COUNT(*) FROM transactions WHERE user_id = ${transaction.uid}) < ${MAX_TRANSACTIONS_PER_USER}
    )
    INSERT INTO transactions (id, user_id, label, amount, type, category, expense_group, date, note, is_recurring, recurring_id, recurrence_month)
    SELECT ${transaction.id}, ${transaction.uid}, ${transaction.label}, ${transaction.amount}, ${transaction.type}, ${transaction.category}, ${transaction.expenseGroup}, ${transaction.date}, ${transaction.note}, ${transaction.isRecurring}, ${transaction.recurringId}, ${transaction.recurrenceMonth}
    FROM capacity
    ON CONFLICT (recurring_id, recurrence_month) WHERE recurring_id IS NOT NULL DO NOTHING
    RETURNING id, label, amount::float8 AS amount, type, category, expense_group AS "expenseGroup", date::text AS date, note, is_recurring AS "isRecurring", CASE WHEN is_recurring THEN EXTRACT(DAY FROM date)::int END AS "recurrenceDay"
  `,
  ], { isolationLevel: 'ReadCommitted' })
  const [row] = rows
  if (row || !transaction.recurringId) return row ?? null

  const [existing] = await sql`
    SELECT id, label, amount::float8 AS amount, type, category, expense_group AS "expenseGroup", date::text AS date, note, is_recurring AS "isRecurring", CASE WHEN is_recurring THEN EXTRACT(DAY FROM date)::int END AS "recurrenceDay"
    FROM transactions
    WHERE user_id = ${transaction.uid} AND recurring_id = ${transaction.recurringId} AND recurrence_month = ${transaction.recurrenceMonth}
  `
  return existing ?? null
}

async function createRecurringExpenseWithinLimit(recurringExpense) {
  const [, rows] = await sql.transaction((transaction) => [
    transaction`SELECT pg_advisory_xact_lock(hashtext(${recurringExpense.uid}))`,
    transaction`
    WITH capacity AS (
      SELECT 1
      WHERE (SELECT COUNT(*) FROM recurring_expenses WHERE user_id = ${recurringExpense.uid} AND active = TRUE) < ${MAX_RECURRING_EXPENSES_PER_USER}
    )
    INSERT INTO recurring_expenses (id, user_id, label, amount, type, category, expense_group, recurrence_day, window_start, window_end, note)
    SELECT ${recurringExpense.id}, ${recurringExpense.uid}, ${recurringExpense.label}, ${recurringExpense.amount}, ${recurringExpense.type}, ${recurringExpense.category}, ${recurringExpense.expenseGroup}, ${recurringExpense.day}, ${recurringExpense.windowStart || ''}, ${recurringExpense.windowEnd || ''}, ${recurringExpense.note}
    FROM capacity
    RETURNING id
  `,
  ], { isolationLevel: 'ReadCommitted' })
  return rows[0] ?? null
}

async function syncRecurringExpenses(uid, requestedMonth = currentMonth()) {
  const recurring = await sql`SELECT id, label, amount, type, category, expense_group, recurrence_day, note, window_start, window_end FROM recurring_expenses WHERE user_id = ${uid} AND active = TRUE ORDER BY created_at ASC LIMIT 100`
  for (const item of recurring) {
    const window = getRecurrenceWindow(requestedMonth, item.window_start, item.window_end)
    for (const month of window.months) {
      const occurrence = await createRecurringOccurrence(uid, item, month)
      if (!occurrence.created && !occurrence.alreadyExists) return false
    }
    if (item.window_start !== window.start || item.window_end !== window.end) {
      await sql`UPDATE recurring_expenses SET window_start = ${window.start}, window_end = ${window.end} WHERE id = ${item.id} AND user_id = ${uid}`
    }
  }
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
    const startMonth = request.query.startMonth
    const endMonth = request.query.endMonth
    const typeFilter = request.query.type === undefined ? null : request.query.type
    const searchTerm = typeof request.query.search === 'string' ? request.query.search.trim() : ''
    if ((startMonth === undefined) !== (endMonth === undefined)) return response.status(400).json({ error: 'INVALID_MONTH_RANGE' })
    if (startMonth !== undefined && (typeof startMonth !== 'string' || typeof endMonth !== 'string' || !isSupportedMonth(startMonth) || !isSupportedMonth(endMonth))) return response.status(400).json({ error: 'INVALID_MONTH' })
    if (typeFilter !== null && typeFilter !== 'income' && typeFilter !== 'expense') return response.status(400).json({ error: 'INVALID_TRANSACTION_TYPE' })
    if (searchTerm.length > 120) return response.status(400).json({ error: 'INVALID_SEARCH' })
    const firstMonth = startMonth && endMonth ? (startMonth <= endMonth ? startMonth : endMonth) : undefined
    const lastMonth = startMonth && endMonth ? (startMonth <= endMonth ? endMonth : startMonth) : undefined
    if (firstMonth && lastMonth) {
      const months = []
      for (let month = firstMonth; month <= lastMonth && months.length < 25; month = shiftMonthValue(month, 1)) months.push(month)
      if (months.length === 25 && months.at(-1) !== lastMonth) return response.status(400).json({ error: 'MONTH_RANGE_TOO_LARGE' })
      for (const month of months) {
        const recurrenceSynced = await syncRecurringExpenses(request.user.uid, month)
        if (!recurrenceSynced) return response.status(429).json({ error: 'TRANSACTION_LIMIT_REACHED' })
      }
    } else {
      const recurrenceSynced = await syncRecurringExpenses(request.user.uid, currentMonth())
      if (!recurrenceSynced) return response.status(429).json({ error: 'TRANSACTION_LIMIT_REACHED' })
    }
    const selectTransactions = firstMonth && lastMonth
      ? sql`
        SELECT id, label, amount::float8 AS amount, type, category, expense_group AS "expenseGroup", date::text AS date, note, is_recurring AS "isRecurring", CASE WHEN is_recurring THEN EXTRACT(DAY FROM date)::int END AS "recurrenceDay"
        FROM transactions WHERE user_id = ${request.user.uid} AND date >= ${`${firstMonth}-01`}::date AND date < ${`${shiftMonthValue(lastMonth, 1)}-01`}::date
          AND (${typeFilter}::text IS NULL OR type = ${typeFilter}) AND (${searchTerm || null}::text IS NULL OR POSITION(LOWER(${searchTerm}) IN LOWER(label)) > 0)
        ORDER BY date DESC, created_at DESC LIMIT ${MAX_TRANSACTIONS_PER_RESPONSE}
      `
      : sql`
        SELECT id, label, amount::float8 AS amount, type, category, expense_group AS "expenseGroup", date::text AS date, note, is_recurring AS "isRecurring", CASE WHEN is_recurring THEN EXTRACT(DAY FROM date)::int END AS "recurrenceDay"
        FROM transactions WHERE user_id = ${request.user.uid}
          AND (${typeFilter}::text IS NULL OR type = ${typeFilter}) AND (${searchTerm || null}::text IS NULL OR POSITION(LOWER(${searchTerm}) IN LOWER(label)) > 0)
        ORDER BY date DESC, created_at DESC LIMIT ${MAX_TRANSACTIONS_PER_RESPONSE}
      `
    const rows = await selectTransactions
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
  if (recurrence && ((type === 'expense' && expenseGroup !== 'fixed') || !Number.isInteger(Number(recurrence.day)) || Number(recurrence.day) < 1 || Number(recurrence.day) > 31)) return response.status(400).json({ error: 'INVALID_RECURRENCE' })

  try {
    let recurringId = null
    let recurrenceMonth = null
    let transactionDate = date
    if (recurrence) {
      recurringId = crypto.randomUUID()
      recurrenceMonth = currentMonth()
      transactionDate = dateForMonth(recurrenceMonth, Number(recurrence.day))
      const recurringExpense = await createRecurringExpenseWithinLimit({
        id: recurringId,
        uid: request.user.uid,
        label: label.trim(),
        amount: numericAmount,
        type,
        category,
        expenseGroup,
        day: Number(recurrence.day),
        note: note.trim(),
      })
      if (!recurringExpense) return response.status(429).json({ error: 'RECURRENCE_LIMIT_REACHED' })
    }
    const transaction = await insertTransactionWithinLimit({
      id: crypto.randomUUID(),
      uid: request.user.uid,
      label: label.trim(),
      amount: numericAmount,
      type,
      category,
      expenseGroup,
      date: transactionDate,
      note: note.trim(),
      isRecurring: Boolean(recurrence),
      recurringId,
      recurrenceMonth,
    })
    if (!transaction) {
      if (recurringId) await sql`DELETE FROM recurring_expenses WHERE id = ${recurringId} AND user_id = ${request.user.uid}`
      return response.status(429).json({ error: 'TRANSACTION_LIMIT_REACHED' })
    }
    return response.status(201).json(transaction)
  } catch (error) {
    return next(error)
  }
})

app.patch('/api/transactions/:id', authenticate, async (request, response, next) => {
  const { label, amount, type, category, expenseGroup = 'daily', date, note = '', recurrence } = request.body ?? {}
  const allowedTypes = new Set(['income', 'expense'])
  const allowedGroups = new Set(['fixed', 'daily', 'nonEssential', 'unexpected'])
  const numericAmount = typeof amount === 'number' ? amount : Number(amount)
  const recurrenceDay = recurrence?.day === undefined ? null : Number(recurrence.day)

  if (typeof label !== 'string' || label.trim().length < 1 || label.length > 200) return response.status(400).json({ error: 'INVALID_LABEL' })
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 10_000_000) return response.status(400).json({ error: 'INVALID_AMOUNT' })
  if (!allowedTypes.has(type) || typeof category !== 'string' || !/^[a-z0-9-]{1,80}$/.test(category)) return response.status(400).json({ error: 'INVALID_TRANSACTION' })
  if (!allowedGroups.has(expenseGroup)) return response.status(400).json({ error: 'INVALID_EXPENSE_GROUP' })
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return response.status(400).json({ error: 'INVALID_DATE' })
  if (typeof note !== 'string' || note.length > 1000) return response.status(400).json({ error: 'INVALID_NOTE' })
  if (recurrence !== null && recurrence !== undefined && ((type === 'expense' && expenseGroup !== 'fixed') || !Number.isInteger(recurrenceDay) || recurrenceDay < 1 || recurrenceDay > 31)) return response.status(400).json({ error: 'INVALID_RECURRENCE' })

  try {
    const [existing] = await sql`SELECT recurring_id AS "recurringId", is_recurring AS "isRecurring" FROM transactions WHERE id = ${request.params.id} AND user_id = ${request.user.uid}`
    if (!existing) return response.status(404).json({ error: 'TRANSACTION_NOT_FOUND' })

    const wantsRecurrence = recurrence !== null && recurrence !== undefined
    if (wantsRecurrence && !existing.recurringId) {
      const recurringId = crypto.randomUUID()
      const start = date.slice(0, 7)
      const end = shiftMonthValue(start, 5)
      const created = await createRecurringExpenseWithinLimit({ id: recurringId, uid: request.user.uid, label: label.trim(), amount: numericAmount, type, category, expenseGroup, day: recurrenceDay, note: note.trim(), windowStart: start, windowEnd: end })
      if (!created) return response.status(429).json({ error: 'RECURRENCE_LIMIT_REACHED' })
      await sql`UPDATE transactions SET label = ${label.trim()}, amount = ${numericAmount}, type = ${type}, category = ${category}, expense_group = ${expenseGroup}, date = ${date}, note = ${note.trim()}, is_recurring = TRUE, recurring_id = ${recurringId}, recurrence_month = ${start} WHERE id = ${request.params.id} AND user_id = ${request.user.uid}`
      for (let offset = 1; offset < 6; offset += 1) {
        const nextMonth = shiftMonthValue(start, offset)
        const occurrence = await createRecurringOccurrence(request.user.uid, { id: recurringId, label: label.trim(), amount: numericAmount, type, category, expense_group: expenseGroup, recurrence_day: recurrenceDay, note: note.trim() }, nextMonth)
        if (!occurrence.created && !occurrence.alreadyExists) return response.status(429).json({ error: 'TRANSACTION_LIMIT_REACHED' })
      }
    } else {
      await sql`UPDATE transactions SET label = ${label.trim()}, amount = ${numericAmount}, type = ${type}, category = ${category}, expense_group = ${expenseGroup}, date = ${date}, note = ${note.trim()}, is_recurring = ${wantsRecurrence} WHERE id = ${request.params.id} AND user_id = ${request.user.uid}`
    }

    const [updated] = await sql`SELECT id, label, amount::float8 AS amount, type, category, expense_group AS "expenseGroup", date::text AS date, note, is_recurring AS "isRecurring", CASE WHEN is_recurring THEN EXTRACT(DAY FROM date)::int END AS "recurrenceDay" FROM transactions WHERE id = ${request.params.id} AND user_id = ${request.user.uid}`
    return response.json(updated)
  } catch (error) { return next(error) }
})

app.delete('/api/transactions/:id', authenticate, async (request, response, next) => {
  try {
    const rows = await sql`DELETE FROM transactions WHERE id = ${request.params.id} AND user_id = ${request.user.uid} RETURNING id, recurring_id AS "recurringId", is_recurring AS "isRecurring"`
    const deleted = rows[0]
    if (!deleted) return response.status(404).json({ error: 'TRANSACTION_NOT_FOUND' })
    const ids = [deleted.id]
    if (deleted.recurringId && deleted.isRecurring) {
      const occurrences = await sql`DELETE FROM transactions WHERE recurring_id = ${deleted.recurringId} AND user_id = ${request.user.uid} RETURNING id`
      ids.push(...occurrences.map((item) => item.id))
      await sql`DELETE FROM recurring_expenses WHERE id = ${deleted.recurringId} AND user_id = ${request.user.uid}`
    }
    return response.json({ ids })
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

const budgetColors = new Set(['#c87d78', '#dca39b', '#9c9b86', '#e8b7ad', '#8ca6a0', '#b89cc5'])
const goalIcons = new Set(['travel', 'tech', 'safety'])

async function budgetRows(uid) {
  return sql`
    SELECT b.id, b.name, b.category, b.monthly_limit::float8 AS limit, b.color, b.note,
      COALESCE(SUM(t.amount), 0)::float8 AS spent
    FROM budgets b
    LEFT JOIN transactions t ON t.user_id = b.user_id
      AND t.category = b.category AND t.type = 'expense'
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
  return name.length <= 80 && /^[a-z0-9-]{1,80}$/.test(category) && Number.isFinite(limit) && limit > 0 && limit <= 10_000_000 && note.length <= 1000 ? { name, category, limit, color, note } : null
}

app.get('/api/budgets', authenticate, async (request, response, next) => {
  try { return response.json(await budgetRows(request.user.uid)) } catch (error) { return next(error) }
})

app.post('/api/budgets', authenticate, async (request, response, next) => {
  const budget = validBudget(request.body)
  if (!budget) return response.status(400).json({ error: 'INVALID_BUDGET' })
  try {
    await sql`
      INSERT INTO budgets (id, user_id, name, category, monthly_limit, color, note)
      VALUES (${crypto.randomUUID()}, ${request.user.uid}, ${budget.name}, ${budget.category}, ${budget.limit}, ${budget.color}, ${budget.note})
      ON CONFLICT (user_id, category) DO UPDATE SET name = EXCLUDED.name, monthly_limit = EXCLUDED.monthly_limit, color = EXCLUDED.color, note = EXCLUDED.note
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
      UPDATE budgets SET name = ${budget.name}, category = ${budget.category}, monthly_limit = ${budget.limit}, color = ${budget.color}, note = ${budget.note}
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
  const icon = goalIcons.has(body?.icon) ? body.icon : 'safety'
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

async function calculateAutomaticOpeningBalance(uid, month) {
  const [latestManual] = await sql`
    SELECT month, opening_balance::float8 AS "openingBalance"
    FROM monthly_balances WHERE user_id = ${uid} AND month < ${month}
    ORDER BY month DESC LIMIT 1
  `
  const totals = latestManual
    ? await sql`
      SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)::float8 AS balance
      FROM transactions WHERE user_id = ${uid} AND date >= ${`${latestManual.month}-01`}::date AND date < ${`${month}-01`}::date
    `
    : await sql`
      SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)::float8 AS balance
      FROM transactions WHERE user_id = ${uid} AND date < ${`${month}-01`}::date
    `
  return Number(latestManual?.openingBalance || 0) + Number(totals[0]?.balance || 0)
}

async function resolveOpeningBalance(uid, month) {
  const [saved, automaticOpeningBalance] = await Promise.all([
    sql`SELECT opening_balance::float8 AS "openingBalance" FROM monthly_balances WHERE user_id = ${uid} AND month = ${month}`,
    calculateAutomaticOpeningBalance(uid, month),
  ])
  return { openingBalance: saved[0]?.openingBalance ?? automaticOpeningBalance, automaticOpeningBalance, isManual: Boolean(saved[0]) }
}

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
    const rows = await sql`
      INSERT INTO monthly_balances (user_id, month, opening_balance)
      VALUES (${request.user.uid}, ${request.params.month}, ${openingBalance})
      ON CONFLICT (user_id, month) DO UPDATE SET opening_balance = EXCLUDED.opening_balance, updated_at = NOW()
      RETURNING opening_balance::float8 AS "openingBalance"
    `
    return response.json(rows[0])
  } catch (error) { return next(error) }
})

app.delete('/api/monthly-balances/:month', authenticate, async (request, response, next) => {
  if (!isSupportedMonth(request.params.month)) return response.status(400).json({ error: 'INVALID_MONTH' })
  try {
    await sql`DELETE FROM monthly_balances WHERE user_id = ${request.user.uid} AND month = ${request.params.month}`
    return response.json(await resolveOpeningBalance(request.user.uid, request.params.month))
  } catch (error) { return next(error) }
})

app.post('/api/monthly-balances/:month/move-to-goal', authenticate, async (request, response, next) => {
  const amount = Number(request.body?.amount)
  const goalId = request.body?.goalId
  if (!isSupportedMonth(request.params.month) || typeof goalId !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(goalId) || !Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return response.status(400).json({ error: 'INVALID_SAVINGS_TRANSFER' })
  try {
    const [goals] = await sql.transaction((transaction) => [
      transaction`
        UPDATE goals SET saved = saved + ${amount} WHERE id = ${goalId} AND user_id = ${request.user.uid}
        RETURNING id, name, target::float8 AS target, saved::float8 AS saved, due_date::text AS "dueDate", icon
      `,
      transaction`
        INSERT INTO monthly_balances (user_id, month, opening_balance) VALUES (${request.user.uid}, ${request.params.month}, 0)
        ON CONFLICT (user_id, month) DO UPDATE SET opening_balance = 0, updated_at = NOW()
      `,
    ])
    if (!goals[0]) return response.status(404).json({ error: 'GOAL_NOT_FOUND' })
    return response.json({ goal: goals[0], openingBalance: 0 })
  } catch (error) { return next(error) }
})

app.use((error, _request, response, _next) => {
  console.error('API error', error instanceof Error ? error.message : 'Unknown error')
  return response.status(500).json({ error: 'INTERNAL_ERROR' })
})

let schemaReady = Promise.resolve()

if (process.env.VERCEL !== '1') {
  schemaReady = ensureSchema(sql).catch((error) => {
    console.error('Unable to initialize Neon schema', error instanceof Error ? error.message : 'Unknown error')
    throw error
  })
  schemaReady
    .then(() => app.listen(port, () => console.log(`Gasel API listening on http://localhost:${port}`)))
    .catch(() => { process.exitCode = 1 })
}

export { app, schemaReady }
export default app
