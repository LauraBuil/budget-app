import { TransactionError } from './service.mjs'

export async function resolveBalance(db, uid, month) {
  const { rows: saved } = await db.query('SELECT opening_balance::float8 AS balance FROM monthly_balances WHERE user_id=$1 AND month=$2', [uid,month])
  const { rows: manual } = await db.query('SELECT month,opening_balance::float8 AS balance FROM monthly_balances WHERE user_id=$1 AND month<$2 ORDER BY month DESC LIMIT 1', [uid,month])
  const { rows: [totals] } = await db.query(`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END),0)::float8 AS balance
    FROM transactions WHERE user_id=$1 AND date < $2::date AND ($3::date IS NULL OR date >= $3::date)`,
  [uid,`${month}-01`,manual[0] ? `${manual[0].month}-01` : null])
  const automaticOpeningBalance = Math.round(((manual[0]?.balance || 0) + totals.balance)*100)/100
  return { openingBalance: saved[0]?.balance ?? automaticOpeningBalance, automaticOpeningBalance, isManual:saved.length>0 }
}

export async function transferToSavings(db,uid,month,goalId,amount) {
  const balance = await resolveBalance(db,uid,month)
  if (amount > balance.openingBalance) throw new TransactionError('INVALID_SAVINGS_TRANSFER')
  const { rows: [goal] } = await db.query(`UPDATE goals SET saved=saved+$1 WHERE user_id=$2 AND id=$3
    RETURNING id,name,target::float8 AS target,saved::float8 AS saved,due_date::text AS "dueDate",icon`, [amount,uid,goalId])
  if (!goal) throw new TransactionError('GOAL_NOT_FOUND',404)
  const openingBalance = Math.round((balance.openingBalance-amount)*100)/100
  await db.query(`INSERT INTO monthly_balances (user_id,month,opening_balance) VALUES ($1,$2,$3)
    ON CONFLICT (user_id,month) DO UPDATE SET opening_balance=EXCLUDED.opening_balance,updated_at=NOW()`, [uid,month,openingBalance])
  return { goal,openingBalance }
}
