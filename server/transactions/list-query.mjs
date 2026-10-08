import { shiftMonthValue } from '../months.mjs'
import { TransactionError } from './service.mjs'

const groups = ['fixed', 'daily', 'nonEssential', 'unexpected']
const categoryNames = {
  rent: 'loyer rent', electricity: 'électricité electricity', insurance: 'assurance insurance',
  credit: 'remboursement de crédit loan repayment', housing: 'logement housing',
  food: 'alimentation courses groceries food', groceries: 'alimentation courses groceries food',
  fuel: 'essence fuel', transport: 'transport', leisure: 'loisirs leisure', dining: 'restaurant dining',
  unexpected: 'dépense imprévue unexpected', salary: 'salaire salary', benefit: 'aide benefits', refund: 'remboursement refund',
}
const normalize = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function buildTransactionListQuery(uid, query, firstMonth, lastMonth, limit = 1000) {
  const text = (key, fallback = '') => {
    if (query[key] === undefined) return fallback
    if (typeof query[key] !== 'string') throw new TransactionError('INVALID_FILTER')
    return query[key].trim()
  }
  const search = text('search')
  const type = text('type')
  const direction = text('sort', 'desc')
  const categories = [...new Set([text('category'), ...text('categories').split(',')].filter(Boolean))]
  const expenseGroups = [...new Set(text('expenseGroups').split(',').filter(Boolean))]
  const offset = Number(text('offset', '0'))
  if (search.length > 120) throw new TransactionError('INVALID_SEARCH')
  if (type && !['income', 'expense'].includes(type)) throw new TransactionError('INVALID_TRANSACTION_TYPE')
  if (!['asc', 'desc'].includes(direction)) throw new TransactionError('INVALID_SORT')
  if (categories.length > 200 || categories.some((value) => !/^[a-z0-9-]{1,80}$/.test(value))) throw new TransactionError('INVALID_CATEGORY')
  if (expenseGroups.length > 4 || expenseGroups.some((value) => !groups.includes(value))) throw new TransactionError('INVALID_EXPENSE_GROUP')
  if (!Number.isInteger(offset) || offset < 0 || offset > 50000) throw new TransactionError('INVALID_OFFSET')

  const values = []
  const param = (value) => { values.push(value); return `$${values.length}` }
  const where = [`t.user_id=${param(uid)}`]
  if (firstMonth && lastMonth) where.push(`t.date>=${param(`${firstMonth}-01`)}::date AND t.date<${param(`${shiftMonthValue(lastMonth, 1)}-01`)}::date`)
  if (type) where.push(`t.type=${param(type)}`)
  if (categories.length) where.push(`t.category=ANY(${param(categories)}::text[])`)
  if (expenseGroups.length) where.push(`t.type='expense' AND t.expense_group=ANY(${param(expenseGroups)}::text[])`)
  if (search) {
    const aliases = param(JSON.stringify(categoryNames))
    const searchable = `LOWER(TRANSLATE(CONCAT_WS(' ',t.label,t.category,c.name,${aliases}::jsonb->>t.category,
      CASE WHEN t.type='income' THEN 'revenu revenus income' ELSE 'dépense dépenses expense expenses' END,
      CASE WHEN t.type='expense' THEN CASE t.expense_group
        WHEN 'fixed' THEN 'charges fixes charge fixe fixed charges'
        WHEN 'daily' THEN 'dépenses fixes dépense fixe dépenses du quotidien daily everyday'
        WHEN 'nonEssential' THEN 'dépenses non essentielles non essentiel non essentiels non essentielle non-essential discretionary'
        WHEN 'unexpected' THEN 'dépenses imprévues imprévu unexpected' END END,
      t.date::text,TO_CHAR(t.date,'DD/MM/YYYY'),TO_CHAR(t.date,'FMDD/FMMM/YYYY')),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
      'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'))`
    for (const token of normalize(search).split(/\s+/).filter(Boolean)) where.push(`POSITION(${param(token)} IN ${searchable})>0`)
  }
  const order = direction.toUpperCase() // Only ASC/DESC can reach this point.
  return { offset, values, text: `SELECT t.id,t.label,t.amount::float8 AS amount,t.type,t.category,
    t.expense_group AS "expenseGroup",t.date::text AS date,t.note,t.icon,t.is_recurring AS "isRecurring",
    t.recurring_id AS "recurringId",CASE WHEN t.is_recurring THEN COALESCE(r.recurrence_day,EXTRACT(DAY FROM t.date)::int) END AS "recurrenceDay"
    FROM transactions t
    LEFT JOIN categories c ON c.user_id=t.user_id AND c.type=t.type AND c.slug=t.category
    LEFT JOIN recurring_expenses r ON r.user_id=t.user_id AND r.id=t.recurring_id
    WHERE ${where.join(' AND ')}
    ORDER BY t.date ${order},t.created_at ${order},t.id ${order} LIMIT ${param(limit)} OFFSET ${param(offset)}` }
}
