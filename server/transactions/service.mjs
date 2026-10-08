import crypto from 'node:crypto'
import { dateForMonth, shiftMonthValue } from '../months.mjs'

export class TransactionError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}

export const transactionColumns = `id, label, amount::float8 AS amount, type, category,
  expense_group AS "expenseGroup", date::text AS date, note, icon,
  is_recurring AS "isRecurring", recurring_id AS "recurringId",
  CASE WHEN is_recurring THEN COALESCE((SELECT recurrence_day FROM recurring_expenses r WHERE r.id=transactions.recurring_id AND r.user_id=transactions.user_id), EXTRACT(DAY FROM date)::int) END AS "recurrenceDay"`

// All callers hold the account lock for the entire database transaction.
export function transactionService(db, uid, limits = { transactions: 50000, series: 100 }) {
  const query = async (text, values = []) => (await db.query(text, values)).rows
  const get = async (id) => (await query(`SELECT ${transactionColumns}, recurrence_month FROM transactions WHERE user_id=$1 AND id=$2`, [uid, id]))[0]
  const capacity = async (extra) => {
    const [row] = await query('SELECT COUNT(*)::int AS count FROM transactions WHERE user_id=$1', [uid])
    if (row.count + extra > limits.transactions) throw new TransactionError('TRANSACTION_LIMIT_REACHED', 429)
  }
  const fields = (draft) => [draft.label, draft.amount, draft.type, draft.category, draft.expenseGroup, draft.date, draft.note, draft.icon, Boolean(draft.recurrence)]

  async function assertSeriesAvailable(draft, exceptId = null) {
    const [duplicate] = await query(`SELECT id FROM recurring_expenses WHERE user_id=$1 AND active
      AND lower(trim(label))=lower(trim($2)) AND type=$3 AND amount=$4 AND id IS DISTINCT FROM $5`,
    [uid, draft.label, draft.type, draft.amount, exceptId])
    if (duplicate) throw new TransactionError('RECURRENCE_ALREADY_EXISTS', 409)
    const [count] = await query('SELECT COUNT(*)::int AS count FROM recurring_expenses WHERE user_id=$1 AND active AND id IS DISTINCT FROM $2', [uid, exceptId])
    if (count.count >= limits.series) throw new TransactionError('RECURRENCE_LIMIT_REACHED', 429)
  }

  async function fill(series, start, end, excludeMonth = null) {
    const existing = await query('SELECT recurrence_month FROM transactions WHERE user_id=$1 AND recurring_id=$2', [uid, series.id])
    const occupied = new Set(existing.map((row) => row.recurrence_month))
    const months = []
    for (let month = start; month <= end; month = shiftMonthValue(month, 1)) {
      if (month !== excludeMonth && !occupied.has(month)) months.push(month)
    }
    await capacity(months.length)
    for (const month of months) {
      await query(`INSERT INTO transactions (id,user_id,label,amount,type,category,expense_group,date,note,icon,is_recurring,recurring_id,recurrence_month)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11,$12)
        ON CONFLICT (recurring_id,recurrence_month) WHERE recurring_id IS NOT NULL DO NOTHING`,
      [crypto.randomUUID(), uid, series.label, series.amount, series.type, series.category, series.expense_group,
        dateForMonth(month, series.recurrence_day), series.note, series.icon, series.id, month])
    }
  }

  async function makeSeries(draft) {
    await assertSeriesAvailable(draft)
    const start = draft.date.slice(0, 7)
    const [series] = await query(`INSERT INTO recurring_expenses
      (id,user_id,label,amount,type,category,expense_group,recurrence_day,note,icon,window_start,window_end)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [crypto.randomUUID(),uid,draft.label,draft.amount,draft.type,draft.category,draft.expenseGroup,draft.recurrence.day,draft.note,draft.icon,start,shiftMonthValue(start,5)])
    return series
  }

  async function create(draft) {
    const id = draft.clientRequestId || crypto.randomUUID()
    const existing = await get(id)
    if (existing) return existing // Retry of the same submitted form.
    await capacity(draft.recurrence ? 6 : 1)
    const series = draft.recurrence ? await makeSeries(draft) : null
    await query(`INSERT INTO transactions (id,user_id,label,amount,type,category,expense_group,date,note,icon,is_recurring,recurring_id,recurrence_month)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id,uid,...fields(draft),series?.id || null,series ? draft.date.slice(0,7) : null])
    if (series) await fill(series,series.window_start,series.window_end)
    return get(id)
  }

  async function update(id, draft) {
    const existing = await get(id)
    if (!existing) throw new TransactionError('TRANSACTION_NOT_FOUND',404)
    const scope = draft.scope || 'this'
    let series = existing.recurringId
      ? (await query('SELECT * FROM recurring_expenses WHERE user_id=$1 AND id=$2', [uid,existing.recurringId]))[0] : null
    const anchor = existing.recurrence_month || existing.date.slice(0,7)
    if (series && draft.recurrence && draft.date.slice(0,7) !== anchor) throw new TransactionError('RECURRENCE_MONTH_CHANGE')
    if (draft.recurrence && !series) {
      series = await makeSeries(draft)
      await query('UPDATE transactions SET recurring_id=$1,recurrence_month=$2 WHERE user_id=$3 AND id=$4', [series.id,draft.date.slice(0,7),uid,id])
      await fill(series,series.window_start,series.window_end)
    } else if (series && scope === 'future') {
      if (draft.recurrence) {
        await assertSeriesAvailable(draft,series.id)
        const [updated] = await query(`UPDATE recurring_expenses SET label=$1,amount=$2,type=$3,category=$4,
          expense_group=$5,recurrence_day=$6,note=$7,icon=$8,active=TRUE WHERE user_id=$9 AND id=$10 RETURNING *`,
        [draft.label,draft.amount,draft.type,draft.category,draft.expenseGroup,draft.recurrence.day,draft.note,draft.icon,uid,series.id])
        const future = await query(`SELECT id,recurrence_month FROM transactions WHERE user_id=$1 AND recurring_id=$2 AND recurrence_month>$3`, [uid,series.id,anchor])
        for (const row of future) {
          await write(row.id,{...draft,date:dateForMonth(row.recurrence_month,draft.recurrence.day)})
        }
        if (!series.active) await fill(updated,shiftMonthValue(anchor,1),updated.window_end)
      } else {
        await query('UPDATE recurring_expenses SET active=FALSE WHERE user_id=$1 AND id=$2', [uid,series.id])
        await query('DELETE FROM transactions WHERE user_id=$1 AND recurring_id=$2 AND recurrence_month>$3', [uid,series.id,anchor])
      }
    }
    await write(id,draft)
    return get(id)
  }

  async function write(id,draft) {
    await query(`UPDATE transactions SET label=$1,amount=$2,type=$3,category=$4,expense_group=$5,date=$6,
      note=$7,icon=$8,is_recurring=$9 WHERE user_id=$10 AND id=$11`, [...fields(draft),uid,id])
  }

  async function remove(id, scope = 'this') {
    const existing = await get(id)
    if (!existing) throw new TransactionError('TRANSACTION_NOT_FOUND',404)
    let rows
    if (existing.recurringId && scope === 'future') {
      await query('UPDATE recurring_expenses SET active=FALSE WHERE user_id=$1 AND id=$2', [uid,existing.recurringId])
      rows = await query('DELETE FROM transactions WHERE user_id=$1 AND recurring_id=$2 AND recurrence_month >= $3 RETURNING id', [uid,existing.recurringId,existing.recurrence_month])
    } else {
      rows = await query('DELETE FROM transactions WHERE user_id=$1 AND id=$2 RETURNING id', [uid,id])
    }
    // Synchronization only adds months beyond window_end, never deleted past slots.
    return { ids: rows.map((row) => row.id) }
  }

  async function sync(requestedMonth) {
    const series = await query('SELECT * FROM recurring_expenses WHERE user_id=$1 AND active ORDER BY created_at LIMIT 100', [uid])
    for (const item of series) {
      if (!item.window_start || !item.window_end) {
        const [first] = await query('SELECT MIN(date)::text AS date FROM transactions WHERE user_id=$1 AND recurring_id=$2', [uid,item.id])
        const start = (first.date || new Date(item.created_at).toISOString()).slice(0,7)
        item.window_start = start; item.window_end = shiftMonthValue(start,5)
        await fill(item,start,item.window_end)
      } else if (requestedMonth >= item.window_end) {
        let end = item.window_end
        do { end = shiftMonthValue(end,6) } while (end <= requestedMonth)
        await fill(item,shiftMonthValue(item.window_end,1),end)
        item.window_end = end
      } else continue
      await query('UPDATE recurring_expenses SET window_start=$1,window_end=$2 WHERE user_id=$3 AND id=$4', [item.window_start,item.window_end,uid,item.id])
    }
  }
  return { create, update, remove, sync }
}
